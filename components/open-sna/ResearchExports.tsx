"use client";

import { useId, useMemo, useRef, useState, type ChangeEvent } from "react";
import type { OpenSnaResult } from "@/lib/open-sna";
import type { Locale } from "@/lib/locales";
import { buildOpenSnaResearchFiles, createResearchZip, parseOpenSnaResultFile } from "@/lib/open-sna-export";

const COPY = {
  en: {
    title: "Save and reopen your research", intro: "Download the complete aggregate result, tables, editable figures, and a printable methods/results report. Saved JSON can be reopened here without uploading your workbook.",
    reopen: "Open saved result (.json)", package: "Download research package (.zip)", individual: "Individual file", download: "Download", loaded: "Saved aggregate result opened. No workbook was uploaded.",
    invalid: "This file is not a supported Open SNA aggregate result. Select the original results JSON downloaded from Open SNA.", large: "The result JSON must be no larger than 2 MiB.", error: "The file could not be opened or downloaded. Try again.",
    legacy: "This older result contains only a preview of NCT edge tests. The package labels that table as incomplete; it does not reconstruct missing tests.",
    files: { json: "Result JSON (reopen later)", nodes: "Node statistics CSV", edges: "Network edges CSV", nct: "All NCT edge tests CSV", nctPreview: "NCT preview CSV (incomplete)", stability: "Stability statistics CSV", network: "Editable network SVG", strength: "Strength chart SVG", bridge: "Bridge strength chart SVG", predictability: "Predictability chart SVG", cs: "Stability chart SVG", report: "Methods and results report HTML (print to PDF)", config: "Analysis configuration JSON", reproduce: "Reproduction script R", selection: "Variable mapping JSON", readme: "Package instructions", manifest: "Package manifest" },
  },
  "zh-hant": {
    title: "儲存與重新開啟研究結果", intro: "下載彙總結果、完整表格、可編輯圖形，以及可列印的方法與結果報告。已儲存的 JSON 可以直接重新開啟，無需上傳原始工作簿。",
    reopen: "開啟已儲存結果（.json）", package: "下載研究資料包（.zip）", individual: "單獨檔案", download: "下載", loaded: "已開啟儲存的彙總結果，未上傳工作簿。",
    invalid: "此檔案不是支援的 Open SNA 彙總結果，請選擇原先從 Open SNA 下載的結果 JSON。", large: "結果 JSON 不得超過 2 MiB。", error: "無法開啟或下載檔案，請重試。",
    legacy: "這份舊版結果只有部分 NCT 邊檢定。資料包會將該表標示為不完整，不會推算缺少的檢定結果。",
    files: { json: "結果 JSON（可重新開啟）", nodes: "節點統計 CSV", edges: "網絡邊 CSV", nct: "全部 NCT 邊檢定 CSV", nctPreview: "NCT 預覽 CSV（不完整）", stability: "穩定性統計 CSV", network: "可編輯網絡 SVG", strength: "節點強度圖 SVG", bridge: "橋接強度圖 SVG", predictability: "可預測性圖 SVG", cs: "穩定性圖 SVG", report: "方法與結果 HTML 報告（可列印為 PDF）", config: "分析設定 JSON", reproduce: "重現分析 R 腳本", selection: "變項對應 JSON", readme: "資料包說明", manifest: "資料包清單" },
  },
  "zh-hans": {
    title: "保存与重新打开研究结果", intro: "下载汇总结果、完整表格、可编辑图形，以及可打印的方法与结果报告。已保存的 JSON 可以直接重新打开，无需上传原始工作簿。",
    reopen: "打开已保存结果（.json）", package: "下载研究数据包（.zip）", individual: "单独文件", download: "下载", loaded: "已打开保存的汇总结果，未上传工作簿。",
    invalid: "此文件不是支持的 Open SNA 汇总结果，请选择原先从 Open SNA 下载的结果 JSON。", large: "结果 JSON 不得超过 2 MiB。", error: "无法打开或下载文件，请重试。",
    legacy: "这份旧版结果只有部分 NCT 边检验。数据包会将该表标记为不完整，不会推算缺少的检验结果。",
    files: { json: "结果 JSON（可重新打开）", nodes: "节点统计 CSV", edges: "网络边 CSV", nct: "全部 NCT 边检验 CSV", nctPreview: "NCT 预览 CSV（不完整）", stability: "稳定性统计 CSV", network: "可编辑网络 SVG", strength: "节点强度图 SVG", bridge: "桥接强度图 SVG", predictability: "可预测性图 SVG", cs: "稳定性图 SVG", report: "方法与结果 HTML 报告（可打印为 PDF）", config: "分析设置 JSON", reproduce: "复现分析 R 脚本", selection: "变量对应 JSON", readme: "数据包说明", manifest: "数据包清单" },
  },
} as const;

const FILE_LABELS = {
  "open-sna-results.json": "json", "open-sna-node-metrics.csv": "nodes", "open-sna-network-edges.csv": "edges",
  "open-sna-nct-all-edges.csv": "nct", "open-sna-nct-preview.csv": "nctPreview", "open-sna-stability.csv": "stability",
  "open-sna-network.svg": "network", "open-sna-strength.svg": "strength", "open-sna-bridgeStrength.svg": "bridge",
  "open-sna-predictability.svg": "predictability", "open-sna-cs.svg": "cs", "open-sna-report.html": "report",
  "analysis-config.json": "config", "reproduce.R": "reproduce", "selection.json": "selection", "README.txt": "readme", "manifest.json": "manifest",
} as const;

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export default function ResearchExports({ result, locale, onReopen, disabled = false }: {
  result: OpenSnaResult | null;
  locale: Locale;
  onReopen: (result: OpenSnaResult) => void;
  disabled?: boolean;
}) {
  const copy = COPY[locale];
  const inputId = useId();
  const revision = useRef(0);
  const [selected, setSelected] = useState("open-sna-results.json");
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);
  const files = useMemo(() => result ? buildOpenSnaResearchFiles(result, locale) : [], [result, locale]);
  const selection = files.find(file => file.name === selected) ?? files[0];
  const buttonClass = "focus-ring inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-black text-[var(--ink)] transition hover:border-[var(--indigo)] hover:bg-[var(--surface-soft)]";

  async function openSaved(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || disabled) return;
    const current = ++revision.current;
    setNotice(null);
    if (file.size > 2 * 1024 * 1024) {
      setNotice({ error: true, text: copy.large });
      return;
    }
    try {
      const parsed = parseOpenSnaResultFile(await file.text());
      if (current !== revision.current) return;
      onReopen(parsed);
      setNotice({ error: false, text: copy.loaded });
    } catch (error) {
      if (current !== revision.current) return;
      setNotice({ error: true, text: error instanceof Error && error.message === "RESULT_TOO_LARGE" ? copy.large : copy.invalid });
    }
  }

  function downloadPackage() {
    try {
      download(new Blob([createResearchZip(files)], { type: "application/zip" }), "open-sna-research-package.zip");
      setNotice(null);
    } catch { setNotice({ error: true, text: copy.error }); }
  }

  return (
    <section className="surface-card p-4 sm:p-5" aria-labelledby={`${inputId}-heading`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0"><h2 id={`${inputId}-heading`} className="text-base font-black text-[var(--ink)]">{copy.title}</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--muted)]">{copy.intro}</p></div>
        <label className={`${buttonClass} shrink-0 ${disabled ? "cursor-not-allowed opacity-50" : ""}`} htmlFor={inputId}>{copy.reopen}<input id={inputId} type="file" accept=".json,application/json" disabled={disabled} onChange={event => void openSaved(event)} className="sr-only" /></label>
      </div>
      {result ? <>
        {!result.subgroupComparison.edgeDifferences ? <p className="mt-3 rounded-xl border border-[var(--amber-line)] bg-[var(--amber-tint)] p-3 text-xs leading-5 text-[var(--ink)]">{copy.legacy}</p> : null}
        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end">
          <button type="button" onClick={downloadPackage} className="focus-ring min-h-12 cursor-pointer rounded-xl bg-[var(--indigo)] px-5 py-3 text-sm font-black text-white hover:brightness-110">{copy.package}</button>
          <div className="flex min-w-0 flex-1 items-end gap-2"><label className="min-w-0 flex-1 text-xs font-bold text-[var(--muted)]">{copy.individual}<select value={selection?.name ?? ""} onChange={event => setSelected(event.target.value)} className="focus-ring mt-1 min-h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)]">{files.map(file => <option key={file.name} value={file.name}>{copy.files[FILE_LABELS[file.name as keyof typeof FILE_LABELS]] ?? file.name}</option>)}</select></label><button type="button" className={buttonClass} onClick={() => { if (selection) download(new Blob([selection.content], { type: selection.type }), selection.name); }}>{copy.download}</button></div>
        </div>
      </> : null}
      {notice ? <p role={notice.error ? "alert" : "status"} className={`mt-3 text-sm ${notice.error ? "text-[var(--danger)]" : "text-[var(--teal-ink)]"}`}>{notice.text}</p> : null}
    </section>
  );
}
