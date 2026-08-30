# Open SNA Reliability, Async Jobs, and Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Open SNA handle a 40-item empty network correctly, require and prevalidate a binary subgroup, run uploaded analyses as recoverable asynchronous jobs, fully localize the workbench in Traditional and Simplified Chinese, and present LUNA as an optional enhancement.

**Architecture:** Adopt the existing schema `1.1` subgroup candidate, make the R engine explicitly support an all-zero network, and split upload validation from analysis execution. All uploaded runs become jobs: local development uses an isolated filesystem store and one in-process runner, while production uses Cloud Storage plus Cloud Tasks behind the authenticated Cloud Run worker. The server page supplies one strongly typed Open SNA copy dictionary to smaller client components; optional LUNA finalization runs once through Vercel and is persisted as aggregate output.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.8, Node test runner through `tsx`, R 4.4.2 with pinned `renv`, Google Cloud Run, Cloud Tasks, Cloud Storage, `@google-cloud/storage@8.0.1`, `@google-cloud/tasks@7.0.0`, and `google-auth-library@11.0.2`.

---

## Execution rules

- Work only on `codex/open-sna-reliability-i18n` in `/Volumes/Starship/SNA`.
- Preserve the untracked `OPEN_SNA_HUMAN_QA_REPORT_2026-08-23.md`; never stage it implicitly.
- Do not touch the two linked cleanup worktrees.
- Use `git add -- <exact paths>` for every commit; never use broad staging.
- Do not push, merge, deploy, or change production secrets without separate authorization.
- Keep local, committed, pushed, deployed, and production-verified states distinct in every handoff.
- Write the focused failing test before each production behavior change and observe the intended failure.
- Use synthetic fixtures only. Never place real respondent rows, secrets, raw R diagnostics, or private file names in tests, logs, screenshots, or commits.

## Planned file structure

### Existing files to modify

- `analysis/open-sna/analyze.R` — validation-only mode, schema `1.1`, explicit empty-network semantics.
- `analysis/open-sna/README.md` — required subgroup, validation, async result and retention contract.
- `analysis/open-sna/WORKER_DEPLOYMENT.md` — Cloud Tasks/Storage architecture and release gates.
- `app/[locale]/open-sna/page.tsx` — localized metadata, language, copy injection.
- `app/api/open-sna/analyze/route.ts` — shared helpers during migration, then bounded deprecation response.
- `app/sitemap.ts` — all three localized Open SNA routes.
- `components/open-sna/OpenSnaWorkbench.tsx` — orchestration only after component split.
- `components/open-sna/NetworkGraph.tsx` — localized graph controls and ARIA text.
- `lib/open-sna.ts` — strict schema `1.1` result contract.
- `lib/open-sna-ai.ts` — requested output locale and deterministic fallback warning keys.
- `public/open-sna/programming-resilience-demo.json` — schema `1.1` reference.
- `tests/fixtures/fake-open-sna-rscript.mjs` — deterministic validation/analysis success modes.
- `tests/open-sna.test.ts` — result, localization, route, deployment, and static UI contract.
- `tests/open-sna-route.test.ts` — validation, jobs, proxy, cleanup, and result retrieval.
- `tests/open-sna-ai.test.ts` — requested language and single-writer finalization.
- `.env.example` — job infrastructure configuration names without values.
- `Dockerfile.open-sna-worker` — production dependencies and health endpoint.
- `scripts/deploy-open-sna-worker-cloud-run.sh` — queue, bucket, IAM, runtime limits.
- `package.json` and `package-lock.json` — scripts and Google Cloud dependencies.
- `README.md` — public contract and verification commands.

### Files to create

- `tests/fixtures/open-sna-empty-network-80x40.xlsx` — verified synthetic regression fixture.
- `analysis/open-sna/tests/empty-network-regression.R` — full real-R regression.
- `lib/open-sna-workbook-validation.ts` — upload envelope and safe validation contract.
- `app/api/open-sna/validate/route.ts` — public/local validation endpoint.
- `lib/open-sna-job-contract.ts` — job IDs, states, public responses, and validators.
- `lib/open-sna-job-store.ts` — store interface, local store, and Cloud Storage store.
- `lib/open-sna-job-queue.ts` — local queue and Cloud Tasks queue.
- `lib/open-sna-runner.ts` — R process execution and terminal cleanup.
- `lib/open-sna-job-service.ts` — idempotent create, claim, run, status, and result operations.
- `lib/open-sna-job-client.ts` — polling/backoff and bounded browser recovery storage helpers.
- `lib/open-sna-copy.ts` — complete English, Traditional Chinese, and Simplified Chinese copy.
- `app/api/open-sna/jobs/route.ts` — create job.
- `app/api/open-sna/jobs/[jobId]/route.ts` — get status.
- `app/api/open-sna/jobs/[jobId]/result/route.ts` — retrieve/finalize result.
- `app/api/open-sna/internal/jobs/[jobId]/run/route.ts` — OIDC-authenticated task runner.
- `components/open-sna/OpenSnaSetup.tsx` — file validation and job submission.
- `components/open-sna/OpenSnaJobStatus.tsx` — task ID, polling, reconnect, recovery.
- `components/open-sna/OpenSnaResults.tsx` — eight-panel result UI.
- `tests/open-sna-validation.test.ts` — validation contract tests.
- `tests/open-sna-job-contract.test.ts` — pure job contract tests.
- `tests/open-sna-job-store.test.ts` — local/abstract store state tests.
- `tests/open-sna-job-service.test.ts` — idempotency, leases, cleanup, finalization.
- `tests/open-sna-copy.test.ts` — dictionary parity and locale-specific text.
- `analysis/open-sna/gcs-lifecycle.json` — one-day deletion lifecycle policy.

## Task 1: Integrate and prove the approved schema 1.1 subgroup candidate

**Files:**

- Modify by cherry-pick: `README.md`
- Modify by cherry-pick: `analysis/open-sna/README.md`
- Modify by cherry-pick: `analysis/open-sna/WORKER_DEPLOYMENT.md`
- Modify by cherry-pick: `analysis/open-sna/analyze.R`
- Modify by cherry-pick: `app/api/open-sna/analyze/route.ts`
- Modify by cherry-pick: `components/open-sna/OpenSnaWorkbench.tsx`
- Modify by cherry-pick: `lib/open-sna-ai.ts`
- Modify by cherry-pick: `lib/open-sna.ts`
- Modify by cherry-pick: `public/open-sna/programming-resilience-demo.json`
- Modify by cherry-pick: `tests/open-sna-ai.test.ts`
- Modify by cherry-pick: `tests/open-sna-route.test.ts`
- Modify by cherry-pick: `tests/open-sna.test.ts`

- [ ] **Step 1: Reconfirm the protected working state**

Run:

```bash
git status --short --branch
git rev-parse HEAD origin/main
git worktree list --porcelain
```

Expected: branch `codex/open-sna-reliability-i18n`; HEAD contains `cef37fe`; the only untracked root file is the QA report; other worktrees remain separate.

- [ ] **Step 2: Review the candidate commit against the approved subgroup rules**

Run:

```bash
git show --check --stat 8120a4de98e597202e8efc73bf06db3c520428f5
git diff 378536f65fc8a63b6a6a8f070a857bcb77360398..8120a4de98e597202e8efc73bf06db3c520428f5 -- analysis/open-sna/analyze.R lib/open-sna.ts app/api/open-sna/analyze/route.ts tests/open-sna.test.ts tests/open-sna-route.test.ts
```

Expected: schema `1.1`; required two-group result; invalid `Gender` fails closed; no source row or secret handling change.

- [ ] **Step 3: Cherry-pick the exact candidate commit**

Run:

```bash
git cherry-pick 8120a4de98e597202e8efc73bf06db3c520428f5
```

Expected: one clean cherry-pick commit; the untracked QA report is untouched.

- [ ] **Step 4: Run focused subgroup and AI contract tests**

Run:

```bash
./node_modules/.bin/tsx --test tests/open-sna.test.ts tests/open-sna-route.test.ts tests/open-sna-ai.test.ts
npm run typecheck
```

Expected: exit 0; every focused test passes; TypeScript accepts schema `1.1`.

- [ ] **Step 5: Record the integration boundary**

Run:

```bash
git status --short --branch
git log -3 --oneline --decorate
```

Expected: no tracked changes after the cherry-pick; QA report remains untracked; no push or deployment.

## Task 2: Add the real 40-item empty-network regression and observe RED

**Files:**

- Create: `tests/fixtures/open-sna-empty-network-80x40.xlsx`
- Create: `analysis/open-sna/tests/empty-network-regression.R`
- Modify: `package.json`
- Test: `analysis/open-sna/tests/empty-network-regression.R`

- [ ] **Step 1: Promote the previously verified synthetic fixture and prove its identity**

Copy only this known synthetic file:

```bash
cp outputs/01a02d78-0f91-7072-83c9-339ed8fe6799/fixtures/valid-max-shape-80x40.xlsx tests/fixtures/open-sna-empty-network-80x40.xlsx
shasum -a 256 tests/fixtures/open-sna-empty-network-80x40.xlsx
```

Expected SHA-256:

```text
57790fb1da4dde5becfb749057ba0b742958a365537cd8ead1cbd4e2f0e469e3
```

- [ ] **Step 2: Write the failing full-pipeline R regression**

Create `analysis/open-sna/tests/empty-network-regression.R` with this structure:

```r
#!/usr/bin/env Rscript

script_argument <- grep("^--file=", commandArgs(trailingOnly = FALSE), value = TRUE)[[1]]
script_path <- normalizePath(sub("^--file=", "", script_argument), mustWork = TRUE)
repository_root <- normalizePath(file.path(dirname(script_path), "..", "..", ".."), mustWork = TRUE)
engine_path <- file.path(repository_root, "analysis", "open-sna", "analyze.R")
fixture_path <- file.path(repository_root, "tests", "fixtures", "open-sna-empty-network-80x40.xlsx")
source(engine_path, local = .GlobalEnv)

run_analysis <- function() {
  output_path <- tempfile(fileext = ".json")
  on.exit(unlink(output_path, force = TRUE), add = TRUE)
  analyze_workbook(
    input_path = fixture_path,
    output_path = output_path,
    bootstraps = 100L,
    permutations = 1000L,
    seed = 2026L,
    data_source = "uploaded-workbook"
  )
  jsonlite::read_json(output_path, simplifyVector = FALSE)
}

first <- run_analysis()
second <- run_analysis()

stopifnot(identical(first$schemaVersion, "1.1"))
stopifnot(as.integer(first$source$originalRows) == 80L)
stopifnot(as.integer(first$source$analyzedRows) == 80L)
stopifnot(length(first$nodes) == 40L)
stopifnot(length(first$edges) == 0L)
stopifnot(as.integer(first$overview$edgeCount) == 0L)
stopifnot(isTRUE(all.equal(as.numeric(first$overview$density), 0)))
stopifnot(is.null(first$overview$strongestEdge))
stopifnot(all(vapply(first$nodes, function(node) isTRUE(all.equal(as.numeric(node$strength), 0)), logical(1))))
stopifnot(all(vapply(first$nodes, function(node) isTRUE(all.equal(as.numeric(node$expectedInfluence), 0)), logical(1))))
stopifnot(all(vapply(first$nodes, function(node) isTRUE(all.equal(as.numeric(node$betweenness), 0)), logical(1))))
stopifnot(all(vapply(first$nodes, function(node) is.null(node$closeness), logical(1))))
stopifnot(all(vapply(first$nodes, function(node) isTRUE(all.equal(as.numeric(node$bridgeStrength), 0)), logical(1))))
stopifnot(all(vapply(first$nodes, function(node) isTRUE(all.equal(as.numeric(node$bridgeExpectedInfluence), 0)), logical(1))))
stopifnot(all(vapply(first$nodes, function(node) isTRUE(all.equal(as.numeric(node$bridgeBetweenness), 0)), logical(1))))
stopifnot(all(vapply(first$nodes, function(node) is.null(node$bridgeCloseness), logical(1))))
stopifnot(isTRUE(first$subgroupComparison$available))
stopifnot(length(first$stability$metrics) == 4L)
stopifnot(all(vapply(first$stability$metrics, function(metric) is.null(metric$coefficient), logical(1))))
stopifnot(all(vapply(first$stability$metrics, function(metric) identical(metric$interpretation, "Not available"), logical(1))))
stopifnot(isFALSE(first$privacy$rawRowsIncluded))
stopifnot(isFALSE(first$privacy$uploadedWorkbookRetainedByEngine))

first$generatedAt <- NULL
second$generatedAt <- NULL
stopifnot(identical(first, second))
cat("Open SNA 40-item empty-network regression passed.\n")
```

- [ ] **Step 3: Add the explicit R regression command**

Add to `package.json` scripts:

```json
"open-sna:r-regression": "Rscript --vanilla analysis/open-sna/tests/empty-network-regression.R"
```

Do not add it to `npm test`; keep the real R gate explicit because it depends on the pinned R runtime.

- [ ] **Step 4: Run the regression and verify the intended failure**

Run:

```bash
npm run open-sna:r-regression
```

Expected: nonzero exit; stderr contains `undefined columns selected` at the centrality `Strength` lookup. A different setup or fixture failure must be corrected before continuing.

## Task 3: Implement explicit empty-network semantics and turn the regression GREEN

**Files:**

- Modify: `analysis/open-sna/analyze.R`
- Test: `analysis/open-sna/tests/empty-network-regression.R`
- Test: `tests/open-sna.test.ts`

- [ ] **Step 1: Add a focused static contract test for explicit empty-network handling**

In `tests/open-sna.test.ts`, add:

```ts
test("the R engine defines empty-network centrality, layout, and stability", () => {
  const engine = read("analysis/open-sna/analyze.R");
  assert.match(engine, /empty_network_metrics/);
  assert.match(engine, /deterministic_circle_layout/);
  assert.match(engine, /empty_network_stability/);
  assert.match(engine, /The estimated network contains no nonzero edges/);
});
```

Run:

```bash
./node_modules/.bin/tsx --test tests/open-sna.test.ts
```

Expected: FAIL because the named helpers do not exist.

- [ ] **Step 2: Add deterministic helpers to `analyze.R`**

Add these helpers before `network_metrics`:

```r
is_empty_network <- function(weights) {
  !any(is.finite(weights) & weights != 0)
}

named_metric <- function(value, item_names) {
  result <- rep(value, length(item_names))
  names(result) <- item_names
  result
}

empty_network_metrics <- function(item_names) {
  list(
    strength = named_metric(0, item_names),
    expected_influence = named_metric(0, item_names),
    betweenness = named_metric(0, item_names),
    closeness = named_metric(NA_real_, item_names),
    bridge_strength = named_metric(0, item_names),
    bridge_expected_influence = named_metric(0, item_names),
    bridge_betweenness = named_metric(0, item_names),
    bridge_closeness = named_metric(NA_real_, item_names)
  )
}

metric_column <- function(table, column, item_names, fallback = NA_real_) {
  if (is.null(table) || is.null(colnames(table)) || !(column %in% colnames(table))) {
    return(named_metric(fallback, item_names))
  }
  values <- table[, column]
  names(values) <- rownames(table)
  values[item_names]
}

deterministic_circle_layout <- function(item_names) {
  angles <- seq(0, 2 * pi, length.out = length(item_names) + 1L)[seq_along(item_names)]
  cbind(x = (cos(angles) + 1) / 2, y = (sin(angles) + 1) / 2)
}
```

- [ ] **Step 3: Branch `network_metrics` on the actual weight matrix**

Use `empty <- is_empty_network(weights)`. For the empty branch, use `empty_network_metrics(item_names)` and deterministic circular coordinates without calling `centrality_auto` or `networktools::bridge`. For the non-empty branch, use `metric_column` rather than direct column indexing. Keep MGM predictability independent and keep the existing edge-construction path.

The node construction must map the helper values exactly:

```r
nodes <- data.frame(
  id = item_names,
  label = item_names,
  community = unname(communities[item_names]),
  x = round_metric(coordinates[, 1L]),
  y = round_metric(coordinates[, 2L]),
  strength = round_metric(metrics$strength),
  expectedInfluence = round_metric(metrics$expected_influence),
  betweenness = round_metric(metrics$betweenness),
  closeness = round_metric(metrics$closeness),
  bridgeStrength = round_metric(metrics$bridge_strength),
  bridgeExpectedInfluence = round_metric(metrics$bridge_expected_influence),
  bridgeBetweenness = round_metric(metrics$bridge_betweenness),
  bridgeCloseness = round_metric(metrics$bridge_closeness),
  predictability = round_metric(predictability),
  stringsAsFactors = FALSE,
  check.names = FALSE
)
```

- [ ] **Step 4: Add explicit unavailable stability for the empty network**

Add:

```r
empty_network_stability <- function(bootstraps) {
  ids <- c("strength", "bridgeStrength", "bridgeCloseness", "bridgeBetweenness")
  labels <- c("Strength", "Bridge strength", "Bridge closeness", "Bridge betweenness")
  list(
    available = TRUE,
    method = "Case-dropping bootstrap",
    bootstraps = bootstraps,
    cores = 1L,
    correlationThreshold = 0.70,
    acceptableThreshold = 0.25,
    desirableThreshold = 0.50,
    metrics = data.frame(
      id = ids,
      metric = labels,
      coefficient = rep(NA_real_, length(ids)),
      interpretation = rep("Not available", length(ids)),
      stringsAsFactors = FALSE
    )
  )
}
```

Pass the already estimated `network$weights` into `stability_analysis`. Before bootnet estimation, return `empty_network_stability(bootstraps)` and emit exactly this warning:

```r
warning("The estimated network contains no nonzero edges; case-dropping centrality stability is not available.")
```

- [ ] **Step 5: Run focused GREEN verification**

Run:

```bash
npm run open-sna:r-regression
./node_modules/.bin/tsx --test tests/open-sna.test.ts
npm run open-sna:r-preflight
```

Expected: the real regression prints its success line twice internally and exits 0; static contract test passes; preflight passes.

- [ ] **Step 6: Commit the regression and fix together**

Run:

```bash
git add -- analysis/open-sna/analyze.R analysis/open-sna/tests/empty-network-regression.R tests/fixtures/open-sna-empty-network-80x40.xlsx tests/open-sna.test.ts package.json
git diff --cached --check
git commit -m "fix: support empty Open SNA networks"
```

Expected: commit contains only the fixture, R regression, R fix, package script, and focused test.

## Task 4: Add authoritative validation-only output and validation contract

**Files:**

- Modify: `analysis/open-sna/analyze.R`
- Create: `lib/open-sna-workbook-validation.ts`
- Create: `tests/open-sna-validation.test.ts`
- Modify: `tests/fixtures/fake-open-sna-rscript.mjs`

- [ ] **Step 1: Write failing validation contract tests**

Create `tests/open-sna-validation.test.ts` with cases for the exact safe response and rejected extra/raw fields:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { isOpenSnaValidationResult } from "../lib/open-sna-workbook-validation";

const valid = {
  schemaVersion: "1.0",
  valid: true,
  inputFingerprint: `sha256:${"a".repeat(64)}`,
  summary: {
    originalRows: 80,
    analyzedRows: 80,
    droppedRows: 0,
    itemCount: 40,
    communityCount: 4,
    groupColumn: "Gender",
    groupCounts: [{ group: "1", n: 40 }, { group: "2", n: 40 }],
  },
};

test("Open SNA accepts only the bounded validation summary", () => {
  assert.equal(isOpenSnaValidationResult(valid), true);
  assert.equal(isOpenSnaValidationResult({ ...valid, summary: { ...valid.summary, groupCounts: [] } }), false);
  assert.equal(isOpenSnaValidationResult({ ...valid, inputFingerprint: "bad" }), false);
  assert.equal(isOpenSnaValidationResult({ ...valid, records: [{ Gender: 1 }] }), false);
});
```

Run and expect module-not-found failure:

```bash
./node_modules/.bin/tsx --test tests/open-sna-validation.test.ts
```

- [ ] **Step 2: Implement the strict TypeScript validation result**

Create `lib/open-sna-workbook-validation.ts` exporting:

```ts
export type OpenSnaValidationResult = {
  schemaVersion: "1.0";
  valid: true;
  inputFingerprint: `sha256:${string}`;
  summary: {
    originalRows: number;
    analyzedRows: number;
    droppedRows: number;
    itemCount: number;
    communityCount: number;
    groupColumn: string;
    groupCounts: [{ group: string; n: number }, { group: string; n: number }];
  };
};
```

Implement `isOpenSnaValidationResult` with the same safe label patterns, count agreement, minimum 20 per group, row arithmetic, 6–40 items, and 2–8 communities used by schema `1.1`. Reject unknown top-level keys by allowing only `schemaVersion`, `valid`, `inputFingerprint`, and `summary`; reject unknown summary keys as well.

- [ ] **Step 3: Add R validation-only serialization**

Add `workbook_validation_result(prepared, input_path)` to `analyze.R`. It returns only:

```r
list(
  schemaVersion = "1.0",
  valid = TRUE,
  inputFingerprint = paste0("sha256:", digest::digest(file = input_path, algo = "sha256")),
  summary = list(
    originalRows = prepared$original_rows,
    analyzedRows = nrow(prepared$items),
    droppedRows = prepared$dropped_rows,
    itemCount = length(prepared$item_columns),
    communityCount = length(unique(prepared$communities)),
    groupColumn = prepared$group_column,
    groupCounts = prepared$group_counts
  )
)
```

Reuse the pinned `digest` package already present through dependencies; if it is not in `required_packages`, add and lock it before using it. Extend `main()` so `--mode validate` writes this object and returns before estimation. Any validation error retains `OPEN_SNA_ERROR_CODE=WORKBOOK_INVALID`.

- [ ] **Step 4: Extend the fake R executable for deterministic success**

Update `tests/fixtures/fake-open-sna-rscript.mjs` to parse `--output`. When `OPEN_SNA_TEST_OUTPUT_JSON` is set, wait for the requested delay, write that exact JSON to the output path, and exit 0. Otherwise retain existing failure behavior. Use `writeFile` from `node:fs/promises`; never print the payload.

- [ ] **Step 5: Run GREEN contract tests and direct validation**

Run:

```bash
open_sna_validation_output="$(mktemp -t open-sna-validation)"
Rscript --vanilla analysis/open-sna/analyze.R --mode validate --input tests/fixtures/open-sna-empty-network-80x40.xlsx --output "$open_sna_validation_output"
./node_modules/.bin/tsx --test tests/open-sna-validation.test.ts
node -e 'const fs=require("node:fs"); const x=JSON.parse(fs.readFileSync(process.argv[1], "utf8")); console.log(Object.keys(x), x.summary)' "$open_sna_validation_output"
rm "$open_sna_validation_output"
```

Expected: only approved keys; 80 rows, 40 items, 4 communities, two groups of 40.

- [ ] **Step 6: Commit validation-only contract**

```bash
git add -- analysis/open-sna/analyze.R lib/open-sna-workbook-validation.ts tests/open-sna-validation.test.ts tests/fixtures/fake-open-sna-rscript.mjs
git diff --cached --check
git commit -m "feat: add authoritative Open SNA validation"
```

## Task 5: Add the public validation route with guaranteed cleanup

**Files:**

- Create: `app/api/open-sna/validate/route.ts`
- Create: `lib/open-sna-runner.ts`
- Create: `lib/open-sna-workbook-validation.ts` additions
- Modify: `app/api/open-sna/analyze/route.ts`
- Modify: `tests/open-sna-route.test.ts`

- [ ] **Step 1: Write failing route tests**

Add cases to `tests/open-sna-route.test.ts` for:

- valid validation response;
- missing multipart workbook;
- invalid extension, media type, ZIP signature, size, and empty file;
- real R `WORKBOOK_INVALID` mapped to HTTP 422;
- Vercel without worker configuration mapped to HTTP 503;
- authenticated worker validation;
- temporary validation directory empty after both success and failure;
- no raw fields in the public response.

Import the route as:

```ts
import { POST as VALIDATE } from "../app/api/open-sna/validate/route";
```

Run and expect module-not-found failure:

```bash
./node_modules/.bin/tsx --test tests/open-sna-route.test.ts
```

- [ ] **Step 2: Extract bounded upload and R process helpers**

Move only reusable behavior from the synchronous route into `lib/open-sna-runner.ts` and `lib/open-sna-workbook-validation.ts`:

```ts
export const MAX_OPEN_SNA_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_OPEN_SNA_MULTIPART_BYTES = MAX_OPEN_SNA_UPLOAD_BYTES + 256 * 1024;
export const OPEN_SNA_XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function readOpenSnaWorkbookUpload(request: Request): Promise<{
  bytes: Uint8Array;
  fingerprint: `sha256:${string}`;
}>;

export async function runOpenSnaR(options: {
  mode: "validate" | "analyze";
  inputPath: string;
  outputPath: string;
  bootstraps?: "100" | "500" | "1000";
  permutations?: "1000";
  timeoutMs: number;
}): Promise<{ exitCode: number; timedOut: boolean; stderr: string }>;
```

Use typed errors so routes map public status without string matching. Preserve `shell: false`, output/stderr limits, locale environment, pinned R library lookup, gender mapping validation, and safe temporary-root checks.

- [ ] **Step 3: Implement `POST /api/open-sna/validate`**

The route must:

1. authenticate when worker mode is active;
2. enforce the upload envelope;
3. derive the worker route from the configured legacy analysis endpoint and proxy to `/api/open-sna/validate` on Vercel;
4. run local R `--mode validate` otherwise;
5. replace the R-computed fingerprint only if it exactly matches the TypeScript-computed fingerprint;
6. strictly validate the safe response;
7. remove its job directory in `finally`;
8. return no-store JSON.

Use a validation timeout of 30 seconds. Do not call LUNA.

Keep `OPEN_SNA_R_API_URL` backward compatible as an exact URL ending in `/api/open-sna/analyze`. Add one helper that parses and validates that URL, replaces only its pathname with the requested worker route, clears query/hash values, and preserves the validated HTTPS origin. Use the same helper later for job create/status/result routes; never concatenate another route onto the existing endpoint string.

- [ ] **Step 4: Run focused route tests**

```bash
./node_modules/.bin/tsx --test tests/open-sna-validation.test.ts tests/open-sna-route.test.ts
npm run typecheck
```

Expected: exit 0; cleanup checks pass; no private diagnostic is exposed.

- [ ] **Step 5: Commit the validation route slice**

```bash
git add -- app/api/open-sna/validate/route.ts app/api/open-sna/analyze/route.ts lib/open-sna-runner.ts lib/open-sna-workbook-validation.ts tests/open-sna-route.test.ts
git diff --cached --check
git commit -m "feat: prevalidate Open SNA workbooks"
```

## Task 6: Define the job contract and browser recovery record

**Files:**

- Create: `lib/open-sna-job-contract.ts`
- Create: `lib/open-sna-job-client.ts`
- Create: `tests/open-sna-job-contract.test.ts`

- [ ] **Step 1: Write failing pure contract tests**

Cover:

- RFC 4122 UUID validation;
- exact job statuses;
- queued/running poll delay;
- terminal states without poll delay;
- ISO timestamps and 24-hour expiry;
- allowed locales only;
- bounded failure codes only;
- browser recovery parsing rejects extra keys and expired records;
- backoff remains between 2 and 30 seconds.

Run:

```bash
./node_modules/.bin/tsx --test tests/open-sna-job-contract.test.ts
```

Expected: module-not-found failure.

- [ ] **Step 2: Implement the exact shared job types**

Create `lib/open-sna-job-contract.ts` around these declarations:

```ts
import type { Locale } from "@/lib/i18n";

export const OPEN_SNA_JOB_STATUSES = ["queued", "running", "succeeded", "failed", "expired"] as const;
export type OpenSnaJobStatus = (typeof OPEN_SNA_JOB_STATUSES)[number];

export const OPEN_SNA_JOB_FAILURE_CODES = [
  "WORKBOOK_INVALID",
  "VALIDATION_UNAVAILABLE",
  "JOB_CONFIGURATION_INVALID",
  "JOB_CONFLICT",
  "JOB_QUEUE_UNAVAILABLE",
  "R_RUNTIME_NOT_READY",
  "R_ANALYSIS_FAILED",
  "R_ANALYSIS_TIMED_OUT",
  "RESULT_CONTRACT_INVALID",
] as const;

export type OpenSnaJobFailureCode = (typeof OPEN_SNA_JOB_FAILURE_CODES)[number];

export const OPEN_SNA_PUBLIC_ERROR_CODES = [
  ...OPEN_SNA_JOB_FAILURE_CODES,
  "JOB_NOT_FOUND",
  "JOB_EXPIRED",
  "JOB_NOT_READY",
  "RESULT_FINALIZING",
  "R_ENGINE_UNAVAILABLE",
  "R_ENGINE_CONFIGURATION_INVALID",
  "WORKER_UNAUTHORIZED",
  "WORKER_CONFIGURATION_INVALID",
  "ASYNC_JOB_REQUIRED",
] as const;

export type OpenSnaPublicErrorCode = (typeof OPEN_SNA_PUBLIC_ERROR_CODES)[number];

export type OpenSnaJobState = {
  schemaVersion: "1.0";
  jobId: string;
  status: OpenSnaJobStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  locale: Locale;
  inputFingerprint: `sha256:${string}`;
  bootstraps: 100 | 500 | 1000;
  permutations: 1000;
  seed: 2026;
  attempts: number;
  leaseExpiresAt: string | null;
  failureCode: OpenSnaJobFailureCode | null;
  rResultAvailable: boolean;
  finalResultAvailable: boolean;
  finalizationStatus: "pending" | "running" | "finalized";
  finalizationLeaseExpiresAt: string | null;
};
```

Export `isOpenSnaJobId`, `isOpenSnaJobState`, `toPublicJobStatus`, and `OPEN_SNA_JOB_RETENTION_MS = 86_400_000`.

- [ ] **Step 3: Implement bounded browser recovery helpers**

Create `lib/open-sna-job-client.ts` exporting:

```ts
export const OPEN_SNA_RECOVERY_KEY = "open-sna-active-job-v1";

export type OpenSnaRecoveryRecord = {
  jobId: string;
  locale: "en" | "zh-hant" | "zh-hans";
  createdAt: string;
  expiresAt: string;
};

export function parseOpenSnaRecoveryRecord(value: string | null, now = Date.now()): OpenSnaRecoveryRecord | null;
export function nextOpenSnaPollDelay(status: "queued" | "running", failures: number): number;
```

The parser must reject unknown keys, malformed UUIDs, invalid locales, invalid dates, expiry before creation, and already expired records. The delay is 2,000 ms for queued, 5,000 ms for running, and doubles after transport failures up to 30,000 ms.

- [ ] **Step 4: Run GREEN tests and commit**

```bash
./node_modules/.bin/tsx --test tests/open-sna-job-contract.test.ts
npm run typecheck
git add -- lib/open-sna-job-contract.ts lib/open-sna-job-client.ts tests/open-sna-job-contract.test.ts
git diff --cached --check
git commit -m "feat: define Open SNA job contracts"
```

## Task 7: Implement the local durable store, queue, and job service

**Files:**

- Create: `lib/open-sna-job-store.ts`
- Create: `lib/open-sna-job-queue.ts`
- Create: `lib/open-sna-job-service.ts`
- Modify: `lib/open-sna-runner.ts`
- Create: `tests/open-sna-job-store.test.ts`
- Create: `tests/open-sna-job-service.test.ts`

- [ ] **Step 1: Write failing store tests**

Use a `mkdtemp` directory below `/Volumes/Starship/` and verify:

- create returns `created` once;
- identical replay returns `existing`;
- changed fingerprint/settings return `conflict`;
- atomic queued-to-running claim requires the current generation;
- stale running lease can be reclaimed;
- unexpired running lease cannot be reclaimed;
- input write/read/delete;
- R result write/read;
- final result uses create-if-absent;
- terminal cleanup deletes input but retains aggregate output;
- expired jobs return expired and delete local objects.

Run and expect module-not-found failure:

```bash
./node_modules/.bin/tsx --test tests/open-sna-job-store.test.ts
```

- [ ] **Step 2: Define the store interface and local implementation**

Use this public interface in `lib/open-sna-job-store.ts`:

```ts
export type VersionedJobState = { state: OpenSnaJobState; version: string };

export interface OpenSnaJobStore {
  create(state: OpenSnaJobState, input: Uint8Array): Promise<"created" | "existing" | "conflict">;
  getState(jobId: string): Promise<VersionedJobState | null>;
  compareAndSetState(jobId: string, version: string, state: OpenSnaJobState): Promise<boolean>;
  readInput(jobId: string): Promise<Uint8Array | null>;
  deleteInput(jobId: string): Promise<void>;
  writeRResult(jobId: string, result: OpenSnaResult): Promise<void>;
  readRResult(jobId: string): Promise<OpenSnaResult | null>;
  writeFinalResultIfAbsent(jobId: string, result: OpenSnaResult): Promise<OpenSnaResult>;
  readFinalResult(jobId: string): Promise<OpenSnaResult | null>;
  expire(jobId: string): Promise<void>;
}
```

The local implementation uses `state.json`, `input.xlsx`, `result-r.json`, and `result.json` under an isolated job directory. Use `open(..., "wx")` for first creation, write replacements to a same-directory temporary file, and `rename` atomically. Never store source names.

- [ ] **Step 3: Write failing job-service tests**

Use an in-memory store and queue fake to cover:

- create validates UUID, fingerprint, settings, locale, and expiry;
- identical create is idempotent;
- task enqueue happens only for newly created jobs;
- queued job claims one 15-minute lease;
- duplicate task delivery while leased is a no-op;
- success validates result, writes R result, deletes input, and marks succeeded;
- permanent R failure deletes input and marks failed;
- transient infrastructure error keeps input and produces a retryable outcome;
- stale lease recovery increments attempts;
- attempt limit produces terminal failure;
- result can be read repeatedly;
- unknown/expired/not-ready results map distinctly.

- [ ] **Step 4: Implement the one-slot local queue and service**

`lib/open-sna-job-queue.ts` exports:

```ts
export interface OpenSnaJobQueue {
  enqueue(jobId: string): Promise<"enqueued" | "existing">;
}
```

The local queue keeps one promise chain, but durable state remains in the store. `OpenSnaJobService` receives injected store, queue, clock, and R runner. No route imports concrete Google clients directly.

- [ ] **Step 5: Run focused tests and commit**

```bash
./node_modules/.bin/tsx --test tests/open-sna-job-contract.test.ts tests/open-sna-job-store.test.ts tests/open-sna-job-service.test.ts
npm run typecheck
git add -- lib/open-sna-job-store.ts lib/open-sna-job-queue.ts lib/open-sna-job-service.ts lib/open-sna-runner.ts tests/open-sna-job-store.test.ts tests/open-sna-job-service.test.ts
git diff --cached --check
git commit -m "feat: add durable local Open SNA jobs"
```

## Task 8: Add public job routes, status polling, and repeat result retrieval

**Files:**

- Create: `app/api/open-sna/jobs/route.ts`
- Create: `app/api/open-sna/jobs/[jobId]/route.ts`
- Create: `app/api/open-sna/jobs/[jobId]/result/route.ts`
- Modify: `app/api/open-sna/analyze/route.ts`
- Modify: `tests/open-sna-route.test.ts`

- [ ] **Step 1: Write failing route lifecycle tests**

Add route tests for:

- 202 create with caller UUID and `Location` header;
- 202 idempotent replay;
- 409 key reuse with different bytes or settings;
- 400 malformed UUID, bootstrap, permutation, or locale;
- no `Idempotency-Key`;
- 200 queued and running status with `Retry-After`;
- 200 succeeded status;
- bounded failed status;
- 404 unknown;
- 410 expired;
- 409 result not ready;
- 200 strict result read twice;
- remote worker authentication and response validation;
- Vercel configuration fail-closed behavior;
- synchronous analyze route does not accept the new browser path.

Run and expect missing-route failures:

```bash
./node_modules/.bin/tsx --test tests/open-sna-route.test.ts
```

- [ ] **Step 2: Implement public/local job creation**

The create route must:

- reuse `readOpenSnaWorkbookUpload`;
- validate `Idempotency-Key` as the job UUID;
- require locale in `en | zh-hant | zh-hans`;
- require bootstraps in `100 | 500 | 1000` and permutations `1000`;
- re-run authoritative validation before persistence;
- proxy to the configured worker on Vercel;
- use the local job service otherwise;
- return no-store HTTP 202 with `Location: /api/open-sna/jobs/<id>`.

- [ ] **Step 3: Implement status and result routes**

Validate the route parameter before store or network access. Map service outcomes exactly:

```text
unknown -> 404 JOB_NOT_FOUND
expired -> 410 JOB_EXPIRED
queued/running result -> 409 JOB_NOT_READY
failed -> stored bounded failure status
succeeded -> 200 strict OpenSnaResult
```

Every response uses `Cache-Control: no-store, max-age=0` and `X-Content-Type-Options: nosniff`.

- [ ] **Step 4: Bound the old synchronous route**

After all internal callers move to shared runner/service code, make `POST /api/open-sna/analyze` return HTTP 410 with:

```json
{
  "code": "ASYNC_JOB_REQUIRED",
  "error": "Uploaded analyses now use the Open SNA job API."
}
```

The reference JSON route remains unchanged. Update static tests so no browser component references `/api/open-sna/analyze`.

- [ ] **Step 5: Run route tests and commit**

```bash
./node_modules/.bin/tsx --test tests/open-sna-route.test.ts tests/open-sna-job-service.test.ts
npm run typecheck
git add -- app/api/open-sna/analyze/route.ts app/api/open-sna/jobs/route.ts 'app/api/open-sna/jobs/[jobId]/route.ts' 'app/api/open-sna/jobs/[jobId]/result/route.ts' tests/open-sna-route.test.ts
git diff --cached --check
git commit -m "feat: expose recoverable Open SNA jobs"
```

## Task 9: Add Cloud Storage, Cloud Tasks, and OIDC production adapters

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `lib/open-sna-job-store.ts`
- Modify: `lib/open-sna-job-queue.ts`
- Create: `app/api/open-sna/internal/jobs/[jobId]/run/route.ts`
- Modify: `tests/open-sna-job-store.test.ts`
- Modify: `tests/open-sna-job-service.test.ts`
- Modify: `tests/open-sna-route.test.ts`

- [ ] **Step 1: Install the verified package versions**

Run:

```bash
npm install @google-cloud/storage@8.0.1 @google-cloud/tasks@7.0.0 google-auth-library@11.0.2
```

Expected: package and lockfile updated; no unrelated dependency upgrade.

- [ ] **Step 2: Write failing adapter tests with injected fake clients**

Do not contact Google Cloud. Test:

- create uses `ifGenerationMatch: 0`;
- compare-and-set uses the observed generation;
- state/result reads reject oversized or invalid JSON;
- final result create-if-absent returns the winning stored result;
- task name is deterministic from job ID;
- task HTTP method is POST;
- OIDC service account and audience are set;
- queue `ALREADY_EXISTS` maps to idempotent existing;
- OIDC verification rejects missing bearer, wrong audience, unverified email, and wrong service account;
- accepted OIDC dispatch calls the job service once.

- [ ] **Step 3: Implement `CloudStorageOpenSnaJobStore`**

Use one private bucket from `OPEN_SNA_JOB_BUCKET`. Set `resumable: false`, JSON content types, no cache, and generation preconditions. Enforce the same 2 MiB aggregate result limit and strict validators after every read. Never return signed URLs.

- [ ] **Step 4: Implement `CloudTasksOpenSnaJobQueue`**

Read:

```text
OPEN_SNA_GCP_PROJECT_ID
OPEN_SNA_GCP_REGION
OPEN_SNA_GCP_QUEUE
OPEN_SNA_WORKER_PUBLIC_URL
OPEN_SNA_TASK_SERVICE_ACCOUNT
OPEN_SNA_TASK_AUDIENCE
```

Create a named task with a POST to `/api/open-sna/internal/jobs/<id>/run` and an OIDC token. Set a 900-second dispatch deadline. Treat only an exact already-exists error as idempotent success.

- [ ] **Step 5: Implement the internal run route**

Verify the Google ID token with `OAuth2Client.verifyIdToken`. Require:

- exact audience;
- `email_verified === true`;
- exact configured service-account email;
- valid job UUID.

Return 204 for completed/idempotent/permanent-terminal outcomes, 503 for retryable infrastructure failures, and no result body.

- [ ] **Step 6: Run tests and commit**

```bash
./node_modules/.bin/tsx --test tests/open-sna-job-store.test.ts tests/open-sna-job-service.test.ts tests/open-sna-route.test.ts
npm run typecheck
git add -- package.json package-lock.json lib/open-sna-job-store.ts lib/open-sna-job-queue.ts 'app/api/open-sna/internal/jobs/[jobId]/run/route.ts' tests/open-sna-job-store.test.ts tests/open-sna-job-service.test.ts tests/open-sna-route.test.ts
git diff --cached --check
git commit -m "feat: persist and dispatch Open SNA jobs"
```

## Task 10: Migrate the browser to validation, async submission, polling, and recovery

**Files:**

- Create: `components/open-sna/OpenSnaSetup.tsx`
- Create: `components/open-sna/OpenSnaJobStatus.tsx`
- Create: `components/open-sna/OpenSnaResults.tsx`
- Modify: `components/open-sna/OpenSnaWorkbench.tsx`
- Modify: `lib/open-sna-job-client.ts`
- Modify: `tests/open-sna.test.ts`
- Modify: `tests/open-sna-job-contract.test.ts`

- [ ] **Step 1: Add failing pure-client and static UI tests**

Test:

- recovery record is written before the create request;
- new UUID is stable across a retry;
- validation replacement aborts the old request;
- Run is disabled until the current fingerprint validates;
- polling has one active request;
- transport failure becomes reconnecting, not failed;
- online event resumes polling;
- reload consumes the saved job record;
- manual task ID recovery uses the same validator;
- result is fetched from `/result` only after succeeded;
- no component posts to `/api/open-sna/analyze`;
- task ID has a visible copy control and an accessible label.

Run and confirm intended failures:

```bash
./node_modules/.bin/tsx --test tests/open-sna.test.ts tests/open-sna-job-contract.test.ts
```

- [ ] **Step 2: Split result presentation without changing behavior**

Move the current panel components, table, download helper, tab navigation, and `ActivePanel` into `OpenSnaResults.tsx`. Its public props are:

```ts
type OpenSnaResultsProps = {
  result: OpenSnaResult;
  locale: Locale;
  copy: OpenSnaCopy;
  busy: boolean;
};
```

Run current Open SNA tests before adding job behavior. They must remain green.

- [ ] **Step 3: Implement `OpenSnaSetup` validation state**

Use a discriminated state:

```ts
type WorkbookState =
  | { status: "empty" }
  | { status: "validating"; file: File; controller: AbortController }
  | { status: "valid"; file: File; validation: OpenSnaValidationResult }
  | { status: "invalid"; file: File | null; code: string };
```

Selecting or dropping a file starts `/api/open-sna/validate`. Replacing/removing aborts the prior controller. The Run button requires `status === "valid"` and a matching current file.

- [ ] **Step 4: Implement job creation before-response recovery**

On Run:

1. generate `crypto.randomUUID()`;
2. compute `createdAt` and `expiresAt`;
3. write the bounded recovery record to localStorage;
4. submit multipart to `/api/open-sna/jobs` with `Idempotency-Key`;
5. on transport loss, poll the preknown UUID before offering an identical replay;
6. never generate a second UUID for the same submission attempt.

- [ ] **Step 5: Implement `OpenSnaJobStatus` polling and recovery**

Render task ID, copy, dismiss, and manual recovery controls. Use an AbortController per poll, `nextOpenSnaPollDelay`, online/offline events, and a single timer. A status transport error renders localized reconnecting text and retains the job.

When status succeeds, fetch `/api/open-sna/jobs/<id>/result`, validate it with `isOpenSnaResult`, set the uploaded result, and retain the recovery record until the user dismisses or expiry is confirmed.

- [ ] **Step 6: Make `OpenSnaWorkbench` orchestration-only**

It owns:

- selected source and current result;
- setup open/closed state;
- saved-job discovery;
- active job ID;
- reference loading;
- result scrolling.

It no longer parses job payloads, renders every panel, or owns graph copy.

- [ ] **Step 7: Run focused tests and commit**

```bash
./node_modules/.bin/tsx --test tests/open-sna.test.ts tests/open-sna-job-contract.test.ts tests/open-sna-route.test.ts
npm run typecheck
git add -- components/open-sna/OpenSnaWorkbench.tsx components/open-sna/OpenSnaSetup.tsx components/open-sna/OpenSnaJobStatus.tsx components/open-sna/OpenSnaResults.tsx lib/open-sna-job-client.ts tests/open-sna.test.ts tests/open-sna-job-contract.test.ts
git diff --cached --check
git commit -m "feat: recover Open SNA analysis jobs"
```

## Task 11: Make optional LUNA finalization locale-aware and single-writer

**Files:**

- Modify: `lib/open-sna-ai.ts`
- Modify: `lib/open-sna-job-service.ts`
- Modify: `app/api/open-sna/jobs/[jobId]/result/route.ts`
- Modify: `tests/open-sna-ai.test.ts`
- Modify: `tests/open-sna-job-service.test.ts`

- [ ] **Step 1: Write failing language and finalization tests**

Add cases asserting:

- `withLunaInterpretation(..., { locale: "zh-hant" })` instructs Traditional Chinese used in Hong Kong;
- `zh-hans` requests Simplified Chinese;
- `en` requests English;
- the aggregate input remains unchanged and contains no file, sheet, fingerprint, row, runtime, or ID data;
- unconfigured LUNA returns deterministic success;
- unavailable LUNA returns deterministic success;
- two concurrent first result reads grant one finalization lease and make at most one concurrent LUNA call;
- later reads do not call LUNA again;
- an abandoned finalization can be retried only after its lease expires;
- final result settings/fingerprint/privacy mismatch is rejected.

- [ ] **Step 2: Add locale to `LunaOptions` and prompt construction**

Use a fixed map:

```ts
const LUNA_OUTPUT_LANGUAGE: Record<Locale, string> = {
  en: "Write all titles, explanations, evidence labels, and cautions in English.",
  "zh-hant": "Write all titles, explanations, evidence labels, and cautions in Traditional Chinese used in Hong Kong.",
  "zh-hans": "Write all titles, explanations, evidence labels, and cautions in Simplified Chinese.",
};
```

Append only the selected fixed instruction to the system prompt. Do not interpolate untrusted workbook labels into instructions.

- [ ] **Step 3: Implement result finalization**

The public result route asks the job service for a final result. If absent, it atomically claims a bounded finalization lease. The lease winner retrieves `result-r.json`, applies optional LUNA through Vercel, validates the result, writes it through `writeFinalResultIfAbsent`, and marks finalization complete. Concurrent non-winners receive `409 RESULT_FINALIZING` with `Retry-After`. If the winner disappears, a later request may reclaim only an expired lease. A provider call interrupted after upstream completion but before local persistence may be retried; the persisted aggregate output remains single-writer and later reads never call LUNA again.

Unconfigured or unavailable LUNA adds one stable warning key that the client localizes; it does not change job status.

- [ ] **Step 4: Run and commit**

```bash
./node_modules/.bin/tsx --test tests/open-sna-ai.test.ts tests/open-sna-job-service.test.ts tests/open-sna-route.test.ts
npm run typecheck
git add -- lib/open-sna-ai.ts lib/open-sna-job-service.ts 'app/api/open-sna/jobs/[jobId]/result/route.ts' tests/open-sna-ai.test.ts tests/open-sna-job-service.test.ts
git diff --cached --check
git commit -m "feat: finalize optional Open SNA interpretation"
```

## Task 12: Add the strongly typed three-language Open SNA dictionary and metadata

**Files:**

- Create: `lib/open-sna-copy.ts`
- Create: `tests/open-sna-copy.test.ts`
- Modify: `app/[locale]/open-sna/page.tsx`
- Modify: `app/sitemap.ts`
- Modify: `tests/open-sna.test.ts`

- [ ] **Step 1: Write failing dictionary and route tests**

Assert:

- all three locale copies have identical recursive key paths;
- Chinese page title, hero, setup, validation, task, panel, error, privacy, and ARIA sentinel strings differ from English;
- Traditional and Simplified sentinel strings use their correct scripts;
- interpolation functions return localized counts and task states;
- `/zh-hant/open-sna` and `/zh-hans/open-sna` are in the sitemap;
- each locale route is self-canonical and declares all alternates;
- page and workbench do not hard-code `lang="en"`.

Run and expect module-not-found/assertion failures:

```bash
./node_modules/.bin/tsx --test tests/open-sna-copy.test.ts tests/open-sna.test.ts
```

- [ ] **Step 2: Define the exact copy shape**

Create a bounded graph copy type and the nested `OpenSnaCopy` type with these exact sections:

```ts
export type OpenSnaGraphCopy = {
  title: string;
  summary: (visible: number, total: number) => string;
  zoomIn: string;
  zoomOut: string;
  reset: string;
  threshold: string;
  thresholdValue: (value: number) => string;
  withinCommunityOnly: string;
  showAllEdges: string;
  nodeInspector: string;
  selectedNode: string;
  community: string;
  strength: string;
  predictability: string;
  connectedEdges: (count: number) => string;
  clearSelection: string;
  keyboardHelp: string;
  noVisibleEdges: string;
};

export type OpenSnaCopy = {
  metadata: { title: string; description: string };
  hero: { skip: string; eyebrow: string; runtime: string; titleLead: string; titleAccent: string; intro: string; referenceCta: string; uploadCta: string; stats: string[] };
  method: { label: string; steps: Array<{ label: string; detail: string }>; aggregateOnly: string; mobileTitle: string; mobileItems: string[] };
  setup: { title: string; dataModel: string; choose: string; replace: string; remove: string; drop: string; browse: string; help: string; validating: string; validated: string; requiredGroup: string; precision: string; bootstrapOptions: Record<"100" | "500" | "1000", string>; run: string; submitting: string; optionalAi: string; privacyTitle: string; privacyBody: string };
  job: { taskId: string; copyId: string; copied: string; queued: string; running: string; reconnecting: string; succeeded: string; failed: string; expired: string; resumeTitle: string; resumeLabel: string; resume: string; dismiss: string; resultReady: string };
  result: { reference: string; uploaded: string; schema: string; responses: string; nodes: string; edges: string; json: string; csv: string; previous: string; next: string; analysisProgress: (index: number, total: number) => string };
  panels: Record<OpenSnaTabId, { label: string; shortLabel: string; summary: string }>;
  tables: { search: string; showing: (visible: number, total: number) => string; noMatch: (query: string) => string; node: string; community: string; notAvailable: string };
  graph: OpenSnaGraphCopy;
  interpretation: { title: string; luna: string; deterministic: string; reference: string; lunaBody: string; deterministicBody: string; referenceBody: string; limits: string; evidence: (value: string) => string };
  errors: Record<OpenSnaPublicErrorCode, string>;
  aria: { workbench: string; setupToggle: (expanded: boolean) => string; resultTabs: string; panelNavigation: string; jumpToAnalysis: string; validationStatus: string; jobStatus: string };
};
```

Populate every field in English, Hong Kong Traditional Chinese, and Simplified Chinese. Keep formal method identifiers unchanged. Use `satisfies Record<Locale, OpenSnaCopy>` so a missing key is a compile error.

- [ ] **Step 3: Localize page metadata and language semantics**

In `app/[locale]/open-sna/page.tsx`:

- obtain `typedLocale` and `copy`;
- use localized title/description;
- make canonical URL the current locale route;
- add alternates for `en`, `zh-Hant`, `zh-Hans`, and `x-default`;
- set the page wrapper to `getLocaleMeta(typedLocale).htmlLang`;
- pass `locale` and `copy` to `OpenSnaWorkbench`.

- [ ] **Step 4: Add all localized routes to the sitemap**

Generate one Open SNA sitemap entry per locale using the same pattern as the other localized pages. Update the previous test that intentionally excluded Chinese Open SNA routes.

- [ ] **Step 5: Run and commit**

```bash
./node_modules/.bin/tsx --test tests/open-sna-copy.test.ts tests/open-sna.test.ts
npm run typecheck
git add -- lib/open-sna-copy.ts tests/open-sna-copy.test.ts app/'[locale]'/open-sna/page.tsx app/sitemap.ts tests/open-sna.test.ts
git diff --cached --check
git commit -m "feat: localize the Open SNA shell"
```

## Task 13: Localize setup, jobs, all result panels, graph controls, and deterministic interpretation

**Files:**

- Modify: `components/open-sna/OpenSnaWorkbench.tsx`
- Modify: `components/open-sna/OpenSnaSetup.tsx`
- Modify: `components/open-sna/OpenSnaJobStatus.tsx`
- Modify: `components/open-sna/OpenSnaResults.tsx`
- Modify: `components/open-sna/NetworkGraph.tsx`
- Modify: `lib/open-sna-copy.ts`
- Modify: `tests/open-sna-copy.test.ts`
- Modify: `tests/open-sna.test.ts`

- [ ] **Step 1: Add failing static coverage for every component boundary**

Require every Open SNA component to receive `copy` or a bounded copy subset. Assert the source no longer contains the known English-only literals for setup, status, tab navigation, tables, graph controls, interpretation fallback, errors, and ARIA labels outside `lib/open-sna-copy.ts`.

Run:

```bash
./node_modules/.bin/tsx --test tests/open-sna-copy.test.ts tests/open-sna.test.ts
```

Expected: FAIL until literals are removed.

- [ ] **Step 2: Replace setup and job literals**

Use `copy.setup`, `copy.job`, `copy.errors`, and `copy.aria`. Format numbers with `new Intl.NumberFormat(locale)`. Keep file names visible only in the current browser session; never put them into the recovery record or job state.

- [ ] **Step 3: Replace result/table/navigation literals**

Build panel headings from `copy.panels`, not a module-level English constant. Pass localized labels into tab ARIA text, mobile selector, progress, previous/next controls, tables, empty state, metric cards, method notes, downloads, and warnings.

- [ ] **Step 4: Localize `NetworkGraph`**

Add `copy: OpenSnaGraphCopy` and `locale: Locale` props. Translate zoom/reset, threshold, within-community toggle, node inspector, selected state, edge count, keyboard instructions, and accessible edge list. Preserve node/community labels and numeric edge values.

- [ ] **Step 5: Localize deterministic interpretation by stable ID**

When `thirdPartyAiUsed` is false, render localized deterministic templates keyed by:

```text
network-structure
centrality
bridge
predictability
subgroup-comparison
```

Templates obtain numbers and node labels from the validated result. They must preserve the evidence boundaries: no causal language, no interpretation of unavailable/unstable metrics, and no claim that nonsignificant NCT proves equality. Unknown IDs fall back to the bounded engine text with a localized diagnostic label.

- [ ] **Step 6: Run three-language tests and commit**

```bash
./node_modules/.bin/tsx --test tests/open-sna-copy.test.ts tests/open-sna.test.ts tests/open-sna-job-contract.test.ts
npm run typecheck
git add -- components/open-sna/OpenSnaWorkbench.tsx components/open-sna/OpenSnaSetup.tsx components/open-sna/OpenSnaJobStatus.tsx components/open-sna/OpenSnaResults.tsx components/open-sna/NetworkGraph.tsx lib/open-sna-copy.ts tests/open-sna-copy.test.ts tests/open-sna.test.ts
git diff --cached --check
git commit -m "feat: translate the Open SNA workbench"
```

## Task 14: Provision bounded production queue/storage assets in deployment code

**Files:**

- Create: `analysis/open-sna/gcs-lifecycle.json`
- Modify: `scripts/deploy-open-sna-worker-cloud-run.sh`
- Modify: `analysis/open-sna/WORKER_DEPLOYMENT.md`
- Modify: `.env.example`
- Modify: `Dockerfile.open-sna-worker`
- Modify: `tests/open-sna.test.ts`

- [ ] **Step 1: Write failing deployment-contract tests**

Assert the script contains:

- `storage.googleapis.com` and `cloudtasks.googleapis.com` API enablement;
- regional private bucket creation;
- uniform bucket-level access;
- public-access prevention;
- one-day lifecycle application;
- queue creation with max concurrent dispatches 1;
- service-account object and task permissions;
- OIDC service account/audience configuration;
- Cloud Run timeout 900;
- concurrency 1 and max instances 1;
- no literal secret value;
- no public bucket or signed URL command.

Run and expect failures:

```bash
./node_modules/.bin/tsx --test tests/open-sna.test.ts
```

- [ ] **Step 2: Add the exact lifecycle policy**

Create `analysis/open-sna/gcs-lifecycle.json`:

```json
{
  "rule": [
    {
      "action": { "type": "Delete" },
      "condition": { "age": 1, "matchesPrefix": ["jobs/"] }
    }
  ]
}
```

- [ ] **Step 3: Extend the deployment script idempotently**

Add required environment-derived names for bucket, queue, and task identity. Enable APIs, create missing resources, apply lifecycle/public-access controls, and grant only:

- worker object create/get/delete permissions on its job bucket;
- worker Cloud Tasks enqueuer permission;
- task service account Cloud Run invocation permission;
- deploying identity service-account user permission only where required.

Set non-secret environment variables and preserve the existing Secret Manager worker token. Keep `--allow-unauthenticated` only because the public Vercel proxy still uses the application Bearer token; the internal run route independently verifies OIDC.

- [ ] **Step 4: Update documented configuration**

Add these empty names to `.env.example`:

```text
OPEN_SNA_JOB_BUCKET=
OPEN_SNA_GCP_PROJECT_ID=
OPEN_SNA_GCP_REGION=asia-east2
OPEN_SNA_GCP_QUEUE=open-sna-analysis
OPEN_SNA_WORKER_PUBLIC_URL=
OPEN_SNA_TASK_SERVICE_ACCOUNT=
OPEN_SNA_TASK_AUDIENCE=
```

Document lifecycle, leases, source deletion, result finalization, rollback order, and exact production verification gates without including credentials.

- [ ] **Step 5: Run static deployment verification and commit**

```bash
bash -n scripts/deploy-open-sna-worker-cloud-run.sh
./node_modules/.bin/tsx --test tests/open-sna.test.ts
npm run typecheck
git add -- analysis/open-sna/gcs-lifecycle.json scripts/deploy-open-sna-worker-cloud-run.sh analysis/open-sna/WORKER_DEPLOYMENT.md .env.example Dockerfile.open-sna-worker tests/open-sna.test.ts
git diff --cached --check
git commit -m "ops: prepare durable Open SNA jobs"
```

No `gcloud` mutation command is run during local implementation.

## Task 15: Update public documentation and retire contradictory wording

**Files:**

- Modify: `README.md`
- Modify: `analysis/open-sna/README.md`
- Modify: `OPEN_SNA_HUMAN_QA_REPORT_2026-08-23.md` only if the user explicitly authorizes changing the historical report; otherwise leave it untouched.
- Modify: `tests/open-sna.test.ts`

- [ ] **Step 1: Add failing documentation contract assertions**

Require current documentation to state:

- binary subgroup is required;
- validation occurs before Run is enabled;
- uploaded analysis returns a task ID;
- browser disconnect does not cancel a job;
- aggregate results can be reread for 24 hours;
- source input is deleted on terminal completion;
- LUNA is optional;
- deterministic R interpretation is normal fallback;
- local implementation is not production deployment.

- [ ] **Step 2: Update the current README files**

Remove descriptions of `app/api/open-sna/analyze/route.ts` as the active synchronous browser workflow. Document the validation and job endpoints, local commands, privacy boundary, and production configuration names.

- [ ] **Step 3: Verify docs and commit**

```bash
./node_modules/.bin/tsx --test tests/open-sna.test.ts
git add -- README.md analysis/open-sna/README.md tests/open-sna.test.ts
git diff --cached --check
git commit -m "docs: document recoverable Open SNA analysis"
```

Do not stage the historical QA report unless the user separately requests an updated report.

## Task 16: Run full automated, R, build, and privacy verification

**Files:**

- Modify only if a gate reveals a scoped defect.
- Record evidence under ignored `output/playwright/open-sna-reliability-i18n-20260828/`.

- [ ] **Step 1: Run the complete Node test suite**

```bash
npm test
```

Expected: every test passes; no skipped or pending Open SNA test.

- [ ] **Step 2: Run TypeScript and R gates**

```bash
npm run typecheck
npm run open-sna:r-preflight
npm run open-sna:r-regression
```

Expected: all exit 0; pinned R versions pass; the 40-item regression passes twice.

- [ ] **Step 3: Build with the known stable compiler path**

```bash
npm run build -- --webpack
```

Expected: production build succeeds; all localized Open SNA routes and API routes compile.

- [ ] **Step 4: Run hygiene and diff checks**

```bash
npm run release:hygiene
git diff --check
git status --short --branch
```

Expected: hygiene passes; no whitespace errors; only intentional tracked work plus the preserved untracked QA report.

- [ ] **Step 5: Run a secret and raw-data scan over the changed paths**

```bash
git diff origin/main...HEAD -- . ':!package-lock.json' | rg -n -i 'api[_-]?key\s*=|bearer [a-z0-9+/=_-]{20,}|password\s*=|records\s*:|rawData|private worker diagnostic'
```

Expected: no credential or raw-row match. Legitimate assertions about forbidden keys must be reviewed and documented rather than blindly removed.

## Task 17: Perform local three-language human-style browser acceptance

**Files:**

- Evidence only under: `output/playwright/open-sna-reliability-i18n-20260828/`
- Modify source only if a reproduced scoped defect is found and covered by a failing test first.

- [ ] **Step 1: Start the verified local runtime**

Run the local Next server with the isolated Open SNA job root and pinned R library. Record the exact HEAD SHA and port. Do not print secrets.

- [ ] **Step 2: Verify all three routes and responsive sizes**

Open:

```text
/en/open-sna
/zh-hant/open-sna
/zh-hans/open-sna
```

At 390×844, 768×1024, and 1440×900, verify localized page text, setup, job states, all eight panels, graph controls, tables, downloads, keyboard navigation, live regions, console errors, and document overflow.

- [ ] **Step 3: Verify authoritative validation and recovery**

Use synthetic fixtures to verify:

- no-group and under-20 workbooks fail before Run is enabled;
- the valid 40-item fixture validates and enables Run;
- replacing an in-flight validation cannot overwrite the new file state;
- a real 100-bootstrap job succeeds;
- a controlled delayed job survives page refresh;
- a simulated polling disconnect shows reconnecting and later resumes;
- manual task-ID recovery works;
- the same result can be retrieved twice;
- localStorage contains only job ID, locale, and timestamps.

- [ ] **Step 4: Verify LUNA fallback presentation**

With no OpenRouter key, prove the R job succeeds, the button says R analysis rather than R plus LUNA, and all three locales clearly identify the deterministic fallback as normal supported behavior.

- [ ] **Step 5: Inspect evidence and stop the server**

Capture only synthetic/aggregate evidence. Stop the local server, confirm temporary validation/job input directories are empty for terminal jobs, and preserve aggregate test evidence under ignored output paths.

## Task 18: Completion audit and final local commit state

**Files:**

- No new file unless the user requests a refreshed report.

- [ ] **Step 1: Audit every approved acceptance criterion**

Use the specification checklist at `docs/superpowers/specs/2026-08-28-open-sna-reliability-i18n-design.md` §15. For each item, record the exact source, test output, R output, build output, or browser evidence. Mark indirect or missing evidence as incomplete and continue working.

- [ ] **Step 2: Review the entire branch diff**

```bash
git diff --stat origin/main...HEAD
git diff --check origin/main...HEAD
git log --oneline --decorate origin/main..HEAD
git status --short --branch
```

Expected: coherent scoped commits; no unrelated worktree content; QA report still untracked unless separately authorized.

- [ ] **Step 3: Perform final tests after the last code change**

Repeat:

```bash
npm test
npm run typecheck
npm run open-sna:r-preflight
npm run open-sna:r-regression
npm run build -- --webpack
npm run release:hygiene
```

Expected: all gates pass from the final working state, not an earlier commit.

- [ ] **Step 4: Report the exact delivery boundary**

State separately:

- implemented and verified locally;
- committed branch and SHA;
- not pushed unless separately authorized;
- not merged unless separately authorized;
- not deployed unless separately authorized;
- no production queue/storage/browser proof unless separately authorized and actually performed.

Do not mark the active goal complete until all five product requirements and every acceptance criterion have current authoritative evidence.
