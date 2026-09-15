# Open SNA + R analysis — repository map

Investigation of `HUDongpin/sna` focused on Open SNA. `main` at the time of the map was `f5a19779d84cf8d670aae069c199a1cd811c8667` (the live `/api/health` fingerprint from the 2026-09-14 production QA). Locale/`api` routing is documented as implemented in this tree (`dynamicParams = false` plus `app/api/open-sna/route.ts`).

## 1. Top-level layout

This is a **single Next.js App Router app**, not a package monorepo.

| Area | Path | Role |
| --- | --- | --- |
| Next.js app | `app/` | Localized pages + API route handlers |
| UI components | `components/` | Site chrome; Open SNA workbench under `components/open-sna/` |
| Shared TS | `lib/` | i18n, Open SNA contracts, R-config, LUNA, News/Academy corpora |
| R engine | `analysis/open-sna/` | CLI runner, `renv.lock`, preflight, R regressions |
| Static assets | `public/` | Demo JSON at `public/open-sna/` |
| Aliyun deploy | `deploy/aliyun/` | Compose, env examples, Nginx, preflight/verify scripts |
| Worker image | `Dockerfile.open-sna-worker` | R 4.4.2 + Next standalone server for worker mode |
| Web image | `Dockerfile.web` | Next standalone (`OPEN_SNA_CONTAINER_BUILD=1`) |
| Historical research R | `New Programming Resilience/` | Source analyses; **not** the production runner |

There is **no** `vercel.json` and **no** feature-flag service. Knobs are environment variables plus `SNA_DEPLOYMENT_ROLE`.

Public HTTP APIs in this repo are:

- `GET /api/health` → `app/api/health/route.ts`
- `POST /api/open-sna/analyze` → `app/api/open-sna/analyze/route.ts`
- `GET|POST|… /api/open-sna` → `app/api/open-sna/route.ts` (JSON 404 stub; not an analysis endpoint)

## 2. Path inventory

### UI (Open SNA workbench)

| Concern | Path |
| --- | --- |
| Localized page | `app/[locale]/open-sna/page.tsx` |
| Workbench (upload, tabs, fetch) | `components/open-sna/OpenSnaWorkbench.tsx` |
| Network SVG | `components/open-sna/NetworkGraph.tsx` |
| Result contract + CSV | `lib/open-sna.ts` |
| Client error-code mapping | `lib/open-sna-errors.ts` |
| Copy / nav | `lib/i18n.ts` (`nav.openSna`) |

Canonical URL is `/en/open-sna`. `next.config.mjs` redirects bare `/open-sna` → `/en/open-sna`. The workbench is English even inside `/zh-hant` and `/zh-hans` shells.

Client loads the reference demo from **`/open-sna/programming-resilience-demo.json`** (`public/open-sna/programming-resilience-demo.json`). Upload `FormData` matches QA:

- `workbook` — XLSX `File`
- `bootstraps` — `"100"` \| `"500"` \| `"1000"` (UI default `"1000"`)
- `permutations` — always `"1000"`

Client pre-checks: `.xlsx` suffix, non-empty, ≤ 5 MiB. It does **not** parse Likert/group schema in the browser.

### API

| Method | Path | File | Notes |
| --- | --- | --- | --- |
| GET | `/api/health` | `app/api/health/route.ts` | JSON: `status`, `releaseSha`, `deploymentRole`, `rAnalysis` |
| POST | `/api/open-sna/analyze` | `app/api/open-sna/analyze/route.ts` | Only exported handler; GET is framework 405 |
| GET/POST/… | `/api/open-sna` | `app/api/open-sna/route.ts` | JSON 404 `NOT_FOUND`; occupies the path so `[locale]` cannot match `locale=api` |

The analyze POST envelope is parsed even when the kill switch is on. If a workbook is present, the Node precheck (`lib/open-sna-workbook-schema.ts`, same rules as R `read_and_validate_workbook` / `--mode validate`) can return **`422 WORKBOOK_INVALID`**. A valid workbook with `OPEN_SNA_R_DISABLED=1` still returns **`503 R_ENGINE_DISABLED`** and never substitutes the demo JSON. Empty or non-workbook requests stay `R_ENGINE_DISABLED` while disabled.

### R worker / engine integration

Same Next route serves three modes:

```
Browser  --POST multipart-->  Next /api/open-sna/analyze
                                  |
                                  | parse workbook envelope
                                  | schema precheck (Node, same rules as R --mode validate)
                                  |   invalid --> 422 WORKBOOK_INVALID
                                  |
                                  | OPEN_SNA_R_DISABLED=1  --> 503 R_ENGINE_DISABLED
                                  |
                                  +--> if OPEN_SNA_R_API_URL + TOKEN valid
                                  |      HTTPS forward to worker /api/open-sna/analyze
                                  |      (Bearer token; 255s abort)
                                  |
                                  +--> else if process.env.VERCEL
                                  |      503 R_ENGINE_NOT_CONFIGURED
                                  |
                                  +--> else spawn Rscript analysis/open-sna/analyze.R
                                         worker mode: OPEN_SNA_R_WORKER_MODE=1
                                         local mode:  tmp under /Volumes/Starship/
```

| Concern | Path |
| --- | --- |
| Engine URL/token validation | `lib/open-sna-config.ts` |
| R CLI | `analysis/open-sna/analyze.R` |
| Package pin check | `analysis/open-sna/preflight.R` |
| Lockfile | `analysis/open-sna/renv.lock` |
| Worker deploy notes | `analysis/open-sna/WORKER_DEPLOYMENT.md` |
| Method/schema contract | `analysis/open-sna/README.md` |
| Cloud Run build | `cloudbuild.open-sna-worker.yaml`, `scripts/deploy-open-sna-worker-cloud-run.sh` |
| Aliyun loopback worker | `deploy/aliyun/compose.yaml` (`127.0.0.1:3101`) |

R stderr `OPEN_SNA_ERROR_CODE=WORKBOOK_INVALID|R_RUNTIME_NOT_READY|R_ANALYSIS_FAILED` is mapped to public JSON. The worker captures a **tail** of R stderr (64 KiB) only to parse that code; it never returns stderr to the browser. On non-zero R exit it writes one JSON log line `open_sna_r_failed` with `failureCode`, `exitCode`, `timedOut`, `stderrEmpty`, and a path-stripped `Open SNA analysis failed:` detail. Worker concurrency: in-process `activeWorkerJobs`; second job → **`429 WORKER_BUSY`**. Timeout → **`504 R_ANALYSIS_TIMEOUT`**. Worker `500 R_ANALYSIS_FAILED` is forwarded as **`502 R_ANALYSIS_FAILED`** with the engine-failed message and an optional path-stripped `detail` excerpt. Vercel forwards the workbook with `FormData.append("workbook", blob, "input.xlsx")` (standalone copied bytes; not `File([bytes])`, which undici can serialize as an empty part). A 200 worker body that is not a matching Open SNA result becomes **`502 R_ENGINE_CONTRACT_FAILED`** and logs `open_sna_remote_engine_failed` with `REMOTE_ENGINE_CONTRACT_FAILED`. `R_ENGINE_UNAVAILABLE` is reserved for transport failures (network, abort, non-JSON error bodies). The browser mapper treats 500/502 + `R_ANALYSIS_FAILED` as analysis-failed, not unavailable.

### Workbook validation (where it actually lives)

| Layer | What it checks | Path |
| --- | --- | --- |
| Browser | extension, empty, 5 MiB | `OpenSnaWorkbench.tsx` |
| Next adapter | multipart, MIME, ZIP `PK\x03\x04`, size, bootstraps/permutations | `app/api/open-sna/analyze/route.ts` |
| Node precheck (live, including when R is disabled) | one sheet, Likert 1–5, construct prefixes, binary Gender/metadata, ≥20/group, variability | `lib/open-sna-workbook-schema.ts` (mirrors R `read_and_validate_workbook`) |
| R `--mode validate` / full analyze | same schema, then estimation | `analysis/open-sna/analyze.R` |
| TS guard for `--mode validate` JSON | fingerprint + aggregate summary only | `lib/open-sna-workbook-validation.ts` |
| Result JSON v1.1 | eight panels’ contract | `lib/open-sna.ts` `isOpenSnaResult` |

Public sample workbook: `public/open-sna/programming-resilience-sample.xlsx` (synthetic Likert + Gender F/M; linked from the workbench). Schema: one sheet, 16 items `Cmt|Cnf|Cop|Cmp` 1–4, Gender `F`/`M` with 25 rows each, Likert 1–5, no IDs. That file **passes** Node/R validation. `R_ANALYSIS_FAILED` after a valid upload is **not** a Gender+Likert schema miss; it is a post-validate estimation/runtime failure. The only full-analysis R regression is `tests/fixtures/open-sna-empty-network-80x40.xlsx`, which skips qgraph spring layout, `networktools::bridge`, and `bootnet` because the estimated graph has no edges. The public sample is uncorrelated noise and may or may not take that empty-network shortcut. The aggregate demo remains `public/open-sna/programming-resilience-demo.json`.

## 3. How `rAnalysis` is enabled/disabled

Health (`app/api/health/route.ts`):

- `rAnalysis` is `"disabled"` iff `OPEN_SNA_R_DISABLED === "1"`.
- Otherwise it is `"configured"` only if `readOpenSnaEngineConfigurationStatus()` succeeds.
- HTTP 200 also requires a 40-char SHA (`SNA_RELEASE_SHA` or `VERCEL_GIT_COMMIT_SHA`) and `SNA_DEPLOYMENT_ROLE` ∈ `{aliyun-primary, vercel-backup}`.
- If the kill switch is **off** and the engine is **not** configured, health is **`503 DEPLOYMENT_HEALTH_MISCONFIGURED`**. You cannot report healthy `rAnalysis: "configured"` without a valid worker URL+token.

Allowed roles are labels only. **`vercel-backup` does not by itself disable R**; the live disable is the kill switch. QA’s `deploymentRole: "vercel-backup"` + `rAnalysis: "disabled"` matches `deploy/aliyun/env/vercel.env.example`.

Tracked env contracts (non-secret):

| File | Role | R default |
| --- | --- | --- |
| `deploy/aliyun/env/vercel.env.example` | `vercel-backup` | `OPEN_SNA_R_DISABLED=1` (no worker URL) |
| `deploy/aliyun/env/web.env.example` | `aliyun-primary` | `OPEN_SNA_R_DISABLED=1` (URL/token commented) |
| `deploy/aliyun/env/worker.env.example` | worker | `OPEN_SNA_R_WORKER_MODE=1` |
| `.env.example` | local/Vercel docs | URL+token empty; no kill switch documented there |

Compose **must not** override `OPEN_SNA_R_DISABLED` / URL / token; those live in root-owned `/opt/sna/secrets/web.env`. Current Aliyun runbook (`deploy/aliyun/RUNBOOK.md`) is an **origin-only soak**: public R is forbidden until an alert group and an approved enablement. PR #6 (`codex/sna-origin-disabled-rollout-20260831`) is that fail-closed rollout.

### What must be true for `rAnalysis` enabled in production

All of the following on the process that serves `www.sna.hk`:

1. `OPEN_SNA_R_DISABLED` is **not** the string `1` (unset or any other value).
2. `SNA_DEPLOYMENT_ROLE` is `aliyun-primary` or `vercel-backup`.
3. `SNA_RELEASE_SHA` or `VERCEL_GIT_COMMIT_SHA` is a 40-character hex SHA.
4. **Both** `OPEN_SNA_R_API_URL` and `OPEN_SNA_R_API_TOKEN` pass `lib/open-sna-config.ts`:
   - URL is exact `https://<host>[:port]/api/open-sna/analyze` (HTTPS only; no userinfo, query, fragment, or extra path).
   - Token is ≥32 visible ASCII (`0x21–0x7e`), not a placeholder (`replace-with-`, `example-`, `placeholder`, `<…>`).
5. The worker behind that URL is up with `OPEN_SNA_R_WORKER_MODE=1`, the **same** token as `OPEN_SNA_R_WORKER_TOKEN`, R 4.4.2 + pinned packages, and tmp under `/tmp/open-sna-*` or `/var/tmp/open-sna-*`.
6. If the public site is still Vercel, the worker must be reachable **from Vercel over public HTTPS** (historical Cloud Run path in `WORKER_DEPLOYMENT.md`). Aliyun’s worker on `127.0.0.1:3101` is invisible to Vercel until Nginx `worker.sna.hk` (or equivalent) is cut over.

Then `GET /api/health` should show `rAnalysis: "configured"` and POST analyze can leave the kill-switch branch. LUNA is independent (see §4).

**Vercel does not run R.** On Vercel, missing URL+token after the kill switch is off yields `R_ENGINE_NOT_CONFIGURED`, not a local `Rscript`.

## 4. LUNA / OpenRouter

Present. Server-only, after a **successful** R (or forwarded worker) result.

| Concern | Path / value |
| --- | --- |
| Integration | `lib/open-sna-ai.ts` |
| Model pin | `openai/gpt-5.6-luna` (`LUNA_MODEL`) |
| Credential | `OPENROUTER_API_KEY` (never `NEXT_PUBLIC_`) |
| Endpoint | `https://openrouter.ai/api/v1/chat/completions` |
| Privacy routing | `provider.data_collection: "deny"`, `provider.zdr: true` |
| Payload | `buildOpenSnaInterpretationInput()` — aggregate stats only; no rows, IDs, fingerprint, file names |
| Failure | Result stays usable; warning that LUNA is not configured / unavailable; R interpretation kept |

Wired from `app/api/open-sna/analyze/route.ts` via `withLunaInterpretation`. The bundled demo sets `privacy.thirdPartyAiUsed: false` (no live AI on reference load). Upload-path LUNA cannot be QA’d while R is disabled.

## 5. Locale routing and `api` as a locale

Supported prefixes: **`en`**, **`zh-hant`**, **`zh-hans`** (`lib/i18n.ts`). `isLocale("api")` is false. Root `/` redirects to `/en`.

The `[locale]` segment sets `export const dynamicParams = false` next to `generateStaticParams` in `app/[locale]/layout.tsx`, so unknown first segments (including `api`) are not rendered as locale pages.

`GET /api/open-sna` is owned by `app/api/open-sna/route.ts` and returns JSON `{ code: "NOT_FOUND" }` with HTTP 404. That static `app/api/...` handler wins over `app/[locale]/open-sna`. `POST /api/open-sna/analyze` remains `app/api/open-sna/analyze/route.ts` and is a more specific sibling, not replaced by the stub.

`/api/health` and `/api/open-sna/analyze` are the real App Router handlers.

## 6. Suggested next engineering fixes (ranked)

1. **Read `open_sna_r_failed` on the worker** after a 500 `R_ANALYSIS_FAILED`. Public JSON never includes R stderr. Empty `stderrEmpty: true` with a non-zero exit (often 137) usually means the process was killed (OOM on the Aliyun worker at 1.5 CPU / 2560 MiB) before R could write `OPEN_SNA_ERROR_CODE`. A `detail` line is the redacted R message.
2. **Serve uploads from a host with R actually enabled** — highest user impact. Today both Vercel-backup and Aliyun-primary env examples keep `OPEN_SNA_R_DISABLED=1`. Enabling is an ops/cutover decision (worker HTTPS, matching tokens, kill switch off), not a missing feature in the workbench.
3. **Confirm `GET /api/health` on `www.sna.hk` after cutover** — `rAnalysis` must be `"configured"`, role must be the process you think is serving apex, SHA must match the intended release. Do not assume Aliyun-primary is live while health says `vercel-backup`.
4. **Optional: richer client-side schema** so users see `WORKBOOK_INVALID` before POST. The server already prechecks uploads while R is disabled.
5. **Async job/queue** — `analysis/open-sna/README.md` still calls the 255s synchronous path not production-qualified (empty-network regression ~193s). Needed before advertising HA or 1000-bootstrap as reliable on the public host. The workbench default is 1,000 bootstraps; Aliyun `sna-r-worker` is far below the 8 vCPU / 16 GiB starting point in `WORKER_DEPLOYMENT.md`.

Do not treat flipping `OPEN_SNA_R_DISABLED` alone as enough: health will go 503 unless URL+token are valid, and Vercel still cannot spawn R.
