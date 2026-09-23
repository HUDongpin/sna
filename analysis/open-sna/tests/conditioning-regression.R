#!/usr/bin/env Rscript

script_args <- commandArgs(trailingOnly = FALSE)
script_path <- normalizePath(sub("^--file=", "", script_args[grep("^--file=", script_args)][[1]]), mustWork = TRUE)
repository_root <- normalizePath(file.path(dirname(script_path), "..", "..", ".."), mustWork = TRUE)
source(file.path(repository_root, "analysis", "open-sna", "analyze.R"))

expect_error <- function(expression) {
  errored <- FALSE
  tryCatch(force(expression), error = function(error) errored <<- TRUE)
  stopifnot(errored)
}

stopifnot(identical(NPN_EBICGLASSO_CONDITIONING_FLOOR_V1, 1e-4))

well_conditioned_correlation <- matrix(
  c(
    1, 0.20, 0.10, 0.05,
    0.20, 1, 0.15, 0.05,
    0.10, 0.15, 1, 0.10,
    0.05, 0.05, 0.10, 1
  ),
  nrow = 4L,
  byrow = TRUE,
  dimnames = list(paste0("V", 1:4), paste0("V", 1:4))
)
stopifnot(min(eigen(well_conditioned_correlation, symmetric = TRUE, only.values = TRUE)$values) > NPN_EBICGLASSO_CONDITIONING_FLOOR_V1)
stopifnot(identical(
  stabilize_npn_correlation(well_conditioned_correlation),
  well_conditioned_correlation
))

singular_data <- cbind(
  V1 = seq(-2, 2, length.out = 80L),
  V2 = seq(-2, 2, length.out = 80L),
  V3 = sin(seq(-2, 2, length.out = 80L)),
  V4 = cos(seq(-2, 2, length.out = 80L))
)
singular_correlation <- stats::cor(singular_data)
conditioned_correlation <- stabilize_npn_correlation(singular_correlation)
stopifnot(isTRUE(all.equal(conditioned_correlation, t(conditioned_correlation), tolerance = 0)))
stopifnot(all(is.finite(conditioned_correlation)))
stopifnot(isTRUE(all.equal(unname(diag(conditioned_correlation)), rep(1, ncol(conditioned_correlation)), tolerance = 0)))
stopifnot(min(eigen(conditioned_correlation, symmetric = TRUE, only.values = TRUE)$values) > 0)
stopifnot(identical(rownames(conditioned_correlation), colnames(singular_correlation)))
stopifnot(identical(colnames(conditioned_correlation), colnames(singular_correlation)))

non_finite_correlation <- singular_correlation
non_finite_correlation[1L, 1L] <- NA_real_
expect_error(stabilize_npn_correlation(non_finite_correlation))
non_finite_data <- singular_data
non_finite_data[1L, 1L] <- Inf
expect_error(npn_ebicglasso_estimate(non_finite_data, gamma = 0.5))

set.seed(2026L)
well_conditioned_data <- matrix(stats::rnorm(80L * 6L), ncol = 6L)
colnames(well_conditioned_data) <- paste0("Q", 1:6)
pooled <- npn_ebicglasso_estimate(well_conditioned_data, gamma = 0.5)
nct_weights <- nct_npn_ebicglasso_estimator(well_conditioned_data, gamma = 0.5)
stopifnot(identical(pooled$weights, nct_weights))

weights_1e4 <- suppressWarnings(suppressMessages(qgraph::EBICglasso(
  stabilize_npn_correlation(singular_correlation, NPN_EBICGLASSO_CONDITIONING_FLOOR_V1),
  n = nrow(singular_data),
  gamma = 0.5
)))
weights_1e6 <- suppressWarnings(suppressMessages(qgraph::EBICglasso(
  stabilize_npn_correlation(singular_correlation, 1e-6),
  n = nrow(singular_data),
  gamma = 0.5
)))
sensitivity_max_correlation_delta <- max(abs(
  stabilize_npn_correlation(singular_correlation, NPN_EBICGLASSO_CONDITIONING_FLOOR_V1) -
    stabilize_npn_correlation(singular_correlation, 1e-6)
))
sensitivity_max_weight_delta <- max(abs(weights_1e4 - weights_1e6))
sensitivity_topology_equal <- identical(weights_1e4 != 0, weights_1e6 != 0)
stopifnot(is.finite(sensitivity_max_correlation_delta), is.finite(sensitivity_max_weight_delta))
stopifnot(sensitivity_topology_equal)
stopifnot(sensitivity_max_correlation_delta <= 1.1e-4)
stopifnot(sensitivity_max_weight_delta <= 0.002)
cat(sprintf(
  "conditioning-sensitivity: floor_1e-4_vs_1e-6 maxCorrelationDelta=%.10f maxWeightDelta=%.10f topologyEqual=%s\n",
  sensitivity_max_correlation_delta,
  sensitivity_max_weight_delta,
  sensitivity_topology_equal
))

cyclic_duplicate_items <- as.data.frame(
  lapply(0:15, function(column) ((seq_len(50L) - 1L + column) %% 5L) + 1L),
  stringsAsFactors = FALSE,
  optional = TRUE
)
names(cyclic_duplicate_items) <- c(
  paste0("Cmt", 1:4),
  paste0("Cnf", 1:4),
  paste0("Cop", 1:4),
  paste0("Cmp", 1:4)
)
stopifnot(length(unique(lapply(cyclic_duplicate_items, identity))) == 5L)

cyclic_transformed <- huge::huge.npn(
  as.matrix(cyclic_duplicate_items),
  npn.func = "shrinkage",
  verbose = FALSE
)
cyclic_raw_correlation <- stats::cor(cyclic_transformed)
stopifnot(min(eigen(cyclic_raw_correlation, symmetric = TRUE, only.values = TRUE)$values) <= 0)

unconditioned_ebicglasso_error <- tryCatch(
  suppressWarnings(suppressMessages(
    qgraph::EBICglasso(cyclic_raw_correlation, n = nrow(cyclic_duplicate_items), gamma = 0.5)
  )),
  error = function(error) error
)
stopifnot(inherits(unconditioned_ebicglasso_error, "error"))
stopifnot(grepl("positive definite", conditionMessage(unconditioned_ebicglasso_error), ignore.case = TRUE))

cyclic_estimate <- suppressWarnings(suppressMessages(
  npn_ebicglasso_estimate(cyclic_duplicate_items, gamma = 0.5)
))
stopifnot(min(eigen(cyclic_estimate$correlation, symmetric = TRUE, only.values = TRUE)$values) > 0)
stopifnot(identical(
  cyclic_estimate$weights,
  suppressWarnings(suppressMessages(
    nct_npn_ebicglasso_estimator(cyclic_duplicate_items, gamma = 0.5)
  ))
))

default_bootnet_error <- tryCatch(
  suppressWarnings(suppressMessages(
    bootnet::estimateNetwork(
      cyclic_duplicate_items,
      default = "EBICglasso",
      corMethod = "npn",
      tuning = 0.5,
      verbose = FALSE
    )
  )),
  error = function(error) error
)
stopifnot(inherits(default_bootnet_error, "error"))
stopifnot(grepl("positive definite", conditionMessage(default_bootnet_error), ignore.case = TRUE))

conditioned_bootnet <- suppressWarnings(suppressMessages(
  bootnet::estimateNetwork(
    cyclic_duplicate_items,
    default = "none",
    fun = nct_npn_ebicglasso_estimator,
    gamma = 0.5,
    verbose = FALSE
  )
))
stopifnot(isTRUE(all.equal(conditioned_bootnet$graph, cyclic_estimate$weights, tolerance = 1e-8, check.attributes = TRUE)))
stopifnot(identical(conditioned_bootnet$estimator, nct_npn_ebicglasso_estimator))
stopifnot(isTRUE(all.equal(conditioned_bootnet$arguments$gamma, 0.5)))

named_non_finite_weights <- matrix(
  c(0, NA_real_, NA_real_, 0),
  nrow = 2L,
  dimnames = list(c("V1", "V2"), c("V1", "V2"))
)
expect_error(is_empty_network(named_non_finite_weights))
expect_error(is_empty_network(matrix(c(0, 0, 0, 0), nrow = 2L)))
expect_error(extract_metric(c(V1 = 1, V2 = 2), c("V1", "V3")))

cat("conditioning-regression: PASS\n")
