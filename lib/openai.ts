export type ParsedImageItem = {
  name: string;
  spec: string;
  ordered_quantity: number | null;
  unit: string;
  note: string;
  raw_text: string;
  confidence: number;
};

export type ParsedOrderPayload = {
  supplier_name: string;
  order_date: string;
  items: ParsedImageItem[];
  warnings: string[];
};

const OUTER_PACKAGE_UNITS = [
  "件",
  "箱",
  "包",
  "組",
  "套",
  "袋",
  "盒",
  "板",
  "卷",
  "捆",
  "扎",
];

const INNER_CONTENT_UNITS = [
  "个",
  "個",
  "pcs",
  "pc",
  "只",
  "支",
  "枚",
  "片",
  "對",
  "对",
  "雙",
  "条",
  "條",
  "瓶",
  "罐",
];

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    supplier_name: { type: "string" },
    order_date: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          spec: { type: "string" },
          ordered_quantity: {
            anyOf: [{ type: "number" }, { type: "null" }],
          },
          unit: { type: "string" },
          note: { type: "string" },
          raw_text: { type: "string" },
          confidence: { type: "number" },
        },
        required: [
          "name",
          "spec",
          "ordered_quantity",
          "unit",
          "note",
          "raw_text",
          "confidence",
        ],
      },
    },
    warnings: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["supplier_name", "order_date", "items", "warnings"],
} as const;

type PackageHint = {
  outerQuantity: number | null;
  outerUnit: string;
  innerQuantity: number;
  innerUnit: string;
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildNormalizedPackageNote(packageHint: PackageHint) {
  return `每${packageHint.outerUnit} ${packageHint.innerQuantity}${packageHint.innerUnit}`;
}

function extractPackageHint(text: string): PackageHint | null {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return null;

  const outerUnitGroup = OUTER_PACKAGE_UNITS.map(escapeRegExp).join("|");
  const innerUnitGroup = INNER_CONTENT_UNITS.map(escapeRegExp).join("|");

  const explicitMultiplierPattern = new RegExp(
    `(\\d+(?:\\.\\d+)?)\\s*(${outerUnitGroup})\\s*[x×＊*]\\s*(\\d+(?:\\.\\d+)?)\\s*(${innerUnitGroup})`,
    "i",
  );
  const implicitMultiplierPattern = new RegExp(
    `(\\d+(?:\\.\\d+)?)\\s*(${outerUnitGroup})\\s+(\\d+(?:\\.\\d+)?)\\s*(${innerUnitGroup})`,
    "i",
  );
  const perPackagePattern = new RegExp(
    `每\\s*(${outerUnitGroup})\\s*(\\d+(?:\\.\\d+)?)\\s*(${innerUnitGroup})`,
    "i",
  );

  let match = explicitMultiplierPattern.exec(normalized);
  if (match) {
    return {
      outerQuantity: normalizeNumber(match[1]),
      outerUnit: match[2],
      innerQuantity: Number(match[3]),
      innerUnit: match[4],
    };
  }

  match = implicitMultiplierPattern.exec(normalized);
  if (match) {
    return {
      outerQuantity: normalizeNumber(match[1]),
      outerUnit: match[2],
      innerQuantity: Number(match[3]),
      innerUnit: match[4],
    };
  }

  match = perPackagePattern.exec(normalized);
  if (match) {
    return {
      outerQuantity: null,
      outerUnit: match[1],
      innerQuantity: Number(match[2]),
      innerUnit: match[3],
    };
  }

  return null;
}

function isInnerContentUnit(unit: string) {
  return INNER_CONTENT_UNITS.includes(unit);
}

function mergePackageNote(existingNote: string, packageNote: string) {
  if (!existingNote) return packageNote;
  return existingNote.includes(packageNote) ? existingNote : `${existingNote}｜${packageNote}`;
}

function normalizeParsedItem(
  item: ParsedImageItem,
  index: number,
  warnings: string[],
): ParsedImageItem {
  let name = cleanText(item.name);
  let spec = cleanText(item.spec);
  let unit = cleanText(item.unit);
  let note = cleanText(item.note);
  const raw_text = normalizeWhitespace(cleanText(item.raw_text));
  const confidence = normalizeNumber(item.confidence) ?? 0;
  let ordered_quantity = normalizeNumber(item.ordered_quantity);

  const packageHint = extractPackageHint(
    [spec, note, raw_text].filter(Boolean).join(" "),
  );

  // v1 rule: count by outer package quantity; keep inner content quantity in note.
  if (packageHint) {
    const packageNote = buildNormalizedPackageNote(packageHint);

    if (!unit || isInnerContentUnit(unit)) {
      unit = packageHint.outerUnit;
    }

    if (ordered_quantity === null && packageHint.outerQuantity !== null) {
      ordered_quantity = packageHint.outerQuantity;
    }

    note = mergePackageNote(note, packageNote);

    if (ordered_quantity !== null && packageHint.outerQuantity !== null) {
      const mismatched = Math.abs(ordered_quantity - packageHint.outerQuantity) > 0.0001;
      if (mismatched) {
        warnings.push(
          `第 ${index + 1} 筆包裝數量與備註可能不一致，已保留外層數量 ${ordered_quantity}${unit || ""}。`,
        );
      }
    }
  } else if (raw_text && /个|個/.test(raw_text) && (!unit || isInnerContentUnit(unit))) {
    warnings.push(`第 ${index + 1} 筆可能包含內含數量資訊，請人工確認主要清點單位。`);
  }

  if (!name) {
    name = raw_text || `未命名品項 ${index + 1}`;
  }

  return {
    name,
    spec,
    ordered_quantity,
    unit,
    note,
    raw_text,
    confidence,
  };
}

function normalizeParsedPayload(payload: ParsedOrderPayload): ParsedOrderPayload {
  const warnings = [...payload.warnings];
  const items = payload.items.map((item, index) =>
    normalizeParsedItem(item, index, warnings),
  );

  return {
    supplier_name: cleanText(payload.supplier_name),
    order_date: cleanText(payload.order_date),
    items,
    warnings,
  };
}

function tryExtractStructuredJson(payload: any) {
  if (payload?.output_parsed) return payload.output_parsed;

  for (const output of payload?.output ?? []) {
    for (const content of output?.content ?? []) {
      if (content?.type === "output_text" && typeof content?.text === "string") {
        return JSON.parse(content.text);
      }
      if (content?.json) return content.json;
    }
  }

  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return JSON.parse(payload.output_text);
  }

  throw new Error("OpenAI 回應中找不到可解析的 JSON。");
}

// The system stores v1 counting data as:
// - ordered_quantity: outer package quantity
// - unit: outer package unit
// - note: inner content quantity, e.g. "每件 7000个"
export async function parsePurchaseOrderImage(imageUrl: string): Promise<ParsedOrderPayload> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("缺少 OPENAI_API_KEY，無法啟動圖片解析。");
  }

  if (!/^https?:\/\//i.test(imageUrl)) {
    throw new Error(`圖片 URL 格式不正確：${imageUrl}`);
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                [
                  "你是進貨叫貨單解析助手。請從供應商截圖或表格中擷取清點用品項，輸出必須符合 JSON schema。",
                  "第一版清點主欄位只保留：name、spec、ordered_quantity、unit、note、raw_text、confidence。",
                  "重要規則：若出現「1件 * 7000个」、「2件 * 1000个」、「1箱 7000個」、「每箱 7000個」這種雙單位資訊，ordered_quantity 必須優先使用外層包裝數量，unit 必須優先使用外層包裝單位，例如 件、箱、包、組。",
                  "內含數量例如 7000个 不可當成主要清點單位，應放進 note，例如「每件 7000个」。",
                  "spec 保留商品規格，例如 17*30；不要把價格、金額當成數量。",
                  "如果表格中有數量欄、價格欄、金額欄，ordered_quantity 只能取數量欄，不可把價格 376 或金額 376 當成數量。",
                  "若無法判斷外層單位與內容單位，請在 warnings 中明確說明，不要亂猜。",
                  "範例：規格 17*30、數量 1、備註 1件 * 7000个，應輸出 ordered_quantity=1、unit=件、note=每件 7000个。",
                ].join(" "),
            },
            {
              type: "input_image",
              image_url: imageUrl,
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "purchase_order_parse",
          strict: true,
          schema: responseSchema,
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI 解析失敗：${response.status} ${errorText}`);
  }

  const payload = await response.json();
  return normalizeParsedPayload(tryExtractStructuredJson(payload) as ParsedOrderPayload);
}
