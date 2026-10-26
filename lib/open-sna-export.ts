import { isOpenSnaResult, type OpenSnaNode, type OpenSnaResult } from "@/lib/open-sna";
import { getOpenSnaCopy, localizeOpenSnaKnownPhrase, presentOpenSnaCaution, presentOpenSnaInsight } from "@/lib/open-sna-copy";
import type { Locale } from "@/lib/locales";

export type OpenSnaResearchFile = { name: string; content: string; type: string };
const MAX_RESULT_FILE_BYTES = 2 * 1024 * 1024;
const PALETTE = ["#403A8F", "#18A99A", "#D97706", "#7C3AED", "#0E7490", "#BE185D", "#4D7C0F", "#9A3412"];

const COPY = {
  en: {
    title: "Open SNA research report", demo: "Aggregate reference example", uploaded: "Uploaded questionnaire analysis",
    summary: "Analysis summary", methods: "Methods and reproducibility", network: "Estimated network", nodes: "Node statistics",
    edges: "Nonzero network edges", nct: "Subgroup comparison", stability: "Centrality stability", interpretation: "Evidence-bound interpretation",
    warnings: "Warnings and limitations", mapping: "Confirmed variable mapping", runtime: "R runtime and packages",
    original: "Original rows", analyzed: "Analyzed rows", dropped: "Rows excluded by listwise deletion", groups: "Subgroups",
    generated: "Analysis generated (UTC)", fingerprint: "Input SHA-256", profile: "Analysis profile", unavailable: "Not available",
    partial: "Incomplete NCT edge table", partialText: "This older result retains only the largest edge differences. It cannot supply the complete edge-test table; rerun the original workbook to obtain it.",
    full: "Complete NCT edge table", of: "of", tests: "edge tests retained", note: "This report describes the saved analysis. Confirm the research design, data source and decisions before incorporating it into a manuscript.",
    privacy: "Aggregate statistics and variable definitions only. The original workbook and respondent-level records are not included.",
    print: "Use your browser's Print command to save this self-contained report as a PDF.",
    plotNote: "All estimated nonzero edges are shown; positive = teal, negative = dashed red. Node positions are preserved from the analysis.",
    positive: "Positive edge", negative: "Negative edge", key: "Node key", estimate: "Estimate", csNote: "CS below 0.25 or unavailable: do not emphasize rankings. CS of 0.50 or higher is desirable.",
    strength: "Node strength", bridgeStrength: "Bridge strength", predictability: "Predictability R-squared", cs: "Correlation stability (CS)",
    unknownSelection: "Legacy result: no explicit variable mapping was recorded. Original item-name prefixes determined the communities.",
    groupVariable: "Grouping variable", sourceColumn: "Workbook column", id: "Analysis ID", community: "Community", reverse: "Reverse scoring (6 - x)",
    yes: "Yes", no: "No", causality: "Edges are regularized partial correlations, not causal effects. Predictability comes from a separate MGM model.",
    reproduction: "Reproducing this analysis", reproductionBody: "Keep your original workbook privately. Restore the pinned R environment from the matching SNA source checkout and run reproduce.R with the workbook path and repository path. The script verifies the workbook SHA-256 when one was recorded. It does not send data to AI services. The original analysis-engine revision is not embedded in saved results; verify that the model and package versions match before comparing estimates.",
    metadata: "Analysis metadata", noFingerprint: "No original workbook fingerprint was recorded in this result.",
  },
  "zh-hant": {
    title: "Open SNA 研究報告", demo: "彙總參考範例", uploaded: "上傳問卷分析",
    summary: "分析摘要", methods: "方法與重現資訊", network: "估計網絡", nodes: "節點統計",
    edges: "非零網絡邊", nct: "組間比較", stability: "中心性穩定性", interpretation: "依據證據的解讀",
    warnings: "警告與限制", mapping: "已確認的變項對應", runtime: "R 執行環境與套件",
    original: "原始個案數", analyzed: "納入分析的個案數", dropped: "整列刪除排除的個案數", groups: "分組",
    generated: "分析產生時間（UTC）", fingerprint: "輸入檔案 SHA-256", profile: "分析模型", unavailable: "無法提供",
    partial: "NCT 邊檢定表不完整", partialText: "此舊版結果只保留差異最大的部分邊，無法提供完整的邊檢定表；請以原始工作簿重新分析。",
    full: "完整 NCT 邊檢定表", of: "/", tests: "項邊檢定已保留", note: "本報告描述已儲存的分析。納入論文前，請確認研究設計、資料來源與分析決策。",
    privacy: "僅含彙總統計與變項定義，不包含原始工作簿或受試者逐列資料。",
    print: "可使用瀏覽器的列印功能，將這份獨立報告儲存為 PDF。",
    plotNote: "顯示所有估計非零邊；正向為藍綠色，負向為紅色虛線。節點位置沿用分析結果。",
    positive: "正向邊", negative: "負向邊", key: "節點對照", estimate: "估計值", csNote: "CS 低於 0.25 或無法估計時，不應強調排名；CS 達到 0.50 或以上較理想。",
    strength: "節點強度", bridgeStrength: "橋接強度", predictability: "可預測性 R-squared", cs: "相關穩定性（CS）",
    unknownSelection: "舊版結果未記錄明確的變項對應；構念分群由原始題項名稱前綴決定。",
    groupVariable: "分組變項", sourceColumn: "工作簿欄位", id: "分析代碼", community: "構念分群", reverse: "反向計分（6 - x）",
    yes: "是", no: "否", causality: "邊代表正則化偏相關，不代表因果效果；可預測性由獨立 MGM 模型估計。",
    reproduction: "重現本次分析", reproductionBody: "請自行妥善保管原始工作簿。在對應的 SNA 原始碼工作區還原鎖定的 R 環境後，將工作簿路徑和專案路徑傳入 reproduce.R。若結果記錄了工作簿 SHA-256，腳本會先核對。腳本不會把資料傳送到 AI 服務。已儲存結果未包含原始分析引擎修訂版本；比較估計值前，請核對模型和套件版本。",
    metadata: "分析中繼資料", noFingerprint: "此結果未記錄原始工作簿指紋。",
  },
  "zh-hans": {
    title: "Open SNA 研究报告", demo: "汇总参考示例", uploaded: "上传问卷分析",
    summary: "分析摘要", methods: "方法与复现信息", network: "估计网络", nodes: "节点统计",
    edges: "非零网络边", nct: "组间比较", stability: "中心性稳定性", interpretation: "依据证据的解读",
    warnings: "警告与限制", mapping: "已确认的变量对应", runtime: "R 运行环境与包",
    original: "原始个案数", analyzed: "纳入分析的个案数", dropped: "整行删除排除的个案数", groups: "分组",
    generated: "分析生成时间（UTC）", fingerprint: "输入文件 SHA-256", profile: "分析模型", unavailable: "无法提供",
    partial: "NCT 边检验表不完整", partialText: "此旧版结果只保留差异最大的部分边，无法提供完整的边检验表；请以原始工作簿重新分析。",
    full: "完整 NCT 边检验表", of: "/", tests: "项边检验已保留", note: "本报告描述已保存的分析。纳入论文前，请确认研究设计、数据来源与分析决策。",
    privacy: "仅含汇总统计与变量定义，不包含原始工作簿或受试者逐行数据。",
    print: "可使用浏览器的打印功能，将这份独立报告保存为 PDF。",
    plotNote: "显示所有估计非零边；正向为蓝绿色，负向为红色虚线。节点位置沿用分析结果。",
    positive: "正向边", negative: "负向边", key: "节点对照", estimate: "估计值", csNote: "CS 低于 0.25 或无法估计时，不应强调排名；CS 达到 0.50 或以上较理想。",
    strength: "节点强度", bridgeStrength: "桥接强度", predictability: "可预测性 R-squared", cs: "相关稳定性（CS）",
    unknownSelection: "旧版结果未记录明确的变量对应；构念分群由原始题项名称前缀决定。",
    groupVariable: "分组变量", sourceColumn: "工作簿列名", id: "分析代码", community: "构念分群", reverse: "反向计分（6 - x）",
    yes: "是", no: "否", causality: "边代表正则化偏相关，不代表因果效应；可预测性由独立 MGM 模型估计。",
    reproduction: "复现本次分析", reproductionBody: "请自行妥善保管原始工作簿。在对应的 SNA 源代码工作区还原锁定的 R 环境后，将工作簿路径和项目路径传入 reproduce.R。若结果记录了工作簿 SHA-256，脚本会先核对。脚本不会把数据传送到 AI 服务。已保存结果未包含原始分析引擎修订版本；比较估计值前，请核对模型和包版本。",
    metadata: "分析元数据", noFingerprint: "此结果未记录原始工作簿指纹。",
  },
} as const;

export function parseOpenSnaResultFile(text: string): OpenSnaResult {
  if (new TextEncoder().encode(text).byteLength > MAX_RESULT_FILE_BYTES) throw new Error("RESULT_TOO_LARGE");
  let value: unknown;
  try { value = JSON.parse(text.replace(/^\uFEFF/, "")); } catch { throw new Error("INVALID_RESULT"); }
  if (!isOpenSnaResult(value)) throw new Error("INVALID_RESULT");
  return value;
}

function escape(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

function csvCell(value: string | number | boolean | null) {
  if (value === null) return "";
  let text = String(value);
  if (typeof value === "string" && (/^[\s\uFEFF]*[=+\-@]/u.test(text) || /^[\t\r\n]/.test(text))) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function openSnaCsv(headers: string[], rows: Array<Array<string | number | boolean | null>>) {
  return [headers.map(csvCell).join(","), ...rows.map(row => row.map(csvCell).join(","))].join("\r\n") + "\r\n";
}

function nctEvidence(result: OpenSnaResult) {
  const rows = result.subgroupComparison.edgeDifferences ?? result.subgroupComparison.strongestEdgeDifferences;
  return { rows, complete: result.subgroupComparison.edgeDifferences !== undefined && rows.length === result.overview.possibleEdges };
}

function svgDocument(width: number, height: number, title: string, description: string, contents: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img"><title>${escape(title)}</title><desc>${escape(description)}</desc><rect width="${width}" height="${height}" fill="#ffffff"/><g font-family="Arial, Noto Sans CJK SC, sans-serif" fill="#182230">${contents}</g></svg>`;
}

export function openSnaNetworkSvg(result: OpenSnaResult, locale: Locale = "en") {
  const copy = COPY[locale];
  const nodeMap = new Map(result.nodes.map(node => [node.id, node]));
  const originalColumns = new Map(result.source.selection?.items.map(item => [item.id, item.column]) ?? []);
  const communities = [...new Set(result.nodes.map(node => node.community))];
  const color = (community: string) => PALETTE[communities.indexOf(community) % PALETTE.length];
  const pos = (node: OpenSnaNode) => ({ x: 65 + node.x * 1070, y: 130 + node.y * 610 });
  const legendY = 800;
  const height = legendY + 95 + Math.ceil(result.nodes.length / 2) * 25;
  const heading = `<text x="45" y="46" font-size="28" font-weight="700">${escape(copy.network)}</text><text x="45" y="76" font-size="15">${escape(result.analysisProfile)} · n = ${result.source.analyzedRows} · ${result.nodes.length} nodes · ${result.edges.length} edges</text>`;
  const edges = result.edges.map(edge => {
    const source = pos(nodeMap.get(edge.source)!);
    const target = pos(nodeMap.get(edge.target)!);
    return `<line data-edge="${escape(`${edge.source}:${edge.target}`)}" x1="${source.x.toFixed(3)}" y1="${source.y.toFixed(3)}" x2="${target.x.toFixed(3)}" y2="${target.y.toFixed(3)}" stroke="${edge.weight >= 0 ? "#128578" : "#B4234C"}" stroke-width="${Math.max(0.7, edge.absoluteWeight * 13).toFixed(3)}" stroke-opacity="0.7"${edge.weight < 0 ? ' stroke-dasharray="8 5"' : ""}><title>${escape(edge.source)} - ${escape(edge.target)}: ${edge.weight}</title></line>`;
  }).join("");
  const nodes = result.nodes.map(node => {
    const { x, y } = pos(node);
    return `<g data-node="${escape(node.id)}"><circle cx="${x.toFixed(3)}" cy="${y.toFixed(3)}" r="18" fill="${color(node.community)}" stroke="#ffffff" stroke-width="2"/><text x="${x.toFixed(3)}" y="${(y - 25).toFixed(3)}" text-anchor="middle" font-size="13" font-weight="700">${escape(node.id)}</text><title>${escape(node.label)} · ${escape(node.community)}</title></g>`;
  }).join("");
  const legend = `<line x1="45" y1="${legendY}" x2="85" y2="${legendY}" stroke="#128578" stroke-width="3"/><text x="96" y="${legendY + 5}" font-size="14">${escape(copy.positive)}</text><line x1="330" y1="${legendY}" x2="370" y2="${legendY}" stroke="#B4234C" stroke-width="3" stroke-dasharray="8 5"/><text x="381" y="${legendY + 5}" font-size="14">${escape(copy.negative)}</text><text x="45" y="${legendY + 38}" font-size="16" font-weight="700">${escape(copy.key)}</text>`;
  const key = result.nodes.map((node, index) => {
    const x = index % 2 === 0 ? 45 : 625;
    const y = legendY + 65 + Math.floor(index / 2) * 25;
    const label = `${node.id} · ${node.community} · ${originalColumns.get(node.id) ?? node.label}`;
    const shortened = [...label].length > 63 ? [...label].slice(0, 60).join("") + "…" : label;
    return `<circle cx="${x + 5}" cy="${y - 4}" r="5" fill="${color(node.community)}"/><text x="${x + 19}" y="${y}" font-size="12">${escape(shortened)}<title>${escape(label)}</title></text>`;
  }).join("");
  return svgDocument(1200, height, copy.network, copy.plotNote, heading + edges + nodes + legend + key);
}

type ExportMetric = "strength" | "bridgeStrength" | "predictability" | "cs";

export function openSnaMetricSvg(result: OpenSnaResult, metric: ExportMetric, locale: Locale = "en") {
  const copy = COPY[locale];
  const values = metric === "cs" ? result.stability.metrics.map(row => ({ label: row.id, value: row.coefficient })) : result.nodes.map(node => ({ label: node.id, value: node[metric] }));
  const width = 1000;
  const height = 150 + values.length * 34;
  const maximum = metric === "predictability" || metric === "cs" ? 1 : Math.max(0.001, ...values.map(row => row.value ?? 0)) * 1.12;
  const x = 240;
  const chartWidth = 650;
  const title = `<text x="35" y="44" font-size="27" font-weight="700">${escape(copy[metric])}</text><text x="35" y="73" font-size="13">${escape(metric === "predictability" ? copy.causality : copy.csNote)}</text>`;
  const grid = Array.from({ length: 5 }, (_, i) => {
    const value = maximum * i / 4;
    const px = x + chartWidth * i / 4;
    return `<line x1="${px}" x2="${px}" y1="103" y2="${height - 35}" stroke="#E4E7EC"/><text x="${px}" y="${height - 12}" font-size="12" text-anchor="middle">${value.toFixed(2)}</text>`;
  }).join("");
  const bars = values.map((row, index) => {
    const y = 115 + index * 34;
    const value = row.value;
    return `<text x="225" y="${y + 5}" font-size="13" text-anchor="end">${escape(row.label)}</text>${value === null ? "" : `<rect x="${x}" y="${y - 9}" height="18" width="${(Math.max(0, value) / maximum * chartWidth).toFixed(3)}" fill="#403A8F"/>`}<text x="910" y="${y + 5}" font-size="13">${value === null ? escape(copy.unavailable) : value.toFixed(3)}</text>`;
  }).join("");
  const thresholds = metric === "cs" ? [0.25, 0.5].map(value => `<line x1="${x + value * chartWidth}" x2="${x + value * chartWidth}" y1="100" y2="${height - 35}" stroke="#B54708" stroke-dasharray="5 4"/><text x="${x + value * chartWidth}" y="95" text-anchor="middle" font-size="11">${value.toFixed(2)}</text>`).join("") : "";
  return svgDocument(width, height, copy[metric], metric === "predictability" ? copy.causality : copy.csNote, title + grid + bars + thresholds);
}

function table(headers: string[], rows: Array<Array<unknown>>, caption?: string) {
  return `<div class="table-wrap${caption ? " titled-table" : ""}"><table>${caption ? `<caption>${escape(caption)}</caption>` : ""}<thead><tr>${headers.map(header => `<th scope="col">${escape(header)}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(value => `<td${typeof value === "number" ? ' class="numeric"' : ""}>${value === null || value === undefined ? "N/A" : escape(value)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

const NODE_COLUMNS: Array<keyof OpenSnaNode> = ["id", "label", "community", "strength", "expectedInfluence", "betweenness", "closeness", "bridgeStrength", "bridgeExpectedInfluence", "bridgeBetweenness", "bridgeCloseness", "predictability"];
const EDGE_COLUMNS = ["source", "target", "weight", "absoluteWeight", "sign", "relationship"] as const;
const NCT_COLUMNS = ["source", "target", "absoluteDifference", "pValueHolm"] as const;
const STABILITY_COLUMNS = ["id", "metric", "coefficient", "interpretation"] as const;
const REPORT_CENTRALITY: Array<keyof OpenSnaNode> = ["id", "community", "strength", "expectedInfluence", "betweenness", "closeness", "predictability"];
const REPORT_BRIDGES: Array<keyof OpenSnaNode> = ["id", "bridgeStrength", "bridgeExpectedInfluence", "bridgeBetweenness", "bridgeCloseness"];

export function openSnaReportHtml(result: OpenSnaResult, locale: Locale = "en") {
  const copy = COPY[locale];
  const presentation = getOpenSnaCopy(locale);
  const comparison = result.subgroupComparison;
  const evidence = nctEvidence(result);
  const title = result.dataSource === "aggregate-demo" ? copy.demo : copy.uploaded;
  const selection = result.source.selection;
  const metadata = table([copy.metadata, copy.estimate], [
    [copy.generated, result.generatedAt], ["Schema", result.schemaVersion], [copy.profile, result.analysisProfile],
    [copy.original, result.source.originalRows], [copy.analyzed, result.source.analyzedRows], [copy.dropped, result.source.droppedRows],
    [copy.fingerprint, result.inputFingerprint ?? copy.noFingerprint], [copy.groupVariable, result.source.groupColumn],
    [copy.groups, result.source.groupCounts.map(group => `${group.group}: n = ${group.n}`).join("; ")],
  ]);
  const methodRows = Object.entries(result.settings).map(([name, value]) => [name, value]);
  const mapping = selection ? table([copy.sourceColumn, copy.id, copy.community, copy.reverse], selection.items.map(item => [item.column, item.id, item.community, item.reverse ? copy.yes : copy.no])) : `<p>${escape(copy.unknownSelection)}</p>`;
  const nctSummary = table(["Statistic", "Estimate", "p"], [
    [`Global strength (${comparison.groupA})`, comparison.globalStrengthA, null],
    [`Global strength (${comparison.groupB})`, comparison.globalStrengthB, null],
    ["Global strength difference", comparison.globalStrengthDifference, comparison.globalStrengthPValue],
    ["Network structure difference", comparison.networkStructureDifference, comparison.networkStructurePValue],
  ]);
  const nctNote = `<p class="${evidence.complete ? "note" : "warning"}"><strong>${escape(evidence.complete ? copy.full : copy.partial)}</strong> · ${evidence.rows.length} ${escape(copy.of)} ${result.overview.possibleEdges} ${escape(copy.tests)}.${evidence.complete ? "" : ` ${escape(copy.partialText)}`}</p>`;
  const interpretation = result.interpretation.insights.map(insight => {
    const shown = presentOpenSnaInsight(presentation, result, insight);
    return `<article><h3>${escape(shown.title)}</h3><p>${escape(shown.text)}</p><p class="evidence">${escape(shown.evidence)}</p></article>`;
  }).join("");
  const warnings = [
    ...result.interpretation.cautions.map(caution => presentOpenSnaCaution(presentation, caution, result.interpretation.thirdPartyAiUsed)),
    ...result.warnings.filter(warning => !result.interpretation.cautions.includes(`Runtime warning: ${warning}`)).map(warning => localizeOpenSnaKnownPhrase(presentation, warning)),
  ];
  const lang = locale === "en" ? "en" : locale === "zh-hant" ? "zh-Hant" : "zh-Hans";
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'"><title>${escape(copy.title)}</title><style>
  *{box-sizing:border-box}body{margin:0;background:#f7f8fa;color:#182230;font:15px/1.6 Arial,"Noto Sans CJK SC",sans-serif}main{max-width:1180px;margin:28px auto;background:white;padding:44px;border-top:6px solid #403A8F}h1{font-size:32px;line-height:1.2;margin:12px 0}h2{margin-top:38px;border-bottom:1px solid #d0d5dd;padding-bottom:8px;font-size:22px}h3{font-size:17px}p{max-width:94ch}code,pre{font-family:monospace;white-space:pre-wrap;overflow-wrap:anywhere}svg{display:block;width:100%;height:auto;max-height:none}.table-wrap{overflow-x:auto}.titled-table{break-inside:avoid}table{border-collapse:collapse;width:100%;font-size:12px;margin:16px 0;table-layout:auto}th,td{border:1px solid #d0d5dd;padding:7px 9px;text-align:left;overflow-wrap:anywhere}td.numeric{white-space:nowrap;font-variant-numeric:tabular-nums}th{background:#f0eef8;font-weight:700}caption{text-align:left;font-weight:700}.note,.warning{padding:12px 16px;background:#f0f4f7;border-left:4px solid #403A8F}.warning{background:#fff6e6;border-color:#b54708}.evidence,.muted{color:#475467;font-size:13px}.brand{font-size:13px;font-weight:700;letter-spacing:.12em;color:#403A8F}.chart{break-inside:avoid}footer{margin-top:36px;border-top:1px solid #d0d5dd;padding-top:16px;font-size:12px;color:#475467}@media print{body{background:white}main{margin:0;padding:0;border:0;max-width:none}h2,h3{break-after:avoid}article{break-inside:avoid}thead{display:table-header-group}tr{break-inside:avoid}.table-wrap{overflow:visible}table{font-size:10px}.chart svg{max-height:230mm}.print-help{display:none}a{color:inherit}@page{size:A4;margin:16mm}}
  </style></head><body><main><div class="brand">SNA.HK · ${escape(title)}</div><h1>${escape(copy.title)}</h1><p>${escape(copy.note)}</p><p class="print-help muted">${escape(copy.print)}</p>
  <h2>${escape(copy.summary)}</h2>${metadata}<h2>${escape(copy.methods)}</h2><p>${escape(result.models.network.method)}</p><p>${escape(result.models.predictability.method)}</p><p>${escape(copy.causality)}</p>${table(["Setting", "Value"], methodRows)}<h3>${escape(copy.mapping)}</h3>${mapping}<h3>${escape(copy.runtime)}</h3><p>${escape(result.runtime.rVersion)}</p>${table(["Package", "Version"], Object.entries(result.runtime.packages))}
  <h2>${escape(copy.network)}</h2><p>${escape(copy.plotNote)}</p>${openSnaNetworkSvg(result, locale)}<h2>${escape(copy.nodes)}</h2>${table(REPORT_CENTRALITY, result.nodes.map(node => REPORT_CENTRALITY.map(column => node[column])))}${table(REPORT_BRIDGES, result.nodes.map(node => REPORT_BRIDGES.map(column => node[column])), presentation.panels.bridge.label)}<div class="chart">${openSnaMetricSvg(result, "strength", locale)}</div><div class="chart">${openSnaMetricSvg(result, "bridgeStrength", locale)}</div><div class="chart">${openSnaMetricSvg(result, "predictability", locale)}</div>
  <h2>${escape(copy.edges)}</h2>${table([...EDGE_COLUMNS], result.edges.map(edge => EDGE_COLUMNS.map(column => edge[column])))}<h2>${escape(copy.nct)}</h2><p>${escape(comparison.method)} · ${comparison.permutations} permutations · ${escape(comparison.groupA)} n = ${comparison.nA}; ${escape(comparison.groupB)} n = ${comparison.nB}</p>${nctSummary}${nctNote}${table([...NCT_COLUMNS], evidence.rows.map(edge => NCT_COLUMNS.map(column => edge[column])))}
  <h2>${escape(copy.stability)}</h2><p>${escape(result.stability.method)} · ${result.stability.bootstraps} bootstraps</p><p>${escape(copy.csNote)}</p>${table([...STABILITY_COLUMNS], result.stability.metrics.map(metric => STABILITY_COLUMNS.map(column => metric[column])))}<div class="chart">${openSnaMetricSvg(result, "cs", locale)}</div>
  <h2>${escape(copy.interpretation)}</h2><p class="muted">${escape(result.interpretation.generator)}</p>${interpretation}<h2>${escape(copy.warnings)}</h2><ul>${[...new Set(warnings)].map(warning => `<li>${escape(warning)}</li>`).join("")}</ul><h2>${escape(copy.reproduction)}</h2><p>${escape(copy.reproductionBody)}</p><pre>Rscript reproduce.R /path/to/original.xlsx /path/to/SNA</pre><footer>${escape(copy.privacy)}</footer></main></body></html>`;
}

function reproductionScript() {
  return `#!/usr/bin/env Rscript
# Run inside the extracted research package directory.
# Usage: Rscript reproduce.R /path/to/original.xlsx /path/to/SNA
args <- commandArgs(trailingOnly = TRUE)
if (length(args) != 2L) stop("Supply the original workbook path and matching SNA repository path.")
workbook <- normalizePath(args[[1]], mustWork = TRUE)
repo <- normalizePath(args[[2]], mustWork = TRUE)
r_library <- Sys.getenv("OPEN_SNA_R_LIBS_USER", unset = file.path(repo, "tmp", "r-library"))
if (dir.exists(r_library)) {
  .libPaths(unique(c(normalizePath(r_library), .libPaths())))
  Sys.setenv(OPEN_SNA_R_LIBS_USER = r_library, R_LIBS_USER = r_library)
}
if (!requireNamespace("jsonlite", quietly = TRUE) || !requireNamespace("digest", quietly = TRUE)) stop("Restore the pinned R environment from analysis/open-sna/renv.lock first.")
config <- jsonlite::fromJSON("analysis-config.json", simplifyVector = FALSE)
if (!identical(R.version.string, config$runtime$rVersion)) stop("Use the recorded R version before reproducing this analysis.")
if (!is.null(config$inputFingerprint)) {
  actual <- paste0("sha256:", digest::digest(file = workbook, algo = "sha256"))
  if (!identical(actual, config$inputFingerprint)) stop("The workbook does not match the recorded SHA-256. No analysis was started.")
}
for (package in names(config$runtime$packages)) {
  if (!requireNamespace(package, quietly = TRUE) || as.character(utils::packageVersion(package)) != config$runtime$packages[[package]]) stop(paste("Restore the recorded version of", package))
}
command <- c("--vanilla", file.path(repo, "analysis", "open-sna", "analyze.R"), "--input", workbook, "--output", file.path(getwd(), "reproduced-result.json"), "--bootstraps", as.character(config$settings$bootstrapReplicates), "--permutations", as.character(config$settings$nctPermutations), "--seed", as.character(config$settings$seed), "--data-source", "uploaded-workbook")
if (!is.null(config$selection)) command <- c(command, "--selection", file.path(getwd(), "selection.json"))
status <- system2(file.path(R.home("bin"), "Rscript"), args = shQuote(command))
if (status != 0L) stop("The analysis did not finish successfully.")
cat("Wrote reproduced-result.json. Compare statistical fields; timestamps may differ.\\n")
`;
}

export function buildOpenSnaResearchFiles(result: OpenSnaResult, locale: Locale = "en"): OpenSnaResearchFile[] {
  const copy = COPY[locale];
  const evidence = nctEvidence(result);
  const json = (value: unknown) => JSON.stringify(value, null, 2) + "\n";
  const selection = result.source.selection ?? null;
  const config = { schemaVersion: result.schemaVersion, analysisProfile: result.analysisProfile, inputFingerprint: result.inputFingerprint ?? null, settings: result.settings, models: result.models, runtime: result.runtime, selection };
  const files: OpenSnaResearchFile[] = [
    { name: "open-sna-results.json", content: json(result), type: "application/json" },
    { name: "open-sna-node-metrics.csv", content: openSnaCsv(NODE_COLUMNS, result.nodes.map(node => NODE_COLUMNS.map(column => node[column]))), type: "text/csv;charset=utf-8" },
    { name: "open-sna-network-edges.csv", content: openSnaCsv([...EDGE_COLUMNS], result.edges.map(edge => EDGE_COLUMNS.map(column => edge[column]))), type: "text/csv;charset=utf-8" },
    { name: evidence.complete ? "open-sna-nct-all-edges.csv" : "open-sna-nct-preview.csv", content: openSnaCsv([...NCT_COLUMNS], evidence.rows.map(edge => NCT_COLUMNS.map(column => edge[column]))), type: "text/csv;charset=utf-8" },
    { name: "open-sna-stability.csv", content: openSnaCsv([...STABILITY_COLUMNS], result.stability.metrics.map(metric => STABILITY_COLUMNS.map(column => metric[column]))), type: "text/csv;charset=utf-8" },
    { name: "open-sna-network.svg", content: openSnaNetworkSvg(result, locale), type: "image/svg+xml" },
    ...(["strength", "bridgeStrength", "predictability", "cs"] as const).map(metric => ({ name: `open-sna-${metric}.svg`, content: openSnaMetricSvg(result, metric, locale), type: "image/svg+xml" })),
    { name: "open-sna-report.html", content: openSnaReportHtml(result, locale), type: "text/html;charset=utf-8" },
    { name: "analysis-config.json", content: json(config), type: "application/json" },
    { name: "reproduce.R", content: reproductionScript(), type: "text/plain;charset=utf-8" },
    { name: "README.txt", content: `${copy.title}\n\n${copy.privacy}\n\n${copy.reproductionBody}\n\nRscript reproduce.R /path/to/original.xlsx /path/to/SNA\n\n${copy.print}\n\n${evidence.complete ? copy.full : copy.partial + ": " + copy.partialText}\n\n${copy.csNote}\n${copy.causality}\n`, type: "text/plain;charset=utf-8" },
  ];
  if (selection) files.push({ name: "selection.json", content: json(selection), type: "application/json" });
  files.push({ name: "manifest.json", type: "application/json", content: json({ format: "open-sna-research-package-1", analysisSchemaVersion: result.schemaVersion, analysisGeneratedAt: result.generatedAt, analysisProfile: result.analysisProfile, inputFingerprint: result.inputFingerprint ?? null, locale, rawRowsIncluded: false, nctEdgeTableComplete: evidence.complete, nctRows: evidence.rows.length, expectedNctRows: result.overview.possibleEdges, files: files.map(file => file.name) }) });
  return files;
}

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit += 1) crc = (crc & 1) ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** Stored ZIP entries are intentionally uncompressed, portable, and entirely local. */
export function createResearchZip(files: OpenSnaResearchFile[]): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder();
  const seen = new Set<string>();
  const entries = files.map(file => {
    if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,119}$/.test(file.name) || file.name.includes("..") || seen.has(file.name)) throw new Error("INVALID_ARCHIVE_PATH");
    seen.add(file.name);
    return { name: encoder.encode(file.name), data: encoder.encode(file.content), crc: 0, offset: 0 };
  });
  if (entries.length > 100) throw new Error("ARCHIVE_TOO_LARGE");
  const localSize = entries.reduce((total, entry) => total + 30 + entry.name.length + entry.data.length, 0);
  const directorySize = entries.reduce((total, entry) => total + 46 + entry.name.length, 0);
  if (localSize + directorySize > 32 * 1024 * 1024) throw new Error("ARCHIVE_TOO_LARGE");
  const output = new Uint8Array(localSize + directorySize + 22);
  const view = new DataView(output.buffer);
  let offset = 0;
  for (const entry of entries) {
    entry.offset = offset;
    entry.crc = crc32(entry.data);
    view.setUint32(offset, 0x04034b50, true);
    view.setUint16(offset + 4, 20, true);
    view.setUint16(offset + 6, 0x0800, true);
    view.setUint16(offset + 12, 0x21, true);
    view.setUint32(offset + 14, entry.crc, true);
    view.setUint32(offset + 18, entry.data.length, true);
    view.setUint32(offset + 22, entry.data.length, true);
    view.setUint16(offset + 26, entry.name.length, true);
    output.set(entry.name, offset + 30);
    output.set(entry.data, offset + 30 + entry.name.length);
    offset += 30 + entry.name.length + entry.data.length;
  }
  for (const entry of entries) {
    view.setUint32(offset, 0x02014b50, true);
    view.setUint16(offset + 4, 20, true);
    view.setUint16(offset + 6, 20, true);
    view.setUint16(offset + 8, 0x0800, true);
    view.setUint16(offset + 14, 0x21, true);
    view.setUint32(offset + 16, entry.crc, true);
    view.setUint32(offset + 20, entry.data.length, true);
    view.setUint32(offset + 24, entry.data.length, true);
    view.setUint16(offset + 28, entry.name.length, true);
    view.setUint32(offset + 42, entry.offset, true);
    output.set(entry.name, offset + 46);
    offset += 46 + entry.name.length;
  }
  view.setUint32(offset, 0x06054b50, true);
  view.setUint16(offset + 8, entries.length, true);
  view.setUint16(offset + 10, entries.length, true);
  view.setUint32(offset + 12, directorySize, true);
  view.setUint32(offset + 16, localSize, true);
  return output;
}
