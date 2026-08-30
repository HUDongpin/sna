"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import NetworkGraph from "@/components/open-sna/NetworkGraph";
import {
  decodeOpenSnaAnalysisResponse,
  OPEN_SNA_GENERIC_ANALYSIS_ERROR_MESSAGE,
} from "@/lib/open-sna-errors";
import {
  formatOpenSnaNumber,
  isOpenSnaResult,
  openSnaNodesCsv,
  type OpenSnaNode,
  type OpenSnaResult,
  type OpenSnaTabId,
} from "@/lib/open-sna";
import { cn } from "@/lib/utils";

const panelHeadings: Array<{ id: OpenSnaTabId; label: string; shortLabel: string; summary: string }> = [
  { id: "overview", label: "Data Overview", shortLabel: "Overview", summary: "Sample, model, and data-quality context" },
  { id: "network", label: "Network Visualization", shortLabel: "Network", summary: "Filter, zoom, and inspect node connections" },
  { id: "centrality", label: "Centrality Analysis", shortLabel: "Centrality", summary: "Search and sort ordinary centrality estimates" },
  { id: "bridge", label: "Bridge Node Analysis", shortLabel: "Bridge nodes", summary: "Compare cross-community bridge measures" },
  { id: "predictability", label: "Predictability Analysis", shortLabel: "Predictability", summary: "Review node-level explained variance" },
  { id: "comparison", label: "Subgroup Comparison (NCT)", shortLabel: "Subgroups", summary: "Inspect permutation-based group differences" },
  { id: "stability", label: "Stability Analysis", shortLabel: "Stability", summary: "Check which centrality findings are dependable" },
  { id: "interpretation", label: "AI Interpretation", shortLabel: "Interpretation", summary: "Read an evidence-bounded automated summary" },
];

const MAX_WORKBOOK_BYTES = 5 * 1024 * 1024;
const OPEN_SNA_REFERENCE_ERROR_MESSAGE = "The reference result could not be loaded.";

export function openSnaReferenceErrorMessage(_caught: unknown) {
  return OPEN_SNA_REFERENCE_ERROR_MESSAGE;
}

type IconName = "arrow" | "check" | "chevron" | "close" | "download" | "info" | "search" | "upload";

function Icon({ name, className = "h-4 w-4" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: <path d="m9 18 6-6-6-6" />,
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m8 10 4 4 4-4" />,
    close: <path d="M6 6l12 12M18 6 6 18" />,
    download: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m16 16 5 5" /></>,
    upload: <><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M5 20h14" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function downloadText(fileName: string, contents: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function metricValue(value: number | null, digits = 3) {
  return formatOpenSnaNumber(value, digits);
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="open-sna-metric-card group min-w-0 rounded-[1.35rem] border border-[var(--line)] bg-[var(--page)] p-5 [overflow-wrap:anywhere] transition duration-200 hover:-translate-y-0.5 hover:border-[var(--teal-line)] hover:shadow-[0_12px_30px_rgba(16,24,40,0.08)]">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-[-0.04em] text-[var(--ink)] transition-colors group-hover:text-[var(--indigo)]">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{detail}</p>
    </article>
  );
}

function MethodNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[var(--teal-line)] bg-[var(--teal-tint)] px-4 py-3 text-sm leading-6 text-[var(--ink)]">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--surface)] text-[var(--teal-ink)] shadow-sm"><Icon name="info" /></span>
      <div>{children}</div>
    </div>
  );
}

function EmptyResult() {
  return (
    <div className="flex min-h-[24rem] items-center justify-center rounded-[1.75rem] border border-dashed border-[var(--line)] bg-[var(--page)] p-8 text-center">
      <div className="max-w-md">
        <span aria-hidden="true" className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--surface-soft)] text-sm font-black tracking-[0.14em] text-[var(--indigo)] shadow-sm">
          SNA
        </span>
        <h2 className="mt-5 text-2xl font-black tracking-[-0.03em] text-[var(--ink)]">Choose an analysis source</h2>
        <p className="mt-3 leading-7 text-[var(--muted)]">
          Open the aggregate Programming Resilience reference analysis, or upload a compatible XLSX workbook and run the local R engine.
        </p>
      </div>
    </div>
  );
}

function ResultsTable({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: Array<{ key: keyof OpenSnaNode; label: string }>;
  rows: OpenSnaNode[];
}) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<keyof OpenSnaNode>(() => columns[0]?.key ?? "label");
  const [sortDirection, setSortDirection] = useState<"ascending" | "descending">("descending");
  const allColumns: Array<{ key: keyof OpenSnaNode; label: string; align: "left" | "right" }> = [
    { key: "label", label: "Node", align: "left" },
    { key: "community", label: "Community", align: "left" },
    ...columns.map((column) => ({ ...column, align: "right" as const })),
  ];
  const visibleRows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("en");
    const filtered = normalizedQuery
      ? rows.filter((node) => `${node.id} ${node.label} ${node.community}`.toLocaleLowerCase("en").includes(normalizedQuery))
      : rows;
    return [...filtered].sort((left, right) => {
      const leftValue = left[sortKey];
      const rightValue = right[sortKey];
      let comparison = 0;
      if (typeof leftValue === "number" && typeof rightValue === "number") comparison = leftValue - rightValue;
      else if (leftValue === null && rightValue !== null) comparison = 1;
      else if (leftValue !== null && rightValue === null) comparison = -1;
      else comparison = String(leftValue ?? "").localeCompare(String(rightValue ?? ""), "en", { numeric: true });
      return sortDirection === "ascending" ? comparison : -comparison;
    });
  }, [query, rows, sortDirection, sortKey]);

  function toggleSort(key: keyof OpenSnaNode) {
    if (sortKey === key) setSortDirection((current) => current === "ascending" ? "descending" : "ascending");
    else {
      setSortKey(key);
      setSortDirection(key === "label" || key === "community" ? "ascending" : "descending");
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
      <div className="flex flex-col gap-3 border-b border-[var(--line)] bg-[var(--page)] p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <label className="relative block w-full sm:max-w-xs">
          <span className="sr-only">Search nodes in {caption}</span>
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Search node or community" className="focus-ring min-h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] py-2 pl-10 pr-3 text-sm text-[var(--ink)] placeholder:text-[var(--muted)]" />
        </label>
        <p className="text-xs font-bold tabular-nums text-[var(--muted)]" aria-live="polite">Showing {visibleRows.length} of {rows.length} nodes</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
          <caption className="sr-only">{caption}. Use column headers to sort the table.</caption>
          <thead className="bg-[var(--page-strong)] text-xs uppercase tracking-[0.1em] text-[var(--muted)]">
            <tr>
              {allColumns.map((column) => (
                <th key={column.key} scope="col" aria-sort={sortKey === column.key ? sortDirection : "none"} className={cn("px-2 py-2 font-black", column.align === "right" && "text-right")}>
                  <button type="button" onClick={() => toggleSort(column.key)} className={cn("focus-ring inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg px-2 transition hover:bg-[var(--surface)] hover:text-[var(--ink)]", column.align === "right" && "ml-auto")}>
                    {column.label}
                    <svg aria-hidden="true" viewBox="0 0 12 16" className={cn("h-4 w-3 transition", sortKey === column.key ? "text-[var(--indigo)]" : "opacity-35")} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m3 6 3-3 3 3" opacity={sortKey === column.key && sortDirection === "descending" ? 0.25 : 1} />
                      <path d="m3 10 3 3 3-3" opacity={sortKey === column.key && sortDirection === "ascending" ? 0.25 : 1} />
                    </svg>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {visibleRows.map((node) => (
              <tr key={node.id} className="bg-[var(--surface)] transition-colors hover:bg-[var(--surface-soft)]">
                <th scope="row" className="px-4 py-3 font-black text-[var(--ink)]">{node.label}</th>
                <td className="px-4 py-3 text-[var(--muted)]">{node.community}</td>
                {columns.map((column) => {
                  const value = node[column.key];
                  return (
                    <td key={column.key} className="px-4 py-3 text-right tabular-nums text-[var(--ink)]">
                      {typeof value === "number" ? metricValue(value) : "Not available"}
                    </td>
                  );
                })}
              </tr>
            ))}
            {!visibleRows.length ? <tr><td colSpan={allColumns.length} className="px-4 py-10 text-center text-[var(--muted)]">No nodes match “{query}”.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OverviewPanel({ result }: { result: OpenSnaResult }) {
  const communities = Array.from(new Set(result.nodes.map((node) => node.community)));
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Analyzed responses" value={result.overview.analyzedRows.toLocaleString("en")} detail={`${result.source.droppedRows} rows removed by listwise deletion`} />
        <MetricCard label="Network size" value={`${result.overview.nodeCount} nodes`} detail={`${result.overview.edgeCount} of ${result.overview.possibleEdges} possible edges`} />
        <MetricCard label="Network density" value={metricValue(result.overview.density)} detail={`${result.overview.positiveEdges} positive and ${result.overview.negativeEdges} negative edges`} />
        <MetricCard label="Mean predictability" value={metricValue(result.overview.meanPredictability)} detail="Mean R-squared from a separate MGM model" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--page)] p-5 sm:p-6">
          <h3 className="text-lg font-black text-[var(--ink)]">Data contract</h3>
          <dl className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-x-5 gap-y-3 text-sm">
            <dt className="text-[var(--muted)]">Worksheet</dt><dd className="text-right font-bold text-[var(--ink)]">{result.source.sheet}</dd>
            <dt className="text-[var(--muted)]">Original rows</dt><dd className="text-right font-bold text-[var(--ink)]">{result.source.originalRows.toLocaleString("en")}</dd>
            <dt className="text-[var(--muted)]">Item scale</dt><dd className="text-right font-bold text-[var(--ink)]">Integer 1 to 5</dd>
            <dt className="text-[var(--muted)]">Communities</dt><dd className="max-w-[18rem] text-right font-bold text-[var(--ink)]">{communities.join(", ")}</dd>
            <dt className="text-[var(--muted)]">Missing-data rule</dt><dd className="text-right font-bold text-[var(--ink)]">{result.settings.missingData}</dd>
          </dl>
        </section>
        <section className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--page)] p-5 sm:p-6">
          <h3 className="text-lg font-black text-[var(--ink)]">Subgroup counts</h3>
          <ul className="mt-4 space-y-3">
            {result.source.groupCounts.map((entry) => (
              <li key={entry.group} className="flex items-center justify-between rounded-xl bg-[var(--surface)] px-4 py-3">
                <span className="font-bold text-[var(--ink)]">{entry.group}</span>
                <span className="tabular-nums text-[var(--muted)]">n = {entry.n.toLocaleString("en")}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <MethodNote>
        All network-based panels use the same <strong>{result.analysisProfile}</strong> profile: nonparanormal transformation, Pearson correlation, and EBICglasso with gamma {result.settings.gamma}. This prevents incompatible network specifications from being combined silently.
      </MethodNote>
      {result.warnings.length ? (
        <section className="rounded-2xl border border-[var(--amber-line)] bg-[var(--amber-tint)] p-5" aria-labelledby="open-sna-runtime-warnings">
          <h3 id="open-sna-runtime-warnings" className="font-black text-[var(--ink)]">Runtime cautions</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--muted)]">
            {result.warnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function NetworkPanel({ result }: { result: OpenSnaResult }) {
  return (
    <div className="space-y-5">
      <NetworkGraph result={result} />
      <details className="rounded-2xl border border-[var(--line)] bg-[var(--page)] p-5">
        <summary className="cursor-pointer font-black text-[var(--ink)]">Accessible edge list</summary>
        <div className="mt-4 max-h-80 overflow-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <caption className="sr-only">Nonzero regularized network edges</caption>
            <thead className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
              <tr><th className="py-2">Source</th><th>Target</th><th className="text-right">Weight</th><th className="text-right">Type</th></tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {result.edges.map((edge) => (
                <tr key={`${edge.source}-${edge.target}`}>
                  <td className="py-2 font-bold">{edge.source}</td><td>{edge.target}</td><td className="text-right tabular-nums">{metricValue(edge.weight)}</td><td className="text-right text-[var(--muted)]">{edge.relationship}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function CentralityPanel({ result }: { result: OpenSnaResult }) {
  const rows = [...result.nodes].sort((left, right) => (right.strength ?? -Infinity) - (left.strength ?? -Infinity));
  return (
    <div className="space-y-5">
      <MethodNote>Ordinary centrality and bridge centrality are reported separately. Only strength has a corresponding ordinary-centrality CS check in this profile; closeness and betweenness remain descriptive. High centrality does not establish causation or an intervention target.</MethodNote>
      <ResultsTable
        caption="Ordinary node centrality estimates"
        rows={rows}
        columns={[
          { key: "strength", label: "Strength" },
          { key: "expectedInfluence", label: "Expected influence" },
          { key: "betweenness", label: "Betweenness" },
          { key: "closeness", label: "Closeness" },
        ]}
      />
    </div>
  );
}

function BridgePanel({ result }: { result: OpenSnaResult }) {
  const rows = [...result.nodes].sort((left, right) => (right.bridgeStrength ?? -Infinity) - (left.bridgeStrength ?? -Infinity));
  const bridgeCs = result.stability.metrics.find((metric) => metric.id === "bridgeStrength");
  const communityCount = new Set(result.nodes.map((node) => node.community)).size;
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard label="Top bridge-strength node" value={rows[0]?.label ?? "Not available"} detail={rows[0]?.bridgeStrength === null ? "Estimate unavailable" : `Bridge strength ${metricValue(rows[0]?.bridgeStrength ?? null)}`} />
        <MetricCard label="Bridge-strength stability" value={bridgeCs?.coefficient === null || !bridgeCs ? "Not available" : metricValue(bridgeCs.coefficient)} detail={bridgeCs?.interpretation ?? "Not available"} />
      </div>
      <ResultsTable
        caption="Bridge-node centrality estimates"
        rows={rows}
        columns={[
          { key: "bridgeStrength", label: "Bridge strength" },
          { key: "bridgeExpectedInfluence", label: "Bridge expected influence" },
          { key: "bridgeBetweenness", label: "Bridge betweenness" },
          { key: "bridgeCloseness", label: "Bridge closeness" },
        ]}
      />
      <MethodNote>Bridge metrics use the {communityCount} detected construct-prefix communities. Any metric with a case-dropping CS coefficient below 0.25 is shown but must not be interpreted.</MethodNote>
    </div>
  );
}

function PredictabilityPanel({ result }: { result: OpenSnaResult }) {
  const rows = [...result.nodes].sort((left, right) => (right.predictability ?? -Infinity) - (left.predictability ?? -Infinity));
  return (
    <div className="space-y-5">
      <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--page)] p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div><h3 className="text-lg font-black text-[var(--ink)]">Node-level explained variance</h3><p className="mt-1 text-sm text-[var(--muted)]">Higher values indicate more variance explained by the remaining nodes.</p></div>
          <span className="rounded-full bg-[var(--surface-soft)] px-3 py-1 text-xs font-black text-[var(--indigo)]">Mean R-squared {metricValue(result.overview.meanPredictability)}</span>
        </div>
        <ol className="space-y-3">
          {rows.map((node) => (
            <li key={node.id} className="grid grid-cols-[3.5rem_minmax(8rem,1fr)_4rem] items-center gap-3 text-sm">
              <span className="font-black text-[var(--ink)]">{node.label}</span>
              <span className="h-2.5 overflow-hidden rounded-full bg-[var(--line)]" aria-hidden="true"><span className="block h-full rounded-full bg-[var(--teal-solid)] transition-[width] duration-300" style={{ width: `${Math.max(0, Math.min(100, (node.predictability ?? 0) * 100))}%` }} /></span>
              <span className="text-right tabular-nums text-[var(--muted)]">{metricValue(node.predictability)}</span>
            </li>
          ))}
        </ol>
      </div>
      <MethodNote>Predictability uses a separate MGM model ({result.models.predictability.id}) fitted to the same input and preprocessing provenance. It is not computed from the displayed EBICglasso edge matrix.</MethodNote>
    </div>
  );
}

function ComparisonPanel({ result }: { result: OpenSnaResult }) {
  const comparison = result.subgroupComparison;
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={`${comparison.groupA} global strength`} value={metricValue(comparison.globalStrengthA)} detail={`n = ${comparison.nA.toLocaleString("en")}`} />
        <MetricCard label={`${comparison.groupB} global strength`} value={metricValue(comparison.globalStrengthB)} detail={`n = ${comparison.nB.toLocaleString("en")}`} />
        <MetricCard label="Global-strength test" value={`p = ${metricValue(comparison.globalStrengthPValue)}`} detail={`Absolute difference ${metricValue(comparison.globalStrengthDifference)}`} />
        <MetricCard label="Structure-invariance test" value={`p = ${metricValue(comparison.networkStructurePValue)}`} detail={`Maximum edge difference ${metricValue(comparison.networkStructureDifference)}`} />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-[var(--line)]">
        <table className="w-full min-w-[38rem] text-left text-sm">
          <caption className="px-4 py-4 text-left font-black text-[var(--ink)]">Largest subgroup edge differences</caption>
          <thead className="bg-[var(--page-strong)] text-xs uppercase tracking-[0.12em] text-[var(--muted)]"><tr><th className="px-4 py-3">Edge</th><th className="px-4 py-3 text-right">Absolute difference</th><th className="px-4 py-3 text-right">Holm-adjusted p</th></tr></thead>
          <tbody className="divide-y divide-[var(--line)]">
            {comparison.strongestEdgeDifferences.slice(0, 12).map((edge) => (
              <tr key={`${edge.source}-${edge.target}`}><th scope="row" className="px-4 py-3 font-bold">{edge.source} to {edge.target}</th><td className="px-4 py-3 text-right tabular-nums">{metricValue(edge.absoluteDifference)}</td><td className="px-4 py-3 text-right tabular-nums">{metricValue(edge.pValueHolm)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <MethodNote>{comparison.method} from NetworkComparisonTest {comparison.packageVersion}; {comparison.permutations.toLocaleString("en")} independent-group permutations with Holm correction. A p-value is evidence about the tested difference, not evidence of causation.</MethodNote>
    </div>
  );
}

function StabilityPanel({ result }: { result: OpenSnaResult }) {
  const badgeClass = (label: string) => label === "Desirable" ? "bg-[var(--teal-tint-strong)] text-[var(--teal-ink)]" : label === "Acceptable" ? "bg-[var(--amber-tint-strong)] text-[var(--amber-ink)]" : "bg-[var(--danger-tint-strong)] text-[var(--danger)]";
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {result.stability.metrics.map((metric) => (
          <article key={metric.id} className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--page)] p-5">
            <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-[var(--ink)]">{metric.metric}</p><p className="mt-2 text-3xl font-black tabular-nums tracking-[-0.04em]">{metricValue(metric.coefficient)}</p></div><span className={cn("rounded-full px-3 py-1 text-xs font-black", badgeClass(metric.interpretation))}>{metric.interpretation}</span></div>
          </article>
        ))}
      </div>
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--page)] p-5 text-sm leading-7 text-[var(--muted)]">
        <p><strong className="text-[var(--ink)]">Decision rule:</strong> CS below {result.stability.acceptableThreshold.toFixed(2)} must not be interpreted; {result.stability.acceptableThreshold.toFixed(2)} to {(result.stability.desirableThreshold - 0.01).toFixed(2)} is acceptable; {result.stability.desirableThreshold.toFixed(2)} or above is desirable.</p>
        <p className="mt-2">Method: {result.stability.method}, correlation threshold {result.stability.correlationThreshold.toFixed(2)}, {result.stability.bootstraps.toLocaleString("en")} case-dropping bootstrap samples, {result.stability.cores} core.</p>
      </div>
    </div>
  );
}

function InterpretationPanel({ result }: { result: OpenSnaResult }) {
  const lunaUsed = result.interpretation.thirdPartyAiUsed;
  const referenceResult = result.dataSource === "aggregate-demo";
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[var(--amber-line)] bg-[var(--amber-tint)] p-5">
        <div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-[var(--ink)]">Automated evidence summary</h3><span className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-xs font-black text-[var(--muted)]">{lunaUsed ? "GPT-5.6 Luna via OpenRouter" : referenceResult ? "Precomputed R reference" : "Deterministic R fallback"}</span></div>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          {lunaUsed
            ? "GPT-5.6 Luna generated this interpretation from aggregate statistics only. The server sends no row-level workbook data or respondent IDs and requires zero-data-retention routing."
            : referenceResult
              ? "This precomputed reference preserves the deterministic R evidence summary and does not make an AI request. Run a workbook analysis to generate an aggregate-only LUNA interpretation."
              : "LUNA was unavailable or not configured for this result, so Open SNA is showing its deterministic R evidence summary. No row-level workbook data was sent to an AI provider."}
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {result.interpretation.insights.map((insight) => (
          <article key={insight.id} className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--page)] p-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--indigo)]">Evidence {insight.evidence}</p>
            <h3 className="mt-3 text-lg font-black text-[var(--ink)]">{insight.title}</h3>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{insight.text}</p>
          </article>
        ))}
      </div>
      <section className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--page)] p-5"><h3 className="font-black text-[var(--ink)]">Interpretation limits</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--muted)]">{result.interpretation.cautions.map((caution) => <li key={caution}>{caution}</li>)}</ul></section>
    </div>
  );
}

function ActivePanel({ result, activeTab }: { result: OpenSnaResult; activeTab: OpenSnaTabId }) {
  if (activeTab === "overview") return <OverviewPanel result={result} />;
  if (activeTab === "network") return <NetworkPanel result={result} />;
  if (activeTab === "centrality") return <CentralityPanel result={result} />;
  if (activeTab === "bridge") return <BridgePanel result={result} />;
  if (activeTab === "predictability") return <PredictabilityPanel result={result} />;
  if (activeTab === "comparison") return <ComparisonPanel result={result} />;
  if (activeTab === "stability") return <StabilityPanel result={result} />;
  return <InterpretationPanel result={result} />;
}

function tabFromHash(hash: string): OpenSnaTabId | null {
  const candidate = hash.replace(/^#analysis-/, "");
  return panelHeadings.some((panel) => panel.id === candidate) ? candidate as OpenSnaTabId : null;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
}

export default function OpenSnaWorkbench() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<OpenSnaTabId>("overview");
  const [result, setResult] = useState<OpenSnaResult | null>(null);
  const [workbook, setWorkbook] = useState<File | null>(null);
  const [bootstraps, setBootstraps] = useState("1000");
  const [busySource, setBusySource] = useState<"reference" | "workbook" | null>(null);
  const [message, setMessage] = useState("Loading the aggregate reference analysis...");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const busy = busySource !== null;

  function scrollToResults() {
    window.requestAnimationFrame(() => {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document.getElementById("open-sna-results")?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    });
  }

  function selectPanel(id: OpenSnaTabId, options: { writeHash?: boolean; scroll?: boolean } = {}) {
    setActiveTab(id);
    if (typeof window !== "undefined" && options.writeHash !== false) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#analysis-${id}`);
    }
    if (options.scroll) scrollToResults();
  }

  async function loadReference(options: { scroll?: boolean } = {}) {
    setBusySource("reference");
    setError(null);
    setMessage("Loading the aggregate reference analysis...");
    try {
      const response = await fetch("/open-sna/programming-resilience-demo.json", { cache: "no-store" });
      const payload: unknown = await response.json();
      if (!response.ok || !isOpenSnaResult(payload)) throw new Error("The reference result does not match the Open SNA contract.");
      setResult(payload);
      setMessage("Programming Resilience aggregate reference loaded and ready to explore.");
      const deepLinkedTab = typeof window === "undefined" ? null : tabFromHash(window.location.hash);
      if (deepLinkedTab) setActiveTab(deepLinkedTab);
      else setActiveTab("overview");
      setSetupOpen(false);
      if (options.scroll) scrollToResults();
    } catch (caught) {
      setResult(null);
      setError(openSnaReferenceErrorMessage(caught));
    } finally {
      setBusySource(null);
    }
  }

  useEffect(() => {
    void loadReference();
    const handleHashChange = () => {
      const linkedTab = tabFromHash(window.location.hash);
      if (linkedTab) setActiveTab(linkedTab);
      if (window.location.hash === "#open-sna-setup") setSetupOpen(true);
    };
    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  function acceptWorkbook(file: File | null) {
    setDragging(false);
    if (!file) {
      setWorkbook(null);
      return;
    }
    if (!file.name.toLocaleLowerCase("en").endsWith(".xlsx")) {
      setWorkbook(null);
      setError("Choose an XLSX workbook. Other file types are not accepted.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size === 0 || file.size > MAX_WORKBOOK_BYTES) {
      setWorkbook(null);
      setError(file.size === 0 ? "The selected workbook is empty." : "The selected workbook is larger than the 5 MiB upload limit.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setWorkbook(file);
    setError(null);
    setMessage(`${file.name} is ready. Review the stability setting, then run the R analysis.`);
  }

  function handleWorkbookChange(event: ChangeEvent<HTMLInputElement>) {
    acceptWorkbook(event.target.files?.[0] ?? null);
  }

  function handleWorkbookDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    acceptWorkbook(event.dataTransfer.files?.[0] ?? null);
  }

  function removeWorkbook() {
    setWorkbook(null);
    setError(null);
    setMessage(result ? "The current result remains open. Choose another workbook whenever you are ready." : "Choose an XLSX workbook or open the aggregate reference.");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function analyzeWorkbook() {
    if (!workbook) return;
    setBusySource("workbook");
    setError(null);
    setMessage("Running validation, network estimation, subgroup comparison, and stability analysis in R, followed by an aggregate-only LUNA interpretation. This may take several minutes.");
    try {
      const formData = new FormData();
      formData.set("workbook", workbook);
      formData.set("bootstraps", bootstraps);
      formData.set("permutations", "1000");
      const response = await fetch("/api/open-sna/analyze", { method: "POST", body: formData });
      const decoded = await decodeOpenSnaAnalysisResponse(response);
      if (!decoded.ok) {
        setError(decoded.message);
        setMessage("No uploaded-workbook result was substituted with reference data.");
        setSetupOpen(true);
        return;
      }
      const payload = decoded.payload;
      if (!isOpenSnaResult(payload)) {
        setError(OPEN_SNA_GENERIC_ANALYSIS_ERROR_MESSAGE);
        setMessage("No uploaded-workbook result was substituted with reference data.");
        setSetupOpen(true);
        return;
      }
      setResult(payload);
      setMessage(payload.interpretation.thirdPartyAiUsed
        ? "Workbook analysis and LUNA interpretation complete. Temporary source data was removed."
        : "Workbook analysis complete. LUNA was unavailable, so the deterministic R interpretation is shown. Temporary source data was removed.");
      selectPanel("overview");
      setSetupOpen(false);
      scrollToResults();
    } catch {
      setError(OPEN_SNA_GENERIC_ANALYSIS_ERROR_MESSAGE);
      setMessage("No uploaded-workbook result was substituted with reference data.");
      setSetupOpen(true);
    } finally {
      setBusySource(null);
    }
  }

  function handleTabKeyboard(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % panelHeadings.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + panelHeadings.length) % panelHeadings.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = panelHeadings.length - 1;
    else return;
    event.preventDefault();
    const next = panelHeadings[nextIndex];
    selectPanel(next.id);
    document.getElementById(`open-sna-tab-${next.id}`)?.focus();
  }

  const activeIndex = panelHeadings.findIndex((entry) => entry.id === activeTab);
  const activeHeading = panelHeadings[activeIndex] ?? panelHeadings[0];
  const previousPanel = panelHeadings[(activeIndex - 1 + panelHeadings.length) % panelHeadings.length];
  const nextPanel = panelHeadings[(activeIndex + 1) % panelHeadings.length];

  return (
    <section id="open-sna-workbench" lang="en" aria-label="Open SNA analysis workbench" className="scroll-mt-24 grid gap-5 xl:grid-cols-[20rem_minmax(0,1fr)] xl:items-start">
      <aside id="open-sna-setup" className="surface-card scroll-mt-24 h-fit overflow-hidden xl:sticky xl:top-24">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] bg-[var(--surface-soft)] p-4 sm:p-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--indigo)]">Analysis setup</p>
            <h2 className="mt-1 text-xl font-black tracking-[-0.025em] text-[var(--ink)]">Data and model</h2>
          </div>
          <button type="button" onClick={() => setSetupOpen((open) => !open)} aria-expanded={setupOpen} aria-controls="open-sna-setup-controls" className="focus-ring grid h-11 w-11 cursor-pointer place-items-center rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--indigo)] transition hover:border-[var(--indigo)] xl:hidden" aria-label={`${setupOpen ? "Collapse" : "Expand"} analysis setup`}>
            <Icon name="chevron" className={cn("h-5 w-5 transition-transform", setupOpen && "rotate-180")} />
          </button>
        </div>

        <aside className="m-4 mb-0 rounded-xl border border-[var(--teal-line)] bg-[var(--teal-tint)] p-4 sm:m-5 sm:mb-0" aria-label="Open SNA Public Beta notice">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--teal-ink)]">Public Beta</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-[var(--ink)]">
            <li>The service processes one analysis at a time.</li>
            <li>A second concurrent request may return WORKER_BUSY.</li>
            <li>Large workbooks or analyses with 1,000 bootstrap replicates may time out.</li>
            <li>Uploaded workbooks and row-level data are not retained.</li>
            <li>This Public Beta has no high-availability or availability commitment.</li>
          </ul>
        </aside>

        <div id="open-sna-setup-controls" className={cn("space-y-5 p-4 sm:p-5", setupOpen ? "block" : "hidden", "xl:block")}>
          <div>
            <div className="flex items-center justify-between gap-3">
              <p id="open-sna-workbook-label" className="text-sm font-black text-[var(--ink)]">1. Choose workbook</p>
              <span className="text-xs font-bold text-[var(--muted)]">XLSX · max 5 MiB</span>
            </div>
            <input ref={fileInputRef} id="open-sna-workbook" type="file" accept=".xlsx" onChange={handleWorkbookChange} className="sr-only" aria-label="Choose XLSX workbook" aria-describedby="open-sna-workbook-help" />
            <div onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleWorkbookDrop} className={cn("mt-2 rounded-2xl border border-dashed p-4 text-center transition duration-200", dragging ? "scale-[1.01] border-[var(--indigo)] bg-[var(--surface-soft)] shadow-[0_12px_30px_rgba(64,58,143,0.12)]" : workbook ? "border-[var(--teal-line)] bg-[var(--teal-tint)]" : "border-[var(--line-strong)] bg-[var(--page)] hover:border-[var(--indigo)]")}>
              <span className={cn("mx-auto grid h-11 w-11 place-items-center rounded-xl", workbook ? "bg-[var(--teal-tint-strong)] text-[var(--teal-ink)]" : "bg-[var(--surface-soft)] text-[var(--indigo)]")}>
                {workbook ? <Icon name="check" className="h-5 w-5" /> : <Icon name="upload" className="h-5 w-5" />}
              </span>
              {workbook ? (
                <div className="mt-3">
                  <p className="break-all text-sm font-black text-[var(--ink)]">{workbook.name}</p>
                  <p className="mt-1 text-xs tabular-nums text-[var(--muted)]">{formatFileSize(workbook.size)} · ready to validate</p>
                </div>
              ) : (
                <div className="mt-3">
                  <p className="text-sm font-black text-[var(--ink)]">Drop a workbook here</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">or browse from this device</p>
                </div>
              )}
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <label htmlFor="open-sna-workbook" className="focus-ring inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-[#403A8F] px-4 text-sm font-black text-[#F8FAFC] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#302B78]">{workbook ? "Replace file" : "Choose file"}</label>
                {workbook ? <button type="button" onClick={removeWorkbook} className="focus-ring inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-black text-[var(--muted)] transition hover:text-[var(--danger)]"><Icon name="close" />Remove</button> : null}
              </div>
            </div>
            <p id="open-sna-workbook-help" className="mt-2 text-xs leading-5 text-[var(--muted)]">Use one worksheet with 6 to 40 integer Likert items (1 to 5), repeated construct prefixes, and a required valid two-level Gender or metadata column with at least 20 analyzed rows per group after listwise deletion.</p>
          </div>

          <div>
            <label htmlFor="open-sna-bootstrap" className="text-sm font-black text-[var(--ink)]">2. Stability precision</label>
            <div className="relative mt-2">
              <select id="open-sna-bootstrap" value={bootstraps} onChange={(event) => setBootstraps(event.target.value)} className="focus-ring min-h-12 w-full cursor-pointer appearance-none rounded-xl border border-[var(--line)] bg-[var(--page)] px-3 pr-10 text-sm font-bold text-[var(--ink)]">
                <option value="100">100 - development check</option>
                <option value="500">500 - extended check</option>
                <option value="1000">1,000 - recommended result</option>
              </select>
              <Icon name="chevron" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            </div>
          </div>

          <details className="group rounded-xl border border-[var(--line)] bg-[var(--page)]">
            <summary className="focus-ring flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 text-sm font-black text-[var(--ink)] marker:content-none">
              Method settings
              <Icon name="chevron" className="h-4 w-4 text-[var(--muted)] transition-transform group-open:rotate-180" />
            </summary>
            <dl className="space-y-3 border-t border-[var(--line)] px-4 py-3 text-xs">
              <div className="flex justify-between gap-3"><dt className="text-[var(--muted)]">Profile</dt><dd className="text-right font-black">NPN EBICglasso v1</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-[var(--muted)]">EBIC gamma</dt><dd className="font-black">0.50</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-[var(--muted)]">NCT</dt><dd className="font-black">1,000 permutations</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-[var(--muted)]">Seed</dt><dd className="font-black">2026</dd></div>
            </dl>
          </details>

          <button type="button" onClick={() => void analyzeWorkbook()} disabled={!workbook || busy} className="focus-ring inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#403A8F] px-4 font-black text-[#F8FAFC] shadow-[0_12px_24px_rgba(64,58,143,0.22)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#302B78] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-45">
            {busySource === "workbook" ? <span className="open-sna-spinner h-4 w-4 rounded-full border-2 border-white/35 border-t-white" aria-hidden="true" /> : <Icon name="arrow" />}
            {busySource === "workbook" ? "Analysis running" : "Run R + LUNA analysis"}
          </button>
          {!workbook ? <p className="-mt-3 text-center text-xs text-[var(--muted)]">Choose a valid workbook to enable analysis.</p> : null}

          {busySource === "workbook" ? (
            <div className="rounded-xl border border-[var(--teal-line)] bg-[var(--teal-tint)] p-3" aria-label="Analysis sequence">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--teal-ink)]">Analysis sequence</p>
              <ol className="mt-2 grid grid-cols-2 gap-2 text-xs text-[var(--muted)]">
                {["Validate", "Estimate", "Compare", "Stabilize", "Interpret"].map((step) => <li key={step} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[var(--teal-solid)]" aria-hidden="true" />{step}</li>)}
              </ol>
            </div>
          ) : null}

          <div className="border-t border-[var(--line)] pt-5">
            <div className="flex items-center justify-between gap-3"><p className="text-sm font-black text-[var(--ink)]">Reference result</p>{result?.dataSource === "aggregate-demo" ? <span className="rounded-full bg-[var(--teal-tint-strong)] px-2 py-1 text-[0.68rem] font-black uppercase tracking-[0.1em] text-[var(--teal-ink)]">Open</span> : null}</div>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Explore precomputed aggregate statistics without uploading row-level data.</p>
            <button type="button" onClick={() => void loadReference({ scroll: true })} disabled={busy} className="focus-ring mt-3 inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-black text-[var(--indigo)] transition hover:border-[var(--indigo)] hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-45">
              {busySource === "reference" ? <span className="open-sna-spinner h-4 w-4 rounded-full border-2 border-[var(--line)] border-t-[var(--indigo)]" aria-hidden="true" /> : null}
              {result?.dataSource === "aggregate-demo" ? "Reset reference view" : "Open aggregate reference"}
            </button>
          </div>

          <details className="group rounded-xl border border-[var(--line)] bg-[var(--page)] text-xs leading-5 text-[var(--muted)]">
            <summary className="focus-ring flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3 font-black text-[var(--ink)] marker:content-none">Privacy and production note<Icon name="chevron" className="h-4 w-4 transition-transform group-open:rotate-180" /></summary>
            <p className="border-t border-[var(--line)] p-3">Production uploads require a separately configured R analysis service. If unavailable, Open SNA fails closed and never substitutes example results. LUNA receives aggregate statistics only through a server-side, zero-data-retention request; the workbook, source rows, and respondent IDs are never sent to OpenRouter.</p>
          </details>
        </div>
      </aside>

      <div className="min-w-0 space-y-4">
        <div role={error ? "alert" : "status"} aria-live="polite" className={cn("relative overflow-hidden rounded-2xl border px-4 py-3 text-sm", error ? "border-[var(--danger-line)] bg-[var(--danger-tint)] text-[var(--danger)]" : busy ? "border-[var(--teal-line)] bg-[var(--teal-tint)] text-[var(--ink)]" : "border-[var(--line)] bg-[var(--surface)] text-[var(--muted)]")}>
          {busy ? <span className="open-sna-status-progress absolute inset-x-0 top-0 h-0.5 bg-[var(--teal-solid)]" aria-hidden="true" /> : null}
          <div className="flex items-start gap-3">
            <span className={cn("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full", error ? "bg-[var(--danger-tint-strong)]" : busy ? "bg-[var(--teal-tint-strong)] text-[var(--teal-ink)]" : "bg-[var(--surface-soft)] text-[var(--indigo)]")}>
              {busy ? <span className="open-sna-spinner h-4 w-4 rounded-full border-2 border-[var(--line)] border-t-[var(--teal-ink)]" aria-hidden="true" /> : <Icon name={error ? "info" : "check"} />}
            </span>
            <div className="min-w-0 [overflow-wrap:anywhere]"><p className="font-black text-[var(--ink)]">{error ? "Action needed" : busy ? "Open SNA is working" : "Ready"}</p><p className="mt-0.5 leading-6">{error ?? message}</p></div>
          </div>
        </div>

        {result ? (
          <div id="open-sna-results" className="scroll-mt-24 space-y-4" aria-busy={busy}>
            <header className="surface-card flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[var(--teal-tint-strong)] px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--teal-ink)]">{result.dataSource === "aggregate-demo" ? "Aggregate reference" : "Uploaded workbook"}</span><span className="text-xs font-bold text-[var(--muted)]">Schema {result.schemaVersion}</span></div>
                <h2 className="mt-3 break-words text-balance text-xl font-black leading-tight tracking-[-0.025em] text-[var(--ink)] [overflow-wrap:anywhere] sm:text-2xl">{result.source.fileName}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">{result.overview.analyzedRows.toLocaleString("en")} responses · {result.overview.nodeCount} nodes · {result.overview.edgeCount} nonzero edges</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <button type="button" onClick={() => downloadText("open-sna-results.json", JSON.stringify(result, null, 2), "application/json")} className="focus-ring inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-black text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-[var(--indigo)] hover:bg-[var(--surface-soft)]"><Icon name="download" />JSON</button>
                <button type="button" onClick={() => downloadText("open-sna-node-metrics.csv", openSnaNodesCsv(result), "text/csv;charset=utf-8")} className="focus-ring inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--teal-solid)] px-3 text-sm font-black text-[#071b18] shadow-sm transition hover:-translate-y-0.5 hover:brightness-95"><Icon name="download" />Node CSV</button>
              </div>
            </header>

            <div className="surface-card">
              <div id="open-sna-results-nav" className="sticky top-20 z-20 rounded-t-[2rem] border-b border-[var(--line)] bg-[var(--surface-glass)] p-2 backdrop-blur-xl">
                <div className="flex items-center gap-2 sm:hidden">
                  <button type="button" onClick={() => selectPanel(previousPanel.id)} className="focus-ring grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--indigo)]" aria-label={`Previous analysis: ${previousPanel.label}`}><Icon name="arrow" className="h-5 w-5 rotate-180" /></button>
                  <label className="relative min-w-0 flex-1"><span className="sr-only">Jump to analysis</span><select value={activeTab} onChange={(event) => selectPanel(event.target.value as OpenSnaTabId)} className="focus-ring min-h-11 w-full cursor-pointer appearance-none rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 pr-9 text-sm font-black text-[var(--ink)]">{panelHeadings.map((panel, index) => <option key={panel.id} value={panel.id}>{index + 1}. {panel.shortLabel}</option>)}</select><Icon name="chevron" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" /></label>
                  <button type="button" onClick={() => selectPanel(nextPanel.id)} className="focus-ring grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--indigo)]" aria-label={`Next analysis: ${nextPanel.label}`}><Icon name="arrow" className="h-5 w-5" /></button>
                </div>

                <div role="tablist" aria-label="Open SNA analyses" aria-orientation="horizontal" className="hidden grid-cols-2 gap-1 sm:grid lg:grid-cols-4">
                  {panelHeadings.map((panel, index) => (
                    <button key={panel.id} id={`open-sna-tab-${panel.id}`} type="button" role="tab" aria-label={panel.label} aria-selected={activeTab === panel.id} aria-controls={`open-sna-panel-${panel.id}`} tabIndex={activeTab === panel.id ? 0 : -1} onClick={() => selectPanel(panel.id)} onKeyDown={(event) => handleTabKeyboard(event, index)} className={cn("focus-ring group flex min-h-14 cursor-pointer items-center gap-2 rounded-xl px-3 text-left text-sm font-black transition duration-200", activeTab === panel.id ? "bg-[#403A8F] text-[#F8FAFC] shadow-[0_8px_20px_rgba(64,58,143,0.2)]" : "text-[var(--muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--ink)]")}>
                      <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[0.68rem] tabular-nums", activeTab === panel.id ? "bg-white/15 text-white" : "bg-[var(--page)] text-[var(--indigo)] group-hover:bg-[var(--surface)]")}>{String(index + 1).padStart(2, "0")}</span>
                      <span className="leading-tight">{panel.shortLabel}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--line)]" aria-hidden="true"><span className="block h-full rounded-full bg-[var(--teal-solid)] transition-[width] duration-300" style={{ width: `${((activeIndex + 1) / panelHeadings.length) * 100}%` }} /></div>
              </div>

              <div className="p-4 sm:p-6 lg:p-7">
                <div className="mb-6 flex flex-col gap-2 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-end sm:justify-between">
                  <div><p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--indigo)]">Analysis {activeIndex + 1} of {panelHeadings.length}</p><h2 className="mt-2 text-2xl font-black tracking-[-0.035em] text-[var(--ink)] sm:text-3xl">{activeHeading.label}</h2></div>
                  <p className="max-w-sm text-sm leading-6 text-[var(--muted)] sm:text-right">{activeHeading.summary}</p>
                </div>

                {panelHeadings.map((panel) => (
                  <div key={panel.id} id={`open-sna-panel-${panel.id}`} role="tabpanel" aria-labelledby={`open-sna-tab-${panel.id}`} tabIndex={activeTab === panel.id ? 0 : -1} hidden={activeTab !== panel.id}>
                    {activeTab === panel.id ? <div key={`${result.generatedAt}-${panel.id}`} className="open-sna-panel-enter"><ActivePanel result={result} activeTab={panel.id} /></div> : null}
                  </div>
                ))}

                <nav className="mt-8 grid grid-cols-2 gap-3 border-t border-[var(--line)] pt-5" aria-label="Analysis panel navigation">
                  <button type="button" onClick={() => selectPanel(previousPanel.id, { scroll: true })} className="focus-ring group flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--page)] px-3 text-left text-sm font-black text-[var(--ink)] transition hover:border-[var(--indigo)] hover:bg-[var(--surface-soft)]"><Icon name="arrow" className="h-4 w-4 shrink-0 rotate-180 text-[var(--indigo)] transition-transform group-hover:-translate-x-0.5" /><span className="min-w-0"><span className="block text-[0.68rem] uppercase tracking-[0.1em] text-[var(--muted)]">Previous</span><span className="block break-words leading-tight">{previousPanel.shortLabel}</span></span></button>
                  <button type="button" onClick={() => selectPanel(nextPanel.id, { scroll: true })} className="focus-ring group flex min-h-12 cursor-pointer items-center justify-end gap-2 rounded-xl bg-[#403A8F] px-3 text-right text-sm font-black text-[#F8FAFC] shadow-sm transition hover:bg-[#302B78]"><span className="min-w-0"><span className="block text-[0.68rem] uppercase tracking-[0.1em] text-white/70">Next</span><span className="block break-words leading-tight">{nextPanel.shortLabel}</span></span><Icon name="arrow" className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" /></button>
                </nav>
              </div>
            </div>
          </div>
        ) : <EmptyResult />}
      </div>
    </section>
  );
}
