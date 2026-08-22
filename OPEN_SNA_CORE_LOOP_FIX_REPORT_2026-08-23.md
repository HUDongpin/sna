# Open SNA XLSX to R to results core-loop remediation report

**Assessment date:** 2026-08-23

**Repository:** `/Volumes/Starship/SNA`

**Baseline branch:** `main`

**Baseline commit:** `682ee730f6d954fb5dfec362d8535db171c7f3eb`

**Production site:** `https://www.sna.hk/en/open-sna`

**Report status:** This pre-deployment remediation record is retained for audit history. Production deployment and live XLSX acceptance are now complete; see `OPEN_SNA_PRODUCTION_DEPLOYMENT_REPORT_2026-08-23.md` for the current final state.

> Superseded production-status note: the release commit was subsequently authorized and pushed, the dedicated Cloud Run worker was deployed, Vercel production was configured and redeployed, and the public XLSX-to-R-to-results loop passed. Historical statements below describing production as unchanged or blocked reflect the earlier checkpoint only.

## 1. Executive conclusion

The original defect is confirmed and its root cause is not the XLSX picker or the R script. The production Vercel project has no `OPEN_SNA_R_API_URL` or `OPEN_SNA_R_API_TOKEN`, and Vercel does not contain the pinned R runtime. A valid production upload therefore returns:

```text
HTTP 503
R_ENGINE_NOT_CONFIGURED
```

The repository now contains the missing production worker boundary:

- a dedicated R worker mode protected by constant-time Bearer-token comparison;
- one active R job per worker process, with `429 WORKER_BUSY` for excess concurrency;
- Linux-safe isolated temporary directories and guaranteed cleanup;
- safe remote error mapping that does not expose raw worker diagnostics;
- required HTTPS and a minimum 32-character service token for non-loopback workers;
- a pinned R 4.4.2 container definition;
- a complete 159-package `renv.lock` rather than only eight direct package pins;
- a non-root runtime user and container health check;
- deployment and rollback instructions.

Google Cloud Run in Hong Kong region `asia-east2` has been selected as the managed worker target because it supports the required 8 vCPU/16 GiB allocation, HTTPS service endpoint, Secret Manager injection, concurrency 1, and a request timeout above the application's 255-second limit. The committed release definition fixes the initial service at 8 vCPU, 16 GiB, one request per instance, one maximum instance, and a 300-second timeout.

The exact core loop passed locally using two separate production-build processes:

```text
browser or client -> Next.js Web adapter -> Bearer-authenticated R worker -> aggregate JSON -> browser panels
```

A synthetic 80-row XLSX completed in 8.19 seconds through that two-service topology and returned HTTP 200. Browser testing then confirmed that the uploaded result replaced the aggregate reference and rendered all eight result panels.

This is not yet a production-live claim. A fresh request to `www.sna.hk` still returns the expected 503 because no worker has been deployed and no Vercel variables have been added.

## 2. Root cause evidence

### 2.1 Repository and release state

- Local `HEAD` and `origin/main` were both `682ee730f6d954fb5dfec362d8535db171c7f3eb` at the start of remediation.
- The linked Vercel project is `sna` under the existing owner team. A fresh authenticated CLI check confirmed that this is the account's only listed team scope and that the latest production deployment is `READY` for remote commit `682ee730f6d954fb5dfec362d8535db171c7f3eb`.
- The only pre-existing untracked file was `OPEN_SNA_FUNCTIONAL_QA_REPORT_2026-08-22.md`; it was preserved.
- No branch switch, stash, reset, broad staging, or production mutation was performed. After the complete verification gates passed, the exact remediation set was committed locally while the pre-existing QA report remained outside the commit.

### 2.2 Production configuration

A fresh authenticated Vercel CLI check showed that the production environment still lists only `NEXT_PUBLIC_SITE_URL`. It does not contain either worker variable:

```text
OPEN_SNA_R_API_URL
OPEN_SNA_R_API_TOKEN
```

A fresh valid synthetic XLSX request to production returned HTTP 503 with `R_ENGINE_NOT_CONFIGURED` both before and after the local remediation work. This proves that the live environment has not been silently changed.

### 2.3 Existing runtime boundary

The R engine already worked on the development machine, but the Web route deliberately refused to execute R when `VERCEL` was present. The missing layer was a separately deployable R service plus production configuration pointing Vercel to it.

## 3. Implemented remediation

### 3.1 Authenticated worker mode

`app/api/open-sna/analyze/route.ts` now supports `OPEN_SNA_R_WORKER_MODE=1`.

Worker mode:

- requires `OPEN_SNA_R_WORKER_TOKEN` with at least 32 characters;
- compares the presented Bearer token using `timingSafeEqual`;
- rejects missing or invalid credentials with `401 WORKER_UNAUTHORIZED`;
- rejects incomplete or recursive configuration with `503 WORKER_CONFIGURATION_INVALID`;
- accepts only isolated `/tmp/open-sna-*` or `/var/tmp/open-sna-*` job roots;
- admits one active R job per process;
- returns `429 WORKER_BUSY` instead of starting a second analysis;
- decrements the active-job guard and removes the job directory in `finally`.

### 3.2 Safe Web-to-worker forwarding

The public Web adapter now requires `OPEN_SNA_R_API_URL` and `OPEN_SNA_R_API_TOKEN` together.

- Non-loopback worker URLs must use HTTPS.
- URL-embedded usernames and passwords are rejected.
- Tokens shorter than 32 characters are rejected before any upload is transmitted.
- Worker errors are mapped to bounded public codes.
- Raw R stderr and private worker messages are not returned to the browser.
- Network failures and invalid remote contracts return `502 R_ENGINE_UNAVAILABLE`.
- Workbook validation failures remain `422 WORKBOOK_INVALID` with a user-safe explanation.

### 3.3 Reproducible R container

`Dockerfile.open-sna-worker` now defines a two-stage worker image:

- Node 24.15.0 build image pinned to a multi-architecture digest;
- `rocker/r-ver:4.4.2` runtime image pinned to a multi-architecture digest;
- Next.js Webpack production build and standalone output;
- `renv` 1.1.8 source archive verified by SHA-256;
- restoration of the complete 159-package dependency graph;
- R preflight inside the final image;
- non-root `open-sna` user with UID/GID 10001;
- unauthenticated health probe that expects the worker's 401 response.

The build context excludes environment files, private research workbooks, research outputs, test artifacts, and local reports.

### 3.4 Documentation

Deployment, capacity, secret handling, verification, and rollback gates are documented in:

- `analysis/open-sna/README.md`
- `analysis/open-sna/WORKER_DEPLOYMENT.md`
- `.env.example`

The managed release path is captured in `cloudbuild.open-sna-worker.yaml` and `scripts/deploy-open-sna-worker-cloud-run.sh`. It uses Artifact Registry, Cloud Build, a dedicated Cloud Run service account, Secret Manager, and the automatically issued Cloud Run HTTPS endpoint.

## 4. Verification evidence

### 4.1 Automated tests

```text
npm test
39 tests passed, 0 failed
```

New regression coverage proves:

- worker authentication;
- missing worker-token fail-closed behavior;
- Linux temporary-root support;
- single-job concurrency control;
- safe remote error mapping;
- unavailable-worker gateway behavior;
- container, lockfile, non-root, health-check, and Webpack build contracts.

### 4.2 Type and release gates

```text
npm run typecheck
PASS

npm run release:hygiene
PASS

git diff --check
PASS
```

### 4.3 R runtime gate

```text
Rscript --vanilla analysis/open-sna/preflight.R
PASS
```

Verified runtime:

| Component | Version |
| --- | ---: |
| R | 4.4.2 |
| jsonlite | 2.0.0 |
| readxl | 1.4.5 |
| qgraph | 1.9.8 |
| huge | 1.5 |
| mgm | 1.2.15 |
| bootnet | 1.8 |
| networktools | 1.6.0 |
| NetworkComparisonTest | 2.2.3 |

### 4.4 Production Web build

The default Turbopack path failed in this macOS environment before application compilation because its internal CSS helper could not bind a local port. The official Webpack build path passed:

```text
npm run build -- --webpack
Compiled successfully
237 static pages generated
```

The worker Dockerfile uses the passing Webpack path.

### 4.5 Real two-service XLSX analysis

Test workbook properties:

- synthetic data only;
- 80 rows;
- 6 integer Likert nodes: `AA1` to `AA3`, `BB1` to `BB3`;
- two numeric groups with 40 rows each;
- one worksheet;
- no personal data.

Fresh final result:

```text
HTTP 200
Total time: 8.192251 seconds
Schema: 1.0
Profile: npn-ebicglasso-v1
Data source: uploaded-workbook
Analyzed rows: 80
Nodes: 6
Nonzero edges: 9
Bootstrap replicates: 100
NCT permutations: 1000
```

Privacy contract:

```text
rawRowsIncluded: false
uploadedWorkbookRetainedByEngine: false
records key: absent
rawData key: absent
worker temporary directory after response: empty
```

### 4.6 Browser acceptance

The local production build was tested in the Codex in-app browser using the visible upload control.

Observed sequence:

1. `synthetic-valid.xlsx` appeared as ready to validate.
2. `Run R + LUNA analysis` became enabled.
3. The 100-bootstrap option was selected.
4. The status changed to `Open SNA is working`.
5. The status then changed to `Workbook analysis complete`.
6. The result source changed from `Aggregate reference` to `Uploaded workbook`.
7. The summary displayed `80 responses`, `6 nodes`, and `9 nonzero edges`.
8. All eight uploaded-result panels rendered non-empty content:
   - Data Overview
   - Network Visualization
   - Centrality Analysis
   - Bridge Node Analysis
   - Predictability Analysis
   - Subgroup Comparison (NCT)
   - Stability Analysis
   - AI Interpretation
9. The browser console contained no warnings or errors.

LUNA was intentionally disabled for this local privacy-focused test, so the deterministic R interpretation appeared as designed.

## 5. Unverified or blocked items

### 5.1 Container image build

The local Docker client could inspect registry manifests, but the Docker Desktop engine socket did not respond. Docker Desktop was opened, but it remained unavailable. It was not force-restarted because doing so could interrupt unrelated user containers.

Therefore:

- the Dockerfile and lockfile contracts are tested;
- the final image has not been built locally;
- the final image has not passed target-architecture preflight;
- no image has been pushed to a registry.

### 5.2 Production worker host

Google Cloud Run `asia-east2` is now the selected target, and its deployment contract is present in the repository. A read-only browser check confirmed that Google Cloud Console is signed in and currently points to project `project-hu-xiangen`; the project is linked to a billing account, its Cloud Run service list is empty, and the console states that creating the first service will enable the Cloud Run Admin API. No billing identifiers or account credentials were copied into this report. The local workspace still has no `gcloud` CLI or linked project credentials. The Cloud Build, Artifact Registry, Secret Manager, service account, and Cloud Run resources therefore have not been created, and explicit owner authorization is still required before enabling APIs or creating potentially billable resources in that project. The existing assessed multi-site ECS remains unsuitable for this R workload without capacity and access changes.

### 5.3 GitHub and Vercel release

The repository is linked to GitHub and Vercel. The exact remediation set is now represented by one local commit named `Add production Open SNA R worker`. Pushing that commit to `main` would trigger an external production deployment and still requires an explicit owner statement authorizing that exact push. No push, Vercel environment mutation, or production deployment has been performed.

## 6. Production completion checklist

Production can be called fixed only after all items below pass:

- [ ] Build the worker image successfully on Linux amd64 or arm64.
- [ ] Run R preflight inside the final image.
- [ ] Provision a dedicated worker host with TLS, ingress limits, one-job concurrency, CPU/RAM limits, monitoring, and restricted egress.
- [ ] Store matching service tokens in the worker secret manager and Vercel.
- [ ] Set `OPEN_SNA_R_API_URL` and `OPEN_SNA_R_API_TOKEN` in Vercel production.
- [x] Commit the exact reviewed repository changes locally.
- [ ] Push the local release commit to `main` after explicit owner authorization.
- [ ] Confirm the Vercel deployment uses the expected commit.
- [ ] Submit the synthetic XLSX through `https://www.sna.hk/en/open-sna`.
- [ ] Confirm HTTP 200 and all eight uploaded-result panels.
- [ ] Confirm temporary-file cleanup, bounded logs, 429 busy behavior, and no raw rows in the response.
- [ ] Run a maximum-contract workbook benchmark and record wall time and peak RSS.

Until those boxes are checked, the accurate release statement is:

> The Open SNA upload-to-R-to-results implementation is locally complete and end-to-end verified in the production topology, but the public production endpoint is not yet enabled because the dedicated R worker has not been deployed or configured.

## 7. Files added or changed

Core implementation:

- `.dockerignore`
- `Dockerfile.open-sna-worker`
- `cloudbuild.open-sna-worker.yaml`
- `app/api/open-sna/analyze/route.ts`
- `next.config.mjs`
- `analysis/open-sna/renv.lock`

Documentation and configuration:

- `.env.example`
- `analysis/open-sna/README.md`
- `analysis/open-sna/WORKER_DEPLOYMENT.md`
- `scripts/deploy-open-sna-worker-cloud-run.sh`
- `OPEN_SNA_CORE_LOOP_FIX_REPORT_2026-08-23.md`

Tests:

- `tests/open-sna-route.test.ts`
- `tests/open-sna.test.ts`
- `tests/fixtures/fake-open-sna-rscript.mjs`

The pre-existing `OPEN_SNA_FUNCTIONAL_QA_REPORT_2026-08-22.md` was preserved unchanged.
