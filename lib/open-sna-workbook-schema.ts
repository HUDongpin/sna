import { inflateRawSync } from "node:zlib";
import type { OpenSnaValidationResult } from "@/lib/open-sna-workbook-validation";

const MAX_ZIP_ENTRIES = 32;
const MAX_ENTRY_UNCOMPRESSED_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_UNCOMPRESSED_BYTES = 8 * 1024 * 1024;
const ITEM_PATTERN = /^[A-Za-z]{2,12}[1-9][0-9]?$/;
const RESERVED_PREFIXES = new Set(["ID", "NO", "AGE", "YEAR", "SEX", "GENDER", "GROUP", "EXPERIENCE"]);
const SAFE_COLUMN = /^[A-Za-z][A-Za-z0-9 _-]{0,39}$/;
const SAFE_GROUP = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,39}$/;
const LOCAL_FILE_SIGNATURE = 0x04034b50;
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;

export class OpenSnaWorkbookInvalidError extends Error {
  readonly code = "WORKBOOK_INVALID" as const;
}

type SheetTable = {
  headers: string[];
  rows: Array<Array<string | number | null>>;
};

export type OpenSnaWorkbookPrecheck =
  | { valid: true; summary: OpenSnaValidationResult["summary"] }
  | { valid: false; code: "WORKBOOK_INVALID" };

function fail(): never {
  throw new OpenSnaWorkbookInvalidError("WORKBOOK_INVALID");
}

function unzipXlsx(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const files = new Map<string, string>();
  let offset = 0;
  let entries = 0;
  let totalUncompressed = 0;

  while (offset + 30 <= bytes.length) {
    const signature = view.getUint32(offset, true);
    if (signature === CENTRAL_DIRECTORY_SIGNATURE || signature === END_OF_CENTRAL_DIRECTORY_SIGNATURE) break;
    if (signature !== LOCAL_FILE_SIGNATURE) fail();

    const flags = view.getUint16(offset + 6, true);
    const method = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const uncompressedSize = view.getUint32(offset + 22, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    if ((flags & 0x8) !== 0 || compressedSize === 0xffffffff || uncompressedSize === 0xffffffff) fail();

    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > bytes.length) fail();

    const name = new TextDecoder("utf-8").decode(bytes.subarray(nameStart, nameStart + nameLength));
    offset = dataEnd;
    if (name.endsWith("/")) continue;

    entries += 1;
    if (entries > MAX_ZIP_ENTRIES || uncompressedSize > MAX_ENTRY_UNCOMPRESSED_BYTES) fail();
    totalUncompressed += uncompressedSize;
    if (totalUncompressed > MAX_TOTAL_UNCOMPRESSED_BYTES) fail();

    const compressed = bytes.subarray(dataStart, dataEnd);
    let uncompressed: Uint8Array;
    if (method === 0) uncompressed = compressed;
    else if (method === 8) {
      try {
        uncompressed = inflateRawSync(compressed);
      } catch {
        fail();
      }
    } else fail();
    if (uncompressed.byteLength !== uncompressedSize) fail();
    const text = new TextDecoder("utf-8").decode(uncompressed);
    files.set(name.replace(/\\/g, "/"), text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
  }

  if (files.size === 0) fail();
  return files;
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function xmlAttribute(source: string, name: string) {
  const match = source.match(new RegExp(`\\b${name}="([^"]*)"`));
  return match ? decodeXmlEntities(match[1]) : null;
}

function xmlInner(source: string, tag: string) {
  const match = source.match(new RegExp(`<(?:[\\w.-]+:)?${tag}\\b[^>]*>([\\s\\S]*?)</(?:[\\w.-]+:)?${tag}>`));
  return match ? match[1] : null;
}

function xmlText(source: string, tag: string) {
  const inner = xmlInner(source, tag);
  if (inner === null) return null;
  const text = inner.match(/<(?:[\w.-]+:)?t\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?t>/g);
  if (!text) return decodeXmlEntities(inner.replace(/<[^>]+>/g, ""));
  return decodeXmlEntities(text.map((entry) => entry.replace(/<[^>]+>/g, "")).join(""));
}

function columnIndex(reference: string) {
  const match = reference.match(/^([A-Za-z]+)(\d+)$/);
  if (!match) fail();
  let index = 0;
  for (const character of match[1].toUpperCase()) {
    index = index * 26 + (character.charCodeAt(0) - 64);
  }
  return { column: index, row: Number(match[2]) };
}

function sheetNames(workbookXml: string) {
  const names: string[] = [];
  const pattern = /<(?:[\w.-]+:)?sheet\b([^>]*)\/?>/g;
  for (const match of workbookXml.matchAll(pattern)) {
    const name = xmlAttribute(match[1], "name");
    if (!name) fail();
    names.push(name);
  }
  return names;
}

function relationshipTarget(relsXml: string, relationshipId: string | null) {
  if (!relationshipId) return null;
  const pattern = /<(?:[\w.-]+:)?Relationship\b([^>]*)\/?>/g;
  for (const match of relsXml.matchAll(pattern)) {
    if (xmlAttribute(match[1], "Id") === relationshipId) {
      const target = xmlAttribute(match[1], "Target");
      return target ? target.replace(/^\.\//, "") : null;
    }
  }
  return null;
}

function firstSheetRelationshipId(workbookXml: string) {
  const match = workbookXml.match(/<(?:[\w.-]+:)?sheet\b([^>]*)\/?>/);
  if (!match) fail();
  return xmlAttribute(match[1], "id") || xmlAttribute(match[1], "r:id");
}

function sharedStrings(xml: string | undefined) {
  if (!xml) return [];
  const values: string[] = [];
  const pattern = /<(?:[\w.-]+:)?si\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?si>/g;
  for (const match of xml.matchAll(pattern)) {
    const texts = [...match[1].matchAll(/<(?:[\w.-]+:)?t\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?t>/g)];
    values.push(decodeXmlEntities(texts.map((entry) => entry[1]).join("")));
  }
  return values;
}

function cellValue(attributes: string, inner: string | undefined, strings: string[]) {
  const type = xmlAttribute(attributes, "t");
  if (type === "inlineStr") {
    const text = xmlText(`<c>${inner || ""}</c>`, "is");
    return text === null || text === "" ? null : text;
  }
  const raw = inner ? xmlInner(`<c>${inner}</c>`, "v") : null;
  if (raw === null || raw === "") return null;
  const value = decodeXmlEntities(raw);
  if (type === "s") {
    const index = Number(value);
    if (!Number.isInteger(index) || index < 0 || index >= strings.length) fail();
    return strings[index] || null;
  }
  if (type === "str" || type === "b") return value;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value;
}

function parseSheetTable(sheetXml: string, strings: string[]): SheetTable {
  const cells = new Map<string, string | number | null>();
  let maxColumn = 0;
  let maxRow = 0;
  const pattern = /<(?:[\w.-]+:)?c\b([^>]*)(?:\/>|>([\s\S]*?)<\/(?:[\w.-]+:)?c>)/g;
  for (const match of sheetXml.matchAll(pattern)) {
    const attributes = match[1];
    const reference = xmlAttribute(attributes, "r");
    if (!reference) continue;
    const { column, row } = columnIndex(reference);
    cells.set(`${column}:${row}`, cellValue(attributes, match[2], strings));
    maxColumn = Math.max(maxColumn, column);
    maxRow = Math.max(maxRow, row);
  }
  if (maxColumn === 0 || maxRow < 2) fail();

  const headers: string[] = [];
  for (let column = 1; column <= maxColumn; column += 1) {
    const header = cells.get(`${column}:1`);
    headers.push(header === null || header === undefined ? "" : String(header).trim());
  }

  const rows: Array<Array<string | number | null>> = [];
  for (let row = 2; row <= maxRow; row += 1) {
    const values: Array<string | number | null> = [];
    for (let column = 1; column <= maxColumn; column += 1) {
      values.push(cells.has(`${column}:${row}`) ? cells.get(`${column}:${row}`) ?? null : null);
    }
    rows.push(values);
  }
  return { headers, rows };
}

function communityFromItem(item: string) {
  return item.replace(/[0-9]+$/, "");
}

function discoverItemColumns(columnNames: string[]) {
  const candidates = columnNames.filter((name) => {
    if (!ITEM_PATTERN.test(name)) return false;
    return !RESERVED_PREFIXES.has(communityFromItem(name).toUpperCase());
  });
  if (candidates.length === 0) fail();

  const communities = candidates.map(communityFromItem);
  const communityCounts = new Map<string, number>();
  for (const community of communities) {
    communityCounts.set(community, (communityCounts.get(community) || 0) + 1);
  }
  if (
    candidates.length < 6
    || candidates.length > 40
    || communityCounts.size < 2
    || communityCounts.size > 8
    || [...communityCounts.values()].some((count) => count < 3 || count > 12)
  ) fail();

  for (const [community, count] of communityCounts) {
    const suffixes = candidates
      .filter((item) => communityFromItem(item) === community)
      .map((item) => Number(item.slice(community.length)))
      .sort((left, right) => left - right);
    if (suffixes.length !== count || suffixes.some((suffix, index) => suffix !== index + 1)) fail();
  }
  return candidates;
}

function asNumeric(value: string | number | null) {
  if (value === null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) ? numeric : Number.NaN;
}

function sampleStandardDeviation(values: number[]) {
  if (values.length < 2) return Number.NaN;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function selectGroupColumn(metadataHeaders: string[], metadataRows: Array<Array<string | null>>, analyzedRows: boolean[]) {
  const evaluate = (column: string) => {
    if (!SAFE_COLUMN.test(column)) return null;
    const index = metadataHeaders.indexOf(column);
    if (index < 0) return null;
    const values = metadataRows.map((row) => (row[index] ?? "").trim());
    const analyzedValues = values.filter((_, rowIndex) => analyzedRows[rowIndex]);
    if (analyzedValues.some((value) => !value)) return null;
    const levels = [...new Set(analyzedValues)].sort();
    if (levels.length !== 2 || levels.some((level) => !SAFE_GROUP.test(level))) return null;
    const counts = levels.map((level) => analyzedValues.filter((value) => value === level).length);
    if (counts.some((count) => count < 20)) return null;
    return {
      column,
      levels,
      counts: [
        { group: levels[0], n: counts[0] },
        { group: levels[1], n: counts[1] },
      ] as [{ group: string; n: number }, { group: string; n: number }],
    };
  };

  const gender = metadataHeaders.find((header) => header.toLowerCase() === "gender");
  if (gender) {
    const selected = evaluate(gender);
    if (!selected) fail();
    return selected;
  }
  for (const header of metadataHeaders) {
    const selected = evaluate(header);
    if (selected) return selected;
  }
  fail();
}

function parseWorkbookTable(bytes: Uint8Array): SheetTable {
  const files = unzipXlsx(bytes);
  const workbookXml = files.get("xl/workbook.xml");
  if (!workbookXml) fail();
  const names = sheetNames(workbookXml);
  if (names.length !== 1) fail();

  const rels = files.get("xl/_rels/workbook.xml.rels") || "";
  const relationshipId = firstSheetRelationshipId(workbookXml);
  const target = relationshipTarget(rels, relationshipId) || "worksheets/sheet1.xml";
  const normalized = target.replace(/\\/g, "/").replace(/^\//, "");
  const sheetPath = normalized.startsWith("xl/") ? normalized : `xl/${normalized}`;
  const sheetXml = files.get(sheetPath) || files.get("xl/worksheets/sheet1.xml");
  if (!sheetXml) fail();
  return parseSheetTable(sheetXml, sharedStrings(files.get("xl/sharedStrings.xml")));
}

export function precheckOpenSnaWorkbook(bytes: Uint8Array): OpenSnaWorkbookPrecheck {
  try {
    const table = parseWorkbookTable(bytes);
    if (table.rows.length === 0) fail();
    if (table.rows.length > 5000 || table.headers.length > 64) fail();
    if (table.headers.some((header) => !header) || new Set(table.headers).size !== table.headers.length) fail();

    const itemColumns = discoverItemColumns(table.headers);
    const itemIndexes = itemColumns.map((column) => table.headers.indexOf(column));
    const numericRows = table.rows.map((row) => itemIndexes.map((index) => asNumeric(row[index])));
    if (numericRows.some((row) => row.some((value) => Number.isNaN(value)))) fail();
    if (numericRows.some((row) => row.some((value) => value !== null && (!Number.isFinite(value) || value < 1 || value > 5 || value !== Math.round(value))))) fail();

    const analyzedMask = numericRows.map((row) => row.every((value) => value !== null));
    const analyzed = numericRows.filter((_, index) => analyzedMask[index]) as number[][];
    const minimumRows = Math.max(30, itemColumns.length + 5);
    if (analyzed.length < minimumRows) fail();

    for (let column = 0; column < itemColumns.length; column += 1) {
      const values = analyzed.map((row) => row[column]);
      const deviation = sampleStandardDeviation(values);
      if (!Number.isFinite(deviation) || deviation === 0) fail();
    }

    const metadataHeaders = table.headers.filter((header) => !itemColumns.includes(header));
    const metadataRows = table.rows.map((row) => metadataHeaders.map((header) => {
      const value = row[table.headers.indexOf(header)];
      if (value === null || value === "") return null;
      return String(value).trim() || null;
    }));
    const group = selectGroupColumn(metadataHeaders, metadataRows, analyzedMask);

    return {
      valid: true,
      summary: {
        originalRows: table.rows.length,
        analyzedRows: analyzed.length,
        droppedRows: table.rows.length - analyzed.length,
        itemCount: itemColumns.length,
        communityCount: new Set(itemColumns.map(communityFromItem)).size,
        groupColumn: group.column,
        groupCounts: group.counts,
      },
    };
  } catch {
    return { valid: false, code: "WORKBOOK_INVALID" };
  }
}
