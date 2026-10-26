#!/usr/bin/env Rscript
script_args <- commandArgs(trailingOnly = FALSE)
script_path <- normalizePath(sub("^--file=", "", script_args[grep("^--file=", script_args)][[1]]), mustWork = TRUE)
repository_root <- normalizePath(file.path(dirname(script_path), "..", "..", ".."), mustWork = TRUE)
source(file.path(repository_root, "analysis", "open-sna", "analyze.R"))

expect_error <- function(expression) {
  error <- tryCatch({ force(expression); NULL }, error = identity)
  stopifnot(inherits(error, "error"))
}

# Interpretation regressions use aggregate synthetic metrics only.
nodes <- data.frame(id = paste0("Q", 1:6), strength = rep(0, 6), bridgeStrength = rep(0, 6), predictability = rep(0, 6))
stopifnot(is.null(top_node(nodes, "strength")))
nodes$strength <- c(1, 1, 0, 0, 0, 0)
stopifnot(is.null(top_node(nodes, "strength")))
nodes$strength <- c(2, 1, 0, 0, 0, 0)
stopifnot(top_node(nodes, "strength")$node == "Q1")
nodes$predictability <- NA_real_
stopifnot(is.null(top_node(nodes, "predictability")))
nodes$predictability <- c(0.8, NA_real_, 0.2, 0.1, 0, 0)
stopifnot(is.null(top_node(nodes, "predictability")))
overview <- list(edgeCount = 0L, possibleEdges = 15L, density = 0)
comparison <- list(networkStructurePValue = 1)
stability <- list(metrics = data.frame(id = c("strength", "bridgeStrength"), coefficient = c(0.1, 0.5)))
insights <- build_interpretation(overview, nodes, comparison, stability, character())$insights
strength_text <- insights[[which(vapply(insights, function(x) x$id == "central-node", logical(1)))]]$text
stopifnot(!grepl("Q1", strength_text), !grepl("has the highest", strength_text))
stopifnot(any(vapply(insights, function(x) x$id == "bridge-node-limited", logical(1))))

stopifnot(exists("inspect_workbook", mode = "function"), exists("validate_selection", mode = "function"))
fixture <- file.path(repository_root, "tests", "fixtures", "open-sna-empty-network-80x40.xlsx")
raw <- as.data.frame(readxl::read_excel(fixture))[, c("AA1", "AA2", "AA3", "BB1", "BB2", "BB3", "Gender")]
names(raw) <- c("題目一", "Item two", "Question (3)", "Fourth / item", "Fifth item", "六", "組別")
raw$unused <- c(NA, rep("unused private metadata", 79))
selection <- list(items = lapply(1:6, function(index) list(
  column = names(raw)[[index]], id = paste0("Q", index), community = if (index <= 3) "First" else "Second", reverse = index == 1
)), groupColumn = "組別")

# Minimal synthetic XLSX writer: no added analysis dependency and no user data.
write_synthetic_xlsx <- function(data, destination) {
  directory <- tempfile("open-sna-synthetic-xlsx-"); dir.create(directory)
  on.exit(unlink(directory, recursive = TRUE), add = TRUE)
  dir.create(file.path(directory, "_rels")); dir.create(file.path(directory, "xl")); dir.create(file.path(directory, "xl", "_rels")); dir.create(file.path(directory, "xl", "worksheets"))
  writeLines('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>', file.path(directory, "[Content_Types].xml"))
  writeLines('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>', file.path(directory, "_rels", ".rels"))
  writeLines('<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Synthetic" sheetId="1" r:id="rId1"/></sheets></workbook>', file.path(directory, "xl", "workbook.xml"))
  writeLines('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>', file.path(directory, "xl", "_rels", "workbook.xml.rels"))
  xml <- function(x) gsub('"', '&quot;', gsub('<', '&lt;', gsub('&', '&amp;', as.character(x), fixed = TRUE), fixed = TRUE), fixed = TRUE)
  rows <- lapply(0:nrow(data), function(row) {
    cells <- vapply(seq_len(ncol(data)), function(column) {
      value <- if (row == 0) names(data)[[column]] else data[[column]][[row]]
      if (is.na(value)) return("")
      reference <- paste0(LETTERS[[column]], row + 1L)
      if (row > 0 && is.numeric(value)) paste0('<c r="', reference, '"><v>', value, '</v></c>') else paste0('<c r="', reference, '" t="inlineStr"><is><t>', xml(value), '</t></is></c>')
    }, character(1))
    paste0('<row r="', row + 1L, '">', paste(cells, collapse = ''), '</row>')
  })
  writeLines(paste0('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>', paste(rows, collapse = ''), '</sheetData></worksheet>'), file.path(directory, "xl", "worksheets", "sheet1.xml"))
  original_directory <- getwd(); on.exit(setwd(original_directory), add = TRUE); setwd(directory)
  utils::zip(destination, c("[Content_Types].xml", "_rels/.rels", "xl/workbook.xml", "xl/_rels/workbook.xml.rels", "xl/worksheets/sheet1.xml"), flags = "-q")
}

input <- tempfile(fileext = ".xlsx"); invalid_input <- tempfile(fileext = ".xlsx")
output <- tempfile(fileext = ".json"); selection_file <- tempfile(fileext = ".json")
on.exit(unlink(c(input, invalid_input, output, selection_file)), add = TRUE)
write_synthetic_xlsx(raw, input)
jsonlite::write_json(selection, selection_file, auto_unbox = TRUE)
inspection <- inspect_workbook(input, output, availability = function(package) package %in% validation_required_packages)
stopifnot(identical(sort(names(inspection)), sort(c("schemaVersion", "inputFingerprint", "originalRows", "columns", "suggestedSelection"))))
stopifnot(inspection$originalRows == 80L, length(inspection$columns) == 8L, is.null(inspection$suggestedSelection))
stopifnot(all(vapply(inspection$columns[1:6], function(x) x$eligibleItem, logical(1))))
stopifnot(inspection$columns[[7]]$eligibleGroup, inspection$columns[[8]]$missingCount == 1L)

prepared <- validated_workbook(input, selection = selection)
stopifnot(identical(names(prepared$items), paste0("Q", 1:6)))
stopifnot(identical(prepared$items$Q1, 6 - raw[[1]]))
stopifnot(identical(unname(prepared$communities), rep(c("First", "Second"), each = 3)))
stopifnot(prepared$group_column == "組別", prepared$dropped_rows == 0)
validation <- validate_workbook(input, output, selection = selection)
stopifnot(validation$schemaVersion == "1.1", identical(validation$selection, selection))
stopifnot(validation$inputFingerprint == inspection$inputFingerprint)
stopifnot(validation$summary$itemCount == 6L, validation$summary$communityCount == 2L)

for (bad in list(
  within(selection, items[[1]]$id <- "bad,id"),
  within(selection, items[[1]]$column <- items[[2]]$column),
  within(selection, items[[1]]$community <- "Second"),
  within(selection, groupColumn <- items[[1]]$column),
  within(selection, items[[1]]$reverse <- "true")
)) expect_error(validated_workbook(input, selection = bad))
invalid <- raw; invalid[[1]][1] <- 6; write_synthetic_xlsx(invalid, invalid_input)
expect_error(validated_workbook(invalid_input, selection = selection))
invalid <- raw; invalid[[1]][1:21] <- NA; write_synthetic_xlsx(invalid, invalid_input)
expect_error(validated_workbook(invalid_input, selection = selection))

expect_error(validated_cli_options(c("--mode", "inspect", "--input", input, "--output", output, "--selection", selection_file)))
calls <- list()
main(c("--mode", "validate", "--input", input, "--output", output, "--selection", selection_file), validate_runner = function(...) calls[[1]] <<- list(...))
stopifnot(identical(calls[[1]]$selection, selection))
main(c("--mode", "inspect", "--input", input, "--output", output), inspect_runner = function(...) calls[[2]] <<- list(...))
stopifnot(identical(calls[[2]]$input_path, input))

result <- analyze_workbook(input, output, selection = selection)
stopifnot(result$schemaVersion == "1.2", identical(result$source$selection, selection))
stopifnot(result$inputFingerprint == validation$inputFingerprint)
stopifnot(nrow(result$subgroupComparison$edgeDifferences) == choose(6, 2))
stopifnot(nrow(result$subgroupComparison$strongestEdgeDifferences) == 8L)
program <- paste("import { readFileSync } from 'node:fs';", "import { isOpenSnaResult } from './lib/open-sna.ts';", "if (!isOpenSnaResult(JSON.parse(readFileSync(process.argv[1], 'utf8')))) process.exit(1);")
stopifnot(system2(file.path(repository_root, "node_modules", ".bin", "tsx"), c("-e", shQuote(program), output)) == 0L)
cat("researcher-workflow-regression: PASS\n")
