#!/usr/bin/env Rscript

script_args <- commandArgs(trailingOnly = FALSE)
script_path <- normalizePath(sub("^--file=", "", script_args[grep("^--file=", script_args)][[1]]), mustWork = TRUE)
repository_root <- normalizePath(file.path(dirname(script_path), "..", "..", ".."), mustWork = TRUE)
source(file.path(repository_root, "analysis", "open-sna", "analyze.R"))

expect_error_code <- function(expression, expected_code) {
  error <- tryCatch(
    {
      force(expression)
      NULL
    },
    error = function(condition) condition
  )
  stopifnot(inherits(error, "open_sna_error"))
  stopifnot(identical(error$code, expected_code))
}

validation_only_available <- function(package) package %in% validation_required_packages
missing_digest_available <- function(package) package != "digest"
input_path <- file.path(repository_root, "tests", "fixtures", "open-sna-empty-network-80x40.xlsx")
output_path <- tempfile("open-sna-validation-runtime-isolation-", fileext = ".json")
on.exit(unlink(output_path), add = TRUE)

assert_packages(validation_required_packages, availability = validation_only_available)
expect_error_code(
  assert_packages(validation_required_packages, availability = missing_digest_available),
  "R_RUNTIME_NOT_READY"
)
expect_error_code(
  assert_packages(full_analysis_required_packages, availability = validation_only_available),
  "R_RUNTIME_NOT_READY"
)

validation_result <- validate_workbook(
  input_path,
  output_path,
  availability = validation_only_available
)
stopifnot(identical(validation_result$schemaVersion, "1.0"))
stopifnot(identical(validation_result$valid, TRUE))
stopifnot(file.exists(output_path))

expect_error_code(
  validate_workbook(
    file.path(repository_root, "tests", "fixtures", "missing-workbook.xlsx"),
    tempfile("open-sna-invalid-workbook-runtime-isolation-", fileext = ".json"),
    availability = validation_only_available
  ),
  "WORKBOOK_INVALID"
)

expect_error_code(
  analyze_workbook(
    input_path,
    tempfile("open-sna-analysis-runtime-isolation-", fileext = ".json"),
    availability = validation_only_available
  ),
  "R_RUNTIME_NOT_READY"
)

cat("validation-runtime-isolation-regression: PASS\n")
