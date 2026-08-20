# New Dataset 2 (Programming Resilience) — Node strength centrality, Figure 2

This folder repeats the analysis in
`../20260807_Dataset 4_Figure 2/network_strength_centrality_Grit.R` on the
**Programming Resilience** dataset (`01_Programming_Resilience_811.xlsx`)
instead of the Grit dataset (`Grit.xlsx`).

Everything in the reference folder is reproduced: three Gaussian graphical
models (All / Male / Female) estimated with graphical LASSO and EBIC model
selection, node strength reported raw and as within-network Z-scores, the same
output files, and the same Figure 2 plot style.

| | |
|---|---|
| Script | `network_strength_centrality_ProgrammingResilience.R` |
| Data | `01_Programming_Resilience_811.xlsx` (chosen with `file.choose()` when the script runs) |
| Groups | All (n = 811), Male (n = 408), Female (n = 403) |
| Nodes | 16 items — Cmt1–Cmt4, Cnf1–Cnf4, Cop1–Cop4, Cmp1–Cmp4 (none excluded) |
| Estimator | EBICglasso (GGM + graphical LASSO), γ = 0.50 |
| Correlations | `qgraph::cor_auto()` — polychoric for the ordinal Likert items |
| Seed | 2026 |

---

## How to run it (Windows, macOS or Linux)

1. Open `network_strength_centrality_ProgrammingResilience.R` in **RStudio**
   (or plain R).
2. Press **Source** — `Ctrl+Shift+S` on Windows, `Cmd+Shift+S` on macOS.
3. A file-selection window opens. **Choose `01_Programming_Resilience_811.xlsx`.**
4. That is all. When the run finishes, the console prints the full path of
   the folder the results went into.

Results are written to a folder called **`Figure2_Results`**, created next to
the Excel file that was selected (the files in *this* folder were produced by
setting `OUT_DIR` to this folder before sourcing). Nothing is written anywhere
else, and no path is hard-coded anywhere in the script — every path is built
with `file.path()` from the folder you picked, so it works the same on a
Windows `C:\Users\...\Desktop` as on a Mac.

Run time is well under a minute: with only 16 items the polychoric correlation
matrices are quick.

### If a package is missing

On start-up the script checks for `qgraph`, `readxl`, `ggplot2`, `lavaan`,
`Matrix` and one of `openxlsx` / `writexl`. If any are missing it lists them
and asks once whether to install them from CRAN. Answering `n` stops the run
and prints the exact `install.packages(...)` line to paste in.

If neither `openxlsx` nor `writexl` can be installed, the tables are written
as `.csv` files instead of `.xlsx`, so a run never fails just because of a
writer package.

### Running it without the dialog

Set any of these **before** sourcing the script and it will skip the
corresponding step:

```r
DATA_FILE  <- "C:/Users/Sandy/Desktop/01_Programming_Resilience_811.xlsx"  # skip the file dialog
OUT_DIR    <- "C:/Users/Sandy/Desktop/Fig2 output"  # choose the output folder
COR_METHOD <- "pearson"                             # Pearson sensitivity run
source("network_strength_centrality_ProgrammingResilience.R")
```

Windows paths may be written with forward slashes (`"C:/Users/..."`) or with
doubled backslashes (`"C:\\Users\\..."`). Both work.

---

## The data

`01_Programming_Resilience_811.xlsx` has 811 rows and 18 columns, with no
missing values:

| Columns | Role |
|---|---|
| `ID` | respondent ID — ignored |
| `Gender` | grouping variable; **"M" = male (408), "F" = female (403)** |
| `Cmt1`–`Cmt4`, `Cnf1`–`Cnf4`, `Cop1`–`Cop4`, `Cmp1`–`Cmp4` | the 16 items |

All items are 5-point Likert (1–5) and `cor_auto()` correctly detects all of
them as ordinal. Every response category of every item holds at least 114 of
the 811 respondents, so the data are far better conditioned than Grit.xlsx.

As in the Grit script, nothing is matched by column position or header
encoding: item columns are found with the ASCII pattern
`^(Cmt|Cnf|Cop|Cmp)[0-9]+$`, and the gender column is found by its *values* —
it is the only non-item column containing exactly the two codes `M` and `F`.
(This is the one substantive adaptation from the Grit script, where gender was
coded numerically as 1/0.) The console prints which column number it decided
was gender, so the choice is visible on every run.

Items are sorted by block and then numerically (Cmt1 … Cmt4, Cnf1, …), so the
figure always reads in questionnaire order.

---

## Differences from the Grit folder — please read this once

Two things that dominated the Grit analysis simply do not arise here:

1. **No item is excluded.** Grit's CH11 was answered identically by 467 of
   468 respondents, which made its polychoric correlations meaningless and
   forced a 43-item main analysis plus a `Sensitivity_with_CH11/` run. In
   this dataset every item uses all five response categories heavily
   (smallest cell: 114 people), so `EXCLUDE_ITEMS` defaults to `character(0)`
   and all 16 items are in the main analysis. The `EXCLUDE_ITEMS` mechanism
   is kept in the script in case a future dataset needs it.

2. **No positive-definiteness repair was needed.** All three polychoric
   correlation matrices are comfortably positive definite (minimum
   eigenvalues 0.241 / 0.228 / 0.208 for All / Male / Female), so
   `Matrix::nearPD()` was never invoked — the `Correlation_diagnostics`
   sheet records `nearPD_applied = FALSE` and a change of exactly 0 for
   every group. The repair code is retained but idle.

Because the CH11-style sensitivity run has no analogue here, the sensitivity
subfolder of this analysis instead varies the *correlation method*:
`Sensitivity_Pearson/` re-estimates everything from plain Pearson
correlations (see below).

---

## Method

Following Tu, Y., Huang, C., Pan, Y., & Hwang, G.-J. (2026). *Mapping the
structure of student burnout in online learning: An integrated Gaussian model
and directed acyclic graph approach.* The Internet and Higher Education, 70,
101077 — the same paper the reference scripts follow.

1. **Correlations** — `qgraph::cor_auto()`, which detects ordinal Likert items
   and computes polychoric correlations via `lavaan`.
2. **Positive-definiteness check** — if the matrix were not positive definite,
   `Matrix::nearPD(corr = TRUE)` would repair it and the size of the repair
   would be reported in the `Correlation_diagnostics` sheet. (Not needed for
   any group in this dataset.)
3. **Network** — `qgraph::EBICglasso(S, n, gamma = 0.5)`: a Gaussian graphical
   model with graphical-LASSO regularization and EBIC model selection.
4. **Node strength** — the sum of the absolute edge weights (partial
   correlations) attached to each node, reported raw and standardized as
   Z-scores *within each network*, as in the paper's Figure 2. The script
   computes strength twice — via `qgraph::centrality()` and directly as
   `rowSums(abs(W))` — and warns if the two ever disagree.

---

## Output files

| File | Contents |
|---|---|
| `Figure2_strength_centrality.png` | The figure — strength Z-scores for all 16 nodes, three groups, in the reference script's style (black = All, blue = Male, orange = Female) |
| `Figure2_strength_centrality.pdf` | The same figure as vector art, for the manuscript |
| `strength_centrality_results.xlsx` | Five sheets, described below |
| `edge_weights_matrices.xlsx` | The 16 × 16 partial-correlation matrix for each group (`Edges_All`, `Edges_Male`, `Edges_Female`) |
| `Sensitivity_Pearson/` | The same four files from the Pearson-correlation run |

`strength_centrality_results.xlsx`:

| Sheet | Contents |
|---|---|
| `Strength_wide` | One row per node: raw strength, Z-score and rank within each of the three networks |
| `Strength_long` | The same numbers stacked (Node, Group, Strength_raw, Strength_z) — the format the figure is drawn from |
| `Info` | Group sizes, node and edge counts, density, estimator, γ, seed, excluded items, R and qgraph versions |
| `Correlation_diagnostics` | Per group: minimum eigenvalue, number of negative eigenvalues, whether `nearPD` was applied and by how much |
| `Robustness_Pearson` | The polychoric-vs-Pearson comparison described below |

---

## Results

Main run, 16 items, polychoric correlations:

| Group | n | Nodes | Edges | Density | Strongest node |
|---|---|---|---|---|---|
| All | 811 | 16 | 62 | 0.517 | Cnf1 (1.159) |
| Male | 408 | 16 | 50 | 0.417 | Cmt1 (1.084) |
| Female | 403 | 16 | 51 | 0.425 | Cnf1 (1.077) |

For scale, the Grit networks in the reference folder have densities of 0.34
(All), 0.25 (Male) and 0.34 (Female), so these networks are somewhat *denser*
— expected with only 16 nodes and a large sample.

**Top five nodes by raw strength**

| Rank | All | Male | Female |
|---|---|---|---|
| 1 | Cnf1 (1.159) | Cmt1 (1.084) | Cnf1 (1.077) |
| 2 | Cmt1 (1.132) | Cmp1 (1.059) | Cnf2 (1.041) |
| 3 | Cop1 (1.077) | Cnf2 (0.988) | Cmt1 (1.018) |
| 4 | Cnf2 (1.073) | Cop2 (0.977) | Cmt3 (1.009) |
| 5 | Cmp2 (1.066) | Cop1 (0.963) | Cmp2 (1.007) |

**Weakest nodes.** Cnf3 is the least central item in the All network (0.726)
and Cmp3 in both the Male (0.646) and Female (0.711) networks; Cnf3, Cop3 and
Cmp3 sit in the bottom three of every group, so the "third" item of each of
those blocks is consistently peripheral.

**Block averages of raw strength** — the four item blocks are close to each
other everywhere, with no block dominating:

| Group | Cmt | Cnf | Cop | Cmp |
|---|---|---|---|---|
| All | 0.953 | 0.973 | 0.956 | 0.930 |
| Male | 0.832 | 0.862 | 0.881 | 0.829 |
| Female | 0.925 | 0.919 | 0.874 | 0.859 |

Cnf1 is the most central item overall and for women; the male network is led
by Cmt1 (which is also the runner-up in the other two groups). Cmt1, Cnf2 and
Cmp2 appear in the top five of all three networks.

---

## Robustness check: polychoric vs Pearson

The script re-estimates each network from plain **Pearson** correlations and
reports how closely the two agree (`Robustness_Pearson` sheet):

| Group | Polychoric edges | Pearson edges | r (strength) | ρ (strength) | Top-5 overlap |
|---|---|---|---|---|---|
| All | 62 | 45 | 0.885 | 0.865 | 4 / 5 |
| Male | 50 | 51 | 0.986 | 0.988 | 4 / 5 |
| Female | 51 | 42 | 0.960 | 0.950 | 4 / 5 |

**How to read this.** The agreement is far better than it was for Grit
(where r fell as low as 0.55), because these items are well distributed over
all five response categories — the thin-cell instability that destabilized
the Grit polychoric estimates does not exist here. The broad picture — which
items are central, which are peripheral, and the near-equality of the four
blocks — is method-independent.

As always with regularized networks, the exact rank order of *adjacent* nodes
is not a strong claim: do not report "item X is more central than item Y" for
two items whose strengths differ by only a few hundredths, and if the
manuscript needs such a claim, back it with bootstrapped
centrality-difference tests (`bootnet::bootnet(..., type = "case")` and
`differenceTest()`) rather than with the point estimates in this folder. In
this project that kind of stability work sits with Figure 1
(`../20260819_New Dataset 2_Figure 1/2_Excel_Metrics/Stability.xlsx`), not
with Figure 2, so it is not duplicated here.

`qgraph` prints the warning *"A dense regularized network was selected
(lambda < 0.1 × lambda.max)"* for these networks, advising care with the
smallest edges. The same warning applies to the reference analyses.

---

## Sensitivity analysis — `Sensitivity_Pearson/`

The same script with `COR_METHOD <- "pearson"`, i.e. all three networks
re-estimated from plain Pearson correlations, with the full four output files:

| Group | n | Nodes | Edges | Density | Strongest node |
|---|---|---|---|---|---|
| All | 811 | 16 | 45 | 0.375 | Cnf2 (0.978) |
| Male | 408 | 16 | 51 | 0.425 | Cmt1 (1.030) |
| Female | 403 | 16 | 42 | 0.350 | Cnf2 (0.959) |

To reproduce it:

```r
COR_METHOD <- "pearson"
source("network_strength_centrality_ProgrammingResilience.R")
```

The Pearson networks are a little sparser (Pearson correlations of coarse
Likert items run about 0.05–0.10 lower than polychoric ones, so fewer edges
survive the LASSO), and the lead switches between the two Cnf front-runners
(Cnf2 instead of Cnf1) in the All and Female groups — exactly the sort of
adjacent-rank swap the robustness note above warns against over-interpreting.
The substantive picture is unchanged.

*(Why this sensitivity run and not an item-exclusion run: the Grit folder's
`Sensitivity_with_CH11/` existed to document a nearly-constant item. No item
in this dataset has that problem, so the correlation method — the only
consequential analytic choice left — is what is varied here.)*

---

## Reference

Tu, Y., Huang, C., Pan, Y., & Hwang, G.-J. (2026). Mapping the structure of
student burnout in online learning: An integrated Gaussian model and directed
acyclic graph approach. *The Internet and Higher Education, 70,* 101077.

Reference run recorded 19 August 2026 with R 4.4.2, qgraph 1.9.8, lavaan
0.6.21 on macOS. The analysis is fully deterministic under `set.seed(2026)`,
so re-running it reproduces these numbers exactly on any platform.
