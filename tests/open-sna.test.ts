import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import sitemap from "../app/sitemap";
import { isOpenSnaResult, matchesOpenSnaRequest, type OpenSnaResult } from "../lib/open-sna";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));

function fromRoot(...segments: string[]) {
  return path.join(repositoryRoot, ...segments);
}

function read(relativePath: string) {
  return readFileSync(fromRoot(relativePath), "utf8");
}

test("Open SNA is a localized route placed between Mission and News", () => {
  assert.ok(existsSync(fromRoot("app/[locale]/open-sna/page.tsx")));
  assert.match(read("app/[locale]/open-sna/page.tsx"), /absoluteUrl\("\/en\/open-sna"\)/);
  const header = read("components/Header.tsx");
  const mission = header.indexOf("/${locale}/mission");
  const openSna = header.indexOf("/${locale}/open-sna");
  const news = header.indexOf("/${locale}/news");
  assert.ok(mission >= 0 && openSna > mission && news > openSna);
  assert.match(header, /dictionary\.nav\.openSna/);
  const urls = sitemap().map((entry) => entry.url);
  assert.ok(urls.includes("https://www.sna.hk/en/open-sna"));
  assert.ok(!urls.includes("https://www.sna.hk/zh-hant/open-sna"));
  assert.ok(!urls.includes("https://www.sna.hk/zh-hans/open-sna"));
});

test("the English Open SNA workbench exposes the eight requested analysis areas", () => {
  const workbench = read("components/open-sna/OpenSnaWorkbench.tsx");
  const expectedLabels = [
    "Data Overview",
    "Network Visualization",
    "Centrality Analysis",
    "Bridge Node Analysis",
    "Predictability Analysis",
    "Subgroup Comparison (NCT)",
    "Stability Analysis",
    "AI Interpretation",
  ];
  for (const label of expectedLabels) assert.ok(workbench.includes(label), `${label} is required`);
  assert.match(workbench, /role="tablist"/);
  assert.match(workbench, /role="tab"/);
  assert.match(workbench, /role="tabpanel"/);
  assert.match(workbench, /accept="\.xlsx"/);
  assert.match(workbench, /lang="en"/);
  assert.match(workbench, /required valid two-level Gender or metadata column with at least 20 analyzed rows per group/i);
  assert.doesNotMatch(workbench, /No binary subgroup column was detected|NCT unavailable/);
});

test("the Open SNA upload UI shows the complete English Public Beta notice", () => {
  const workbench = read("components/open-sna/OpenSnaWorkbench.tsx");
  assert.ok(
    workbench.indexOf("Public Beta") < workbench.indexOf('id="open-sna-setup-controls"'),
    "the Public Beta notice must remain visible outside the mobile-collapsed setup controls",
  );
  assert.match(workbench, /Public Beta/);
  assert.match(workbench, /one analysis at a time/i);
  assert.match(workbench, /second concurrent request may return WORKER_BUSY/i);
  assert.match(workbench, /large[^.]*1,000[^.]*bootstrap[^.]*may time out/i);
  assert.match(workbench, /uploaded workbooks and row-level data are not retained/i);
  assert.match(workbench, /no high-availability or availability commitment/i);
});

test("the Open SNA workbench uses bounded response decoding and never displays caught exception text", () => {
  const workbench = read("components/open-sna/OpenSnaWorkbench.tsx");
  const analysisPath = workbench.slice(
    workbench.indexOf("async function analyzeWorkbook"),
    workbench.indexOf("function handleTabKeyboard"),
  );
  assert.match(analysisPath, /decodeOpenSnaAnalysisResponse/);
  assert.doesNotMatch(analysisPath, /await response\.json\(\)/);
  assert.doesNotMatch(analysisPath, /caught instanceof Error\s*\?\s*caught\.message/);
  assert.match(analysisPath, /catch\s*\{[\s\S]*setError\(OPEN_SNA_GENERIC_ANALYSIS_ERROR_MESSAGE\)/);
});

test("the Open SNA interface provides accessible interactive exploration", () => {
  const workbench = read("components/open-sna/OpenSnaWorkbench.tsx");
  const graph = read("components/open-sna/NetworkGraph.tsx");
  assert.match(workbench, /onDrop={handleWorkbookDrop}/);
  assert.match(workbench, /type="search"/);
  assert.match(workbench, /aria-sort=/);
  assert.match(workbench, /#analysis-/);
  assert.match(workbench, /aria-busy=/);
  assert.match(graph, /type="range"/);
  assert.match(graph, /aria-pressed=/);
  assert.match(graph, /onKeyDown=/);
  assert.match(graph, /Zoom in/);
  assert.match(graph, /Node inspector/);
});

test("the Open SNA R engine uses one reproducible NPN EBICglasso profile", () => {
  const engine = read("analysis/open-sna/analyze.R");
  assert.match(engine, /huge\.npn/);
  assert.match(engine, /EBICglasso/);
  assert.match(engine, /gamma\s*=\s*0\.5|gamma\s*<-\s*0\.5/);
  assert.match(engine, /centrality_auto/);
  assert.match(engine, /networktools::bridge|bridge\(/);
  assert.match(engine, /mgm\(/);
  assert.match(engine, /bootnet\(/);
  assert.match(engine, /permutation/i);
  assert.match(engine, /discover_item_columns/);
  assert.match(engine, /6 to 40 item columns/);
  assert.match(engine, /gender-1-label/);
  assert.match(engine, /schemaVersion\s*=\s*"1\.1"/);
  assert.match(engine, /groupCounts\s*=\s*prepared\$group_counts/);
  assert.match(engine, /empty_network_metrics\s*<-\s*function/);
  assert.match(engine, /deterministic_circle_layout\s*<-\s*function/);
  assert.match(engine, /empty_network_stability\s*<-\s*function/);
  assert.match(engine, /nct_npn_ebicglasso_estimator\s*<-\s*function/);
  assert.match(engine, /stabilize_npn_correlation\s*<-\s*function/);
  assert.match(engine, /NPN_EBICGLASSO_CONDITIONING_FLOOR_V1\s*<-/);
  assert.match(engine, /npn_ebicglasso_estimate\s*<-\s*function/);
  assert.match(engine, /estimator\s*=\s*nct_npn_ebicglasso_estimator/);
  assert.match(engine, /estimatorArgs\s*=\s*list\(gamma\s*=\s*gamma\)/);
  assert.match(engine, /conditional positive-definite conditioning/);
  assert.match(read("package.json"), /open-sna:r-statistical-release/);
  assert.match(read("package.json"), /release:verify[\s\S]*open-sna:r-statistical-release/);
  assert.match(
    engine,
    /The estimated network contains no nonzero edges; case-dropping centrality stability is not available\./
  );
  assert.doesNotMatch(engine, /available\s*=\s*FALSE/);
  assert.doesNotMatch(engine, /Desktop\/New Programming Resilience/);
  assert.doesNotMatch(engine, /install\.packages\(/);
});

test("the upload adapter is bounded, cleans temporary files, and fails closed on Vercel", () => {
  const route = read("app/api/open-sna/analyze/route.ts");
  assert.match(route, /MAX_UPLOAD_BYTES/);
  assert.match(route, /\.xlsx/i);
  assert.match(route, /PK/);
  assert.match(route, /mkdtemp/);
  assert.match(route, /finally/);
  assert.match(route, /rm\(/);
  assert.match(route, /process\.env\.VERCEL/);
  assert.match(route, /OPEN_SNA_GENDER_1_LABEL/);
  assert.match(route, /OPEN_SNA_GENDER_2_LABEL/);
  assert.match(route, /503/);
  assert.doesNotMatch(route, /shell:\s*true/);
});

test("the production R worker is reproducibly containerized and runs without root privileges", () => {
  const dockerfilePath = fromRoot("Dockerfile.open-sna-worker");
  const lockfilePath = fromRoot("analysis/open-sna/renv.lock");
  assert.ok(existsSync(dockerfilePath), "the Open SNA worker Dockerfile must exist");
  assert.ok(existsSync(lockfilePath), "the complete R dependency lockfile must exist");

  const dockerfile = read("Dockerfile.open-sna-worker");
  assert.match(dockerfile, /rocker\/r-ver:4\.4\.2/);
  assert.match(dockerfile, /renv::restore/);
  assert.match(dockerfile, /USER\s+open-sna/);
  assert.match(dockerfile, /HEALTHCHECK/);
  assert.match(dockerfile, /process\.env\.PORT/);
  assert.match(dockerfile, /npm run build -- --webpack/);
  assert.doesNotMatch(dockerfile, /npm\s+run\s+dev/);
});

test("the Cloud Run release contract fixes worker capacity, concurrency, timeout, and secret handling", () => {
  const cloudBuildPath = fromRoot("cloudbuild.open-sna-worker.yaml");
  const deployScriptPath = fromRoot("scripts/deploy-open-sna-worker-cloud-run.sh");
  assert.ok(existsSync(cloudBuildPath), "the Cloud Build definition must exist");
  assert.ok(existsSync(deployScriptPath), "the Cloud Run deployment script must exist");

  const cloudBuild = read("cloudbuild.open-sna-worker.yaml");
  const deployScript = read("scripts/deploy-open-sna-worker-cloud-run.sh");
  assert.match(cloudBuild, /Dockerfile\.open-sna-worker/);
  assert.match(cloudBuild, /E2_HIGHCPU_8/);
  assert.match(deployScript, /asia-east2/);
  assert.match(deployScript, /--cpu 8/);
  assert.match(deployScript, /--memory 16Gi/);
  assert.match(deployScript, /--concurrency 1/);
  assert.match(deployScript, /--max-instances 1/);
  assert.match(deployScript, /--timeout 300/);
  assert.match(deployScript, /--update-secrets OPEN_SNA_R_WORKER_TOKEN=/);
  assert.doesNotMatch(deployScript, /OPEN_SNA_R_WORKER_TOKEN=[A-Za-z0-9+/]{32,}/);
});

test("the bundled demonstration is aggregate output and matches the public contract", () => {
  const unknownDemo: unknown = JSON.parse(read("public/open-sna/programming-resilience-demo.json"));
  assert.ok(isOpenSnaResult(unknownDemo));
  const demo = unknownDemo as OpenSnaResult;
  assert.equal(demo.schemaVersion, "1.1");
  assert.equal(demo.analysisProfile, "npn-ebicglasso-v1");
  assert.equal(
    demo.settings.correlationMethod,
    "Nonparanormal transformation followed by Pearson correlation with conditional positive-definite conditioning (trigger < 1e-4; symmetric eigenvalue clipping and unit-diagonal renormalization)"
  );
  assert.equal(
    demo.models.network.method,
    "huge.npn plus Pearson correlation, conditional positive-definite conditioning (trigger < 1e-4; symmetric eigenvalue clipping and unit-diagonal renormalization), and qgraph::EBICglasso"
  );
  assert.equal(demo.dataSource, "aggregate-demo");
  assert.equal(demo.source.fileName, "Programming Resilience aggregate reference");
  assert.equal(demo.source.originalRows, 811);
  assert.equal(demo.source.analyzedRows, 811);
  assert.equal(demo.source.droppedRows, 0);
  assert.deepEqual(demo.source.groupCounts, [{ group: "F", n: 403 }, { group: "M", n: 408 }]);
  assert.equal(demo.nodes.length, 16);
  assert.equal(demo.edges.length, 46);
  assert.equal(demo.overview.meanPredictability, 0.422312);
  assert.equal(demo.settings.bootstrapReplicates, 1000);
  assert.equal(demo.settings.nctPermutations, 1000);
  assert.equal(demo.subgroupComparison.available, true);
  assert.equal(
    demo.subgroupComparison.method,
    "NetworkComparisonTest::NCT permutation test using NPN EBICglasso with conditional positive-definite conditioning (trigger < 1e-4; symmetric eigenvalue clipping and unit-diagonal renormalization)"
  );
  assert.equal(demo.subgroupComparison.packageVersion, "2.2.3");
  assert.equal(demo.subgroupComparison.permutations, 1000);
  assert.deepEqual(
    demo.stability.metrics.map(({ id, coefficient, interpretation }) => ({ id, coefficient, interpretation })),
    [
      { id: "strength", coefficient: 0.67201, interpretation: "Desirable" },
      { id: "bridgeStrength", coefficient: 0.749692, interpretation: "Desirable" },
      { id: "bridgeCloseness", coefficient: 0.205919, interpretation: "Do not interpret" },
      { id: "bridgeBetweenness", coefficient: 0, interpretation: "Do not interpret" },
    ]
  );
  assert.deepEqual(demo.warnings, []);
  assert.deepEqual(demo.interpretation.cautions, [
    "Edges are regularized partial correlations and do not establish causal direction.",
    "Centrality and bridge rankings should be interpreted only when their stability is adequate.",
    "Subgroup permutation tests depend on the selected model, grouping variable, and resampling count.",
    "Review the workbook schema, missing-data exclusions, and method settings before publication.",
  ]);
  assert.equal(demo.privacy.rawRowsIncluded, false);
  assert.equal(demo.privacy.thirdPartyAiUsed, false);
  assert.ok(!("records" in demo));
  assert.ok(!("rawData" in demo));

  const uploaded = structuredClone(demo);
  uploaded.dataSource = "uploaded-workbook";
  assert.equal(matchesOpenSnaRequest(uploaded, "1000", "1000"), true);
  assert.equal(matchesOpenSnaRequest(uploaded, "500", "1000"), false);
  assert.equal(matchesOpenSnaRequest(demo, "1000", "1000"), false);
});

test("the Open SNA 1.1 validator enforces the mandatory two-group NCT contract", () => {
  const unknownDemo: unknown = JSON.parse(read("public/open-sna/programming-resilience-demo.json"));
  assert.ok(isOpenSnaResult(unknownDemo));
  const demo = unknownDemo as OpenSnaResult;

  const mutationCases: Array<{ name: string; mutate: (result: OpenSnaResult) => void }> = [
    {
      name: "legacy schema outside the remote adapter",
      mutate: (result) => { Object.assign(result, { schemaVersion: "1.0" }); },
    },
    {
      name: "null group column",
      mutate: (result) => { Object.assign(result.source, { groupColumn: null }); },
    },
    {
      name: "zero group counts",
      mutate: (result) => { Object.assign(result.source, { groupCounts: [] }); },
    },
    {
      name: "one group count",
      mutate: (result) => { Object.assign(result.source, { groupCounts: [result.source.groupCounts[0]] }); },
    },
    {
      name: "three group counts",
      mutate: (result) => {
        Object.assign(result.source, {
          groupCounts: [...result.source.groupCounts, { group: "Other", n: 20 }],
        });
      },
    },
    {
      name: "duplicate group labels",
      mutate: (result) => {
        Object.assign(result.source, {
          groupCounts: [
            result.source.groupCounts[0],
            { ...result.source.groupCounts[1], group: result.source.groupCounts[0].group },
          ],
        });
      },
    },
    {
      name: "unsafe group label",
      mutate: (result) => {
        Object.assign(result.source, {
          groupCounts: [{ ...result.source.groupCounts[0], group: "<group>" }, result.source.groupCounts[1]],
        });
      },
    },
    {
      name: "group below the minimum analyzed size",
      mutate: (result) => {
        Object.assign(result.source, {
          groupCounts: [
            { ...result.source.groupCounts[0], n: 19 },
            { ...result.source.groupCounts[1], n: result.source.analyzedRows - 19 },
          ],
        });
      },
    },
    {
      name: "group counts that do not sum to analyzed rows",
      mutate: (result) => {
        Object.assign(result.source.groupCounts[0], { n: result.source.groupCounts[0].n + 1 });
      },
    },
    {
      name: "unavailable subgroup comparison",
      mutate: (result) => {
        Object.assign(result, { subgroupComparison: { available: false, reason: "missing" } });
      },
    },
    {
      name: "comparison group column mismatch",
      mutate: (result) => { Object.assign(result.subgroupComparison, { groupColumn: "Cohort" }); },
    },
    {
      name: "comparison group label mismatch",
      mutate: (result) => { Object.assign(result.subgroupComparison, { groupA: "Other" }); },
    },
    {
      name: "comparison sample count mismatch",
      mutate: (result) => { Object.assign(result.subgroupComparison, { nA: result.subgroupComparison.nA + 1 }); },
    },
    {
      name: "comparison permutation mismatch",
      mutate: (result) => { Object.assign(result.subgroupComparison, { permutations: 999 }); },
    },
    {
      name: "global-strength p-value outside probability range",
      mutate: (result) => { Object.assign(result.subgroupComparison, { globalStrengthPValue: 1.01 }); },
    },
    {
      name: "negative absolute network-structure difference",
      mutate: (result) => { Object.assign(result.subgroupComparison, { networkStructureDifference: -0.01 }); },
    },
    {
      name: "edge difference with an unknown node",
      mutate: (result) => {
        Object.assign(result.subgroupComparison.strongestEdgeDifferences[0], { source: "Unknown99" });
      },
    },
    {
      name: "self-referencing edge difference",
      mutate: (result) => {
        const edge = result.subgroupComparison.strongestEdgeDifferences[0];
        Object.assign(edge, { target: edge.source });
      },
    },
    {
      name: "duplicate subgroup edge difference",
      mutate: (result) => {
        const edge = result.subgroupComparison.strongestEdgeDifferences[0];
        result.subgroupComparison.strongestEdgeDifferences.push({ ...edge });
      },
    },
    {
      name: "Holm p-value outside probability range",
      mutate: (result) => {
        Object.assign(result.subgroupComparison.strongestEdgeDifferences[0], { pValueHolm: -0.01 });
      },
    },
  ];

  for (const { name, mutate } of mutationCases) {
    const invalid = structuredClone(demo);
    mutate(invalid);
    assert.equal(isOpenSnaResult(invalid), false, name);
  }
});

test("the Open SNA validator rejects unknown aggregate fields at every schema boundary", () => {
  const demo = JSON.parse(read("public/open-sna/programming-resilience-demo.json")) as OpenSnaResult;
  const mutations: Array<{ name: string; mutate: (result: OpenSnaResult) => void }> = [
    { name: "top-level rawData", mutate: (result) => Object.assign(result, { rawData: [{ respondentId: "private-row" }] }) },
    { name: "top-level records", mutate: (result) => Object.assign(result, { records: [] }) },
    { name: "source unknown", mutate: (result) => Object.assign(result.source, { unexpected: true }) },
    { name: "settings unknown", mutate: (result) => Object.assign(result.settings, { unexpected: true }) },
    { name: "network model unknown", mutate: (result) => Object.assign(result.models.network, { unexpected: true }) },
    { name: "predictability model unknown", mutate: (result) => Object.assign(result.models.predictability, { unexpected: true }) },
    { name: "runtime unknown", mutate: (result) => Object.assign(result.runtime, { unexpected: true }) },
    { name: "overview unknown", mutate: (result) => Object.assign(result.overview, { unexpected: true }) },
    { name: "strongest edge unknown", mutate: (result) => Object.assign(result.overview.strongestEdge!, { unexpected: true }) },
    { name: "node unknown", mutate: (result) => Object.assign(result.nodes[0], { unexpected: true }) },
    { name: "edge unknown", mutate: (result) => Object.assign(result.edges[0], { unexpected: true }) },
    { name: "subgroup unknown", mutate: (result) => Object.assign(result.subgroupComparison, { unexpected: true }) },
    { name: "subgroup edge unknown", mutate: (result) => Object.assign(result.subgroupComparison.strongestEdgeDifferences[0], { unexpected: true }) },
    { name: "stability unknown", mutate: (result) => Object.assign(result.stability, { unexpected: true }) },
    { name: "stability metric unknown", mutate: (result) => Object.assign(result.stability.metrics[0], { unexpected: true }) },
    { name: "interpretation unknown", mutate: (result) => Object.assign(result.interpretation, { unexpected: true }) },
    { name: "insight unknown", mutate: (result) => Object.assign(result.interpretation.insights[0], { unexpected: true }) },
    { name: "privacy unknown", mutate: (result) => Object.assign(result.privacy, { unexpected: true }) },
  ];
  for (const { name, mutate } of mutations) {
    const invalid = structuredClone(demo);
    mutate(invalid);
    assert.equal(isOpenSnaResult(invalid), false, name);
  }

  const packageExtended = structuredClone(demo);
  packageExtended.runtime.packages.extraRuntimePackage = "1.0.0";
  assert.equal(isOpenSnaResult(packageExtended), true, "runtime package names remain dynamic");
});
