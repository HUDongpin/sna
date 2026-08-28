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

run_analysis <- function() {
  output_path <- tempfile(fileext = ".json")
  analyze_workbook(
    input_path = fixture,
    output_path = output_path,
    bootstraps = 100L,
    permutations = 1000L,
    seed = 2026L
  )
  jsonlite::read_json(output_path, simplifyVector = FALSE)
}

first <- run_analysis()
second <- run_analysis()

stopifnot(identical(first$schemaVersion, "1.1"))
expect_number(first$source$originalRows, 80)
expect_number(first$source$analyzedRows, 80)
expect_number(length(first$nodes), 40)
expect_number(length(first$edges), 0)
expect_number(first$overview$nodeCount, 40)
expect_number(first$overview$edgeCount, 0)
expect_number(first$overview$density, 0)
stopifnot(is.null(first$overview$strongestEdge))

for (node in first$nodes) {
  expect_number(node$strength, 0)
  expect_number(node$expectedInfluence, 0)
  expect_number(node$betweenness, 0)
  stopifnot(is.null(node$closeness))
  expect_number(node$bridgeStrength, 0)
  expect_number(node$bridgeExpectedInfluence, 0)
  expect_number(node$bridgeBetweenness, 0)
  stopifnot(is.null(node$bridgeCloseness))
}

stopifnot(isTRUE(first$subgroupComparison$available))
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
stopifnot(any(vapply(
  first$warnings,
  identical,
  logical(1),
  "The estimated network contains no nonzero edges; case-dropping centrality stability is not available."
)))

first$generatedAt <- NULL
second$generatedAt <- NULL
stopifnot(identical(first, second))

cat("empty-network-regression: PASS\n")
