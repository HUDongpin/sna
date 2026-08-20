#!/usr/bin/env Rscript

required_versions <- c(
  jsonlite = "2.0.0",
  readxl = "1.4.5",
  qgraph = "1.9.8",
  huge = "1.5",
  mgm = "1.2.15",
  bootnet = "1.8",
  networktools = "1.6.0",
  NetworkComparisonTest = "2.2.3"
)

failures <- character()
for (package in names(required_versions)) {
  if (!requireNamespace(package, quietly = TRUE)) {
    failures <- c(failures, paste0(package, " is not installed"))
    next
  }
  installed <- utils::packageVersion(package)
  required <- package_version(required_versions[[package]])
  if (installed != required) {
    failures <- c(
      failures,
      paste0(package, " ", installed, " does not match verified version ", required)
    )
  }
}

if (getRversion() != package_version("4.4.2")) {
  failures <- c(failures, paste0("R ", getRversion(), " does not match verified version 4.4.2"))
}

if (length(failures)) {
  message("Open SNA R preflight failed:")
  for (failure in failures) message("- ", failure)
  quit(save = "no", status = 1L)
}

cat("Open SNA R preflight PASS\n")
cat("R: ", R.version.string, "\n", sep = "")
for (package in names(required_versions)) {
  cat(package, ": ", as.character(utils::packageVersion(package)), "\n", sep = "")
}
