import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import type { OpenSnaResult } from "../lib/open-sna";
import { isOpenSnaResult } from "../lib/open-sna";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const aiModulePath = "../lib/open-sna-ai";

type AiModule = {
  LUNA_MODEL: string;
  buildOpenSnaInterpretationInput: (result: OpenSnaResult) => unknown;
  withLunaInterpretation: (
    result: OpenSnaResult,
    options?: {
      apiKey?: string;
      fetchImpl?: typeof fetch;
      timeoutMs?: number;
      siteUrl?: string;
    },
  ) => Promise<{
    result: OpenSnaResult;
    status: "generated" | "not-configured" | "unavailable";
  }>;
};

async function loadAiModule() {
  try {
    return (await import(aiModulePath)) as AiModule;
  } catch {
    return null;
  }
}

function demoResult() {
  const text = readFileSync(
    `${repositoryRoot}/public/open-sna/programming-resilience-demo.json`,
    "utf8",
  );
  const result: unknown = JSON.parse(text);
  assert.ok(isOpenSnaResult(result));
  return structuredClone(result);
}

function structuredInterpretation() {
  return {
    insights: [
      { id: "network-structure", title: "Network structure", text: "Aggregate network summary.", evidence: "Overview" },
      { id: "centrality", title: "Centrality", text: "Stable strength summary.", evidence: "Centrality and stability" },
      { id: "bridge", title: "Bridge evidence", text: "Bridge-strength summary.", evidence: "Bridge nodes and stability" },
      { id: "predictability", title: "Predictability", text: "Node-level aggregate summary.", evidence: "Predictability" },
      { id: "subgroup-comparison", title: "Subgroup comparison", text: "Permutation-test summary.", evidence: "NCT" },
    ],
    cautions: [
      "Edges are regularized associations, not causal effects.",
      "Unstable centrality metrics must not be interpreted.",
      "Subgroup tests do not prove the networks are identical.",
      "Results depend on the declared network boundary and preprocessing.",
      "The interpretation uses aggregate statistics and needs domain review.",
    ],
  };
}

test("the LUNA integration module exposes the aggregate-only interpretation boundary", async () => {
  const ai = await loadAiModule();
  assert.ok(ai, "lib/open-sna-ai.ts must implement the LUNA interpretation boundary");

  const result = demoResult();
  result.inputFingerprint = `sha256:${"a".repeat(64)}`;
  result.source.fileName = "private-participant-workbook.xlsx";
  result.source.sheet = "private-sheet-name";
  result.overview.strongestEdge = {
    source: `untrusted-${"x".repeat(1_000)}`,
    target: "Cmt2",
    weight: 0.5,
  };
  result.stability.metrics[0].metric = `strength-${"y".repeat(1_000)}`;
  const input = ai.buildOpenSnaInterpretationInput(result);
  const serialized = JSON.stringify(input);
  const aggregateInput = input as {
    contract: { schemaVersion: string };
    subgroupComparison: { available: boolean; groups: Array<{ group: string; n: number }>; reason?: string };
  };

  assert.doesNotMatch(serialized, /private-participant-workbook/i);
  assert.doesNotMatch(serialized, /private-sheet-name/i);
  assert.doesNotMatch(serialized, /sha256:/i);
  assert.doesNotMatch(serialized, /rVersion|packages|rawRows|records|rawData/i);
  assert.match(serialized, /analyzedRows/);
  assert.match(serialized, /stability/);
  assert.match(serialized, /subgroupComparison/);
  assert.doesNotMatch(serialized, /x{401}|y{401}/);
  assert.equal(aggregateInput.contract.schemaVersion, "1.1");
  assert.equal(aggregateInput.subgroupComparison.available, true);
  assert.equal(aggregateInput.subgroupComparison.groups.length, 2);
  assert.equal(aggregateInput.subgroupComparison.reason, undefined);
});

test("LUNA is called through OpenRouter with strict structured output and zero data retention", async () => {
  const ai = await loadAiModule();
  assert.ok(ai, "lib/open-sna-ai.ts must implement the LUNA interpretation boundary");
  assert.equal(ai.LUNA_MODEL, "openai/gpt-5.6-luna");

  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  const fetchImpl: typeof fetch = async (input, init) => {
    capturedUrl = String(input);
    capturedInit = init;
    return new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify(structuredInterpretation()) } }],
    }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  const outcome = await ai.withLunaInterpretation(demoResult(), {
    apiKey: "test-openrouter-key",
    fetchImpl,
    timeoutMs: 1_000,
    siteUrl: "https://www.sna.hk",
  });

  assert.equal(outcome.status, "generated");
  assert.equal(capturedUrl, "https://openrouter.ai/api/v1/chat/completions");
  assert.ok(capturedInit);
  assert.equal(capturedInit.method, "POST");
  const headers = new Headers(capturedInit.headers);
  assert.equal(headers.get("authorization"), "Bearer test-openrouter-key");
  assert.equal(headers.get("http-referer"), "https://www.sna.hk");
  assert.equal(headers.get("x-title"), "SNA.HK Open SNA");

  const body = JSON.parse(String(capturedInit.body));
  assert.equal(body.model, "openai/gpt-5.6-luna");
  assert.equal(body.provider.require_parameters, true);
  assert.equal(body.provider.data_collection, "deny");
  assert.equal(body.provider.zdr, true);
  assert.equal(body.response_format.type, "json_schema");
  assert.equal(body.response_format.json_schema.strict, true);
  assert.equal(body.response_format.json_schema.schema.additionalProperties, false);
  assert.match(body.messages[0].content, /untrusted statistical data/i);
  assert.doesNotMatch(body.messages[1].content, /Programming Resilience aggregate reference|Data worksheet|sha256:/i);

  assert.equal(outcome.result.interpretation.thirdPartyAiUsed, true);
  assert.equal(outcome.result.interpretation.generator, "GPT-5.6 Luna via OpenRouter");
  assert.equal(outcome.result.interpretation.insights.length, 5);
  assert.equal(outcome.result.interpretation.cautions.length, 5);
  assert.equal(outcome.result.privacy.thirdPartyAiUsed, true);
  assert.ok(isOpenSnaResult(outcome.result));
});

test("a missing or invalid LUNA response keeps the deterministic R interpretation and labels the fallback", async () => {
  const ai = await loadAiModule();
  assert.ok(ai, "lib/open-sna-ai.ts must implement the LUNA interpretation boundary");
  const original = demoResult();

  let called = false;
  const missing = await ai.withLunaInterpretation(original, {
    fetchImpl: async () => {
      called = true;
      throw new Error("must not be called");
    },
  });
  assert.equal(missing.status, "not-configured");
  assert.equal(called, false);
  assert.equal(missing.result.interpretation.thirdPartyAiUsed, false);
  assert.ok(missing.result.warnings.some((warning) => /LUNA.*not configured/i.test(warning)));

  const invalid = await ai.withLunaInterpretation(original, {
    apiKey: "test-openrouter-key",
    fetchImpl: async () => new Response(JSON.stringify({
      choices: [{ message: { content: "not-json" } }],
    }), { status: 200 }),
    timeoutMs: 1_000,
  });
  assert.equal(invalid.status, "unavailable");
  assert.equal(invalid.result.interpretation.thirdPartyAiUsed, false);
  assert.equal(invalid.result.privacy.thirdPartyAiUsed, false);
  assert.ok(invalid.result.warnings.some((warning) => /LUNA.*unavailable/i.test(warning)));
  assert.ok(isOpenSnaResult(invalid.result));
});

test("the Open SNA upload route and interface are wired to the server-only LUNA integration", () => {
  const route = readFileSync(`${repositoryRoot}/app/api/open-sna/analyze/route.ts`, "utf8");
  const workbench = readFileSync(`${repositoryRoot}/components/open-sna/OpenSnaWorkbench.tsx`, "utf8");
  const interpretationPanel = workbench.slice(
    workbench.indexOf("function InterpretationPanel"),
    workbench.indexOf("function ActivePanel"),
  );
  const envExample = readFileSync(`${repositoryRoot}/.env.example`, "utf8");

  assert.match(route, /withLunaInterpretation/);
  assert.ok((route.match(/withLunaInterpretation\(/g) ?? []).length >= 2);
  assert.match(workbench, /GPT-5\.6 Luna/);
  assert.match(workbench, /aggregate statistics only/i);
  assert.match(interpretationPanel, /result\.dataSource === "aggregate-demo"/);
  assert.match(interpretationPanel, /precomputed reference/i);
  assert.doesNotMatch(workbench, /No third-party AI used/);
  assert.match(envExample, /^OPENROUTER_API_KEY=$/m);
  assert.doesNotMatch(envExample, /NEXT_PUBLIC_(?:OPENROUTER|LUNA)/);
});
