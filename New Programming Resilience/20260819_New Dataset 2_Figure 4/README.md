# New Dataset 2 (Programming Resilience) — DAG analysis, Figure 4

**Date:** 19 August 2026
**Script:** `DAG_analysis_ProgrammingResilience.R`
**Data:** `01_Programming_Resilience_811.xlsx` (not copied into this folder — the script asks you to select it)

This folder repeats the DAG analysis in `../20260807_Dataset 4_DAG_Figure 4/` on
the Programming Resilience dataset. The method, the output workbook layout and
the auditing conventions are the same as the Grit analysis; only the input data,
the handful of dataset-specific details, and the **figure appearance** (see
[What changed from the Grit script](#what-changed-from-the-grit-script)) are
different.

---

## How to run it (Windows, macOS or Linux)

1. Open `DAG_analysis_ProgrammingResilience.R` in RStudio (or plain R).
2. Press **Source** — `Ctrl+Shift+S` on Windows, `Cmd+Shift+S` on macOS.
3. A **file-selection window** opens. Choose
   **`01_Programming_Resilience_811.xlsx`**.
4. That is the only manual step. Everything else runs by itself.

Results are written to a folder called **`Results`**, created next to the Excel
file you selected. The full path is printed in the console when the run
finishes.

**Packages.** On start-up the script checks for `bnlearn`, `readxl`, `writexl`
(CRAN) and `graph`, `Rgraphviz` (Bioconductor). If any are missing it asks once
whether to install them; answer `y` and it does the rest. If you prefer to
install them yourself first:

```r
install.packages(c("bnlearn", "readxl", "writexl"))
install.packages("BiocManager")
BiocManager::install(c("graph", "Rgraphviz"))
```

**Run time.** About 1–2 minutes for the full 10,000 bootstraps on a modern
multi-core machine (the 16-node networks here are far quicker than the 44-node
Grit run). `N_BOOT_OVERRIDE <- 200` in the *OPTIONAL SETTINGS* block gives a
seconds-long trial run; set it back to `NULL` for the real one.

**Windows notes.** Same as the Grit version: no hard-coded paths, the bootstrap
runs in parallel on Windows through a PSOCK cluster, and results are
**bit-identical** on any platform and any core count because every bootstrap
replicate carries its own seed (`seed_base + b`).

---

## The data

`01_Programming_Resilience_811.xlsx`: **811 respondents**, 18 columns, no
missing values.

| Columns | Role |
|---|---|
| `ID` | respondent ID — **ignored** |
| `Gender` | grouping variable: **"M" = male (n = 408), "F" = female (n = 403)** |
| `Cmt1`–`Cmt4` (4) | item block — DAG node |
| `Cnf1`–`Cnf4` (4) | item block — DAG node |
| `Cop1`–`Cop4` (4) | item block — DAG node |
| `Cmp1`–`Cmp4` (4) | item block — DAG node |

All 16 items are 5-point responses (observed range 1–5, no missing values, no
zero-variance items). Every response category of every item is well populated,
so the CH11-style near-degeneracy that shaped the Grit analysis **cannot occur
here**, and no item is excluded by default (`EXCLUDE_ITEMS` is empty).

**Reading the data.** Item columns are identified by the ASCII pattern
`^(Cmt|Cnf|Cop|Cmp)[0-9]+$`; everything that does not match is treated as
metadata. The gender column is found as the metadata column holding exactly the
two configured codes (`"M"` and `"F"` — text codes, unlike the 1/0 numbers in
Grit.xlsx), not by its header text. If a future file uses a different coding,
change `male_code` / `female_code` in `CONFIG`.

---

## Method

Identical to `../20260807_Dataset 4_DAG_Figure 4/DAG_analysis_Grit.R`:

1. **Point-estimate DAG** — `bnlearn::hc()` with the Gaussian BIC score
   (`bic-g`), 50 random restarts × 100 perturbations.
2. **Nonparametric bootstrap** — 10,000 resamples with replacement, one
   hill-climbing DAG per resample (seed `20260712 + b` for replicate *b*).
3. **Model averaging with a data-driven cut-point** —
   `custom.strength(..., cpdag = TRUE)`, then edges retained when their
   bootstrap strength exceeds the **cut-point of Scutari & Nagarajan (2013)**,
   estimated separately for each group from that group's own bootstrap
   distribution (`attr(cs, "threshold")`, the L₁ estimator of their Eq. 12–13).
   Direction is taken from the more frequent orientation (`bnlearn`'s internal
   `direction >= 0.50` rule).
4. **Figures** — two panels per group, sharing one Graphviz `dot` layered
   layout, solid lines only, exactly three line widths assigned by tertiles of
   the panel's metric:
   - **Panel (a)** — thickness = |change in BIC| when the edge is removed
     (`bnlearn::arc.strength`)
   - **Panel (b)** — thickness = directional probability across bootstraps

---

## Output files

Per group (`all`, `male`, `female`):

| File | Contents |
|---|---|
| `Figure4_<group>.png` | panels (a) and (b), 5200 px wide at 300 dpi |
| `DAG_results_<group>.xlsx` | seven sheets, below |

The `Sensitivity_threshold_0.85/` subfolder holds the same files for the
fixed-cut-point robustness check described at the end of this document.

Sheets in each workbook:

| Sheet | Contents |
|---|---|
| `Final_DAG_edges` | the retained edges: bootstrap strength, direction probability, BIC change on removal, and the thickness level used in each panel |
| `Bootstrap_all_pairs` | strength and direction for every node pair with non-zero bootstrap strength |
| `Threshold_comparison` | the cut-point actually applied, and how many edges the conventional fixed cut-points 0.50 and 0.85 would have retained on the same bootstrap |
| `Cycles_dropped` | arcs that cleared the cut-point but were dropped by `averaged.network()` because they would have closed a cycle |
| `HC_point_estimate` | arcs of the 50 × 100 point-estimate DAG |
| `Descriptives` | N, mean and SD per item |
| `Settings` | every parameter of the run, including the retention rule, the cut-point value applied, the direction rule, and the diagnostics |

---

## What changed from the Grit script

Three changes are **figure conventions requested on 19 Aug 2026**; the rest are
dataset handling. The method itself is untouched.

| # | Change | Why |
|---|---|---|
| 1 | **Larger node ellipses** — height 0.40 → 0.72 in, width formula scaled ×~1.8, and the layout spacing (`ranksep` 0.6 → 0.42, `nodesep` 0.4 → 0.26) tightened so the bigger nodes also occupy a larger share of the canvas once the drawing is scaled to the fixed 5200-px figure width | the circles were judged too small |
| 2 | **Larger item labels** — the label may now fill 84% × 80% of its ellipse (was 72% × 78%); combined with change 1 the printed font is clearly bigger | the code font was judged too small |
| 3 | **Panel tags "(a)" / "(b)"** instead of "A" / "B" (set in `CONFIG$panel_labels`) | journal figure style |
| 4 | Input file `01_Programming_Resilience_811.xlsx`; item pattern `^(Cmt|Cnf|Cop|Cmp)[0-9]+$` | new dataset |
| 5 | Gender codes `"M"` / `"F"` (text), matched by value, not header | this file codes gender as letters, not 1/0 |
| 6 | `EXCLUDE_ITEMS` empty by default | no CH11-style degenerate item exists here |
| 7 | The `Settings` sheet records the dataset name from the file actually chosen | was hard-coded "Grit.xlsx" |
| 8 | Sensitivity analysis = fixed cut-point 0.85 instead of the CH11 exclusion | see below |

All the Grit version's auditing machinery is kept unchanged: the data-driven
retention cut-point with the `Threshold_comparison` sheet, the
`Cycles_dropped` sheet, the zero-variance / isolated-node diagnostics, and the
per-replicate bootstrap seeding.

---

## Results

Full run: 10,000 bootstraps per group, seed base 20260712, `bic-g`, edge
retention at the **data-driven cut-point**. Completed in under 2 minutes on 11
cores.

| Group | n | Cut-point $\hat t$ applied | Edges retained | Weakest retained edge | Min direction prob. | Cycle-dropped arcs | Isolated nodes |
|---|---|---|---|---|---|---|---|
| all | 811 | **.4882** | 38 | .5834 | .5131 | 0 | none |
| male | 408 | **.5114** | 30 | .5162 | .5032 | 1 | none |
| female | 403 | **.5171** | 30 | .5702 | .5145 | 0 | none |

Unlike the Grit run — where the data-driven cut-points all fell just *below*
.50 and happened to select the same edges as a fixed .50 rule — here the male
and female estimates fall **above** .50, and the two rules genuinely diverge:
a fixed .50 would have retained one extra edge in each of those groups (31
instead of 30). This is exactly the situation the Scutari–Nagarajan estimator
exists for, and it is why no fixed number is hard-coded: the applied values
(.4882 / .5114 / .5171) come from each group's own bootstrap distribution and
are recorded in every workbook's `Settings` and `Threshold_comparison` sheets.

**One cycle-dropped arc (male).** In the male network the arc `Cnf2 → Cnf4`
cleared the cut-point easily (bootstrap strength .9987, direction .6854) but
was removed by `averaged.network()` because it would have closed a cycle with
the other retained arcs. It is listed in the male workbook's `Cycles_dropped`
sheet; worth a footnote if a reader asks why that strong pairwise association
is missing from the male figure. No arcs were cycle-dropped for the total or
female samples, and **no node is isolated in any group** — every item carries
at least one edge in every network.

---

## Sensitivity analysis — `Sensitivity_threshold_0.85/`

The Grit folder carried a `Sensitivity_no_CH11/` run because one item there was
nearly constant. No such item exists in this dataset, so the robustness check
provided here instead re-runs the identical pipeline (same seed, same 10,000
bootstraps) with the **conventional fixed cut-point 0.85** of Briganti, Scutari
& McNally (2023) in place of the data-driven estimate:

```r
THRESHOLD_OVERRIDE <- 0.85
source("DAG_analysis_ProgrammingResilience.R")
```

| Group | Edges at $\hat t$ (main run) | Edges at fixed .85 | Retained fraction |
|---|---|---|---|
| all | 38 | 26 | .68 |
| male | 30 | 20 | .67 |
| female | 30 | 22 | .73 |

The .85 rule keeps roughly the strongest two-thirds of each network — the
backbone structure. It is the same bootstrap, only the retention bar moves: the
total and female sensitivity networks are exact subsets of their main networks,
with every edge in the same direction, and no direction flips anywhere. The one
non-subset case is instructive: in the male network the arc `Cnf2 → Cnf4`
**reappears** at the .85 bar. It had cleared the main run's cut-point too
(strength .9987) but was cycle-dropped there; the sparser 26→20-edge network at
.85 no longer contains the arcs that formed that cycle, so the edge can be kept.
The main figures report the data-driven networks; the sensitivity folder shows
which edges survive the far stricter conventional bar.

---

## Reference

Grit-version of this analysis and its full method notes:
`../20260807_Dataset 4_DAG_Figure 4/` — `DAG_analysis_Grit.R` and `README.md`.

Scutari, M., & Nagarajan, R. (2013). Identifying significant edges in graphical
models of molecular networks. *Artificial Intelligence in Medicine, 57*(3),
207–217.

Tu, Y., Huang, C., Pan, Y., & Hwang, G.-J. (2026). Mapping the structure of
student burnout in online learning: An integrated Gaussian model and directed
acyclic graph approach. *The Internet and Higher Education, 70*, 101077.
