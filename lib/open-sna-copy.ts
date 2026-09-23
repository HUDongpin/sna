import { formatOpenSnaNumber, type OpenSnaResult } from "@/lib/open-sna";
import { isLocale, type Locale } from "@/lib/locales";

type PanelCopy = { label: string; shortLabel: string; summary: string };

type StepCopy = { label: string; detail: string };
type LabeledCopy = { label: string; text: string };

export type OpenSnaCopy = {
  meta: { title: string; description: string };
  page: {
    skip: string;
    eyebrow: string;
    runsOnR: string;
    titleLead: string;
    titleAccent: string;
    intro: string;
    exploreReference: string;
    analyzeWorkbook: string;
    analysisViews: string;
    nctPermutations: string;
    rawRows: string;
    zero: string;
    methodSummaryLabel: string;
    fromData: string;
    steps: [StepCopy, StepCopy, StepCopy];
    aggregateOnly: string;
    mobileEyebrow: string;
    mobileTitle: string;
    mobileItems: [LabeledCopy, LabeledCopy, LabeledCopy];
  };
  workbenchLabel: string;
  setup: {
    eyebrow: string;
    title: string;
    collapse: string;
    expand: string;
    chooseWorkbook: string;
    fileLimit: string;
    chooseFileAria: string;
    dropHere: string;
    browse: string;
    readyToValidate: string;
    replaceFile: string;
    chooseFile: string;
    remove: string;
    help: string;
    sampleDownload: string;
    stabilityPrecision: string;
    bootstrap100: string;
    bootstrap500: string;
    bootstrap1000: string;
    methodSettings: string;
    profile: string;
    profileValue: string;
    ebicGamma: string;
    nct: string;
    nctValue: string;
    seed: string;
    run: string;
    running: string;
    chooseToEnable: string;
    sequenceLabel: string;
    sequence: [string, string, string, string, string];
    referenceTitle: string;
    referenceOpen: string;
    referenceBody: string;
    resetReference: string;
    openReference: string;
    privacyTitle: string;
    privacyBody: string;
  };
  beta: {
    ariaLabel: string;
    title: string;
    items: [string, string, string, string, string];
  };
  status: {
    actionNeeded: string;
    working: string;
    ready: string;
    loadingReference: string;
    referenceReady: string;
    workbookReady: string;
    removedWithResult: string;
    removedEmpty: string;
    analysisRunning: string;
    noSubstitution: string;
    completeLuna: string;
    completeFallback: string;
  };
  errors: {
    generic: string;
    referenceLoad: string;
    notXlsx: string;
    emptyWorkbook: string;
    workbookTooLarge: string;
    WORKER_BUSY: string;
    R_ENGINE_UNAVAILABLE: string;
    R_ENGINE_CONTRACT_FAILED: string;
    R_ANALYSIS_FAILED: string;
    R_ENGINE_DISABLED: string;
    R_ENGINE_NOT_CONFIGURED: string;
    R_ENGINE_CONFIGURATION_INVALID: string;
    R_ANALYSIS_TIMEOUT: string;
    WORKBOOK_INVALID: string;
    JOB_NOT_FOUND: string;
  };
  empty: { title: string; body: string };
  results: {
    aggregateReference: string;
    uploadedWorkbook: string;
    schema: string;
    summary: string;
    json: string;
    nodeCsv: string;
  };
  navigation: {
    previousAnalysis: string;
    nextAnalysis: string;
    jump: string;
    tablist: string;
    progress: string;
    panelNav: string;
    previous: string;
    next: string;
  };
  table: {
    searchLabel: string;
    searchPlaceholder: string;
    showing: string;
    sortCaption: string;
    node: string;
    community: string;
    noMatch: string;
  };
  overview: {
    analyzedResponses: string;
    analyzedDetail: string;
    networkSize: string;
    networkSizeValue: string;
    networkSizeDetail: string;
    density: string;
    densityDetail: string;
    meanPredictability: string;
    meanPredictabilityDetail: string;
    contractTitle: string;
    worksheet: string;
    originalRows: string;
    itemScale: string;
    itemScaleValue: string;
    communities: string;
    missingDataRule: string;
    subgroupCounts: string;
    profileNote: string;
    runtimeCautions: string;
  };
  network: {
    edgeList: string;
    edgeListCaption: string;
    source: string;
    target: string;
    weight: string;
    type: string;
  };
  graph: {
    title: string;
    edgeCount: string;
    filterHelp: string;
    zoomControls: string;
    zoomOut: string;
    zoomIn: string;
    resetView: string;
    resetNetwork: string;
    visibleCommunities: string;
    visible: string;
    hidden: string;
    minimumWeight: string;
    inspectNode: string;
    chooseNode: string;
    instructions: string;
    summary: string;
    edgeTitle: string;
    nodeAria: string;
    selectedSuffix: string;
    nodeTitle: string;
    inspector: string;
    communityLabel: string;
    strength: string;
    predictability: string;
    visibleTies: string;
    selectedHint: string;
    previewHint: string;
    selectNode: string;
    selectNodeHelp: string;
    strongestTies: string;
    strongestEdge: string;
    noEdge: string;
    signLegend: string;
    nodeSizeLegend: string;
  };
  centrality: {
    note: string;
    caption: string;
    strength: string;
    expectedInfluence: string;
    betweenness: string;
    closeness: string;
  };
  bridge: {
    topNode: string;
    estimateUnavailable: string;
    topDetail: string;
    stability: string;
    caption: string;
    bridgeStrength: string;
    bridgeExpectedInfluence: string;
    bridgeBetweenness: string;
    bridgeCloseness: string;
    note: string;
  };
  predictability: {
    title: string;
    body: string;
    meanBadge: string;
    note: string;
  };
  comparison: {
    groupStrength: string;
    sampleSize: string;
    globalTest: string;
    globalDetail: string;
    structureTest: string;
    structureDetail: string;
    caption: string;
    edge: string;
    absoluteDifference: string;
    holmP: string;
    edgePair: string;
    note: string;
  };
  stability: {
    ruleLabel: string;
    rule: string;
    method: string;
  };
  interpretation: {
    title: string;
    lunaBadge: string;
    referenceBadge: string;
    fallbackBadge: string;
    lunaBody: string;
    referenceBody: string;
    fallbackBody: string;
    evidence: string;
    limits: string;
  };
  panels: Record<"overview" | "network" | "centrality" | "bridge" | "predictability" | "comparison" | "stability" | "interpretation", PanelCopy>;
  relationships: { withinCommunity: string; betweenCommunity: string };
  stabilityLabels: { desirable: string; acceptable: string; doNotInterpret: string };
  metricNames: {
    strength: string;
    bridgeStrength: string;
    bridgeCloseness: string;
    bridgeBetweenness: string;
  };
  common: { notAvailable: string };
  known: {
    listwiseDeletion: string;
    caseDroppingBootstrap: string;
    lunaNotConfigured: string;
    lunaUnavailable: string;
    emptyNetworkStability: string;
    referenceFileName: string;
    dataWorksheet: string;
    cautionEdges: string;
    cautionStability: string;
    cautionSubgroup: string;
    cautionReview: string;
    runtimeWarning: string;
  };
  insights: {
    titles: {
      networkStructure: string;
      centralNode: string;
      predictability: string;
      bridgeNode: string;
      bridgeLimited: string;
      subgroup: string;
    };
    evidence: {
      networkStructure: string;
      centralNode: string;
      predictability: string;
      bridgeNode: string;
      bridgeLimited: string;
      subgroup: string;
    };
    networkStructure: string;
    centralNode: string;
    predictability: string;
    bridgeNode: string;
    bridgeLimited: string;
    subgroupDetected: string;
    subgroupNotDetected: string;
  };
};

export const OPEN_SNA_KNOWN_PHRASES = {
  listwiseDeletion: "Listwise deletion across selected network items",
  caseDroppingBootstrap: "Case-dropping bootstrap",
  lunaNotConfigured: "LUNA AI interpretation is not configured; the deterministic R evidence summary is shown.",
  lunaUnavailable: "LUNA AI interpretation is temporarily unavailable; the deterministic R evidence summary is shown.",
  emptyNetworkStability: "The estimated network contains no nonzero edges; case-dropping centrality stability is not available.",
  referenceFileName: "Programming Resilience aggregate reference",
  dataWorksheet: "Data worksheet",
  cautionEdges: "Edges are regularized partial correlations and do not establish causal direction.",
  cautionStability: "Centrality and bridge rankings should be interpreted only when their stability is adequate.",
  cautionSubgroup: "Subgroup permutation tests depend on the selected model, grouping variable, and resampling count.",
  cautionReview: "Review the workbook schema, missing-data exclusions, and method settings before publication.",
} as const;

const RUNTIME_WARNING_PREFIX = "Runtime warning: ";

const DETERMINISTIC_INSIGHT_IDS = [
  "network-structure",
  "central-node",
  "predictability",
  "bridge-node",
  "bridge-node-limited",
  "subgroup-comparison",
] as const;

type DeterministicInsightId = (typeof DETERMINISTIC_INSIGHT_IDS)[number];

const en: OpenSnaCopy = {
  meta: {
    title: "Open SNA",
    description: "Run a transparent social network analysis workflow for Programming Resilience questionnaire data, with network, centrality, bridge, predictability, subgroup, stability, and evidence-summary results.",
  },
  page: {
    skip: "Skip to workbench",
    eyebrow: "Open research workbench",
    runsOnR: "Runs on R",
    titleLead: "See the network.",
    titleAccent: "Trust the method.",
    intro: "Explore a reproducible Programming Resilience reference network, or bring a compatible XLSX workbook into one evidence-consistent workflow for visualization, centrality, bridge nodes, subgroup comparison, and stability.",
    exploreReference: "Explore reference result",
    analyzeWorkbook: "Analyze your workbook",
    analysisViews: "analysis views",
    nctPermutations: "NCT permutations",
    rawRows: "raw rows in output",
    zero: "Zero",
    methodSummaryLabel: "Open SNA method summary",
    fromData: "From data to evidence",
    steps: [
      { label: "Validate", detail: "Bounded schema and privacy checks" },
      { label: "Estimate", detail: "NPN plus EBICglasso profile" },
      { label: "Test", detail: "NCT and case-dropping stability" },
    ],
    aggregateOnly: "Aggregate results only by design",
    mobileEyebrow: "Transparent by design",
    mobileTitle: "How the method is bounded",
    mobileItems: [
      { label: "One profile:", text: "NPN plus EBICglasso across network panels." },
      { label: "Real inference:", text: "NCT and case-dropping stability." },
      { label: "Private output:", text: "aggregate metrics with no raw responses or IDs." },
    ],
  },
  workbenchLabel: "Open SNA analysis workbench",
  setup: {
    eyebrow: "Analysis setup",
    title: "Data and model",
    collapse: "Collapse analysis setup",
    expand: "Expand analysis setup",
    chooseWorkbook: "1. Choose workbook",
    fileLimit: "XLSX · max 5 MiB",
    chooseFileAria: "Choose XLSX workbook",
    dropHere: "Drop a workbook here",
    browse: "or browse from this device",
    readyToValidate: "ready to validate",
    replaceFile: "Replace file",
    chooseFile: "Choose file",
    remove: "Remove",
    help: "Use one worksheet with 6 to 40 integer Likert items (1 to 5), repeated construct prefixes, and a required valid two-level Gender or metadata column with at least 20 analyzed rows per group after listwise deletion.",
    sampleDownload: "Download a synthetic sample workbook",
    stabilityPrecision: "2. Stability precision",
    bootstrap100: "100 - development check",
    bootstrap500: "500 - extended check",
    bootstrap1000: "1,000 - recommended result",
    methodSettings: "Method settings",
    profile: "Profile",
    profileValue: "NPN EBICglasso v1",
    ebicGamma: "EBIC gamma",
    nct: "NCT",
    nctValue: "1,000 permutations",
    seed: "Seed",
    run: "Run R + LUNA analysis",
    running: "Analysis running",
    chooseToEnable: "Choose a valid workbook to enable analysis.",
    sequenceLabel: "Analysis sequence",
    sequence: ["Validate", "Estimate", "Compare", "Stabilize", "Interpret"],
    referenceTitle: "Reference result",
    referenceOpen: "Open",
    referenceBody: "Explore precomputed aggregate statistics without uploading row-level data.",
    resetReference: "Reset reference view",
    openReference: "Open aggregate reference",
    privacyTitle: "Privacy and production note",
    privacyBody: "Production uploads require a separately configured R analysis service. If unavailable, Open SNA fails closed and never substitutes example results. LUNA receives aggregate statistics only through a server-side, zero-data-retention request; the workbook, source rows, and respondent IDs are never sent to OpenRouter.",
  },
  beta: {
    ariaLabel: "Open SNA Public Beta notice",
    title: "Public Beta",
    items: [
      "The service processes one analysis at a time.",
      "A second concurrent request may return WORKER_BUSY.",
      "Large workbooks or analyses with 1,000 bootstrap replicates may time out.",
      "Uploaded workbooks and row-level data are not retained.",
      "This Public Beta has no high-availability or availability commitment.",
    ],
  },
  status: {
    actionNeeded: "Action needed",
    working: "Open SNA is working",
    ready: "Ready",
    loadingReference: "Loading the aggregate reference analysis...",
    referenceReady: "Programming Resilience aggregate reference loaded and ready to explore.",
    workbookReady: "{name} is ready. Review the stability setting, then run the R analysis.",
    removedWithResult: "The current result remains open. Choose another workbook whenever you are ready.",
    removedEmpty: "Choose an XLSX workbook or open the aggregate reference.",
    analysisRunning: "Running validation, network estimation, subgroup comparison, and stability analysis in R, followed by an aggregate-only LUNA interpretation. This may take several minutes.",
    noSubstitution: "No uploaded-workbook result was substituted with reference data.",
    completeLuna: "Workbook analysis and LUNA interpretation complete. Temporary source data was removed.",
    completeFallback: "Workbook analysis complete. LUNA was unavailable, so the deterministic R interpretation is shown. Temporary source data was removed.",
  },
  errors: {
    generic: "The workbook could not be analyzed. Try again later or inspect the aggregate reference result.",
    referenceLoad: "The reference result could not be loaded.",
    notXlsx: "Choose an XLSX workbook. Other file types are not accepted.",
    emptyWorkbook: "The selected workbook is empty.",
    workbookTooLarge: "The selected workbook is larger than the 5 MiB upload limit.",
    WORKER_BUSY: "Another analysis is already running. Wait for it to finish, then try again. (WORKER_BUSY)",
    R_ENGINE_UNAVAILABLE: "The R analysis service is temporarily unavailable. Try again later. (R_ENGINE_UNAVAILABLE)",
    R_ENGINE_CONTRACT_FAILED: "The R analysis service returned a result that could not be used. Try again later. (R_ENGINE_CONTRACT_FAILED)",
    R_ANALYSIS_FAILED: "The R analysis engine failed before producing a valid result. Try again later. (R_ANALYSIS_FAILED)",
    R_ENGINE_DISABLED: "Public workbook analysis is temporarily disabled. You can still inspect the aggregate reference result. (R_ENGINE_DISABLED)",
    R_ENGINE_NOT_CONFIGURED: "Public workbook analysis is not configured on this deployment. You can still inspect the aggregate reference result. (R_ENGINE_NOT_CONFIGURED)",
    R_ENGINE_CONFIGURATION_INVALID: "The production R analysis service is configured incorrectly. You can still inspect the aggregate reference result. (R_ENGINE_CONFIGURATION_INVALID)",
    R_ANALYSIS_TIMEOUT: "The analysis exceeded the service time limit. Try fewer bootstrap replicates, a smaller workbook, or retry later. (R_ANALYSIS_TIMEOUT)",
    WORKBOOK_INVALID: "The workbook is not valid for Open SNA. Check its worksheet, item columns, grouping column, and analyzed group sizes. (WORKBOOK_INVALID)",
    JOB_NOT_FOUND: "That analysis job was not found. Submit the workbook again. (JOB_NOT_FOUND)",
  },
  empty: {
    title: "Choose an analysis source",
    body: "Open the aggregate Programming Resilience reference analysis, or upload a compatible XLSX workbook and run the local R engine.",
  },
  results: {
    aggregateReference: "Aggregate reference",
    uploadedWorkbook: "Uploaded workbook",
    schema: "Schema {version}",
    summary: "{responses} responses · {nodes} nodes · {edges} nonzero edges",
    json: "JSON",
    nodeCsv: "Node CSV",
  },
  navigation: {
    previousAnalysis: "Previous analysis: {label}",
    nextAnalysis: "Next analysis: {label}",
    jump: "Jump to analysis",
    tablist: "Open SNA analyses",
    progress: "Analysis {current} of {total}",
    panelNav: "Analysis panel navigation",
    previous: "Previous",
    next: "Next",
  },
  table: {
    searchLabel: "Search nodes in {caption}",
    searchPlaceholder: "Search node or community",
    showing: "Showing {visible} of {total} nodes",
    sortCaption: "{caption}. Use column headers to sort the table.",
    node: "Node",
    community: "Community",
    noMatch: "No nodes match “{query}”.",
  },
  overview: {
    analyzedResponses: "Analyzed responses",
    analyzedDetail: "{count} rows removed by listwise deletion",
    networkSize: "Network size",
    networkSizeValue: "{count} nodes",
    networkSizeDetail: "{edges} of {possible} possible edges",
    density: "Network density",
    densityDetail: "{positive} positive and {negative} negative edges",
    meanPredictability: "Mean predictability",
    meanPredictabilityDetail: "Mean R-squared from a separate MGM model",
    contractTitle: "Data contract",
    worksheet: "Worksheet",
    originalRows: "Original rows",
    itemScale: "Item scale",
    itemScaleValue: "Integer 1 to 5",
    communities: "Communities",
    missingDataRule: "Missing-data rule",
    subgroupCounts: "Subgroup counts",
    profileNote: "All network-based panels use the same {profile} profile: nonparanormal transformation, Pearson correlation, and EBICglasso with gamma {gamma}. This prevents incompatible network specifications from being combined silently.",
    runtimeCautions: "Runtime cautions",
  },
  network: {
    edgeList: "Accessible edge list",
    edgeListCaption: "Nonzero regularized network edges",
    source: "Source",
    target: "Target",
    weight: "Weight",
    type: "Type",
  },
  graph: {
    title: "Explore the network",
    edgeCount: "{visible} of {total} edges",
    filterHelp: "Filter communities and weaker edges, then hover, focus, or select a node to trace its direct connections.",
    zoomControls: "Network zoom controls",
    zoomOut: "Zoom out",
    zoomIn: "Zoom in",
    resetView: "Reset view",
    resetNetwork: "Reset network view",
    visibleCommunities: "Visible communities",
    visible: "visible",
    hidden: "hidden",
    minimumWeight: "Minimum absolute edge weight",
    inspectNode: "Inspect a node",
    chooseNode: "Choose a visible node",
    instructions: "Use Tab to focus a visible node. Press Enter or Space to select it, and Escape to clear the selection.",
    summary: "{nodes} nodes and {edges} currently visible nonzero edges. Node size reflects predictability. Edge width reflects absolute regularized partial-correlation weight.",
    edgeTitle: "{source} to {target}: {weight}",
    nodeAria: "{label}, {community} community, strength {strength}, predictability {predictability}{selected}",
    selectedSuffix: ", selected",
    nodeTitle: "{id}, {community}, strength {strength}, predictability {predictability}",
    inspector: "Node inspector",
    communityLabel: "{community} community",
    strength: "Strength",
    predictability: "Predictability",
    visibleTies: "Visible ties",
    selectedHint: "Selected. Adjust filters or zoom while keeping this node in focus.",
    previewHint: "Previewing this node. Select it to keep the inspector open.",
    selectNode: "Select a node",
    selectNodeHelp: "Hover with a pointer, or use Tab and Enter, to inspect a node and highlight its neighborhood.",
    strongestTies: "Strongest visible ties",
    strongestEdge: "Overall strongest edge: {source} to {target} ({weight}).",
    noEdge: "No nonzero edge was estimated.",
    signLegend: "Solid teal lines are positive; dashed red lines are negative.",
    nodeSizeLegend: "Node size = predictability",
  },
  centrality: {
    note: "Ordinary centrality and bridge centrality are reported separately. Only strength has a corresponding ordinary-centrality CS check in this profile; closeness and betweenness remain descriptive. High centrality does not establish causation or an intervention target.",
    caption: "Ordinary node centrality estimates",
    strength: "Strength",
    expectedInfluence: "Expected influence",
    betweenness: "Betweenness",
    closeness: "Closeness",
  },
  bridge: {
    topNode: "Top bridge-strength node",
    estimateUnavailable: "Estimate unavailable",
    topDetail: "Bridge strength {value}",
    stability: "Bridge-strength stability",
    caption: "Bridge-node centrality estimates",
    bridgeStrength: "Bridge strength",
    bridgeExpectedInfluence: "Bridge expected influence",
    bridgeBetweenness: "Bridge betweenness",
    bridgeCloseness: "Bridge closeness",
    note: "Bridge metrics use the {count} detected construct-prefix communities. Any metric with a case-dropping CS coefficient below 0.25 is shown but must not be interpreted.",
  },
  predictability: {
    title: "Node-level explained variance",
    body: "Higher values indicate more variance explained by the remaining nodes.",
    meanBadge: "Mean R-squared {value}",
    note: "Predictability uses a separate MGM model ({model}) fitted to the same input and preprocessing provenance. It is not computed from the displayed EBICglasso edge matrix.",
  },
  comparison: {
    groupStrength: "{group} global strength",
    sampleSize: "n = {count}",
    globalTest: "Global-strength test",
    globalDetail: "Absolute difference {value}",
    structureTest: "Structure-invariance test",
    structureDetail: "Maximum edge difference {value}",
    caption: "Largest subgroup edge differences",
    edge: "Edge",
    absoluteDifference: "Absolute difference",
    holmP: "Holm-adjusted p",
    edgePair: "{source} to {target}",
    note: "{method} from NetworkComparisonTest {version}; {permutations} independent-group permutations with Holm correction. A p-value is evidence about the tested difference, not evidence of causation.",
  },
  stability: {
    ruleLabel: "Decision rule:",
    rule: "CS below {acceptable} must not be interpreted; {acceptable} to {acceptableTop} is acceptable; {desirable} or above is desirable.",
    method: "Method: {method}, correlation threshold {threshold}, {bootstraps} case-dropping bootstrap samples, {cores} core.",
  },
  interpretation: {
    title: "Automated evidence summary",
    lunaBadge: "GPT-5.6 Luna via OpenRouter",
    referenceBadge: "Precomputed R reference",
    fallbackBadge: "Deterministic R fallback",
    lunaBody: "GPT-5.6 Luna generated this interpretation from aggregate statistics only. The server sends no row-level workbook data or respondent IDs and requires zero-data-retention routing.",
    referenceBody: "This precomputed reference preserves the deterministic R evidence summary and does not make an AI request. Run a workbook analysis to generate an aggregate-only LUNA interpretation.",
    fallbackBody: "LUNA was unavailable or not configured for this result, so Open SNA is showing its deterministic R evidence summary. No row-level workbook data was sent to an AI provider.",
    evidence: "Evidence {value}",
    limits: "Interpretation limits",
  },
  panels: {
    overview: { label: "Data Overview", shortLabel: "Overview", summary: "Sample, model, and data-quality context" },
    network: { label: "Network Visualization", shortLabel: "Network", summary: "Filter, zoom, and inspect node connections" },
    centrality: { label: "Centrality Analysis", shortLabel: "Centrality", summary: "Search and sort ordinary centrality estimates" },
    bridge: { label: "Bridge Node Analysis", shortLabel: "Bridge nodes", summary: "Compare cross-community bridge measures" },
    predictability: { label: "Predictability Analysis", shortLabel: "Predictability", summary: "Review node-level explained variance" },
    comparison: { label: "Subgroup Comparison (NCT)", shortLabel: "Subgroups", summary: "Inspect permutation-based group differences" },
    stability: { label: "Stability Analysis", shortLabel: "Stability", summary: "Check which centrality findings are dependable" },
    interpretation: { label: "AI Interpretation", shortLabel: "Interpretation", summary: "Read an evidence-bounded automated summary" },
  },
  relationships: { withinCommunity: "within-community", betweenCommunity: "between-community" },
  stabilityLabels: { desirable: "Desirable", acceptable: "Acceptable", doNotInterpret: "Do not interpret" },
  metricNames: {
    strength: "Strength",
    bridgeStrength: "Bridge strength",
    bridgeCloseness: "Bridge closeness",
    bridgeBetweenness: "Bridge betweenness",
  },
  common: { notAvailable: "Not available" },
  known: {
    listwiseDeletion: OPEN_SNA_KNOWN_PHRASES.listwiseDeletion,
    caseDroppingBootstrap: OPEN_SNA_KNOWN_PHRASES.caseDroppingBootstrap,
    lunaNotConfigured: OPEN_SNA_KNOWN_PHRASES.lunaNotConfigured,
    lunaUnavailable: OPEN_SNA_KNOWN_PHRASES.lunaUnavailable,
    emptyNetworkStability: OPEN_SNA_KNOWN_PHRASES.emptyNetworkStability,
    referenceFileName: OPEN_SNA_KNOWN_PHRASES.referenceFileName,
    dataWorksheet: OPEN_SNA_KNOWN_PHRASES.dataWorksheet,
    cautionEdges: OPEN_SNA_KNOWN_PHRASES.cautionEdges,
    cautionStability: OPEN_SNA_KNOWN_PHRASES.cautionStability,
    cautionSubgroup: OPEN_SNA_KNOWN_PHRASES.cautionSubgroup,
    cautionReview: OPEN_SNA_KNOWN_PHRASES.cautionReview,
    runtimeWarning: "Runtime warning: {detail}",
  },
  insights: {
    titles: {
      networkStructure: "Network structure",
      centralNode: "Highest node strength",
      predictability: "Highest predictability",
      bridgeNode: "Bridge node",
      bridgeLimited: "Bridge interpretation is limited",
      subgroup: "Subgroup comparison",
    },
    evidence: {
      networkStructure: "Overview: edge count and density",
      centralNode: "Centrality Analysis: strength",
      predictability: "Predictability Analysis: mgm R-squared",
      bridgeNode: "Bridge Node Analysis and Stability Analysis",
      bridgeLimited: "Stability Analysis: bridge strength CS coefficient",
      subgroup: "Subgroup Comparison: permutation test",
    },
    networkStructure: "The estimated network contains {edges} of {possible} possible edges (density {density}).",
    centralNode: "{node} has the highest strength in this estimated network ({value}).",
    predictability: "{node} has the highest node predictability R-squared ({value}).",
    bridgeNode: "{node} has the highest bridge strength, and the bridge-strength stability threshold permits cautious interpretation.",
    bridgeLimited: "Bridge rankings should not be emphasized because the corresponding stability evidence is below the minimum interpretation threshold or unavailable.",
    subgroupDetected: "The permutation test detects a subgroup difference in network structure (p = {p}). Inspect corrected edge tests before drawing item-level conclusions.",
    subgroupNotDetected: "The permutation test does not detect a subgroup difference in network structure at alpha .05 (p = {p}). This is not evidence that the networks are identical.",
  },
};

const zhHant: OpenSnaCopy = {
  meta: {
    title: "Open SNA",
    description: "為 Programming Resilience 問卷資料運行透明的社會網絡分析流程，涵蓋網絡、中心性、橋接、可預測性、子群組、穩定性與證據摘要。",
  },
  page: {
    skip: "跳至工作台",
    eyebrow: "開放研究工作台",
    runsOnR: "以 R 運行",
    titleLead: "看見網絡。",
    titleAccent: "信守方法。",
    intro: "探索可重現的 Programming Resilience 參照網絡，或把相容的 XLSX 活頁簿放入同一套證據一致的流程，涵蓋視覺化、中心性、橋接節點、子群組比較與穩定性。",
    exploreReference: "查看參照結果",
    analyzeWorkbook: "分析你的活頁簿",
    analysisViews: "個分析視圖",
    nctPermutations: "次 NCT 置換",
    rawRows: "輸出不含原始列",
    zero: "零",
    methodSummaryLabel: "Open SNA 方法摘要",
    fromData: "由數據到證據",
    steps: [
      { label: "驗證", detail: "有界結構與私隱檢查" },
      { label: "估計", detail: "NPN 配合 EBICglasso 設定" },
      { label: "檢驗", detail: "NCT 與個案刪除穩定性" },
    ],
    aggregateOnly: "設計上只輸出匯總結果",
    mobileEyebrow: "設計上保持透明",
    mobileTitle: "方法如何受到約束",
    mobileItems: [
      { label: "同一設定：", text: "各網絡面板均使用 NPN 加 EBICglasso。" },
      { label: "實質推論：", text: "NCT 與個案刪除穩定性。" },
      { label: "私隱輸出：", text: "只含匯總指標，不含原始回應或識別碼。" },
    ],
  },
  workbenchLabel: "Open SNA 分析工作台",
  setup: {
    eyebrow: "分析設定",
    title: "數據與模型",
    collapse: "收合分析設定",
    expand: "展開分析設定",
    chooseWorkbook: "1. 選擇活頁簿",
    fileLimit: "XLSX · 最大 5 MiB",
    chooseFileAria: "選擇 XLSX 活頁簿",
    dropHere: "將活頁簿拖放到此處",
    browse: "或由此裝置瀏覽",
    readyToValidate: "可以開始驗證",
    replaceFile: "更換檔案",
    chooseFile: "選擇檔案",
    remove: "移除",
    help: "請使用單一工作表，包含 6 至 40 個整數 Likert 題項（1 至 5）、重複的構念前綴，以及一個有效的兩水平 Gender 或後設資料欄；在整列刪除（listwise deletion）後，每個組別至少要有 20 列納入分析。",
    sampleDownload: "下載合成樣本活頁簿",
    stabilityPrecision: "2. 穩定性精度",
    bootstrap100: "100 － 開發檢查",
    bootstrap500: "500 － 延伸檢查",
    bootstrap1000: "1,000 － 建議結果",
    methodSettings: "方法設定",
    profile: "設定檔",
    profileValue: "NPN EBICglasso v1",
    ebicGamma: "EBIC gamma",
    nct: "NCT",
    nctValue: "1,000 次置換",
    seed: "隨機種子",
    run: "運行 R + LUNA 分析",
    running: "分析進行中",
    chooseToEnable: "請先選擇有效的活頁簿，才能開始分析。",
    sequenceLabel: "分析步驟",
    sequence: ["驗證", "估計", "比較", "穩定", "解讀"],
    referenceTitle: "參照結果",
    referenceOpen: "已開啟",
    referenceBody: "查看預先計算的匯總統計，無需上傳列層資料。",
    resetReference: "重設參照視圖",
    openReference: "開啟匯總參照",
    privacyTitle: "私隱與正式環境說明",
    privacyBody: "正式環境的上傳需要另行設定的 R 分析服務。若服務不可用，Open SNA 會直接失敗，絕不以範例結果代替。LUNA 只經伺服器端、零資料保留的請求接收匯總統計；活頁簿、原始列與受訪者識別碼不會傳送至 OpenRouter。",
  },
  beta: {
    ariaLabel: "Open SNA 公開測試版通知",
    title: "公開測試版",
    items: [
      "服務每次只處理一項分析。",
      "同時提出的第二個請求可能回傳 WORKER_BUSY。",
      "大型活頁簿或使用 1,000 次自助法重複的分析可能會逾時。",
      "上傳的活頁簿與列層資料不會保留。",
      "此公開測試版不提供高可用性或可用性承諾。",
    ],
  },
  status: {
    actionNeeded: "需要處理",
    working: "Open SNA 正在處理",
    ready: "已就緒",
    loadingReference: "正在載入匯總參照分析……",
    referenceReady: "Programming Resilience 匯總參照已載入，可以開始查看。",
    workbookReady: "{name} 已就緒。請先核對穩定性設定，再運行 R 分析。",
    removedWithResult: "目前結果仍然開啟。準備好後可再選擇其他活頁簿。",
    removedEmpty: "請選擇 XLSX 活頁簿，或開啟匯總參照。",
    analysisRunning: "正在以 R 進行驗證、網絡估計、子群組比較與穩定性分析，其後會產生只基於匯總資料的 LUNA 解讀。這可能需要數分鐘。",
    noSubstitution: "沒有以上傳活頁簿的結果被參照數據取代。",
    completeLuna: "活頁簿分析與 LUNA 解讀已完成。臨時原始資料已移除。",
    completeFallback: "活頁簿分析已完成。LUNA 未能使用，因此顯示 R 的確定性解讀。臨時原始資料已移除。",
  },
  errors: {
    generic: "未能分析此活頁簿。請稍後再試，或查看匯總參照結果。",
    referenceLoad: "未能載入參照結果。",
    notXlsx: "請選擇 XLSX 活頁簿。其他檔案類型不會被接受。",
    emptyWorkbook: "所選活頁簿是空的。",
    workbookTooLarge: "所選活頁簿超過 5 MiB 上傳上限。",
    WORKER_BUSY: "已有另一項分析正在運行。請待其完成後再試。（WORKER_BUSY）",
    R_ENGINE_UNAVAILABLE: "R 分析服務暫時未能使用。請稍後再試。（R_ENGINE_UNAVAILABLE）",
    R_ENGINE_CONTRACT_FAILED: "R 分析服務回傳的結果無法使用。請稍後再試。（R_ENGINE_CONTRACT_FAILED）",
    R_ANALYSIS_FAILED: "R 分析引擎在產生有效結果前失敗。請稍後再試。（R_ANALYSIS_FAILED）",
    R_ENGINE_DISABLED: "公開活頁簿分析暫時停用。你仍可查看匯總參照結果。（R_ENGINE_DISABLED）",
    R_ENGINE_NOT_CONFIGURED: "此部署尚未設定公開活頁簿分析。你仍可查看匯總參照結果。（R_ENGINE_NOT_CONFIGURED）",
    R_ENGINE_CONFIGURATION_INVALID: "正式環境的 R 分析服務設定不正確。你仍可查看匯總參照結果。（R_ENGINE_CONFIGURATION_INVALID）",
    R_ANALYSIS_TIMEOUT: "分析超出服務時限。請減少自助法重複次數、改用較小的活頁簿，或稍後再試。（R_ANALYSIS_TIMEOUT）",
    WORKBOOK_INVALID: "此活頁簿不符合 Open SNA 要求。請檢查工作表、題項欄、分組欄，以及各組納入分析的列數。（WORKBOOK_INVALID）",
    JOB_NOT_FOUND: "找不到該分析工作。請重新提交活頁簿。（JOB_NOT_FOUND）",
  },
  empty: {
    title: "選擇分析來源",
    body: "開啟 Programming Resilience 匯總參照分析，或上傳相容的 XLSX 活頁簿並運行本地 R 引擎。",
  },
  results: {
    aggregateReference: "匯總參照",
    uploadedWorkbook: "已上傳活頁簿",
    schema: "結構版本 {version}",
    summary: "{responses} 份回應 · {nodes} 個節點 · {edges} 條非零連邊",
    json: "JSON",
    nodeCsv: "節點 CSV",
  },
  navigation: {
    previousAnalysis: "上一個分析：{label}",
    nextAnalysis: "下一個分析：{label}",
    jump: "跳至分析",
    tablist: "Open SNA 分析",
    progress: "分析 {current}／{total}",
    panelNav: "分析面板導覽",
    previous: "上一個",
    next: "下一個",
  },
  table: {
    searchLabel: "在{caption}中搜尋節點",
    searchPlaceholder: "搜尋節點或社群",
    showing: "顯示 {visible}／{total} 個節點",
    sortCaption: "{caption}。使用欄位標題為表格排序。",
    node: "節點",
    community: "社群",
    noMatch: "沒有節點符合「{query}」。",
  },
  overview: {
    analyzedResponses: "納入分析的回應",
    analyzedDetail: "整列刪除移除了 {count} 列",
    networkSize: "網絡規模",
    networkSizeValue: "{count} 個節點",
    networkSizeDetail: "{possible} 條可能連邊中的 {edges} 條",
    density: "網絡密度",
    densityDetail: "{positive} 條正連邊、{negative} 條負連邊",
    meanPredictability: "平均可預測性",
    meanPredictabilityDetail: "來自另一個 MGM 模型的平均 R²",
    contractTitle: "數據契約",
    worksheet: "工作表",
    originalRows: "原始列數",
    itemScale: "題項量尺",
    itemScaleValue: "整數 1 至 5",
    communities: "社群",
    missingDataRule: "缺失值規則",
    subgroupCounts: "子群組人數",
    profileNote: "所有基於網絡的面板都使用同一個 {profile} 設定：非參正態轉換、Pearson 相關，以及 gamma 為 {gamma} 的 EBICglasso。這可避免把互不相容的網絡設定默默合併。",
    runtimeCautions: "運行警示",
  },
  network: {
    edgeList: "無障礙連邊列表",
    edgeListCaption: "非零正則化網絡連邊",
    source: "起點",
    target: "終點",
    weight: "權重",
    type: "類型",
  },
  graph: {
    title: "探索網絡",
    edgeCount: "{total} 條連邊中的 {visible} 條",
    filterHelp: "篩選社群與較弱連邊，然後以懸停、焦點或選取節點來追蹤其直接連結。",
    zoomControls: "網絡縮放控制",
    zoomOut: "縮小",
    zoomIn: "放大",
    resetView: "重設視圖",
    resetNetwork: "重設網絡視圖",
    visibleCommunities: "顯示中的社群",
    visible: "顯示中",
    hidden: "已隱藏",
    minimumWeight: "連邊絕對權重下限",
    inspectNode: "檢視節點",
    chooseNode: "選擇一個顯示中的節點",
    instructions: "使用 Tab 聚焦顯示中的節點。按 Enter 或空白鍵選取，按 Escape 清除選取。",
    summary: "{nodes} 個節點，以及目前可見的 {edges} 條非零連邊。節點大小反映可預測性。連邊寬度反映絕對正則化偏相關權重。",
    edgeTitle: "{source} 至 {target}：{weight}",
    nodeAria: "{label}，{community} 社群，強度 {strength}，可預測性 {predictability}{selected}",
    selectedSuffix: "，已選取",
    nodeTitle: "{id}，{community}，強度 {strength}，可預測性 {predictability}",
    inspector: "節點檢視器",
    communityLabel: "{community} 社群",
    strength: "強度",
    predictability: "可預測性",
    visibleTies: "可見連結",
    selectedHint: "已選取。調整篩選或縮放時，此節點會保持在焦點中。",
    previewHint: "正在預覽此節點。選取它可讓檢視器保持開啟。",
    selectNode: "選取節點",
    selectNodeHelp: "以指標懸停，或使用 Tab 與 Enter，檢視節點並突出其鄰域。",
    strongestTies: "最強的可見連結",
    strongestEdge: "整體最強連邊：{source} 至 {target}（{weight}）。",
    noEdge: "沒有估計出非零連邊。",
    signLegend: "實線青色為正連邊；虛線紅色為負連邊。",
    nodeSizeLegend: "節點大小 = 可預測性",
  },
  centrality: {
    note: "一般中心性與橋接中心性分開報告。在此設定中，只有強度具有對應的一般中心性 CS 檢驗；接近中心性與中介中心性仍屬描述性結果。高中心性並不確立因果，也不構成干預目標。",
    caption: "一般節點中心性估計",
    strength: "強度（strength）",
    expectedInfluence: "預期影響（expected influence）",
    betweenness: "中介中心性（betweenness）",
    closeness: "接近中心性（closeness）",
  },
  bridge: {
    topNode: "橋接強度最高的節點",
    estimateUnavailable: "估計未能提供",
    topDetail: "橋接強度 {value}",
    stability: "橋接強度穩定性",
    caption: "橋接節點中心性估計",
    bridgeStrength: "橋接強度",
    bridgeExpectedInfluence: "橋接預期影響",
    bridgeBetweenness: "橋接中介中心性",
    bridgeCloseness: "橋接接近中心性",
    note: "橋接指標使用偵測到的 {count} 個構念前綴社群。個案刪除 CS 係數低於 0.25 的指標仍會顯示，但不得解讀。",
  },
  predictability: {
    title: "節點層面的解釋變異",
    body: "數值愈高，表示其餘節點解釋了愈多變異。",
    meanBadge: "平均 R² {value}",
    note: "可預測性使用另一個 MGM 模型（{model}），擬合於相同輸入與預處理來源。它並非由所顯示的 EBICglasso 連邊矩陣計算。",
  },
  comparison: {
    groupStrength: "{group} 整體強度",
    sampleSize: "n = {count}",
    globalTest: "整體強度檢驗",
    globalDetail: "絕對差值 {value}",
    structureTest: "結構不變性檢驗",
    structureDetail: "最大連邊差值 {value}",
    caption: "最大的子群組連邊差異",
    edge: "連邊",
    absoluteDifference: "絕對差值",
    holmP: "Holm 校正 p",
    edgePair: "{source} 至 {target}",
    note: "{method}，來自 NetworkComparisonTest {version}；{permutations} 次獨立組別置換，並採用 Holm 校正。p 值是關於所檢驗差異的證據，並非因果證據。",
  },
  stability: {
    ruleLabel: "決定規則：",
    rule: "CS 低於 {acceptable} 不得解讀；{acceptable} 至 {acceptableTop} 為可接受；{desirable} 或以上為理想。",
    method: "方法：{method}，相關係數閾值 {threshold}，{bootstraps} 個個案刪除自助樣本，{cores} 個核心。",
  },
  interpretation: {
    title: "自動化證據摘要",
    lunaBadge: "GPT-5.6 Luna via OpenRouter",
    referenceBadge: "預先計算的 R 參照",
    fallbackBadge: "R 確定性後備結果",
    lunaBody: "GPT-5.6 Luna 只根據匯總統計產生此解讀。伺服器不會傳送列層活頁簿資料或受訪者識別碼，並要求零資料保留路由。",
    referenceBody: "此預先計算的參照保留 R 的確定性證據摘要，不會發出人工智能請求。運行活頁簿分析後，才會產生只基於匯總資料的 LUNA 解讀。",
    fallbackBody: "此結果的 LUNA 未能使用或尚未設定，因此 Open SNA 顯示 R 的確定性證據摘要。沒有列層活頁簿資料被傳送至人工智能服務。",
    evidence: "證據 {value}",
    limits: "解讀限制",
  },
  panels: {
    overview: { label: "數據概覽", shortLabel: "概覽", summary: "樣本、模型與數據質素脈絡" },
    network: { label: "網絡視覺化", shortLabel: "網絡", summary: "篩選、縮放並檢視節點連結" },
    centrality: { label: "中心性分析", shortLabel: "中心性", summary: "搜尋並排序一般中心性估計" },
    bridge: { label: "橋接節點分析", shortLabel: "橋接節點", summary: "比較跨社群的橋接指標" },
    predictability: { label: "可預測性分析", shortLabel: "可預測性", summary: "檢視節點層面的解釋變異" },
    comparison: { label: "子群組比較（NCT）", shortLabel: "子群組", summary: "檢視基於置換的組間差異" },
    stability: { label: "穩定性分析", shortLabel: "穩定性", summary: "檢查哪些中心性結果可以依賴" },
    interpretation: { label: "人工智能解讀", shortLabel: "解讀", summary: "閱讀受證據約束的自動化摘要" },
  },
  relationships: { withinCommunity: "社群內", betweenCommunity: "社群間" },
  stabilityLabels: { desirable: "理想", acceptable: "可接受", doNotInterpret: "不宜解讀" },
  metricNames: {
    strength: "強度（strength）",
    bridgeStrength: "橋接強度",
    bridgeCloseness: "橋接接近中心性",
    bridgeBetweenness: "橋接中介中心性",
  },
  common: { notAvailable: "未能提供" },
  known: {
    listwiseDeletion: "對所選網絡題項作整列刪除（listwise deletion）",
    caseDroppingBootstrap: "個案刪除自助法（case-dropping bootstrap）",
    lunaNotConfigured: "尚未設定 LUNA 人工智能解讀，因此顯示 R 的確定性證據摘要。",
    lunaUnavailable: "LUNA 人工智能解讀暫時未能使用，因此顯示 R 的確定性證據摘要。",
    emptyNetworkStability: "估計網絡沒有非零連邊；個案刪除中心性的穩定性未能提供。",
    referenceFileName: "Programming Resilience 匯總參照",
    dataWorksheet: "數據工作表",
    cautionEdges: "連邊是正則化偏相關，並不確立因果方向。",
    cautionStability: "中心性與橋接排序只應在穩定性充足時解讀。",
    cautionSubgroup: "子群組置換檢驗取決於所選模型、分組變項與再抽樣次數。",
    cautionReview: "發表前請覆核活頁簿結構、缺失值排除規則與方法設定。",
    runtimeWarning: "運行警示：{detail}",
  },
  insights: {
    titles: {
      networkStructure: "網絡結構",
      centralNode: "最高節點強度",
      predictability: "最高可預測性",
      bridgeNode: "橋接節點",
      bridgeLimited: "橋接解讀受到限制",
      subgroup: "子群組比較",
    },
    evidence: {
      networkStructure: "概覽：連邊數量與密度",
      centralNode: "中心性分析：強度",
      predictability: "可預測性分析：mgm R²",
      bridgeNode: "橋接節點分析與穩定性分析",
      bridgeLimited: "穩定性分析：橋接強度 CS 係數",
      subgroup: "子群組比較：置換檢驗",
    },
    networkStructure: "估計網絡在 {possible} 條可能連邊中包含 {edges} 條（密度 {density}）。",
    centralNode: "在此估計網絡中，{node} 的強度（strength）最高（{value}）。",
    predictability: "{node} 的節點可預測性 R² 最高（{value}）。",
    bridgeNode: "{node} 的橋接強度（bridge strength）最高，而且橋接強度的穩定性閾值允許審慎解讀。",
    bridgeLimited: "橋接排序不宜強調，因為相應的穩定性證據低於最低解讀閾值，或未能提供。",
    subgroupDetected: "置換檢驗偵測到網絡結構的子群組差異（p = {p}）。在作出題項層面的結論前，請先檢視校正後的連邊檢驗。",
    subgroupNotDetected: "在 α = .05 下，置換檢驗未偵測到網絡結構的子群組差異（p = {p}）。這並不表示兩個網絡完全相同。",
  },
};

const zhHans: OpenSnaCopy = {
  meta: {
    title: "Open SNA",
    description: "为 Programming Resilience 问卷数据运行透明的社会网络分析流程，涵盖网络、中心性、桥接、可预测性、子群组、稳定性与证据摘要。",
  },
  page: {
    skip: "跳至工作台",
    eyebrow: "开放研究工作台",
    runsOnR: "以 R 运行",
    titleLead: "看见网络。",
    titleAccent: "信守方法。",
    intro: "探索可重现的 Programming Resilience 参照网络，或把兼容的 XLSX 工作簿放入同一套证据一致的流程，涵盖可视化、中心性、桥接节点、子群组比较与稳定性。",
    exploreReference: "查看参照结果",
    analyzeWorkbook: "分析你的工作簿",
    analysisViews: "个分析视图",
    nctPermutations: "次 NCT 置换",
    rawRows: "输出不含原始行",
    zero: "零",
    methodSummaryLabel: "Open SNA 方法摘要",
    fromData: "由数据到证据",
    steps: [
      { label: "验证", detail: "有界结构与隐私检查" },
      { label: "估计", detail: "NPN 配合 EBICglasso 设定" },
      { label: "检验", detail: "NCT 与个案删除稳定性" },
    ],
    aggregateOnly: "设计上只输出汇总结果",
    mobileEyebrow: "设计上保持透明",
    mobileTitle: "方法如何受到约束",
    mobileItems: [
      { label: "同一设定：", text: "各网络面板均使用 NPN 加 EBICglasso。" },
      { label: "实质推论：", text: "NCT 与个案删除稳定性。" },
      { label: "隐私输出：", text: "只含汇总指标，不含原始回答或识别码。" },
    ],
  },
  workbenchLabel: "Open SNA 分析工作台",
  setup: {
    eyebrow: "分析设置",
    title: "数据与模型",
    collapse: "收起分析设置",
    expand: "展开分析设置",
    chooseWorkbook: "1. 选择工作簿",
    fileLimit: "XLSX · 最大 5 MiB",
    chooseFileAria: "选择 XLSX 工作簿",
    dropHere: "将工作簿拖放到此处",
    browse: "或从此设备浏览",
    readyToValidate: "可以开始验证",
    replaceFile: "更换文件",
    chooseFile: "选择文件",
    remove: "移除",
    help: "请使用单个工作表，包含 6 至 40 个整数 Likert 题项（1 至 5）、重复的构念前缀，以及一个有效的两水平 Gender 或元数据列；在整行删除（listwise deletion）后，每个组别至少要有 20 行纳入分析。",
    sampleDownload: "下载合成样本工作簿",
    stabilityPrecision: "2. 稳定性精度",
    bootstrap100: "100 － 开发检查",
    bootstrap500: "500 － 扩展检查",
    bootstrap1000: "1,000 － 建议结果",
    methodSettings: "方法设置",
    profile: "配置",
    profileValue: "NPN EBICglasso v1",
    ebicGamma: "EBIC gamma",
    nct: "NCT",
    nctValue: "1,000 次置换",
    seed: "随机种子",
    run: "运行 R + LUNA 分析",
    running: "分析进行中",
    chooseToEnable: "请先选择有效的工作簿，才能开始分析。",
    sequenceLabel: "分析步骤",
    sequence: ["验证", "估计", "比较", "稳定", "解读"],
    referenceTitle: "参照结果",
    referenceOpen: "已打开",
    referenceBody: "查看预先计算的汇总统计，无需上传行级数据。",
    resetReference: "重置参照视图",
    openReference: "打开汇总参照",
    privacyTitle: "隐私与生产环境说明",
    privacyBody: "生产环境的上传需要另行配置的 R 分析服务。若服务不可用，Open SNA 会直接失败，绝不以示例结果代替。LUNA 只经服务器端、零数据保留的请求接收汇总统计；工作簿、原始行与受访者识别码不会发送至 OpenRouter。",
  },
  beta: {
    ariaLabel: "Open SNA 公开测试版通知",
    title: "公开测试版",
    items: [
      "服务每次只处理一项分析。",
      "同时提出的第二个请求可能返回 WORKER_BUSY。",
      "大型工作簿或使用 1,000 次自助法重复的分析可能会超时。",
      "上传的工作簿与行级数据不会保留。",
      "此公开测试版不提供高可用性或可用性承诺。",
    ],
  },
  status: {
    actionNeeded: "需要处理",
    working: "Open SNA 正在处理",
    ready: "已就绪",
    loadingReference: "正在加载汇总参照分析……",
    referenceReady: "Programming Resilience 汇总参照已加载，可以开始查看。",
    workbookReady: "{name} 已就绪。请先核对稳定性设置，再运行 R 分析。",
    removedWithResult: "当前结果仍然打开。准备好后可再选择其他工作簿。",
    removedEmpty: "请选择 XLSX 工作簿，或打开汇总参照。",
    analysisRunning: "正在以 R 进行验证、网络估计、子群组比较与稳定性分析，其后会产生只基于汇总数据的 LUNA 解读。这可能需要数分钟。",
    noSubstitution: "没有以上传工作簿的结果被参照数据替换。",
    completeLuna: "工作簿分析与 LUNA 解读已完成。临时原始数据已移除。",
    completeFallback: "工作簿分析已完成。LUNA 未能使用，因此显示 R 的确定性解读。临时原始数据已移除。",
  },
  errors: {
    generic: "未能分析此工作簿。请稍后再试，或查看汇总参照结果。",
    referenceLoad: "未能加载参照结果。",
    notXlsx: "请选择 XLSX 工作簿。其他文件类型不会被接受。",
    emptyWorkbook: "所选工作簿是空的。",
    workbookTooLarge: "所选工作簿超过 5 MiB 上传上限。",
    WORKER_BUSY: "已有另一项分析正在运行。请待其完成后再试。（WORKER_BUSY）",
    R_ENGINE_UNAVAILABLE: "R 分析服务暂时无法使用。请稍后再试。（R_ENGINE_UNAVAILABLE）",
    R_ENGINE_CONTRACT_FAILED: "R 分析服务返回的结果无法使用。请稍后再试。（R_ENGINE_CONTRACT_FAILED）",
    R_ANALYSIS_FAILED: "R 分析引擎在产生有效结果前失败。请稍后再试。（R_ANALYSIS_FAILED）",
    R_ENGINE_DISABLED: "公开工作簿分析暂时停用。你仍可查看汇总参照结果。（R_ENGINE_DISABLED）",
    R_ENGINE_NOT_CONFIGURED: "此部署尚未配置公开工作簿分析。你仍可查看汇总参照结果。（R_ENGINE_NOT_CONFIGURED）",
    R_ENGINE_CONFIGURATION_INVALID: "生产环境的 R 分析服务配置不正确。你仍可查看汇总参照结果。（R_ENGINE_CONFIGURATION_INVALID）",
    R_ANALYSIS_TIMEOUT: "分析超出服务时限。请减少自助法重复次数、改用较小的工作簿，或稍后再试。（R_ANALYSIS_TIMEOUT）",
    WORKBOOK_INVALID: "此工作簿不符合 Open SNA 要求。请检查工作表、题项列、分组列，以及各组纳入分析的行数。（WORKBOOK_INVALID）",
    JOB_NOT_FOUND: "找不到该分析作业。请重新提交工作簿。（JOB_NOT_FOUND）",
  },
  empty: {
    title: "选择分析来源",
    body: "打开 Programming Resilience 汇总参照分析，或上传兼容的 XLSX 工作簿并运行本地 R 引擎。",
  },
  results: {
    aggregateReference: "汇总参照",
    uploadedWorkbook: "已上传工作簿",
    schema: "结构版本 {version}",
    summary: "{responses} 份响应 · {nodes} 个节点 · {edges} 条非零连边",
    json: "JSON",
    nodeCsv: "节点 CSV",
  },
  navigation: {
    previousAnalysis: "上一个分析：{label}",
    nextAnalysis: "下一个分析：{label}",
    jump: "跳至分析",
    tablist: "Open SNA 分析",
    progress: "分析 {current}／{total}",
    panelNav: "分析面板导航",
    previous: "上一个",
    next: "下一个",
  },
  table: {
    searchLabel: "在{caption}中搜索节点",
    searchPlaceholder: "搜索节点或社区",
    showing: "显示 {visible}／{total} 个节点",
    sortCaption: "{caption}。使用列标题为表格排序。",
    node: "节点",
    community: "社区",
    noMatch: "没有节点符合“{query}”。",
  },
  overview: {
    analyzedResponses: "纳入分析的响应",
    analyzedDetail: "整行删除移除了 {count} 行",
    networkSize: "网络规模",
    networkSizeValue: "{count} 个节点",
    networkSizeDetail: "{possible} 条可能连边中的 {edges} 条",
    density: "网络密度",
    densityDetail: "{positive} 条正连边、{negative} 条负连边",
    meanPredictability: "平均可预测性",
    meanPredictabilityDetail: "来自另一个 MGM 模型的平均 R²",
    contractTitle: "数据契约",
    worksheet: "工作表",
    originalRows: "原始行数",
    itemScale: "题项量尺",
    itemScaleValue: "整数 1 至 5",
    communities: "社区",
    missingDataRule: "缺失值规则",
    subgroupCounts: "子群组人数",
    profileNote: "所有基于网络的面板都使用同一个 {profile} 设定：非参正态转换、Pearson 相关，以及 gamma 为 {gamma} 的 EBICglasso。这可避免把互不兼容的网络设定默默合并。",
    runtimeCautions: "运行警示",
  },
  network: {
    edgeList: "无障碍连边列表",
    edgeListCaption: "非零正则化网络连边",
    source: "起点",
    target: "终点",
    weight: "权重",
    type: "类型",
  },
  graph: {
    title: "探索网络",
    edgeCount: "{total} 条连边中的 {visible} 条",
    filterHelp: "筛选社区与较弱连边，然后以悬停、焦点或选择节点来追踪其直接连接。",
    zoomControls: "网络缩放控制",
    zoomOut: "缩小",
    zoomIn: "放大",
    resetView: "重置视图",
    resetNetwork: "重置网络视图",
    visibleCommunities: "显示中的社区",
    visible: "显示中",
    hidden: "已隐藏",
    minimumWeight: "连边绝对权重下限",
    inspectNode: "查看节点",
    chooseNode: "选择一个显示中的节点",
    instructions: "使用 Tab 聚焦显示中的节点。按 Enter 或空格键选择，按 Escape 清除选择。",
    summary: "{nodes} 个节点，以及当前可见的 {edges} 条非零连边。节点大小反映可预测性。连边宽度反映绝对正则化偏相关权重。",
    edgeTitle: "{source} 至 {target}：{weight}",
    nodeAria: "{label}，{community} 社区，强度 {strength}，可预测性 {predictability}{selected}",
    selectedSuffix: "，已选择",
    nodeTitle: "{id}，{community}，强度 {strength}，可预测性 {predictability}",
    inspector: "节点查看器",
    communityLabel: "{community} 社区",
    strength: "强度",
    predictability: "可预测性",
    visibleTies: "可见连接",
    selectedHint: "已选择。调整筛选或缩放时，此节点会保持在焦点中。",
    previewHint: "正在预览此节点。选择它可让查看器保持打开。",
    selectNode: "选择节点",
    selectNodeHelp: "以指针悬停，或使用 Tab 与 Enter，查看节点并突出其邻域。",
    strongestTies: "最强的可见连接",
    strongestEdge: "整体最强连边：{source} 至 {target}（{weight}）。",
    noEdge: "没有估计出非零连边。",
    signLegend: "实线青色为正连边；虚线红色为负连边。",
    nodeSizeLegend: "节点大小 = 可预测性",
  },
  centrality: {
    note: "一般中心性与桥接中心性分开报告。在此设定中，只有强度具有对应的一般中心性 CS 检验；接近中心性与中介中心性仍属描述性结果。高中心性并不确立因果，也不构成干预目标。",
    caption: "一般节点中心性估计",
    strength: "强度（strength）",
    expectedInfluence: "预期影响（expected influence）",
    betweenness: "中介中心性（betweenness）",
    closeness: "接近中心性（closeness）",
  },
  bridge: {
    topNode: "桥接强度最高的节点",
    estimateUnavailable: "估计未能提供",
    topDetail: "桥接强度 {value}",
    stability: "桥接强度稳定性",
    caption: "桥接节点中心性估计",
    bridgeStrength: "桥接强度",
    bridgeExpectedInfluence: "桥接预期影响",
    bridgeBetweenness: "桥接中介中心性",
    bridgeCloseness: "桥接接近中心性",
    note: "桥接指标使用检测到的 {count} 个构念前缀社区。个案删除 CS 系数低于 0.25 的指标仍会显示，但不得解读。",
  },
  predictability: {
    title: "节点层面的解释变异",
    body: "数值越高，表示其余节点解释了越多变异。",
    meanBadge: "平均 R² {value}",
    note: "可预测性使用另一个 MGM 模型（{model}），拟合于相同输入与预处理来源。它并非由所显示的 EBICglasso 连边矩阵计算。",
  },
  comparison: {
    groupStrength: "{group} 整体强度",
    sampleSize: "n = {count}",
    globalTest: "整体强度检验",
    globalDetail: "绝对差值 {value}",
    structureTest: "结构不变性检验",
    structureDetail: "最大连边差值 {value}",
    caption: "最大的子群组连边差异",
    edge: "连边",
    absoluteDifference: "绝对差值",
    holmP: "Holm 校正 p",
    edgePair: "{source} 至 {target}",
    note: "{method}，来自 NetworkComparisonTest {version}；{permutations} 次独立组别置换，并采用 Holm 校正。p 值是关于所检验差异的证据，并非因果证据。",
  },
  stability: {
    ruleLabel: "决定规则：",
    rule: "CS 低于 {acceptable} 不得解读；{acceptable} 至 {acceptableTop} 为可接受；{desirable} 或以上为理想。",
    method: "方法：{method}，相关系数阈值 {threshold}，{bootstraps} 个个案删除自助样本，{cores} 个核心。",
  },
  interpretation: {
    title: "自动化证据摘要",
    lunaBadge: "GPT-5.6 Luna via OpenRouter",
    referenceBadge: "预先计算的 R 参照",
    fallbackBadge: "R 确定性后备结果",
    lunaBody: "GPT-5.6 Luna 只根据汇总统计产生此解读。服务器不会发送行级工作簿数据或受访者识别码，并要求零数据保留路由。",
    referenceBody: "此预先计算的参照保留 R 的确定性证据摘要，不会发出人工智能请求。运行工作簿分析后，才会产生只基于汇总数据的 LUNA 解读。",
    fallbackBody: "此结果的 LUNA 未能使用或尚未配置，因此 Open SNA 显示 R 的确定性证据摘要。没有行级工作簿数据被发送至人工智能服务。",
    evidence: "证据 {value}",
    limits: "解读限制",
  },
  panels: {
    overview: { label: "数据概览", shortLabel: "概览", summary: "样本、模型与数据质量脉络" },
    network: { label: "网络可视化", shortLabel: "网络", summary: "筛选、缩放并查看节点连接" },
    centrality: { label: "中心性分析", shortLabel: "中心性", summary: "搜索并排序一般中心性估计" },
    bridge: { label: "桥接节点分析", shortLabel: "桥接节点", summary: "比较跨社区的桥接指标" },
    predictability: { label: "可预测性分析", shortLabel: "可预测性", summary: "查看节点层面的解释变异" },
    comparison: { label: "子群组比较（NCT）", shortLabel: "子群组", summary: "查看基于置换的组间差异" },
    stability: { label: "稳定性分析", shortLabel: "稳定性", summary: "检查哪些中心性结果可以依赖" },
    interpretation: { label: "人工智能解读", shortLabel: "解读", summary: "阅读受证据约束的自动化摘要" },
  },
  relationships: { withinCommunity: "社区内", betweenCommunity: "社区间" },
  stabilityLabels: { desirable: "理想", acceptable: "可接受", doNotInterpret: "不宜解读" },
  metricNames: {
    strength: "强度（strength）",
    bridgeStrength: "桥接强度",
    bridgeCloseness: "桥接接近中心性",
    bridgeBetweenness: "桥接中介中心性",
  },
  common: { notAvailable: "未能提供" },
  known: {
    listwiseDeletion: "对所选网络题项作整行删除（listwise deletion）",
    caseDroppingBootstrap: "个案删除自助法（case-dropping bootstrap）",
    lunaNotConfigured: "尚未配置 LUNA 人工智能解读，因此显示 R 的确定性证据摘要。",
    lunaUnavailable: "LUNA 人工智能解读暂时无法使用，因此显示 R 的确定性证据摘要。",
    emptyNetworkStability: "估计网络没有非零连边；个案删除中心性的稳定性未能提供。",
    referenceFileName: "Programming Resilience 汇总参照",
    dataWorksheet: "数据工作表",
    cautionEdges: "连边是正则化偏相关，并不确立因果方向。",
    cautionStability: "中心性与桥接排序只应在稳定性充足时解读。",
    cautionSubgroup: "子群组置换检验取决于所选模型、分组变量与再抽样次数。",
    cautionReview: "发表前请复核工作簿结构、缺失值排除规则与方法设置。",
    runtimeWarning: "运行警示：{detail}",
  },
  insights: {
    titles: {
      networkStructure: "网络结构",
      centralNode: "最高节点强度",
      predictability: "最高可预测性",
      bridgeNode: "桥接节点",
      bridgeLimited: "桥接解读受到限制",
      subgroup: "子群组比较",
    },
    evidence: {
      networkStructure: "概览：连边数量与密度",
      centralNode: "中心性分析：强度",
      predictability: "可预测性分析：mgm R²",
      bridgeNode: "桥接节点分析与稳定性分析",
      bridgeLimited: "稳定性分析：桥接强度 CS 系数",
      subgroup: "子群组比较：置换检验",
    },
    networkStructure: "估计网络在 {possible} 条可能连边中包含 {edges} 条（密度 {density}）。",
    centralNode: "在此估计网络中，{node} 的强度（strength）最高（{value}）。",
    predictability: "{node} 的节点可预测性 R² 最高（{value}）。",
    bridgeNode: "{node} 的桥接强度（bridge strength）最高，而且桥接强度的稳定性阈值允许审慎解读。",
    bridgeLimited: "桥接排序不宜强调，因为相应的稳定性证据低于最低解读阈值，或未能提供。",
    subgroupDetected: "置换检验检测到网络结构的子群组差异（p = {p}）。在作出题项层面的结论前，请先查看校正后的连边检验。",
    subgroupNotDetected: "在 α = .05 下，置换检验未检测到网络结构的子群组差异（p = {p}）。这并不表示两个网络完全相同。",
  },
};

const copies: Record<Locale, OpenSnaCopy> = {
  en,
  "zh-hant": zhHant,
  "zh-hans": zhHans,
};

export function getOpenSnaCopy(value: unknown): OpenSnaCopy {
  return copies[isLocale(value) ? value : "en"];
}

export function fillOpenSna(template: string, values: Record<string, string | number>) {
  return template.replace(/\{([A-Za-z0-9]+)\}/g, (match, key: string) => {
    const replacement = values[key];
    return replacement === undefined ? match : String(replacement);
  });
}

export function localizeOpenSnaKnownPhrase(copy: OpenSnaCopy, phrase: string) {
  const entries = Object.entries(OPEN_SNA_KNOWN_PHRASES) as Array<[keyof typeof OPEN_SNA_KNOWN_PHRASES, string]>;
  for (const [key, english] of entries) {
    if (phrase === english) return copy.known[key];
  }
  if (phrase.startsWith(RUNTIME_WARNING_PREFIX)) {
    return fillOpenSna(copy.known.runtimeWarning, { detail: phrase.slice(RUNTIME_WARNING_PREFIX.length) });
  }
  return phrase;
}

export function openSnaRelationshipLabel(copy: OpenSnaCopy, relationship: "within-community" | "between-community") {
  switch (relationship) {
    case "within-community":
      return copy.relationships.withinCommunity;
    case "between-community":
      return copy.relationships.betweenCommunity;
    default: {
      const exhaustive: never = relationship;
      return exhaustive;
    }
  }
}

type StabilityInterpretation = OpenSnaResult["stability"]["metrics"][number]["interpretation"];

export function openSnaStabilityLabel(copy: OpenSnaCopy, label: StabilityInterpretation) {
  switch (label) {
    case "Desirable":
      return copy.stabilityLabels.desirable;
    case "Acceptable":
      return copy.stabilityLabels.acceptable;
    case "Do not interpret":
      return copy.stabilityLabels.doNotInterpret;
    case "Not available":
      return copy.common.notAvailable;
    default: {
      const exhaustive: never = label;
      return exhaustive;
    }
  }
}

const METRIC_NAME_IDS = ["strength", "bridgeStrength", "bridgeCloseness", "bridgeBetweenness"] as const;

export function openSnaMetricName(copy: OpenSnaCopy, id: string, fallback: string) {
  if ((METRIC_NAME_IDS as readonly string[]).includes(id)) {
    return copy.metricNames[id as (typeof METRIC_NAME_IDS)[number]];
  }
  return fallback;
}

function isDeterministicInsightId(id: string): id is DeterministicInsightId {
  return (DETERMINISTIC_INSIGHT_IDS as readonly string[]).includes(id);
}

function topNode(nodes: OpenSnaResult["nodes"], key: "strength" | "bridgeStrength" | "predictability") {
  let best: { id: string; value: number } | null = null;
  for (const node of nodes) {
    const value = node[key];
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    if (!best || value > best.value) best = { id: node.id, value };
  }
  return best;
}

export function presentOpenSnaInsight(
  copy: OpenSnaCopy,
  result: OpenSnaResult,
  insight: OpenSnaResult["interpretation"]["insights"][number],
) {
  if (result.interpretation.thirdPartyAiUsed || !isDeterministicInsightId(insight.id)) return insight;
  const number = (value: number) => formatOpenSnaNumber(value, 3, copy.common.notAvailable);
  switch (insight.id) {
    case "network-structure":
      return {
        title: copy.insights.titles.networkStructure,
        evidence: copy.insights.evidence.networkStructure,
        text: fillOpenSna(copy.insights.networkStructure, {
          edges: result.overview.edgeCount,
          possible: result.overview.possibleEdges,
          density: number(result.overview.density),
        }),
      };
    case "central-node": {
      const node = topNode(result.nodes, "strength");
      if (!node) return insight;
      return {
        title: copy.insights.titles.centralNode,
        evidence: copy.insights.evidence.centralNode,
        text: fillOpenSna(copy.insights.centralNode, { node: node.id, value: number(node.value) }),
      };
    }
    case "predictability": {
      const node = topNode(result.nodes, "predictability");
      if (!node) return insight;
      return {
        title: copy.insights.titles.predictability,
        evidence: copy.insights.evidence.predictability,
        text: fillOpenSna(copy.insights.predictability, { node: node.id, value: number(node.value) }),
      };
    }
    case "bridge-node": {
      const node = topNode(result.nodes, "bridgeStrength");
      if (!node) return insight;
      return {
        title: copy.insights.titles.bridgeNode,
        evidence: copy.insights.evidence.bridgeNode,
        text: fillOpenSna(copy.insights.bridgeNode, { node: node.id }),
      };
    }
    case "bridge-node-limited":
      return {
        title: copy.insights.titles.bridgeLimited,
        evidence: copy.insights.evidence.bridgeLimited,
        text: copy.insights.bridgeLimited,
      };
    case "subgroup-comparison": {
      const detected = result.subgroupComparison.networkStructurePValue < 0.05;
      return {
        title: copy.insights.titles.subgroup,
        evidence: copy.insights.evidence.subgroup,
        text: fillOpenSna(detected ? copy.insights.subgroupDetected : copy.insights.subgroupNotDetected, {
          p: number(result.subgroupComparison.networkStructurePValue),
        }),
      };
    }
    default: {
      const exhaustive: never = insight.id;
      return exhaustive;
    }
  }
}

export function presentOpenSnaCaution(copy: OpenSnaCopy, caution: string, thirdPartyAiUsed: boolean) {
  if (thirdPartyAiUsed) return caution;
  return localizeOpenSnaKnownPhrase(copy, caution);
}
