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

// imageUrl is the public URL stored in PurchaseOrderImage.url (a Vercel Blob URL
// in production). OpenAI's vision input fetches the URL server-side, so the
// Blob can stay private-by-obscurity (unguessable token in path) without us
// having to pre-fetch and base64 the bytes.
export async function parsePurchaseOrderImage(imageUrl: string): Promise<ParsedOrderPayload> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("缺少 OPENAI_API_KEY，無法啟動圖片解析。");
  }

  if (!/^https?:\/\//i.test(imageUrl)) {
    throw new Error(`圖片 URL 格式錯誤：${imageUrl}`);
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
                "你是一個進貨叫貨單解析助手。請從使用者上傳的供應商訂單截圖中擷取可供清點的品項，只保留品名、規格、數量、單位、備註、原始文字與信心分數。輸出必須符合 JSON schema。若資訊不清楚，請在 warnings 補充，不要亂猜。",
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
  return tryExtractStructuredJson(payload) as ParsedOrderPayload;
}
