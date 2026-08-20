# New Dataset 2 (Programming Resilience) — Bridge strength centrality, Figure 3

**Date:** 19 August 2026
**Script:** `Figure3_Bridge_Strength_ProgrammingResilience.R`
**Data:** `01_Programming_Resilience_811.xlsx` (not copied into this folder — the script asks you to select it)

This folder repeats the bridge-strength analysis in
`../20260807_Dataset 4_Figure 3/` on the **Programming Resilience** dataset
(`01_Programming_Resilience_811.xlsx`) instead of the Grit dataset
(`Grit.xlsx`). The method, the output workbook layout and the folder structure
follow the Grit analysis; the figure is drawn in exactly the **font and style
of this project's Figure 2** (`../20260819_New Dataset 2_Figure 2`), and the
networks it is computed on are the *same* networks as that Figure 2 run — only
the centrality index differs (bridge strength instead of node strength).

| | |
|---|---|
| Script | `Figure3_Bridge_Strength_ProgrammingResilience.R` |
| Data | `01_Programming_Resilience_811.xlsx` (chosen with `file.choose()` when the script runs) |
| Groups | All (n = 811), Male (n = 408), Female (n = 403) |
| Nodes | 16 items — Cmt1–Cmt4, Cnf1–Cnf4, Cop1–Cop4, Cmp1–Cmp4 (none excluded) |
| Communities | the four item blocks: **Cmt, Cnf, Cop, Cmp** |
| Estimator | EBICglasso (GGM + graphical LASSO), γ = 0.50 |
| Correlations | `qgraph::cor_auto()` — polychoric for the ordinal Likert items |
| Seed | 2026 |

---

## How to run it (Windows, macOS or Linux)

1. Open `Figure3_Bridge_Strength_ProgrammingResilience.R` in RStudio (or plain R).
2. Press **Source** — `Ctrl+Shift+S` on Windows, `Cmd+Shift+S` on macOS.
3. A **file-selection window** opens. Choose **`01_Programming_Resilience_811.xlsx`**.
4. That is the only manual step. Everything else runs by itself.

Results are written to a folder called **`Results_Figure3`**, created next to
the Excel file you selected (the files in *this* folder were produced by
setting `OUT_DIR` to this folder before sourcing). The full path is printed in
the console when the run finishes.

**Run time.** Under a minute. No bootstrapping is involved.

**Packages.** On start-up the script checks for `qgraph`, `readxl`, `ggplot2`,
`networktools`, `Matrix`, `glasso` and `lavaan`, plus one Excel writer
(`writexl` or `openxlsx`). If any are missing it asks once whether to install
them; answer `y` and it does the rest. All of them are on CRAN. To install
them yourself first:

```r
install.packages(c("qgraph", "readxl", "ggplot2", "networktools",
                   "Matrix", "glasso", "lavaan", "writexl"))
```

### Running it without the dialog

Set any of these **before** sourcing the script and it will skip the
corresponding step:

```r
DATA_FILE  <- "C:/Users/Sandy/Desktop/01_Programming_Resilience_811.xlsx"  # skip the file dialog
OUT_DIR    <- "C:/Users/Sandy/Desktop/Fig3 output"  # choose the output folder
COR_METHOD <- "pearson"                             # Pearson sensitivity run
source("Figure3_Bridge_Strength_ProgrammingResilience.R")
```

Windows paths may be written with forward slashes (`"C:/Users/..."`) or with
doubled backslashes (`"C:\\Users\\..."`). Both work, and no path is hard-coded
anywhere in the script — every path is built with `file.path()`.

---

## The data

`01_Programming_Resilience_811.xlsx`: **811 respondents**, 18 columns, no
missing values.

| Columns | Role |
|---|---|
| `ID` | respondent ID — **ignored** |
| `Gender` | grouping variable: **"M" = male (n = 408), "F" = female (n = 403)** |
| `Cmt1`–`Cmt4` (4) | item block — network node, community **Cmt** |
| `Cnf1`–`Cnf4` (4) | item block — network node, community **Cnf** |
| `Cop1`–`Cop4` (4) | item block — network node, community **Cop** |
| `Cmp1`–`Cmp4` (4) | item block — network node, community **Cmp** |

The four item blocks play the role that Com / CE / CA / CH played in the Grit
analysis: they are the **communities** between which bridge strength is
measured. All items are 5-point responses with no missing values.

**Reading the data.** Item columns are identified by the ASCII pattern
`^(Cmt|Cnf|Cop|Cmp)[0-9]+$`; everything that does not match is treated as
metadata. The item's prefix is also its community, so the community assignment
needs no separate lookup table. The gender column is found by its *values* —
it is the only non-item column holding exactly the two codes `M` and `F` —
not by its header text. (This is the one substantive adaptation from the Grit
script, where gender was coded numerically as 1/0.) The console prints which
column number it decided was gender, so the choice is visible on every run.

---

## Method

Unchanged from `../20260807_Dataset 4_Figure 3/Figure3_Bridge_Strength_Grit.R`:

1. **Correlations** — `qgraph::cor_auto()`, which detects the ordinal Likert
   items and computes polychoric correlations through `lavaan`.
2. **Network** — Graphical Gaussian Model estimated with graphical LASSO
   regularisation, tuning parameter selected by EBIC with **γ = 0.50**
   (`qgraph::EBICglasso`). One network per group: All, Male, Female.
3. **Bridge strength** — `networktools::bridge()`: for each node, the sum of
   the absolute edge weights (partial correlations) connecting it to all nodes
   **outside its own community** (Jones, Ma & McNally, 2021). Reported raw and
   standardised as **Z-scores within each network**, as in the paper's Figure 3.
4. **Figure** — bridge-strength Z-scores for the three groups on a common
   vertical item axis, in the same font and style as this project's Figure 2
   (same theme, colours, shapes, line types and canvas geometry; black = All,
   blue = Male, orange = Female), saved as PNG and as PDF vector art.

### Estimation path — same networks as Figure 2

The Grit Figure 3 script tried `bootnet::estimateNetwork()` first and fell
back to `cor_auto()` + `Matrix::nearPD()` + `EBICglasso()` when the polychoric
matrix was not positive definite. On this dataset no repair is ever needed —
the smallest eigenvalues are **0.241 / 0.228 / 0.208** (All / Male / Female),
comfortably positive — so the script goes straight to the documented
`cor_auto` → (`nearPD` only if needed) → `EBICglasso` path, which is exactly
the path of `../20260819_New Dataset 2_Figure 2`. The two runs therefore
produce **identical networks** (the `edge_weights_matrices.xlsx` files of the
two folders agree to the 6 decimals they are written with); this folder's
figure just reads a different centrality index off them. The estimation path,
the smallest eigenvalue and whether `nearPD` was applied are recorded per
group in the `Networks` sheet.

`qgraph::EBICglasso` prints its standard note that a dense network was
selected (λ < 0.1 × λ_max) — a property of a compact, highly inter-correlated
item battery; the same note applies to the Figure 2 run, and the smallest
edges should be read with the usual care.

---

## Item screening — kept from the Grit script, idle here

The Grit analysis had to drop CH11 (constant in the female subsample — no
female network was estimable at all with it in the data). The automatic
screening that handled this is retained unchanged: an item that is constant in
*any* group is dropped from *every* group, so the three networks always rest
on one node set.

On `01_Programming_Resilience_811.xlsx` the screening **drops nothing and
flags nothing**: every response category of every item holds at least 114 of
the 811 respondents, so no item is anywhere near degenerate. All 16 items
enter all three networks. The check is still recorded in the `Item_screening`
and `Info` sheets, so the decision is auditable.

Because the CH11-style sensitivity run has no analogue here, the sensitivity
subfolder of this analysis instead varies the *correlation method*:
[`Sensitivity_Pearson/`](#sensitivity-analysis--sensitivity_pearson)
re-estimates everything from plain Pearson correlations — the same choice made
for `../20260819_New Dataset 2_Figure 2/Sensitivity_Pearson`.

---

## Output files

In this folder (and in `Results_Figure3` when you run the script yourself):

| File | Contents |
|---|---|
| `Figure3_Bridge_Strength.png` | Figure 3: bridge-strength Z-scores, three groups, 16 items, in the Figure 2 style |
| `Figure3_Bridge_Strength.pdf` | the same figure as vector art, for the manuscript |
| `Figure3_Bridge_Strength_results.xlsx` | eight sheets, below |
| `edge_weights_matrices.xlsx` | the three 16 × 16 partial-correlation matrices (`Edges_All`, `Edges_Male`, `Edges_Female`) — identical to the Figure 2 matrices |
| `Sensitivity_Pearson/` | the same four files from the Pearson-correlation run |

Sheets in `Figure3_Bridge_Strength_results.xlsx`:

| Sheet | Contents |
|---|---|
| `Bridge_wide` | one row per item: raw and Z bridge strength for each of the three groups |
| `Bridge_long` | the same in long form (the exact data plotted in the figure) |
| `Communities` | the item → community assignment used |
| `Networks` | per group: N, nodes, edges, sparsity, estimation path, smallest eigenvalue of the correlation matrix, whether `nearPD` was applied |
| `Item_screening` | per item and group: SD, response levels, modal response and %, cases outside the modal category, usable flag, note |
| `Descriptives` | N, mean and SD per item and group |
| `Info` | every parameter of the run, package versions and platform |
| `Robustness_Pearson` | the polychoric-vs-Pearson comparison described below *(new relative to the Grit workbook)* |

---

## Results

16 items, EBIC γ = 0.50, cor_auto (polychoric).

| Group | n | Nodes | Edges (of 120) | Sparsity | max \|edge\| |
|---|---|---|---|---|---|
| All | 811 | 16 | 62 | .483 | .419 |
| Male | 408 | 16 | 50 | .583 | .403 |
| Female | 403 | 16 | 51 | .575 | .403 |

The edge counts are identical to the Figure 2 run, as they must be — same
networks. Cross-block edges are the majority by count (61% / 52% / 53%) but
carry about a quarter of the total absolute edge weight (25% / 21% / 21%),
i.e. the strong edges are mostly *within* an item block and the between-block
links that bridge strength measures are individually weaker and more numerous
— the same pattern as in the Grit data.

### Highest and lowest bridge strength

| Group | Top 5 (raw / Z) | Lowest 3 (raw / Z) |
|---|---|---|
| All | **Cop4** (.405 / 1.41), **Cnf4** (.400 / 1.36), Cnf2 (.348 / 0.92), Cmp4 (.329 / 0.75), Cmp2 (.321 / 0.68) | Cnf3 (.013 / −1.99), Cmp3 (.102 / −1.21), Cop3 (.103 / −1.21) |
| Male | **Cop4** (.356 / 1.92), **Cnf4** (.289 / 1.19), Cmp4 (.261 / 0.88), Cmp2 (.256 / 0.83), Cnf2 (.256 / 0.82) | Cnf3 (.023 / −1.72), Cmp3 (.066 / −1.25), Cop3 (.086 / −1.04) |
| Female | **Cop4** (.396 / 1.78), **Cnf2** (.354 / 1.42), Cnf4 (.307 / 1.01), Cmt4 (.270 / 0.70), Cmp2 (.265 / 0.66) | Cop3 (.020 / −1.45), Cmp3 (.058 / −1.12), Cnf3 (.058 / −1.12) |

**Cop4 is the leading bridge node in every group**, with Cnf4 and Cnf2 as the
other consistent front-runners; Cmp2 appears in the top five of all three
networks as well. At the other end, **the "third" item of the Cnf, Cop and
Cmp blocks (Cnf3, Cop3, Cmp3) sits in the bottom three of every group** — the
same items that Figure 2 found consistently peripheral by node strength, so
their low standing is not specific to one index.

Unlike Grit — where the male profile diverged sharply from the other two
(Male–Female r = .50) — the three groups agree closely here: All–Male
r = .95, All–Female r = .86, Male–Female r = .81 across the 16 Z-scores
(Spearman .96 / .91 / .84). The visible gender differences are ones of degree
(e.g. Cnf2 ranks 2nd for women but 5th for men), and with 16 well-measured
items and n ≥ 403 per subgroup they are far better supported than the Grit
contrasts were — though adjacent-rank differences of a few hundredths should
still not be over-interpreted (see the robustness note below).

### Bridge strength by community (mean raw)

| Community | All | Male | Female |
|---|---|---|---|
| Cmt (4 items) | .214 | .151 | .174 |
| **Cnf (4 items)** | **.264** | .187 | **.224** |
| Cop (4 items) | .252 | **.199** | .188 |
| Cmp (4 items) | .238 | .186 | .167 |

The four blocks are much closer to each other than Grit's were (where CE led
CH by a factor of two in every group): no block dominates, and the lead block
even differs by group (Cnf for All and Female, Cop — barely — for Male). The
outward connectivity of this questionnaire is carried by specific items
(Cop4, Cnf4, Cnf2) rather than by a whole block.

---

## Robustness check: polychoric vs Pearson

The script re-estimates each network from plain **Pearson** correlations and
reports how closely the bridge-strength orderings agree
(`Robustness_Pearson` sheet):

| Group | Polychoric edges | Pearson edges | r (bridge) | ρ (bridge) | Top-5 overlap |
|---|---|---|---|---|---|
| All | 62 | 45 | 0.894 | 0.938 | 5 / 5 |
| Male | 50 | 51 | 0.989 | 0.985 | 5 / 5 |
| Female | 51 | 42 | 0.969 | 0.926 | 4 / 5 |

The agreement is far better than it was for Grit, because these items are
well distributed over all five response categories — the thin-cell
instability that destabilised the Grit polychoric estimates does not exist
here. Which items bridge and which do not is method-independent.

As always with regularised networks, the exact rank order of *adjacent* nodes
is not a strong claim: do not report "item X bridges more than item Y" for
two items whose raw values differ by only a few hundredths without
bootstrapped difference tests. In this project that kind of stability work
sits with Figure 1 (`../20260819_New Dataset 2_Figure 1/`), so it is not
duplicated here.

---

## Sensitivity analysis — `Sensitivity_Pearson/`

The same script with `COR_METHOD <- "pearson"`, i.e. all three networks
re-estimated from plain Pearson correlations, with the full four output files.
Same seed, same everything else:

| Group | n | Nodes | Edges | Top 3 bridge strength (raw / Z) |
|---|---|---|---|---|
| All | 811 | 16 | 45 | Cop4 (.366 / 2.05), Cnf2 (.288 / 1.30), Cmp2 (.243 / 0.88) |
| Male | 408 | 16 | 51 | Cop4 (.351 / 1.91), Cnf4 (.285 / 1.20), Cnf2 (.276 / 1.10) |
| Female | 403 | 16 | 42 | Cop4 (.367 / 2.00), Cnf2 (.317 / 1.56), Cmp2 (.227 / 0.76) |

To reproduce it:

```r
COR_METHOD <- "pearson"
source("Figure3_Bridge_Strength_ProgrammingResilience.R")
```

The Pearson networks are a little sparser in the All and Female groups
(Pearson correlations of coarse Likert items run about 0.05–0.10 lower than
polychoric ones, so fewer edges survive the LASSO). **Cop4 remains the top
bridge node in every group**, Cnf3/Cop3/Cmp3 remain at the bottom, and the
visible movement is confined to the mid-table (e.g. Cnf4 slips from 2nd to
4th in the All group) — exactly the adjacent-rank shuffling the robustness
note warns against over-interpreting. The substantive picture is unchanged.

*(Why this sensitivity run and not an item-exclusion run: the Grit folder's
`Sensitivity_CH11_kept/` existed to document a nearly-constant item. No item
in this dataset has that problem, so the correlation method — the only
consequential analytic choice left — is what is varied here, matching the
Figure 2 folder's `Sensitivity_Pearson/`.)*

---

## What changed from the Grit script

The statistical procedure is identical. The changes are dataset handling and
the alignment of the figure and the estimation path with this project's
Figure 2.

| # | Change | Why |
|---|---|---|
| 1 | Input file `01_Programming_Resilience_811.xlsx` instead of `Grit.xlsx` | new dataset |
| 2 | Gender codes `"M"` / `"F"` (text), found by value | this file codes gender as text, not 1/0 |
| 3 | Communities Cmt / Cnf / Cop / Cmp, item pattern `^(Cmt|Cnf|Cop|Cmp)[0-9]+$` | the four blocks of this questionnaire |
| 4 | `EXCLUDE_ITEMS` defaults to empty | no CH11-style item exists here; the mechanism is kept for future datasets |
| 5 | Estimation goes straight to `cor_auto` → (`nearPD` if needed) → `EBICglasso`, without the `bootnet` detour | matches the Figure 2 script exactly, so the two folders share bit-identical networks; the Grit fallback logic is what remains |
| 6 | New `COR_METHOD` switch and `Robustness_Pearson` sheet | replaces the CH11 sensitivity machinery; same design as the Figure 2 folder |
| 7 | Figure drawn with Figure 2's exact theme and canvas geometry, and saved as PDF as well as PNG | the figures of the manuscript must share one style |
| 8 | Item screening retained but idle | nothing to drop or flag in this dataset; the audit trail stays in the workbook |

---

## References

Jones, P. J., Ma, R., & McNally, R. J. (2021). Bridge centrality: A network
approach to understanding comorbidity. *Multivariate Behavioral Research, 56*(2),
353–367.

Tu, Y., Huang, C., Pan, Y., & Hwang, G.-J. (2026). Mapping the structure of
student burnout in online learning: An integrated Gaussian model and directed
acyclic graph approach. *The Internet and Higher Education, 70*, 101077.

Reference run recorded 19 August 2026 with R 4.4.2, qgraph 1.9.8,
networktools 1.6.0 on macOS. The analysis is fully deterministic under
`set.seed(2026)`, so re-running it reproduces these numbers exactly on any
platform.

Related folders in this project: `../20260807_Dataset 4_Figure 3/` (the Grit
analysis this one ports), `../20260819_New Dataset 2_Figure 2/` (node
strength centrality on the same networks), `../20260819_New Dataset 2_Figure 4/`
(DAG analysis of the same data).
