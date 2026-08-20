# New Dataset 2 (Programming Resilience) — Item-level Pearson correlation analysis

This folder repeats the analysis in
`../20260807_Dataset 4_Correlation Analysis/correlation_analysis_Grit.R`
on the **Programming Resilience** dataset
(`01_Programming_Resilience_811.xlsx`) instead of the Grit dataset
(`Grit.xlsx`).

Everything in the Grit reference analysis is reproduced: Pearson correlations
between every pair of questionnaire items for three groups (All / Male /
Female), the matching matrix of two-sided p-values, the same significance
heat map, the same file names, and the same one-row-per-group summary table.

| | |
|---|---|
| Script | `correlation_analysis_ProgrammingResilience.R` |
| Data | `01_Programming_Resilience_811.xlsx` (chosen with `file.choose()` when the script runs) |
| Groups | All (n = 811), Male (n = 408), Female (n = 403) |
| Items | 16 — Cmt1–Cmt4, Cnf1–Cnf4, Cop1–Cop4, Cmp1–Cmp4 |
| Correlation | Pearson, pairwise-complete observations |
| p-values | `stats::cor.test()`, two-sided, **unadjusted** |
| Pairs per group | 120 |
| Seed | none needed — nothing here is random |

This is the descriptive, zero-order correlation analysis. It is **not** a
network model: no regularization, no partial correlations, no model
selection. Each cell is just the correlation of two items.

---

## How to run it (Windows, macOS or Linux)

1. Open `correlation_analysis_ProgrammingResilience.R` in **RStudio** (or
   plain R).
2. Press **Source** — `Ctrl+Shift+S` on Windows, `Cmd+Shift+S` on macOS.
3. A file-selection window opens. **Choose
   `01_Programming_Resilience_811.xlsx`.**
4. That is all. When the run finishes, the console prints the full path of
   the folder the results went into.

Results are written to a folder called **`Correlation_Results`**, created next
to the Excel file that was selected. Nothing is written anywhere else, and no
path is hard-coded anywhere in the script — every path is built with
`file.path()` from the folder you picked, so it works the same on a Windows
`C:\Users\...\Desktop` as on a Mac.

Run time is a few seconds.

### If a package is missing

The script checks its packages before doing anything. It needs

```
readxl      to read the Excel file
ggplot2     to draw the heat maps
openxlsx  or  writexl     to write the .xlsx files
```

If any are missing you are asked once, in the console, whether to install them
from CRAN; answer `y`. If you would rather install them yourself first:

```r
install.packages(c("readxl", "ggplot2", "writexl"))
```

If neither `openxlsx` nor `writexl` can be installed, the run still finishes —
the tables are written as `.csv` instead of `.xlsx`, and the script says so.

### Running it without the dialog

To skip the file picker (for example when re-running in a loop), define the
paths before sourcing:

```r
DATA_FILE <- "C:/Users/Sandy/Desktop/01_Programming_Resilience_811.xlsx"
OUT_DIR   <- "C:/Users/Sandy/Desktop/Correlation results"
source("correlation_analysis_ProgrammingResilience.R")
```

Both forms of Windows path work (`C:/...` or `C:\\...`). `OUT_DIR` is
optional; leave it out and the results go to `Correlation_Results` next to
`DATA_FILE` as usual.

### Encoding

The script never matches a column by header text:

* item columns are found with the ASCII pattern `^(Cmt|Cnf|Cop|Cmp)[0-9]+$`;
* the gender column is found by its **values** — it is the only non-item
  column that holds exactly the two codes `"M"` and `"F"`.

The script file itself contains no non-ASCII character either: the `×` symbol
used in the figures is written as the escape `"\u00d7"`. So nothing in the run
depends on the machine's text encoding.

---

## The data

`01_Programming_Resilience_811.xlsx`, one sheet, 811 respondents × 18 columns.

| Column | Role |
|---|---|
| `ID` | respondent ID — ignored |
| `Gender` | **"M" = male, "F" = female** (text codes, unlike the 1/0 coding in `Grit.xlsx`) |
| `Cmt1`–`Cmt4` | 4 items (Commitment) |
| `Cnf1`–`Cnf4` | 4 items (Confidence) |
| `Cop1`–`Cop4` | 4 items (Coping) |
| `Cmp1`–`Cmp4` | 4 items (Composure) |

All 16 items are 1–5 Likert responses, and there are **no missing values** —
811 complete cases, 408 men and 403 women. No item is constant in any group,
so — unlike the Grit analysis, where CH11 was constant among the women —
every one of the 120 pairs is defined in every group. (The script does not
require complete data: each correlation is computed from whatever complete
pairs exist for its own two items, and any missingness is reported in the
console.)

The item order in every matrix and figure is block order —
`Cmt1 … Cmt4, Cnf1 … Cnf4, Cop1 … Cop4, Cmp1 … Cmp4` — the questionnaire's
own order, not alphabetical order.

---

## Method

Exactly the Grit reference analysis, item for item:

* **Correlation** — `stats::cor(items, use = "pairwise.complete.obs",
  method = "pearson")`.
* **p-values** — `stats::cor.test()` on the same pairwise-complete data, one
  two-sided test per item pair. A pair is left `NA` when fewer than 3 complete
  observations are available or when either item is constant (neither happens
  in this dataset). The diagonal of the p-value matrix is set to 0, except for
  a constant item, where it would be `NA`.
* **No multiple-comparison adjustment.** The reference reports raw p-values,
  so this does too, and the two are directly comparable. See the note at the
  end if you want corrected significance.
* **Groups** — All, Male, Female, each correlated separately.
* **Heat map** — upper triangle coloured by *r* (no text labels); lower
  triangle labelled with *r* itself to two decimals; diagonal `1.00`.
  Blue = positive, red = negative, on a fixed −1…+1 scale. Significance is
  not marked on the figure — it is available in the exported p-value
  matrices.

### Differences from the Grit reference script, and why

Only three, none of which touches a number:

1. **Dataset adaptation.** The item pattern is
   `^(Cmt|Cnf|Cop|Cmp)[0-9]+$` (16 items in 4 blocks instead of 44 in 4
   blocks), and the gender column is matched on the text codes `"M"`/`"F"`
   instead of the numeric codes `1`/`0` used in `Grit.xlsx`.
2. **The figures carry no title, no caption, and no significance marks**
   (requested 19 Aug 2026): the group-name title above the heat map, the
   one-line explanatory caption below it, and the `***` / `**` / `*` / `×`
   labels in the upper triangle — all present in the Grit figures — are not
   drawn. The upper triangle shows only the colour fill. Everything else
   about the figure — cell size (0.308 in per cell), colours, label fonts,
   the legend — is unchanged. The group each figure belongs to is identified
   by its folder (`all_MF`, `male_M`, `female_F`), and significance is
   available in the exported `pearson_p_value_matrix` files.
3. **`EXCLUDE_ITEMS` is empty and stays empty.** The Grit script documented
   an optional CH11 exclusion; this dataset has no problem item, so nothing
   is excluded.

---

## Output files

Written to `Correlation_Results/` next to the chosen Excel file (and stored
in this folder for the reference run).

```
all_MF/     male_M/     female_F/
    pearson_correlation_matrix.csv          16 x 16 Pearson r
    pearson_correlation_matrix.xlsx
    pearson_p_value_matrix.csv              16 x 16 two-sided p
    pearson_p_value_matrix.xlsx
    correlation_heatmap_with_significance.png
    correlation_heatmap_with_significance.pdf      (extra: vector art)

correlation_analysis_output_summary.csv     one row per group
correlation_analysis_output_summary.xlsx
correlation_analysis_diagnostics.xlsx       (extra)
```

The folder names `all_MF`, `male_M`, `female_F`, the file names inside them,
and the columns of `correlation_analysis_output_summary` are all identical to
the Grit reference analysis, so the two output trees line up folder for
folder.

`correlation_analysis_diagnostics.xlsx` has four sheets:

| Sheet | Contents |
|---|---|
| `Info` | per group: n, pairs, undefined pairs, counts significant at .05/.01/.001, mean \|r\|, min/max r, constant items, software and run date |
| `Item_summary` | per group per item: n, mean, SD, min, max, number of distinct answers, and whether the item is constant |
| `Undefined_pairs` | every pair whose r or p is `NA`, and why (empty in this dataset) |
| `Top_correlations` | the 20 strongest correlations in each group |

**Note on the file paths inside `correlation_analysis_output_summary.csv`:**
the `heatmap_png`, `correlation_matrix_csv` and `p_value_matrix_csv` columns
record the absolute paths of the run that produced them — so the copy stored
here shows this Mac's paths. Your own run rewrites them with your own paths.

---

## Results (reference run, 19 Aug 2026, R 4.4.1)

| group | n | items | pairs | undefined | p<.05 | p<.001 | mean \|r\| | range of r |
|---|---|---|---|---|---|---|---|---|
| All | 811 | 16 | 120 | 0 | 87 | 67 | 0.207 | −0.013 … 0.641 |
| Male | 408 | 16 | 120 | 0 | 76 | 55 | 0.203 | −0.028 … 0.613 |
| Female | 403 | 16 | 120 | 0 | 73 | 59 | 0.213 | −0.041 … 0.671 |

The picture is very different from the Grit dataset, where nearly every pair
was significantly correlated. Here the correlations are strong **within**
each 4-item block and much weaker **between** blocks:

* Mean *r* within blocks vs between blocks: **.513 vs .129** in the full
  sample (Male .490 vs .129, Female .536 vs .129).
* In the full sample, 13 pairs reach \|r\| ≥ .50 — every one of them a
  within-block pair — 19 fall between .30 and .50, and 88 stay below .30.
* Non-significant pairs (33 in All, 44 in Male, 47 in Female) are almost all
  between-block pairs, concentrated where the blocks barely touch
  (Cmt–Cop, Cmt–Cmp, Cnf–Cmp).
* Negative correlations are rare and tiny: 3 pairs in All (weakest −.013),
  5 in Male, 8 in Female — none anywhere near significance.

Strongest pairs:

| group | 1st | 2nd | 3rd |
|---|---|---|---|
| All | Cmt1–Cmt2 (.64) | Cmt1–Cmt3 (.61) | Cmp1–Cmp2 (.60) |
| Male | Cmt1–Cmt2 (.61) | Cmp1–Cmp2 (.60) | Cop1–Cop2 (.60) |
| Female | Cmt1–Cmt3 (.67) | Cmt1–Cmt2 (.67) | Cnf1–Cnf3 (.61) |

Mean *r* by block pair, full sample (diagonal = within-block):

| | Cmt | Cnf | Cop | Cmp |
|---|---|---|---|---|
| **Cmt** | **0.540** | 0.182 | 0.050 | 0.097 |
| **Cnf** | 0.182 | **0.511** | 0.163 | 0.098 |
| **Cop** | 0.050 | 0.163 | **0.509** | 0.187 |
| **Cmp** | 0.097 | 0.098 | 0.187 | **0.492** |

The four blocks are about equally coherent internally (mean within-block r
.49–.54); the adjacent blocks Cmt–Cnf, Cnf–Cop and Cop–Cmp correlate modestly
(.16–.19), while Cmt–Cop is nearly independent (.05).

Re-running the script reproduces every number and every figure byte for byte;
nothing in this analysis is random.

---

## A note on multiple comparisons

120 tests per group with unadjusted p-values, as in the reference analysis.
If a reviewer asks for corrected significance, no re-run is needed — apply
the correction to the exported matrix:

```r
P  <- as.matrix(read.csv("all_MF/pearson_p_value_matrix.csv",
                         row.names = 1, check.names = FALSE))
up <- upper.tri(P)
p_adj <- p.adjust(P[up], method = "holm")     # or "BH" for FDR
sum(p_adj < 0.05, na.rm = TRUE)
```

For the record, a straight Bonferroni correction:

| group | p < .05 raw | p < .05 Bonferroni |
|---|---|---|
| All | 87 | 65 |
| Male | 76 | 52 |
| Female | 73 | 55 |

---

## Reference

Adapted from `../20260807_Dataset 4_Correlation Analysis/
correlation_analysis_Grit.R`, which in turn reproduces
`run_correlation_analysis()` in `sna_questionnaire_core_AI.R`.
