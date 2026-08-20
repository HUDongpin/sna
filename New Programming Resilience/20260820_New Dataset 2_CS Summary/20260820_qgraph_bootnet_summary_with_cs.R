# ============================================================================
# 20260820_qgraph_bootnet_summary_with_cs.R
#
# New Dataset 2 (01_Programming_Resilience_811.xlsx, N = 811).
# Ports the Grit "figure1_qgraph_bootnet_summary + CS coefficients" table to
# the Programming Resilience pipeline:
#
#   * One row per group (All M+F, Male M, Female F).
#   * Network summary: EBICglasso (bootnet, corMethod = "npn", gamma = 0.50),
#     edges, density, mean |weight|, strongest edge, mean predictability R2.
#   * Case-dropping bootstrap CS coefficients (bootnet, 1000 subsamples,
#     serial, seed 2026 per group — same convention as the Figure 1 script
#     SNA_Analysis_ProgrammingResilience.R so the All row reproduces
#     Stability.xlsx) for strength, bridge strength, bridge closeness and
#     bridge betweenness.
#
# Output (this folder):
#   20260820_summary_with_cs_coefficients.csv
#   20260820_summary_with_cs_coefficients.xlsx
# ============================================================================

suppressPackageStartupMessages({
  library(readxl)
  library(writexl)
  library(bootnet)
  library(huge)
})

DATA_FILE <- "/Users/dongpinhu/Desktop/New Programming Resilience/01_Programming_Resilience_811.xlsx"
OUT_DIR   <- "/Users/dongpinhu/Desktop/New Programming Resilience/20260820_New Dataset 2_CS Summary"

EBIC_GAMMA          <- 0.50
EDGE_ZERO_TOLERANCE <- 1e-6
SEED                <- 2026      # same seed as SNA_Analysis_ProgrammingResilience.R

CS_BOOTSTRAP_REPLICATES  <- 1000
CS_BOOTSTRAP_CORES       <- 1     # serial on purpose: reproducible CS values
CS_CORRELATION_THRESHOLD <- 0.70
CS_ACCEPTABLE_THRESHOLD  <- 0.25
CS_DESIRABLE_THRESHOLD   <- 0.50

CS_STATISTICS <- c("strength", "bridgeStrength",
                   "bridgeCloseness", "bridgeBetweenness")
CS_COLUMNS    <- c(strength          = "cs_strength",
                   bridgeStrength    = "cs_bridge_strength",
                   bridgeCloseness   = "cs_bridge_closeness",
                   bridgeBetweenness = "cs_bridge_betweenness")

ANALYSIS_GROUPS <- data.frame(
  group_id       = c("all_students_MF", "male_students_M", "female_students_F"),
  gender_filter  = c(NA, "M", "F"),
  group_label_en = c("All students (M + F)", "Male students (M)",
                     "Female students (F)"),
  group_label_zh = c("全體學生（M + F）",
                     "男性學生（M）",
                     "女性學生（F）"),
  stringsAsFactors = FALSE
)

cs_interpretation <- function(value) {
  if (is.na(value)) return("not_available")
  if (value < CS_ACCEPTABLE_THRESHOLD) return("omit_or_do_not_interpret")
  if (value >= CS_DESIRABLE_THRESHOLD) return("desirable")
  "acceptable"
}

# ---------------------------------------------------------------- data ----

raw <- as.data.frame(read_excel(DATA_FILE), stringsAsFactors = FALSE)
item_cols <- grep("^(Cmt|Cnf|Cop|Cmp)[0-9]+$", names(raw), value = TRUE)
raw[item_cols] <- lapply(raw[item_cols],
                         function(z) suppressWarnings(as.numeric(z)))
communities <- setNames(sub("[0-9]+$", "", item_cols), item_cols)

get_group_data <- function(gender_filter) {
  d <- if (is.na(gender_filter)) raw else raw[raw$Gender %in% gender_filter, ]
  d <- d[stats::complete.cases(d[item_cols]), item_cols, drop = FALSE]
  d
}

# ----------------------------------------------------------- per group ----

summarise_group <- function(group_row) {
  item_data <- get_group_data(group_row$gender_filter)
  n <- nrow(item_data)
  cat(sprintf("\n== %s (n = %d) ==\n", group_row$group_id, n))

  set.seed(SEED)
  net <- estimateNetwork(item_data, default = "EBICglasso",
                         corMethod = "npn", tuning = EBIC_GAMMA,
                         verbose = FALSE)
  graph <- as.matrix(net$graph)
  rownames(graph) <- colnames(graph) <- item_cols
  diag(graph) <- 0
  graph[abs(graph) < EDGE_ZERO_TOLERANCE] <- 0

  ut <- upper.tri(graph)
  w  <- graph[ut]
  idx <- which(ut & graph != 0, arr.ind = TRUE)
  observed_edges <- nrow(idx)
  possible_edges <- length(item_cols) * (length(item_cols) - 1) / 2
  if (observed_edges > 0) {
    weights  <- graph[idx]
    top      <- which.max(abs(weights))
    strongest_edge        <- sprintf("%s-%s", item_cols[idx[top, 1]],
                                     item_cols[idx[top, 2]])
    strongest_edge_weight <- weights[top]
    mean_abs_edge_weight  <- mean(abs(weights))
  } else {
    strongest_edge <- NA; strongest_edge_weight <- NA; mean_abs_edge_weight <- 0
  }

  # Predictability: linear R2 of each node on its network neighbours after
  # the nonparanormal transformation (same method as the Grit summary).
  npn_data <- as.data.frame(huge.npn(as.matrix(item_data),
                                     npn.func = "shrinkage", verbose = FALSE))
  names(npn_data) <- item_cols
  r2 <- vapply(item_cols, function(it) {
    nb <- item_cols[abs(graph[it, ]) > EDGE_ZERO_TOLERANCE]
    if (!length(nb)) return(0)
    f <- stats::as.formula(paste(it, "~", paste(nb, collapse = " + ")))
    min(max(summary(stats::lm(f, npn_data))$r.squared, 0), 1)
  }, numeric(1))

  # Case-dropping bootstrap (serial, seeded -> reproducible).
  cat(sprintf("   case-dropping bootstrap: %d subsamples ...\n",
              CS_BOOTSTRAP_REPLICATES)); flush.console()
  t0 <- Sys.time()
  set.seed(SEED)
  bt <- bootnet(net, nBoots = CS_BOOTSTRAP_REPLICATES, type = "case",
                nCores = CS_BOOTSTRAP_CORES, statistics = CS_STATISTICS,
                communities = communities,
                bridgeArgs = list(communities = communities),
                verbose = FALSE)
  cs_values <- vapply(CS_STATISTICS, function(s) {
    v <- tryCatch(corStability(bt, cor = CS_CORRELATION_THRESHOLD,
                               statistics = s, verbose = FALSE),
                  error = function(e) NA_real_)
    as.numeric(v)[1]
  }, numeric(1))
  cat(sprintf("   done (%.1f min)\n",
              as.numeric(difftime(Sys.time(), t0, units = "mins"))))

  row <- data.frame(
    group_id       = group_row$group_id,
    group_label_en = group_row$group_label_en,
    group_label_zh = group_row$group_label_zh,
    gender_filter  = ifelse(is.na(group_row$gender_filter), "M+F",
                            group_row$gender_filter),
    n_complete     = n,
    n_items        = length(item_cols),
    estimator      = "bootnet::estimateNetwork(default = 'EBICglasso')",
    cor_method     = "nonparanormal transformation (corMethod = 'npn')",
    ebic_gamma     = EBIC_GAMMA,
    figure_engine  = "qgraph::qgraph",
    observed_edges = observed_edges,
    possible_edges = possible_edges,
    network_density = observed_edges / possible_edges,
    mean_abs_edge_weight = mean_abs_edge_weight,
    strongest_edge = strongest_edge,
    strongest_edge_weight = strongest_edge_weight,
    mean_predictability_r_squared = mean(r2),
    stringsAsFactors = FALSE
  )
  for (s in CS_STATISTICS) {
    row[[CS_COLUMNS[[s]]]] <- cs_values[[s]]
    row[[paste0(CS_COLUMNS[[s]], "_interpretation")]] <-
      cs_interpretation(cs_values[[s]])
  }
  row$cs_correlation_threshold <- CS_CORRELATION_THRESHOLD
  row$cs_acceptable_threshold  <- CS_ACCEPTABLE_THRESHOLD
  row$cs_desirable_threshold   <- CS_DESIRABLE_THRESHOLD
  row$cs_bootstrap_replicates  <- CS_BOOTSTRAP_REPLICATES
  row$cs_bootstrap_cores       <- CS_BOOTSTRAP_CORES
  row
}

summary_with_cs <- do.call(rbind, lapply(seq_len(nrow(ANALYSIS_GROUPS)),
  function(i) summarise_group(ANALYSIS_GROUPS[i, ])))

csv_path  <- file.path(OUT_DIR, "20260820_summary_with_cs_coefficients.csv")
xlsx_path <- file.path(OUT_DIR, "20260820_summary_with_cs_coefficients.xlsx")
utf8_bom <- file(csv_path, open = "wb")
writeBin(as.raw(c(0xEF, 0xBB, 0xBF)), utf8_bom)   # UTF-8 BOM so Excel reads the Chinese labels
close(utf8_bom)
suppressWarnings(write.table(summary_with_cs, csv_path, append = TRUE,
                             sep = ",", row.names = FALSE, qmethod = "double",
                             fileEncoding = "UTF-8"))
write_xlsx(list(summary_with_cs = summary_with_cs), xlsx_path)

cat("\nWritten:\n  ", csv_path, "\n  ", xlsx_path, "\n", sep = "")
print(summary_with_cs[, c("gender_filter", "n_complete", "observed_edges",
                          "cs_strength", "cs_bridge_strength",
                          "cs_bridge_closeness", "cs_bridge_betweenness")])
