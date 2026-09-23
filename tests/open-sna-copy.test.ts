import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { locales } from "../lib/i18n";
import { isOpenSnaResult } from "../lib/open-sna";
import {
  fillOpenSna,
  getOpenSnaCopy,
  localizeOpenSnaKnownPhrase,
  OPEN_SNA_KNOWN_PHRASES,
  presentOpenSnaInsight,
} from "../lib/open-sna-copy";
import { openSnaAnalysisErrorMessage } from "../lib/open-sna-errors";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const demo = JSON.parse(readFileSync(`${repositoryRoot}/public/open-sna/programming-resilience-demo.json`, "utf8"));

function templateTokens(value: unknown, path: string, found: Map<string, string>) {
  if (typeof value === "string") {
    const tokens = [...value.matchAll(/\{([A-Za-z0-9]+)\}/g)].map((match) => match[1]).sort().join(",");
    if (tokens) found.set(path, tokens);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => templateTokens(item, `${path}[${index}]`, found));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) templateTokens(child, `${path}.${key}`, found);
  }
}

test("Open SNA copy catalogs share keys, template tokens, and non-empty strings", () => {
  const english = getOpenSnaCopy("en");
  const englishTokens = new Map<string, string>();
  templateTokens(english, "copy", englishTokens);
  for (const locale of locales) {
    const copy = getOpenSnaCopy(locale);
    const tokens = new Map<string, string>();
    templateTokens(copy, "copy", tokens);
    assert.deepEqual([...tokens.keys()].sort(), [...englishTokens.keys()].sort(), locale);
    for (const [path, expected] of englishTokens) assert.equal(tokens.get(path), expected, `${locale} ${path}`);
    const flat = JSON.stringify(copy);
    assert.doesNotMatch(flat, /""/);
  }
});

test("Chinese Open SNA analysis panels differ from English and use Han script", () => {
  const english = getOpenSnaCopy("en");
  for (const locale of ["zh-hant", "zh-hans"] as const) {
    const copy = getOpenSnaCopy(locale);
    for (const id of Object.keys(english.panels) as Array<keyof typeof english.panels>) {
      assert.notEqual(copy.panels[id].label, english.panels[id].label, `${locale} ${id}`);
      assert.match(copy.panels[id].label, /\p{Script=Han}/u, `${locale} ${id}`);
      assert.match(copy.panels[id].summary, /\p{Script=Han}/u);
    }
    assert.match(copy.errors.generic, /\p{Script=Han}/u);
    assert.match(copy.setup.help, /Gender/);
    assert.match(copy.setup.help, /listwise deletion/);
    assert.notEqual(copy.errors.referenceLoad, english.errors.referenceLoad);
  }
  assert.notEqual(getOpenSnaCopy("zh-hant").panels.overview.label, getOpenSnaCopy("zh-hans").panels.overview.label);
});

test("deterministic English insights stay aligned with the reference result", () => {
  assert.equal(isOpenSnaResult(demo), true);
  if (!isOpenSnaResult(demo)) return;
  const copy = getOpenSnaCopy("en");
  for (const insight of demo.interpretation.insights) {
    const presented = presentOpenSnaInsight(copy, demo, insight);
    assert.equal(presented.title, insight.title, insight.id);
    assert.equal(presented.text, insight.text, insight.id);
    assert.equal(presented.evidence, insight.evidence, insight.id);
  }
});

test("deterministic Chinese insights keep the reference evidence and translate the prose", () => {
  assert.equal(isOpenSnaResult(demo), true);
  if (!isOpenSnaResult(demo)) return;
  for (const locale of ["zh-hant", "zh-hans"] as const) {
    const copy = getOpenSnaCopy(locale);
    const structure = presentOpenSnaInsight(copy, demo, demo.interpretation.insights[0]);
    assert.match(structure.text, /46/);
    assert.match(structure.text, /120/);
    assert.match(structure.text, /0\.383/);
    assert.match(structure.text, /\p{Script=Han}/u);
    assert.notEqual(structure.text, demo.interpretation.insights[0].text);
    const central = presentOpenSnaInsight(copy, demo, demo.interpretation.insights[1]);
    assert.match(central.text, /Cnf2/);
    assert.match(central.text, /0\.973/);
  }
});

test("known engine phrases and public analysis errors localize without dropping codes", () => {
  const traditional = getOpenSnaCopy("zh-hant");
  assert.equal(localizeOpenSnaKnownPhrase(traditional, OPEN_SNA_KNOWN_PHRASES.listwiseDeletion), traditional.known.listwiseDeletion);
  assert.equal(localizeOpenSnaKnownPhrase(traditional, "unrecognized engine diagnostic"), "unrecognized engine diagnostic");
  assert.equal(
    localizeOpenSnaKnownPhrase(traditional, "Runtime warning: estimator returned NA"),
    fillOpenSna(traditional.known.runtimeWarning, { detail: "estimator returned NA" }),
  );

  const cases = [
    [429, "WORKER_BUSY"],
    [502, "R_ENGINE_UNAVAILABLE"],
    [422, "WORKBOOK_INVALID"],
    [404, "JOB_NOT_FOUND"],
  ] as const;
  for (const locale of ["zh-hant", "zh-hans"] as const) {
    for (const [status, code] of cases) {
      const message = openSnaAnalysisErrorMessage(status, { code }, locale);
      assert.match(message, new RegExp(code));
      assert.match(message, /\p{Script=Han}/u);
      assert.notEqual(message, openSnaAnalysisErrorMessage(status, { code }));
      assert.ok(message.length <= 240);
    }
  }
});
