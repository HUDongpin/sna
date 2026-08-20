# =====================================================================
# DAG analysis of the Programming Resilience data (groups: all / male / female)
#
# This is the same analysis as
#   ../20260807_Dataset 4_DAG_Figure 4/DAG_analysis_Grit.R,
# applied to the Programming Resilience dataset
# (01_Programming_Resilience_811.xlsx) instead of the Grit dataset
# (Grit.xlsx).
#
# Method follows:
#   Tu, Y., Huang, C., Pan, Y., & Hwang, G.-J. (2026). Mapping the
#   structure of student burnout in online learning: An integrated
#   Gaussian model and directed acyclic graph approach.
#   The Internet and Higher Education, 70, 101077.
#   (Section 3.3.2 "Directed acyclic graph" and Figure 4)
#
# Procedure:
#   1. Bayesian hill-climbing structure learning (bnlearn::hc) with the
#      Gaussian BIC score ("bic-g"); the point-estimate DAG uses
#      50 random restarts with 100 perturbations each.
#   2. Nonparametric bootstrap with N_BOOT resampled datasets (with
#      replacement); one hill-climbing DAG per bootstrap sample.
#   3. Edge retention uses the DATA-DRIVEN CUT-POINT of Scutari & Nagarajan
#      (2013), estimated separately for each group from that group's own
#      bootstrap distribution. No fixed threshold is hard-coded.
#      Their estimator (Eq. 12-13) chooses the cut-point t that minimises
#      the L1 distance between the empirical CDF of the observed edge
#      confidences and the CDF of the ideal configuration in which every
#      confidence is 0 or 1; edges with strength above it are retained.
#      bnlearn computes this and attaches it to the bn.strength object, so
#      attr(cs, "threshold") is exactly that estimate (equivalently
#      bnlearn::inclusion.threshold()).
#      Edge direction = the more frequent orientation across bootstrapped
#      networks (bnlearn applies direction >= 0.50 internally).
#      For audit, each workbook reports the cut-point actually applied and,
#      in a Threshold_comparison sheet, how many edges the conventional
#      fixed cut-points 0.50 and 0.85 would have retained instead.
#   4. One figure per group, "Figure4_<group>.png", with two panels:
#        panel (a) - edge thickness = |change in BIC| upon edge removal
#                    (bnlearn::arc.strength; negative = removal worsens fit)
#        panel (b) - edge thickness = directional probability (how often
#                    the drawn direction appeared across bootstraps)
#      Edges are drawn as SOLID lines only, at exactly THREE thickness
#      levels (thin / medium / thick), assigned by splitting the metric
#      into tertiles. Node placement uses the Graphviz "dot" layered
#      layout (Rgraphviz), as in the published Figure 4.
#
#      Figure conventions changed on 19 Aug 2026 (per Dr. Sandy's request):
#        - the node ellipses are LARGER than in the Grit version, and the
#          item labels inside them are printed in a LARGER font (both are
#          set in CONFIG: node_width_in / node_height_in / label_fill;
#          the layout spacing ranksep/nodesep in dot_layout() was also
#          tightened, which is what makes the nodes larger RELATIVE to
#          the canvas once the drawing is scaled to the fixed 5200-px
#          figure width);
#        - the panel tags are "(a)" and "(b)" instead of "A" and "B".
#
# Input : 01_Programming_Resilience_811.xlsx, selected interactively with
#         file.choose().
#         Columns: ID, Gender, Cmt1..Cmt4, Cnf1..Cnf4, Cop1..Cop4,
#         Cmp1..Cmp4.  ID is ignored; the 16 item columns are the DAG
#         nodes.  Gender: "M" = male, "F" = female (text codes, not the
#         1/0 numbers used in Grit.xlsx).
# Output: written to a "Results" folder created next to the chosen file
#         per group -> Figure4_<group>.png       (panels (a) and (b))
#                   -> DAG_results_<group>.xlsx  (edge tables etc.)
#
# Packages: bnlearn (required), Rgraphviz + graph (figure layout),
#           readxl (read .xlsx), writexl (write .xlsx; CSV fallback).
# Note (reproducibility): every bootstrap replicate b uses its own seed
#   (SEED_BASE + b), so results are identical no matter how many CPU
#   cores are used, and identical on Windows, macOS and Linux.
#
# ---------------------------------------------------------------------
# HOW TO RUN  (Windows, macOS or Linux)
# ---------------------------------------------------------------------
#   1. Open this file in RStudio (or R).
#   2. Press "Source" (Ctrl+Shift+S on Windows, Cmd+Shift+S on macOS).
#   3. A file-selection window opens -> choose
#      01_Programming_Resilience_811.xlsx.
#   4. Everything else is automatic. Results are written to a folder
#      called "Results" created next to the Excel file you selected, and
#      the full path is printed in the console when the run finishes.
#
#   Missing packages are detected on start-up; you will be asked once
#   whether to install them.
#
#   Run time: a few minutes for the full 10,000 bootstraps (16 nodes are
#   much quicker than the 44 of the Grit run). To try the script out
#   first, set N_BOOT_OVERRIDE <- 200 in the OPTIONAL SETTINGS block.
#
# ---------------------------------------------------------------------
# SENSITIVITY RUN
# ---------------------------------------------------------------------
#   The Grit folder carried a Sensitivity_no_CH11 run because one item
#   there was nearly constant. No such item exists in this dataset
#   (every response category of every item is well populated), so the
#   sensitivity analysis provided here instead re-runs everything with
#   the conventional FIXED cut-point 0.85 of Briganti, Scutari & McNally
#   (2023) in place of the data-driven estimate:
#
#     THRESHOLD_OVERRIDE <- 0.85
#     source("DAG_analysis_ProgrammingResilience.R")
#
#   The ../Sensitivity_threshold_0.85 subfolder holds the full output of
#   that run. The main run's Threshold_comparison sheet already reports
#   the edge counts both fixed rules (0.50, 0.85) would have retained.
# =====================================================================


# ------------------------------------------------------------------ #
# OPTIONAL SETTINGS - edit only if you want to bypass the file dialog #
# ------------------------------------------------------------------ #
# Leave all three as NULL for the normal interactive run.
# Windows paths may be written with forward slashes ("C:/Users/...") or
# with doubled backslashes ("C:\\Users\\..."); both work.

if (!exists("DATA_FILE"))       DATA_FILE       <- NULL  # e.g. "C:/Users/Sandy/Desktop/01_Programming_Resilience_811.xlsx"
if (!exists("OUT_DIR"))         OUT_DIR         <- NULL  # e.g. "C:/Users/Sandy/Desktop/DAG results"
if (!exists("N_BOOT_OVERRIDE")) N_BOOT_OVERRIDE <- NULL  # e.g. 200 for a fast trial run

# Items to leave out of the DAG entirely. Empty by default: unlike
# Grit.xlsx (where CH11 was nearly constant), every item in this dataset
# is well distributed over all five response categories.
if (!exists("EXCLUDE_ITEMS"))   EXCLUDE_ITEMS   <- NULL  # e.g. "Cmp4", or c("Cmp4","Cnf2")

# Edge-retention cut-point. Leave as NULL: the analysis then uses the
# data-driven cut-point of Scutari & Nagarajan (2013), estimated separately
# for each group from that group's own bootstrap distribution. Set a number
# ONLY to override it for a robustness check - e.g. THRESHOLD_OVERRIDE <- 0.85
# reproduces the conventional fixed rule of Briganti, Scutari & McNally (2023).
if (!exists("THRESHOLD_OVERRIDE")) THRESHOLD_OVERRIDE <- NULL


# ------------------------------------------------------------------ #
# 0. Packages                                                         #
# ------------------------------------------------------------------ #

# bnlearn, readxl and writexl come from CRAN; graph and Rgraphviz come
# from Bioconductor. Ask before installing anything.
ensure_packages <- function() {
  cran <- c(bnlearn = "bnlearn", readxl = "readxl", writexl = "writexl")
  bioc <- c(graph = "graph", Rgraphviz = "Rgraphviz")
  have <- function(p) requireNamespace(p, quietly = TRUE)

  miss_cran <- cran[!vapply(cran, have, logical(1))]
  miss_bioc <- bioc[!vapply(bioc, have, logical(1))]
  if (length(miss_cran) == 0L && length(miss_bioc) == 0L) return(invisible(TRUE))

  message("\nThe following R packages are needed but not installed:\n  ",
          paste(c(miss_cran, miss_bioc), collapse = ", "), "\n")

  ok <- FALSE
  if (interactive()) {
    ans <- readline("Install them now from CRAN / Bioconductor? [y/n]: ")
    ok  <- tolower(substr(trimws(ans), 1, 1)) == "y"
  }
  if (!ok) {
    stop("Please install the packages first, then run the script again:\n\n",
         '  install.packages(c("bnlearn", "readxl", "writexl"))\n',
         '  install.packages("BiocManager")\n',
         '  BiocManager::install(c("graph", "Rgraphviz"))\n',
         call. = FALSE)
  }

  if (length(miss_cran))
    install.packages(unname(miss_cran), repos = "https://cloud.r-project.org")
  if (length(miss_bioc)) {
    if (!have("BiocManager"))
      install.packages("BiocManager", repos = "https://cloud.r-project.org")
    BiocManager::install(unname(miss_bioc), ask = FALSE, update = FALSE)
  }

  still <- c(cran, bioc)[!vapply(c(cran, bioc), have, logical(1))]
  if (length(still))
    stop("Installation did not succeed for: ", paste(still, collapse = ", "),
         call. = FALSE)
  invisible(TRUE)
}

ensure_packages()

suppressMessages({
  library(bnlearn)
  library(graph)
  library(Rgraphviz)
})


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

# Default output folder: a "Results" subfolder next to the chosen file.
resolve_out_dir <- function(data_file, preset = NULL) {
  d <- if (!is.null(preset) && nzchar(preset)) preset
       else file.path(dirname(data_file), "Results")
  dir.create(d, showWarnings = FALSE, recursive = TRUE)
  normalizePath(d, winslash = "/", mustWork = TRUE)
}


CONFIG <- list(
  n_boot      = if (is.null(N_BOOT_OVERRIDE)) 10000L
                else as.integer(N_BOOT_OVERRIDE),  # bootstrap resamples
  seed_base   = 20260712,        # base random seed
  # Edge-retention cut-point applied to bootstrap edge strength.
  # NULL = the data-driven estimate of Scutari & Nagarajan (2013), which is
  # what this analysis uses. Set a number ONLY to override it for a
  # robustness check (see THRESHOLD_OVERRIDE in OPTIONAL SETTINGS).
  threshold   = if (is.null(THRESHOLD_OVERRIDE)) NULL
                else as.numeric(THRESHOLD_OVERRIDE),
  compare_at  = c(0.50, 0.85),   # cut-points reported for comparison only
  score       = "bic-g",         # Gaussian BIC network score
  restarts    = 50,              # random restarts (point-estimate DAG)
  perturb     = 100,             # perturbations per restart
  male_code   = "M",             # Gender coding in this dataset: "M" = male
  female_code = "F",             #                                "F" = female
  # item columns = the DAG nodes; everything else (ID, Gender) is
  # metadata. Matched on the ASCII prefixes so that nothing depends on
  # column positions or on the machine's text encoding.
  item_pattern = "^(Cmt|Cnf|Cop|Cmp)[0-9]+$",
  exclude_items = if (is.null(EXCLUDE_ITEMS)) character(0)
                  else as.character(EXCLUDE_ITEMS),
  n_cores     = max(1L, parallel::detectCores() - 1L),
  lwd_levels  = c(0.9, 2.4, 4.6),# the three line widths: thin/medium/thick
  # --- node / label size (enlarged 19 Aug 2026, per Dr. Sandy) --------
  # The Grit figure drew each node as a 0.40-inch-high ellipse whose
  # width followed the longest label, and the label was fitted to at
  # most 72% / 78% of the ellipse. Both were judged too small, so this
  # version draws bigger ellipses and lets the label fill more of them.
  node_height_in = 0.72,             # ellipse height, inches (Grit: 0.40)
  node_width_in  = function(nodes)   # ellipse width, inches (Grit formula x ~1.8)
                     max(1.10, 0.40 + 0.29 * max(nchar(nodes))),
  label_fill     = c(w = 0.84, h = 0.80),  # label may fill this fraction
                                           # of the ellipse (Grit: .72/.78)
  panel_labels   = c("(a)", "(b)")   # panel tags (Grit: "A", "B")
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

# Locate the gender column without relying on its header text: it is the
# metadata column holding exactly the two configured codes ("M" / "F").
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
    message("excluding ", length(cfg$exclude_items), " item(s) from the DAG: ",
            paste(cfg$exclude_items, collapse = ", "))
    items <- items[, setdiff(names(items), cfg$exclude_items), drop = FALSE]
  }

  gcol   <- find_gender_column(meta, cfg)
  gender <- trimws(as.character(meta[[gcol]]))

  items[] <- lapply(items, as.numeric)       # must be numeric for "bic-g"

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
    all    = items,
    male   = items[which(gender == as.character(cfg$male_code)),   , drop = FALSE],
    female = items[which(gender == as.character(cfg$female_code)), , drop = FALSE])

  # An item can vary in the whole sample yet be constant inside a subgroup
  # (in Grit.xlsx, CH11 was 4 for every woman). Such an item has no
  # covariance with anything, so no edge can ever reach it and it is
  # drawn as an isolated node. That is the correct result, but it must be
  # visible rather than left to be discovered in the figure - so report it
  # here and record it in the Settings sheet of the output workbook.
  zero_var <- lapply(groups, function(Y)
    names(Y)[vapply(Y, function(x) stats::sd(x) == 0, logical(1))])
  for (g in names(zero_var))
    if (length(zero_var[[g]]))
      message("NOTE: in group '", g, "' these items are constant and will ",
              "appear as isolated nodes with no edges: ",
              paste(zero_var[[g]], collapse = ", "))

  list(groups              = groups,
       zero_var            = zero_var,
       gender_column_index = which(names(dat) == gcol)[1],
       ignored             = setdiff(names(meta), gcol),
       items               = names(items))
}


# ------------------------------------------------------------------ #
# 3. Bootstrap machinery                                              #
# ------------------------------------------------------------------ #

# One bootstrap replicate: resample rows with replacement, learn a DAG
# by hill climbing, return its arc set. Seeded per replicate, so the
# result does not depend on how the work is split across cores.
boot_arcs <- function(X, b, seed_base, score) {
  set.seed(seed_base + b)
  idx <- sample(nrow(X), replace = TRUE)
  bnlearn::arcs(bnlearn::hc(X[idx, , drop = FALSE], score = score))
}

# Parallel on every platform: fork-based mclapply on macOS/Linux, and a
# PSOCK cluster on Windows (where mclapply falls back to serial). Both
# give bit-identical results because of the per-replicate seed.
run_bootstrap <- function(X, cfg) {
  seed_base <- cfg$seed_base
  score     <- cfg$score
  worker    <- function(b) boot_arcs(X, b, seed_base, score)

  if (cfg$n_cores <= 1L)
    return(lapply(seq_len(cfg$n_boot), worker))

  if (.Platform$OS.type == "unix")
    return(parallel::mclapply(seq_len(cfg$n_boot), worker,
                              mc.cores = cfg$n_cores))

  cl <- parallel::makePSOCKcluster(cfg$n_cores)          # Windows
  on.exit(parallel::stopCluster(cl), add = TRUE)
  parallel::clusterEvalQ(cl, suppressMessages(library(bnlearn)))
  parallel::clusterExport(cl, c("X", "seed_base", "score", "boot_arcs"),
                          envir = environment())
  parallel::parLapply(cl, seq_len(cfg$n_boot), worker)
}

# Aggregate bootstrapped arc sets into edge strengths / directions
# (equivalent to bnlearn::boot.strength, which uses cpdag = TRUE).
aggregate_boot <- function(arc_sets, nodes) {
  custom.strength(arc_sets, nodes = nodes, cpdag = TRUE)
}


# ------------------------------------------------------------------ #
# 4. Final (averaged) DAG and edge metrics                            #
# ------------------------------------------------------------------ #

finalize_dag <- function(cs, X, cfg) {
  # Edge-retention cut-point. By default this is the data-driven estimate of
  # Scutari & Nagarajan (2013): the value minimising the L1 distance between
  # the empirical CDF of the bootstrap edge confidences and that of the ideal
  # {0,1} configuration (their Eq. 12-13). bnlearn computes it and attaches it
  # to the bn.strength object, so attr(cs, "threshold") IS that estimate.
  # cfg$threshold is NULL unless the user deliberately sets a fixed number
  # (e.g. 0.85) for a robustness check.
  t_used <- threshold_for(cs, cfg)

  # averaged.network() drops any arc that would close a cycle. Those arcs
  # are absent from the figure for structural rather than statistical
  # reasons, so capture them instead of letting them scroll past as
  # warnings; they are exported in the Cycles_dropped sheet.
  dropped <- character(0)
  avg <- withCallingHandlers(
    averaged.network(cs, threshold = t_used$value),
    warning = function(w) {
      msg <- conditionMessage(w)
      if (grepl("would introduce cycles", msg, fixed = TRUE)) {
        dropped <<- c(dropped, msg)
        invokeRestart("muffleWarning")
      }
    })

  dag <- tryCatch(cextend(avg), error = function(e) NULL)
  if (is.null(dag)) {                      # fallback: orient undirected
    dag <- avg                             # arcs by directional majority
    und <- undirected.arcs(dag)
    if (nrow(und)) {
      und <- und[und[, 1] < und[, 2], , drop = FALSE]
      for (i in seq_len(nrow(und))) {
        r <- cs[cs$from == und[i, 1] & cs$to == und[i, 2], ]
        if (r$direction >= 0.5)
          dag <- set.arc(dag, und[i, 1], und[i, 2])
        else
          dag <- set.arc(dag, und[i, 2], und[i, 1])
      }
    }
  }

  ed <- as.data.frame(arcs(dag), stringsAsFactors = FALSE)
  if (nrow(ed) == 0)
    stop("No edges retained at the cut-point ", signif(t_used$value, 4), ".",
         call. = FALSE)

  # bootstrap strength & directional probability of the drawn direction
  key       <- paste(cs$from, cs$to)
  m         <- match(paste(ed$from, ed$to), key)
  ed$edge_strength  <- cs$strength[m]   # P(edge exists, either direction)
  ed$direction_prob <- cs$direction[m]  # P(this direction | edge exists)

  # change in BIC upon edge removal, computed on the final DAG
  # (negative values = removing the edge worsens model fit)
  ast <- arc.strength(dag, data = X, criterion = cfg$score)
  m2  <- match(paste(ed$from, ed$to), paste(ast$from, ast$to))
  ed$BIC_change     <- ast$strength[m2]
  ed$abs_BIC_change <- abs(ed$BIC_change)

  # three thickness levels (1 = thin, 2 = medium, 3 = thick)
  ed$thickness_A <- three_level(ed$abs_BIC_change)   # panel (a) metric
  ed$thickness_B <- three_level(ed$direction_prob)   # panel (b) metric
  list(dag = dag, edges = ed, threshold = t_used,
       cycles_dropped = parse_dropped(dropped, cs))
}

# The cut-point actually applied to bootstrap edge strength.
#   cfg$threshold = NULL -> Scutari & Nagarajan (2013) data-driven estimate,
#                           which bnlearn attaches to the bn.strength object
#                           (identical to bnlearn::inclusion.threshold(cs)).
#   cfg$threshold = <num> -> that fixed value, for a robustness check only.
threshold_for <- function(cs, cfg) {
  if (!is.null(cfg$threshold))
    return(list(value = as.numeric(cfg$threshold), source = "fixed",
                label = sprintf("fixed at %.4f (robustness check)",
                                as.numeric(cfg$threshold))))

  t_hat <- suppressWarnings(as.numeric(attr(cs, "threshold")))
  if (length(t_hat) != 1L || is.na(t_hat))
    stop("bnlearn did not attach a data-driven threshold to the bn.strength ",
         "object; cannot apply the Scutari & Nagarajan (2013) cut-point.",
         call. = FALSE)
  list(value = t_hat, source = "L1",
       label = sprintf("data-driven L1 = %.4f (Scutari & Nagarajan, 2013)",
                       t_hat))
}

# Turn "arc A -> B would introduce cycles in the graph, ignoring." into a
# table, annotated with the bootstrap strength/direction the arc had.
parse_dropped <- function(msgs, cs) {
  empty <- data.frame(From = character(0), To = character(0),
                      Edge_strength = numeric(0),
                      Direction_probability = numeric(0))
  if (!length(msgs)) return(empty)
  m <- regmatches(msgs, regexec("arc (\\S+) -> (\\S+) would introduce", msgs))
  ok <- lengths(m) == 3L
  if (!any(ok)) return(empty)
  from <- vapply(m[ok], `[`, character(1), 2)
  to   <- vapply(m[ok], `[`, character(1), 3)
  i    <- match(paste(from, to), paste(cs$from, cs$to))
  d    <- data.frame(From = from, To = to,
                     Edge_strength         = round(cs$strength[i], 4),
                     Direction_probability = round(cs$direction[i], 4),
                     stringsAsFactors = FALSE)
  d[!duplicated(paste(d$From, d$To)), , drop = FALSE]
}

# Split a metric into three levels by tertiles of its distinct values,
# so that equal metric values always receive equal thickness (important
# for the directional probability, where many edges tie at 1.0).
three_level <- function(x) {
  u <- sort(unique(x))
  k <- length(u)
  if (k == 1) return(rep(2L, length(x)))
  lv_u <- if (k == 2) c(1L, 3L)
          else as.integer(ceiling(seq_along(u) * 3 / k))
  lv_u[match(x, u)]
}

# Number of edges a given cut-point would retain, reported for comparison
# only (the analysis itself uses threshold_for()). Used to show what the
# conventional fixed cut-points would have given on the same bootstrap.
# suppressWarnings: cycle-dropping warnings are reported for the real
# network by finalize_dag(); repeating them here would be noise.
# arcs() lists an undirected edge twice (once per orientation), so halve
# those to get a count directly comparable with the retained-edge count.
edges_at <- function(cs, t) {
  suppressWarnings(tryCatch({
    a <- averaged.network(cs, threshold = t)
    as.integer(nrow(arcs(a)) - nrow(undirected.arcs(a)) / 2)
  }, error = function(e) NA_integer_))
}


# ------------------------------------------------------------------ #
# 5. Figure drawing (Graphviz "dot" layout, as in the paper)          #
# ------------------------------------------------------------------ #

# Layered top-down layout of the final DAG; returns the Rgraphviz
# layout object (node centres, ellipse sizes and edge spline curves).
# The ellipse size comes from CONFIG (node_width_in / node_height_in),
# which was enlarged on 19 Aug 2026; the width still adapts to the
# longest item label ("Cmt1", "Cmp4", ...).
dot_layout <- function(nodes, edges, cfg) {
  w <- cfg$node_width_in(nodes)
  g <- new("graphNEL", nodes = nodes, edgemode = "directed")
  for (i in seq_len(nrow(edges)))
    g <- graph::addEdge(edges$from[i], edges$to[i], g, 1)
  agopen(g, name = "dag", layoutType = "dot",
         attrs = list(node  = list(shape = "ellipse",
                                   width = sprintf("%.2f", w),
                                   height = sprintf("%.2f", cfg$node_height_in),
                                   fixedsize = "true"),
                      graph = list(ranksep = "0.42", nodesep = "0.26",
                                   ratio = "1.0"),
                      edge  = list(arrowsize = "0.8")))
}

# filled triangular arrowhead starting at point p, oriented along u
arrow_head <- function(p, u, level) {
  len <- 9.0 + 1.7 * level               # in layout (graphviz point) units
  hw  <- 3.3 + 0.95 * level
  v   <- c(-u[2], u[1])
  tip <- p + u * len
  polygon(c(tip[1], p[1] + v[1] * hw, p[1] - v[1] * hw),
          c(tip[2], p[2] + v[2] * hw, p[2] - v[2] * hw),
          col = "black", border = "black")
}

# extents of the drawing (node ellipses + edge splines), in layout units
panel_extent <- function(ag) {
  nxy <- getNodeXY(ag)
  nh  <- getNodeHeight(ag) / 2
  nw  <- (getNodeLW(ag) + getNodeRW(ag)) / 2
  pts <- do.call(rbind, lapply(AgEdge(ag), function(e)
    do.call(rbind, lapply(splines(e), bezierPoints))))
  list(x = range(c(nxy$x - nw, nxy$x + nw, pts[, 1])),
       y = range(c(nxy$y - nh, nxy$y + nh, pts[, 2])))
}

draw_dag_panel <- function(ag, edges, thickness, cfg, panel_label) {
  nxy    <- getNodeXY(ag)
  nnames <- sapply(AgNode(ag), name)
  nh     <- getNodeHeight(ag) / 2
  nw     <- (getNodeLW(ag) + getNodeRW(ag)) / 2

  # edge polylines from the layout's bezier splines
  elines <- lapply(AgEdge(ag), function(e) {
    pts <- do.call(rbind, lapply(splines(e), bezierPoints))
    list(tail = e@tail, head = e@head, pts = pts)
  })

  ext <- panel_extent(ag)
  xr  <- ext$x
  yr  <- ext$y
  mar <- 0.02 * max(diff(xr), diff(yr))

  par(mar = c(0.4, 0.4, 1.6, 0.4))
  plot.new()
  plot.window(xlim = xr + c(-mar, mar), ylim = yr + c(-mar, mar), asp = 1)

  lev <- thickness[paste(sapply(elines, `[[`, "tail"),
                         sapply(elines, `[[`, "head"))]
  for (i in seq_along(elines)) {
    pts <- elines[[i]]$pts
    n   <- nrow(pts)
    u   <- pts[n, ] - pts[n - 1, ]
    u   <- u / sqrt(sum(u^2))
    lines(pts[, 1], pts[, 2], lwd = cfg$lwd_levels[lev[i]],
          col = "black", lend = 1)
    arrow_head(pts[n, ], u, lev[i])
  }

  # nodes: white ellipses with the item label inside. The label may fill
  # up to label_fill of the ellipse (both enlarged vs the Grit version,
  # so the labels print in a clearly bigger font).
  th <- seq(0, 2 * pi, length.out = 60)
  for (j in seq_along(nnames)) {
    polygon(nxy$x[j] + nw[j] * cos(th), nxy$y[j] + nh[j] * sin(th),
            col = "white", border = "black", lwd = 1.6)
  }
  widest  <- nnames[which.max(nchar(nnames))]
  cex_fit <- min(cfg$label_fill[["w"]] * min(nw) * 2 / strwidth(widest, cex = 1),
                 cfg$label_fill[["h"]] * min(nh) * 2 / strheight(widest, cex = 1))
  text(nxy$x, nxy$y, labels = nnames, cex = cex_fit)

  usr <- par("usr")
  text(usr[1] + 0.01 * diff(usr[1:2]), usr[4], panel_label,
       font = 2, cex = 2.4, adj = c(0, 0.2), xpd = NA)
  invisible()
}

# One PNG per group with both panels:
#   (a) - thickness = |change in BIC| upon edge removal
#   (b) - thickness = directional probability across bootstraps
make_figure4 <- function(group, res, cfg, out_dir) {
  ag <- dot_layout(nodes(res$dag), res$edges, cfg)
  key <- paste(res$edges$from, res$edges$to)
  thickA <- setNames(res$edges$thickness_A, key)
  thickB <- setNames(res$edges$thickness_B, key)

  # size the canvas from the drawing's aspect ratio, so the graph fills
  # the panel vertically with no empty bands at the top / bottom
  ext    <- panel_extent(ag)
  asp_hw <- diff(ext$y) / diff(ext$x)
  wid_px <- 5200                             # total width, two panels
  plot_w <- wid_px / 2 - 48                  # panel minus L/R margins (px)
  hei_px <- round(plot_w * asp_hw * 1.04) + 130   # + pad and top margin
  hei_px <- min(max(hei_px, 1600), 9000)

  f <- file.path(out_dir, sprintf("Figure4_%s.png", group))
  if (capabilities("aqua"))                    # macOS: quartz renderer
    png(f, width = wid_px, height = hei_px, res = 300, type = "quartz")
  else
    png(f, width = wid_px, height = hei_px, res = 300)
  on.exit(if (dev.cur() > 1L) dev.off(), add = TRUE)
  par(mfrow = c(1, 2))
  draw_dag_panel(ag, res$edges, thickA, cfg, cfg$panel_labels[1])
  draw_dag_panel(ag, res$edges, thickB, cfg, cfg$panel_labels[2])
  dev.off()
  message("figure written: ", f)
  f
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
      write.csv(sheets[[nm]], paste0(base, "__", nm, ".csv"),
                row.names = FALSE)
    message("no xlsx writer installed - CSV files written: ",
            base, "__<sheet>.csv")
  }
}

collect_sheets <- function(group, X, res, cs, hc_point, cfg, data_file,
                           zv = character(0)) {
  ed <- res$edges
  # nodes that ended up with no edge at all (see the note in prepare_groups)
  isolated <- setdiff(names(X), unique(c(ed$from, ed$to)))
  thr      <- res$threshold

  # what the conventional fixed cut-points would have given on this same
  # bootstrap - reported so the data-driven choice is auditable
  cmp <- data.frame(
    Cut_point = c(sprintf("%.4f  <- USED (%s)", thr$value,
                          if (thr$source == "L1")
                            "data-driven, Scutari & Nagarajan 2013"
                          else "fixed override"),
                  sprintf("%.2f  (comparison only)", cfg$compare_at)),
    Edges_retained = c(nrow(ed),
                       vapply(cfg$compare_at,
                              function(t) edges_at(cs, t), integer(1))),
    stringsAsFactors = FALSE)
  final <- data.frame(
    From                   = ed$from,
    To                     = ed$to,
    Edge_strength          = round(ed$edge_strength, 4),
    Direction_probability  = round(ed$direction_prob, 4),
    BIC_change_on_removal  = round(ed$BIC_change, 2),
    Abs_BIC_change         = round(ed$abs_BIC_change, 2),
    Thickness_panel_a      = ed$thickness_A,
    Thickness_panel_b      = ed$thickness_B)
  final <- final[order(-final$Abs_BIC_change), ]

  boot_tab <- cs[cs$strength > 0, ]
  boot_tab$strength  <- round(boot_tab$strength, 4)
  boot_tab$direction <- round(boot_tab$direction, 4)
  names(boot_tab) <- c("From", "To", "Edge_strength", "Direction_probability")

  desc <- data.frame(Item = names(X),
                     N    = nrow(X),
                     Mean = round(sapply(X, mean), 3),
                     SD   = round(sapply(X, sd), 3))

  settings <- data.frame(
    Setting = c("Dataset", "Group", "N (rows)", "Items (nodes)",
                "Bootstrap resamples", "Seed base",
                "Edge retention rule",
                "Edge retention cut-point (value applied)",
                "Direction rule",
                "Score", "Restarts (point DAG)",
                "Perturbations (point DAG)", "Edges retained",
                "Arcs dropped as cycle-inducing",
                "Items excluded from the DAG",
                "Constant (zero-variance) items in this group",
                "Isolated nodes (no edges in final DAG)",
                "Min direction probability among retained edges",
                "Comparison: edges at fixed 0.50",
                "Comparison: edges at fixed 0.85",
                "Thickness levels (lwd)", "Platform", "R version",
                "bnlearn version"),
    Value   = c(basename(data_file), group, nrow(X), ncol(X), cfg$n_boot,
                cfg$seed_base,
                if (thr$source == "L1")
                  "> data-driven L1 cut-point (Scutari & Nagarajan, 2013)"
                else "> fixed value set by THRESHOLD_OVERRIDE",
                sprintf("%.4f", thr$value),
                ">= 0.50 (bnlearn default, applied to direction probability)",
                cfg$score,
                cfg$restarts, cfg$perturb, nrow(ed),
                nrow(res$cycles_dropped),
                if (length(cfg$exclude_items))
                  paste(cfg$exclude_items, collapse = ", ") else "none",
                if (length(zv)) paste(zv, collapse = ", ") else "none",
                if (length(isolated)) paste(isolated, collapse = ", ") else "none",
                sprintf("%.4f", min(ed$direction_prob)),
                as.character(edges_at(cs, 0.50)),
                as.character(edges_at(cs, 0.85)),
                paste(cfg$lwd_levels, collapse = " / "),
                paste(Sys.info()[["sysname"]], Sys.info()[["release"]]),
                R.version.string,
                as.character(packageVersion("bnlearn"))))

  list(Final_DAG_edges     = final,
       Bootstrap_all_pairs = boot_tab,
       Threshold_comparison = cmp,
       Cycles_dropped      = res$cycles_dropped,
       HC_point_estimate   = as.data.frame(arcs(hc_point)),
       Descriptives        = desc,
       Settings            = settings)
}


# ------------------------------------------------------------------ #
# 7. Main pipeline                                                    #
# ------------------------------------------------------------------ #

main <- function(cfg = CONFIG) {
  data_file <- pick_data_file(DATA_FILE)
  out_dir   <- resolve_out_dir(data_file, OUT_DIR)
  cat("\ndata file  : ", data_file, "\n", sep = "")
  cat("output dir : ", out_dir, "\n", sep = "")

  prep   <- prepare_groups(read_data(data_file), cfg)
  groups <- prep$groups
  cat(sprintf("items (nodes): %d  [%s ... %s]\n", length(prep$items),
              prep$items[1], prep$items[length(prep$items)]))
  cat(sprintf("gender column: #%d  (%s = male, %s = female)\n",
              prep$gender_column_index, cfg$male_code, cfg$female_code))
  cat(sprintf("non-item columns ignored: %d (ID)\n",
              length(prep$ignored)))
  cat(sprintf("Groups: %s\n", paste(names(groups), "n =",
              sapply(groups, nrow), collapse = " | ")))

  results <- list()
  for (group in names(groups)) {
    X <- groups[[group]]
    cat(sprintf("\n=== %s (n = %d) ===\n", group, nrow(X)))

    # point-estimate DAG (50 restarts x 100 perturbations)
    set.seed(cfg$seed_base)
    hc_point <- hc(X, score = cfg$score,
                   restart = cfg$restarts, perturb = cfg$perturb)

    # bootstrap -> aggregate -> final DAG + edge metrics
    cat(sprintf("bootstrapping %d resamples on %d core(s)...\n",
                cfg$n_boot, cfg$n_cores))
    t0       <- Sys.time()
    arc_sets <- run_bootstrap(X, cfg)
    cs       <- aggregate_boot(arc_sets, colnames(X))
    cat(sprintf("bootstrap done in %.1f min\n",
                as.numeric(difftime(Sys.time(), t0, units = "mins"))))

    res <- finalize_dag(cs, X, cfg)
    cat(sprintf("cut-point: %s\n", res$threshold$label))
    cat(sprintf("edges retained (strength > %.4f): %d\n",
                res$threshold$value, nrow(res$edges)))
    cat(sprintf("  for comparison, fixed cut-points: %s\n",
                paste(sprintf("%.2f -> %s edges", cfg$compare_at,
                              vapply(cfg$compare_at,
                                     function(t) format(edges_at(cs, t)),
                                     character(1))),
                      collapse = " | ")))

    make_figure4(group, res, cfg, out_dir)
    write_sheets(collect_sheets(group, X, res, cs, hc_point, cfg, data_file,
                                prep$zero_var[[group]]),
                 file.path(out_dir, sprintf("DAG_results_%s.xlsx", group)))
    results[[group]] <- res
  }

  cat("\nAll done. Results are in:\n  ", out_dir, "\n", sep = "")
  invisible(results)
}

# Run the full pipeline (set SKIP_MAIN <- TRUE before source() to load
# only the functions, e.g. for testing or running in chunks).
if (!exists("SKIP_MAIN")) main(CONFIG)
