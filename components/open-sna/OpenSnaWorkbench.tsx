"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import NetworkGraph from "@/components/open-sna/NetworkGraph";
import type { Locale } from "@/lib/locales";
import QuestionnaireWorkflow from "@/components/open-sna/QuestionnaireWorkflow";
import ResearchExports from "@/components/open-sna/ResearchExports";
import { advanceWorkbenchTask, detachJobRecovery, uniquePositiveLeader, type JobDisplayStatus, type WorkbenchTaskView } from "@/lib/open-sna-workflow";
import { getWorkflowCopy } from "@/lib/open-sna-workflow-copy";
import {
  fillOpenSna,
  getOpenSnaCopy,
  localizeOpenSnaKnownPhrase,
  openSnaMetricName,
  openSnaRelationshipLabel,
  openSnaStabilityLabel,
  presentOpenSnaCaution,
  presentOpenSnaInsight,
  type OpenSnaCopy,
} from "@/lib/open-sna-copy";
import {
  formatOpenSnaNumber,
  isOpenSnaResult,
  type OpenSnaNode,
  type OpenSnaResult,
  type OpenSnaTabId,
} from "@/lib/open-sna";
import { cn } from "@/lib/utils";

const OPEN_SNA_TABS: ReadonlyArray<{ id: OpenSnaTabId }> = [
  { id: "overview" }, { id: "network" }, { id: "centrality" }, { id: "bridge" },
  { id: "predictability" }, { id: "comparison" }, { id: "stability" }, { id: "interpretation" },
];

type OpenSnaUi = { copy: OpenSnaCopy; locale: Locale; htmlLang: string };

const OpenSnaUiContext = createContext<OpenSnaUi | null>(null);

function useOpenSnaUi() {
  const value = useContext(OpenSnaUiContext);
  if (!value) throw new Error("Open SNA UI copy is unavailable.");
  return value;
}

export function openSnaReferenceErrorMessage(_caught: unknown, locale: Locale = "en") {
  return getOpenSnaCopy(locale).errors.referenceLoad;
}

function panelHeadings(copy: OpenSnaCopy) {
  return OPEN_SNA_TABS.map((tab) => ({ id: tab.id, ...copy.panels[tab.id] }));
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

function metricValue(value: number | null, notAvailable: string, digits = 3) {
  return formatOpenSnaNumber(value, digits, notAvailable);
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
  const { copy } = useOpenSnaUi();
  return (
    <div className="flex min-h-[24rem] items-center justify-center rounded-[1.75rem] border border-dashed border-[var(--line)] bg-[var(--page)] p-8 text-center">
      <div className="max-w-md">
        <span aria-hidden="true" className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--surface-soft)] text-sm font-black tracking-[0.14em] text-[var(--indigo)] shadow-sm">
          SNA
        </span>
        <h2 className="mt-5 text-2xl font-black tracking-[-0.03em] text-[var(--ink)]">{copy.empty.title}</h2>
        <p className="mt-3 leading-7 text-[var(--muted)]">
          {copy.empty.body}
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
  const { copy, htmlLang } = useOpenSnaUi();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<keyof OpenSnaNode>(() => columns[0]?.key ?? "label");
  const [sortDirection, setSortDirection] = useState<"ascending" | "descending">("descending");
  const allColumns: Array<{ key: keyof OpenSnaNode; label: string; align: "left" | "right" }> = [
    { key: "label", label: copy.table.node, align: "left" },
    { key: "community", label: copy.table.community, align: "left" },
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
      else comparison = String(leftValue ?? "").localeCompare(String(rightValue ?? ""), htmlLang, { numeric: true });
      return sortDirection === "ascending" ? comparison : -comparison;
    });
  }, [htmlLang, query, rows, sortDirection, sortKey]);

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
          <span className="sr-only">{fillOpenSna(copy.table.searchLabel, { caption })}</span>
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder={copy.table.searchPlaceholder} className="focus-ring min-h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] py-2 pl-10 pr-3 text-sm text-[var(--ink)] placeholder:text-[var(--muted)]" />
        </label>
        <p className="text-xs font-bold tabular-nums text-[var(--muted)]" aria-live="polite">{fillOpenSna(copy.table.showing, { visible: visibleRows.length, total: rows.length })}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
          <caption className="sr-only">{fillOpenSna(copy.table.sortCaption, { caption })}</caption>
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
                      {typeof value === "number" ? metricValue(value, copy.common.notAvailable) : copy.common.notAvailable}
                    </td>
                  );
                })}
              </tr>
            ))}
            {!visibleRows.length ? <tr><td colSpan={allColumns.length} className="px-4 py-10 text-center text-[var(--muted)]">{fillOpenSna(copy.table.noMatch, { query })}</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OverviewPanel({ result }: { result: OpenSnaResult }) {
  const { copy, htmlLang } = useOpenSnaUi();
  const overview = copy.overview;
  const count = (value: number) => value.toLocaleString(htmlLang);
  const communities = Array.from(new Set(result.nodes.map((node) => node.community)));
  const profileNote = fillOpenSna(overview.profileNote, { profile: result.analysisProfile, gamma: result.settings.gamma });
  const profileParts = profileNote.split(result.analysisProfile);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={overview.analyzedResponses} value={count(result.overview.analyzedRows)} detail={fillOpenSna(overview.analyzedDetail, { count: count(result.source.droppedRows) })} />
        <MetricCard label={overview.networkSize} value={fillOpenSna(overview.networkSizeValue, { count: result.overview.nodeCount })} detail={fillOpenSna(overview.networkSizeDetail, { edges: result.overview.edgeCount, possible: result.overview.possibleEdges })} />
        <MetricCard label={overview.density} value={metricValue(result.overview.density, copy.common.notAvailable)} detail={fillOpenSna(overview.densityDetail, { positive: result.overview.positiveEdges, negative: result.overview.negativeEdges })} />
        <MetricCard label={overview.meanPredictability} value={metricValue(result.overview.meanPredictability, copy.common.notAvailable)} detail={overview.meanPredictabilityDetail} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--page)] p-5 sm:p-6">
          <h3 className="text-lg font-black text-[var(--ink)]">{overview.contractTitle}</h3>
          <dl className="mt-4 space-y-3 text-sm">
            {[
              [overview.worksheet, localizeOpenSnaKnownPhrase(copy, result.source.sheet)],
              [overview.originalRows, count(result.source.originalRows)],
              [overview.itemScale, overview.itemScaleValue],
              [overview.communities, communities.join(", ")],
              [overview.missingDataRule, localizeOpenSnaKnownPhrase(copy, result.settings.missingData)],
            ].map(([label, value]) => (
              <div key={label} className="grid grid-cols-[max-content_minmax(0,1fr)] items-baseline gap-x-4">
                <dt className="whitespace-nowrap text-[var(--muted)]">{label}</dt>
                <dd className="min-w-0 text-right font-bold text-[var(--ink)] [overflow-wrap:anywhere]">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--page)] p-5 sm:p-6">
          <h3 className="text-lg font-black text-[var(--ink)]">{overview.subgroupCounts}</h3>
          <ul className="mt-4 space-y-3">
            {result.source.groupCounts.map((entry) => (
              <li key={entry.group} className="flex items-center justify-between rounded-xl bg-[var(--surface)] px-4 py-3">
                <span className="font-bold text-[var(--ink)]">{entry.group}</span>
                <span className="tabular-nums text-[var(--muted)]">{fillOpenSna(copy.comparison.sampleSize, { count: count(entry.n) })}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <MethodNote>
        {profileParts.length === 2 ? <>{profileParts[0]}<strong>{result.analysisProfile}</strong>{profileParts[1]}</> : profileNote}
      </MethodNote>
      {result.warnings.length ? (
        <section className="rounded-2xl border border-[var(--amber-line)] bg-[var(--amber-tint)] p-5" aria-labelledby="open-sna-runtime-warnings">
          <h3 id="open-sna-runtime-warnings" className="font-black text-[var(--ink)]">{overview.runtimeCautions}</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--muted)]">
            {result.warnings.map((warning) => <li key={warning}>{localizeOpenSnaKnownPhrase(copy, warning)}</li>)}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function NetworkPanel({ result }: { result: OpenSnaResult }) {
  const { copy } = useOpenSnaUi();
  return (
    <div className="space-y-5">
      <NetworkGraph result={result} copy={copy} />
      <details className="rounded-2xl border border-[var(--line)] bg-[var(--page)] p-5">
        <summary className="cursor-pointer font-black text-[var(--ink)]">{copy.network.edgeList}</summary>
        <div className="mt-4 max-h-80 overflow-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <caption className="sr-only">{copy.network.edgeListCaption}</caption>
            <thead className="text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
              <tr><th className="py-2">{copy.network.source}</th><th>{copy.network.target}</th><th className="text-right">{copy.network.weight}</th><th className="text-right">{copy.network.type}</th></tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {result.edges.map((edge) => (
                <tr key={`${edge.source}-${edge.target}`}>
                  <td className="py-2 font-bold">{edge.source}</td><td>{edge.target}</td><td className="text-right tabular-nums">{metricValue(edge.weight, copy.common.notAvailable)}</td><td className="text-right text-[var(--muted)]">{openSnaRelationshipLabel(copy, edge.relationship)}</td>
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
  const { copy } = useOpenSnaUi();
  const rows = [...result.nodes].sort((left, right) => (right.strength ?? -Infinity) - (left.strength ?? -Infinity));
  return (
    <div className="space-y-5">
      <MethodNote>{copy.centrality.note}</MethodNote>
      <ResultsTable
        caption={copy.centrality.caption}
        rows={rows}
        columns={[
          { key: "strength", label: copy.centrality.strength },
          { key: "expectedInfluence", label: copy.centrality.expectedInfluence },
          { key: "betweenness", label: copy.centrality.betweenness },
          { key: "closeness", label: copy.centrality.closeness },
        ]}
      />
    </div>
  );
}

function BridgePanel({ result }: { result: OpenSnaResult }) {
  const { copy, locale } = useOpenSnaUi();
  const rows = [...result.nodes].sort((left, right) => (right.bridgeStrength ?? -Infinity) - (left.bridgeStrength ?? -Infinity));
  const bridgeCs = result.stability.metrics.find((metric) => metric.id === "bridgeStrength");
  const communityCount = new Set(result.nodes.map((node) => node.community)).size;
  const leader = uniquePositiveLeader(result.nodes, "bridgeStrength");
  const supported = leader && bridgeCs?.coefficient !== null && bridgeCs?.coefficient !== undefined && bridgeCs.coefficient >= 0.25;
  const workflow = getWorkflowCopy(locale);
  const topValue = metricValue(leader?.bridgeStrength ?? null, copy.common.notAvailable);
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard label={copy.bridge.topNode} value={supported ? leader.label : workflow.noUniqueLeader} detail={supported ? fillOpenSna(copy.bridge.topDetail, { value: topValue }) : workflow.neutralBridge} />
        <MetricCard label={copy.bridge.stability} value={bridgeCs?.coefficient === null || !bridgeCs ? copy.common.notAvailable : metricValue(bridgeCs.coefficient, copy.common.notAvailable)} detail={bridgeCs ? openSnaStabilityLabel(copy, bridgeCs.interpretation) : copy.common.notAvailable} />
      </div>
      <ResultsTable
        caption={copy.bridge.caption}
        rows={rows}
        columns={[
          { key: "bridgeStrength", label: copy.bridge.bridgeStrength },
          { key: "bridgeExpectedInfluence", label: copy.bridge.bridgeExpectedInfluence },
          { key: "bridgeBetweenness", label: copy.bridge.bridgeBetweenness },
          { key: "bridgeCloseness", label: copy.bridge.bridgeCloseness },
        ]}
      />
      <MethodNote>{fillOpenSna(copy.bridge.note, { count: communityCount })}</MethodNote>
    </div>
  );
}

function PredictabilityPanel({ result }: { result: OpenSnaResult }) {
  const { copy } = useOpenSnaUi();
  const rows = [...result.nodes].sort((left, right) => (right.predictability ?? -Infinity) - (left.predictability ?? -Infinity));
  return (
    <div className="space-y-5">
      <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--page)] p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div><h3 className="text-lg font-black text-[var(--ink)]">{copy.predictability.title}</h3><p className="mt-1 text-sm text-[var(--muted)]">{copy.predictability.body}</p></div>
          <span className="rounded-full bg-[var(--surface-soft)] px-3 py-1 text-xs font-black text-[var(--indigo)]">{fillOpenSna(copy.predictability.meanBadge, { value: metricValue(result.overview.meanPredictability, copy.common.notAvailable) })}</span>
        </div>
        <ol className="space-y-3">
          {rows.map((node) => (
            <li key={node.id} className="grid grid-cols-[minmax(5rem,1fr)_minmax(4rem,2fr)_4rem] items-center gap-3 text-sm">
              <span className="break-words font-black text-[var(--ink)]">{node.label}</span>
              <span className="h-2.5 overflow-hidden rounded-full bg-[var(--line)]" aria-hidden="true"><span className="block h-full rounded-full bg-[var(--teal-solid)] transition-[width] duration-300" style={{ width: `${Math.max(0, Math.min(100, (node.predictability ?? 0) * 100))}%` }} /></span>
              <span className="text-right tabular-nums text-[var(--muted)]">{metricValue(node.predictability, copy.common.notAvailable)}</span>
            </li>
          ))}
        </ol>
      </div>
      <MethodNote>{fillOpenSna(copy.predictability.note, { model: result.models.predictability.id })}</MethodNote>
    </div>
  );
}

function ComparisonPanel({ result }: { result: OpenSnaResult }) {
  const { copy, htmlLang, locale } = useOpenSnaUi();
  const comparison = result.subgroupComparison;
  const workflow = getWorkflowCopy(locale);
  const [query, setQuery] = useState("");
  const allEdges = comparison.edgeDifferences ?? comparison.strongestEdgeDifferences;
  const normalized = query.trim().toLocaleLowerCase();
  const edges = allEdges.filter(edge => `${edge.source} ${edge.target}`.toLocaleLowerCase().includes(normalized));
  const count = (value: number) => value.toLocaleString(htmlLang);
  const value = (metric: number | null) => metricValue(metric, copy.common.notAvailable);
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={fillOpenSna(copy.comparison.groupStrength, { group: comparison.groupA })} value={value(comparison.globalStrengthA)} detail={fillOpenSna(copy.comparison.sampleSize, { count: count(comparison.nA) })} />
        <MetricCard label={fillOpenSna(copy.comparison.groupStrength, { group: comparison.groupB })} value={value(comparison.globalStrengthB)} detail={fillOpenSna(copy.comparison.sampleSize, { count: count(comparison.nB) })} />
        <MetricCard label={copy.comparison.globalTest} value={`p = ${value(comparison.globalStrengthPValue)}`} detail={fillOpenSna(copy.comparison.globalDetail, { value: value(comparison.globalStrengthDifference) })} />
        <MetricCard label={copy.comparison.structureTest} value={`p = ${value(comparison.networkStructurePValue)}`} detail={fillOpenSna(copy.comparison.structureDetail, { value: value(comparison.networkStructureDifference) })} />
      </div>
      {!comparison.edgeDifferences ? <MethodNote>{workflow.nctLegacy}</MethodNote> : null}
      <label className="block max-w-sm text-sm font-bold">{workflow.nctSearch}<input className="focus-ring mt-2 min-h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3" type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <p className="text-xs text-[var(--muted)]" aria-live="polite">{fillOpenSna(workflow.nctCount, {visible: edges.length, total: allEdges.length})}</p>
      <div className="overflow-x-auto rounded-2xl border border-[var(--line)]">
        <table className="w-full min-w-[38rem] text-left text-sm">
          <caption className="px-4 py-4 text-left font-black text-[var(--ink)]">{comparison.edgeDifferences ? workflow.nctComplete : copy.comparison.caption}</caption>
          <thead className="bg-[var(--page-strong)] text-xs uppercase tracking-[0.12em] text-[var(--muted)]"><tr><th className="px-4 py-3">{copy.comparison.edge}</th><th className="px-4 py-3 text-right">{copy.comparison.absoluteDifference}</th><th className="px-4 py-3 text-right">{copy.comparison.holmP}</th></tr></thead>
          <tbody className="divide-y divide-[var(--line)]">
            {edges.map((edge) => (
              <tr key={`${edge.source}-${edge.target}`}><th scope="row" className="px-4 py-3 font-bold">{fillOpenSna(copy.comparison.edgePair, { source: edge.source, target: edge.target })}</th><td className="px-4 py-3 text-right tabular-nums">{value(edge.absoluteDifference)}</td><td className="px-4 py-3 text-right tabular-nums">{value(edge.pValueHolm)}</td></tr>
            ))}
            {!edges.length ? <tr><td colSpan={3} className="p-4 text-center text-[var(--muted)]">{workflow.nctEmpty}</td></tr> : null}
          </tbody>
        </table>
      </div>
      <MethodNote>{fillOpenSna(copy.comparison.note, { method: comparison.method, version: comparison.packageVersion, permutations: count(comparison.permutations) })}</MethodNote>
    </div>
  );
}

function StabilityPanel({ result }: { result: OpenSnaResult }) {
  const { copy, htmlLang } = useOpenSnaUi();
  const badgeClass = (label: OpenSnaResult["stability"]["metrics"][number]["interpretation"]) => label === "Desirable" ? "bg-[var(--teal-tint-strong)] text-[var(--teal-ink)]" : label === "Acceptable" ? "bg-[var(--amber-tint-strong)] text-[var(--amber-ink)]" : "bg-[var(--danger-tint-strong)] text-[var(--danger)]";
  const acceptable = result.stability.acceptableThreshold.toFixed(2);
  const desirable = result.stability.desirableThreshold.toFixed(2);
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {result.stability.metrics.map((metric) => (
          <article key={metric.id} className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--page)] p-5">
            <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-[var(--ink)]">{openSnaMetricName(copy, metric.id, metric.metric)}</p><p className="mt-2 text-3xl font-black tabular-nums tracking-[-0.04em]">{metricValue(metric.coefficient, copy.common.notAvailable)}</p></div><span className={cn("rounded-full px-3 py-1 text-xs font-black", badgeClass(metric.interpretation))}>{openSnaStabilityLabel(copy, metric.interpretation)}</span></div>
          </article>
        ))}
      </div>
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--page)] p-5 text-sm leading-7 text-[var(--muted)]">
        <p><strong className="text-[var(--ink)]">{copy.stability.ruleLabel}</strong> {fillOpenSna(copy.stability.rule, { acceptable, acceptableTop: (result.stability.desirableThreshold - 0.01).toFixed(2), desirable })}</p>
        <p className="mt-2">{fillOpenSna(copy.stability.method, { method: localizeOpenSnaKnownPhrase(copy, result.stability.method), threshold: result.stability.correlationThreshold.toFixed(2), bootstraps: result.stability.bootstraps.toLocaleString(htmlLang), cores: result.stability.cores })}</p>
      </div>
    </div>
  );
}

function InterpretationPanel({ result }: { result: OpenSnaResult }) {
  const { copy } = useOpenSnaUi();
  const lunaUsed = result.interpretation.thirdPartyAiUsed;
  const referenceResult = result.dataSource === "aggregate-demo";
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[var(--amber-line)] bg-[var(--amber-tint)] p-5">
        <div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-[var(--ink)]">{copy.interpretation.title}</h3><span className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-xs font-black text-[var(--muted)]">{lunaUsed ? copy.interpretation.lunaBadge : referenceResult ? copy.interpretation.referenceBadge : copy.interpretation.fallbackBadge}</span></div>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          {lunaUsed
            ? copy.interpretation.lunaBody
            : referenceResult
              ? copy.interpretation.referenceBody
              : copy.interpretation.fallbackBody}
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {result.interpretation.insights.map((insight) => {
          const presented = presentOpenSnaInsight(copy, result, insight);
          return (
            <article key={insight.id} className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--page)] p-5">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--indigo)]">{fillOpenSna(copy.interpretation.evidence, { value: presented.evidence })}</p>
              <h3 className="mt-3 text-lg font-black text-[var(--ink)]">{presented.title}</h3>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{presented.text}</p>
            </article>
          );
        })}
      </div>
      <section className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--page)] p-5"><h3 className="font-black text-[var(--ink)]">{copy.interpretation.limits}</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--muted)]">{result.interpretation.cautions.map((caution) => <li key={caution}>{presentOpenSnaCaution(copy, caution, lunaUsed)}</li>)}</ul></section>
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
  return OPEN_SNA_TABS.some((panel) => panel.id === candidate) ? candidate as OpenSnaTabId : null;
}



export default function OpenSnaWorkbench({ copy, locale, htmlLang, analysisDisabled }: { copy: OpenSnaCopy; locale: Locale; htmlLang: string; analysisDisabled: boolean }) {
  const panels = panelHeadings(copy);
  const workflow = getWorkflowCopy(locale);
  const [activeTab, setActiveTab] = useState<OpenSnaTabId>("overview");
  const [view, setView] = useState<WorkbenchTaskView>({ result: null, message: workflow.ready, error: null });
  const { result, message, error } = view;
  const [referenceBusy, setReferenceBusy] = useState(false);
  const [workflowBusy, setWorkflowBusy] = useState(false);
  function setResult(result: OpenSnaResult | null) { setView(current => ({ ...current, result })); }
  function setMessage(message: string) { setView(current => ({ ...current, message })); }
  function setError(error: string | null) { setView(current => ({ ...current, error })); }
  const [setupOpen, setSetupOpen] = useState(true);
  const resultRevision = useRef(0);
  const workflowBusyRef = useRef(false);
  const [sourceSession, setSourceSession] = useState(0);
  const reportWorkflowBusy = useCallback((value: boolean) => {
    workflowBusyRef.current = value;
    setWorkflowBusy(value);
  }, []);
  const busy = referenceBusy || workflowBusy;
  const beginAnalysis = useCallback(() => {
    resultRevision.current++;
    reportWorkflowBusy(true);
    setView(current => advanceWorkbenchTask(current, { type: "start" }, workflow));
  }, [reportWorkflowBusy, workflow]);
  const reportTaskStatus = useCallback((status: JobDisplayStatus) => {
    setView(current => advanceWorkbenchTask(current, { type: "status", status }, workflow));
  }, [workflow]);

  function receiveResult(payload: OpenSnaResult) {
    resultRevision.current++;
    setResult(payload);
    setError(null);
    setMessage(payload.dataSource === "aggregate-demo" ? copy.status.referenceReady : workflow.succeeded);
    setActiveTab("overview");
  }

  function detachPreviousSource() {
    try {
      if (!detachJobRecovery(workflowBusyRef.current, window.localStorage)) return false;
      setSourceSession(session => session + 1);
      return true;
    } catch {
      setError(workflow.sourceSwitchFailed);
      return false;
    }
  }

  function receiveSavedResult(payload: OpenSnaResult) {
    if (!detachPreviousSource()) return;
    receiveResult(payload);
  }

  function scrollToResults() {
    window.requestAnimationFrame(() => {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document.getElementById("open-sna-results")?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    });
  }

  function scrollPanelHeadingIntoView() {
    window.requestAnimationFrame(() => {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document.getElementById("open-sna-panel-heading")?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    });
  }

  function selectPanel(id: OpenSnaTabId, options: { writeHash?: boolean; scroll?: boolean } = {}) {
    setActiveTab(id);
    if (typeof window !== "undefined" && options.writeHash !== false) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#analysis-${id}`);
    }
    if (options.scroll) scrollPanelHeadingIntoView();
  }

  async function loadReference(options: { scroll?: boolean } = {}) {
    if (workflowBusyRef.current) return;
    const revision = ++resultRevision.current;
    setReferenceBusy(true);
    setError(null);
    setMessage(copy.status.loadingReference);
    try {
      const response = await fetch("/open-sna/programming-resilience-demo.json", { cache: "no-store" });
      const payload: unknown = await response.json();
      if (!response.ok || !isOpenSnaResult(payload)) throw new Error("Invalid reference result");
      if (resultRevision.current !== revision || !detachPreviousSource()) return;
      setResult(payload);
      setMessage(copy.status.referenceReady);
      const linkedTab = tabFromHash(window.location.hash);
      setActiveTab(linkedTab ?? "overview");
      if (options.scroll) scrollToResults();
    } catch (caught) {
      if (resultRevision.current === revision) setError(openSnaReferenceErrorMessage(caught, locale));
    } finally {
      setReferenceBusy(false);
    }
  }

  useEffect(() => {
    const handleHashChange = () => {
      const linkedTab = tabFromHash(window.location.hash);
      if (linkedTab) setActiveTab(linkedTab);
      if (window.location.hash === "#open-sna-setup" || window.location.hash === "#open-sna-reference") setSetupOpen(true);
    };
    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  function handleTabKeyboard(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % panels.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + panels.length) % panels.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = panels.length - 1;
    else return;
    event.preventDefault();
    const next = panels[nextIndex];
    selectPanel(next.id, { scroll: true });
    document.getElementById(`open-sna-tab-${next.id}`)?.focus();
  }

  const activeIndex = panels.findIndex((entry) => entry.id === activeTab);
  const activeHeading = panels[activeIndex] ?? panels[0];
  const previousPanel = panels[(activeIndex - 1 + panels.length) % panels.length];
  const nextPanel = panels[(activeIndex + 1) % panels.length];

  return (
    <OpenSnaUiContext.Provider value={{ copy, locale, htmlLang }}>
    <section id="open-sna-workbench" lang={htmlLang} aria-label={copy.workbenchLabel} className="scroll-mt-24 space-y-5">
      <aside id="open-sna-setup" className="surface-card scroll-mt-24 overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] bg-[var(--surface-soft)] pb-4 pe-20 ps-4 pt-4 sm:pb-5 sm:pe-20 sm:ps-5 sm:pt-5 xl:pe-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--indigo)]">{copy.setup.eyebrow}</p>
            <h2 className="mt-1 text-xl font-black tracking-[-0.025em] text-[var(--ink)]">{copy.setup.title}</h2>
          </div>
          <button type="button" onClick={() => setSetupOpen((open) => !open)} aria-expanded={setupOpen} aria-controls="open-sna-setup-controls" className="focus-ring grid h-11 w-11 cursor-pointer place-items-center rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--indigo)] transition hover:border-[var(--indigo)]" aria-label={setupOpen ? copy.setup.collapse : copy.setup.expand}>
            <Icon name="chevron" className={cn("h-5 w-5 transition-transform", setupOpen && "rotate-180")} />
          </button>
        </div>

        <aside className="m-4 mb-0 rounded-xl border border-[var(--teal-line)] bg-[var(--teal-tint)] p-4 sm:m-5 sm:mb-0" aria-label={copy.beta.ariaLabel}>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--teal-ink)]">{copy.beta.title}</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-[var(--ink)]">
            {copy.beta.items.map((item, index) => <li key={index}>{item}</li>)}
          </ul>
          {analysisDisabled ? <p className="mt-3 font-bold" role="status">{copy.errors.R_ENGINE_DISABLED}</p> : null}
        </aside>

        <div id="open-sna-setup-controls" className={cn("space-y-5 p-4 sm:p-5", setupOpen ? "block" : "hidden")}>
          <QuestionnaireWorkflow key={sourceSession} copy={copy} locale={locale} analysisDisabled={analysisDisabled} onResult={receiveResult} onBusyChange={reportWorkflowBusy} onAnalysisStart={beginAnalysis} onTaskStatus={reportTaskStatus} />
          <div id="open-sna-reference" className="flex scroll-mt-24 flex-wrap items-center justify-between gap-4 border-t border-[var(--line)] pt-5">
            <div><p className="text-sm font-black">{copy.setup.referenceTitle}</p><p className="mt-1 text-xs text-[var(--muted)]">{copy.setup.referenceBody}</p></div>
            <button type="button" onClick={() => void loadReference({ scroll: true })} disabled={busy} className="focus-ring inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--line)] px-4 text-sm font-black text-[var(--indigo)] disabled:opacity-45">{copy.setup.openReference}</button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 space-y-4">
        <div role={error ? "alert" : "status"} aria-live="polite" className={cn("relative overflow-hidden rounded-2xl border px-4 py-3 text-sm", error ? "border-[var(--danger-line)] bg-[var(--danger-tint)] text-[var(--danger)]" : busy ? "border-[var(--teal-line)] bg-[var(--teal-tint)] text-[var(--ink)]" : "border-[var(--line)] bg-[var(--surface)] text-[var(--muted)]")}>
          {busy ? <span className="open-sna-status-progress absolute inset-x-0 top-0 h-0.5 bg-[var(--teal-solid)]" aria-hidden="true" /> : null}
          <div className="flex items-start gap-3">
            <span className={cn("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full", error ? "bg-[var(--danger-tint-strong)]" : busy ? "bg-[var(--teal-tint-strong)] text-[var(--teal-ink)]" : "bg-[var(--surface-soft)] text-[var(--indigo)]")}>
              {busy ? <span className="open-sna-spinner h-4 w-4 rounded-full border-2 border-[var(--line)] border-t-[var(--teal-ink)]" aria-hidden="true" /> : <Icon name={error ? "info" : "check"} />}
            </span>
            <div className="min-w-0 [overflow-wrap:anywhere]"><p className="font-black text-[var(--ink)]">{error ? copy.status.actionNeeded : busy ? copy.status.working : copy.status.ready}</p><p className="mt-0.5 leading-6">{error ?? message}</p></div>
          </div>
        </div>

        <ResearchExports result={result} locale={locale} onReopen={receiveSavedResult} disabled={workflowBusy} />
        {result ? (
          <div id="open-sna-results" className="scroll-mt-24 space-y-4" aria-busy={busy}>
            <header className="surface-card flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[var(--teal-tint-strong)] px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--teal-ink)]">{result.dataSource === "aggregate-demo" ? copy.results.aggregateReference : copy.results.uploadedWorkbook}</span><span className="text-xs font-bold text-[var(--muted)]">{fillOpenSna(copy.results.schema, { version: result.schemaVersion })}</span></div>
                <h2 className="mt-3 break-words text-balance text-xl font-black leading-tight tracking-[-0.025em] text-[var(--ink)] [overflow-wrap:anywhere] sm:text-2xl">{localizeOpenSnaKnownPhrase(copy, result.source.fileName)}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">{fillOpenSna(copy.results.summary, { responses: result.overview.analyzedRows.toLocaleString(htmlLang), nodes: result.overview.nodeCount, edges: result.overview.edgeCount })}</p>
              </div>

            </header>

            <div className="surface-card">
              <div id="open-sna-results-nav" className="sticky top-20 z-20 rounded-t-[2rem] border-b border-[var(--line)] bg-[var(--surface-glass)] p-2 backdrop-blur-xl">
                <div className="flex items-center gap-2 sm:hidden">
                  <button type="button" onClick={() => selectPanel(previousPanel.id, { scroll: true })} className="focus-ring grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--indigo)]" aria-label={fillOpenSna(copy.navigation.previousAnalysis, { label: previousPanel.label })}><Icon name="arrow" className="h-5 w-5 rotate-180" /></button>
                  <label className="relative min-w-0 flex-1"><span className="sr-only">{copy.navigation.jump}</span><select value={activeTab} onChange={(event) => selectPanel(event.target.value as OpenSnaTabId, { scroll: true })} className="focus-ring min-h-11 w-full cursor-pointer appearance-none rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 pr-9 text-sm font-black text-[var(--ink)]">{panels.map((panel, index) => <option key={panel.id} value={panel.id}>{index + 1}. {panel.shortLabel}</option>)}</select><Icon name="chevron" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" /></label>
                  <button type="button" onClick={() => selectPanel(nextPanel.id, { scroll: true })} className="focus-ring grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[var(--indigo)]" aria-label={fillOpenSna(copy.navigation.nextAnalysis, { label: nextPanel.label })}><Icon name="arrow" className="h-5 w-5" /></button>
                </div>

                <div role="tablist" aria-label={copy.navigation.tablist} aria-orientation="horizontal" className="hidden grid-cols-2 gap-1 sm:grid lg:grid-cols-4">
                  {panels.map((panel, index) => (
                    <button key={panel.id} id={`open-sna-tab-${panel.id}`} type="button" role="tab" aria-label={panel.label} aria-selected={activeTab === panel.id} aria-controls={`open-sna-panel-${panel.id}`} tabIndex={activeTab === panel.id ? 0 : -1} onClick={() => selectPanel(panel.id, { scroll: true })} onKeyDown={(event) => handleTabKeyboard(event, index)} className={cn("focus-ring group flex min-h-14 cursor-pointer items-center gap-2 rounded-xl px-3 text-left text-sm font-black transition duration-200", activeTab === panel.id ? "bg-[#403A8F] text-[#F8FAFC] shadow-[0_8px_20px_rgba(64,58,143,0.2)]" : "text-[var(--muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--ink)]")}>
                      <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[0.68rem] tabular-nums", activeTab === panel.id ? "bg-white/15 text-white" : "bg-[var(--page)] text-[var(--indigo)] group-hover:bg-[var(--surface)]")}>{String(index + 1).padStart(2, "0")}</span>
                      <span className="leading-tight">{panel.shortLabel}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--line)]" aria-hidden="true"><span className="block h-full rounded-full bg-[var(--teal-solid)] transition-[width] duration-300" style={{ width: `${((activeIndex + 1) / panels.length) * 100}%` }} /></div>
              </div>

              <div className="p-4 sm:p-6 lg:p-7">
                <div id="open-sna-panel-heading" className="mb-6 flex scroll-mt-48 flex-col gap-2 border-b border-[var(--line)] pb-5 sm:scroll-mt-[24rem] sm:flex-row sm:items-end sm:justify-between lg:scroll-mt-64">
                  <div><p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--indigo)]">{fillOpenSna(copy.navigation.progress, { current: activeIndex + 1, total: panels.length })}</p><h2 className="mt-2 text-2xl font-black tracking-[-0.035em] text-[var(--ink)] sm:text-3xl">{activeHeading.label}</h2></div>
                  <p className="max-w-sm text-sm leading-6 text-[var(--muted)] sm:text-right">{activeHeading.summary}</p>
                </div>

                {panels.map((panel) => (
                  <div key={panel.id} id={`open-sna-panel-${panel.id}`} role="tabpanel" aria-labelledby={`open-sna-tab-${panel.id}`} tabIndex={activeTab === panel.id ? 0 : -1} hidden={activeTab !== panel.id}>
                    {activeTab === panel.id ? <div key={`${result.generatedAt}-${panel.id}`} className="open-sna-panel-enter"><ActivePanel result={result} activeTab={panel.id} /></div> : null}
                  </div>
                ))}

                <nav className="mt-8 grid grid-cols-2 gap-3 border-t border-[var(--line)] pt-5" aria-label={copy.navigation.panelNav}>
                  <button type="button" onClick={() => selectPanel(previousPanel.id, { scroll: true })} className="focus-ring group flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--page)] px-3 text-left text-sm font-black text-[var(--ink)] transition hover:border-[var(--indigo)] hover:bg-[var(--surface-soft)]"><Icon name="arrow" className="h-4 w-4 shrink-0 rotate-180 text-[var(--indigo)] transition-transform group-hover:-translate-x-0.5" /><span className="min-w-0"><span className="block text-[0.68rem] uppercase tracking-[0.1em] text-[var(--muted)]">{copy.navigation.previous}</span><span className="block break-words leading-tight">{previousPanel.shortLabel}</span></span></button>
                  <button type="button" onClick={() => selectPanel(nextPanel.id, { scroll: true })} className="focus-ring group flex min-h-12 cursor-pointer items-center justify-end gap-2 rounded-xl bg-[#403A8F] px-3 text-right text-sm font-black text-[#F8FAFC] shadow-sm transition hover:bg-[#302B78]"><span className="min-w-0"><span className="block text-[0.68rem] uppercase tracking-[0.1em] text-white/70">{copy.navigation.next}</span><span className="block break-words leading-tight">{nextPanel.shortLabel}</span></span><Icon name="arrow" className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" /></button>
                </nav>
              </div>
            </div>
          </div>
        ) : <EmptyResult />}
      </div>
    </section>
    </OpenSnaUiContext.Provider>
  );
}
