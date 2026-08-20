# =====================================================================
# Figure 3: Bridge Strength Centrality  -  Programming Resilience data
#           (groups: All / Male / Female)
#
# This is the same analysis as
#   ../20260807_Dataset 4_Figure 3/Figure3_Bridge_Strength_Grit.R,
# applied to the Programming Resilience dataset
# (01_Programming_Resilience_811.xlsx) instead of the Grit dataset
# (Grit.xlsx).
#
# Method follows:
#   Tu, Y., Huang, C., Pan, Y., & Hwang, G.-J. (2026). Mapping the
#   structure of student burnout in online learning: An integrated
#   Gaussian model and directed acyclic graph approach.
#   The Internet and Higher Education, 70, 101077.  (Figure 3)
#
# Procedure (identical to the Grit script):
#   1. Correlations with qgraph::cor_auto() - polychoric for ordinal
#      Likert items.
#   2. Graphical Gaussian Model (GGM) estimated with graphical LASSO
#      regularisation; tuning parameter selected via EBIC, gamma = 0.50.
#      One network per group (All / Male / Female).  The estimation path
#      is exactly the one used by the Figure 2 script of this project
#      (cor_auto -> nearPD repair only if needed -> EBICglasso), so the
#      three networks here are the SAME networks as in
#      ../20260819_New Dataset 2_Figure 2 - only the centrality index
#      differs (bridge strength instead of node strength).
#   3. Bridge strength (Jones, Ma & McNally, 2021; networktools::bridge)
#      = the sum of the absolute edge weights (partial correlations)
#      connecting a node to all nodes OUTSIDE its own community.
#      Reported raw and standardised as Z-scores within each network,
#      as in the paper's Fig. 3.
#   4. Communities = the four questionnaire constructs. For this dataset
#      these are Cmt, Cnf, Cop and Cmp (they were Com, CE, CA and CH in
#      the Grit analysis).
#   5. One figure, in the same font and style as this project's
#      Figure 2: "Figure3_Bridge_Strength.png" (+ .pdf vector version) -
#      bridge-strength Z-scores for the three groups on a common
#      vertical item axis.
#
# Input : 01_Programming_Resilience_811.xlsx, selected interactively
#         with file.choose().
#         Columns: ID, Gender, Cmt1..Cmt4, Cnf1..Cnf4, Cop1..Cop4,
#         Cmp1..Cmp4.  ID is ignored (as N0/age were in the Grit
#         analysis); the 16 item columns are the network nodes.
#         Gender: "M" = male, "F" = female (text codes, not the 1/0
#         numbers used in Grit.xlsx).
# Output: written to a "Results_Figure3" folder created next to the
#         Excel file you selected ->
#           Figure3_Bridge_Strength.png
#           Figure3_Bridge_Strength.pdf
#           Figure3_Bridge_Strength_results.xlsx
#           edge_weights_matrices.xlsx
#
# Packages: qgraph, readxl, ggplot2, networktools, Matrix, glasso,
#           lavaan (all CRAN); writexl or openxlsx to write the .xlsx
#           (CSV fallback if neither is installed).
#
# ---------------------------------------------------------------------
# HOW TO RUN  (Windows, macOS or Linux)
# ---------------------------------------------------------------------
#   1. Open this file in RStudio (or R).
#   2. Press "Source" (Ctrl+Shift+S on Windows, Cmd+Shift+S on macOS).
#   3. A file-selection window opens -> choose
#      01_Programming_Resilience_811.xlsx.
#   4. Everything else is automatic. Results are written to a folder
#      called "Results_Figure3" created next to the Excel file you
#      selected, and the full path is printed when the run finishes.
#
#   Missing packages are detected on start-up; you will be asked once
#   whether to install them.
#
#   Run time: well under a minute (no bootstrapping is involved).
#
# ---------------------------------------------------------------------
# ITEM SCREENING  -  kept from the Grit script, but idle here
# ---------------------------------------------------------------------
#   The Grit analysis had to drop CH11 because all 305 women answered it
#   identically (SD = 0 -> no female network estimable at all). The
#   automatic screening that handled this is retained unchanged: an item
#   that is constant in ANY group is dropped from EVERY group, so all
#   three networks rest on the same node set and their bridge-strength
#   profiles stay comparable.
#
#   On 01_Programming_Resilience_811.xlsx the screening drops NOTHING:
#   every response category of every item holds at least 114 of the 811
#   respondents, so no item is even close to degenerate. All 16 items
#   enter all three networks. The screening result is still printed in
#   the console and recorded in the Item_screening and Info sheets of
#   the output workbook, so the check is auditable.
#
#   Because the CH11-style sensitivity run has no analogue here, the
#   sensitivity analysis of this folder varies the CORRELATION METHOD
#   instead (exactly as in ../20260819_New Dataset 2_Figure 2):
#
#     COR_METHOD <- "pearson"
#     source("Figure3_Bridge_Strength_ProgrammingResilience.R")
#
#   re-estimates all three networks from plain Pearson correlations
#   (-> Sensitivity_Pearson/). The main run already reports a compact
#   polychoric-vs-Pearson comparison in its Robustness_Pearson sheet.
#
# ---------------------------------------------------------------------
# REFERENCE RUN  (19 Aug 2026, R 4.4.2, qgraph 1.9.8, networktools 1.6.0)
# ---------------------------------------------------------------------
#   main run, 16 items (nothing dropped by the screening), gamma = 0.50,
#   polychoric correlations - see README.md for the recorded numbers.
#
#   Re-running reproduces the numbers exactly (the estimator is
#   deterministic; the seed below only guards the package internals).
# =====================================================================


# ------------------------------------------------------------------ #
# OPTIONAL SETTINGS - edit only if you want to bypass the file dialog #
# ------------------------------------------------------------------ #
# Leave DATA_FILE and OUT_DIR as NULL for the normal interactive run.
# Windows paths may be written with forward slashes ("C:/Users/...") or
# with doubled backslashes ("C:\\Users\\..."); both work.

if (!exists("DATA_FILE")) DATA_FILE <- NULL  # e.g. "C:/Users/Sandy/Desktop/01_Programming_Resilience_811.xlsx"
if (!exists("OUT_DIR"))   OUT_DIR   <- NULL  # e.g. "C:/Users/Sandy/Desktop/Figure 3 results"

# Extra items to leave out of the networks, on top of the automatic
# screening. Empty by default: unlike Grit.xlsx (where CH11 was nearly
# constant), every item in this dataset is well distributed over all
# five response categories. e.g. EXCLUDE_ITEMS <- "Cmp3".
if (!exists("EXCLUDE_ITEMS")) EXCLUDE_ITEMS <- character(0)

# TRUE  (default) - an item that cannot be estimated in ANY group is
#                   dropped from EVERY group, so the three networks
#                   share one node set. This is the reported analysis.
#                   (On this dataset the setting never fires: no item
#                   is constant in any group.)
# FALSE           - drop such an item only from the group(s) where it
#                   cannot be estimated.
if (!exists("SAME_ITEMS_IN_ALL_GROUPS")) SAME_ITEMS_IN_ALL_GROUPS <- TRUE

# Correlation method for the MAIN estimation. "polychoric" (via
# qgraph::cor_auto) is the method of the reference paper and the
# default; set COR_METHOD <- "pearson" to produce the sensitivity run.
if (!exists("COR_METHOD")) COR_METHOD <- "polychoric"

# Extra check: re-estimate every network from Pearson correlations and
# report how closely the bridge-strength ordering agrees with the
# polychoric result. Cheap; leave on. (Skipped automatically when the
# main run is itself the Pearson run.)
if (!exists("RUN_ROBUSTNESS")) RUN_ROBUSTNESS <- TRUE


# ------------------------------------------------------------------ #
# 0. Packages                                                         #
# ------------------------------------------------------------------ #

# Everything needed is on CRAN. Ask before installing anything.
ensure_packages <- function() {
  need <- c("qgraph", "readxl", "ggplot2", "networktools",
            "Matrix", "glasso", "lavaan")
  # one xlsx writer is enough; writexl is the lighter of the two
  if (!requireNamespace("writexl", quietly = TRUE) &&
      !requireNamespace("openxlsx", quietly = TRUE))
    need <- c(need, "writexl")

  have <- function(p) requireNamespace(p, quietly = TRUE)
  miss <- need[!vapply(need, have, logical(1))]
  if (!length(miss)) return(invisible(TRUE))

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

  still <- miss[!vapply(miss, have, logical(1))]
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

# Default output folder: a "Results_Figure3" subfolder next to the file.
resolve_out_dir <- function(data_file, preset = NULL) {
  d <- if (!is.null(preset) && nzchar(preset)) preset
       else file.path(dirname(data_file), "Results_Figure3")
  dir.create(d, showWarnings = FALSE, recursive = TRUE)
  normalizePath(d, winslash = "/", mustWork = TRUE)
}


CONFIG <- list(
  gamma       = 0.50,            # EBIC hyperparameter for glasso tuning
  seed        = 2026,
  male_code   = "M",             # Gender coding in this dataset: "M" = male
  female_code = "F",             #                                "F" = female
  # Item columns = the network nodes; everything else (ID, Gender) is
  # metadata. Matched on the ASCII prefixes so the script never depends
  # on column positions or on the machine's text encoding.
  # The prefix is also the community: Cmt / Cnf / Cop / Cmp.
  item_pattern    = "^(Cmt|Cnf|Cop|Cmp)[0-9]+$",
  community_order = c("Cmt", "Cnf", "Cop", "Cmp"),
  exclude_items   = if (is.null(EXCLUDE_ITEMS)) character(0)
                    else as.character(EXCLUDE_ITEMS),
  same_items      = isTRUE(SAME_ITEMS_IN_ALL_GROUPS),
  cor_method      = match.arg(COR_METHOD, c("polychoric", "pearson")),
  group_colours   = c(All = "black", Male = "#0072B2", Female = "#D55E00")
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

# Community of an item = its ASCII prefix (Cmt1 -> "Cmt", Cmp4 -> "Cmp").
item_community <- function(items, cfg) {
  comm <- sub("[0-9]+$", "", items)
  unknown <- setdiff(unique(comm), cfg$community_order)
  if (length(unknown))
    stop("Item prefix(es) not listed in community_order: ",
         paste(unknown, collapse = ", "), call. = FALSE)
  stats::setNames(comm, items)
}

# Order items block by block, numerically inside each block, so the
# figure's vertical axis reads Cmt1..Cmt4, Cnf1..Cnf4, Cop1..Cop4,
# Cmp1..Cmp4 regardless of the column order in the workbook.
order_items <- function(items, cfg) {
  comm <- sub("[0-9]+$", "", items)
  num  <- as.integer(sub("^[A-Za-z]+", "", items))
  items[order(match(comm, cfg$community_order), num)]
}

prepare_data <- function(dat, cfg) {
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
    message("EXCLUDE_ITEMS: leaving out ", length(cfg$exclude_items),
            " item(s): ", paste(cfg$exclude_items, collapse = ", "))
    items <- items[, setdiff(names(items), cfg$exclude_items), drop = FALSE]
  }

  gcol   <- find_gender_column(meta, cfg)
  gender <- trimws(as.character(meta[[gcol]]))

  items[] <- lapply(items, as.numeric)       # numeric for cor_auto / glasso
  items   <- items[, order_items(names(items), cfg), drop = FALSE]

  keep <- stats::complete.cases(items)
  if (any(!keep)) {
    message("dropping ", sum(!keep), " row(s) with missing item responses")
    items  <- items[keep, , drop = FALSE]
    gender <- gender[keep]
  }

  # which() rather than logical indexing, so a missing gender value drops
  # the row from the subgroup instead of inserting a row of NAs
  groups <- list(
    All    = items,
    Male   = items[which(gender == as.character(cfg$male_code)),   , drop = FALSE],
    Female = items[which(gender == as.character(cfg$female_code)), , drop = FALSE])

  list(groups              = groups,
       gender_column_index = which(names(dat) == gcol)[1],
       ignored             = setdiff(names(meta), gcol),
       items               = names(items))
}


# ------------------------------------------------------------------ #
# 3. Item screening                                                   #
# ------------------------------------------------------------------ #

# An item that is constant inside a group has zero variance there. It
# cannot enter that group's correlation matrix at all (cor_auto stops
# with "ordered variable(s) has/have only 1 level"), so it must be
# dropped before estimation.
#
# An item can also be *almost* constant: estimable, but with every
# response outside the modal category coming from one or two people, so
# that its whole polychoric correlation profile is determined by those
# few cases. Such items are flagged (not dropped) when they survive the
# zero-variance rule. The criterion is deliberately strict - fewer than
# NEAR_DEGENERATE_MAX + 1 responses outside the modal category - so a
# Likert item with a genuinely rare extreme category is not flagged.
#
# (On 01_Programming_Resilience_811.xlsx nothing is dropped or flagged;
# this section is kept from the Grit script so the check is auditable.)
NEAR_DEGENERATE_MAX <- 2L

screen_items <- function(groups, cfg) {
  tab <- do.call(rbind, lapply(names(groups), function(g) {
    Y <- groups[[g]]
    data.frame(
      Group           = g,
      Item            = names(Y),
      N               = nrow(Y),
      Mean            = round(vapply(Y, mean, numeric(1)), 3),
      SD              = round(vapply(Y, stats::sd, numeric(1)), 4),
      Response_levels = vapply(Y, function(x) length(unique(x)), integer(1)),
      Modal_response  = vapply(Y, function(x) {
                          tb <- table(x); as.numeric(names(tb)[which.max(tb)]) },
                          numeric(1)),
      Modal_pct       = vapply(Y, function(x)
                          round(100 * max(table(x)) / length(x), 2), numeric(1)),
      Non_modal_cases = vapply(Y, function(x)
                          as.integer(length(x) - max(table(x))), integer(1)),
      row.names       = NULL, stringsAsFactors = FALSE)
  }))
  tab$Usable <- tab$SD > 0
  tab$Note   <- ifelse(!tab$Usable, "constant in this group - cannot be estimated",
                ifelse(tab$Non_modal_cases <= NEAR_DEGENERATE_MAX,
                       sprintf("near-degenerate: only %d response(s) outside the modal category",
                               tab$Non_modal_cases), ""))

  unusable <- lapply(split(tab, tab$Group)[names(groups)],
                     function(d) d$Item[!d$Usable])
  flagged  <- sort(unique(tab$Item[nzchar(tab$Note) & tab$Usable]))

  drop_everywhere <- if (cfg$same_items) sort(unique(unlist(unusable)))
                     else character(0)

  list(table = tab, unusable = unusable, flagged = flagged,
       drop_everywhere = drop_everywhere)
}

report_screening <- function(scr, cfg) {
  for (g in names(scr$unusable))
    if (length(scr$unusable[[g]]))
      message("NOTE: in group '", g, "' these items are constant and cannot ",
              "be estimated: ", paste(scr$unusable[[g]], collapse = ", "))
  if (length(scr$flagged))
    message("NOTE: near-degenerate item(s) (<= ", NEAR_DEGENERATE_MAX,
            " response(s) outside the modal category, so their polychoric ",
            "correlations rest on those few cases): ",
            paste(scr$flagged, collapse = ", "))
  if (length(scr$drop_everywhere))
    message("-> dropped from ALL groups so the three networks share one ",
            "node set: ", paste(scr$drop_everywhere, collapse = ", "),
            "\n   (set SAME_ITEMS_IN_ALL_GROUPS <- FALSE to keep them ",
            "wherever they are estimable)")
  if (!length(scr$drop_everywhere) && !length(scr$flagged) &&
      !any(lengths(scr$unusable)))
    message("item screening: nothing dropped, nothing flagged - all items ",
            "are well distributed in every group")
  invisible(NULL)
}

apply_screening <- function(groups, scr) {
  lapply(names(groups), function(g) {
    drop <- union(scr$drop_everywhere, scr$unusable[[g]])
    groups[[g]][, setdiff(names(groups[[g]]), drop), drop = FALSE]
  }) -> out
  stats::setNames(out, names(groups))
}


# ------------------------------------------------------------------ #
# 4. Network estimation (GGM, graphical LASSO, EBIC gamma = 0.5)      #
# ------------------------------------------------------------------ #

# Same estimation path as this project's Figure 2 script
# (../20260819_New Dataset 2_Figure 2), so the networks are identical:
#   cor_auto() [or plain Pearson for the sensitivity run]
#   -> Matrix::nearPD() repair ONLY if the matrix is not positive
#      definite (never needed on this dataset - the smallest eigenvalues
#      are 0.241 / 0.228 / 0.208, comfortably positive)
#   -> qgraph::EBICglasso(), gamma = 0.50.
# Whether a repair was needed, and the smallest eigenvalue, is reported
# per group in the Networks sheet of the results workbook. (The Grit
# script tried bootnet::estimateNetwork first; it wraps the identical
# estimator, and skipping the detour keeps this run bit-identical to
# Figure 2's networks.)
correlation_matrix <- function(d, cor = c("polychoric", "pearson")) {
  cor <- match.arg(cor)
  S <- if (cor == "polychoric")
         suppressMessages(qgraph::cor_auto(d, detectOrdinal = TRUE,
                                           verbose = FALSE))
       else stats::cor(d)
  dimnames(S) <- list(names(d), names(d))

  ev  <- min(eigen(S, only.values = TRUE)$values)
  npd <- ev < 1e-8
  if (npd) S <- as.matrix(Matrix::nearPD(S, corr = TRUE, maxit = 1000)$mat)
  list(S = S, npd = npd, min_eigen = ev)
}

estimate_net <- function(d, cfg, cor = cfg$cor_method) {
  cm <- correlation_matrix(d, cor)
  W  <- suppressWarnings(qgraph::EBICglasso(cm$S, n = nrow(d),
                                            gamma = cfg$gamma,
                                            verbose = FALSE))
  W <- as.matrix(W)
  dimnames(W) <- list(names(d), names(d))
  list(graph = W, npd = cm$npd, min_eigen = cm$min_eigen,
       path = paste0(if (cor == "polychoric") "qgraph::cor_auto"
                     else "Pearson cor",
                     if (cm$npd) " + Matrix::nearPD" else "",
                     " + qgraph::EBICglasso"))
}


# ------------------------------------------------------------------ #
# 5. Bridge strength                                                  #
# ------------------------------------------------------------------ #

# Definition (Jones, Ma & McNally, 2021): bridge strength of node i =
# the sum of the absolute weights of all edges linking i to nodes of
# OTHER communities. networktools::bridge() is used when available; the
# built-in computation underneath is the identical definition and is
# kept as a fallback so the script still runs without that package.
bridge_strength <- function(W, comm) {
  nodes <- colnames(W)
  if (requireNamespace("networktools", quietly = TRUE)) {
    b <- networktools::bridge(W, communities = comm[nodes], useCommunities = "all")
    return(as.numeric(b$`Bridge Strength`[nodes]))
  }
  message("Package 'networktools' not installed - using the built-in ",
          "computation (identical definition).")
  as.numeric(vapply(nodes, function(i) {
    other <- nodes[comm[nodes] != comm[i]]
    sum(abs(W[i, other]))
  }, numeric(1)))
}

get_bridge <- function(W, group, comm) {
  nodes <- colnames(W)
  b_raw <- bridge_strength(W, comm)
  data.frame(Node       = nodes,
             Community  = unname(comm[nodes]),
             Group      = group,
             Bridge_raw = b_raw,
             Bridge_z   = as.numeric(scale(b_raw)),
             row.names  = NULL, stringsAsFactors = FALSE)
}


# ------------------------------------------------------------------ #
# 6. Results export                                                   #
# ------------------------------------------------------------------ #

write_sheets <- function(sheets, xlsx_path) {
  if (requireNamespace("writexl", quietly = TRUE)) {
    writexl::write_xlsx(sheets, xlsx_path)
    message("results written: ", xlsx_path)
  } else if (requireNamespace("openxlsx", quietly = TRUE)) {
    openxlsx::write.xlsx(sheets, xlsx_path, overwrite = TRUE)
    message("results written: ", xlsx_path)
  } else {                     # fallback if no xlsx writer is installed
    base <- sub("\\.xlsx$", "", xlsx_path)
    for (nm in names(sheets))
      write.csv(sheets[[nm]], paste0(base, "__", nm, ".csv"), row.names = FALSE)
    message("no xlsx writer installed - CSV files written: ",
            base, "__<sheet>.csv")
  }
}

# Wide table: one row per item, one raw and one Z column per group.
# Items absent from a group's network (see the screening section) get
# NA there rather than a 0, because "no bridge strength" and "not in
# this network" are different statements.
make_wide <- function(bridge_long, items, comm) {
  out <- data.frame(Node = items, Community = unname(comm[items]),
                    row.names = NULL, stringsAsFactors = FALSE)
  for (g in unique(bridge_long$Group)) {
    d <- bridge_long[bridge_long$Group == g, ]
    i <- match(items, d$Node)
    out[[paste0("Bridge_", g, "_raw")]] <- d$Bridge_raw[i]
    out[[paste0("Bridge_", g, "_z")]]   <- d$Bridge_z[i]
  }
  out
}


# ------------------------------------------------------------------ #
# 7. Figure 3                                                         #
# ------------------------------------------------------------------ #

# Same font and style as this project's Figure 2
# (../20260819_New Dataset 2_Figure 2): theme_bw(base_size = 12),
# centred title, no minor grid, legend at the bottom, black/blue/orange
# groups, the first item at the top of the vertical axis, and the same
# canvas geometry (width 6.5 in, height from the node count). Saved as
# PNG (300 dpi) and as PDF vector art for the manuscript, like Figure 2.
make_figure3 <- function(bridge_long, items, cfg, out_dir) {
  plot_df <- bridge_long
  plot_df$Node  <- factor(plot_df$Node, levels = rev(items))    # Cmt1 on top
  plot_df$Group <- factor(plot_df$Group, levels = names(cfg$group_colours))

  fig <- ggplot(plot_df,
                aes(x = Bridge_z, y = Node, group = Group,
                    colour = Group, shape = Group, linetype = Group)) +
    geom_path(linewidth = 0.5) +
    geom_point(size = 1.8) +
    scale_colour_manual(values = cfg$group_colours) +
    labs(x = NULL, y = NULL, title = "Bridge Strength") +
    theme_bw(base_size = 12) +
    theme(plot.title       = element_text(hjust = 0.5, size = 12),
          panel.grid.minor = element_blank(),
          legend.title     = element_blank(),
          legend.position  = "bottom")

  f_png <- file.path(out_dir, "Figure3_Bridge_Strength.png")
  f_pdf <- file.path(out_dir, "Figure3_Bridge_Strength.pdf")
  h <- max(8, 0.26 * length(items) + 2)       # Figure 2's height formula
  ggsave(f_png, fig, width = 6.5, height = h, dpi = 300, limitsize = FALSE)
  ggsave(f_pdf, fig, width = 6.5, height = h, limitsize = FALSE)
  message("figure written: ", f_png)
  message("figure written: ", f_pdf)
  c(f_png, f_pdf)
}


# ------------------------------------------------------------------ #
# 8. Main pipeline                                                    #
# ------------------------------------------------------------------ #

main <- function(cfg = CONFIG) {
  set.seed(cfg$seed)

  data_file <- pick_data_file(DATA_FILE)
  out_dir   <- resolve_out_dir(data_file, OUT_DIR)
  cat("\ndata file  : ", data_file, "\n", sep = "")
  cat("output dir : ", out_dir, "\n", sep = "")
  cat("correlations: ", cfg$cor_method, "\n", sep = "")

  prep   <- prepare_data(read_data(data_file), cfg)
  cat(sprintf("items (nodes): %d  [%s ... %s]\n", length(prep$items),
              prep$items[1], prep$items[length(prep$items)]))
  cat(sprintf("gender column: #%d  (%s = male, %s = female)\n",
              prep$gender_column_index, cfg$male_code, cfg$female_code))
  cat(sprintf("non-item columns ignored: %d (ID)\n",
              length(prep$ignored)))
  cat(sprintf("Groups: %s\n", paste(names(prep$groups), "n =",
              sapply(prep$groups, nrow), collapse = " | ")))

  # --- item screening -------------------------------------------------
  scr    <- screen_items(prep$groups, cfg)
  report_screening(scr, cfg)
  groups <- apply_screening(prep$groups, scr)

  items <- order_items(setdiff(prep$items, scr$drop_everywhere), cfg)
  comm  <- item_community(prep$items, cfg)
  n_by_comm <- table(factor(comm[items], levels = cfg$community_order))
  cat(sprintf("communities: %s\n",
              paste(names(n_by_comm), as.integer(n_by_comm),
                    sep = " = ", collapse = " | ")))

  # --- estimate one network per group ---------------------------------
  nets <- list(); est_info <- list()
  for (g in names(groups)) {
    Y <- groups[[g]]
    cat(sprintf("\n=== %s (n = %d, %d nodes) ===\n", g, nrow(Y), ncol(Y)))
    e <- estimate_net(Y, cfg)
    W <- e$graph
    nets[[g]] <- W
    n_edge <- sum(W[upper.tri(W)] != 0)
    cat(sprintf("edges: %d of %d possible (%.1f%%)   max |edge| = %.3f\n",
                n_edge, ncol(W) * (ncol(W) - 1) / 2,
                100 * n_edge / (ncol(W) * (ncol(W) - 1) / 2), max(abs(W))))
    est_info[[g]] <- data.frame(
      Group = g, N = nrow(Y), Nodes = ncol(Y), Edges = n_edge,
      Sparsity = round(1 - n_edge / (ncol(W) * (ncol(W) - 1) / 2), 4),
      Estimation_path = e$path,
      Correlation_min_eigenvalue = round(e$min_eigen, 6),
      nearPD_applied = e$npd,
      stringsAsFactors = FALSE)
  }

  # --- bridge strength -------------------------------------------------
  bridge_long <- do.call(rbind, Map(get_bridge, nets, names(nets),
                                    MoreArgs = list(comm = comm)))
  bridge_long <- bridge_long[order(match(bridge_long$Group, names(nets)),
                                   match(bridge_long$Node, items)), ]
  rownames(bridge_long) <- NULL
  bridge_wide <- make_wide(bridge_long, items, comm)

  cat("\nHighest bridge strength per group:\n")
  for (g in names(nets)) {
    d <- bridge_long[bridge_long$Group == g, ]
    d <- d[order(-d$Bridge_raw), ][1:3, ]
    cat(sprintf("  %-7s %s\n", g,
                paste(sprintf("%s (Z = %.2f)", d$Node, d$Bridge_z),
                      collapse = ",  ")))
  }

  # --- robustness check: Pearson instead of polychoric -----------------
  robust <- NULL
  if (isTRUE(RUN_ROBUSTNESS) && cfg$cor_method == "polychoric") {
    cat("\nrobustness check (Pearson correlations) ...\n")
    utils::flush.console()
    rows <- list()
    for (g in names(groups)) {
      Wp <- estimate_net(groups[[g]], cfg, cor = "pearson")$graph
      bp <- get_bridge(Wp, g, comm)
      bq <- bridge_long[bridge_long$Group == g, ]
      rows[[g]] <- data.frame(
        Group              = g,
        Pearson_edges      = sum(Wp[upper.tri(Wp)] != 0),
        Polychoric_edges   = sum(nets[[g]][upper.tri(nets[[g]])] != 0),
        r_bridge_pearson   = stats::cor(bp$Bridge_raw, bq$Bridge_raw),
        rho_bridge_pearson = stats::cor(bp$Bridge_raw, bq$Bridge_raw,
                                        method = "spearman"),
        Same_top5          = length(intersect(
                               bp$Node[order(-bp$Bridge_raw)][1:5],
                               bq$Node[order(-bq$Bridge_raw)][1:5])),
        row.names = NULL)
    }
    robust <- do.call(rbind, rows)
  }

  # --- figure ----------------------------------------------------------
  make_figure3(bridge_long, items, cfg, out_dir)

  # --- workbooks -------------------------------------------------------
  info <- data.frame(
    Setting = c("Dataset", "Analysis", "Index", "Communities",
                "Estimator", "EBIC gamma", "Correlation",
                "Items in the file", "Items used (all groups)",
                "Items dropped by screening",
                "Items excluded by EXCLUDE_ITEMS",
                "Same node set in all groups",
                "Near-degenerate items flagged",
                "Groups (N)", "Seed", "Platform", "R version",
                "qgraph version", "networktools version"),
    Value = c(basename(data_file),
              "Bridge strength centrality (Figure 3)",
              "Bridge strength = sum |edges| to nodes of other communities",
              paste(cfg$community_order, collapse = ", "),
              "EBICglasso (GGM, graphical LASSO)",
              sprintf("%.2f", cfg$gamma),
              if (cfg$cor_method == "polychoric")
                "cor_auto (polychoric for ordinal items)" else "Pearson",
              length(prep$items), length(items),
              if (length(scr$drop_everywhere))
                paste(scr$drop_everywhere, collapse = ", ") else "none",
              if (length(cfg$exclude_items))
                paste(cfg$exclude_items, collapse = ", ") else "none",
              cfg$same_items,
              if (length(scr$flagged)) paste(scr$flagged, collapse = ", ")
              else "none",
              paste(names(prep$groups), sapply(prep$groups, nrow),
                    sep = " = ", collapse = " | "),
              cfg$seed,
              paste(Sys.info()[["sysname"]], Sys.info()[["release"]]),
              R.version.string,
              as.character(utils::packageVersion("qgraph")),
              if (requireNamespace("networktools", quietly = TRUE))
                as.character(utils::packageVersion("networktools"))
              else "not installed"),
    stringsAsFactors = FALSE)

  desc <- do.call(rbind, lapply(names(groups), function(g) {
    Y <- groups[[g]]
    data.frame(Group = g, Item = names(Y), N = nrow(Y),
               Mean = round(vapply(Y, mean, numeric(1)), 3),
               SD   = round(vapply(Y, stats::sd, numeric(1)), 3),
               row.names = NULL, stringsAsFactors = FALSE)
  }))

  sheets <- list(
    Bridge_wide    = bridge_wide,
    Bridge_long    = bridge_long,
    Communities    = data.frame(Node = items,
                                Community = unname(comm[items]),
                                stringsAsFactors = FALSE),
    Networks       = do.call(rbind, est_info),
    Item_screening = scr$table,
    Descriptives   = desc,
    Info           = info)
  if (!is.null(robust)) sheets$Robustness_Pearson <- robust

  write_sheets(sheets,
               file.path(out_dir, "Figure3_Bridge_Strength_results.xlsx"))

  # partial-correlation matrices, so the networks behind the figure are
  # auditable, can be reused, and can be checked against the Figure 2
  # run (they are the same networks)
  edge_sheets <- lapply(nets, function(W) {
    m <- as.data.frame(round(W, 6))
    cbind(Node = rownames(W), m)
  })
  names(edge_sheets) <- paste0("Edges_", names(nets))
  write_sheets(edge_sheets, file.path(out_dir, "edge_weights_matrices.xlsx"))

  if (!is.null(robust)) {
    cat("\nRobustness: polychoric vs Pearson bridge strength\n")
    print(robust, row.names = FALSE)
  }

  cat("\nAll done. Results are in:\n  ", out_dir, "\n", sep = "")
  invisible(list(nets = nets, bridge_long = bridge_long,
                 bridge_wide = bridge_wide, screening = scr,
                 robust = robust))
}

# Run the full pipeline (set SKIP_MAIN <- TRUE before source() to load
# only the functions, e.g. for testing or running in chunks).
if (!exists("SKIP_MAIN")) RESULTS <- main(CONFIG)
