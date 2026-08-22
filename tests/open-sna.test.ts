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
  assert.equal(demo.schemaVersion, "1.0");
  assert.equal(demo.analysisProfile, "npn-ebicglasso-v1");
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
  if (demo.subgroupComparison.available) {
    assert.equal(demo.subgroupComparison.packageVersion, "2.2.3");
    assert.equal(demo.subgroupComparison.permutations, 1000);
  }
  assert.deepEqual(
    demo.stability.metrics.map(({ id, coefficient, interpretation }) => ({ id, coefficient, interpretation })),
    [
      { id: "strength", coefficient: 0.67201, interpretation: "Desirable" },
      { id: "bridgeStrength", coefficient: 0.749692, interpretation: "Desirable" },
      { id: "bridgeCloseness", coefficient: 0.205919, interpretation: "Do not interpret" },
      { id: "bridgeBetweenness", coefficient: 0, interpretation: "Do not interpret" },
    ]
  );
  assert.equal(demo.warnings.length, 1);
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
