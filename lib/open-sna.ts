export const OPEN_SNA_TABS = [
  { id: "overview", label: "Data Overview" },
  { id: "network", label: "Network Visualization" },
  { id: "centrality", label: "Centrality Analysis" },
  { id: "bridge", label: "Bridge Node Analysis" },
  { id: "predictability", label: "Predictability Analysis" },
  { id: "comparison", label: "Subgroup Comparison (NCT)" },
  { id: "stability", label: "Stability Analysis" },
  { id: "interpretation", label: "AI Interpretation" },
] as const;

export type OpenSnaTabId = (typeof OPEN_SNA_TABS)[number]["id"];

export type OpenSnaNode = {
  id: string;
  label: string;
  community: string;
  x: number;
  y: number;
  strength: number | null;
  expectedInfluence: number | null;
  betweenness: number | null;
  closeness: number | null;
  bridgeStrength: number | null;
  bridgeExpectedInfluence: number | null;
  bridgeBetweenness: number | null;
  bridgeCloseness: number | null;
  predictability: number | null;
};

export type OpenSnaEdge = {
  source: string;
  target: string;
  weight: number;
  absoluteWeight: number;
  sign: "positive" | "negative";
  relationship: "within-community" | "between-community";
};

export type OpenSnaStabilityMetric = {
  id: "strength" | "bridgeStrength" | "bridgeCloseness" | "bridgeBetweenness";
  metric: string;
  coefficient: number | null;
  interpretation: "Desirable" | "Acceptable" | "Do not interpret" | "Not available";
};

export type OpenSnaResult = {
  schemaVersion: "1.1";
  analysisProfile: "npn-ebicglasso-v1";
  dataSource: "aggregate-demo" | "uploaded-workbook";
  generatedAt: string;
  inputFingerprint?: string;
  source: {
    fileName: string;
    sheet: string;
    originalRows: number;
    analyzedRows: number;
    droppedRows: number;
    groupColumn: string;
    groupCounts: [{ group: string; n: number }, { group: string; n: number }];
    itemColumns: string[];
  };
  settings: {
    estimator: string;
    correlationMethod: string;
    gamma: number;
    missingData: string;
    communityRule: string;
    layout: string;
    seed: number;
    bootstrapReplicates: number;
    nctPermutations: number;
    networkType: string;
  };
  models: {
    network: { id: string; method: string };
    predictability: { id: string; method: string };
  };
  runtime: {
    rVersion: string;
    packages: Record<string, string>;
  };
  overview: {
    analyzedRows: number;
    nodeCount: number;
    edgeCount: number;
    possibleEdges: number;
    density: number;
    positiveEdges: number;
    negativeEdges: number;
    meanAbsoluteEdgeWeight: number;
    meanPredictability: number;
    strongestEdge: { source: string; target: string; weight: number } | null;
  };
  nodes: OpenSnaNode[];
  edges: OpenSnaEdge[];
  subgroupComparison: {
    available: true;
    method: string;
    packageVersion: string;
    groupColumn: string;
    groupA: string;
    groupB: string;
    nA: number;
    nB: number;
    permutations: number;
    globalStrengthA: number;
    globalStrengthB: number;
    globalStrengthDifference: number;
    globalStrengthPValue: number;
    networkStructureDifference: number;
    networkStructurePValue: number;
    strongestEdgeDifferences: Array<{
      source: string;
      target: string;
      absoluteDifference: number;
      pValueHolm: number;
    }>;
  };
  stability: {
    available: true;
    method: string;
    bootstraps: number;
    cores: number;
    correlationThreshold: number;
    acceptableThreshold: number;
    desirableThreshold: number;
    metrics: OpenSnaStabilityMetric[];
  };
  warnings: string[];
  interpretation: {
    generator: string;
    thirdPartyAiUsed: boolean;
    insights: Array<{ id: string; title: string; text: string; evidence: string }>;
    cautions: string[];
  };
  privacy: {
    rawRowsIncluded: false;
    uploadedWorkbookRetainedByEngine: false;
    thirdPartyAiUsed: boolean;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= 0;
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isProbability(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 1;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function hasStringFields(value: Record<string, unknown>, fields: string[]) {
  return fields.every((field) => isNonEmptyString(value[field]));
}

function hasExactKeys(value: Record<string, unknown>, required: string[], optional: string[] = []) {
  const allowed = new Set([...required, ...optional]);
  return Object.keys(value).every((key) => allowed.has(key)) && required.every((key) => key in value);
}

export function isOpenSnaResult(value: unknown): value is OpenSnaResult {
  if (!isRecord(value)) return false;
  if (!hasExactKeys(value, ["schemaVersion", "analysisProfile", "dataSource", "generatedAt", "source", "settings", "models", "runtime", "overview", "nodes", "edges", "subgroupComparison", "stability", "warnings", "interpretation", "privacy"], ["inputFingerprint"])) return false;
  if (value.schemaVersion !== "1.1" || value.analysisProfile !== "npn-ebicglasso-v1") return false;
  if (value.dataSource !== "aggregate-demo" && value.dataSource !== "uploaded-workbook") return false;
  if (!isRecord(value.source) || !isRecord(value.settings) || !isRecord(value.overview)) return false;
  if (!isRecord(value.models) || !isRecord(value.runtime) || !isRecord(value.privacy)) return false;
  if (!Array.isArray(value.nodes) || !Array.isArray(value.edges)) return false;
  if (!isRecord(value.stability) || !Array.isArray(value.stability.metrics)) return false;
  if (!Array.isArray(value.warnings) || !value.warnings.every((warning) => typeof warning === "string")) return false;
  if (!isRecord(value.subgroupComparison) || value.subgroupComparison.available !== true) return false;
  if (!isRecord(value.interpretation) || !Array.isArray(value.interpretation.insights)) return false;

  if (!isNonEmptyString(value.generatedAt) || Number.isNaN(Date.parse(value.generatedAt))) return false;
  if (
    value.inputFingerprint !== undefined &&
    (typeof value.inputFingerprint !== "string" || !/^sha256:[a-f0-9]{64}$/.test(value.inputFingerprint))
  ) return false;

  const source = value.source;
  if (!hasExactKeys(source, ["fileName", "sheet", "originalRows", "analyzedRows", "droppedRows", "groupColumn", "groupCounts", "itemColumns"])) return false;
  if (
    !hasStringFields(source, ["fileName", "sheet"]) ||
    !isStringArray(source.itemColumns) ||
    new Set(source.itemColumns).size !== source.itemColumns.length
  ) return false;
  if (
    !isNonNegativeInteger(source.originalRows) ||
    !isNonNegativeInteger(source.analyzedRows) ||
    !isNonNegativeInteger(source.droppedRows) ||
    source.originalRows !== source.analyzedRows + source.droppedRows ||
    !isNonEmptyString(source.groupColumn) ||
    !/^[A-Za-z][A-Za-z0-9 _-]{0,39}$/.test(source.groupColumn) ||
    !Array.isArray(source.groupCounts) ||
    source.groupCounts.length !== 2
  ) return false;
  const groupCounts = source.groupCounts;
  for (const entry of groupCounts) {
    if (
      !isRecord(entry) ||
      !hasExactKeys(entry, ["group", "n"]) ||
      !isNonEmptyString(entry.group) ||
      !/^[A-Za-z0-9][A-Za-z0-9 _-]{0,39}$/.test(entry.group) ||
      !isNonNegativeInteger(entry.n) ||
      entry.n < 20
    ) return false;
  }
  const firstGroup = groupCounts[0] as { group: string; n: number };
  const secondGroup = groupCounts[1] as { group: string; n: number };
  if (firstGroup.group === secondGroup.group || firstGroup.n + secondGroup.n !== source.analyzedRows) return false;

  const settings = value.settings;
  if (!hasExactKeys(settings, ["estimator", "correlationMethod", "gamma", "missingData", "communityRule", "layout", "seed", "bootstrapReplicates", "nctPermutations", "networkType"])) return false;
  if (!hasStringFields(settings, ["estimator", "correlationMethod", "missingData", "communityRule", "layout", "networkType"])) return false;
  if (
    settings.gamma !== 0.5 ||
    !isNonNegativeInteger(settings.seed) ||
    ![100, 500, 1000].includes(Number(settings.bootstrapReplicates)) ||
    settings.nctPermutations !== 1000
  ) return false;

  if (!hasExactKeys(value.models, ["network", "predictability"]) || !isRecord(value.models.network) || !isRecord(value.models.predictability)) return false;
  if (!hasExactKeys(value.models.network, ["id", "method"]) || !hasExactKeys(value.models.predictability, ["id", "method"])) return false;
  if (!hasStringFields(value.models.network, ["id", "method"]) || !hasStringFields(value.models.predictability, ["id", "method"])) return false;
  if (!hasExactKeys(value.runtime, ["rVersion", "packages"]) || !isNonEmptyString(value.runtime.rVersion) || !isRecord(value.runtime.packages)) return false;
  if (!Object.values(value.runtime.packages).every(isNonEmptyString)) return false;

  const overview = value.overview;
  if (!hasExactKeys(overview, ["analyzedRows", "nodeCount", "edgeCount", "possibleEdges", "density", "positiveEdges", "negativeEdges", "meanAbsoluteEdgeWeight", "meanPredictability", "strongestEdge"])) return false;
  if (
    !isNonNegativeInteger(overview.analyzedRows) ||
    !isNonNegativeInteger(overview.nodeCount) ||
    !isNonNegativeInteger(overview.edgeCount) ||
    !isNonNegativeInteger(overview.possibleEdges) ||
    !isFiniteNumber(overview.density) ||
    overview.density < 0 || overview.density > 1 ||
    !isNonNegativeInteger(overview.positiveEdges) ||
    !isNonNegativeInteger(overview.negativeEdges) ||
    !isFiniteNumber(overview.meanAbsoluteEdgeWeight) ||
    !isFiniteNumber(overview.meanPredictability) ||
    overview.meanPredictability < 0 || overview.meanPredictability > 1 ||
    overview.analyzedRows !== source.analyzedRows ||
    overview.nodeCount !== value.nodes.length ||
    overview.nodeCount !== source.itemColumns.length ||
    overview.edgeCount !== value.edges.length ||
    overview.positiveEdges + overview.negativeEdges !== overview.edgeCount ||
    overview.possibleEdges !== (overview.nodeCount * (overview.nodeCount - 1)) / 2 ||
    Math.abs(overview.density - (overview.possibleEdges === 0 ? 0 : overview.edgeCount / overview.possibleEdges)) > 1e-6
  ) {
    return false;
  }

  const strongestEdge = overview.strongestEdge;
  let strongestSource: string | null = null;
  let strongestTarget: string | null = null;
  if (strongestEdge !== null) {
    if (!isRecord(strongestEdge) || !hasExactKeys(strongestEdge, ["source", "target", "weight"]) || !isNonEmptyString(strongestEdge.source) || !isNonEmptyString(strongestEdge.target) || !isFiniteNumber(strongestEdge.weight)) return false;
    strongestSource = strongestEdge.source;
    strongestTarget = strongestEdge.target;
  }

  const nodeIds = new Set<string>();
  for (const node of value.nodes) {
    if (!isRecord(node) || !hasExactKeys(node, ["id", "label", "community", "x", "y", "strength", "expectedInfluence", "betweenness", "closeness", "bridgeStrength", "bridgeExpectedInfluence", "bridgeBetweenness", "bridgeCloseness", "predictability"]) || !isNonEmptyString(node.id) || !isNonEmptyString(node.label) || !isNonEmptyString(node.community)) return false;
    if (!isFiniteNumber(node.x) || node.x < 0 || node.x > 1 || !isFiniteNumber(node.y) || node.y < 0 || node.y > 1 || nodeIds.has(node.id)) return false;
    const nullableMetrics = ["strength", "expectedInfluence", "betweenness", "closeness", "bridgeStrength", "bridgeExpectedInfluence", "bridgeBetweenness", "bridgeCloseness", "predictability"];
    if (!nullableMetrics.every((metric) => isNullableFiniteNumber(node[metric]))) return false;
    if (node.predictability !== null && (Number(node.predictability) < 0 || Number(node.predictability) > 1)) return false;
    nodeIds.add(node.id);
  }
  if (!source.itemColumns.every((item) => nodeIds.has(item))) return false;
  if (
    strongestSource !== null &&
    strongestTarget !== null &&
    (!nodeIds.has(strongestSource) || !nodeIds.has(strongestTarget))
  ) return false;

  const edgeIds = new Set<string>();
  for (const edge of value.edges) {
    if (!isRecord(edge) || !hasExactKeys(edge, ["source", "target", "weight", "absoluteWeight", "sign", "relationship"]) || !isNonEmptyString(edge.source) || !isNonEmptyString(edge.target)) return false;
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target) || edge.source === edge.target || !isFiniteNumber(edge.weight) || !isFiniteNumber(edge.absoluteWeight)) return false;
    if (Math.abs(Math.abs(edge.weight) - edge.absoluteWeight) > 1e-6) return false;
    if (edge.sign !== (edge.weight >= 0 ? "positive" : "negative")) return false;
    if (edge.relationship !== "within-community" && edge.relationship !== "between-community") return false;
    const edgeId = [edge.source, edge.target].sort().join("::");
    if (edgeIds.has(edgeId)) return false;
    edgeIds.add(edgeId);
  }

  const comparison = value.subgroupComparison;
  if (!hasExactKeys(comparison, ["available", "method", "packageVersion", "groupColumn", "groupA", "groupB", "nA", "nB", "permutations", "globalStrengthA", "globalStrengthB", "globalStrengthDifference", "globalStrengthPValue", "networkStructureDifference", "networkStructurePValue", "strongestEdgeDifferences"]) || !hasStringFields(comparison, ["method", "packageVersion", "groupColumn", "groupA", "groupB"])) return false;
  if (
    comparison.groupColumn !== source.groupColumn ||
    comparison.groupA === comparison.groupB ||
    !isNonNegativeInteger(comparison.nA) ||
    !isNonNegativeInteger(comparison.nB) ||
    comparison.nA < 20 ||
    comparison.nB < 20 ||
    !isNonNegativeInteger(comparison.permutations) ||
    comparison.permutations !== settings.nctPermutations ||
    !isFiniteNumber(comparison.globalStrengthA) || comparison.globalStrengthA < 0 ||
    !isFiniteNumber(comparison.globalStrengthB) || comparison.globalStrengthB < 0 ||
    !isFiniteNumber(comparison.globalStrengthDifference) || comparison.globalStrengthDifference < 0 ||
    !isProbability(comparison.globalStrengthPValue) ||
    !isFiniteNumber(comparison.networkStructureDifference) || comparison.networkStructureDifference < 0 ||
    !isProbability(comparison.networkStructurePValue) ||
    !Array.isArray(comparison.strongestEdgeDifferences)
  ) return false;
  const groupCountByLabel = new Map(groupCounts.map((entry) => [String(entry.group), Number(entry.n)]));
  if (
    groupCountByLabel.size !== 2 ||
    groupCountByLabel.get(String(comparison.groupA)) !== comparison.nA ||
    groupCountByLabel.get(String(comparison.groupB)) !== comparison.nB
  ) return false;
  const comparisonEdgeIds = new Set<string>();
  for (const edge of comparison.strongestEdgeDifferences) {
    if (
      !isRecord(edge) ||
      !hasExactKeys(edge, ["source", "target", "absoluteDifference", "pValueHolm"]) ||
      !hasStringFields(edge, ["source", "target"]) ||
      !nodeIds.has(String(edge.source)) ||
      !nodeIds.has(String(edge.target)) ||
      edge.source === edge.target ||
      !isFiniteNumber(edge.absoluteDifference) ||
      edge.absoluteDifference < 0 ||
      !isProbability(edge.pValueHolm)
    ) return false;
    const comparisonEdgeId = [String(edge.source), String(edge.target)].sort().join("::");
    if (comparisonEdgeIds.has(comparisonEdgeId)) return false;
    comparisonEdgeIds.add(comparisonEdgeId);
  }

  if (
    !hasExactKeys(value.stability, ["available", "method", "bootstraps", "cores", "correlationThreshold", "acceptableThreshold", "desirableThreshold", "metrics"]) ||
    value.stability.available !== true ||
    !isNonEmptyString(value.stability.method) ||
    value.stability.bootstraps !== settings.bootstrapReplicates ||
    value.stability.cores !== 1 ||
    value.stability.correlationThreshold !== 0.7 ||
    value.stability.acceptableThreshold !== 0.25 ||
    value.stability.desirableThreshold !== 0.5
  ) return false;
  const stabilityIds = new Set<string>();
  for (const metric of value.stability.metrics) {
    if (!isRecord(metric) || !hasExactKeys(metric, ["id", "metric", "coefficient", "interpretation"]) || !isNonEmptyString(metric.id) || !isNonEmptyString(metric.metric)) return false;
    if (!isNullableFiniteNumber(metric.coefficient) || !["Desirable", "Acceptable", "Do not interpret", "Not available"].includes(String(metric.interpretation))) return false;
    if (stabilityIds.has(metric.id)) return false;
    stabilityIds.add(metric.id);
  }
  if (
    value.stability.metrics.length !== 4 ||
    !["strength", "bridgeStrength", "bridgeCloseness", "bridgeBetweenness"].every((id) => stabilityIds.has(id))
  ) return false;

  if (!hasExactKeys(value.interpretation, ["generator", "thirdPartyAiUsed", "insights", "cautions"]) || typeof value.interpretation.thirdPartyAiUsed !== "boolean" || !isNonEmptyString(value.interpretation.generator) || !isStringArray(value.interpretation.cautions)) return false;
  for (const insight of value.interpretation.insights) {
    if (!isRecord(insight) || !hasExactKeys(insight, ["id", "title", "text", "evidence"]) || !hasStringFields(insight, ["id", "title", "text", "evidence"])) return false;
  }

  return (
    hasExactKeys(value.privacy, ["rawRowsIncluded", "uploadedWorkbookRetainedByEngine", "thirdPartyAiUsed"]) &&
    value.privacy.rawRowsIncluded === false &&
    value.privacy.uploadedWorkbookRetainedByEngine === false &&
    typeof value.privacy.thirdPartyAiUsed === "boolean" &&
    value.privacy.thirdPartyAiUsed === value.interpretation.thirdPartyAiUsed
  );
}

export function matchesOpenSnaRequest(
  result: OpenSnaResult,
  bootstraps: string,
  permutations: string,
) {
  return (
    result.dataSource === "uploaded-workbook" &&
    result.settings.bootstrapReplicates === Number(bootstraps) &&
    result.settings.nctPermutations === Number(permutations) &&
    result.subgroupComparison.permutations === Number(permutations)
  );
}

function csvCell(value: string | number | null) {
  if (value === null) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function openSnaNodesCsv(result: OpenSnaResult) {
  const columns: Array<keyof OpenSnaNode> = [
    "id",
    "community",
    "strength",
    "expectedInfluence",
    "betweenness",
    "closeness",
    "bridgeStrength",
    "bridgeExpectedInfluence",
    "bridgeBetweenness",
    "bridgeCloseness",
    "predictability",
  ];
  return [
    columns.join(","),
    ...result.nodes.map((node) => columns.map((column) => csvCell(node[column])).join(",")),
  ].join("\n");
}

export function formatOpenSnaNumber(value: number | null, digits = 3) {
  return value === null || !Number.isFinite(value) ? "Not available" : value.toFixed(digits);
}
