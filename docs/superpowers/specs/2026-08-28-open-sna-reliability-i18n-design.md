# Open SNA Reliability, Asynchronous Analysis, and Localization Design

**Status:** Approved by the user on 2026-08-28. The single-writer finalization wording was clarified during implementation-plan self-review without changing the approved product behavior.

**Decision:** Use 方案一. Open SNA requires one valid binary subgroup column. Production analysis uses a durable asynchronous job workflow. LUNA remains optional, and deterministic R interpretation is a normal supported result.

## 1. Purpose

This design resolves five verified Open SNA gaps as one coherent product change:

1. A valid 40-item workbook can produce an empty EBICglasso network, after which the R pipeline crashes because the qgraph centrality table can omit the `Strength` column.
2. The interface describes subgroup data as optional even though the R engine requires exactly two sufficiently large groups.
3. A 1,000-bootstrap analysis is executed through one long browser-to-Vercel-to-Cloud-Run connection, so a completed or nearly completed backend run can still be lost to the browser.
4. The `/zh-hant/open-sna` and `/zh-hans/open-sna` routes currently render the English workbench.
5. The interface presents R and LUNA as one required operation even though the production contract intentionally allows deterministic R interpretation when LUNA is not configured or is temporarily unavailable.

The design preserves the existing aggregate-only privacy boundary, eight-panel analysis model, fixed NPN plus EBICglasso profile, required NCT, and strict result validation.

## 2. Scope decomposition

The implementation is divided into three independently testable subprojects that share one final acceptance audit.

### 2.1 Statistical correctness and workbook contract

- Make an estimated empty network a valid result.
- Add a reproducible 80-row, 40-item empty-network XLSX regression fixture and an executable R regression test.
- Adopt the required binary subgroup contract from candidate commit `8120a4d`, subject to normal code review and conflict resolution.
- Validate the workbook with the authoritative R rules immediately after file selection and again when a job is created.

### 2.2 Durable asynchronous execution and interpretation policy

- Replace uploaded-workbook synchronous analysis with a job API for 100, 500, and 1,000 bootstrap runs.
- Provide a client-generated task ID, idempotent creation, polling, reconnect behavior, page-reload recovery, and repeatable aggregate-result retrieval.
- Use Google Cloud Tasks for durable execution and private Google Cloud Storage objects for bounded job state, temporary input, and aggregate output.
- Keep LUNA optional and cache one finalized interpretation outcome per job.

### 2.3 Complete localized workbench

- Translate the Open SNA page, setup workflow, job states, all eight panels, downloads, errors, accessibility labels, and graph controls into Traditional and Simplified Chinese.
- Preserve source-provided research identifiers and formal method names.
- Localize deterministic interpretation presentation and request the active language when optional LUNA is used.

## 3. Product invariants

The following invariants are non-negotiable:

- A successful uploaded analysis uses aggregate Open SNA schema `1.1`.
- A successful result contains exactly one valid binary subgroup column and an available NCT result.
- `Gender` has case-insensitive priority over other metadata columns.
- If a `Gender` column exists but is invalid, validation fails closed; the engine must not silently select a different metadata column.
- After listwise deletion across selected network items, every analyzed row has a non-empty group value and both groups have at least 20 rows.
- Uploaded workbooks, row-level responses, respondent identifiers, and worksheet names are never returned to the browser or sent to LUNA.
- `rawRowsIncluded` remains `false`.
- `uploadedWorkbookRetainedByEngine` remains `false` for a completed response. Temporary encrypted-at-rest job input is deleted immediately on terminal success or terminal failure and is also protected by a hard lifecycle expiry.
- A failed uploaded analysis is never replaced by the bundled demonstration result.
- LUNA failure or absence never changes a successful statistical job into a failed job.
- A browser connection is not the owner of a running analysis. Disconnecting, refreshing, or reopening the page does not cancel or lose the server-side job.
- Production services fail closed when authentication, storage, queue, or worker configuration is incomplete.

## 4. Empty-network statistical semantics

### 4.1 Root cause

`qgraph::centrality_auto(graph)$node.centrality` does not guarantee that every named centrality column exists for an all-zero graph. The current pipeline subsequently indexes `centrality[, "Strength"]` unconditionally. This raises `undefined columns selected` before the pipeline can emit aggregate JSON.

The fix must handle the network state explicitly rather than masking one indexing expression.

### 4.2 Defined metrics for an all-zero network

When the final regularized weight matrix contains no nonzero off-diagonal values:

| Metric | Result | Rationale |
|---|---:|---|
| Strength | `0` | Every node has zero incident absolute weight. |
| Expected influence | `0` | Every node has zero signed incident weight. |
| Betweenness | `0` | No node lies on a path between another pair. |
| Closeness | `null` | Closeness is not interpretable in a fully disconnected graph. |
| Bridge strength | `0` | No cross-community edge exists. |
| Bridge expected influence | `0` | No signed cross-community edge exists. |
| Bridge betweenness | `0` | No cross-community path exists. |
| Bridge closeness | `null` | Bridge closeness is not interpretable in a fully disconnected graph. |
| Edge array | empty | No nonzero regularized edge exists. |
| Density | `0` | Zero observed edges divided by the positive number of possible edges. |
| Mean absolute edge weight | `0` | There are no nonzero edge weights. |
| Strongest edge | `null` | No edge can be selected. |

Predictability remains a separately estimated MGM result and is not forced to zero merely because the EBICglasso network is empty.

### 4.3 Layout and stability behavior

- If qgraph returns valid finite coordinates, the existing normalized coordinates are used.
- If qgraph cannot lay out the empty graph, nodes receive deterministic circular coordinates ordered by item column and seeded by the existing analysis seed.
- Case-dropping centrality stability is not defined for a completely empty estimated network. The result still contains the four required stability entries, each with `coefficient: null` and `interpretation: "Not available"`.
- The result includes a bounded warning explaining that the estimated network has no nonzero edges and centrality stability is therefore unavailable.
- NCT remains required. An empty pooled network does not by itself skip subgroup comparison. A genuine NCT failure remains an analysis failure rather than a fabricated comparison.

### 4.4 Regression fixture and assertions

The repository will contain a deterministic, non-private fixture at:

`tests/fixtures/open-sna-empty-network-80x40.xlsx`

It contains:

- 80 rows;
- 40 consecutively numbered Likert items;
- 4 construct-prefix communities;
- one valid binary grouping column;
- 40 rows in each group;
- no respondent names or real research data;
- values chosen so the fixed seed and profile produce an empty regularized network.

The executable R regression test runs the real workbook pipeline with 100 bootstraps, 1,000 NCT permutations, and seed 2026. It asserts:

- process exit code zero;
- schema `1.1`;
- 80 analyzed rows;
- 40 nodes;
- 0 edges;
- density zero;
- strongest edge null;
- all four zero-valued centrality or bridge metrics have the defined values;
- closeness and bridge closeness serialize as null;
- the four stability entries are present and unavailable;
- the subgroup comparison is available;
- no raw rows or identifying fields are present;
- a second same-seed run has the same structural result after volatile timestamps are normalized.

## 5. Required subgroup contract and early validation

### 5.1 Selected product rule

Every accepted workbook must contain one safe, non-empty binary grouping column. The selection rules are:

1. Select a case-insensitive `Gender` column when present.
2. If no `Gender` column exists, select the first safe binary metadata column in worksheet order.
3. If `Gender` exists but is invalid, fail validation instead of falling through to another column.
4. Apply the existing optional owner-confirmed mapping only when the observed Gender codes are exactly `1` and `2`.
5. After listwise deletion over all selected network items, reject missing or blank group values.
6. Require exactly two distinct safe labels.
7. Require at least 20 analyzed rows in each group.

The same validated group column, labels, and counts populate the source summary and NCT result. A successful schema `1.1` response cannot omit or contradict subgroup analysis.

### 5.2 Validation lifecycle

File selection begins a short, authoritative validation request:

1. The browser rejects an empty file, a file larger than 5 MiB, and a non-XLSX extension without sending it.
2. The file-chooser help text states that selecting a file starts a temporary server-side validation; the browser enters `validating` state and disables Run.
3. `POST /api/open-sna/validate` performs the existing multipart, media-type, size, and ZIP-signature checks.
4. The Vercel adapter forwards the file to the authenticated worker validation endpoint in production. Local development executes the same R validation function locally.
5. R reads the workbook and applies the exact production item, community, missingness, variance, and subgroup rules without estimating a network.
6. The validation file is removed in `finally` before the response is returned.
7. A successful response contains only a safe summary.
8. Run becomes enabled only for the exact `File` object and validation fingerprint that passed.
9. Replacing or removing the file aborts the previous request and invalidates its summary.
10. Job creation revalidates the submitted bytes and fingerprint to prevent stale-client or time-of-check/time-of-use mismatch.

The safe validation response is:

```json
{
  "valid": true,
  "inputFingerprint": "sha256:<64 lowercase hex characters>",
  "summary": {
    "originalRows": 80,
    "analyzedRows": 80,
    "droppedRows": 0,
    "itemCount": 40,
    "communityCount": 4,
    "groupColumn": "Gender",
    "groupCounts": [
      { "group": "1", "n": 40 },
      { "group": "2", "n": 40 }
    ]
  }
}
```

The response never includes item values, workbook rows, file name, sheet name, IDs, or unrestricted R diagnostics.

## 6. Asynchronous job architecture

### 6.1 Service responsibilities

| Component | Responsibility |
|---|---|
| Browser | Generate and retain the task ID, upload, poll, reconnect, retrieve, and render. |
| Vercel adapter | Enforce public request limits, proxy with the worker secret, validate public responses, optionally finalize LUNA interpretation, and redact worker diagnostics. |
| Cloud Run worker | Revalidate the workbook, create durable job records, run R, validate aggregate results, delete source input, and expose authenticated status and result operations. |
| Cloud Tasks | Persist and retry the execution request independently of the browser and Vercel request lifetime. |
| Private Cloud Storage | Hold bounded job state, temporary input, raw aggregate R output, and finalized aggregate output. |

Vercel never receives Google Cloud credentials. It reaches the worker through the existing HTTPS plus Bearer-token boundary. The worker service account alone receives narrowly scoped Storage and Cloud Tasks permissions.

### 6.2 Public API

#### `POST /api/open-sna/jobs`

Accepts the validated XLSX, `bootstraps`, fixed `permutations`, locale, and `Idempotency-Key`.

The idempotency key is a UUID generated by the browser before upload. The job ID equals that UUID, so the browser knows the recovery identifier even if the creation response is lost.

Success returns HTTP 202:

```json
{
  "jobId": "7fcaef85-c542-4a9a-b592-f9ba88be59af",
  "status": "queued",
  "pollAfterMs": 2000,
  "expiresAt": "2026-08-29T08:00:00.000Z"
}
```

Submitting the same idempotency key and the same input fingerprint and settings returns the existing job. Reusing a key with different input or settings returns HTTP 409.

#### `GET /api/open-sna/jobs/:jobId`

Returns one public state:

- `queued`
- `running`
- `succeeded`
- `failed`
- `expired`

Queued and running responses include `pollAfterMs` and a `Retry-After` header. Failed responses contain only a bounded public code and localized-client message key. They do not contain R stderr, object names, storage paths, tokens, stack traces, worksheet names, or file names.

#### `GET /api/open-sna/jobs/:jobId/result`

- Returns HTTP 200 and a strict aggregate `OpenSnaResult` when the job has succeeded.
- Returns HTTP 409 while the job is queued or running.
- Returns the bounded terminal failure when the job has failed.
- Returns HTTP 410 after expiry.
- Returns HTTP 404 for a well-formed but unknown ID.
- Can be called repeatedly until expiry without rerunning R or LUNA.

### 6.3 Worker and internal API

The worker exposes the same job create, status, and result operations behind the existing Bearer service token. It also exposes:

`POST /api/open-sna/internal/jobs/:jobId/run`

Only Google Cloud Tasks can call this route. Authentication uses an OIDC token whose audience and service-account identity are verified. The public worker Bearer token is not embedded in Cloud Task payloads.

The runner is idempotent:

- `succeeded`, `finalized`, `failed`, and `expired` jobs are not rerun.
- A queued job is claimed with a generation-match conditional state write.
- A running job has a bounded lease. A retry may reclaim it only after the lease expires.
- Each attempt is counted and bounded.
- Permanent workbook or analysis failures become terminal and acknowledge the task.
- Transient infrastructure failures return a retryable HTTP status until the attempt limit is reached.
- The input object is deleted immediately after terminal success or terminal failure.

### 6.4 Durable objects

Each job uses opaque object names under a random UUID prefix:

```text
jobs/<job-id>/state.json
jobs/<job-id>/input.xlsx
jobs/<job-id>/result-r.json
jobs/<job-id>/result.json
```

`state.json` contains only:

- schema version;
- job ID;
- status;
- timestamps and expiry;
- bootstraps, permutations, seed, and locale;
- input SHA-256 fingerprint;
- attempt count and lease expiry;
- bounded failure code;
- boolean flags indicating which aggregate result objects exist;
- finalization status and a bounded finalization lease expiry.

It does not contain source file names, sheet names, row data, item values, respondent identifiers, group labels, node labels, raw stderr, secrets, or signed URLs.

### 6.5 Queue and runtime limits

- Queue maximum concurrent dispatches: 1.
- Worker Cloud Run maximum instances: 1.
- Worker container concurrency: 1.
- R analysis timeout: 600 seconds.
- Cloud Task dispatch deadline: 900 seconds.
- Cloud Run request timeout: 900 seconds.
- Result size limit: 2 MiB.
- Captured R stderr limit: 64 KiB, retained only in private runtime diagnostics and never in public responses.
- Job lifetime: 24 hours.
- Cloud Storage lifecycle rule: delete every `jobs/` object after one day as a second cleanup boundary.

The queue settings prioritize determinism and bounded resource use over parallel throughput. Load expansion is outside this change and requires measured CPU, memory, queue latency, and privacy review.

### 6.6 Client recovery behavior

Before uploading, the browser stores this bounded record in `localStorage`:

```json
{
  "jobId": "7fcaef85-c542-4a9a-b592-f9ba88be59af",
  "locale": "zh-hant",
  "createdAt": "2026-08-28T08:00:00.000Z",
  "expiresAt": "2026-08-29T08:00:00.000Z"
}
```

No file name, workbook content, group label, node label, or result is stored locally.

The client behavior is:

- Poll every 2 seconds while queued, then every 5 seconds while running.
- Use one in-flight poll at a time.
- Abort polls when the component unmounts or the user deliberately dismisses a terminal job.
- Treat a network error as `reconnecting`, not as an analysis failure.
- Resume polling after browser online events and bounded backoff.
- On page load, detect an unexpired saved job, automatically resume polling, and show a dismissible recovery status without requiring the workbook again.
- Show the active task ID with a copy control, and provide a recovery field that accepts a valid task ID so an aggregate result can be reopened on another visit before expiry.
- When status becomes succeeded, fetch the result through the separate result endpoint.
- Permit the same result to be fetched again by task ID until expiry.
- Clear the local recovery record after the user dismisses a terminal result or after confirmed expiry.

## 7. LUNA finalization

### 7.1 Product decision

LUNA is an optional interpretation enhancement. Production is valid and fully functional without an OpenRouter key. No new credential is required by this change.

The primary action is named `Run R analysis`, not `Run R + LUNA analysis`.

The setup and interpretation panels state that:

- statistics are produced by the pinned R workflow;
- optional AI, when available, receives aggregate statistics only;
- deterministic R interpretation is shown when AI is unconfigured or unavailable;
- AI availability does not affect statistical job success.

### 7.2 Single-writer finalization per job

The Cloud Task stores a strict aggregate R result as `result-r.json`, deletes the input, and marks the statistical job succeeded. The first public result retrieval then performs finalization through Vercel:

1. Vercel atomically claims a bounded finalization lease through the authenticated worker.
2. The lease winner obtains the strict R result from the worker.
3. Vercel calls `withLunaInterpretation` using the job locale when an API key is configured.
4. Missing or unavailable LUNA produces the deterministic result plus one bounded warning.
5. Vercel sends the strict finalized aggregate result back to the worker.
6. The worker verifies the result contract, input fingerprint, settings, privacy fields, and job identity before conditionally writing `result.json` and marking finalization complete.
7. Concurrent non-winners receive a bounded `RESULT_FINALIZING` response with `Retry-After`; they do not call LUNA.
8. If the lease owner disappears, another request may reclaim only an expired lease. A provider call interrupted after upstream completion but before local persistence may be retried, but persisted aggregate output remains single-writer.
9. Later reads return `result.json` without calling LUNA again.

This keeps the OpenRouter credential in Vercel, preserves the current aggregate-only AI boundary, prevents concurrent duplicate calls, and prevents any new AI call after a finalized result has been persisted.

### 7.3 Language behavior

- English jobs request English LUNA output.
- Traditional Chinese jobs request Traditional Chinese used in Hong Kong.
- Simplified Chinese jobs request Simplified Chinese.
- The response schema and five required insight IDs remain language-independent.
- If LUNA output fails validation, the deterministic R result remains final.

## 8. Localization design

### 8.1 Copy boundary

Open SNA receives a dedicated strongly typed dictionary in `lib/open-sna-copy.ts` rather than expanding the already large global `lib/i18n.ts` object. The file exports:

- `OpenSnaCopy` type;
- complete `en`, `zh-hant`, and `zh-hans` dictionaries;
- `getOpenSnaCopy(locale)`;
- locale-aware number formatting helpers;
- stable translation keys for public job errors and states.

The server page obtains one dictionary and passes the serializable copy plus locale to client components. Every locale must satisfy the same TypeScript shape.

### 8.2 Translation coverage

The translated surface includes:

- localized metadata title and description;
- skip link, hero, calls to action, method summary, and privacy summary;
- file chooser, drag-and-drop, validation progress, validation summary, and validation errors;
- bootstrap labels and method settings;
- task ID, copy/recover controls, queued/running/reconnecting/succeeded/failed/expired states;
- reference-result controls;
- eight panel labels, short labels, descriptions, progress, and previous/next navigation;
- metric cards, data contract, group counts, warnings, table captions, search, sorting, empty searches, and downloads;
- NetworkGraph zoom, reset, threshold, within-community toggle, selected-node inspector, keyboard instructions, and accessible edge list;
- NCT, predictability, stability, and interpretation explanations;
- LUNA optional/fallback language;
- all `aria-label`, visually hidden instructions, live-region status text, and error announcements.

### 8.3 Preserved source terminology

The application does not translate or reinterpret:

- workbook-provided node labels;
- community labels;
- subgroup labels;
- package names and versions;
- model identifiers;
- EBICglasso, NCT, CS, R-squared, and other formal abbreviations where translation would change the research identifier.

### 8.4 Deterministic interpretation presentation

The R result keeps stable insight IDs and aggregate evidence. When `thirdPartyAiUsed` is false, the client renders localized deterministic titles, evidence labels, narrative templates, and cautions from those IDs and result metrics instead of displaying English R prose verbatim.

Unknown runtime warnings remain bounded and are shown as engine diagnostics. Known Open SNA and LUNA warnings use stable keys and localized messages.

### 8.5 Route and metadata semantics

- The page wrapper and workbench use the active locale language, not fixed `lang="en"`.
- `/en/open-sna`, `/zh-hant/open-sna`, and `/zh-hans/open-sna` each receive localized metadata.
- Each route is self-canonical after translation is complete.
- Metadata alternates link all three locale routes.
- The sitemap contains all three routes.
- Existing navigation ordering between Mission and News is preserved.

## 9. Component and module boundaries

The implementation may split the current large route and workbench only along responsibilities required by this design.

### 9.1 Shared contracts and services

```text
lib/open-sna.ts
lib/open-sna-copy.ts
lib/open-sna-job-contract.ts
lib/open-sna-job-store.ts
lib/open-sna-job-queue.ts
lib/open-sna-runner.ts
lib/open-sna-workbook-validation.ts
lib/open-sna-ai.ts
```

- `open-sna.ts` owns the strict aggregate analysis result.
- `open-sna-copy.ts` owns localized presentation copy.
- `open-sna-job-contract.ts` owns public and private job-state types and validators.
- `open-sna-job-store.ts` owns conditional state transitions and bounded object retention.
- `open-sna-job-queue.ts` owns Cloud Tasks and local queue adapters.
- `open-sna-runner.ts` owns R child-process execution, timeout, output limits, and error classification.
- `open-sna-workbook-validation.ts` owns shared upload-envelope checks and the R validation invocation.
- `open-sna-ai.ts` retains the aggregate-only interpretation boundary and adds a requested output locale.

### 9.2 Routes

```text
app/api/open-sna/validate/route.ts
app/api/open-sna/jobs/route.ts
app/api/open-sna/jobs/[jobId]/route.ts
app/api/open-sna/jobs/[jobId]/result/route.ts
app/api/open-sna/internal/jobs/[jobId]/run/route.ts
```

The existing synchronous `app/api/open-sna/analyze/route.ts` remains temporarily available only as a compatibility boundary while tests and callers migrate. It is removed or changed to a bounded deprecation response before final completion so the 1,000-bootstrap browser path cannot silently fall back to synchronous behavior.

### 9.3 Client components

```text
components/open-sna/OpenSnaWorkbench.tsx
components/open-sna/OpenSnaSetup.tsx
components/open-sna/OpenSnaJobStatus.tsx
components/open-sna/OpenSnaResults.tsx
components/open-sna/NetworkGraph.tsx
```

- `OpenSnaWorkbench` coordinates source selection, validated file identity, job recovery, and active result.
- `OpenSnaSetup` owns file selection, validation, settings, and submission.
- `OpenSnaJobStatus` owns task ID, polling, reconnect, expiry, and recovery controls.
- `OpenSnaResults` owns the eight-panel navigation and result presentation.
- `NetworkGraph` remains responsible only for graph interaction and receives a bounded localized copy subset.

The split is not a general redesign. Existing visual hierarchy, responsive behavior, keyboard semantics, and result interactions remain intact unless a change is required by localization or asynchronous state.

## 10. Local development and test adapters

Production requires Cloud Tasks and Cloud Storage. Local development must not require cloud credentials.

- The local job store uses an isolated directory under `/Volumes/Starship/`.
- Local state and aggregate results are written atomically.
- Local source files receive the same terminal cleanup behavior.
- The local queue uses one in-process runner and the same job-state transitions.
- On local server restart, a status request may reclaim an expired running lease or schedule a queued job from the local durable state.
- Automated unit tests inject in-memory store and queue adapters; route tests do not contact Google Cloud.
- Vercel production fails closed if the remote worker, job bucket, queue, service authentication, or required URLs are incomplete.

## 11. Error contract

Public error codes are stable and bounded:

- `WORKBOOK_INVALID`
- `VALIDATION_UNAVAILABLE`
- `JOB_CONFIGURATION_INVALID`
- `JOB_CONFLICT`
- `JOB_NOT_FOUND`
- `JOB_EXPIRED`
- `JOB_NOT_READY`
- `JOB_QUEUE_UNAVAILABLE`
- `WORKER_UNAUTHORIZED`
- `WORKER_CONFIGURATION_INVALID`
- `R_RUNTIME_NOT_READY`
- `R_ANALYSIS_FAILED`
- `R_ANALYSIS_TIMED_OUT`
- `RESULT_CONTRACT_INVALID`
- `R_ENGINE_UNAVAILABLE`

The client maps these codes to the active language. Unknown internal exceptions become one generic localized service error. No private diagnostic is copied into a browser response.

## 12. Security and privacy controls

- Validate upload size before and after multipart parsing.
- Accept only `.xlsx`, the approved media types, and the ZIP signature.
- Preserve the 5 MiB compressed upload limit and add gateway controls for expanded ZIP size and entry count.
- Use random UUID job IDs and strict route validation.
- Use generation preconditions for job creation and state transitions.
- Prevent public bucket access and signed-result URLs.
- Use service-account identity for Cloud Tasks internal execution.
- Keep the Vercel-to-worker token at least 32 characters and server-only.
- Keep OpenRouter credentials server-only in Vercel.
- Use no-store responses for validation, job status, and results.
- Do not log multipart bodies, source file names, worksheet names, group labels, node labels, result JSON, tokens, or unbounded stderr.
- Delete local validation files before response.
- Delete job input immediately on terminal status.
- Enforce one-day object lifecycle deletion.
- Validate every worker result again at the Vercel boundary.
- Preserve the aggregate-only LUNA payload and zero-data-retention provider requirements.

## 13. Deployment changes and boundary

The implementation updates the Cloud Run deployment assets to:

- enable Cloud Tasks and Cloud Storage APIs;
- create or verify a regional private bucket;
- apply public-access prevention, uniform access, and one-day lifecycle deletion;
- create or verify a single-concurrency queue;
- grant the worker service account only the required object and task permissions;
- configure the Cloud Tasks OIDC service identity;
- set project, region, queue, bucket, worker URL, audience, and retention environment variables;
- raise the worker and task deadline to the approved bounds;
- preserve 8 vCPU, 16 GiB, one container request, and one maximum instance.

Implementation and local verification do not authorize deployment. A production change still requires separate owner authorization and must prove the exact source SHA, worker revision, Vercel revision, environment configuration, queue, bucket lifecycle, direct authenticated probes, public browser workflow, and post-run source deletion.

## 14. Test strategy

### 14.1 Test-driven order

Every behavior change follows red, green, and refactor:

1. Add the smallest failing automated test.
2. Run it and confirm it fails for the intended missing behavior.
3. Implement the minimum production behavior.
4. Run the focused test and relevant neighboring suite.
5. Refactor only while tests remain green.

### 14.2 Required automated coverage

Statistical and contract tests:

- real 40-item empty-network regression;
- safe metric extraction when qgraph omits columns;
- deterministic empty-network layout fallback;
- unavailable empty-network stability;
- schema `1.1` success requirements;
- invalid no-group, three-group, missing-group, unsafe-label, and under-20-group fixtures;
- valid `Gender` priority and valid binary metadata fallback;
- invalid `Gender` fail-closed behavior;
- exact source and NCT count agreement.

Validation and job tests:

- immediate validation success and every bounded validation failure;
- validation temporary-file removal;
- job creation with client-generated UUID;
- idempotent replay with identical input;
- conflict on changed input or settings;
- queued, running, succeeded, failed, expired, and unknown status responses;
- one active runner and one queue dispatch at a time;
- lease reclaim after interruption;
- Cloud Task duplicate delivery;
- source deletion on success and terminal failure;
- repeat result reads without rerunning R or LUNA;
- lifecycle configuration and public-access prevention in the deployment script;
- private worker diagnostics never reach the public adapter.

Localization and UI tests:

- exact key parity across three dictionaries;
- localized metadata, language attributes, alternates, and sitemap;
- no fixed English workbench wrapper on Chinese routes;
- translated setup, validation, task, panel, graph, table, download, error, privacy, and ARIA copy;
- locale-aware number formatting;
- deterministic interpretation rendering for all five stable insight IDs;
- LUNA locale instruction and fallback copy;
- saved-job recovery parsing and expiry handling.

### 14.3 Final local gates

The final local verification runs:

```text
npm test
npm run typecheck
npm run open-sna:r-preflight
npm run open-sna:r-regression
npm run build -- --webpack
npm run release:hygiene
git diff --check
```

### 14.4 Browser acceptance

Browser verification uses only synthetic non-private XLSX fixtures and covers:

- English, Traditional Chinese, and Simplified Chinese;
- 390×844, 768×1024, and 1440×900 viewports;
- file selection and automatic authoritative validation;
- validation failure followed by valid-file recovery;
- 100-bootstrap real local job completion;
- a controlled long-running 1,000-bootstrap job;
- visible task ID;
- page refresh during running state;
- simulated polling connection loss and automatic reconnect;
- result retrieval twice by the same job ID;
- all eight result panels;
- graph controls, keyboard navigation, tables, downloads, live regions, and responsive overflow;
- page and console errors;
- confirmation that no source row or identifier appears in browser payloads or storage.

Production verification, if separately authorized, repeats the 1,000-bootstrap synthetic flow against the exact deployed SHA and additionally verifies Cloud Task state, source-object deletion, aggregate-result reread, LUNA fallback labeling, and one-day lifecycle configuration.

## 15. Acceptance criteria

The objective is complete only when all of the following are proven against the current implementation state:

1. The exact 40-item empty-network workbook completes without a missing-Strength error and produces the specified aggregate semantics.
2. The 40-item regression is executable, passes twice with structural same-seed equivalence, and is part of the documented verification gate.
3. The UI states that a binary subgroup is required and automatically applies the authoritative R validation before enabling analysis.
4. Frontend, R, TypeScript, reference JSON, AI input, documentation, and tests agree on schema `1.1` and mandatory NCT.
5. Uploaded analysis uses a job ID and no longer depends on a long browser request.
6. Polling, network reconnect, page reload, idempotent creation, and repeated result retrieval are verified.
7. Production job state and aggregate output are durable for the bounded retention period, while source input is deleted immediately on terminal status.
8. The complete Open SNA workbench is meaningfully different and correctly localized on both Chinese routes, including interactive, error, accessibility, and interpretation states.
9. LUNA is clearly optional, an unconfigured or failed LUNA call does not fail R, and finalized results do not trigger repeated AI calls.
10. Unit, route, R regression, type, build, hygiene, privacy, and browser gates pass.
11. The final handoff distinguishes local implementation, commit state, push state, deployment state, and live production proof.

## 16. Non-goals

This change does not:

- enable arbitrary subgroup counts;
- make NCT optional in a successful schema `1.1` result;
- increase the 5 MiB workbook limit, 5,000-row limit, 40-item limit, or eight-community limit;
- translate user-provided labels or alter workbook data;
- infer the semantic meaning of numeric Gender codes without an owner-confirmed mapping;
- add parallel R execution or advertise high-throughput service capacity;
- retain uploaded workbooks for later research use;
- make LUNA mandatory;
- configure, purchase, reveal, or deploy an OpenRouter credential;
- push, merge, deploy, or change production infrastructure without separate authorization;
- replace a failed upload with reference data.

## 17. Integration sequence

After this specification is approved in written form:

1. Create the detailed TDD implementation plan.
2. Review and cherry-pick candidate commit `8120a4d` onto `codex/open-sna-reliability-i18n`, staging no unrelated paths.
3. Prove the candidate subgroup contract tests before extending it.
4. Implement and verify the empty-network correction.
5. Implement authoritative validation.
6. Implement shared job contracts, local adapters, and job APIs.
7. Implement Cloud Storage, Cloud Tasks, leases, retention, and deployment assets.
8. Migrate the browser to asynchronous jobs and recovery.
9. Implement complete localized copy and component boundaries.
10. Implement single-writer optional interpretation finalization.
11. Run focused tests after each slice and the full acceptance audit at the end.
12. Commit only reviewed, verified paths. Do not push or deploy without separate authorization.
