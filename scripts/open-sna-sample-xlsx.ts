// Minimal XLSX writer for the synthetic Open SNA sample. The public workbook is produced by scripts/generate-open-sna-sample.ts.
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
  options?: { note?: string },
) {
  const headerCells = headers.map((header, index) => cellXml(index + 1, 1, header)).join("");
  const dataRows = rows.map((row, rowIndex) => {
    const cells = row.map((value, column) => cellXml(column + 1, rowIndex + 2, value)).join("");
    return `<row r="${rowIndex + 2}">${cells}</row>`;
  }).join("");
  const lastColumn = columnLetter(headers.length);
  const lastRow = rows.length + 1;
  const note = options?.note;
  const sheet = `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="A1:${lastColumn}${lastRow}"/>
  <sheetData><row r="1">${headerCells}</row>${dataRows}</sheetData>${note ? `<legacyDrawing r:id="rIdNote"/>` : ""}
</worksheet>`;

  const files: Record<string, string> = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>${note ? `
  <Default Extension="vml" ContentType="application/vnd.openxmlformats-officedocument.vmlDrawing"/>` : ""}
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>${note ? `
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/xl/comments1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml"/>` : ""}
</Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>${note ? `
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>` : ""}
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
  };

  if (note) {
    const escapedNote = xmlEscape(note);
    files["docProps/core.xml"] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <dc:title>Open SNA synthetic sample</dc:title>
  <dc:subject>Synthetic data</dc:subject>
  <dc:description>${escapedNote}</dc:description>
  <dc:creator>Open SNA sample generator</dc:creator>
</cp:coreProperties>`;
    files["xl/comments1.xml"] = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<comments xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <authors><author>Open SNA sample generator</author></authors>
  <commentList>
    <comment ref="A1" authorId="0"><text><t xml:space="preserve">${escapedNote}</t></text></comment>
  </commentList>
</comments>`;
    files["xl/drawings/vmlDrawing1.vml"] = `<xml xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
  <o:shapelayout v:ext="edit"><o:idmap v:ext="edit" data="1"/></o:shapelayout>
  <v:shapetype id="_x0000_t202" coordsize="21600,21600" o:spt="202" path="m,l,21600r21600,l21600,xe"><v:stroke joinstyle="miter"/><v:path gradientshapeok="t" o:connecttype="rect"/></v:shapetype>
  <v:shape id="_x0000_s1025" type="#_x0000_t202" style="position:absolute;margin-left:80pt;margin-top:10pt;width:220pt;height:70pt;z-index:1;visibility:hidden" fillcolor="#ffffe1" o:insetmode="auto">
    <v:fill color2="#ffffe1"/><v:shadow on="t" color="black" obscured="t"/><v:path o:connecttype="none"/>
    <v:textbox style="mso-direction-alt:auto"><div style="text-align:left"></div></v:textbox>
    <x:ClientData ObjectType="Note"><x:MoveWithCells/><x:SizeWithCells/><x:Anchor>1, 15, 0, 10, 4, 15, 5, 4</x:Anchor><x:AutoFill>False</x:AutoFill><x:Row>0</x:Row><x:Column>0</x:Column></x:ClientData>
  </v:shape>
</xml>`;
    files["xl/worksheets/_rels/sheet1.xml.rels"] = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdNote" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/vmlDrawing" Target="../drawings/vmlDrawing1.vml"/>
  <Relationship Id="rIdComments" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="../comments1.xml"/>
</Relationships>`;
  }

  return zipUtf8Files(files);
}
