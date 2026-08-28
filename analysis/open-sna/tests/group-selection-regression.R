#!/usr/bin/env Rscript

script_args <- commandArgs(trailingOnly = FALSE)
script_path <- normalizePath(sub("^--file=", "", script_args[grep("^--file=", script_args)][[1]]), mustWork = TRUE)
source(file.path(dirname(script_path), "..", "analyze.R"))

expect_error <- function(expr) {
  errored <- FALSE
  tryCatch(force(expr), error = function(error) errored <<- TRUE)
  stopifnot(errored)
}

metadata <- data.frame(
  First = c(rep("<unsafe>", 20), rep("", 20)),
  Cohort = rep(c("A", "B"), 20),
  stringsAsFactors = FALSE,
  check.names = FALSE
)
complete <- rep(TRUE, 40)
stopifnot(select_group_column(metadata, complete)$column == "Cohort")

metadata$First <- c(rep("A", 19), rep("B", 19), "", "")
stopifnot(select_group_column(metadata, complete)$column == "Cohort")

metadata$First <- c(rep("A", 19), rep("B", 19), "", "")
stopifnot(select_group_column(metadata, complete)$column == "Cohort")

metadata_excluded <- data.frame(
  First = c(rep("A", 20), rep("B", 20), "<raw-extra>"),
  Cohort = c(rep(c("A", "B"), 20), "A"),
  stringsAsFactors = FALSE,
  check.names = FALSE
)
excluded <- c(rep(TRUE, 40), FALSE)
stopifnot(select_group_column(metadata_excluded, excluded)$column == "First")

gender_metadata <- data.frame(Gender = rep(c("<bad>", "also bad"), 20), Cohort = rep(c("A", "B"), 20), stringsAsFactors = FALSE)
expect_error(select_group_column(gender_metadata, complete, gender_column = "Gender"))
gender_metadata$Gender <- rep(c("Male", "Female"), 20)
stopifnot(select_group_column(gender_metadata, complete, gender_column = "Gender")$column == "Gender")

cat("group-selection-regression: PASS\n")
