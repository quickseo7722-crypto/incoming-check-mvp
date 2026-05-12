import {
  formatPackageNote,
  isInnerPackageUnit,
  normalizePackageOuterUnit,
  parsePackageNote,
} from "@/lib/package-note";

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

function normalizeParsedItem(
  item: ParsedImageItem,
  index: number,
  warnings: string[],
): ParsedImageItem {
  let name = cleanText(item.name);
  const spec = cleanText(item.spec);
  const raw_text = normalizeWhitespace(cleanText(item.raw_text));
  const confidence = normalizeNumber(item.confidence) ?? 0;
  let ordered_quantity = normalizeNumber(item.ordered_quantity);
  let unit = normalizePackageOuterUnit(item.unit);
  let note = cleanText(item.note);

  const packageSource = [note, raw_text, spec].filter(Boolean).join(" ");
  const packageHint = parsePackageNote(packageSource, unit);

  // Keep outer package quantity/unit in main columns, and keep inner count in note.
  if (packageHint) {
    unit = normalizePackageOuterUnit(unit || packageHint.outerUnit);

    if (ordered_quantity === null && packageHint.outerQuantity !== null) {
      ordered_quantity = packageHint.outerQuantity;
    }

    note = formatPackageNote(packageSource, unit);

    if (ordered_quantity !== null && packageHint.outerQuantity !== null) {
      const mismatched = Math.abs(ordered_quantity - packageHint.outerQuantity) > 0.0001;
      if (mismatched) {
        warnings.push(
          `第 ${index + 1} 筆包裝數量與包裝說明可能不一致，已優先保留外層叫貨數量 ${ordered_quantity}${unit || ""}。`,
        );
      }
    }
  } else {
    note = formatPackageNote(note, unit);

    if ((!unit || isInnerPackageUnit(unit)) && /个|個/.test(packageSource)) {
      warnings.push(`第 ${index + 1} 筆可能包含內含數量資訊，請人工確認清點單位。`);
    }
  }

  if (unit === "個" && packageHint?.outerUnit) {
    unit = normalizePackageOuterUnit(packageHint.outerUnit);
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

// v1 stores outer package quantity/unit in main columns and keeps
// inner content counts in note, e.g. "1箱 = 100個".
export async function parsePurchaseOrderImage(imageUrl: string): Promise<ParsedOrderPayload> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("缺少 OPENAI_API_KEY，無法進行圖片解析。");
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
              text: [
                "你是進貨叫貨單解析助手。請從供應商截圖或表格中擷取可供清點的品項，輸出必須符合 JSON schema。",
                "第一版清點主欄位只保留：name、spec、ordered_quantity、unit、note、raw_text、confidence。",
                "如果出現雙單位資訊，例如「1件 * 100个」、「1箱 = 100個」、「每箱 100個」，ordered_quantity 必須保留外層叫貨數量，例如 1。",
                "unit 必須保留外層包裝單位；在 1688 或中國訂單情境中，請把「件」轉成台灣較好理解的「箱」。",
                "內含數量例如 100個 不可放進 ordered_quantity，必須保留在 note，並標準化成像「1箱 = 100個」或「2箱，每箱 1000個」。",
                "系統後續會讓員工用內含單位作為清點單位，所以 note 必須保留這段資訊。",
                "不要把價格、金額、折扣、運費當成數量。",
                "spec 只保留商品規格，例如 17*30；若外層單位與內含單位不清楚，請在 warnings 說明，不要亂猜。",
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
