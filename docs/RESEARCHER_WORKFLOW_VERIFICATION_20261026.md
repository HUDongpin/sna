# Researcher workflow implementation verification

Checked on 26 October 2026 for branch `codex/sna-researcher-workflow`; initial implementation was based on `a2b5353`. This is a local implementation and verification record. It is not a production deployment receipt or a record of human usability acceptance.

## Requirement evidence

| Requirement | Implemented evidence | Verification |
| --- | --- | --- |
| Bring a questionnaire without renaming its source columns | R inspection, explicit item/construct/group selection, bounded Unicode headers, optional reverse scoring | Selection/validation contracts, real mapped R regression, browser mapping of six Chinese headers |
| Confirm the analyzed sample | R validation and explicit confirmation; file/mapping edits invalidate it | Browser showed 200 original, 198 analyzed, 2 excluded, groups 99/99; changing reverse scoring removed previous confirmation |
| Recover a long analysis | Durable job state, separate local worker; GCS/Cloud Tasks implementation for production | Real browser refreshed while R was running, resumed the same task and received its completed 198-row result |
| Handle process and queue failure | Independent R supervisor, fenced claims, bounded retry, task generations, retention sweeps | Independent review and tests exercised actual owner SIGKILL, orphan cleanup, cross-process CAS, stale GCS generations and Cloud Tasks tombstones |
| Cancel and expire safely | Fenced cancellation, terminal cleanup, 24-hour expiry, disabled-worker maintenance | Subprocess/API tests, including a child that ignores SIGTERM and physical source-byte removal from local SQLite/WAL |
| Preserve complete research evidence | Native result schema 1.2 with every NCT edge test; legacy 1.1 reader without fabricated tests | Six-node result retained all 15 pairs; 40-node R regression retained all 780 pairs |
| Export and reopen | Sixteen-file research ZIP, aggregate JSON, tables, SVGs, printable HTML, configuration and R reproduction script | Actual browser download passed ZIP CRC/content checks; result JSON reopened; explicit source switching detached the previous task ID |
| Restrict misleading rankings | Shared tie/zero/missingness/stability rules for deterministic, AI-authored and imported interpretations | Regression tests include provider prose that incorrectly names a unique leader, and low-CS/tied/all-zero/partially unavailable cases |
| Keep data private within the implementation boundary | No source rows in public results, restricted R environment, bounded errors, immediate terminal input deletion | Real completed jobs had zero retained input/selection objects and zero execution directories; production platform logging/storage policy remains a deployment gate |
| Work across languages and screen sizes | English, Traditional Chinese and Simplified Chinese controls, state messages and result presentation | Locale tests; desktop browser and 390-pixel mobile viewport (375-pixel content area), with no document-wide horizontal overflow; mapping tables scroll within their container |

## Executed checks

Before PR creation, the implementation was rebased onto `fd978e8` (current remote `main`). It preserves the 360-row synthetic sample, the public-upload kill switch, the 500-bootstrap default and timing hints, localized labels and layout refinements. The sample passed fresh real-R inspection and mapped validation with 360 analyzed rows, sixteen items, four communities and two groups of 180. The complete Node suite, build and typecheck were rerun after integration.

- `npm test`: **167 passed, 0 failed**. Test-file concurrency is capped at two so subprocess-heavy tests do not invalidate the existing two-second timeout assertion through CPU contention. The timeout assertion itself was preserved.
- `npx tsc --noEmit --incremental false`: passed.
- `npm run build -- --webpack`: passed, including all new API routes and 237 generated pages.
- `npm run release:hygiene` and `git diff --check`: passed.
- R preflight, validation CLI/runtime-isolation, group selection, conditioning, two-pass empty-network regression and the new researcher-workflow regression passed.
- The twelve deployment-script tests used a local fake `gcloud`; no cloud command was executed against an account.
- Cloud Run HTTP concurrency is set to eight so polling/cancellation are not serialized behind the long R handler. Cloud Tasks dispatch concurrency and the durable execution lease still permit only one analysis. Target responsiveness under CPU pressure remains unverified.

## Real nonempty-network exercise

A deterministic synthetic workbook contained 200 rows and six 1–5 items, with two deliberately missing selected responses. The API and browser both retained 198 rows in two groups of 99, produced ten nonzero edges and all fifteen NCT edge tests, and completed **1,000 actual case-dropping bootstrap replicates**. One local API run completed in approximately 25.5 seconds; this is a single local observation, not a capacity guarantee.

The strength CS coefficient was 0.126263 and the three bridge CS coefficients were zero. These values are retained and restricted in interpretation, rather than being presented as stable rankings. This dataset is synthetic and supplies functional test evidence only.

The exported `reproduce.R` was run against the original synthetic bytes and the same source checkout. Nodes, edges, settings, model descriptions, overview, NCT results, stability, runtime versions, input fingerprint and mapping matched exactly. Repeated retrieval of the saved job result returned the same finalized result without another analysis attempt.

Local artifacts are under `output/researcher-workflow-20261026/`: `acceptance-evidence.json`, `node-tests.log`, `build.log`, `open-sna-research-package.zip`, `open-sna-report.html`, SVG/PNG figure previews and browser screenshots. These generated artifacts are intentionally outside tracked source.

## Export layout check

The printable report was inspected after splitting the node statistics into a seven-column centrality table and a five-column bridge table. Numeric cells stay on one line; captions remain with their tables. The final eight-page sample PDF was rendered from the exported HTML using local WeasyPrint with installed static CJK fonts and visually checked. Local browser control became disabled before the final print-only CSS revision, so that last PDF check is independent-renderer evidence rather than another Chrome print check. Earlier browser workflow, JSON reopen and actual ZIP download checks were completed. The local PDF sample is `output/pdf/open-sna-synthetic-research-report.pdf`; it is generated from synthetic data.

## Release and acceptance boundaries

- The original `/Volumes/Mars/SNA` checkout still has the same six pre-existing changed files and the same 132-insertion/46-deletion diff summary as before implementation. Work is isolated in the attached worktree.
- At the local-verification checkpoint, no merge, push, live worker deployment, public-web activation, domain change, provider call, or researcher recruitment had occurred. Subsequent PR publication is a code-review handoff and does not establish cloud or human-pilot acceptance.
- The prepared deployment stages a separate durable worker before coordinating the new web build and worker URL/token. Qualify the exact target container, private bucket/lifecycle, IAM, queue recovery, maintenance and platform logging before admitting real research data; see `analysis/open-sna/WORKER_DEPLOYMENT.md`.
- The proposed 3–5 researcher pilot is documented in `docs/RESEARCHER_PILOT.md` and has not been conducted.
- Results record the profile, settings, mapping, input hash and runtime/package versions; they do not embed the exact source-engine revision. Reproduction requires the matching source checkout.
