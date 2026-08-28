#!/usr/bin/env Rscript

# Open SNA analysis engine
#
# This service-oriented script adapts the reproducible Programming Resilience
# research pipeline to one explicit analysis profile. It never installs
# packages, never writes beside the uploaded workbook, and never serializes
# row-level data. All visible results are aggregate network statistics.

local_r_library <- Sys.getenv(
  "OPEN_SNA_R_LIBS_USER",
  unset = file.path(getwd(), "tmp", "r-library")
)
if (dir.exists(local_r_library)) {
  .libPaths(unique(c(normalizePath(local_r_library), .libPaths())))
}

required_packages <- c(
  "jsonlite",
  "readxl",
  "qgraph",
  "huge",
  "mgm",
  "bootnet",
  "networktools",
  "NetworkComparisonTest"
)

NPN_EBICGLASSO_CONDITIONING_FLOOR_V1 <- 1e-4
NPN_EBICGLASSO_CONDITIONING_METHOD_V1 <- "symmetric eigenvalue clipping and unit-diagonal renormalization"
NPN_EBICGLASSO_CORRELATION_METHOD_V1 <- paste0(
  "Nonparanormal transformation followed by Pearson correlation with conditional positive-definite conditioning ",
  "(trigger < 1e-4; ", NPN_EBICGLASSO_CONDITIONING_METHOD_V1, ")"
)
NPN_EBICGLASSO_NETWORK_METHOD_V1 <- paste0(
  "huge.npn plus Pearson correlation, conditional positive-definite conditioning ",
  "(trigger < 1e-4; ", NPN_EBICGLASSO_CONDITIONING_METHOD_V1, "), and qgraph::EBICglasso"
)
NPN_EBICGLASSO_NCT_METHOD_V1 <- paste0(
  "NetworkComparisonTest::NCT permutation test using NPN EBICglasso with conditional positive-definite conditioning ",
  "(trigger < 1e-4; ", NPN_EBICGLASSO_CONDITIONING_METHOD_V1, ")"
)

open_sna_abort <- function(code, ...) {
  condition <- structure(
    list(message = paste0(...), call = NULL, code = code),
    class = c("open_sna_error", "error", "condition")
  )
  stop(condition)
}

assert_packages <- function() {
  missing <- required_packages[
    !vapply(required_packages, requireNamespace, quietly = TRUE, FUN.VALUE = logical(1))
  ]
  if (length(missing)) {
    open_sna_abort(
      "R_RUNTIME_NOT_READY",
      "Open SNA is missing required R packages: ",
      paste(missing, collapse = ", "),
      ". Install the declared runtime before accepting analysis jobs."
    )
  }
}

parse_cli_args <- function(args) {
  output <- list()
  index <- 1L
  while (index <= length(args)) {
    key <- args[[index]]
    if (!startsWith(key, "--")) {
      stop("Unexpected command-line argument: ", key, call. = FALSE)
    }
    if (index == length(args)) {
      stop("Missing value for command-line argument: ", key, call. = FALSE)
    }
    output[[substring(key, 3L)]] <- args[[index + 1L]]
    index <- index + 2L
  }
  output
}

integer_option <- function(value, default, minimum, maximum, label) {
  if (is.null(value) || !nzchar(value)) return(as.integer(default))
  parsed <- suppressWarnings(as.integer(value))
  if (is.na(parsed) || parsed < minimum || parsed > maximum) {
    stop(
      label,
      " must be an integer between ",
      minimum,
      " and ",
      maximum,
      ".",
      call. = FALSE
    )
  }
  parsed
}

finite_or_na <- function(value) {
  value[!is.finite(value)] <- NA_real_
  value
}

round_metric <- function(value, digits = 6L) {
  round(finite_or_na(as.numeric(value)), digits)
}

normalize_coordinate <- function(value) {
  limits <- range(value, finite = TRUE)
  if (!all(is.finite(limits)) || diff(limits) == 0) {
    return(rep(0.5, length(value)))
  }
  0.08 + 0.84 * ((value - limits[[1]]) / diff(limits))
}

community_from_item <- function(items) {
  sub("[0-9]+$", "", items)
}

discover_item_columns <- function(column_names) {
  item_pattern <- "^[A-Za-z]{2,12}[1-9][0-9]?$"
  reserved_prefixes <- c(
    "ID", "NO", "AGE", "YEAR", "SEX", "GENDER", "GROUP", "EXPERIENCE"
  )
  candidates <- grep(item_pattern, column_names, value = TRUE)
  if (length(candidates)) {
    candidates <- candidates[
      !(toupper(community_from_item(candidates)) %in% reserved_prefixes)
    ]
  }
  if (!length(candidates)) {
    stop(
      "No network items were found. Item columns must use an alphabetic construct prefix followed by a number, for example IS1, IS2, CJ1, and CJ2.",
      call. = FALSE
    )
  }

  communities <- community_from_item(candidates)
  community_counts <- table(communities)
  if (
    length(candidates) < 6L ||
      length(candidates) > 40L ||
      length(community_counts) < 2L ||
      length(community_counts) > 8L ||
      any(community_counts < 3L) ||
      any(community_counts > 12L)
  ) {
    stop(
      "Open SNA requires 6 to 40 item columns arranged into 2 to 8 construct-prefix communities, with 3 to 12 items per community.",
      call. = FALSE
    )
  }

  for (community in names(community_counts)) {
    community_items <- candidates[communities == community]
    suffixes <- suppressWarnings(as.integer(sub("^[A-Za-z]{2,12}", "", community_items)))
    if (!identical(sort(suffixes), seq_len(length(suffixes)))) {
      stop(
        "Item suffixes must be consecutive and start at 1 within community ",
        community,
        ".",
        call. = FALSE
      )
    }
  }
  candidates
}

validate_gender_mapping <- function(gender_mapping) {
  if (is.null(gender_mapping)) return(NULL)
  if (
    !identical(sort(names(gender_mapping)), c("1", "2")) ||
      any(!grepl("^[A-Za-z][A-Za-z0-9 _-]{0,39}$", unname(gender_mapping))) ||
      length(unique(unname(gender_mapping))) != 2L
  ) {
    stop(
      "The optional Gender mapping must provide two distinct safe labels for codes 1 and 2.",
      call. = FALSE
    )
  }
  gender_mapping
}

select_group_column <- function(metadata, analyzed_rows) {
  if (!is.data.frame(metadata) || length(analyzed_rows) != nrow(metadata)) {
    stop("Metadata and analyzed-row mask must have matching rows.", call. = FALSE)
  }
  if (!is.logical(analyzed_rows)) analyzed_rows <- as.logical(analyzed_rows)
  if (anyNA(analyzed_rows)) stop("Analyzed-row mask must not contain missing values.", call. = FALSE)

  safe_column <- function(column) is.character(column) && length(column) == 1L && nzchar(column) && grepl("^[A-Za-z][A-Za-z0-9 _-]{0,39}$", column)
  evaluate <- function(column) {
    if (!safe_column(column) || !(column %in% names(metadata))) return(NULL)
    values <- trimws(as.character(metadata[[column]]))[analyzed_rows]
    if (any(is.na(values) | !nzchar(values))) return(NULL)
    levels <- sort(unique(values))
    if (length(levels) != 2L || any(!grepl("^[A-Za-z0-9][A-Za-z0-9 _-]{0,39}$", levels))) return(NULL)
    counts <- table(factor(values, levels = levels))
    if (any(counts < 20L)) return(NULL)
    list(
      column = column,
      values = trimws(as.character(metadata[[column]])),
      levels = levels,
      counts = data.frame(group = levels, n = as.integer(counts), stringsAsFactors = FALSE)
    )
  }

  gender_matches <- names(metadata)[tolower(names(metadata)) == "gender"]
  if (length(gender_matches)) {
    selected <- evaluate(gender_matches[[1]])
    if (is.null(selected)) stop("The Gender column is invalid for subgroup comparison.", call. = FALSE)
    return(selected)
  }

  for (column in names(metadata)) {
    selected <- evaluate(column)
    if (!is.null(selected)) return(selected)
  }
  stop("Open SNA requires a safe binary metadata column with at least 20 analyzed rows in each group.", call. = FALSE)
}

read_and_validate_workbook <- function(
    input_path,
    sheet = NULL,
    gender_mapping = NULL) {
  if (!file.exists(input_path)) {
    stop("The uploaded workbook could not be opened.", call. = FALSE)
  }
  if (!grepl("\\.xlsx$", input_path, ignore.case = TRUE)) {
    stop("Open SNA accepts .xlsx workbooks only.", call. = FALSE)
  }

  sheet_names <- readxl::excel_sheets(input_path)
  if (!length(sheet_names)) stop("The workbook contains no worksheets.", call. = FALSE)
  if (length(sheet_names) != 1L) {
    stop("Open SNA v1 requires exactly one worksheet.", call. = FALSE)
  }
  selected_sheet <- if (is.null(sheet) || !nzchar(sheet)) sheet_names[[1]] else sheet
  if (!(selected_sheet %in% sheet_names)) {
    stop("The selected worksheet does not exist in the workbook.", call. = FALSE)
  }

  raw <- as.data.frame(
    readxl::read_excel(input_path, sheet = selected_sheet, .name_repair = "minimal"),
    stringsAsFactors = FALSE,
    check.names = FALSE
  )
  if (!nrow(raw)) stop("The selected worksheet contains no data rows.", call. = FALSE)
  if (nrow(raw) > 5000L || ncol(raw) > 64L) {
    stop("Open SNA v1 accepts at most 5,000 rows and 64 columns.", call. = FALSE)
  }
  if (any(!nzchar(names(raw))) || anyDuplicated(names(raw))) {
    stop("Every workbook column must have a unique, non-empty header.", call. = FALSE)
  }

  item_columns <- discover_item_columns(names(raw))

  numeric_items <- raw[, item_columns, drop = FALSE]
  conversion_failures <- vapply(seq_along(numeric_items), function(index) {
    original <- numeric_items[[index]]
    converted <- suppressWarnings(as.numeric(original))
    any(!is.na(original) & is.na(converted))
  }, logical(1))
  if (any(conversion_failures)) {
    stop(
      "Network item columns must contain only numeric values or blank cells. Invalid columns: ",
      paste(item_columns[conversion_failures], collapse = ", "),
      ".",
      call. = FALSE
    )
  }
  numeric_items[] <- lapply(numeric_items, function(value) suppressWarnings(as.numeric(value)))
  invalid_likert <- vapply(numeric_items, function(value) {
    present <- value[!is.na(value)]
    any(!is.finite(present) | present < 1 | present > 5 | present != round(present))
  }, logical(1))
  if (any(invalid_likert)) {
    stop(
      "Network items must be integer Likert responses from 1 to 5. Invalid columns: ",
      paste(item_columns[invalid_likert], collapse = ", "),
      ".",
      call. = FALSE
    )
  }

  complete <- stats::complete.cases(numeric_items)
  analyzed <- numeric_items[complete, , drop = FALSE]
  minimum_rows <- max(30L, ncol(analyzed) + 5L)
  if (nrow(analyzed) < minimum_rows) {
    stop(
      "Too few complete rows remain for this network. Open SNA requires at least ",
      minimum_rows,
      " complete rows for ",
      ncol(analyzed),
      " nodes.",
      call. = FALSE
    )
  }

  standard_deviations <- vapply(analyzed, stats::sd, numeric(1), na.rm = TRUE)
  constant_items <- names(standard_deviations)[
    !is.finite(standard_deviations) | standard_deviations == 0
  ]
  if (length(constant_items)) {
    stop(
      "Constant network items cannot be estimated: ",
      paste(constant_items, collapse = ", "),
      ".",
      call. = FALSE
    )
  }

  metadata <- raw[, setdiff(names(raw), item_columns), drop = FALSE]
  group_selection <- select_group_column(metadata, complete)
  group_column <- group_selection$column
  group_values <- group_selection$values
  gender_mapping <- validate_gender_mapping(gender_mapping)
  if (!is.null(gender_mapping)) {
    if (tolower(group_column) != "gender") {
      stop("A Gender code mapping was supplied, but no Gender column was found.", call. = FALSE)
    }
  }
  if (!is.null(gender_mapping)) {
    observed_codes <- sort(unique(group_values[complete]))
    if (!identical(observed_codes, c("1", "2"))) {
      stop("The supplied Gender mapping applies only when the observed Gender codes are exactly 1 and 2.", call. = FALSE)
    }
    group_values <- unname(gender_mapping[group_values])
    group_selection$levels <- unname(gender_mapping[group_selection$levels])
    group_selection$counts$group <- group_selection$levels
  }
  group_levels <- group_selection$levels
  group_count_rows <- group_selection$counts

  list(
    raw = raw,
    items = analyzed,
    complete = complete,
    item_columns = item_columns,
    communities = stats::setNames(community_from_item(item_columns), item_columns),
    group_column = group_column,
    group_values = group_values,
    group_levels = group_levels,
    group_counts = group_count_rows,
    sheet = selected_sheet,
    original_rows = nrow(raw),
    dropped_rows = sum(!complete)
  )
}

estimate_network <- function(items, gamma = 0.5) {
  npn_ebicglasso_estimate(items, gamma = gamma)
}

align_metric <- function(values, item_names, label = "Metric") {
  if (length(values) != length(item_names)) {
    stop(label, " must contain exactly one value for every item.", call. = FALSE)
  }
  value_names <- names(values)
  if (!is.null(value_names)) {
    if (anyDuplicated(value_names) || !setequal(value_names, item_names)) {
      stop(label, " names must match the network item names exactly.", call. = FALSE)
    }
    values <- values[item_names]
  }
  values <- as.numeric(values)
  names(values) <- item_names
  values
}

extract_metric <- function(values, item_names) {
  round_metric(align_metric(values, item_names))
}

validate_network_weights <- function(weights, item_names = colnames(weights)) {
  if (
    !is.matrix(weights) ||
      nrow(weights) != ncol(weights) ||
      is.null(item_names) ||
      length(item_names) != nrow(weights) ||
      anyDuplicated(item_names) ||
      is.null(rownames(weights)) ||
      is.null(colnames(weights)) ||
      !identical(rownames(weights), item_names) ||
      !identical(colnames(weights), item_names) ||
      any(!is.finite(weights))
  ) {
    stop("Network weights must be a finite square matrix with matching item names.", call. = FALSE)
  }
  if (!isTRUE(all.equal(weights, t(weights), tolerance = 1e-12, check.attributes = FALSE))) {
    stop("Network weights must be symmetric.", call. = FALSE)
  }
  invisible(weights)
}

is_empty_network <- function(weights, item_names = colnames(weights)) {
  validate_network_weights(weights, item_names)
  !any(is.finite(weights) & weights != 0)
}

named_metric <- function(value, item_names) {
  if (length(value) == 1L) return(align_metric(rep(value, length(item_names)), item_names))
  align_metric(value, item_names)
}

empty_network_metrics <- function(item_names) {
  list(
    strength = named_metric(0, item_names),
    expectedInfluence = named_metric(0, item_names),
    betweenness = named_metric(0, item_names),
    closeness = named_metric(NA_real_, item_names),
    bridgeStrength = named_metric(0, item_names),
    bridgeExpectedInfluence = named_metric(0, item_names),
    bridgeBetweenness = named_metric(0, item_names),
    bridgeCloseness = named_metric(NA_real_, item_names)
  )
}

metric_column <- function(table, column, item_names, fallback = NA_real_) {
  values <- named_metric(fallback, item_names)
  if (is.null(table) || !(column %in% colnames(table))) return(values)
  align_metric(table[, column], item_names, paste0("Centrality column ", column))
}

deterministic_circle_layout <- function(item_names) {
  angles <- seq(0, 2 * pi, length.out = length(item_names) + 1L)[seq_along(item_names)]
  coordinates <- data.frame(
    x = normalize_coordinate(cos(angles)),
    y = normalize_coordinate(sin(angles)),
    stringsAsFactors = FALSE
  )
  rownames(coordinates) <- item_names
  coordinates
}

network_metrics <- function(items, network, communities, seed, layout_name = "spring") {
  item_names <- colnames(items)
  weights <- network$weights
  empty_network <- is_empty_network(weights)

  if (empty_network) {
    centrality_metrics <- empty_network_metrics(item_names)
    coordinates <- deterministic_circle_layout(item_names)
  } else {
    graph <- qgraph::qgraph(weights, DoNotPlot = TRUE, labels = item_names)
    centrality <- qgraph::centrality_auto(graph)$node.centrality
    centrality <- centrality[item_names, , drop = FALSE]
    bridge_values <- networktools::bridge(
      weights,
      communities = communities,
      directed = FALSE
    )
    centrality_metrics <- list(
      strength = metric_column(centrality, "Strength", item_names),
      expectedInfluence = metric_column(centrality, "ExpectedInfluence", item_names),
      betweenness = metric_column(centrality, "Betweenness", item_names),
      closeness = metric_column(centrality, "Closeness", item_names),
      bridgeStrength = named_metric(bridge_values[["Bridge Strength"]], item_names),
      bridgeExpectedInfluence = named_metric(
        bridge_values[["Bridge Expected Influence (1-step)"]],
        item_names
      ),
      bridgeBetweenness = named_metric(bridge_values[["Bridge Betweenness"]], item_names),
      bridgeCloseness = named_metric(bridge_values[["Bridge Closeness"]], item_names)
    )
    set.seed(seed + 17L)
    coordinates <- qgraph::qgraph(
      weights,
      layout = layout_name,
      repulsion = 0.65,
      DoNotPlot = TRUE
    )$layout
  }

  fit <- mgm::mgm(
    data = network$transformed,
    type = rep("g", ncol(network$transformed)),
    level = rep(1, ncol(network$transformed)),
    k = 2,
    lambdaSel = "EBIC",
    lambdaGam = 0.5,
    pbar = FALSE,
    signInfo = FALSE,
    verbatim = TRUE
  )
  predictability <- as.numeric(
    stats::predict(fit, data = network$transformed, errorCon = "R2")$errors$R2
  )

  nodes <- data.frame(
    id = item_names,
    label = item_names,
    community = unname(communities[item_names]),
    x = round_metric(normalize_coordinate(coordinates[, 1L])),
    y = round_metric(normalize_coordinate(coordinates[, 2L])),
    strength = extract_metric(centrality_metrics$strength, item_names),
    expectedInfluence = extract_metric(centrality_metrics$expectedInfluence, item_names),
    betweenness = extract_metric(centrality_metrics$betweenness, item_names),
    closeness = extract_metric(centrality_metrics$closeness, item_names),
    bridgeStrength = extract_metric(centrality_metrics$bridgeStrength, item_names),
    bridgeExpectedInfluence = extract_metric(centrality_metrics$bridgeExpectedInfluence, item_names),
    bridgeBetweenness = extract_metric(centrality_metrics$bridgeBetweenness, item_names),
    bridgeCloseness = extract_metric(centrality_metrics$bridgeCloseness, item_names),
    predictability = round_metric(predictability),
    stringsAsFactors = FALSE,
    check.names = FALSE
  )

  positions <- which(upper.tri(weights) & weights != 0, arr.ind = TRUE)
  if (nrow(positions)) {
    edge_weights <- weights[positions]
    edges <- data.frame(
      source = item_names[positions[, 1L]],
      target = item_names[positions[, 2L]],
      weight = round_metric(edge_weights),
      absoluteWeight = round_metric(abs(edge_weights)),
      sign = ifelse(edge_weights >= 0, "positive", "negative"),
      relationship = ifelse(
        communities[item_names[positions[, 1L]]] == communities[item_names[positions[, 2L]]],
        "within-community",
        "between-community"
      ),
      stringsAsFactors = FALSE
    )
    edges <- edges[order(-edges$absoluteWeight, edges$source, edges$target), , drop = FALSE]
    rownames(edges) <- NULL
  } else {
    edges <- data.frame(
      source = character(), target = character(), weight = numeric(),
      absoluteWeight = numeric(), sign = character(), relationship = character(),
      stringsAsFactors = FALSE
    )
  }

  list(nodes = nodes, edges = edges)
}

network_summary <- function(items, weights, nodes, edges) {
  possible_edges <- ncol(weights) * (ncol(weights) - 1L) / 2L
  strongest <- if (nrow(edges)) {
    list(
      source = edges$source[[1]],
      target = edges$target[[1]],
      weight = edges$weight[[1]]
    )
  } else {
    NULL
  }
  list(
    analyzedRows = nrow(items),
    nodeCount = ncol(weights),
    edgeCount = nrow(edges),
    possibleEdges = possible_edges,
    density = round_metric(nrow(edges) / possible_edges),
    positiveEdges = sum(edges$weight > 0),
    negativeEdges = sum(edges$weight < 0),
    meanAbsoluteEdgeWeight = if (nrow(edges)) round_metric(mean(edges$absoluteWeight)) else 0,
    meanPredictability = round_metric(mean(nodes$predictability, na.rm = TRUE)),
    strongestEdge = strongest
  )
}

stabilize_npn_correlation <- function(
    correlation,
    eigen_floor = NPN_EBICGLASSO_CONDITIONING_FLOOR_V1) {
  if (!is.matrix(correlation) || nrow(correlation) != ncol(correlation) || any(!is.finite(correlation))) {
    stop("NPN Pearson correlation matrix must be finite and square.", call. = FALSE)
  }
  item_names <- colnames(correlation)
  correlation <- (correlation + t(correlation)) / 2
  decomposition <- eigen(correlation, symmetric = TRUE)
  if (min(decomposition$values) < eigen_floor) {
    conditioned_values <- pmax(decomposition$values, eigen_floor)
    correlation <- sweep(decomposition$vectors, 2L, conditioned_values, `*`) %*%
      t(decomposition$vectors)
    correlation <- (correlation + t(correlation)) / 2
    scales <- sqrt(diag(correlation))
    correlation <- correlation / outer(scales, scales)
    diag(correlation) <- 1
  }
  rownames(correlation) <- colnames(correlation) <- item_names
  conditioned_eigenvalues <- eigen(correlation, symmetric = TRUE, only.values = TRUE)$values
  if (any(!is.finite(conditioned_eigenvalues)) || min(conditioned_eigenvalues) <= 0) {
    stop("NPN Pearson correlation conditioning did not produce a positive-definite matrix.", call. = FALSE)
  }
  correlation
}

run_ebicglasso_with_messages <- function(expression, suppress_internal_messages) {
  if (isTRUE(suppress_internal_messages)) return(suppressMessages(expression))
  expression
}

npn_ebicglasso_estimate <- function(
    data,
    gamma,
    suppress_internal_messages = FALSE) {
  matrix_input <- as.matrix(data)
  item_names <- colnames(matrix_input)
  if (
    is.null(item_names) ||
      anyDuplicated(item_names) ||
      !is.numeric(matrix_input) ||
      any(!is.finite(matrix_input))
  ) {
    stop("NPN EBICglasso estimation requires finite numeric data with unique item names.", call. = FALSE)
  }
  transformed <- huge::huge.npn(
    matrix_input,
    npn.func = "shrinkage",
    verbose = FALSE
  )
  correlation <- stabilize_npn_correlation(stats::cor(transformed))
  weights <- run_ebicglasso_with_messages(
    qgraph::EBICglasso(correlation, n = nrow(matrix_input), gamma = gamma),
    suppress_internal_messages
  )
  rownames(weights) <- colnames(weights) <- item_names
  diag(weights) <- 0
  weights[abs(weights) < 1e-6] <- 0
  validate_network_weights(weights, item_names)
  list(transformed = transformed, correlation = correlation, weights = weights)
}

nct_npn_ebicglasso_estimator <- function(data, gamma) {
  withCallingHandlers(
    {
      npn_ebicglasso_estimate(
        data,
        gamma = gamma,
        suppress_internal_messages = TRUE
      )$weights
    },
    warning = function(condition) invokeRestart("muffleWarning")
  )
}

subgroup_comparison <- function(prepared, gamma, permutations, seed) {
  group_values <- prepared$group_values[prepared$complete]
  levels <- prepared$group_levels
  first_index <- which(group_values == levels[[1]])
  second_index <- which(group_values == levels[[2]])

  items <- prepared$items
  first_data <- items[first_index, , drop = FALSE]
  second_data <- items[second_index, , drop = FALSE]
  set.seed(seed + 101L)
  nct_result <- NetworkComparisonTest::NCT(
    first_data,
    second_data,
    it = permutations,
    paired = FALSE,
    weighted = TRUE,
    abs = TRUE,
    test.edges = TRUE,
    edges = "all",
    progressbar = FALSE,
    p.adjust.methods = "holm",
    estimator = nct_npn_ebicglasso_estimator,
    estimatorArgs = list(gamma = gamma),
    verbose = FALSE
  )

  edge_p_values <- nct_result$einv.pvals
  edge_table <- data.frame(
    source = as.character(edge_p_values[["Var1"]]),
    target = as.character(edge_p_values[["Var2"]]),
    absoluteDifference = round_metric(edge_p_values[["Test statistic E"]]),
    pValueHolm = round_metric(edge_p_values[["p-value"]]),
    stringsAsFactors = FALSE
  )
  edge_table <- edge_table[
    order(-edge_table$absoluteDifference, edge_table$source, edge_table$target),
    ,
    drop = FALSE
  ]
  rownames(edge_table) <- NULL

  list(
    available = TRUE,
    method = NPN_EBICGLASSO_NCT_METHOD_V1,
    packageVersion = as.character(utils::packageVersion("NetworkComparisonTest")),
    groupColumn = prepared$group_column,
    groupA = levels[[1]],
    groupB = levels[[2]],
    nA = prepared$group_counts$n[[1]],
    nB = prepared$group_counts$n[[2]],
    permutations = permutations,
    globalStrengthA = round_metric(nct_result$glstrinv.sep[[1]]),
    globalStrengthB = round_metric(nct_result$glstrinv.sep[[2]]),
    globalStrengthDifference = round_metric(nct_result$glstrinv.real),
    globalStrengthPValue = round_metric(nct_result$glstrinv.pval),
    networkStructureDifference = round_metric(nct_result$nwinv.real),
    networkStructurePValue = round_metric(nct_result$nwinv.pval),
    strongestEdgeDifferences = utils::head(edge_table, 8L)
  )
}

stability_label <- function(value) {
  if (is.na(value)) return("Not available")
  if (value < 0.25) return("Do not interpret")
  if (value < 0.50) return("Acceptable")
  "Desirable"
}

empty_network_stability <- function(bootstraps) {
  statistics <- c(
    "strength",
    "bridgeStrength",
    "bridgeCloseness",
    "bridgeBetweenness"
  )
  labels <- c(
    strength = "Strength",
    bridgeStrength = "Bridge strength",
    bridgeCloseness = "Bridge closeness",
    bridgeBetweenness = "Bridge betweenness"
  )
  list(
    available = TRUE,
    method = "Case-dropping bootstrap",
    bootstraps = bootstraps,
    cores = 1L,
    correlationThreshold = 0.70,
    acceptableThreshold = 0.25,
    desirableThreshold = 0.50,
    metrics = data.frame(
      id = statistics,
      metric = unname(labels[statistics]),
      coefficient = rep(NA_real_, length(statistics)),
      interpretation = rep("Not available", length(statistics)),
      stringsAsFactors = FALSE
    )
  )
}

stability_analysis <- function(items, communities, gamma, bootstraps, seed, weights) {
  if (is_empty_network(weights)) {
    warning(
      "The estimated network contains no nonzero edges; case-dropping centrality stability is not available.",
      call. = FALSE
    )
    return(empty_network_stability(bootstraps))
  }
  statistics <- c(
    "strength",
    "bridgeStrength",
    "bridgeCloseness",
    "bridgeBetweenness"
  )
  labels <- c(
    strength = "Strength",
    bridgeStrength = "Bridge strength",
    bridgeCloseness = "Bridge closeness",
    bridgeBetweenness = "Bridge betweenness"
  )

  set.seed(seed)
  network <- bootnet::estimateNetwork(
    items,
    default = "EBICglasso",
    corMethod = "npn",
    tuning = gamma,
    verbose = FALSE
  )
  set.seed(seed)
  bootstrap <- bootnet::bootnet(
    network,
    nBoots = bootstraps,
    type = "case",
    nCores = 1,
    statistics = statistics,
    communities = communities,
    bridgeArgs = list(communities = communities),
    verbose = FALSE
  )

  coefficients <- vapply(statistics, function(statistic) {
    value <- tryCatch(
      bootnet::corStability(
        bootstrap,
        cor = 0.70,
        statistics = statistic,
        verbose = FALSE
      ),
      error = function(error) NA_real_
    )
    as.numeric(value)[1]
  }, numeric(1))

  metrics <- data.frame(
    id = statistics,
    metric = unname(labels[statistics]),
    coefficient = round_metric(coefficients),
    interpretation = vapply(coefficients, stability_label, character(1)),
    stringsAsFactors = FALSE
  )
  rownames(metrics) <- NULL

  list(
    available = TRUE,
    method = "Case-dropping bootstrap",
    bootstraps = bootstraps,
    cores = 1L,
    correlationThreshold = 0.70,
    acceptableThreshold = 0.25,
    desirableThreshold = 0.50,
    metrics = metrics
  )
}

top_node <- function(nodes, metric) {
  values <- nodes[[metric]]
  valid <- which(is.finite(values))
  if (!length(valid)) return(NULL)
  index <- valid[[which.max(values[valid])]]
  list(node = nodes$id[[index]], value = nodes[[metric]][[index]])
}

build_interpretation <- function(overview, nodes, comparison, stability, runtime_warnings) {
  strength <- top_node(nodes, "strength")
  bridge_strength <- top_node(nodes, "bridgeStrength")
  predictability <- top_node(nodes, "predictability")
  bridge_cs <- stability$metrics$coefficient[
    stability$metrics$id == "bridgeStrength"
  ][1]

  insights <- list(
    list(
      id = "network-structure",
      title = "Network structure",
      text = paste0(
        "The estimated network contains ", overview$edgeCount, " of ",
        overview$possibleEdges, " possible edges (density ",
        format(round(overview$density, 3), nsmall = 3), ")."
      ),
      evidence = "Overview: edge count and density"
    ),
    list(
      id = "central-node",
      title = "Highest node strength",
      text = paste0(
        strength$node, " has the highest strength in this estimated network (",
        format(round(strength$value, 3), nsmall = 3), ")."
      ),
      evidence = "Centrality Analysis: strength"
    ),
    list(
      id = "predictability",
      title = "Highest predictability",
      text = paste0(
        predictability$node, " has the highest node predictability R-squared (",
        format(round(predictability$value, 3), nsmall = 3), ")."
      ),
      evidence = "Predictability Analysis: mgm R-squared"
    )
  )

  if (!is.na(bridge_cs) && bridge_cs >= 0.25) {
    insights[[length(insights) + 1L]] <- list(
      id = "bridge-node",
      title = "Bridge node",
      text = paste0(
        bridge_strength$node,
        " has the highest bridge strength, and the bridge-strength stability threshold permits cautious interpretation."
      ),
      evidence = "Bridge Node Analysis and Stability Analysis"
    )
  } else {
    insights[[length(insights) + 1L]] <- list(
      id = "bridge-node-limited",
      title = "Bridge interpretation is limited",
      text = "Bridge rankings should not be emphasized because the corresponding stability evidence is below the minimum interpretation threshold or unavailable.",
      evidence = "Stability Analysis: bridge strength CS coefficient"
    )
  }

  significant <- comparison$networkStructurePValue < 0.05
  insights[[length(insights) + 1L]] <- list(
    id = "subgroup-comparison",
    title = "Subgroup comparison",
    text = if (significant) {
      paste0(
        "The permutation test detects a subgroup difference in network structure (p = ",
        format(round(comparison$networkStructurePValue, 3), nsmall = 3),
        "). Inspect corrected edge tests before drawing item-level conclusions."
      )
    } else {
      paste0(
        "The permutation test does not detect a subgroup difference in network structure at alpha .05 (p = ",
        format(round(comparison$networkStructurePValue, 3), nsmall = 3),
        "). This is not evidence that the networks are identical."
      )
    },
    evidence = "Subgroup Comparison: permutation test"
  )

  list(
    generator = "Deterministic evidence-bound rules implemented in R",
    thirdPartyAiUsed = FALSE,
    insights = insights,
    cautions = unique(c(
      "Edges are regularized partial correlations and do not establish causal direction.",
      "Centrality and bridge rankings should be interpreted only when their stability is adequate.",
      "Subgroup permutation tests depend on the selected model, grouping variable, and resampling count.",
      "Review the workbook schema, missing-data exclusions, and method settings before publication.",
      if (length(runtime_warnings)) paste0("Runtime warning: ", runtime_warnings) else character()
    ))
  )
}

analyze_workbook <- function(
    input_path,
    output_path,
    bootstraps = 100L,
    permutations = 1000L,
    seed = 2026L,
    data_source = "uploaded-workbook",
    sheet = NULL,
    gender_mapping = NULL) {
  assert_packages()
  if (!(data_source %in% c("uploaded-workbook", "aggregate-demo"))) {
    stop("Data source must be uploaded-workbook or aggregate-demo.", call. = FALSE)
  }
  if (!(bootstraps %in% c(100L, 500L, 1000L))) {
    stop("Bootstrap count must be 100, 500, or 1000.", call. = FALSE)
  }
  if (permutations != 1000L) {
    stop("Permutation count must be exactly 1000.", call. = FALSE)
  }
  prepared <- tryCatch(
    read_and_validate_workbook(
      input_path,
      sheet = sheet,
      gender_mapping = gender_mapping
    ),
    error = function(error) {
      if (inherits(error, "open_sna_error")) stop(error)
      open_sna_abort("WORKBOOK_INVALID", conditionMessage(error))
    }
  )
  gamma <- 0.5
  layout_name <- "spring"
  analysis_warnings <- character()
  record_warnings <- function(expression) {
    withCallingHandlers(
      expression,
      warning = function(condition) {
        analysis_warnings <<- c(analysis_warnings, conditionMessage(condition))
        invokeRestart("muffleWarning")
      }
    )
  }

  network <- record_warnings(estimate_network(prepared$items, gamma = gamma))
  metrics <- record_warnings(network_metrics(
    prepared$items,
    network,
    prepared$communities,
    seed = seed,
    layout_name = layout_name
  ))
  overview <- network_summary(
    prepared$items,
    network$weights,
    metrics$nodes,
    metrics$edges
  )
  comparison <- record_warnings(subgroup_comparison(
    prepared,
    gamma = gamma,
    permutations = permutations,
    seed = seed
  ))
  stability <- record_warnings(stability_analysis(
    prepared$items,
    prepared$communities,
    gamma = gamma,
    bootstraps = bootstraps,
    seed = seed,
    weights = network$weights
  ))
  analysis_warnings <- unique(trimws(analysis_warnings[nzchar(trimws(analysis_warnings))]))
  interpretation <- build_interpretation(
    overview,
    metrics$nodes,
    comparison,
    stability,
    analysis_warnings
  )

  result <- list(
    schemaVersion = "1.1",
    analysisProfile = "npn-ebicglasso-v1",
    dataSource = data_source,
    generatedAt = format(Sys.time(), tz = "UTC", format = "%Y-%m-%dT%H:%M:%SZ"),
    source = list(
      fileName = if (identical(data_source, "aggregate-demo")) {
        "Programming Resilience aggregate reference"
      } else {
        basename(input_path)
      },
      sheet = if (identical(data_source, "aggregate-demo")) {
        "Data worksheet"
      } else {
        prepared$sheet
      },
      originalRows = prepared$original_rows,
      analyzedRows = nrow(prepared$items),
      droppedRows = prepared$dropped_rows,
      groupColumn = prepared$group_column,
      groupCounts = prepared$group_counts,
      itemColumns = prepared$item_columns
    ),
    settings = list(
      estimator = "EBICglasso Gaussian graphical model",
      correlationMethod = NPN_EBICGLASSO_CORRELATION_METHOD_V1,
      gamma = gamma,
      missingData = "Listwise deletion across selected network items",
      communityRule = "Item-name prefix before the trailing number",
      layout = layout_name,
      seed = seed,
      bootstrapReplicates = bootstraps,
      nctPermutations = permutations,
      networkType = "Undirected weighted partial-correlation network"
    ),
    models = list(
      network = list(
        id = "qgraph-npn-ebicglasso-v1",
        method = NPN_EBICGLASSO_NETWORK_METHOD_V1
      ),
      predictability = list(
        id = "mgm-ebic-r2-v1",
        method = "mgm::mgm with EBIC selection and nodewise R-squared"
      )
    ),
    runtime = list(
      rVersion = R.version.string,
      packages = as.list(stats::setNames(
        vapply(required_packages, function(package) {
          as.character(utils::packageVersion(package))
        }, character(1)),
        required_packages
      ))
    ),
    overview = overview,
    nodes = metrics$nodes,
    edges = metrics$edges,
    subgroupComparison = comparison,
    stability = stability,
    warnings = as.list(analysis_warnings),
    interpretation = interpretation,
    privacy = list(
      rawRowsIncluded = FALSE,
      uploadedWorkbookRetainedByEngine = FALSE,
      thirdPartyAiUsed = FALSE
    )
  )

  dir.create(dirname(output_path), recursive = TRUE, showWarnings = FALSE)
  jsonlite::write_json(
    result,
    path = output_path,
    auto_unbox = TRUE,
    dataframe = "rows",
    digits = 8,
    pretty = TRUE,
    null = "null",
    na = "null"
  )
  invisible(result)
}

main <- function() {
  options <- parse_cli_args(commandArgs(trailingOnly = TRUE))
  if (is.null(options$input) || is.null(options$output)) {
    stop("Usage: analyze.R --input workbook.xlsx --output result.json", call. = FALSE)
  }
  bootstraps <- integer_option(
    options$bootstraps,
    default = 100L,
    minimum = 10L,
    maximum = 1000L,
    label = "Bootstrap count"
  )
  permutations <- integer_option(
    options$permutations,
    default = 1000L,
    minimum = 1000L,
    maximum = 1000L,
    label = "Permutation count"
  )
  seed <- integer_option(
    options$seed,
    default = 2026L,
    minimum = 1L,
    maximum = .Machine$integer.max,
    label = "Seed"
  )
  gender_mapping <- NULL
  gender_one_label <- options[["gender-1-label"]]
  gender_two_label <- options[["gender-2-label"]]
  if (!is.null(gender_one_label) || !is.null(gender_two_label)) {
    if (is.null(gender_one_label) || is.null(gender_two_label)) {
      stop("Both --gender-1-label and --gender-2-label are required together.", call. = FALSE)
    }
    gender_mapping <- c("1" = gender_one_label, "2" = gender_two_label)
  }
  analyze_workbook(
    input_path = options$input,
    output_path = options$output,
    bootstraps = bootstraps,
    permutations = permutations,
    seed = seed,
    data_source = if (is.null(options[["data-source"]])) {
      "uploaded-workbook"
    } else {
      options[["data-source"]]
    },
    sheet = options$sheet,
    gender_mapping = gender_mapping
  )
  cat("Open SNA analysis completed.\n")
}

if (sys.nframe() == 0L) {
  tryCatch(
    main(),
    error = function(error) {
      error_code <- if (inherits(error, "open_sna_error")) {
        error$code
      } else {
        "R_ANALYSIS_FAILED"
      }
      message("OPEN_SNA_ERROR_CODE=", error_code)
      message("Open SNA analysis failed: ", conditionMessage(error))
      quit(save = "no", status = 1L)
    }
  )
}
