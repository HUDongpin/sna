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

assert_exact_keys <- function(value, expected) {
  stopifnot(is.list(value))
  stopifnot(identical(sort(names(value)), sort(expected)))
}

emitted <- jsonlite::read_json(output_path, simplifyVector = FALSE)
assert_exact_keys(emitted, c("schemaVersion", "valid", "inputFingerprint", "summary"))
stopifnot(identical(emitted$schemaVersion, "1.0"))
stopifnot(identical(emitted$valid, TRUE))
stopifnot(identical(emitted$inputFingerprint, paste0("sha256:", digest::digest(file = input_path, algo = "sha256"))))
assert_exact_keys(emitted$summary, c("originalRows", "analyzedRows", "droppedRows", "itemCount", "communityCount", "groupColumn", "groupCounts"))
stopifnot(emitted$summary$originalRows == emitted$summary$analyzedRows + emitted$summary$droppedRows)
stopifnot(emitted$summary$originalRows <= 5000L)
stopifnot(emitted$summary$analyzedRows >= 40L)
stopifnot(emitted$summary$itemCount >= 6L && emitted$summary$itemCount <= 40L)
stopifnot(emitted$summary$communityCount >= 2L && emitted$summary$communityCount <= 8L)
stopifnot(emitted$summary$itemCount >= emitted$summary$communityCount * 3L)
stopifnot(emitted$summary$itemCount <= emitted$summary$communityCount * 12L)
stopifnot(length(emitted$summary$groupCounts) == 2L)
for (group_count in emitted$summary$groupCounts) {
  assert_exact_keys(group_count, c("group", "n"))
  stopifnot(group_count$n >= 20L)
}
stopifnot(emitted$summary$groupCounts[[1]]$group != emitted$summary$groupCounts[[2]]$group)
stopifnot(sum(vapply(emitted$summary$groupCounts, `[[`, numeric(1), "n")) == emitted$summary$analyzedRows)

typescript_assertion <- system2(
  file.path(repository_root, "node_modules", ".bin", "tsx"),
  c(file.path(repository_root, "tests", "assert-open-sna-validation-json.mts"), output_path, input_path),
  stdout = TRUE,
  stderr = TRUE
)
stopifnot(identical(attr(typescript_assertion, "status"), NULL))
stopifnot(identical(trimws(typescript_assertion), "PASS"))

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
