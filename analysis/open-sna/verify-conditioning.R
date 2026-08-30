#!/usr/bin/env Rscript

script_args <- commandArgs(trailingOnly = FALSE)
script_file <- grep("^--file=", script_args, value = TRUE)[[1]]
script_path <- normalizePath(sub("^--file=", "", script_file), mustWork = TRUE)
repository_root <- normalizePath(file.path(dirname(script_path), "..", ".."), mustWork = TRUE)
regression_script <- file.path(repository_root, "analysis", "open-sna", "tests", "conditioning-regression.R")
rscript_bin <- Sys.which("Rscript")
if (!nzchar(rscript_bin)) stop("Rscript is not available")
exit_status <- system2(rscript_bin, c("--vanilla", regression_script))
if (!identical(as.integer(exit_status), 0L)) quit(save = "no", status = as.integer(exit_status))
