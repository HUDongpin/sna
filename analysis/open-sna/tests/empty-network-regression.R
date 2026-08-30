#!/usr/bin/env Rscript

script_args <- commandArgs(trailingOnly = FALSE)
script_path <- normalizePath(sub("^--file=", "", script_args[grep("^--file=", script_args)][[1]]), mustWork = TRUE)
repository_root <- normalizePath(file.path(dirname(script_path), "..", "..", ".."), mustWork = TRUE)
source(file.path(repository_root, "analysis", "open-sna", "analyze.R"))

fixture <- file.path(repository_root, "tests", "fixtures", "open-sna-empty-network-80x40.xlsx")
expected_fixture_sha256 <- "57790fb1da4dde5becfb749057ba0b742958a365537cd8ead1cbd4e2f0e469e3"
sha_command <- if (nzchar(Sys.which("sha256sum"))) "sha256sum" else "shasum"
sha_arguments <- if (identical(sha_command, "sha256sum")) fixture else c("-a", "256", fixture)
actual_fixture_sha256 <- strsplit(system2(sha_command, sha_arguments, stdout = TRUE), "[[:space:]]+")[[1]][[1]]
stopifnot(file.exists(fixture))
stopifnot(identical(actual_fixture_sha256, expected_fixture_sha256))

expect_number <- function(actual, expected) {
  stopifnot(is.numeric(actual), length(actual) == 1L, !is.na(actual), actual == expected)
}

expect_approximately <- function(actual, expected, tolerance = 1e-6) {
  stopifnot(is.numeric(actual), length(actual) == 1L, !is.na(actual), abs(actual - expected) <= tolerance)
}

run_analysis <- function() {
  output_path <- tempfile(fileext = ".json")
  analyze_workbook(
    input_path = fixture,
    output_path = output_path,
    bootstraps = 100L,
    permutations = 1000L,
    seed = 2026L
  )
  list(
    output_path = output_path,
    result = jsonlite::read_json(output_path, simplifyVector = FALSE)
  )
}

verify_typescript_contract <- function(output_path) {
  contract_program <- paste(
    "import { readFileSync } from 'node:fs';",
    "import { isOpenSnaResult } from './lib/open-sna.ts';",
    "const result = JSON.parse(readFileSync(process.argv[1], 'utf8'));",
    "if (!isOpenSnaResult(result)) process.exit(1);"
  )
  status <- system2(
    file.path(repository_root, "node_modules", ".bin", "tsx"),
    c("-e", shQuote(contract_program), output_path)
  )
  stopifnot(identical(status, 0L))
}

first_run <- run_analysis()
verify_typescript_contract(first_run$output_path)
second_run <- run_analysis()
first <- first_run$result
second <- second_run$result

stopifnot(identical(first$schemaVersion, "1.1"))
stopifnot(identical(first$analysisProfile, "npn-ebicglasso-v1"))
stopifnot(identical(first$settings$correlationMethod, NPN_EBICGLASSO_CORRELATION_METHOD_V1))
stopifnot(identical(first$models$network$method, NPN_EBICGLASSO_NETWORK_METHOD_V1))
expect_number(first$source$originalRows, 80)
expect_number(first$source$analyzedRows, 80)
stopifnot(identical(first$source$groupColumn, "Gender"))
stopifnot(identical(first$source$groupCounts, list(
  list(group = "1", n = 40L),
  list(group = "2", n = 40L)
)))
expected_item_order <- unname(unlist(lapply(c("AA", "BB", "CC", "DD"), function(prefix) paste0(prefix, 1:10))))
stopifnot(identical(unlist(first$source$itemColumns, use.names = FALSE), expected_item_order))
expect_number(length(first$nodes), 40)
stopifnot(identical(vapply(first$nodes, `[[`, character(1), "id"), expected_item_order))
expect_number(length(first$edges), 0)
expect_number(first$overview$nodeCount, 40)
expect_number(first$overview$edgeCount, 0)
expect_number(first$overview$density, 0)
expect_number(first$overview$meanAbsoluteEdgeWeight, 0)
stopifnot(is.finite(first$overview$meanPredictability), first$overview$meanPredictability >= 0, first$overview$meanPredictability <= 1)
expect_number(first$overview$meanPredictability, 0)
stopifnot(is.null(first$overview$strongestEdge))

expected_node_anchors <- list(
  list(id = "AA1", x = 0.92, y = 0.5, predictability = 0),
  list(id = "AA2", x = 0.914829, y = 0.565702, predictability = 0),
  list(id = "AA3", x = 0.899444, y = 0.629787, predictability = 0),
  list(id = "AA4", x = 0.874223, y = 0.690676, predictability = 0)
)
for (index in seq_along(expected_node_anchors)) {
  anchor <- expected_node_anchors[[index]]
  node <- first$nodes[[index]]
  stopifnot(identical(node$id, anchor$id))
  expect_approximately(node$x, anchor$x)
  expect_approximately(node$y, anchor$y)
  expect_number(node$predictability, anchor$predictability)
}

for (node in first$nodes) {
  stopifnot(is.finite(node$x), node$x >= 0, node$x <= 1)
  stopifnot(is.finite(node$y), node$y >= 0, node$y <= 1)
  expect_number(node$strength, 0)
  expect_number(node$expectedInfluence, 0)
  expect_number(node$betweenness, 0)
  stopifnot(is.null(node$closeness))
  expect_number(node$bridgeStrength, 0)
  expect_number(node$bridgeExpectedInfluence, 0)
  expect_number(node$bridgeBetweenness, 0)
  stopifnot(is.null(node$bridgeCloseness))
  stopifnot(is.finite(node$predictability), node$predictability >= 0, node$predictability <= 1)
}

stopifnot(isTRUE(first$subgroupComparison$available))
stopifnot(identical(
  first$subgroupComparison$method,
  NPN_EBICGLASSO_NCT_METHOD_V1
))
expect_number(first$subgroupComparison$permutations, 1000)
expect_number(first$subgroupComparison$nA, 40)
expect_number(first$subgroupComparison$nB, 40)
expect_number(first$subgroupComparison$globalStrengthA, 0)
expect_number(first$subgroupComparison$globalStrengthB, 0)
expect_number(first$subgroupComparison$globalStrengthDifference, 0)
expect_number(first$subgroupComparison$networkStructureDifference, 0)
expect_number(first$subgroupComparison$globalStrengthPValue, 1)
expect_number(first$subgroupComparison$networkStructurePValue, 1)
expect_number(length(first$subgroupComparison$strongestEdgeDifferences), 8)
expected_edge_difference_anchors <- list(
  list(source = "AA1", target = "AA10"),
  list(source = "AA1", target = "AA2"),
  list(source = "AA1", target = "AA3")
)
for (index in seq_along(expected_edge_difference_anchors)) {
  anchor <- expected_edge_difference_anchors[[index]]
  edge <- first$subgroupComparison$strongestEdgeDifferences[[index]]
  stopifnot(identical(edge$source, anchor$source), identical(edge$target, anchor$target))
}
for (edge in first$subgroupComparison$strongestEdgeDifferences) {
  expect_number(edge$absoluteDifference, 0)
  expect_number(edge$pValueHolm, 1)
}
expect_number(length(first$stability$metrics), 4)
stopifnot(identical(
  vapply(first$stability$metrics, `[[`, character(1), "id"),
  c("strength", "bridgeStrength", "bridgeCloseness", "bridgeBetweenness")
))
for (metric in first$stability$metrics) {
  stopifnot(is.null(metric$coefficient))
  stopifnot(identical(metric$interpretation, "Not available"))
}
stopifnot(identical(first$privacy$rawRowsIncluded, FALSE))
stopifnot(identical(first$privacy$uploadedWorkbookRetainedByEngine, FALSE))
stopifnot(identical(first$privacy$thirdPartyAiUsed, FALSE))
stopifnot(identical(
  first$warnings,
  list("The estimated network contains no nonzero edges; case-dropping centrality stability is not available.")
))

first$generatedAt <- NULL
second$generatedAt <- NULL
stopifnot(identical(first, second))

cat("empty-network-regression: PASS\n")
