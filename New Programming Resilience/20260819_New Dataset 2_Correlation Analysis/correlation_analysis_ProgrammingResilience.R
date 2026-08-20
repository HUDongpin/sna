# =====================================================================
# Item-level Pearson correlation analysis of the Programming Resilience
# questionnaire data (groups: All / Male / Female)
#
# This is the same analysis as ../20260807_Dataset 4_Correlation
# Analysis/correlation_analysis_Grit.R, applied to the Programming
# Resilience dataset (01_Programming_Resilience_811.xlsx) instead of the
# Grit dataset (Grit.xlsx).
#
# ---------------------------------------------------------------------
# METHOD  (identical to the Grit reference analysis)
# ---------------------------------------------------------------------
#   - Pearson product-moment correlations between every pair of
#     questionnaire items, computed with pairwise-complete observations
#     (stats::cor(..., use = "pairwise.complete.obs", method =
#     "pearson")).
#   - Two-sided p-values from stats::cor.test() on the same pairwise-
#     complete data, one test per item pair. A pair is left undefined
#     (NA) when fewer than 3 complete observations are available or
#     when either item is constant.
#   - No p-value adjustment for multiple comparisons is applied - the
#     reference analysis reports raw p-values, and this script does the
#     same so that the two are directly comparable. With 16 items there
#     are 120 unique pairs, so if you want to report family-wise
#     corrected significance, apply the correction to the exported
#     p-value matrix (see the note at the end of README.md).
#   - Networks / partial correlations are NOT involved here. This is the
#     plain zero-order correlation matrix.
#   - Correlations are computed separately for All, Male and Female.
#
#   Because Pearson correlations are computed pair by pair, each cell
#   depends only on its own two items. Adding or removing an item from
#   the analysis therefore never changes any other cell.
#
# ---------------------------------------------------------------------
# DATA
# ---------------------------------------------------------------------
#   Input : 01_Programming_Resilience_811.xlsx, selected interactively
#           with file.choose().
#           Columns: ID, Gender, Cmt1..Cmt4, Cnf1..Cnf4, Cop1..Cop4,
#           Cmp1..Cmp4.  ID is ignored; the 16 item columns are the
#           variables that get correlated.
#           Gender: "M" = male, "F" = female (text codes).
#
#   Item columns are found with an ASCII regular expression and the
#   gender column is found by its values (the only non-item column
#   holding exactly the two codes "M" and "F"). Nothing therefore
#   depends on the machine's text encoding, which is what makes the
#   script safe to run on Windows. The script file itself is pure ASCII
#   for the same reason.
#
# ---------------------------------------------------------------------
# OUTPUT  (a "Correlation_Results" folder created next to the chosen
#          file; same file names as the Grit reference analysis)
# ---------------------------------------------------------------------
#   all_MF/    male_M/    female_F/    one folder per group, each with
#     pearson_correlation_matrix.csv        16 x 16 Pearson r
#     pearson_correlation_matrix.xlsx
#     pearson_p_value_matrix.csv            16 x 16 two-sided p
#     pearson_p_value_matrix.xlsx
#     correlation_heatmap_with_significance.png
#     correlation_heatmap_with_significance.pdf   (extra: vector art)
#
#   correlation_analysis_output_summary.csv    one row per group
#   correlation_analysis_output_summary.xlsx
#   correlation_analysis_diagnostics.xlsx      (extra) Info,
#     Item_summary, Undefined_pairs, Top_correlations
#
#   Heat map layout (identical to the Grit reference figure, except
#   that this version intentionally does NOT draw (a) the group title
#   above the figure, (b) the explanatory caption below it, and (c) any
#   text in the upper triangle - no significance stars, no "x" marks):
#     upper triangle  coloured by r, no text labels; significance is
#                     available in the exported p-value matrices
#     lower triangle  the r value itself, to two decimals
#     diagonal        1.00 (or x when the item is constant in that
#                     group, i.e. its correlation is undefined)
#
# ---------------------------------------------------------------------
# HOW TO RUN  (Windows, macOS or Linux)
# ---------------------------------------------------------------------
#   1. Open this file in RStudio (or R).
#   2. Press "Source" (Ctrl+Shift+S on Windows, Cmd+Shift+S on macOS).
#   3. A file-selection window opens -> choose
#      01_Programming_Resilience_811.xlsx.
#   4. Everything else is automatic. Results are written to a folder
#      called "Correlation_Results" created next to the file you
#      selected, and the full path is printed in the console when the
#      run finishes.
#
#   Missing packages are detected on start-up; you will be asked once
#   whether to install them.
#
#   Run time: a few seconds (360 correlation tests in total).
#
# ---------------------------------------------------------------------
# REFERENCE RUN  (19 Aug 2026, R 4.4.1)
# ---------------------------------------------------------------------
#   group    n     items  pairs  undefined  p<.05  mean |r|   range of r
#   All      811    16      120       0       87     0.207   -0.013 .. 0.641
#   Male     408    16      120       0       76     0.203   -0.028 .. 0.613
#   Female   403    16      120       0       73     0.213   -0.041 .. 0.671
#
#   Strongest pairs
#     All    : Cmt1-Cmt2 (.64), Cmt1-Cmt3 (.61), Cmp1-Cmp2 (.60)
#     Male   : Cmt1-Cmt2 (.61), Cmp1-Cmp2 (.60), Cop1-Cop2 (.60)
#     Female : Cmt1-Cmt3 (.67), Cmt1-Cmt2 (.67), Cnf1-Cnf3 (.61)
#
#   (The table and the strongest pairs above are re-printed by the
#   console summary at the end of every run; re-running reproduces
#   these numbers exactly - nothing here is random.)
# =====================================================================


# ------------------------------------------------------------------ #
# OPTIONAL SETTINGS - edit only if you want to bypass the file dialog #
# ------------------------------------------------------------------ #
# Leave DATA_FILE and OUT_DIR as NULL for the normal interactive run.
# Windows paths may be written with forward slashes ("C:/Users/...") or
# with doubled backslashes ("C:\\Users\\..."); both work.

if (!exists("DATA_FILE")) DATA_FILE <- NULL  # e.g. "C:/Users/Sandy/Desktop/01_Programming_Resilience_811.xlsx"
if (!exists("OUT_DIR"))   OUT_DIR   <- NULL  # e.g. "C:/Users/Sandy/Desktop/Correlation results"

# Items to leave out. Empty by default: all 16 items are well behaved
# in this dataset (no constant items, no missing values).
if (!exists("EXCLUDE_ITEMS")) EXCLUDE_ITEMS <- character(0)

# Also write the vector (PDF) version of each heat map. Cheap; leave on.
if (!exists("WRITE_PDF")) WRITE_PDF <- TRUE


# ------------------------------------------------------------------ #
# 0. Packages                                                         #
# ------------------------------------------------------------------ #
# All of these are on CRAN. openxlsx is used to write the workbooks
# when it is installed; writexl is accepted as an equivalent
# alternative, and if neither is present the tables are written as CSV
# files so that a run never fails just because of a writer package.

ensure_packages <- function() {
  required <- c("readxl", "ggplot2")
  writers  <- c("openxlsx", "writexl")
  have     <- function(p) requireNamespace(p, quietly = TRUE)

  miss <- required[!vapply(required, have, logical(1))]
  if (!any(vapply(writers, have, logical(1))))
    miss <- c(miss, "writexl")

  if (length(miss) == 0L) return(invisible(TRUE))

  message("\nThe following R packages are needed but not installed:\n  ",
          paste(miss, collapse = ", "), "\n")

  ok <- FALSE
  if (interactive()) {
    ans <- readline("Install them now from CRAN? [y/n]: ")
    ok  <- tolower(substr(trimws(ans), 1, 1)) == "y"
  }
  if (!ok)
    stop("Please install the packages first, then run the script again:\n\n",
         '  install.packages(c("', paste(miss, collapse = '", "'), '"))\n',
         call. = FALSE)

  install.packages(miss, repos = "https://cloud.r-project.org")

  still <- required[!vapply(required, have, logical(1))]
  if (length(still))
    stop("Installation did not succeed for: ", paste(still, collapse = ", "),
         call. = FALSE)
  invisible(TRUE)
}

ensure_packages()

suppressMessages(library(ggplot2))


# ------------------------------------------------------------------ #
# 1. Where the data comes from and where results go                   #
# ------------------------------------------------------------------ #

# Interactive Excel picker. Works the same on Windows and macOS; the
# returned path already uses the platform's own separators, and every
# later path is built with file.path(), so no separator is hard-coded.
pick_data_file <- function(preset = NULL) {
  if (!is.null(preset) && nzchar(preset)) {
    if (!file.exists(preset))
      stop("DATA_FILE was set but does not exist:\n  ", preset, call. = FALSE)
    return(normalizePath(preset, winslash = "/", mustWork = TRUE))
  }
  if (!interactive())
    stop("No DATA_FILE set and R is not running interactively, so the file\n",
         "dialog cannot open. Either run the script from RStudio/R, or set\n",
         '  DATA_FILE <- "C:/path/to/01_Programming_Resilience_811.xlsx"\n',
         "before sourcing this file.",
         call. = FALSE)

  message("\nA file-selection window will now open.")
  message("Please select the Programming Resilience Excel file ",
          "(01_Programming_Resilience_811.xlsx).\n")
  utils::flush.console()
  path <- file.choose()                       # native dialog on Windows/macOS
  if (!grepl("\\.xlsx?$", path, ignore.case = TRUE))
    stop("The selected file is not an Excel workbook (.xls / .xlsx):\n  ",
         path, call. = FALSE)
  normalizePath(path, winslash = "/", mustWork = TRUE)
}

# Default output folder: a "Correlation_Results" subfolder next to the
# file that was chosen.
resolve_out_dir <- function(data_file, preset = NULL) {
  d <- if (!is.null(preset) && nzchar(preset)) preset
       else file.path(dirname(data_file), "Correlation_Results")
  dir.create(d, showWarnings = FALSE, recursive = TRUE)
  normalizePath(d, winslash = "/", mustWork = TRUE)
}


CONFIG <- list(
  male_code    = "M",           # Gender coding in this file: "M" = male
  female_code  = "F",           #                             "F" = female
  # item columns = the variables to correlate; everything else (ID,
  # gender) is metadata. Matched on the ASCII prefixes so that nothing
  # ever has to be matched by header text.
  item_pattern = "^(Cmt|Cnf|Cop|Cmp)[0-9]+$",
  item_order   = c("Cmt", "Cnf", "Cop", "Cmp"),   # block order in the figure
  min_pairwise_n = 3,           # fewer complete pairs -> undefined
  exclude_items = if (is.null(EXCLUDE_ITEMS)) character(0)
                  else as.character(EXCLUDE_ITEMS)
)

# The three groups, using the same keys and English labels as the Grit
# reference analysis so the two output trees line up folder for folder.
GROUP_SPEC <- data.frame(
  key           = c("all_MF", "male_M", "female_F"),
  short         = c("All", "Male", "Female"),
  label_en      = c("All Students (M + F)", "Male Students (M)",
                    "Female Students (F)"),
  gender_filter = c("M+F", "M", "F"),
  stringsAsFactors = FALSE)

# "x" as the symbol for "not significant / undefined", written as an
# escape so that this source file stays pure ASCII on every platform.
MARK_NS <- "\u00d7"

FIGURE_DPI <- 300


# ------------------------------------------------------------------ #
# 2. Data input                                                       #
# ------------------------------------------------------------------ #

read_data <- function(path) {
  if (grepl("\\.xlsx?$", path, ignore.case = TRUE)) {
    as.data.frame(readxl::read_excel(path), check.names = FALSE)
  } else {
    read.csv(path, check.names = FALSE)
  }
}

# Sort items by block (Cmt, Cnf, Cop, Cmp) and then numerically inside
# the block, so the matrix reads Cmt1, Cmt2, ... Cmt4, Cnf1, ... in the
# questionnaire's own order rather than plain alphabetical order.
order_items <- function(nms, blocks) {
  prefix <- sub("[0-9]+$", "", nms)
  number <- as.integer(sub("^[A-Za-z]+", "", nms))
  nms[order(match(prefix, blocks), number)]
}

# Locate the gender column without relying on its header text: it is
# the metadata column holding exactly the two configured codes
# ("M" and "F" in this file).
find_gender_column <- function(meta, cfg) {
  codes <- sort(c(as.character(cfg$male_code), as.character(cfg$female_code)))
  hit <- vapply(meta, function(v) {
    u <- sort(unique(trimws(as.character(stats::na.omit(v)))))
    length(u) == 2L && identical(u, codes)
  }, logical(1))

  if (sum(hit) == 1L) return(names(meta)[hit])
  if (sum(hit) > 1L) {
    # more than one 2-level column: fall back to the header text
    nm <- names(meta)[hit]
    byname <- grepl("gender|sex|\u6027\u5225|\u6027\u522b", nm, ignore.case = TRUE)
    if (any(byname)) return(nm[byname][1])
    return(nm[1])
  }
  stop("Could not find a gender column coded ", cfg$female_code, "/",
       cfg$male_code, " among the non-item columns (",
       paste(names(meta), collapse = ", "), ").\n",
       "Adjust male_code / female_code in CONFIG if this file uses a\n",
       "different coding (for example 1 = male, 0 = female).", call. = FALSE)
}

prepare_groups <- function(dat, cfg) {
  is_item <- grepl(cfg$item_pattern, names(dat))
  if (!any(is_item))
    stop("No item columns matched ", cfg$item_pattern,
         ". Columns found: ", paste(names(dat), collapse = ", "),
         call. = FALSE)

  items <- dat[, is_item, drop = FALSE]
  meta  <- dat[, !is_item, drop = FALSE]     # ID, gender -> not items

  if (length(cfg$exclude_items)) {
    unknown <- setdiff(cfg$exclude_items, names(items))
    if (length(unknown))
      stop("EXCLUDE_ITEMS names columns that are not items: ",
           paste(unknown, collapse = ", "), call. = FALSE)
    message("excluding ", length(cfg$exclude_items), " item(s): ",
            paste(cfg$exclude_items, collapse = ", "))
    items <- items[, setdiff(names(items), cfg$exclude_items), drop = FALSE]
  }

  items <- items[, order_items(names(items), cfg$item_order), drop = FALSE]

  gcol   <- find_gender_column(meta, cfg)
  gender <- trimws(as.character(meta[[gcol]]))

  items[] <- lapply(items, as.numeric)

  # Nothing here requires a complete case: every correlation uses
  # whatever complete pairs exist for its own two items. Rows are
  # therefore kept, and the amount of missingness is reported instead.
  n_missing_cells <- sum(is.na(items))
  n_incomplete    <- sum(!stats::complete.cases(items))
  if (n_missing_cells > 0)
    message("NOTE: ", n_missing_cells, " missing item response(s) in ",
            n_incomplete, " row(s); correlations use pairwise-complete data.")

  # which() rather than logical indexing, so a missing gender value drops
  # the row from the subgroup instead of inserting a row of NAs
  groups <- list(
    All    = items,
    Male   = items[which(gender == as.character(cfg$male_code)),   , drop = FALSE],
    Female = items[which(gender == as.character(cfg$female_code)), , drop = FALSE])

  # An item can vary in the whole sample yet be constant inside a
  # subgroup. Such an item has no defined correlation with anything, so
  # its whole row and column - including its own diagonal cell - is NA.
  # That is the correct result, but it must be visible rather than left
  # to be discovered in the figure.
  zero_var <- lapply(groups, function(Y)
    names(Y)[vapply(Y, function(x) {
      s <- stats::sd(x, na.rm = TRUE)
      !is.finite(s) || s == 0
    }, logical(1))])
  for (g in names(zero_var))
    if (length(zero_var[[g]]))
      message("NOTE: in group '", g, "' these items are constant, so all of ",
              "their correlations are undefined (NA): ",
              paste(zero_var[[g]], collapse = ", "))

  list(groups              = groups,
       zero_var            = zero_var,
       gender_column_index = which(names(dat) == gcol)[1],
       ignored             = setdiff(names(meta), gcol),
       items               = names(items),
       n_missing_cells     = n_missing_cells)
}


# ------------------------------------------------------------------ #
# 3. Correlation and p-value matrices                                 #
# ------------------------------------------------------------------ #

# Pearson r for every pair (pairwise-complete), plus the two-sided
# p-value of stats::cor.test() for the same pair, plus the number of
# complete observations the pair was based on.
#
# Only the upper triangle is tested and the result is mirrored:
# cor.test(x, y) and cor.test(y, x) are the same test, so this is
# identical to testing every ordered pair, at half the cost.
compute_cor_p_matrices <- function(item_data, min_n = 3) {
  nms <- names(item_data)
  k   <- length(nms)
  dn  <- list(nms, nms)

  R <- suppressWarnings(
    stats::cor(item_data, use = "pairwise.complete.obs", method = "pearson"))
  R <- matrix(as.numeric(R), k, k, dimnames = dn)

  P <- matrix(NA_real_, k, k, dimnames = dn)
  N <- matrix(NA_integer_, k, k, dimnames = dn)
  diag(P) <- 0

  for (i in seq_len(k)) {
    x   <- item_data[[i]]
    n_i <- sum(!is.na(x))
    N[i, i] <- n_i
    # A constant item has no defined self-correlation either, so its
    # diagonal p-value is NA rather than 0 - otherwise the p matrix
    # would claim p = 0 on a cell where the r matrix is empty.
    s_i <- if (n_i > 1) stats::sd(x, na.rm = TRUE) else NA_real_
    if (n_i < min_n || !is.finite(s_i) || s_i == 0) P[i, i] <- NA_real_
    if (i == k) next
    for (j in (i + 1L):k) {
      y  <- item_data[[j]]
      ok <- stats::complete.cases(x, y)
      n  <- sum(ok)
      N[i, j] <- N[j, i] <- n
      if (n < min_n ||
          stats::sd(x[ok]) == 0 || stats::sd(y[ok]) == 0) {
        p <- NA_real_
      } else {
        p <- stats::cor.test(x[ok], y[ok], method = "pearson")$p.value
      }
      P[i, j] <- P[j, i] <- p
    }
  }

  list(correlation = R, p = P, n = N)
}

# *** p<.001, ** p<.01, * p<.05, x otherwise (including undefined)
significance_marker <- function(p_value) {
  out <- rep(MARK_NS, length(p_value))
  ok  <- !is.na(p_value)
  out[ok & p_value < 0.05]  <- "*"
  out[ok & p_value < 0.01]  <- "**"
  out[ok & p_value < 0.001] <- "***"
  out
}


# ------------------------------------------------------------------ #
# 4. Heat map                                                         #
# ------------------------------------------------------------------ #

# Same layout as the Grit reference figure: upper triangle filled by r,
# lower triangle labelled with r itself, diagonal 1.00. The canvas
# grows with the number of items so that each cell keeps the size it
# has in the reference figure.
#
# DIFFERENCES from the Grit reference figure (requested 19 Aug 2026):
# (a) the group title above the figure and the one-line explanatory
# caption below it are NOT drawn, and (b) the upper triangle carries no
# text - no significance stars and no "x" marks, only the colour fill.
# Everything else - cell size, colours, label fonts, the legend - is
# unchanged.
plot_correlation_heatmap <- function(R, P, items, output_png,
                                     output_pdf = NULL) {
  k <- length(items)

  g <- expand.grid(row_index = seq_len(k), col_index = seq_len(k))
  g$row_item   <- items[g$row_index]
  g$col_item   <- items[g$col_index]
  g$r_value    <- R[cbind(g$row_index, g$col_index)]
  g$p_value    <- P[cbind(g$row_index, g$col_index)]
  g$fill_value <- ifelse(g$row_index < g$col_index, g$r_value, NA_real_)

  upper <- g$row_index <  g$col_index
  lower <- g$row_index >  g$col_index
  diag_ <- g$row_index == g$col_index

  g$text_label <- ""
  # The upper triangle carries no text at all (requested 19 Aug 2026):
  # no significance stars and no "x" marks - only the colour fill.
  # Significance is still fully available in the exported p-value
  # matrices. To restore the marks, label the upper cells with
  # significance_marker(g$p_value[upper]) again.
  g$text_label[lower] <- ifelse(is.na(g$r_value[lower]), MARK_NS,
                                sprintf("%.2f", g$r_value[lower]))
  # A constant item has an undefined self-correlation, so its diagonal
  # cell says "x" rather than pretending to be 1.00.
  g$text_label[diag_] <- ifelse(is.na(g$r_value[diag_]), MARK_NS, "1.00")

  p <- ggplot(g, aes(x = factor(col_item, levels = items),
                     y = factor(row_item, levels = rev(items)),
                     fill = fill_value)) +
    geom_tile(color = "#DADADA", linewidth = 0.35) +
    geom_text(aes(label = text_label), size = 2.45, color = "#111111",
              family = "sans") +
    scale_fill_gradient2(low = "#B2182B", mid = "white", high = "#2166AC",
                         midpoint = 0, limits = c(-1, 1),
                         na.value = "white", name = "Pearson r") +
    # expand = c(0, 0) removes the default padding between the tile grid
    # and the panel edge, and vjust = 0 anchors the rotated column labels
    # at the bottom of their text box, so the axis labels sit right next
    # to the tiles (requested 19 Aug 2026).
    scale_x_discrete(position = "top", drop = FALSE, expand = c(0, 0)) +
    scale_y_discrete(drop = FALSE, expand = c(0, 0)) +
    coord_fixed(clip = "off") +
    labs(x = NULL, y = NULL) +
    theme_minimal(base_size = 11) +
    theme(panel.grid   = element_blank(),
          axis.text.x  = element_text(angle = 45, hjust = 0, vjust = 0,
                                      color = "#222222"),
          axis.text.y  = element_text(color = "#222222"),
          legend.position = "right",
          plot.margin  = margin(20, 30, 20, 20))

  # 0.308 in per cell keeps the same cell size as the reference figures.
  w <- 0.308 * k + 2.0
  h <- 0.308 * k + 1.0

  ggsave(output_png, p, width = w, height = h, dpi = FIGURE_DPI,
         units = "in", limitsize = FALSE)

  if (!is.null(output_pdf)) {
    # The plain grDevices::pdf device is used deliberately: it is
    # available in every R build on every platform, and its default
    # ISOLatin1 encoding covers the "x" symbol. cairo_pdf is NOT used,
    # because capabilities("cairo") can report TRUE on machines where
    # the cairo library then fails to load, which silently dumps the
    # plot into an Rplots.pdf instead of the requested file.
    ok <- tryCatch({
      ggsave(output_pdf, p, width = w, height = h, units = "in",
             limitsize = FALSE)
      TRUE
    }, error = function(e) {
      message("could not write the PDF version (", conditionMessage(e),
              "); the PNG was written normally.")
      FALSE
    })
    if (!ok) output_pdf <- NA_character_
  }

  c(png = output_png, pdf = if (is.null(output_pdf)) NA_character_ else output_pdf)
}


# ------------------------------------------------------------------ #
# 5. Excel / CSV writing                                              #
# ------------------------------------------------------------------ #

# Writes a named list of data frames as one workbook with one sheet per
# element. Uses openxlsx if available, then writexl, then CSV files.
write_sheets <- function(sheets, path) {
  if (requireNamespace("openxlsx", quietly = TRUE)) {
    wb <- openxlsx::createWorkbook()
    for (nm in names(sheets)) {
      openxlsx::addWorksheet(wb, substr(nm, 1, 31))
      openxlsx::writeData(wb, substr(nm, 1, 31), sheets[[nm]])
    }
    openxlsx::saveWorkbook(wb, path, overwrite = TRUE)
    return(path)
  }
  if (requireNamespace("writexl", quietly = TRUE)) {
    names(sheets) <- substr(names(sheets), 1, 31)
    writexl::write_xlsx(sheets, path)
    return(path)
  }
  stem  <- sub("\\.xlsx$", "", path)
  files <- character(0)
  for (nm in names(sheets)) {
    f <- paste0(stem, "_", nm, ".csv")
    utils::write.csv(sheets[[nm]], f, row.names = FALSE, na = "")
    files <- c(files, f)
  }
  message("Neither openxlsx nor writexl is installed - wrote CSV instead.")
  files
}

# One table -> paired .csv and .xlsx, exactly as the reference
# analysis wrote them (write_csv_and_xlsx()).
write_csv_and_xlsx <- function(data, csv_path, sheet_name = "analysis") {
  dir.create(dirname(csv_path), showWarnings = FALSE, recursive = TRUE)
  utils::write.csv(data, csv_path, row.names = FALSE, na = "")
  sheets <- list(data)
  names(sheets) <- substr(sheet_name, 1, 31)
  write_sheets(sheets, sub("\\.csv$", ".xlsx", csv_path))
  invisible(csv_path)
}

# A square matrix -> the same pair of files, with the row names in a
# leading "item_code" column (the reference layout).
write_matrix_csv_and_xlsx <- function(m, csv_path, sheet_name = "matrix") {
  tab <- data.frame(item_code = rownames(m),
                    as.data.frame(m, check.names = FALSE),
                    check.names = FALSE)
  write_csv_and_xlsx(tab, csv_path, sheet_name)
}


# ------------------------------------------------------------------ #
# 6. Run                                                              #
# ------------------------------------------------------------------ #

data_file <- pick_data_file(DATA_FILE)
out_dir   <- resolve_out_dir(data_file, OUT_DIR)

cat("\ndata file : ", data_file, "\n", sep = "")
cat("output dir: ",  out_dir,   "\n", sep = "")

dat  <- read_data(data_file)
prep <- prepare_groups(dat, CONFIG)

items  <- prep$items
groups <- prep$groups

cat(sprintf("gender column: #%d  (%s = male, %s = female)\n",
            prep$gender_column_index, CONFIG$male_code, CONFIG$female_code))
cat("items (", length(items), "): ", paste(items, collapse = ", "),
    "\n", sep = "")
cat("sample sizes -> ",
    paste(names(groups), sapply(groups, nrow), sep = " n=", collapse = " | "),
    "\n\n", sep = "")

summary_rows    <- list()
item_rows       <- list()
undefined_rows  <- list()
top_rows        <- list()
info_rows       <- list()

for (gi in seq_len(nrow(GROUP_SPEC))) {
  key   <- GROUP_SPEC$key[gi]
  short <- GROUP_SPEC$short[gi]
  d     <- groups[[short]]

  cat("correlating group:", short, "...\n"); utils::flush.console()

  mats <- compute_cor_p_matrices(d, CONFIG$min_pairwise_n)
  R <- mats$correlation; P <- mats$p; N <- mats$n

  group_dir <- file.path(out_dir, key)
  dir.create(group_dir, showWarnings = FALSE, recursive = TRUE)

  cor_csv <- file.path(group_dir, "pearson_correlation_matrix.csv")
  p_csv   <- file.path(group_dir, "pearson_p_value_matrix.csv")
  write_matrix_csv_and_xlsx(R, cor_csv, "pearson_correlation")
  write_matrix_csv_and_xlsx(P, p_csv,   "pearson_p_values")

  png_path <- file.path(group_dir, "correlation_heatmap_with_significance.png")
  pdf_path <- if (isTRUE(WRITE_PDF))
                file.path(group_dir, "correlation_heatmap_with_significance.pdf")
              else NULL
  plot_correlation_heatmap(R, P, items, png_path, pdf_path)

  # ---- summary row (same columns as the reference summary) ----------
  summary_rows[[key]] <- data.frame(
    group_key              = key,
    group_label            = GROUP_SPEC$label_en[gi],
    gender_filter          = GROUP_SPEC$gender_filter[gi],
    sample_size            = nrow(d),
    item_count             = length(items),
    correlation_method     = "Pearson",
    heatmap_png            = png_path,
    correlation_matrix_csv = cor_csv,
    p_value_matrix_csv     = p_csv,
    stringsAsFactors = FALSE)

  # ---- diagnostics --------------------------------------------------
  up  <- upper.tri(R)
  r_u <- R[up]; p_u <- P[up]
  n_undef <- sum(is.na(r_u) | is.na(p_u))
  defined <- !is.na(r_u) & !is.na(p_u)

  info_rows[[key]] <- data.frame(
    Group            = short,
    Group_key        = key,
    N                = nrow(d),
    Items            = length(items),
    Pairs            = sum(up),
    Undefined_pairs  = n_undef,
    Sig_p_lt_.05     = sum(defined & p_u < 0.05),
    Sig_p_lt_.01     = sum(defined & p_u < 0.01),
    Sig_p_lt_.001    = sum(defined & p_u < 0.001),
    Mean_abs_r       = round(mean(abs(r_u[defined])), 4),
    Min_r            = round(min(r_u[defined]), 4),
    Max_r            = round(max(r_u[defined]), 4),
    Negative_r_pairs = sum(defined & r_u < 0),
    Constant_items   = if (length(prep$zero_var[[short]]))
                         paste(prep$zero_var[[short]], collapse = ", ") else "-",
    row.names = NULL)

  item_rows[[key]] <- data.frame(
    Group      = short,
    Item       = items,
    N          = as.integer(vapply(d, function(x) sum(!is.na(x)), numeric(1))),
    Mean       = round(vapply(d, mean, numeric(1), na.rm = TRUE), 3),
    SD         = round(vapply(d, stats::sd, numeric(1), na.rm = TRUE), 3),
    Min        = vapply(d, min, numeric(1), na.rm = TRUE),
    Max        = vapply(d, max, numeric(1), na.rm = TRUE),
    N_distinct = as.integer(vapply(d, function(x)
                    length(unique(stats::na.omit(x))), numeric(1))),
    Constant   = vapply(d, function(x) {
                    s <- stats::sd(x, na.rm = TRUE)
                    !is.finite(s) || s == 0 }, logical(1)),
    row.names  = NULL)

  idx <- which(up & (is.na(R) | is.na(P)), arr.ind = TRUE)
  if (nrow(idx)) {
    undefined_rows[[key]] <- data.frame(
      Group  = short,
      Item_1 = items[idx[, 1]],
      Item_2 = items[idx[, 2]],
      Pairwise_n = N[idx],
      Reason = "at least one item is constant in this group (sd = 0)",
      row.names = NULL)
  }

  idx2 <- which(up, arr.ind = TRUE)
  pairs_df <- data.frame(
    Group  = short,
    Item_1 = items[idx2[, 1]],
    Item_2 = items[idx2[, 2]],
    r      = round(R[idx2], 4),
    p      = P[idx2],
    n      = N[idx2],
    row.names = NULL)
  pairs_df <- pairs_df[!is.na(pairs_df$r), ]
  top_rows[[key]] <- utils::head(
    pairs_df[order(-abs(pairs_df$r)), ], 20)
}

summary_df <- do.call(rbind, summary_rows)
write_csv_and_xlsx(summary_df,
                   file.path(out_dir, "correlation_analysis_output_summary.csv"),
                   "correlation_summary")

info_df <- do.call(rbind, info_rows)
info_df$Correlation_method <- "Pearson (pairwise-complete observations)"
info_df$P_value_test       <- "stats::cor.test, two-sided, unadjusted"
info_df$Excluded_items     <- if (length(CONFIG$exclude_items))
                                paste(CONFIG$exclude_items, collapse = ", ") else "-"
info_df$Data_file          <- basename(data_file)
info_df$Software           <- R.version.string
info_df$Run_date           <- format(Sys.Date())

diag_sheets <- list(
  Info             = info_df,
  Item_summary     = do.call(rbind, item_rows),
  Undefined_pairs  = if (length(undefined_rows)) do.call(rbind, undefined_rows)
                     else data.frame(Group = character(0), Item_1 = character(0),
                                     Item_2 = character(0), Pairwise_n = integer(0),
                                     Reason = character(0)),
  Top_correlations = do.call(rbind, top_rows))

f_diag <- write_sheets(diag_sheets,
                       file.path(out_dir, "correlation_analysis_diagnostics.xlsx"))


# ---- 6a. Console summary -------------------------------------------
cat("\n---------------------------------------------------------------\n")
print(info_df[, c("Group", "N", "Items", "Pairs", "Undefined_pairs",
                  "Sig_p_lt_.05", "Mean_abs_r", "Min_r", "Max_r",
                  "Constant_items")], row.names = FALSE)
cat("\nStrongest 5 correlations per group\n")
for (key in names(top_rows)) {
  t5 <- utils::head(top_rows[[key]], 5)
  cat(sprintf("  %-6s : %s\n", t5$Group[1],
              paste(sprintf("%s-%s (%.2f)", t5$Item_1, t5$Item_2, t5$r),
                    collapse = ", ")))
}
cat("\nDone. Files written to:\n  ", out_dir, "\n", sep = "")
for (key in GROUP_SPEC$key) {
  cat("   - ", key, "/pearson_correlation_matrix.csv / .xlsx\n", sep = "")
  cat("   - ", key, "/pearson_p_value_matrix.csv / .xlsx\n", sep = "")
  cat("   - ", key, "/correlation_heatmap_with_significance.png",
      if (isTRUE(WRITE_PDF)) " / .pdf" else "", "\n", sep = "")
}
cat("   - correlation_analysis_output_summary.csv / .xlsx\n")
cat("   - ", basename(f_diag[1]), "\n", sep = "")
cat("---------------------------------------------------------------\n")
