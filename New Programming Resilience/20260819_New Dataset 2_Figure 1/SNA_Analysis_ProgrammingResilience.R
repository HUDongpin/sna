# =====================================================================
# Psychological network analysis (GGM) of the Programming Resilience
# questionnaire data - ALL STUDENTS ONLY
#
# This is the same analysis as ../20260807_Dataset 4_Figure 1/
# SNA_Analysis_Grit.R, applied to the Programming Resilience dataset
# (01_Programming_Resilience_811.xlsx) instead of the Grit dataset
# (Grit.xlsx), with three deliberate changes requested for this run:
#
#   (a) only the full sample ("all") is analysed - no male / female
#       subgroup networks, no gender comparison (NCT);
#   (b) the figure carries NO title (the "All students (n = ...)" text
#       is removed) and NO "Node labels by group" heading above the
#       right-hand label panel;
#   (c) the betweenness marking is removed COMPLETELY - no badge box,
#       no "Betweenness" text, no pale-yellow row highlight, and no
#       yellow node fill: every node is drawn in its own group colour
#       (the top-betweenness nodes are still listed in the console and
#       in the Excel metrics, they are just not marked in the figure);
#   (d) the spring layout is compacted (repulsion = 0.65 instead of the
#       qgraph default 1.0) so the four constructs do not separate into
#       four detached islands;
#   (e) the four most central connector nodes (Cmt4, Cop4, Cnf4, Cmp3)
#       are pulled moderately towards the centre of the circle of nodes
#       (CENTRAL_NODES / CENTRAL_PULL below): each hub sits between its
#       own group and the centre, so the figure reads as one connected
#       network - the groups remain visible but do not fall apart into
#       four separate islands, and the hubs are not jammed together in
#       the middle.
#
# Everything else - method, colours, layout logic, figure size, the
# Excel workbook layout - is unchanged.
#
# Method follows:
#   Tu, Y., Huang, C., Pan, Y., & Hwang, G.-J. (2026). Mapping the
#   structure of student burnout in online learning: An integrated
#   Gaussian model and directed acyclic graph approach.
#   The Internet and Higher Education, 70, 101077.
#   (Section 3.3.1 "Gaussian graphical model" and Figure 1)
#
# Procedure:
#   1. Nonparanormal transformation of the item responses (huge::huge.npn)
#      so that ordinal Likert items can be treated as Gaussian.
#   2. Pearson correlation matrix of the transformed data.
#   3. Gaussian graphical model estimated with the graphical LASSO and
#      EBIC model selection, gamma = 0.50 (qgraph::EBICglasso). Edges are
#      regularised partial correlations.
#   4. Node predictability (R2) from a mixed graphical model
#      (mgm::mgm + predict, k = 2, EBIC lambda selection, gamma = 0.50),
#      drawn as the dark ring around each node.
#   5. Centrality (strength, betweenness, closeness, expected influence)
#      and bridge metrics (edges that leave the node's own construct).
#   6. ONE figure, "Figure_All.png/.pdf", with two panels:
#        left  - the GGM network (green = positive, red = negative partial
#                correlation; edge thickness = |weight|; node ring = R2)
#        right - node labels by construct (no betweenness marking of
#                any kind - see change (c)).
#   7. Accuracy and stability: case-dropping bootstrap (bootnet, CS
#      coefficients) for the full sample.
#
# Input : 01_Programming_Resilience_811.xlsx, selected interactively
#         with file.choose().
#         Columns: ID, Gender, Cmt1..Cmt4, Cnf1..Cnf4, Cop1..Cop4,
#         Cmp1..Cmp4.  ID and Gender are ignored; the 16 item columns
#         are the network nodes.
# Output: written to a "Results" folder created next to the data file
#           1_Figures/       Figure_All .png (300 dpi) + .pdf
#           2_Excel_Metrics/ Node_Metrics.xlsx
#                            Edge_Weights.xlsx
#                            predictability_r_squared.xlsx
#                            Stability.xlsx
#
# Packages: qgraph, huge, mgm, readxl, writexl, psych, bootnet
#           (all from CRAN).
#
# ---------------------------------------------------------------------
# HOW TO RUN  (Windows, macOS or Linux)
# ---------------------------------------------------------------------
#   1. Open this file in RStudio (or plain R).
#   2. Press "Source" (Ctrl+Shift+S on Windows, Cmd+Shift+S on macOS).
#   3. A file-selection window opens -> choose
#      01_Programming_Resilience_811.xlsx.
#   4. Everything else is automatic. Results are written to a folder
#      called "Results" created next to the data file you selected, and
#      the full path is printed in the console when the run finishes.
#
#   Missing packages are detected on start-up; you will be asked once
#   whether to install them.
#
#   Run time: the figure and the Excel metrics are ready in well under a
#   minute; the 1,000-subsample case-dropping bootstrap adds a few more
#   minutes. To try the script out quickly first, set
#   RUN_STABILITY <- FALSE in the OPTIONAL SETTINGS block below, or
#   lower N_BOOT_CASE.
# =====================================================================


# ------------------------------------------------------------------ #
# OPTIONAL SETTINGS - edit only if you want to bypass the file dialog #
# ------------------------------------------------------------------ #
# Leave DATA_FILE and OUT_DIR as NULL for the normal interactive run.
# Windows paths may be written with forward slashes ("C:/Users/...") or
# with doubled backslashes ("C:\\Users\\..."); both work.

if (!exists("DATA_FILE")) DATA_FILE <- NULL  # e.g. "C:/Users/Sandy/Desktop/01_Programming_Resilience_811.xlsx"
if (!exists("OUT_DIR"))   OUT_DIR   <- NULL  # e.g. "C:/Users/Sandy/Desktop/SNA results"

# Items to leave out of the networks entirely, on top of the automatic
# zero-variance check below. e.g. EXCLUDE_ITEMS <- c("Cmt1", "Cnf2")
if (!exists("EXCLUDE_ITEMS")) EXCLUDE_ITEMS <- NULL

# Set to FALSE for a fast run without the bootstrap.
if (!exists("RUN_STABILITY")) RUN_STABILITY <- TRUE
if (!exists("N_BOOT_CASE"))   N_BOOT_CASE   <- 1000   # case-dropping subsamples

# Which centrality index is reported as the "top nodes" in the console
# and used for the ranking in the Excel Settings sheet. NOT shown in the
# figure - the betweenness marking was removed on request (header note
# (c)): no yellow fill, no highlight, no badge.
if (!exists("BADGE_METRIC")) BADGE_METRIC <- "Betweenness"
if (!exists("N_BADGE"))      N_BADGE      <- 3

# Spring-layout repulsion (qgraph default = 1). Lower values pull the
# nodes closer together; 0.65 keeps the four constructs visibly grouped
# without letting them drift apart into four detached islands.
if (!exists("LAYOUT_REPULSION")) LAYOUT_REPULSION <- 0.65

# Connector nodes to pull towards the centre of the circle of nodes,
# and how far to pull them: the node's distance from the layout centre
# is multiplied by CENTRAL_PULL (1 = leave where the spring layout put
# it, 0 = exactly at the centre). 0.65 leaves each hub between its own
# group and the centre; 0.35 (tried first) pushed them all into the
# middle, which looked crowded.
if (!exists("CENTRAL_NODES")) CENTRAL_NODES <- c("Cmt4", "Cop4", "Cnf4", "Cmp3")
if (!exists("CENTRAL_PULL"))  CENTRAL_PULL  <- 0.65


# ------------------------------------------------------------------ #
# 0. Packages                                                         #
# ------------------------------------------------------------------ #

ensure_packages <- function() {
  need <- c("qgraph", "huge", "mgm", "readxl", "writexl", "psych", "bootnet")
  have <- function(p) requireNamespace(p, quietly = TRUE)
  miss <- need[!vapply(need, have, logical(1))]
  if (length(miss) == 0L) return(invisible(TRUE))

  message("\nThe following R packages are needed but not installed:\n  ",
          paste(miss, collapse = ", "), "\n")
  ok <- FALSE
  if (interactive()) {
    ans <- readline("Install them now from CRAN? [y/n]: ")
    ok  <- tolower(substr(trimws(ans), 1, 1)) == "y"
  }
  if (!ok) {
    stop("Please install the packages first, then run the script again:\n\n",
         '  install.packages(c("qgraph", "huge", "mgm", "readxl",\n',
         '                     "writexl", "psych", "bootnet"))\n', call. = FALSE)
  }
  install.packages(miss)
  still <- miss[!vapply(miss, have, logical(1))]
  if (length(still))
    stop("Could not install: ", paste(still, collapse = ", "), call. = FALSE)
  invisible(TRUE)
}
ensure_packages()

suppressPackageStartupMessages({
  library(qgraph)    # GGM estimation (EBICglasso), plotting, centrality
  library(huge)      # nonparanormal transformation (huge.npn)
  library(mgm)       # node predictability (R2)
  library(readxl)    # read .xlsx
  library(writexl)   # write .xlsx
  library(psych)     # Cronbach's alpha
})


# ------------------------------------------------------------------ #
# 1. Configuration                                                    #
# ------------------------------------------------------------------ #

CONFIG <- list(
  # Item columns = the network nodes. Matched on the item names, so the
  # ID and Gender columns are never matched and cannot end up as nodes.
  item_pattern = "^(Cmt|Cnf|Cop|Cmp)[0-9]+$",
  grp_names    = c("Cmt", "Cnf", "Cop", "Cmp"),
  gamma        = 0.5,    # EBIC hyperparameter, as in the paper
  seed         = 2026,   # estimation / bootstrap seed
  layout_seed  = 42      # spring-layout seed
)

# Construct membership is read off the item name, so it stays correct
# after any item is excluded.
group_of <- function(x) sub("[0-9]+$", "", x)

fill_col   <- c(Cmt = "#BDD7EE", Cnf = "#C6E0B4", Cop = "#F8CBAD", Cmp = "#D9D2E9")
border_col <- c(Cmt = "#2E75B6", Cnf = "#548235", Cop = "#C55A11", Cmp = "#7030A0")
head_col   <- c(Cmt = "#CFE2F3", Cnf = "#D9EAD3", Cop = "#FCE4D6", Cmp = "#E4DFF1")
hl_fill      <- "#FFF2CC"
badge_fill   <- "#FFD966"
badge_border <- "#BF9000"


# ------------------------------------------------------------------ #
# 2. Locate the data file and the output folder                       #
# ------------------------------------------------------------------ #

pick_data_file <- function(preset) {
  if (!is.null(preset) && nzchar(preset)) {
    p <- normalizePath(preset, winslash = "/", mustWork = FALSE)
    if (!file.exists(p)) stop("DATA_FILE does not exist:\n  ", p, call. = FALSE)
    return(p)
  }
  if (!interactive())
    stop("This script needs to be run interactively so that file.choose()\n",
         "can open the file-selection dialog, or you must set DATA_FILE at\n",
         "the top of the script to the full path of\n",
         "01_Programming_Resilience_811.xlsx.", call. = FALSE)
  message("\nA file-selection window will now open. ",
          "Choose 01_Programming_Resilience_811.xlsx.")
  flush.console()
  p <- file.choose()                        # native dialog on Windows/macOS
  normalizePath(p, winslash = "/", mustWork = TRUE)
}

data_file <- pick_data_file(DATA_FILE)

out_root <- if (!is.null(OUT_DIR) && nzchar(OUT_DIR)) {
  OUT_DIR
} else {
  file.path(dirname(data_file), "Results")
}
dir_fig <- file.path(out_root, "1_Figures")
dir_xls <- file.path(out_root, "2_Excel_Metrics")
for (d in c(out_root, dir_fig, dir_xls))
  if (!dir.exists(d)) dir.create(d, recursive = TRUE)
out_root <- normalizePath(out_root, winslash = "/", mustWork = TRUE)

cat("\nData file  : ", data_file, "\n", sep = "")
cat("Output to  : ", out_root, "\n\n", sep = "")


# ------------------------------------------------------------------ #
# 3. Read and prepare the data                                        #
# ------------------------------------------------------------------ #

read_prepare <- function(path, cfg, exclude) {
  dat <- as.data.frame(read_excel(path), stringsAsFactors = FALSE)

  is_item   <- grepl(cfg$item_pattern, names(dat))
  all_items <- names(dat)[is_item]
  if (!length(all_items))
    stop("No item columns matching ", cfg$item_pattern, " were found in\n  ",
         path, "\nColumns present: ", paste(names(dat), collapse = ", "),
         call. = FALSE)

  X <- dat[, all_items, drop = FALSE]
  X[] <- lapply(X, function(z) suppressWarnings(as.numeric(z)))

  # Listwise deletion; reported in the console and in the Settings sheet.
  complete <- stats::complete.cases(X)
  n_drop   <- sum(!complete)
  X <- X[complete, , drop = FALSE]

  # --- zero-variance / near-constant screening ----------------------
  sds <- apply(X, 2, stats::sd)
  zero_var <- names(sds)[sds == 0]

  drop_items <- unique(c(intersect(exclude, all_items), zero_var))
  items <- setdiff(all_items, drop_items)

  list(X = X[, items, drop = FALSE], items = items, all_items = all_items,
       dropped = drop_items, zero_var = zero_var, sds = sds,
       n_dropped_rows = n_drop)
}

prep   <- read_prepare(data_file, CONFIG, EXCLUDE_ITEMS)
items  <- prep$items
grp_vec <- group_of(items)
grp_names <- CONFIG$grp_names[CONFIG$grp_names %in% grp_vec]

samples <- list(All = prep$X)

cat("items found  : ", length(prep$all_items), "  (",
    paste(sprintf("%s=%d", CONFIG$grp_names,
                  as.integer(table(factor(group_of(prep$all_items),
                                          levels = CONFIG$grp_names)))),
          collapse = ", "), ")\n", sep = "")
if (length(prep$dropped))
  cat("items dropped: ", paste(prep$dropped, collapse = ", "),
      "  (zero variance or excluded)\n", sep = "")
cat("nodes used   : ", length(items), "\n", sep = "")
if (prep$n_dropped_rows)
  cat("rows dropped : ", prep$n_dropped_rows, " (incomplete)\n", sep = "")
cat("sample size  : all = ", nrow(samples$All), "\n\n", sep = "")


# ------------------------------------------------------------------ #
# 4. Estimation                                                       #
# ------------------------------------------------------------------ #

estimate_one <- function(x, cfg) {
  x <- as.matrix(x)
  n <- nrow(x)
  nodes <- colnames(x)
  gv <- group_of(nodes)

  npn <- huge.npn(x, verbose = FALSE)                   # nonparanormal
  W   <- EBICglasso(stats::cor(npn), n = n, gamma = cfg$gamma)
  rownames(W) <- colnames(W) <- nodes

  g  <- qgraph(W, DoNotPlot = TRUE, labels = nodes)
  ca <- centrality_auto(g)$node.centrality      # strength/betw/close/EI
  ca <- ca[nodes, , drop = FALSE]               # keep the item order

  bridge_strength <- sapply(seq_along(nodes), function(i)
    sum(abs(W[i, gv != gv[i]])))                # edges to OTHER constructs
  bridge_ei <- sapply(seq_along(nodes), function(i)
    sum(W[i, gv != gv[i]]))

  fit <- mgm(data = npn, type = rep("g", ncol(npn)), level = rep(1, ncol(npn)),
             k = 2, lambdaSel = "EBIC", lambdaGam = cfg$gamma, pbar = FALSE,
             signInfo = FALSE, verbatim = TRUE)
  r2 <- as.numeric(predict(fit, data = npn, errorCon = "R2")$errors$R2)

  list(n = n, W = W, centrality = ca, bridge_strength = bridge_strength,
       bridge_ei = bridge_ei, predictability = r2)
}

set.seed(CONFIG$seed)
cat("Estimating network ...\n")
res <- lapply(names(samples), function(nm) {
  cat("  ", nm, " (n = ", nrow(samples[[nm]]), ") ... ", sep = "")
  out <- estimate_one(samples[[nm]], CONFIG)
  cat("done, ", sum(out$W[upper.tri(out$W)] != 0), " edges\n", sep = "")
  out
})
names(res) <- names(samples)


# ------------------------------------------------------------------ #
# 5. Figure: network (left) + node labels by construct (right)        #
# ------------------------------------------------------------------ #

set.seed(CONFIG$layout_seed)
L <- qgraph(res$All$W, layout = "spring", repulsion = LAYOUT_REPULSION,
            DoNotPlot = TRUE)$layout

# Pull the connector nodes towards the centre of the circle of nodes:
# their distance from the layout centre (midpoint of the layout's
# bounding box) is scaled by CENTRAL_PULL, direction unchanged.
ctr <- c(mean(range(L[, 1])), mean(range(L[, 2])))
for (nd in intersect(CENTRAL_NODES, items)) {
  i <- match(nd, items)
  L[i, ] <- ctr + CENTRAL_PULL * (L[i, ] - ctr)
}

# Pack the construct boxes into 1 or 2 columns so the label panel stays
# legible whatever the item count is (the 16 Programming Resilience
# items fit in one column).
plan_label_panel <- function(gnames, n_per, hdr, gap, rowh, max_rows_per_col) {
  h <- hdr + n_per * rowh + gap
  ncol <- if (sum(n_per) <= max_rows_per_col) 1L else min(2L, length(h))
  target <- sum(h) / ncol
  col <- integer(length(h)); cur <- 1L; acc <- 0
  for (i in seq_along(h)) {
    if (cur < ncol && acc > 0 && acc + h[i] > target * 1.15) {
      cur <- cur + 1L; acc <- 0
    }
    col[i] <- cur; acc <- acc + h[i]
  }
  list(ncol = ncol, col = col,
       height = max(tapply(h, factor(col, levels = seq_len(ncol)), sum),
                    na.rm = TRUE))
}

draw_right_panel <- function() {
  n_per <- as.integer(table(factor(grp_vec, levels = grp_names)))
  hdr <- 1.55; gap <- 0.85; rowh <- 1
  pl <- plan_label_panel(grp_names, n_per, hdr, gap, rowh,
                         max_rows_per_col = 30)
  total <- pl$height + 1.8
  cw <- 10                                    # width of one label column

  par(mar = c(0.4, 1.2, 0.4, 0.8))
  plot.new()
  plot.window(xlim = c(0, cw * pl$ncol), ylim = c(0, total),
              yaxs = "i", xaxs = "i")
  # ("Node labels by group" heading removed on request - the space it
  #  occupied is kept so the panel geometry is unchanged.)

  y_top <- total - 1.8
  y <- rep(y_top, pl$ncol)
  idx <- 0
  for (gi in seq_along(grp_names)) {
    g  <- grp_names[gi]
    ni <- n_per[gi]
    cc <- pl$col[gi]
    x0 <- (cc - 1) * cw + 0.15
    x1 <- cc * cw - 0.15
    box_top <- y[cc]
    box_bot <- y[cc] - hdr - ni * rowh
    rect(x0, y[cc] - hdr, x1, y[cc], col = head_col[g], border = NA)
    points(x0 + 0.6, y[cc] - hdr / 2, pch = 19, col = border_col[g], cex = 1.4)
    text(x0 + 1.1, y[cc] - hdr / 2, g, font = 2, cex = 1.15, adj = c(0, 0.5))
    y[cc] <- y[cc] - hdr
    for (k in seq_len(ni)) {
      idx <- idx + 1
      it <- items[idx]
      # (all betweenness marking removed on request - no badge box, no
      #  text, no row highlight.)
      text(x0 + 0.4, y[cc] - rowh / 2, it, cex = 0.92, adj = c(0, 0.5))
      y[cc] <- y[cc] - rowh
    }
    rect(x0, box_bot, x1, box_top, border = border_col[g], lwd = 2.4)
    y[cc] <- y[cc] - gap
  }
  pl$ncol
}

badged_nodes <- function(st, metric, k) {
  v <- switch(metric,
              Strength       = st$centrality$Strength,
              Betweenness    = st$centrality$Betweenness,
              Closeness      = st$centrality$Closeness,
              BridgeStrength = st$bridge_strength,
              stop("Unknown BADGE_METRIC: ", metric, call. = FALSE))
  items[order(-v, seq_along(v))][seq_len(k)]
}

draw_figure <- function(st) {
  n_per <- as.integer(table(factor(grp_vec, levels = grp_names)))
  ncol_lbl <- plan_label_panel(grp_names, n_per, 1.55, 0.85, 1, 30)$ncol
  layout(matrix(1:2, 1, 2), widths = c(2.70, 1.00 * ncol_lbl))

  # (yellow betweenness fill removed on request - every node is drawn
  #  in its own group colour.)
  node_fill   <- fill_col[grp_vec]                  # per-node colours
  node_border <- border_col[grp_vec]

  vs <- if (length(items) > 30) 5.2 else 6.4        # keep labels inside
  # (figure title removed on request; the title margin is kept so the
  #  network panel geometry is unchanged.)
  qgraph(st$W, layout = L,
         color = node_fill, border.color = node_border,
         border.width = 2, labels = items, label.cex = 0.85, vsize = vs,
         pie = st$predictability, pieColor = "#4D4D4D", pieBorder = 0.22,
         legend = FALSE, title = "", title.cex = 1.35,
         mar = c(3, 3, 5, 3))
  draw_right_panel()
}

fig_w_in <- 14.5
fig_h_in <- 9.0
cat("\nWriting figure ...\n")
for (nm in names(res)) {
  png(file.path(dir_fig, sprintf("Figure_%s.png", nm)),
      width = round(fig_w_in * 300), height = round(fig_h_in * 300), res = 300)
  draw_figure(res[[nm]]); dev.off()
  pdf(file.path(dir_fig, sprintf("Figure_%s.pdf", nm)),
      width = fig_w_in, height = fig_h_in)
  draw_figure(res[[nm]]); dev.off()
  cat("  Figure_", nm, ".png / .pdf\n", sep = "")
}


# ------------------------------------------------------------------ #
# 6. Excel export: node metrics, edges, predictability                #
# ------------------------------------------------------------------ #

rnd <- function(x, d = 4) round(x, d)

node_sheet <- function(st) data.frame(
  Node = items, Group = grp_vec,
  Strength                = rnd(st$centrality$Strength),
  Strength_z              = rnd(as.numeric(scale(st$centrality$Strength))),
  Betweenness             = rnd(st$centrality$Betweenness),
  Betweenness_z           = rnd(as.numeric(scale(st$centrality$Betweenness))),
  Closeness               = rnd(st$centrality$Closeness, 6),
  Closeness_z             = rnd(as.numeric(scale(st$centrality$Closeness))),
  ExpectedInfluence       = rnd(st$centrality$ExpectedInfluence),
  ExpectedInfluence_z     = rnd(as.numeric(scale(st$centrality$ExpectedInfluence))),
  BridgeStrength          = rnd(st$bridge_strength),
  BridgeStrength_z        = rnd(as.numeric(scale(st$bridge_strength))),
  BridgeExpectedInfluence = rnd(st$bridge_ei),
  Predictability_R2       = rnd(st$predictability),
  stringsAsFactors = FALSE)

summary_row <- function(nm, st) {
  ut <- st$W[upper.tri(st$W)]
  nz <- ut[ut != 0]
  data.frame(
    Sample = nm, N = st$n, Nodes = length(items),
    PossibleEdges = length(ut), NonzeroEdges = length(nz),
    Density = rnd(length(nz) / length(ut), 3),
    PositiveEdges = sum(nz > 0), NegativeEdges = sum(nz < 0),
    MeanAbsWeight_nonzero = rnd(if (length(nz)) mean(abs(nz)) else NA_real_),
    MaxWeight = rnd(if (length(nz)) max(abs(nz)) else NA_real_),
    Mean_Predictability_R2 = rnd(mean(st$predictability), 3),
    stringsAsFactors = FALSE)
}

alpha_row <- function(nm, x) {
  vals <- sapply(grp_names, function(g) {
    cols <- items[grp_vec == g]
    if (length(cols) < 2) return(NA_real_)
    a <- suppressWarnings(suppressMessages(
      psych::alpha(x[, cols, drop = FALSE], warnings = FALSE)))
    rnd(a$total$raw_alpha, 3)
  })
  out <- as.data.frame(as.list(vals), stringsAsFactors = FALSE)
  names(out) <- grp_names
  cbind(data.frame(Sample = nm, stringsAsFactors = FALSE), out)
}

descriptives <- do.call(rbind, lapply(names(samples), function(nm) {
  x <- samples[[nm]]
  data.frame(Node = items, Group = grp_vec,
             Mean = rnd(colMeans(x), 3),
             SD   = rnd(apply(x, 2, stats::sd), 3),
             Sample = nm, stringsAsFactors = FALSE, row.names = NULL)
}))

settings_sheet <- data.frame(
  Setting = c("Data file", "Analysis date", "R version", "qgraph", "mgm",
              "huge", "bootnet", "Platform",
              "Item columns found", "Items excluded from the network",
              "Reason for exclusion", "Nodes in the network",
              "Constant (SD = 0) items", "Rows dropped (incomplete)",
              "Groups analysed",
              "EBIC gamma", "Correlation input", "Estimation seed",
              "Layout seed", "Layout repulsion",
              "Central nodes pulled to the centre", "Central pull factor",
              "Badge metric", "Case-dropping bootstrap subsamples"),
  Value = c(
    data_file,
    format(Sys.Date()),
    R.version.string,
    as.character(utils::packageVersion("qgraph")),
    as.character(utils::packageVersion("mgm")),
    as.character(utils::packageVersion("huge")),
    as.character(utils::packageVersion("bootnet")),
    paste(Sys.info()[["sysname"]], Sys.info()[["release"]]),
    paste(length(prep$all_items), "-",
          paste(sprintf("%s=%d", CONFIG$grp_names,
                        as.integer(table(factor(group_of(prep$all_items),
                                                levels = CONFIG$grp_names)))),
                collapse = ", ")),
    if (length(prep$dropped)) paste(prep$dropped, collapse = ", ") else "(none)",
    if (length(prep$dropped))
      "zero variance or excluded via EXCLUDE_ITEMS"
    else "-",
    as.character(length(items)),
    if (length(prep$zero_var)) paste(prep$zero_var, collapse = ", ") else "(none)",
    as.character(prep$n_dropped_rows),
    "All only (no male/female subgroups, on request)",
    as.character(CONFIG$gamma),
    "Pearson correlation of nonparanormal-transformed items (huge::huge.npn)",
    as.character(CONFIG$seed),
    as.character(CONFIG$layout_seed),
    as.character(LAYOUT_REPULSION),
    paste(CENTRAL_NODES, collapse = ", "),
    as.character(CENTRAL_PULL),
    sprintf("top %d %s (reported only - not marked in the figure)",
            N_BADGE, BADGE_METRIC),
    if (RUN_STABILITY) as.character(N_BOOT_CASE) else "not run"),
  stringsAsFactors = FALSE)

write_xlsx(list(
  Summary        = do.call(rbind, Map(summary_row, names(res), res)),
  Cronbach_Alpha = do.call(rbind, Map(alpha_row, names(samples), samples)),
  Nodes_All      = node_sheet(res$All),
  Descriptives   = descriptives,
  Settings       = settings_sheet),
  file.path(dir_xls, "Node_Metrics.xlsx"))

write_xlsx(list(predictability_r_squared = data.frame(
  Node = items, Group = grp_vec,
  R2_All = rnd(res$All$predictability),
  stringsAsFactors = FALSE)),
  file.path(dir_xls, "predictability_r_squared.xlsx"))

wmat <- function(st)
  cbind(data.frame(Node = items, stringsAsFactors = FALSE),
        as.data.frame(rnd(st$W)))

edge_list <- function(st) {
  W <- st$W
  ij <- which(upper.tri(W) & W != 0, arr.ind = TRUE)
  if (!nrow(ij))
    return(data.frame(Node1 = character(0), Group1 = character(0),
                      Node2 = character(0), Group2 = character(0),
                      Weight = numeric(0), EdgeType = character(0),
                      stringsAsFactors = FALSE))
  d <- data.frame(
    Node1 = items[ij[, 1]], Group1 = grp_vec[ij[, 1]],
    Node2 = items[ij[, 2]], Group2 = grp_vec[ij[, 2]],
    Weight = W[ij],
    EdgeType = ifelse(grp_vec[ij[, 1]] == grp_vec[ij[, 2]],
                      "within-construct", "between-construct"),
    stringsAsFactors = FALSE)
  d[order(-abs(d$Weight)), ]
}

write_xlsx(list(
  WeightMatrix_All = wmat(res$All),
  EdgeList_All     = edge_list(res$All)),
  file.path(dir_xls, "Edge_Weights.xlsx"))

cat("\nExcel written:\n  Node_Metrics.xlsx\n  predictability_r_squared.xlsx",
    "\n  Edge_Weights.xlsx\n", sep = "")


# ------------------------------------------------------------------ #
# 7. Accuracy / stability (case-dropping bootstrap)                   #
# ------------------------------------------------------------------ #
# Slower than everything above. Set RUN_STABILITY <- FALSE at the top
# to skip it.
#
# The bootstrap runs on ONE core on purpose: bootnet does not seed each
# replicate individually, so a parallel run would give slightly different
# CS coefficients depending on how many cores the machine has. Serial +
# set.seed() is reproducible on Windows, macOS and Linux alike.

if (RUN_STABILITY) {
  library(bootnet)

  cs_label <- function(v)
    if (is.na(v)) NA_character_
    else if (v >= 0.5) "strong (>=0.50)"
    else if (v >= 0.25) "acceptable (>=0.25)"
    else "low (<0.25)"

  stat_names <- c("strength", "betweenness", "bridgeStrength")
  pretty_stat <- c(strength = "Strength", betweenness = "Betweenness",
                   bridgeStrength = "BridgeStrength")

  cs_rows <- list(); curve_rows <- list()
  cat("\nCase-dropping bootstrap (", N_BOOT_CASE,
      " subsamples, this is the slow part) ...\n", sep = "")

  for (nm in names(samples)) {
    cat("  ", nm, " ... ", sep = ""); flush.console()
    t0 <- Sys.time()
    set.seed(CONFIG$seed)
    net <- estimateNetwork(samples[[nm]], default = "EBICglasso",
                           corMethod = "npn", tuning = CONFIG$gamma)
    set.seed(CONFIG$seed)
    bt <- bootnet(net, nBoots = N_BOOT_CASE, type = "case", nCores = 1,
                  statistics = stat_names, communities = grp_vec,
                  verbose = FALSE)

    cs <- corStability(bt, verbose = FALSE, statistics = stat_names)
    cs <- cs[stat_names]                       # fixed reporting order
    # Subsamples in which the network could not be estimated (a heavily
    # case-dropped subsample can leave an item constant, or a correlation
    # matrix that is not positive definite) are discarded by bootnet; the
    # count of usable replicates is reported so that is visible.
    n_used <- length(unique(as.data.frame(bt$bootTable)$name))
    cs_rows[[nm]] <- data.frame(
      Sample = nm, Metric = unname(pretty_stat[names(cs)]),
      CS_coefficient = round(as.numeric(cs), 3),
      Interpretation = vapply(as.numeric(cs), cs_label, character(1)),
      Subsamples_requested = N_BOOT_CASE, Subsamples_usable = n_used,
      stringsAsFactors = FALSE, row.names = NULL)

    # Stability curve: correlation between the centrality of each
    # subsample and the centrality of the full sample, by drop level.
    # Replicates are grouped by their exact subsample size (bootnet uses a
    # fixed grid of sizes), so ProportionDropped is the real drop level and
    # can be read directly against the CS coefficient above - rounding the
    # levels to one decimal would print 0.667 as 0.700.
    bo <- as.data.frame(bt$bootTable)
    sa <- as.data.frame(bt$sampleTable)
    n_full <- nrow(samples[[nm]])
    cur <- do.call(rbind, lapply(stat_names, function(s) {
      ref <- sa[sa$type == s, c("node1", "value")]
      sub <- bo[bo$type == s, c("name", "node1", "value", "nPerson")]
      sub$value_ref <- ref$value[match(sub$node1, ref$node1)]
      sp <- split(sub, list(sub$nPerson, sub$name), drop = TRUE)
      agg <- data.frame(
        n = vapply(sp, function(d) d$nPerson[1], numeric(1)),
        r = vapply(sp, function(d)
          suppressWarnings(stats::cor(d$value, d$value_ref)), numeric(1)),
        stringsAsFactors = FALSE)
      agg <- agg[is.finite(agg$r) & agg$n < n_full, , drop = FALSE]
      lv <- sort(unique(agg$n), decreasing = TRUE)
      data.frame(
        Sample = nm, Metric = pretty_stat[[s]],
        ProportionDropped = round(1 - lv / n_full, 3),
        SubsampleSize = lv, Replicates = vapply(lv, function(l)
          sum(agg$n == l), integer(1)),
        MeanCorrelation = round(vapply(lv, function(l)
          mean(agg$r[agg$n == l]), numeric(1)), 3),
        Quantile05 = round(vapply(lv, function(l)
          as.numeric(stats::quantile(agg$r[agg$n == l], 0.05)), numeric(1)), 3),
        stringsAsFactors = FALSE, row.names = NULL)
    }))
    cur$Metric <- factor(cur$Metric, levels = unname(pretty_stat[stat_names]))
    cur <- cur[order(cur$Metric, -cur$ProportionDropped), ]
    cur$Metric <- as.character(cur$Metric)
    curve_rows[[nm]] <- cur
    cat("done (", round(as.numeric(difftime(Sys.time(), t0, units = "mins")), 1),
        " min)\n", sep = "")
  }

  write_xlsx(list(
    CS_Coefficients  = do.call(rbind, cs_rows),
    Stability_Curves = do.call(rbind, curve_rows)),
    file.path(dir_xls, "Stability.xlsx"))

  cat("  Stability.xlsx\n")
} else {
  cat("\nRUN_STABILITY = FALSE -> bootstrap skipped.\n")
}


# ------------------------------------------------------------------ #
# 8. Console summary                                                  #
# ------------------------------------------------------------------ #

cat("\n", strrep("-", 66), "\n", sep = "")
for (nm in names(res)) {
  st <- res[[nm]]
  ut <- st$W[upper.tri(st$W)]
  cat(sprintf("%-7s n = %-4d nodes = %-3d edges = %-4d density = %.3f  mean R2 = %.3f\n",
              nm, st$n, length(items), sum(ut != 0),
              sum(ut != 0) / length(ut), mean(st$predictability)))
  cat(sprintf("        top %d %s: %s\n", N_BADGE, BADGE_METRIC,
              paste(badged_nodes(st, BADGE_METRIC, N_BADGE), collapse = ", ")))
}
cat(strrep("-", 66), "\n", sep = "")
cat("\nAll results written to:\n  ", out_root, "\n\n", sep = "")
