import { deflateRawSync } from "node:zlib";

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function columnLetter(index: number) {
  let value = index;
  let letter = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    value = Math.floor((value - 1) / 26);
  }
  return letter;
}

function cellXml(column: number, row: number, value: string | number) {
  const reference = `${columnLetter(column)}${row}`;
  if (typeof value === "number") {
    return `<c r="${reference}" t="n"><v>${value}</v></c>`;
  }
  return `<c r="${reference}" t="inlineStr"><is><t>${xmlEscape(value)}</t></is></c>`;
}

function zipUtf8Files(files: Record<string, string>) {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const directory: Array<{ name: Uint8Array; crc: number; compressed: Uint8Array; uncompressedSize: number; offset: number }> = [];
  let offset = 0;

  for (const [name, text] of Object.entries(files)) {
    const uncompressed = encoder.encode(text);
    const compressed = deflateRawSync(uncompressed);
    const nameBytes = encoder.encode(name);
    const crc = crc32(uncompressed);
    const local = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(local.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(8, 8, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, compressed.length, true);
    view.setUint32(22, uncompressed.length, true);
    view.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    chunks.push(local, compressed);
    directory.push({ name: nameBytes, crc, compressed, uncompressedSize: uncompressed.length, offset });
    offset += local.length + compressed.length;
  }

  const centralChunks: Uint8Array[] = [];
  let centralSize = 0;
  for (const entry of directory) {
    const header = new Uint8Array(46 + entry.name.length);
    const view = new DataView(header.buffer);
    view.setUint32(0, 0x02014b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 20, true);
    view.setUint16(10, 8, true);
    view.setUint32(16, entry.crc, true);
    view.setUint32(20, entry.compressed.length, true);
    view.setUint32(24, entry.uncompressedSize, true);
    view.setUint16(28, entry.name.length, true);
    view.setUint32(42, entry.offset, true);
    header.set(entry.name, 46);
    centralChunks.push(header);
    centralSize += header.length;
  }

  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, directory.length, true);
  endView.setUint16(10, directory.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);

  const output = new Uint8Array(offset + centralSize + end.length);
  let cursor = 0;
  for (const chunk of [...chunks, ...centralChunks, end]) {
    output.set(chunk, cursor);
    cursor += chunk.length;
  }
  return output;
}

export const OPEN_SNA_SAMPLE_SHEET_NAME = "Data";
export const OPEN_SNA_SAMPLE_ITEM_HEADERS = [
  "Cmt1", "Cmt2", "Cmt3", "Cmt4",
  "Cnf1", "Cnf2", "Cnf3", "Cnf4",
  "Cop1", "Cop2", "Cop3", "Cop4",
  "Cmp1", "Cmp2", "Cmp3", "Cmp4",
] as const;

export function buildMinimalXlsx(
  headers: string[],
  rows: Array<Array<string | number>>,
  sheetName = OPEN_SNA_SAMPLE_SHEET_NAME,
) {
  const headerCells = headers.map((header, index) => cellXml(index + 1, 1, header)).join("");
  const dataRows = rows.map((row, rowIndex) => {
    const cells = row.map((value, column) => cellXml(column + 1, rowIndex + 2, value)).join("");
    return `<row r="${rowIndex + 2}">${cells}</row>`;
  }).join("");
  const lastColumn = columnLetter(headers.length);
  const lastRow = rows.length + 1;
  const sheet = `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:${lastColumn}${lastRow}"/>
  <sheetData><row r="1">${headerCells}</row>${dataRows}</sheetData>
</worksheet>`;

  return zipUtf8Files({
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="${xmlEscape(sheetName)}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`,
    "xl/worksheets/sheet1.xml": sheet,
  });
}

export const OPEN_SNA_SAMPLE_SEED = 2026;
export const OPEN_SNA_SAMPLE_ROW_COUNT = 50;
export const OPEN_SNA_SAMPLE_GROUP_SIZE = 25;

function createSampleRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function nextGaussian(rng: () => number) {
  const u = Math.max(rng(), 1e-12);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function latentToLikert(value: number) {
  if (value < -1.15) return 1;
  if (value < -0.35) return 2;
  if (value < 0.35) return 3;
  if (value < 1.15) return 4;
  return 5;
}

const SAMPLE_ITEM_LOADINGS = [
  0.86, 0.82, 0.88, 0.8,
  0.84, 0.89, 0.81, 0.85,
  0.83, 0.87, 0.82, 0.9,
  0.81, 0.85, 0.86, 0.83,
] as const;

const SAMPLE_GENDER_SHIFTS = [
  0.18, 0.14, 0.16, 0.1,
  -0.12, -0.16, -0.1, -0.08,
  0.08, 0.12, 0.06, 0.1,
  -0.06, -0.1, -0.08, -0.09,
] as const;

function columnSignature(rows: Array<Array<string | number>>, column: number) {
  return rows.map((row) => row[column]).join("\u0001");
}

export function buildProgrammingResilienceSampleRows() {
  const rng = createSampleRng(OPEN_SNA_SAMPLE_SEED);
  const itemCount = OPEN_SNA_SAMPLE_ITEM_HEADERS.length;
  const rows = Array.from({ length: OPEN_SNA_SAMPLE_ROW_COUNT }, (_, row) => {
    const gender = row < OPEN_SNA_SAMPLE_GROUP_SIZE ? "F" : "M";
    const general = nextGaussian(rng);
    const constructs = [
      0.65 * general + 0.6 * nextGaussian(rng),
      0.65 * general + 0.6 * nextGaussian(rng),
      0.65 * general + 0.6 * nextGaussian(rng),
      0.65 * general + 0.6 * nextGaussian(rng),
    ];
    const items = SAMPLE_ITEM_LOADINGS.map((loading, column) => {
      const uniqueness = Math.sqrt(Math.max(0.08, 1 - loading * loading));
      const shift = SAMPLE_GENDER_SHIFTS[column];
      const construct = constructs[Math.floor(column / 4)];
      const genderShift = gender === "F" ? shift : -shift;
      return latentToLikert(loading * construct + uniqueness * nextGaussian(rng) + genderShift);
    });
    return [...items, gender];
  });
  const signatures = new Set(Array.from({ length: itemCount }, (_, column) => columnSignature(rows, column)));
  if (signatures.size !== itemCount) {
    throw new Error("Open SNA sample items must remain unique after Likert discretization.");
  }
  return rows;
}

export function buildProgrammingResilienceSampleXlsx() {
  const headers = [...OPEN_SNA_SAMPLE_ITEM_HEADERS, "Gender"];
  return buildMinimalXlsx(headers, buildProgrammingResilienceSampleRows(), OPEN_SNA_SAMPLE_SHEET_NAME);
}
