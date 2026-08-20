# =====================================================================
# Node Strength Centrality Analysis of the Programming Resilience data
# (groups: All / Male / Female)
#
# This is the same analysis as
#   ../20260807_Dataset 4_Figure 2/network_strength_centrality_Grit.R,
# applied to the Programming Resilience dataset
# (01_Programming_Resilience_811.xlsx) instead of the Grit dataset
# (Grit.xlsx).
#
# ---------------------------------------------------------------------
# METHOD  (following Tu et al., 2026, The Internet and Higher Education
#          70, 101077, and the Figure 2 of that paper)
# ---------------------------------------------------------------------
#   - Graphical Gaussian Model (GGM) estimated with graphical LASSO
#     regularization; the tuning parameter is selected via EBIC with
#     gamma = 0.50.
#   - Correlations: qgraph::cor_auto(), which detects ordinal Likert
#     items and computes polychoric correlations via lavaan.
#   - Node strength = sum of the absolute edge weights (partial
#     correlations) attached to each node; reported raw and standardized
#     as Z-scores (standardization is done WITHIN each network, exactly
#     as in the paper's Fig. 2).
#   - Networks are estimated separately for All, Male and Female.
#
#   Estimation path. Exactly as in the Grit script: cor_auto() ->
#   (Matrix::nearPD() repair only if the correlation matrix is not
#   positive definite) -> EBICglasso(). Whether a repair was needed, and
#   how large it was, is reported in the Correlation_diagnostics sheet
#   of the results workbook. In this dataset every response category of
#   every item holds at least 114 of the 811 respondents, so the
#   CH11-style degeneracy that plagued the Grit data cannot occur here,
#   and no item is excluded by default (EXCLUDE_ITEMS is empty).
#
# ---------------------------------------------------------------------
# DATA
# ---------------------------------------------------------------------
#   Input : 01_Programming_Resilience_811.xlsx (811 respondents).
#           Columns: ID, Gender, Cmt1..Cmt4, Cnf1..Cnf4, Cop1..Cop4,
#           Cmp1..Cmp4.  ID is ignored; the 16 item columns are the
#           nodes.  Gender: "M" = male, "F" = female (text codes, not
#           the 1/0 numbers used in Grit.xlsx).
#
#   Item columns are found with an ASCII regular expression and the
#   gender column is found by its values (the only non-item column
#   holding exactly the two codes "M" and "F"), so nothing depends on
#   column positions or on the machine's text encoding.
#
# ---------------------------------------------------------------------
# OUTPUT  (a "Figure2_Results" folder created next to the chosen file,
#          unless OUT_DIR is set)
# ---------------------------------------------------------------------
#   1) strength_centrality_results.xlsx  raw + Z-score strength, 3 groups
#                                        + Info + Correlation_diagnostics
#                                        + Robustness_Pearson
#   2) edge_weights_matrices.xlsx        partial-correlation matrices
#   3) Figure2_strength_centrality.png   Fig. 2-style plot, 3 groups
#   4) Figure2_strength_centrality.pdf   the same plot as vector art
#
# ---------------------------------------------------------------------
# HOW TO RUN  (Windows, macOS or Linux)
# ---------------------------------------------------------------------
#   1. Open this file in RStudio (or R).
#   2. Press "Source" (Ctrl+Shift+S on Windows, Cmd+Shift+S on macOS).
#   3. A file-selection window opens -> choose
#      01_Programming_Resilience_811.xlsx.
#   4. Everything else is automatic. Results are written to a folder
#      called "Figure2_Results" created next to the Excel file you
#      selected, and the full path is printed in the console when the
#      run finishes.
#
#   Missing packages are detected on start-up; you will be asked once
#   whether to install them.
#
#   Run time: well under a minute (16 items, so the polychoric
#   correlation matrices are quick).
#
# ---------------------------------------------------------------------
# SENSITIVITY RUN  (../Sensitivity_Pearson analogue)
# ---------------------------------------------------------------------
#   The Grit folder carried a Sensitivity_with_CH11 run because one item
#   there was nearly constant. No such item exists in this dataset, so
#   the sensitivity analysis provided here instead re-estimates all
#   three networks from plain Pearson correlations:
#
#     COR_METHOD <- "pearson"
#     source("network_strength_centrality_ProgrammingResilience.R")
#
#   The main run already reports a compact polychoric-vs-Pearson
#   comparison in its Robustness_Pearson sheet; the sensitivity folder
#   holds the full four output files of the Pearson run.
#
# ---------------------------------------------------------------------
# REFERENCE RUN  (19 Aug 2026, R 4.4.2, qgraph 1.9.8, seed 2026)
# ---------------------------------------------------------------------
#   Main run, 16 items, polychoric correlations:
#     group    n     nodes  edges  density  (see README.md for the
#     All      811    16                     numbers of the recorded
#     Male     408    16                     reference run)
#     Female   403    16
#
#   Re-running with the same seed reproduces the numbers exactly.
# =====================================================================


# ------------------------------------------------------------------ #
# OPTIONAL SETTINGS - edit only if you want to bypass the file dialog #
# ------------------------------------------------------------------ #
# Leave DATA_FILE and OUT_DIR as NULL for the normal interactive run.
# Windows paths may be written with forward slashes ("C:/Users/...") or
# with doubled backslashes ("C:\\Users\\..."); both work.

if (!exists("DATA_FILE")) DATA_FILE <- NULL  # e.g. "C:/Users/Sandy/Desktop/01_Programming_Resilience_811.xlsx"
if (!exists("OUT_DIR"))   OUT_DIR   <- NULL  # e.g. "C:/Users/Sandy/Desktop/Figure 2 results"

# Items to leave out of the networks. Empty by default: unlike Grit.xlsx
# (where CH11 was nearly constant), every item in this dataset is well
# distributed over all five response categories.
if (!exists("EXCLUDE_ITEMS")) EXCLUDE_ITEMS <- character(0)

# Correlation method for the MAIN estimation. "polychoric" (via
# qgraph::cor_auto) is the method of the reference paper and the
# default; set COR_METHOD <- "pearson" to produce the sensitivity run.
if (!exists("COR_METHOD")) COR_METHOD <- "polychoric"

# Extra check: re-estimate every network from Pearson correlations and
# report how closely the strength ordering agrees with the polychoric
# result. Cheap; leave on. (Skipped automatically when the main run is
# itself the Pearson run.)
if (!exists("RUN_ROBUSTNESS")) RUN_ROBUSTNESS <- TRUE


# ------------------------------------------------------------------ #
# 0. Packages                                                         #
# ------------------------------------------------------------------ #
# All of these are on CRAN. openxlsx is used to write the workbooks
# when it is installed; writexl is accepted as an equivalent
# alternative, and if neither is present the tables are written as CSV
# files so that a run never fails just because of a writer package.

ensure_packages <- function() {
  required <- c("qgraph", "readxl", "ggplot2", "lavaan", "Matrix")
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

suppressMessages({
  library(qgraph)
  library(ggplot2)
})

set.seed(2026)


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

# Default output folder: a "Figure2_Results" subfolder next to the file.
resolve_out_dir <- function(data_file, preset = NULL) {
  d <- if (!is.null(preset) && nzchar(preset)) preset
       else file.path(dirname(data_file), "Figure2_Results")
  dir.create(d, showWarnings = FALSE, recursive = TRUE)
  normalizePath(d, winslash = "/", mustWork = TRUE)
}


CONFIG <- list(
  gamma        = 0.50,          # EBIC hyperparameter
  male_code    = "M",           # Gender coding in this dataset: "M" = male
  female_code  = "F",           #                                "F" = female
  # item columns = the network nodes; everything else (ID, Gender) is
  # metadata. Matched on the ASCII prefixes so the script never depends
  # on column positions.
  item_pattern = "^(Cmt|Cnf|Cop|Cmp)[0-9]+$",
  item_order   = c("Cmt", "Cnf", "Cop", "Cmp"),  # block order in the figure
  exclude_items = if (is.null(EXCLUDE_ITEMS)) character(0)
                  else as.character(EXCLUDE_ITEMS),
  cor_method   = match.arg(COR_METHOD, c("polychoric", "pearson"))
)


# ------------------------------------------------------------------ #
# 2. Data input                                                       #
# ------------------------------------------------------------------ #

read_data <- function(path) {
  if (grepl("\\.xlsx?$", path, ignore.case = TRUE)) {
    as.data.frame(readxl::read_excel(path))
  } else {
    read.csv(path, check.names = FALSE)
  }
}

# Sort items by block (Cmt, Cnf, Cop, Cmp) and then numerically inside
# the block, so the figure reads Cmt1, Cmt2, ... Cmt4, Cnf1, ... and a
# block with 10+ items would never sort as 1, 10, 11, 2.
order_items <- function(nms, blocks) {
  prefix <- sub("[0-9]+$", "", nms)
  number <- as.integer(sub("^[A-Za-z]+", "", nms))
  nms[order(match(prefix, blocks), number)]
}

# Locate the gender column without relying on its header text: it is
# the metadata column holding exactly the two configured codes. The
# codes are compared as trimmed, case-sensitive text ("M"/"F" here),
# which also works for numeric codes since numbers print canonically.
find_gender_column <- function(meta, cfg) {
  codes <- sort(as.character(c(cfg$male_code, cfg$female_code)))
  hit <- vapply(meta, function(v) {
    u <- sort(unique(stats::na.omit(trimws(as.character(v)))))
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
  meta  <- dat[, !is_item, drop = FALSE]     # ID, Gender -> not nodes

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

  keep <- stats::complete.cases(items)
  if (any(!keep)) {
    message("dropping ", sum(!keep), " row(s) with missing item responses")
    items  <- items[keep, , drop = FALSE]
    gender <- gender[keep]
  }

  const <- vapply(items, function(x) stats::sd(x) == 0, logical(1))
  if (any(const))
    stop("These items have zero variance in the whole sample and cannot be ",
         "used: ", paste(names(items)[const], collapse = ", "), call. = FALSE)

  # which() rather than logical indexing, so a missing gender value drops
  # the row from the subgroup instead of inserting a row of NAs
  groups <- list(
    All    = items,
    Male   = items[which(gender == as.character(cfg$male_code)),   , drop = FALSE],
    Female = items[which(gender == as.character(cfg$female_code)), , drop = FALSE])

  # An item can vary in the whole sample yet be constant inside a
  # subgroup. Such an item has no correlation with anything, so it gets
  # strength 0 and no edges. That is the correct result, but it must be
  # visible rather than left to be discovered in the figure.
  zero_var <- lapply(groups, function(Y)
    names(Y)[vapply(Y, function(x) stats::sd(x) == 0, logical(1))])
  for (g in names(zero_var))
    if (length(zero_var[[g]]))
      message("NOTE: in group '", g, "' these items are constant, so they ",
              "get strength 0 and no edges: ",
              paste(zero_var[[g]], collapse = ", "))

  list(groups              = groups,
       zero_var            = zero_var,
       gender_column_index = which(names(dat) == gcol)[1],
       ignored             = setdiff(names(meta), gcol),
       items               = names(items))
}


# ------------------------------------------------------------------ #
# 3. Network estimation (EBICglasso, gamma = 0.5)                     #
# ------------------------------------------------------------------ #

# Correlation matrix + positive-definiteness repair.
#   cor  = "polychoric" -> qgraph::cor_auto(), the method used in the
#                          reference paper (Pearson for non-ordinal
#                          columns, polychoric for ordinal ones)
#   cor  = "pearson"    -> plain Pearson, used for the robustness check
#                          and for the Sensitivity_Pearson run
# Returns the matrix plus the diagnostics of the repair.
correlation_matrix <- function(d, cor = c("polychoric", "pearson")) {
  cor <- match.arg(cor)
  S <- if (cor == "polychoric")
         suppressMessages(qgraph::cor_auto(d, detectOrdinal = TRUE,
                                           verbose = FALSE))
       else stats::cor(d)
  dimnames(S) <- list(names(d), names(d))

  ev  <- eigen(S, only.values = TRUE)$values
  diag_ <- list(min_eigenvalue = min(ev),
                n_neg_eigenvalues = sum(ev < 0),
                repaired = FALSE, max_abs_change = 0, mean_abs_change = 0)

  if (min(ev) < 1e-8) {
    S0 <- S
    S  <- as.matrix(Matrix::nearPD(S, corr = TRUE, maxit = 1000)$mat)
    dimnames(S) <- dimnames(S0)
    diag_$repaired        <- TRUE
    diag_$max_abs_change  <- max(abs(S - S0))
    diag_$mean_abs_change <- mean(abs(S[upper.tri(S)] - S0[upper.tri(S0)]))
  }
  list(S = S, diagnostics = diag_)
}

# EBICglasso on a data frame in which every column varies.
estimate_core <- function(d, cfg, cor = "polychoric") {
  cm <- correlation_matrix(d, cor)
  W  <- suppressMessages(qgraph::EBICglasso(cm$S, n = nrow(d),
                                            gamma = cfg$gamma))
  dimnames(W) <- list(names(d), names(d))
  list(graph = W, diagnostics = cm$diagnostics)
}

# Wrapper: drops constant items before estimation and puts them back
# afterwards as a row/column of zeros, so every group's matrix keeps the
# same node set in the same order.
estimate_net <- function(d, nodes, cfg, cor = "polychoric") {
  const <- names(d)[vapply(d, function(x) stats::sd(x) == 0, logical(1))]
  d_use <- d[, setdiff(names(d), const), drop = FALSE]

  fit <- estimate_core(d_use, cfg, cor)

  W <- matrix(0, length(nodes), length(nodes), dimnames = list(nodes, nodes))
  W[colnames(fit$graph), colnames(fit$graph)] <- fit$graph
  list(graph = W, diagnostics = fit$diagnostics, constant = const)
}


# ------------------------------------------------------------------ #
# 4. Strength centrality (raw + Z-scores)                             #
# ------------------------------------------------------------------ #

# Strength = sum of the absolute edge weights attached to a node.
# qgraph::centrality()$OutDegree is that sum for a symmetric (undirected)
# weight matrix; it is recomputed here from the matrix as a check, and
# the two must agree.
get_strength <- function(W, group, nodes) {
  s_qgraph <- qgraph::centrality(W)$OutDegree[nodes]
  s_check  <- rowSums(abs(W))[nodes]
  if (max(abs(s_qgraph - s_check)) > 1e-8)
    warning("qgraph strength and rowSums(abs(W)) disagree in group ", group)

  data.frame(Node         = nodes,
             Group        = group,
             Strength_raw = as.numeric(s_qgraph),
             Strength_z   = as.numeric(scale(s_qgraph)),
             row.names    = NULL)
}


# ------------------------------------------------------------------ #
# 5. Excel / CSV writing                                              #
# ------------------------------------------------------------------ #

# Writes a named list of data frames as one workbook with one sheet per
# element. Uses openxlsx if available, then writexl, then CSV files.
write_sheets <- function(sheets, path, row_names = FALSE) {
  if (requireNamespace("openxlsx", quietly = TRUE)) {
    wb <- openxlsx::createWorkbook()
    for (nm in names(sheets)) {
      openxlsx::addWorksheet(wb, nm)
      openxlsx::writeData(wb, nm, sheets[[nm]], rowNames = row_names)
    }
    openxlsx::saveWorkbook(wb, path, overwrite = TRUE)
    return(path)
  }
  if (requireNamespace("writexl", quietly = TRUE)) {
    out <- sheets
    if (row_names)                       # writexl drops row names
      out <- lapply(sheets, function(d)
        cbind(Node = rownames(d), d, stringsAsFactors = FALSE))
    writexl::write_xlsx(out, path)
    return(path)
  }
  stem  <- sub("\\.xlsx$", "", path)
  files <- character(0)
  for (nm in names(sheets)) {
    f <- paste0(stem, "_", nm, ".csv")
    utils::write.csv(sheets[[nm]], f, row.names = row_names)
    files <- c(files, f)
  }
  message("Neither openxlsx nor writexl is installed - wrote CSV instead.")
  files
}


# ------------------------------------------------------------------ #
# 6. Run                                                              #
# ------------------------------------------------------------------ #

data_file <- pick_data_file(DATA_FILE)
out_dir   <- resolve_out_dir(data_file, OUT_DIR)

cat("\ndata file : ", data_file, "\n", sep = "")
cat("output dir: ",  out_dir,   "\n", sep = "")
cat("correlations: ", CONFIG$cor_method, "\n", sep = "")

dat  <- read_data(data_file)
prep <- prepare_groups(dat, CONFIG)

nodes  <- prep$items
groups <- prep$groups

cat(sprintf("gender column: #%d  (%s = male, %s = female)\n",
            prep$gender_column_index, CONFIG$male_code, CONFIG$female_code))
cat("nodes (", length(nodes), "): ", paste(nodes, collapse = ", "),
    "\n", sep = "")
cat("sample sizes -> ",
    paste(names(groups), sapply(groups, nrow), sep = " n=", collapse = " | "),
    "\n\n", sep = "")

fits <- list()
for (g in names(groups)) {
  cat("estimating network:", g, "...\n"); utils::flush.console()
  fits[[g]] <- estimate_net(groups[[g]], nodes, CONFIG,
                            cor = CONFIG$cor_method)
}
nets <- lapply(fits, `[[`, "graph")

strength_long <- do.call(rbind, Map(get_strength, nets, names(nets),
                                    MoreArgs = list(nodes = nodes)))

strength_wide <- data.frame(
  Node                = nodes,
  Strength_All_raw    = strength_long$Strength_raw[strength_long$Group == "All"],
  Strength_All_z      = strength_long$Strength_z  [strength_long$Group == "All"],
  Strength_Male_raw   = strength_long$Strength_raw[strength_long$Group == "Male"],
  Strength_Male_z     = strength_long$Strength_z  [strength_long$Group == "Male"],
  Strength_Female_raw = strength_long$Strength_raw[strength_long$Group == "Female"],
  Strength_Female_z   = strength_long$Strength_z  [strength_long$Group == "Female"])

# Rank of each node inside its own network (1 = strongest), useful when
# reading the figure.
rank_in <- function(x) rank(-x, ties.method = "min")
strength_wide$Rank_All    <- rank_in(strength_wide$Strength_All_raw)
strength_wide$Rank_Male   <- rank_in(strength_wide$Strength_Male_raw)
strength_wide$Rank_Female <- rank_in(strength_wide$Strength_Female_raw)


# ---- 6a. Robustness check: Pearson instead of polychoric ------------
robust <- NULL
if (isTRUE(RUN_ROBUSTNESS) && CONFIG$cor_method == "polychoric") {
  cat("\nrobustness check (Pearson correlations) ...\n"); utils::flush.console()
  rows <- list()
  for (g in names(groups)) {
    Wp <- estimate_net(groups[[g]], nodes, CONFIG, cor = "pearson")$graph
    sp <- get_strength(Wp, g, nodes)
    sq <- strength_long[strength_long$Group == g, ]
    rows[[g]] <- data.frame(
      Group               = g,
      Pearson_edges       = sum(Wp[upper.tri(Wp)] != 0),
      Polychoric_edges    = sum(nets[[g]][upper.tri(nets[[g]])] != 0),
      r_strength_pearson  = stats::cor(sp$Strength_raw, sq$Strength_raw),
      rho_strength_pearson = stats::cor(sp$Strength_raw, sq$Strength_raw,
                                        method = "spearman"),
      Same_top5           = length(intersect(
                              sp$Node[order(-sp$Strength_raw)][1:5],
                              sq$Node[order(-sq$Strength_raw)][1:5])),
      row.names = NULL)
  }
  robust <- do.call(rbind, rows)
}


# ---- 6b. Excel: strength results -----------------------------------
n_edges <- vapply(nets, function(W) sum(W[upper.tri(W)] != 0), numeric(1))

info <- data.frame(
  Group          = names(groups),
  N              = as.integer(sapply(groups, nrow)),
  Nodes          = length(nodes),
  Nonzero_edges  = as.integer(n_edges[names(groups)]),
  Density        = round(n_edges[names(groups)] /
                         (length(nodes) * (length(nodes) - 1) / 2), 4),
  Constant_items = vapply(prep$zero_var[names(groups)], function(z)
                     if (length(z)) paste(z, collapse = ", ") else "-",
                     character(1)),
  Estimator      = "EBICglasso (GGM, graphical LASSO)",
  EBIC_gamma     = CONFIG$gamma,
  Correlation    = if (CONFIG$cor_method == "polychoric")
                     "cor_auto (polychoric where ordinal)"
                   else "Pearson",
  Seed           = 2026,
  Excluded_items = if (length(CONFIG$exclude_items))
                     paste(CONFIG$exclude_items, collapse = ", ") else "-",
  Data_file      = basename(data_file),
  Software       = paste(R.version.string, "| qgraph",
                         as.character(packageVersion("qgraph"))),
  row.names      = NULL)

cor_diag <- do.call(rbind, lapply(names(fits), function(g) {
  d <- fits[[g]]$diagnostics
  data.frame(Group = g,
             Min_eigenvalue       = round(d$min_eigenvalue, 6),
             N_negative_eigenvalues = d$n_neg_eigenvalues,
             nearPD_applied       = d$repaired,
             Max_abs_change_in_r  = round(d$max_abs_change, 6),
             Mean_abs_change_in_r = round(d$mean_abs_change, 6),
             row.names = NULL)
}))

sheets <- list(Strength_wide           = strength_wide,
               Strength_long           = strength_long,
               Info                    = info,
               Correlation_diagnostics = cor_diag)
if (!is.null(robust)) sheets$Robustness_Pearson <- robust

f1 <- write_sheets(sheets,
                   file.path(out_dir, "strength_centrality_results.xlsx"))

# ---- 6c. Excel: edge-weight matrices -------------------------------
edge_sheets <- list()
for (g in names(nets)) {
  m <- as.data.frame(nets[[g]])
  rownames(m) <- colnames(m) <- nodes
  edge_sheets[[paste0("Edges_", g)]] <- m
}
f2 <- write_sheets(edge_sheets,
                   file.path(out_dir, "edge_weights_matrices.xlsx"),
                   row_names = TRUE)

# ---- 6d. Figure 2 ---------------------------------------------------
plot_df <- strength_long
plot_df$Node  <- factor(plot_df$Node, levels = rev(nodes))   # Cmt1 on top
plot_df$Group <- factor(plot_df$Group, levels = c("All", "Male", "Female"))

fig2 <- ggplot(plot_df,
               aes(x = Strength_z, y = Node, group = Group,
                   colour = Group, shape = Group, linetype = Group)) +
  geom_path(linewidth = 0.5) +
  geom_point(size = 1.8) +
  scale_colour_manual(values = c(All = "black", Male = "#0072B2",
                                 Female = "#D55E00")) +
  labs(x = NULL, y = NULL, title = "Strength") +
  theme_bw(base_size = 12) +
  theme(plot.title       = element_text(hjust = 0.5, size = 12),
        panel.grid.minor = element_blank(),
        legend.title     = element_blank(),
        legend.position  = "bottom")

# height computed from the node count (16 nodes here) so the figure
# stays legible whatever the questionnaire length
fig_h <- max(8, 0.26 * length(nodes) + 2)
f3 <- file.path(out_dir, "Figure2_strength_centrality.png")
f4 <- file.path(out_dir, "Figure2_strength_centrality.pdf")
ggsave(f3, fig2, width = 6.5, height = fig_h, dpi = 300)
ggsave(f4, fig2, width = 6.5, height = fig_h)


# ---- 6e. Console summary -------------------------------------------
cat("\n---------------------------------------------------------------\n")
print(info[, c("Group", "N", "Nodes", "Nonzero_edges", "Density",
               "Constant_items")], row.names = FALSE)
cat("\nCorrelation-matrix diagnostics\n")
print(cor_diag, row.names = FALSE)
if (!is.null(robust)) {
  cat("\nRobustness: polychoric vs Pearson strength\n")
  print(robust, row.names = FALSE)
}
cat("\nTop 5 nodes by raw strength\n")
for (g in names(nets)) {
  s <- strength_long[strength_long$Group == g, ]
  s <- s[order(-s$Strength_raw), ][1:5, ]
  cat(sprintf("  %-6s : %s\n", g,
              paste(sprintf("%s (%.3f)", s$Node, s$Strength_raw),
                    collapse = ", ")))
}
cat("\nDone. Files written to:\n  ", out_dir, "\n", sep = "")
for (f in c(f1, f2, f3, f4)) cat("   - ", basename(f), "\n", sep = "")
cat("---------------------------------------------------------------\n")
