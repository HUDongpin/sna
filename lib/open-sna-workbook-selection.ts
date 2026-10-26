export type OpenSnaSelection = {
  items: Array<{ column: string; id: string; community: string; reverse: boolean }>;
  groupColumn: string;
};

export type OpenSnaInspectionResult = {
  schemaVersion: "1.0";
  inputFingerprint: `sha256:${string}`;
  originalRows: number;
  columns: Array<{
    name: string;
    missingCount: number;
    eligibleItem: boolean;
    eligibleGroup: boolean;
    suggestedCommunity: string | null;
  }>;
  suggestedSelection: OpenSnaSelection | null;
};

export function isOpenSnaColumnHeader(value: unknown): value is string {
  return typeof value === "string" && value === value.trim() && value.length > 0
    && Array.from(value).length <= 120 && !/[\u0000-\u001f\u007f-\u009f]/.test(value);
}

function isIdentifier(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z][A-Za-z0-9_-]{0,39}$/.test(value);
}

function dataRecord(value: unknown, keys: readonly string[]): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.length !== keys.length || ownKeys.some((key) => typeof key !== "string" || !keys.includes(key))) return null;
  const result: Record<string, unknown> = Object.create(null);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) return null;
    result[key] = descriptor.value;
  }
  return result;
}

function dataArray(value: unknown, minimum: number, maximum: number): unknown[] | null {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) return null;
  const length = Object.getOwnPropertyDescriptor(value, "length");
  if (!length || !("value" in length) || length.value < minimum || length.value > maximum) return null;
  const size: number = length.value;
  if (Reflect.ownKeys(value).length !== size + 1) return null;
  const result: unknown[] = [];
  for (let index = 0; index < size; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) return null;
    result.push(descriptor.value);
  }
  return result;
}

export function isOpenSnaSelection(value: unknown): value is OpenSnaSelection {
  try {
    const selection = dataRecord(value, ["items", "groupColumn"]);
    if (!selection || !isOpenSnaColumnHeader(selection.groupColumn)) return false;
    const items = dataArray(selection.items, 6, 40);
    if (!items) return false;
    const ids = new Set<string>();
    const columns = new Set<string>();
    const communities = new Map<string, number>();
    for (const rawItem of items) {
      const item = dataRecord(rawItem, ["column", "id", "community", "reverse"]);
      if (!item || !isOpenSnaColumnHeader(item.column) || !isIdentifier(item.id) || !isIdentifier(item.community) || typeof item.reverse !== "boolean") return false;
      if (ids.has(item.id) || columns.has(item.column) || item.column === selection.groupColumn) return false;
      ids.add(item.id); columns.add(item.column);
      communities.set(item.community, (communities.get(item.community) ?? 0) + 1);
    }
    return communities.size >= 2 && communities.size <= 8 && [...communities.values()].every((count) => count >= 3 && count <= 12);
  } catch {
    return false;
  }
}

export function isOpenSnaInspectionResult(value: unknown): value is OpenSnaInspectionResult {
  try {
    const inspection = dataRecord(value, ["schemaVersion", "inputFingerprint", "originalRows", "columns", "suggestedSelection"]);
    if (!inspection || inspection.schemaVersion !== "1.0" || typeof inspection.inputFingerprint !== "string" || !/^sha256:[a-f0-9]{64}$/.test(inspection.inputFingerprint)) return false;
    if (typeof inspection.originalRows !== "number" || !Number.isSafeInteger(inspection.originalRows) || inspection.originalRows < 1 || inspection.originalRows > 5000) return false;
    const columns = dataArray(inspection.columns, 1, 64);
    if (!columns) return false;
    const byName = new Map<string, Record<string, unknown>>();
    for (const rawColumn of columns) {
      const column = dataRecord(rawColumn, ["name", "missingCount", "eligibleItem", "eligibleGroup", "suggestedCommunity"]);
      if (!column || !isOpenSnaColumnHeader(column.name) || byName.has(column.name)
        || typeof column.missingCount !== "number" || !Number.isSafeInteger(column.missingCount) || column.missingCount < 0 || column.missingCount > inspection.originalRows
        || typeof column.eligibleItem !== "boolean" || typeof column.eligibleGroup !== "boolean"
        || !(column.suggestedCommunity === null || isIdentifier(column.suggestedCommunity))) return false;
      byName.set(column.name, column);
    }
    if (inspection.suggestedSelection === null) return true;
    if (!isOpenSnaSelection(inspection.suggestedSelection)) return false;
    return byName.get(inspection.suggestedSelection.groupColumn)?.eligibleGroup === true
      && inspection.suggestedSelection.items.every((item) => byName.get(item.column)?.eligibleItem === true);
  } catch {
    return false;
  }
}
