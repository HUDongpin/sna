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

type DataValues = Record<string, unknown>;

function ownEnumerableDataValues(value: unknown, requiredKeys: readonly string[]): DataValues | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return null;

  const ownKeys = Reflect.ownKeys(value);
  if (
    ownKeys.length !== requiredKeys.length
    || ownKeys.some((key) => typeof key !== "string" || !requiredKeys.includes(key))
  ) return null;

  const values: DataValues = Object.create(null);
  for (const key of requiredKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || descriptor.enumerable !== true || !("value" in descriptor)) return null;
    values[key] = descriptor.value;
  }
  return values;
}

function tupleElements(value: unknown): [unknown, unknown] | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const ownKeys = Reflect.ownKeys(value);
  if (
    ownKeys.length !== 3
    || !ownKeys.every((key) => key === "0" || key === "1" || key === "length")
  ) return null;
  const first = Object.getOwnPropertyDescriptor(value, "0");
  const second = Object.getOwnPropertyDescriptor(value, "1");
  const length = Object.getOwnPropertyDescriptor(value, "length");
  if (
    !first || !second || !length
    || first.enumerable !== true || second.enumerable !== true || length.enumerable !== false
    || !("value" in first) || !("value" in second) || !("value" in length)
    || length.value !== 2
  ) return null;
  return [first.value, second.value];
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

function validGroupCount(value: unknown): { group: string; n: number } | null {
  const groupCount = ownEnumerableDataValues(value, ["group", "n"]);
  if (!groupCount || !isSafeGroupLabel(groupCount.group) || !isNonNegativeInteger(groupCount.n) || groupCount.n < 20) return null;
  return { group: groupCount.group, n: groupCount.n };
}

export function isOpenSnaValidationResult(value: unknown): value is OpenSnaValidationResult {
  try {
    const result = ownEnumerableDataValues(value, ["schemaVersion", "valid", "inputFingerprint", "summary"]);
    if (!result || result.schemaVersion !== "1.0" || result.valid !== true) return false;
    if (typeof result.inputFingerprint !== "string" || !/^sha256:[a-f0-9]{64}$/.test(result.inputFingerprint)) return false;

    const summary = ownEnumerableDataValues(result.summary, [
      "originalRows", "analyzedRows", "droppedRows", "itemCount", "communityCount", "groupColumn", "groupCounts",
    ]);
    if (!summary) return false;
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
      || summary.itemCount < summary.communityCount * 3
      || summary.itemCount > summary.communityCount * 12
      || !isSafeColumnLabel(summary.groupColumn)
    ) return false;

    const groupEntries = tupleElements(summary.groupCounts);
    if (!groupEntries) return false;
    const firstGroup = validGroupCount(groupEntries[0]);
    const secondGroup = validGroupCount(groupEntries[1]);
    return firstGroup !== null
      && secondGroup !== null
      && firstGroup.group !== secondGroup.group
      && firstGroup.n + secondGroup.n === summary.analyzedRows;
  } catch {
    return false;
  }
}
