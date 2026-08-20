# New Dataset 2 (Programming Resilience) — network analysis, Figure 1

**Date:** 19 August 2026
**Script:** `SNA_Analysis_ProgrammingResilience.R`
**Data:** `01_Programming_Resilience_811.xlsx` (not copied into this folder — the script asks you to select it)

This folder repeats the Gaussian graphical model (GGM) analysis in
`../20260807_Dataset 4_Figure 1/` (script `SNA_Analysis_Grit.R`) on the
Programming Resilience dataset. The method, the figure conventions and the
output workbook layout are the same; only the input data, the construct names
and the three requested presentation changes listed under
[What changed from the Grit script](#what-changed-from-the-grit-script)
are different.

**This run analyses the full sample only.** There are no male / female
subgroup networks and no gender comparison — that was the explicit request
for this figure.

---

## How to run it (Windows, macOS or Linux)

1. Open `SNA_Analysis_ProgrammingResilience.R` in RStudio (or plain R).
2. Press **Source** — `Ctrl+Shift+S` on Windows, `Cmd+Shift+S` on macOS.
3. A **file-selection window** opens. Choose
   **`01_Programming_Resilience_811.xlsx`**.
4. That is the only manual step. Everything else runs by itself.

Results are written to a folder called **`Results`**, created next to the
data file you selected, with the same two subfolders as this one
(`1_Figures`, `2_Excel_Metrics`). The full path is printed in the console when
the run finishes.

**Packages.** On start-up the script checks for `qgraph`, `huge`, `mgm`,
`readxl`, `writexl`, `psych` and `bootnet` — all from CRAN, no Bioconductor
needed. (`NetworkComparisonTest` is no longer required, because there is no
gender comparison in this run.) If any are missing it asks once whether to
install them; answer `y` and it does the rest. To install them yourself first:

```r
install.packages(c("qgraph", "huge", "mgm", "readxl", "writexl",
                   "psych", "bootnet"))
```

**Run time.** The figure and all three metric workbooks are finished in well
under a minute; the rest of the time goes into the 1,000-subsample
case-dropping bootstrap (a few minutes for this 16-node, n = 811 network).
To check that everything works before committing to the full run, set
`RUN_STABILITY <- FALSE` in the *OPTIONAL SETTINGS* block near the top of the
script — the run then takes seconds and produces everything except
`Stability.xlsx`. Set it back to `TRUE` for the real run.

**Windows notes.**

- No path is hard-coded anywhere. The path comes from `file.choose()`, which
  returns a proper Windows path, and every path after that is built with
  `file.path()`, so the `\` vs `/` separator is never an issue. If you want to
  bypass the dialog, set `DATA_FILE` at the top of the script;
  `DATA_FILE <- "C:/Users/.../01_Programming_Resilience_811.xlsx"` and
  `DATA_FILE <- "C:\\Users\\...\\01_Programming_Resilience_811.xlsx"` both
  work. `OUT_DIR` overrides where results go, and is created if it does not
  exist.
- The bootstrap deliberately runs on **one core** (`nCores = 1`). `bootnet`
  does not seed each replicate separately, so a parallel run would give
  slightly different CS coefficients depending on how many cores the machine
  has. Serial + `set.seed()` gives the same numbers on Windows, macOS and
  Linux alike.

---

## What the analysis does

Method, following Tu, Huang, Pan & Hwang (2026), *The Internet and Higher
Education, 70*, 101077, Methods 3.3.1:

1. **Nonparanormal transformation** of the item responses (`huge::huge.npn`), so
   ordinal Likert items can be treated as Gaussian.
2. **Pearson correlation matrix** of the transformed data.
3. **Gaussian graphical model** by graphical LASSO with EBIC model selection,
   **gamma = 0.50** (`qgraph::EBICglasso`). Edges are regularised partial
   correlations: an edge between two items is the association that survives
   after conditioning on all 14 other items.
4. **Node predictability** (R²) from a mixed graphical model (`mgm::mgm` with
   `k = 2`, EBIC lambda selection, gamma = 0.50), drawn as the dark ring around
   each node — the share of a node's variance explained by its neighbours.
5. **Centrality** (strength, betweenness, closeness, expected influence) and
   **bridge metrics** (the part of a node's connectivity that leaves its own
   construct).
6. **Accuracy and stability**: case-dropping bootstrap with CS coefficients
   (`bootnet`), for the full sample.

---

## Files

### `1_Figures/`

`Figure_All`, as a 300-dpi PNG and a vector PDF (14.5 × 9 in).

- **Left panel** — the GGM. Green edges are positive partial correlations, red
  edges negative; edge thickness is |weight|; the dark ring around each node is
  that node's predictability R². **No title is printed above the network** —
  removed on request. The spring layout is compacted (**repulsion = 0.65**
  instead of the qgraph default 1.0) so the four constructs stay visibly
  grouped without drifting apart into four detached islands, and the four
  connector nodes **Cmt4, Cop4, Cnf4 and Cmp3 are pulled moderately towards
  the centre** of the circle of nodes (`CENTRAL_NODES` / `CENTRAL_PULL = 0.65`
  in the *OPTIONAL SETTINGS* block) — each hub sits between its own group and
  the centre, so the figure reads as one connected network. **Every node is
  drawn in its own group colour** — the yellow betweenness fill was removed
  on request.
- **Right panel** — node labels by construct. **The "Node labels by group"
  heading is not printed** and **there is no betweenness marking of any
  kind** (no badge box, no "Betweenness" text, no yellow row highlight) —
  all removed on request. The top-betweenness nodes are still reported in
  the console output and in `Node_Metrics.xlsx`, they are just not marked
  in the figure.

### `2_Excel_Metrics/`

| Workbook | Sheets |
|---|---|
| `Node_Metrics.xlsx` | `Summary` (edges, density, sign counts, mean R²) · `Cronbach_Alpha` (per construct) · `Nodes_All` (strength, betweenness, closeness, expected influence — raw and z — plus bridge strength, bridge expected influence, predictability R²) · `Descriptives` (item mean and SD) · `Settings` (every option the run used, package versions) |
| `Edge_Weights.xlsx` | `WeightMatrix_All` (full 16 × 16 partial-correlation matrix) · `EdgeList_All` (non-zero edges sorted by \|weight\|, labelled within- vs between-construct) |
| `predictability_r_squared.xlsx` | R² per node |
| `Stability.xlsx` | `CS_Coefficients` (case-dropping stability of strength, betweenness and bridge strength, with the number of usable subsamples) · `Stability_Curves` (at each of `bootnet`'s exact drop levels: subsample size, replicate count, mean correlation with the full-sample centrality, and its 5th percentile — the CS coefficient is the largest drop level whose 5th percentile is still ≥ .70) |

---

## Reading the data

The Programming Resilience file has 18 columns: `ID`, `Gender` (`M`/`F`), then
`Cmt1..Cmt4`, `Cnf1..Cnf4`, `Cop1..Cop4`, `Cmp1..Cmp4`.

- **Item columns are matched by pattern**, `^(Cmt|Cnf|Cop|Cmp)[0-9]+$`.
  Anything that does not match is metadata and is dropped — that is how `ID`
  and `Gender` are excluded.
- **The gender column is not used at all** in this run: only the full sample
  (n = 811, no missing values) is analysed.
- The zero-variance screen from the Grit script is kept as a safety check; no
  Programming Resilience item is constant, so **all 16 items enter the
  network** (the Grit analysis had to drop `CH11`; nothing comparable happens
  here).

---

## What changed from the Grit script

Everything about the method is unchanged. The differences are the dataset and
the three presentation changes requested for this figure.

| # | Change | Why |
|---|---|---|
| 1 | Data file is `01_Programming_Resilience_811.xlsx`; constructs are `Cmt` (4), `Cnf` (4), `Cop` (4), `Cmp` (4) instead of `Com`/`CE`/`CA`/`CH` (12/7/10/15); construct membership is read off each item's name | 16 items in 4 constructs rather than 43 |
| 2 | **Only the full sample is analysed** — the male / female subgroup networks, the shared-layout machinery for three figures, the `Nodes_Male` / `Nodes_Female` sheets and the whole NCT gender comparison are removed; `Stability_and_Gender_Comparison.xlsx` becomes `Stability.xlsx` (bootstrap sheets only) | requested: analysis and figure for "all" only |
| 3 | **The figure title ("All students (n = …)") is removed** | requested |
| 4 | **The "Node labels by group" heading above the right-hand panel is removed** (the space it occupied is kept, so the panel geometry is identical) | requested |
| 5 | **All betweenness marking is removed from the figure** — no badge box, no "Betweenness" text, no yellow node fill, no yellow row highlight; every node and every label row keeps its group colour. The top-betweenness ranking is still reported in the console and in the Excel metrics | requested (in three steps: first the text, then the boxes, then the yellow colour altogether) |
| 5b | **The spring layout is compacted** — `repulsion = 0.65` (qgraph default 1.0), adjustable via `LAYOUT_REPULSION` in *OPTIONAL SETTINGS* | requested: the default layout split the figure into four detached groups |
| 5c | **The connector nodes `Cmt4`, `Cop4`, `Cnf4`, `Cmp3` are pulled moderately towards the centre** of the circle of nodes — their distance from the layout centre is scaled by `CENTRAL_PULL = 0.65` (`CENTRAL_NODES` / `CENTRAL_PULL` in *OPTIONAL SETTINGS*; 0.35 was tried first and crowded the hubs in the middle) | requested: each hub should sit between its own group and the centre, keeping one connected network |
| 6 | The label panel uses one column and `vsize = 6.4` | 16 items fit comfortably in a single column (the 30-item threshold and the two-column logic are kept in the code, they just never trigger here) |
| 7 | Gender handling (code-based column detection, `male_code` / `female_code`) deleted from `CONFIG` | gender is not used; the `M`/`F` string coding of this file never has to be parsed |
| 8 | `NetworkComparisonTest` dropped from the package list | no gender comparison |

Everything else — nonparanormal transform, EBICglasso with gamma = 0.50, mgm
predictability, the colours, the 14.5 × 9 in canvas, the seeds (2026 for
estimation/bootstrap, 42 for the spring layout), the serial single-core
bootstrap, the rounding rules in the workbooks — is identical to the Grit
script.

---

## Results

### Network

| Group | n | Nodes | Edges (of 120) | Density | Positive / negative | Mean R² |
|---|---|---|---|---|---|---|
| All | 811 | 16 | 46 | 0.383 | 46 / 0 | 0.422 |

**Top-3 betweenness:** `Cnf4`, `Cop1`, `Cnf1` (not marked in the figure —
see the presentation changes above). Read these with the stability caveat
below.

### Internal consistency (Cronbach's α)

| Sample | Cmt | Cnf | Cop | Cmp |
|---|---|---|---|---|
| All | .824 | .807 | .805 | .796 |

### Stability (case-dropping bootstrap, 1,000 subsamples)

CS coefficient = the largest proportion of cases that can be dropped while the
centrality order still correlates ≥ .70 with the full-sample order in 95% of
subsamples. ≥ .50 is considered strong, ≥ .25 the minimum for interpretation.
All 1,000 subsamples were usable.

| Sample | Strength | Betweenness | Bridge strength |
|---|---|---|---|
| All | **0.672** strong | 0.000 low | **0.750** strong |

Strength and bridge strength are stable enough to interpret. **Betweenness is
not** (CS = 0.000) — the same limitation the Grit analysis and the reference
paper report for betweenness-type metrics. See *Interpretation cautions*.

---

## Interpretation cautions

**Betweenness.** As in the Grit analysis and in the reference paper,
betweenness is typically the least stable of the centrality indices — see the
`CS_Coefficients` sheet. Strength and bridge strength are the metrics to lean
on in the write-up. (`BADGE_METRIC` / `N_BADGE` in *OPTIONAL SETTINGS* now
only control which nodes are listed as "top nodes" in the console and in the
Settings sheet — nothing is marked in the figure any more.)

**These are cross-sectional, undirected associations.** A GGM edge is a partial
correlation, not a causal path.

---

## Reference

Tu, Y., Huang, C., Pan, Y., & Hwang, G.-J. (2026). Mapping the structure of
student burnout in online learning: An integrated Gaussian model and directed
acyclic graph approach. *The Internet and Higher Education, 70*, 101077.
