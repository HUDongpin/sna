# Open SNA R engine

This directory contains the R implementation used by the Open SNA workbench. The engine adapts the Programming Resilience scripts into pure, noninteractive functions and one command-line boundary. It never installs packages, prompts for files, serializes row-level data, or writes next to the source workbook.

## Analysis profile

Open SNA v1 uses one named profile for every network-based result:

| Setting | Value |
| --- | --- |
| Profile | `npn-ebicglasso-v1` |
| Transformation | `huge::huge.npn(..., npn.func = "shrinkage")` |
| Correlation | Pearson correlation after NPN transformation |
| Network | `qgraph::EBICglasso`, gamma `0.5` |
| Centrality | `qgraph::centrality_auto` |
| Bridge metrics | `networktools::bridge` with declared item communities |
| Predictability | Separate `mgm` EBIC model with nodewise R-squared |
| Subgroup comparison | `NetworkComparisonTest::NCT`, independent groups, weighted, all edges, Holm correction |
| Stability | `bootnet` case-dropping bootstrap, correlation threshold `0.70`, one core |
| Seed | `2026` |

Predictability shares the same input and preprocessing provenance but comes from a separate MGM fit. It is not presented as a derivative of the EBICglasso edge matrix. Polychoric and Pearson sensitivity analyses in the research folder are valid reference analyses, but Open SNA does not mix them into this profile.

## Workbook contract

Open SNA v1 accepts one `.xlsx` worksheet containing 6 to 40 network-item columns. Item headers must use an alphabetic construct prefix followed by consecutive numbers starting at 1, for example `Cmt1-Cmt4` or `IS1-IS7`. Prefixes define 2 to 8 communities, with 3 to 12 items per community. Values must be integer Likert responses from 1 to 5 or blank. Reserved metadata prefixes such as `ID`, `No`, `Gender`, and `Experience` are never selected as network nodes. `Gender` is used for the two-group NCT when present; otherwise the first valid binary metadata column is selected.

Numeric Gender codes remain neutral `1` and `2` unless the dataset owner explicitly supplies a mapping. For a confirmed `1 = Male`, `2 = Female` local run, pass `--gender-1-label Male --gender-2-label Female`, or set both `OPEN_SNA_GENDER_1_LABEL` and `OPEN_SNA_GENDER_2_LABEL` for the local web adapter. The original workbook is not rewritten.

The runner fails closed when the worksheet, columns, value range, variability, complete-row count, or subgroup structure cannot support the requested stage. It does not fabricate values or substitute the bundled reference analysis for an uploaded workbook.

## Runtime

The verified development runtime is R 4.4.2 with the following exact direct-package versions. The preflight rejects drift from this verified set:

- `jsonlite` 2.0.0
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

The R output is aggregate JSON with schema version `1.0`. It contains input dimensions, settings, package versions, nodes, nonzero edges, summary metrics, NCT results, CS coefficients, and a deterministic evidence-bound interpretation. It contains no source rows or respondent IDs. After the R contract is validated, the web adapter can replace only the interpretation section with GPT-5.6 Luna output. That server-side request is built from a smaller bounded aggregate payload, requires OpenRouter zero-data-retention and no-data-collection routing, and never includes the workbook, row-level responses, file or sheet names, respondent IDs, the input fingerprint, or R runtime details. If LUNA is unconfigured or unavailable, the deterministic R interpretation remains visible and is labeled as the fallback.

## Web adapter and deployment boundary

`app/api/open-sna/analyze/route.ts` is a bounded synchronous adapter for local verification. It fast-rejects an oversized declared multipart body, then validates workbook size, extension, media type, ZIP signature, fixed resampling settings, result size, and the JSON contract; uses a per-job directory on `/Volumes/Starship/`; invokes a fixed R script with `shell: false`; removes the job directory in `finally`; and, when `OPENROUTER_API_KEY` is available, requests a strict JSON-schema interpretation from the model pinned as `openai/gpt-5.6-luna`. `request.formData()` is not a streaming transport limit, and a ZIP signature is not an uncompressed-size defense. Any production gateway/worker must independently enforce request-body, expanded-ZIP, entry-count, memory, CPU, concurrency, and rate limits before analysis.

Vercel does not provide this repository's R runtime, and 1,000-permutation plus 1,000-bootstrap analyses are not an appropriate static/serverless request workload. Production uploads therefore fail closed unless `OPEN_SNA_R_API_URL` points to a separately deployed R analysis service. This repository does not claim a production R container or transitive dependency lock. A production service must add an isolated, immutable dependency lock/container and asynchronous jobs, resource limits, no network egress from the worker, bounded object storage, cancellation, and short source-file retention. The bundled Programming Resilience result is explicitly labeled as a precomputed aggregate reference and is never a fallback for a failed upload.
