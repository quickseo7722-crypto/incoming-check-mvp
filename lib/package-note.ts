const OUTER_UNITS = ["箱", "包", "組", "套", "袋", "盒", "板", "卷", "捆", "扎", "件"] as const;
const INNER_UNITS = [
  "個",
  "个",
  "pcs",
  "pc",
  "只",
  "支",
  "枚",
  "片",
  "對",
  "对",
  "雙",
  "双",
  "條",
  "条",
  "瓶",
  "罐",
] as const;

export type ParsedPackageNote = {
  outerQuantity: number | null;
  outerUnit: string;
  innerQuantity: number;
  innerUnit: string;
};

export type PackageConversion = {
  orderQuantity: number | null;
  orderUnit: string | null;
  packageCount: number | null;
  packageUnit: string | null;
  innerQuantityPerPackage: number | null;
  innerUnit: string | null;
  expectedCheckQuantity: number | null;
  checkUnit: string | null;
  displayNote: string;
};

function trimText(value?: string | null) {
  return value?.trim() || "";
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(value);
}

function normalizeNoteText(note?: string | null) {
  return normalizeWhitespace(
    trimText(note)
      .replaceAll("件", "箱")
      .replaceAll("个", "個")
      .replaceAll("对", "對")
      .replaceAll("双", "雙")
      .replaceAll("条", "條"),
  );
}

export function normalizePackageOuterUnit(unit?: string | null) {
  const text = trimText(unit);
  if (!text) return "";
  if (text === "件") return "箱";
  if (text === "个" || text === "個") return "個";
  if (text === "对") return "對";
  if (text === "双") return "雙";
  if (text === "条") return "條";
  return text;
}

export function normalizePackageInnerUnit(unit?: string | null) {
  const text = trimText(unit);
  if (!text) return "";
  if (text === "个" || text === "個" || text.toLowerCase() === "pc" || text.toLowerCase() === "pcs") {
    return "個";
  }
  if (text === "对") return "對";
  if (text === "双") return "雙";
  if (text === "条") return "條";
  return text;
}

export function isInnerPackageUnit(unit?: string | null) {
  const text = trimText(unit);
  return !!text && INNER_UNITS.includes(text as (typeof INNER_UNITS)[number]);
}

export function parsePackageNote(note?: string | null, preferredUnit?: string | null): ParsedPackageNote | null {
  const text = normalizeNoteText(note);
  if (!text) return null;

  const outerUnitGroup = OUTER_UNITS.map(escapeRegExp).join("|");
  const innerUnitGroup = INNER_UNITS.map(escapeRegExp).join("|");
  const preferredOuterUnit = normalizePackageOuterUnit(preferredUnit);

  const patterns = [
    new RegExp(
      `(\\d+(?:\\.\\d+)?)\\s*(${outerUnitGroup})\\s*(?:[x×＊*=＝])\\s*(\\d+(?:\\.\\d+)?)\\s*(${innerUnitGroup})`,
      "i",
    ),
    new RegExp(
      `(\\d+(?:\\.\\d+)?)\\s*(${outerUnitGroup})\\s*[，,、]?\\s*每(?:\\s*${outerUnitGroup})?\\s*(\\d+(?:\\.\\d+)?)\\s*(${innerUnitGroup})`,
      "i",
    ),
    new RegExp(
      `(\\d+(?:\\.\\d+)?)\\s*(${outerUnitGroup})\\s+(\\d+(?:\\.\\d+)?)\\s*(${innerUnitGroup})`,
      "i",
    ),
    new RegExp(`每\\s*(${outerUnitGroup})\\s*(\\d+(?:\\.\\d+)?)\\s*(${innerUnitGroup})`, "i"),
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (!match) continue;

    if (match.length === 5) {
      return {
        outerQuantity: parseNumber(match[1]),
        outerUnit: preferredOuterUnit || normalizePackageOuterUnit(match[2]),
        innerQuantity: Number(match[3]),
        innerUnit: normalizePackageInnerUnit(match[4]),
      };
    }

    return {
      outerQuantity: null,
      outerUnit: preferredOuterUnit || normalizePackageOuterUnit(match[1]),
      innerQuantity: Number(match[2]),
      innerUnit: normalizePackageInnerUnit(match[3]),
    };
  }

  return null;
}

export function formatPackageNote(note?: string | null, preferredUnit?: string | null) {
  const text = normalizeNoteText(note);
  if (!text) return "";

  const parsed = parsePackageNote(text, preferredUnit);
  if (!parsed) return text;

  const outerUnit = normalizePackageOuterUnit(preferredUnit) || parsed.outerUnit;

  if (parsed.outerQuantity === null) {
    return `每${outerUnit} ${formatNumber(parsed.innerQuantity)}${parsed.innerUnit}`;
  }

  if (parsed.outerQuantity === 1) {
    return `1${outerUnit} = ${formatNumber(parsed.innerQuantity)}${parsed.innerUnit}`;
  }

  return `${formatNumber(parsed.outerQuantity)}${outerUnit}，每${outerUnit} ${formatNumber(parsed.innerQuantity)}${parsed.innerUnit}`;
}

export function parsePackageConversion(
  note?: string | null,
  orderQuantity?: number | null,
  orderUnit?: string | null,
): PackageConversion {
  const normalizedOrderUnit = normalizePackageOuterUnit(orderUnit) || null;
  const displayNote = formatPackageNote(note, normalizedOrderUnit);
  const parsed = parsePackageNote(displayNote || note, normalizedOrderUnit);

  if (!parsed) {
    return {
      orderQuantity: orderQuantity ?? null,
      orderUnit: normalizedOrderUnit,
      packageCount: orderQuantity ?? null,
      packageUnit: normalizedOrderUnit,
      innerQuantityPerPackage: null,
      innerUnit: null,
      expectedCheckQuantity: orderQuantity ?? null,
      checkUnit: normalizedOrderUnit,
      displayNote,
    };
  }

  const packageCount = parsed.outerQuantity ?? orderQuantity ?? null;
  const packageUnit = normalizedOrderUnit || parsed.outerUnit;
  const expectedCheckQuantity =
    orderQuantity !== null && orderQuantity !== undefined
      ? orderQuantity * parsed.innerQuantity
      : packageCount !== null
        ? packageCount * parsed.innerQuantity
        : null;

  return {
    orderQuantity: orderQuantity ?? null,
    orderUnit: normalizedOrderUnit,
    packageCount,
    packageUnit,
    innerQuantityPerPackage: parsed.innerQuantity,
    innerUnit: parsed.innerUnit,
    expectedCheckQuantity,
    checkUnit: parsed.innerUnit,
    displayNote,
  };
}
