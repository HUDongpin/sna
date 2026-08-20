"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import type { OpenSnaNode, OpenSnaResult } from "@/lib/open-sna";
import { cn } from "@/lib/utils";

const communityPalette = [
  { fill: "#403A8F", label: "#F8FAFC" },
  { fill: "#18A99A", label: "#071B18" },
  { fill: "#D97706", label: "#101828" },
  { fill: "#7C3AED", label: "#F8FAFC" },
  { fill: "#0E7490", label: "#F8FAFC" },
  { fill: "#BE185D", label: "#F8FAFC" },
  { fill: "#4D7C0F", label: "#F8FAFC" },
  { fill: "#9A3412", label: "#F8FAFC" },
] as const;

function ZoomIcon({ direction }: { direction: "in" | "out" | "reset" }) {
  if (direction === "reset") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 4 4" strokeLinecap="round" />
      <path d="M7.5 10.5h6" strokeLinecap="round" />
      {direction === "in" ? <path d="M10.5 7.5v6" strokeLinecap="round" /> : null}
    </svg>
  );
}

function nodeMetric(value: number | null) {
  return value === null ? "Not available" : value.toFixed(3);
}

export default function NetworkGraph({ result }: { result: OpenSnaResult }) {
  const denseLayout = result.nodes.length > 20;
  const width = denseLayout ? 920 : 760;
  const height = denseLayout ? 640 : 520;
  const nodeById = useMemo(() => new Map(result.nodes.map((node) => [node.id, node])), [result.nodes]);
  const communities = useMemo(() => Array.from(new Set(result.nodes.map((node) => node.community))), [result.nodes]);
  const communitiesKey = communities.join("|");
  const communityStyles = useMemo(
    () => new Map(communities.map((community, index) => [community, communityPalette[index % communityPalette.length]])),
    [communities],
  );
  const strongest = result.overview.strongestEdge;
  const maxWeight = Math.max(0.01, ...result.edges.map((edge) => edge.absoluteWeight));
  const [activeCommunities, setActiveCommunities] = useState<Set<string>>(() => new Set(communities));
  const [minimumWeight, setMinimumWeight] = useState(0);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    setActiveCommunities(new Set(communities));
    setMinimumWeight(0);
    setSelectedNodeId(null);
    setHoveredNodeId(null);
    setZoom(1);
  }, [communitiesKey, result.generatedAt]);

  const filteredEdges = useMemo(
    () => result.edges.filter((edge) => {
      const source = nodeById.get(edge.source);
      const target = nodeById.get(edge.target);
      return Boolean(
        source &&
        target &&
        activeCommunities.has(source.community) &&
        activeCommunities.has(target.community) &&
        edge.absoluteWeight >= minimumWeight,
      );
    }),
    [activeCommunities, minimumWeight, nodeById, result.edges],
  );

  const activeNodeId = hoveredNodeId ?? selectedNodeId;
  const activeNode = activeNodeId ? nodeById.get(activeNodeId) ?? null : null;
  const selectedNode = selectedNodeId ? nodeById.get(selectedNodeId) ?? null : null;
  const connectedNodeIds = useMemo(() => {
    if (!activeNodeId) return new Set<string>();
    const ids = new Set<string>([activeNodeId]);
    for (const edge of filteredEdges) {
      if (edge.source === activeNodeId) ids.add(edge.target);
      if (edge.target === activeNodeId) ids.add(edge.source);
    }
    return ids;
  }, [activeNodeId, filteredEdges]);
  const selectedConnections = selectedNode
    ? filteredEdges.filter((edge) => edge.source === selectedNode.id || edge.target === selectedNode.id)
    : [];

  function toggleCommunity(community: string) {
    setActiveCommunities((current) => {
      const next = new Set(current);
      if (next.has(community) && next.size > 1) next.delete(community);
      else next.add(community);
      return next;
    });
    if (selectedNode?.community === community && activeCommunities.has(community) && activeCommunities.size > 1) {
      setSelectedNodeId(null);
    }
  }

  function selectNode(node: OpenSnaNode) {
    if (!activeCommunities.has(node.community)) return;
    setSelectedNodeId((current) => current === node.id ? null : node.id);
  }

  function handleNodeKeyboard(event: KeyboardEvent<SVGGElement>, node: OpenSnaNode) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectNode(node);
    } else if (event.key === "Escape") {
      setSelectedNodeId(null);
      event.currentTarget.blur();
    }
  }

  const zoomAnchorX = (selectedNode?.x ?? 0.5) * width;
  const zoomAnchorY = (selectedNode?.y ?? 0.5) * height;

  return (
    <figure aria-labelledby="open-sna-network-title" aria-describedby="open-sna-network-summary">
      <div className="overflow-hidden rounded-[1.6rem] border border-[var(--line)] bg-[var(--page)]">
        <div className="border-b border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 id="open-sna-network-title" className="text-lg font-black text-[var(--ink)]">Explore the network</h3>
                <span className="rounded-full bg-[var(--surface-soft)] px-2.5 py-1 text-xs font-black text-[var(--indigo)]" aria-live="polite">
                  {filteredEdges.length} of {result.edges.length} edges
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                Filter communities and weaker edges, then hover, focus, or select a node to trace its direct connections.
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--page)] p-1" role="group" aria-label="Network zoom controls">
              <button type="button" onClick={() => setZoom((value) => Math.max(1, Number((value - 0.25).toFixed(2))))} disabled={zoom <= 1} className="focus-ring grid h-11 w-11 cursor-pointer place-items-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--indigo)] disabled:cursor-not-allowed disabled:opacity-40" aria-label="Zoom out" title="Zoom out"><ZoomIcon direction="out" /></button>
              <span className="min-w-12 text-center text-xs font-black tabular-nums text-[var(--ink)]" aria-live="polite">{Math.round(zoom * 100)}%</span>
              <button type="button" onClick={() => setZoom((value) => Math.min(1.75, Number((value + 0.25).toFixed(2))))} disabled={zoom >= 1.75} className="focus-ring grid h-11 w-11 cursor-pointer place-items-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--indigo)] disabled:cursor-not-allowed disabled:opacity-40" aria-label="Zoom in" title="Zoom in"><ZoomIcon direction="in" /></button>
              <button type="button" onClick={() => { setZoom(1); setSelectedNodeId(null); }} className="focus-ring grid h-11 w-11 cursor-pointer place-items-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--indigo)]" aria-label="Reset network view" title="Reset view"><ZoomIcon direction="reset" /></button>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,0.65fr)] lg:items-end">
            <fieldset>
              <legend className="text-xs font-black uppercase tracking-[0.13em] text-[var(--muted)]">Visible communities</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {communities.map((community) => {
                  const active = activeCommunities.has(community);
                  return (
                    <button key={community} type="button" aria-pressed={active} onClick={() => toggleCommunity(community)} className={cn("focus-ring inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm font-black transition", active ? "border-[var(--indigo)] bg-[var(--surface-soft)] text-[var(--ink)] shadow-sm" : "border-[var(--line)] bg-[var(--page)] text-[var(--muted)] opacity-65 hover:opacity-100")}>
                      <span className="h-3 w-3 rounded-full ring-2 ring-[var(--surface)]" style={{ backgroundColor: communityStyles.get(community)?.fill }} aria-hidden="true" />
                      {community}
                      <span className="sr-only">{active ? "visible" : "hidden"}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <label className="block text-xs font-black uppercase tracking-[0.13em] text-[var(--muted)]">
              Minimum absolute edge weight <span className="float-right text-[var(--ink)]">{minimumWeight.toFixed(2)}</span>
              <input type="range" min="0" max={maxWeight} step="0.01" value={minimumWeight} onChange={(event) => setMinimumWeight(Number(event.target.value))} className="focus-ring open-sna-range mt-3 block w-full cursor-pointer" />
            </label>
          </div>
          <label className="mt-4 block lg:hidden">
            <span className="text-xs font-black uppercase tracking-[0.13em] text-[var(--muted)]">Inspect a node</span>
            <span className="relative mt-2 block">
              <select value={selectedNodeId ?? ""} onChange={(event) => setSelectedNodeId(event.target.value || null)} className="focus-ring min-h-12 w-full cursor-pointer appearance-none rounded-xl border border-[var(--line)] bg-[var(--page)] px-3 pr-10 text-sm font-black text-[var(--ink)]">
                <option value="">Choose a visible node</option>
                {result.nodes.filter((node) => activeCommunities.has(node.community)).map((node) => <option key={node.id} value={node.id}>{node.label} - {node.community}</option>)}
              </select>
              <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m8 10 4 4 4-4" /></svg>
            </span>
          </label>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_15rem]">
          <div className="relative min-h-[20rem] overflow-hidden bg-[var(--surface)] p-2 sm:p-4">
            <p className="sr-only" id="open-sna-network-instructions">Use Tab to focus a visible node. Press Enter or Space to select it, and Escape to clear the selection.</p>
            <svg className="h-auto w-full" viewBox={`0 0 ${width} ${height}`} role="group" aria-labelledby="open-sna-network-title open-sna-network-summary open-sna-network-instructions">
              <desc id="open-sna-network-summary">
                {result.overview.nodeCount} nodes and {filteredEdges.length} currently visible nonzero edges. Node size reflects predictability. Edge width reflects absolute regularized partial-correlation weight.
              </desc>
              <g transform={`translate(${zoomAnchorX} ${zoomAnchorY}) scale(${zoom}) translate(${-zoomAnchorX} ${-zoomAnchorY})`} className="open-sna-graph-viewport">
                {filteredEdges.map((edge) => {
                  const source = nodeById.get(edge.source);
                  const target = nodeById.get(edge.target);
                  if (!source || !target) return null;
                  const connectedToActive = !activeNodeId || edge.source === activeNodeId || edge.target === activeNodeId;
                  return (
                    <line key={`${edge.source}-${edge.target}`} x1={source.x * width} y1={source.y * height} x2={target.x * width} y2={target.y * height} stroke={edge.sign === "positive" ? "var(--teal)" : "var(--danger)"} strokeWidth={Math.max(1.4, edge.absoluteWeight * 14)} strokeOpacity={connectedToActive ? (edge.relationship === "within-community" ? 0.62 : 0.88) : 0.09} strokeDasharray={edge.sign === "negative" ? "7 5" : undefined} strokeLinecap="round" className="open-sna-graph-edge">
                      <title>{`${edge.source} to ${edge.target}: ${edge.weight.toFixed(3)}`}</title>
                    </line>
                  );
                })}
                {result.nodes.map((node) => {
                  const predictability = node.predictability ?? 0;
                  const radius = (denseLayout ? 12 : 15) + predictability * (denseLayout ? 10 : 13);
                  const communityStyle = communityStyles.get(node.community) ?? communityPalette[0];
                  const communityActive = activeCommunities.has(node.community);
                  const related = !activeNodeId || connectedNodeIds.has(node.id);
                  const selected = selectedNodeId === node.id;
                  const highlighted = activeNodeId === node.id;
                  return (
                    <g key={node.id} transform={`translate(${node.x * width} ${node.y * height})`} role="button" tabIndex={communityActive ? 0 : -1} aria-hidden={!communityActive} aria-label={`${node.label}, ${node.community} community, strength ${nodeMetric(node.strength)}, predictability ${nodeMetric(node.predictability)}${selected ? ", selected" : ""}`} aria-pressed={selected} onClick={() => selectNode(node)} onKeyDown={(event) => handleNodeKeyboard(event, node)} onMouseEnter={() => communityActive && setHoveredNodeId(node.id)} onMouseLeave={() => setHoveredNodeId(null)} onFocus={() => communityActive && setHoveredNodeId(node.id)} onBlur={() => setHoveredNodeId(null)} className={cn("open-sna-graph-node", communityActive ? "cursor-pointer" : "pointer-events-none")} opacity={communityActive ? (related ? 1 : 0.28) : 0.1}>
                      <circle r={Math.max(22, radius + 8)} fill="transparent" stroke="none" />
                      <circle r={radius + (selected || highlighted ? 8 : 5)} fill={selected || highlighted ? "var(--amber)" : "var(--surface)"} stroke={selected ? "var(--indigo)" : "var(--line)"} strokeWidth={selected ? 3 : 2} className="open-sna-node-halo" />
                      <circle r={radius} fill={communityStyle.fill} stroke="var(--surface)" strokeWidth="2">
                        <title>{`${node.id}, ${node.community}, strength ${nodeMetric(node.strength)}, predictability ${nodeMetric(node.predictability)}`}</title>
                      </circle>
                      <text y="4" textAnchor="middle" fill={communityStyle.label} fontSize={denseLayout ? "10" : "12"} fontWeight="800" pointerEvents="none">{node.label}</text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>

          <aside className="border-t border-[var(--line)] bg-[var(--page)] p-5 lg:border-l lg:border-t-0" aria-label="Selected node details" aria-live="polite">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--indigo)]">Node inspector</p>
            {activeNode ? (
              <div className="mt-4">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: communityStyles.get(activeNode.community)?.fill }} aria-hidden="true" />
                  <h4 className="text-2xl font-black tracking-[-0.04em] text-[var(--ink)]">{activeNode.label}</h4>
                </div>
                <p className="mt-1 text-sm text-[var(--muted)]">{activeNode.community} community</p>
                <dl className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between gap-4"><dt className="text-[var(--muted)]">Strength</dt><dd className="font-black tabular-nums">{nodeMetric(activeNode.strength)}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-[var(--muted)]">Predictability</dt><dd className="font-black tabular-nums">{nodeMetric(activeNode.predictability)}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-[var(--muted)]">Visible ties</dt><dd className="font-black tabular-nums">{filteredEdges.filter((edge) => edge.source === activeNode.id || edge.target === activeNode.id).length}</dd></div>
                </dl>
                <p className="mt-5 rounded-xl bg-[var(--surface)] p-3 text-xs leading-5 text-[var(--muted)]">
                  {selectedNodeId === activeNode.id ? "Selected. Adjust filters or zoom while keeping this node in focus." : "Previewing this node. Select it to keep the inspector open."}
                </p>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-4">
                <p className="font-black text-[var(--ink)]">Select a node</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Hover with a pointer, or use Tab and Enter, to inspect a node and highlight its neighborhood.</p>
              </div>
            )}
            {selectedNode && selectedConnections.length ? (
              <div className="mt-5 border-t border-[var(--line)] pt-4">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">Strongest visible ties</p>
                <ol className="mt-3 space-y-2">
                  {[...selectedConnections].sort((a, b) => b.absoluteWeight - a.absoluteWeight).slice(0, 4).map((edge) => (
                    <li key={`${edge.source}-${edge.target}`} className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-bold text-[var(--ink)]">{edge.source === selectedNode.id ? edge.target : edge.source}</span>
                      <span className="tabular-nums text-[var(--muted)]">{edge.weight.toFixed(3)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </aside>
        </div>
      </div>

      <figcaption className="mt-4 grid gap-3 text-sm leading-6 text-[var(--muted)] sm:grid-cols-[1fr_auto] sm:items-start">
        <span>{strongest ? `Overall strongest edge: ${strongest.source} to ${strongest.target} (${strongest.weight.toFixed(3)}).` : "No nonzero edge was estimated."} Solid teal lines are positive; dashed red lines are negative.</span>
        <span className="font-bold text-[var(--ink)]">Node size = predictability</span>
      </figcaption>
    </figure>
  );
}
