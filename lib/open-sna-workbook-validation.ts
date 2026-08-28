export type OpenSnaValidationFingerprint = `sha256:${string}`;

export type OpenSnaValidationResult = {
  schemaVersion: "1.0";
  valid: true;
  inputFingerprint: OpenSnaValidationFingerprint;
  summary: {
    originalRows: number;
    analyzedRows: number;
    droppedRows: number;
    itemCount: number;
    communityCount: number;
    groupColumn: string;
    groupCounts: [{ group: string; n: number }, { group: string; n: number }];
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  return Object.keys(value).every((key) => keys.includes(key)) && keys.every((key) => key in value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isSafeColumnLabel(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z][A-Za-z0-9 _-]{0,39}$/.test(value);
}

function isSafeGroupLabel(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9 _-]{0,39}$/.test(value);
}

function isValidGroupCount(value: unknown): value is { group: string; n: number } {
  return isRecord(value)
    && hasExactKeys(value, ["group", "n"])
    && isSafeGroupLabel(value.group)
    && isNonNegativeInteger(value.n)
    && value.n >= 20;
}

export function isOpenSnaValidationResult(value: unknown): value is OpenSnaValidationResult {
  if (!isRecord(value) || !hasExactKeys(value, ["schemaVersion", "valid", "inputFingerprint", "summary"])) return false;
  if (value.schemaVersion !== "1.0" || value.valid !== true) return false;
  if (typeof value.inputFingerprint !== "string" || !/^sha256:[a-f0-9]{64}$/.test(value.inputFingerprint)) return false;
  if (!isRecord(value.summary)) return false;

  const summary = value.summary;
  if (!hasExactKeys(summary, ["originalRows", "analyzedRows", "droppedRows", "itemCount", "communityCount", "groupColumn", "groupCounts"])) return false;
  if (
    !isNonNegativeInteger(summary.originalRows)
    || !isNonNegativeInteger(summary.analyzedRows)
    || !isNonNegativeInteger(summary.droppedRows)
    || summary.originalRows !== summary.analyzedRows + summary.droppedRows
    || summary.analyzedRows < 40
    || summary.originalRows > 5000
    || !isNonNegativeInteger(summary.itemCount)
    || summary.itemCount < 6
    || summary.itemCount > 40
    || !isNonNegativeInteger(summary.communityCount)
    || summary.communityCount < 2
    || summary.communityCount > 8
    || summary.communityCount > summary.itemCount
    || !isSafeColumnLabel(summary.groupColumn)
    || !Array.isArray(summary.groupCounts)
    || summary.groupCounts.length !== 2
    || !summary.groupCounts.every(isValidGroupCount)
  ) return false;

  const [firstGroup, secondGroup] = summary.groupCounts as [{ group: string; n: number }, { group: string; n: number }];
  return firstGroup.group !== secondGroup.group && firstGroup.n + secondGroup.n === summary.analyzedRows;
}
