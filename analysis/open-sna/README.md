# Open SNA R engine

This directory contains the R implementation used by the Open SNA workbench. The engine adapts the Programming Resilience scripts into pure, noninteractive functions and one command-line boundary. It never installs packages, prompts for files, serializes row-level data, or writes next to the source workbook.

## Analysis profile

Open SNA v1 uses one named profile for every network-based result:

| Setting | Value |
| --- | --- |
| Profile | `npn-ebicglasso-v1` |
| Transformation | `huge::huge.npn(..., npn.func = "shrinkage")` |
| Correlation | Pearson correlation after NPN transformation; deterministic conditional PD conditioning at the versioned `1e-4` eigenvalue floor |
| Network | `qgraph::EBICglasso`, gamma `0.5` |
| Centrality | `qgraph::centrality_auto` |
| Bridge metrics | `networktools::bridge` with declared item communities |
| Predictability | Separate `mgm` EBIC model with nodewise R-squared |
| Subgroup comparison | `NetworkComparisonTest::NCT` with the same NPN → Pearson → conditional-PD → EBICglasso estimator, independent groups, weighted, all edges, Holm correction |
| Stability | `bootnet` case-dropping bootstrap, correlation threshold `0.70`, one core |
| Seed | `2026` |

Predictability shares the same input and preprocessing provenance but comes from a separate MGM fit. It is not presented as a derivative of the EBICglasso edge matrix. Polychoric and Pearson sensitivity analyses in the research folder are valid reference analyses, but Open SNA does not mix them into this profile.

### Conditional positive-definite conditioning

The versioned constant `NPN_EBICGLASSO_CONDITIONING_FLOOR_V1` is `1e-4`. After shrinkage NPN transformation and Pearson correlation, the engine symmetrizes the correlation matrix. If its minimum eigenvalue is **below `1e-4`**, it clips every eigenvalue to at least `1e-4`, reconstructs the symmetric matrix, renormalizes it to a unit diagonal, and verifies that the result is finite and strictly positive definite before EBICglasso. Correlations at or above the floor are returned unchanged. Non-finite or unrecoverably non-positive-definite inputs fail the analysis; they are never treated as an empty network.

The same internal NPN → Pearson → conditional-PD → EBICglasso helper is used by the pooled network and every original/permuted NCT sample. NCT-local estimator warnings and sparse-model messages are bounded internally so resampling diagnostics do not leak into aggregate result warnings; estimation errors remain fatal. The pooled path keeps ordinary warning capture.

The executable conditioning regression uses a deterministic singular representative to compare the `1e-4` floor with `1e-6`. Its current measured maximum correlation delta is `0.0000989950`, maximum EBICglasso weight delta is `0.0013855080`, and edge topology is unchanged. This bounded sensitivity, together with the strict-PD check required by qgraph, is the current evidence for the `1e-4` floor rather than a claim that the value is inconsequential in every future dataset.

## Workbook contract

Open SNA v1 accepts one `.xlsx` worksheet containing 6 to 40 network-item columns. Item headers must use an alphabetic construct prefix followed by consecutive numbers starting at 1, for example `Cmt1-Cmt4` or `IS1-IS7`. Prefixes define 2 to 8 communities, with 3 to 12 items per community. Values must be integer Likert responses from 1 to 5 or blank. Reserved metadata prefixes such as `ID`, `No`, `Gender`, and `Experience` are never selected as network nodes.

Every accepted workbook must also contain one safe, non-empty binary grouping column. A case-insensitive `Gender` column has priority; if no `Gender` column exists, the runner selects the first valid binary metadata column in worksheet order. When `Gender` exists but is invalid, the runner fails closed instead of silently selecting another column. After listwise deletion across the selected network items, every analyzed row must have a group value and each of the two groups must contain at least 20 rows. The validated group labels and counts are reused for the source summary and NCT result, so a successful response cannot omit subgroup analysis.

Numeric Gender codes remain neutral `1` and `2` unless the dataset owner explicitly supplies a mapping. For a confirmed `1 = Male`, `2 = Female` local run, pass `--gender-1-label Male --gender-2-label Female`, or set both `OPEN_SNA_GENDER_1_LABEL` and `OPEN_SNA_GENDER_2_LABEL` for the local web adapter. The original workbook is not rewritten.

The runner fails closed when the worksheet, columns, value range, variability, complete-row count, or subgroup structure cannot support the requested stage. It does not fabricate values or substitute the bundled reference analysis for an uploaded workbook.

## Runtime

The verified development runtime is R 4.4.2 with the following exact direct-package versions. The preflight rejects drift from this verified set:

- `jsonlite` 2.0.0
- `digest` 0.6.39
- `readxl` 1.4.5
- `qgraph` 1.9.8
- `huge` 1.5
- `mgm` 1.2.15
- `bootnet` 1.8
- `networktools` 1.6.0
- `NetworkComparisonTest` 2.2.3

Run the preflight before accepting local jobs:

```bash
Rscript --vanilla analysis/open-sna/preflight.R
```

Run the validation contract, CLI, conditioning, and empty-network regressions locally:

```bash
npm run open-sna:r-validation-runtime-isolation-regression
npm run open-sna:r-validation-cli-regression
npm run open-sna:r-conditioning-regression
npm run open-sna:r-regression
```

The validation-runtime isolation regression also forms the cross-language golden gate: it runs a real XLSX through R `--mode validate`, verifies the bounded JSON and R fingerprint, then invokes the strict TypeScript guard and an independent Node SHA-256 calculation. The canonical local statistical release gate runs that gate, the strict CLI regression, R preflight, group-selection regression, conditioning regression, and the real two-pass empty-network regression:

```bash
npm run open-sna:r-statistical-release
```

Run a complete reference analysis with explicit paths:

```bash
Rscript --vanilla analysis/open-sna/analyze.R \
  --input /absolute/path/to/workbook.xlsx \
  --output /absolute/path/to/result.json \
  --bootstraps 1000 \
  --permutations 1000 \
  --seed 2026 \
  --data-source uploaded-workbook \
  --gender-1-label Male \
  --gender-2-label Female
```

The R output is aggregate JSON with schema version `1.1`. It contains input dimensions, settings, package versions, nodes, nonzero edges, the required two-group source counts, NCT results, CS coefficients, and a deterministic evidence-bound interpretation. It contains no source rows or respondent IDs. After the R contract is validated, the web adapter can replace only the interpretation section with GPT-5.6 Luna output. That server-side request is built from a smaller bounded aggregate payload, requires OpenRouter zero-data-retention and no-data-collection routing, and never includes the workbook, row-level responses, file or sheet names, respondent IDs, the input fingerprint, or R runtime details. If LUNA is unconfigured or unavailable, the deterministic R interpretation remains visible and is labeled as the fallback.

For a bounded validation-only preflight, pass `--mode validate` with `--input` and `--output`. This mode accepts only `input`, `output`, optional `sheet`, and the paired Gender labels; it rejects analysis settings and unknown or duplicate flags before loading the workbook. It needs only the three direct validation packages (`jsonlite`, `digest`, `readxl`) and emits schema `1.0` with only `schemaVersion`, `valid`, the workbook SHA-256 fingerprint, and aggregate dimensions/group counts. Full analysis remains the default mode and requires all nine direct packages.

## Web adapter and deployment boundary

`app/api/open-sna/analyze/route.ts` is a bounded synchronous adapter. It fast-rejects an oversized declared multipart body, validates workbook size, extension, media type, ZIP signature, fixed resampling settings, result size, and the JSON contract, and removes each per-job directory in `finally`. Local development uses a temporary root below `/Volumes/Starship/`. Dedicated worker mode uses an isolated `/tmp/open-sna-*` or `/var/tmp/open-sna-*` root, requires a Bearer token of at least 32 characters, admits one R job per process, and returns `429 WORKER_BUSY` for a second concurrent analysis.

The Vercel adapter requires `OPEN_SNA_R_API_URL` and `OPEN_SNA_R_API_TOKEN` together. Non-loopback worker URLs must use HTTPS. Worker diagnostics are mapped to a small public error contract and are not relayed to the browser. During the schema `1.1` rollout only, this remote boundary can normalize a structurally valid `1.0` worker result to `1.1`; local R output, browser responses, the bundled demo, and AI input are `1.1` only. Legacy results that omit the required two-group/NCT contract still fail closed. After the aggregate R contract is validated, the Vercel adapter can request a strict JSON-schema interpretation from the model pinned as `openai/gpt-5.6-luna`. `request.formData()` is not a streaming transport limit, and a ZIP signature is not an uncompressed-size defense. The production gateway must still enforce request-body, expanded-ZIP, entry-count, memory, CPU, and rate limits before analysis.

Vercel does not provide this repository's R runtime. `Dockerfile.open-sna-worker` therefore defines the separate worker image with R 4.4.2, a complete 159-package `renv.lock`, an R preflight, a non-root runtime user, and a process health check. The current synchronous worker restores the upload-to-result loop with one active job per process. Larger-scale service still requires a durable asynchronous queue, cancellation, bounded object storage, restricted worker egress, and short source-file retention. The bundled Programming Resilience result remains a precomputed aggregate reference and is never a fallback for a failed upload.

## Current synchronous timing boundary

The observed local empty-network regression averages about **193 seconds per analysis**, which is close to the current 255-second synchronous endpoint limit. This synchronous path is therefore transitional and is **not production-qualified**. No release, push, or deployment qualification follows from the local regression or release gate. Production qualification remains blocked until the approved asynchronous job route removes browser/Vercel long-connection dependence and target-container timing is measured against the final worker configuration.

See [WORKER_DEPLOYMENT.md](./WORKER_DEPLOYMENT.md) for the deployment and verification gates.
