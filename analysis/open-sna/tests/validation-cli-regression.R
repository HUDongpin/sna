#!/usr/bin/env Rscript

script_args <- commandArgs(trailingOnly = FALSE)
script_path <- normalizePath(sub("^--file=", "", script_args[grep("^--file=", script_args)][[1]]), mustWork = TRUE)
repository_root <- normalizePath(file.path(dirname(script_path), "..", "..", ".."), mustWork = TRUE)
source(file.path(repository_root, "analysis", "open-sna", "analyze.R"))

expect_cli_failure <- function(arguments) {
  calls <- 0L
  fake_runner <- function(...) calls <<- calls + 1L
  error <- tryCatch(
    {
      main(arguments, validate_runner = fake_runner, analyze_runner = fake_runner)
      NULL
    },
    error = function(condition) condition
  )
  stopifnot(inherits(error, "open_sna_error"))
  stopifnot(identical(error$code, "R_ANALYSIS_FAILED"))
  stopifnot(calls == 0L)
}

base_validate <- c("--mode", "validate", "--input", "fixture.xlsx", "--output", "result.json")
expect_cli_failure(c("--mdoe", "validate", "--input", "fixture.xlsx", "--output", "result.json"))
expect_cli_failure(c("--mode", "validate", "--mode", "validate", "--input", "fixture.xlsx", "--output", "result.json"))
expect_cli_failure(c("--mode", "validate", "--input", "fixture.xlsx", "--output"))
expect_cli_failure(c("--mode", "unsupported", "--input", "fixture.xlsx", "--output", "result.json"))
expect_cli_failure(c(base_validate, "--bootstraps", "100"))
expect_cli_failure(c(base_validate, "--permutations", "1000"))
expect_cli_failure(c(base_validate, "--seed", "2026"))
expect_cli_failure(c(base_validate, "--data-source", "uploaded-workbook"))
expect_cli_failure(c("--input", "fixture.xlsx", "--output", "result.json", "--bootstraps", "100.5"))
expect_cli_failure(c("--input", "fixture.xlsx", "--output", "result.json", "--bootstraps", "+100"))
expect_cli_failure(c("--input", "fixture.xlsx", "--output", "result.json", "--bootstraps", " 100"))
expect_cli_failure(c("--input", "fixture.xlsx", "--output", "result.json", "--bootstraps", "100x"))
expect_cli_failure(c("--input", "fixture.xlsx", "--output", "result.json", "--seed", "999999999999999999999999"))

calls <- list()
main(
  base_validate,
  validate_runner = function(...) calls[[length(calls) + 1L]] <<- list(...),
  analyze_runner = function(...) stop("validate mode must not call full analysis")
)
stopifnot(length(calls) == 1L)
stopifnot(identical(calls[[1]]$input_path, "fixture.xlsx"))
stopifnot(identical(calls[[1]]$output_path, "result.json"))

calls <- list()
main(
  c("--input", "fixture.xlsx", "--output", "result.json"),
  validate_runner = function(...) stop("default mode must not call validation"),
  analyze_runner = function(...) calls[[length(calls) + 1L]] <<- list(...)
)
stopifnot(length(calls) == 1L)
stopifnot(identical(calls[[1]]$bootstraps, 100L))
stopifnot(identical(calls[[1]]$permutations, 1000L))
stopifnot(identical(calls[[1]]$seed, 2026L))

cat("validation-cli-regression: PASS\n")
