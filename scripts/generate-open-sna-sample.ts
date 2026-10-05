/**
 * Deterministic synthetic Open SNA sample workbook.
 *
 * The rows are simulated from a sparse Gaussian graphical model: a known
 * partial-correlation network with within-community stars and a few
 * between-community bridges, then discretized to integer Likert scores.
 * The workbook is not empirical research evidence and contains no respondent data.
 *
 * Regenerate the public file with:
 *   npx tsx scripts/generate-open-sna-sample.ts
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  OPEN_SNA_SAMPLE_ITEM_HEADERS,
  OPEN_SNA_SAMPLE_SHEET_NAME,
  buildMinimalXlsx,
} from "./open-sna-sample-xlsx";

export const OPEN_SNA_SAMPLE_SEED = 2026;
export const OPEN_SNA_SAMPLE_ROW_COUNT = 360;
export const OPEN_SNA_SAMPLE_GROUP_SIZE = 180;
export const OPEN_SNA_SAMPLE_NOTE =
  "Synthetic sample. These rows were simulated from a known sparse Gaussian graphical model with two balanced groups. They are not empirical observations and contain no respondent data.";

const PLANTED_PARTIAL_CORRELATIONS = [
  ["Cmt1", "Cmt2", 0.42],
  ["Cmt1", "Cmt3", 0.39],
  ["Cmt1", "Cmt4", 0.37],
  ["Cnf1", "Cnf2", 0.42],
  ["Cnf1", "Cnf3", 0.39],
  ["Cnf1", "Cnf4", 0.37],
  ["Cop1", "Cop2", 0.42],
  ["Cop1", "Cop3", 0.39],
  ["Cop1", "Cop4", 0.37],
  ["Cmp1", "Cmp2", 0.42],
  ["Cmp1", "Cmp3", 0.39],
  ["Cmp1", "Cmp4", 0.37],
  ["Cmt4", "Cnf1", 0.33],
  ["Cnf4", "Cop1", 0.33],
  ["Cop4", "Cmp1", 0.33],
  ["Cmt1", "Cmp4", 0.31],
] as const;

const MINIMUM_PRECISION_EIGENVALUE = 0.05;

export type OpenSnaSampleRelationship = "within-community" | "between-community";

export type OpenSnaSampleEdge = {
  source: string;
  target: string;
  partialCorrelation: number;
  relationship: OpenSnaSampleRelationship;
};

export type OpenSnaSampleModel = {
  seed: number;
  scale: number;
  minimumEigenvalue: number;
  edges: OpenSnaSampleEdge[];
};

function communityOf(item: string) {
  return item.replace(/[0-9]+$/, "");
}

function relationshipOf(source: string, target: string): OpenSnaSampleRelationship {
  if (communityOf(source) === communityOf(target)) return "within-community";
  return "between-community";
}

function createSampleRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function nextGaussian(rng: () => number) {
  const u = Math.max(rng(), 1e-12);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function latentToLikert(value: number): number {
  if (value < -1.15) return 1;
  if (value < -0.4) return 2;
  if (value < 0.4) return 3;
  if (value < 1.15) return 4;
  return 5;
}

function zeros(size: number) {
  return Array.from({ length: size }, () => Array<number>(size).fill(0));
}

function jacobiEigen(matrix: number[][]) {
  const size = matrix.length;
  const values = matrix.map((row) => row.slice());
  const vectors = Array.from({ length: size }, () => Array<number>(size).fill(0));
  for (let index = 0; index < size; index += 1) vectors[index][index] = 1;
  for (let sweep = 0; sweep < 80; sweep += 1) {
    let offDiagonal = 0;
    for (let row = 0; row < size; row += 1) {
      for (let column = row + 1; column < size; column += 1) offDiagonal += values[row][column] * values[row][column];
    }
    if (offDiagonal < 1e-24) break;
    for (let row = 0; row < size; row += 1) {
      for (let column = row + 1; column < size; column += 1) {
        const coupling = values[row][column];
        if (Math.abs(coupling) < 1e-18) continue;
        const tau = (values[column][column] - values[row][row]) / (2 * coupling);
        const tangent = Math.sign(tau || 1) / (Math.abs(tau) + Math.sqrt(1 + tau * tau));
        const cosine = 1 / Math.sqrt(1 + tangent * tangent);
        const sine = tangent * cosine;
        values[row][row] -= tangent * coupling;
        values[column][column] += tangent * coupling;
        values[row][column] = 0;
        values[column][row] = 0;
        for (let other = 0; other < size; other += 1) {
          if (other === row || other === column) continue;
          const left = values[other][row];
          const right = values[other][column];
          values[other][row] = cosine * left - sine * right;
          values[row][other] = values[other][row];
          values[other][column] = sine * left + cosine * right;
          values[column][other] = values[other][column];
        }
        for (let other = 0; other < size; other += 1) {
          const left = vectors[other][row];
          const right = vectors[other][column];
          vectors[other][row] = cosine * left - sine * right;
          vectors[other][column] = sine * left + cosine * right;
        }
      }
    }
  }
  return { values: values.map((row, index) => row[index]), vectors };
}

function minimumEigenvalue(matrix: number[][]) {
  return Math.min(...jacobiEigen(matrix).values);
}

function invertSymmetric(matrix: number[][]) {
  const { values, vectors } = jacobiEigen(matrix);
  if (values.some((value) => value <= 1e-8)) {
    throw new Error("Open SNA sample precision matrix is not positive definite.");
  }
  const size = matrix.length;
  const inverse = zeros(size);
  for (let row = 0; row < size; row += 1) {
    for (let column = row; column < size; column += 1) {
      let sum = 0;
      for (let component = 0; component < size; component += 1) {
        sum += vectors[row][component] * vectors[column][component] / values[component];
      }
      inverse[row][column] = sum;
      inverse[column][row] = sum;
    }
  }
  return inverse;
}

function correlationFromCovariance(covariance: number[][]) {
  const scales = covariance.map((row, index) => Math.sqrt(row[index]));
  return covariance.map((row, rowIndex) => row.map((value, columnIndex) => (
    rowIndex === columnIndex ? 1 : value / (scales[rowIndex] * scales[columnIndex])
  )));
}

function cholesky(matrix: number[][]) {
  const size = matrix.length;
  const lower = zeros(size);
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column <= row; column += 1) {
      let sum = matrix[row][column];
      for (let inner = 0; inner < column; inner += 1) sum -= lower[row][inner] * lower[column][inner];
      if (row === column) {
        if (sum <= 1e-12) throw new Error("Open SNA sample correlation matrix is not positive definite.");
        lower[row][column] = Math.sqrt(sum);
      } else {
        lower[row][column] = sum / lower[column][column];
      }
    }
  }
  return lower;
}

function precisionAtScale(scale: number) {
  const itemIndex = new Map(OPEN_SNA_SAMPLE_ITEM_HEADERS.map((item, index) => [item, index]));
  const precision = zeros(OPEN_SNA_SAMPLE_ITEM_HEADERS.length);
  for (let index = 0; index < precision.length; index += 1) precision[index][index] = 1;
  for (const [source, target, partialCorrelation] of PLANTED_PARTIAL_CORRELATIONS) {
    const sourceIndex = itemIndex.get(source);
    const targetIndex = itemIndex.get(target);
    if (sourceIndex === undefined || targetIndex === undefined) {
      throw new Error(`Open SNA sample edge ${source}-${target} is not in the item schema.`);
    }
    const weight = partialCorrelation * scale;
    precision[sourceIndex][targetIndex] = -weight;
    precision[targetIndex][sourceIndex] = -weight;
  }
  return precision;
}

export function openSnaSampleModel(): OpenSnaSampleModel {
  let scale = 1;
  let precision = precisionAtScale(scale);
  let eigenvalue = minimumEigenvalue(precision);
  while (eigenvalue < MINIMUM_PRECISION_EIGENVALUE && scale > 0.5) {
    scale = Math.round((scale - 0.02) * 100) / 100;
    precision = precisionAtScale(scale);
    eigenvalue = minimumEigenvalue(precision);
  }
  if (eigenvalue < MINIMUM_PRECISION_EIGENVALUE) {
    throw new Error("Open SNA sample precision matrix could not be made positive definite.");
  }
  const edges = PLANTED_PARTIAL_CORRELATIONS.map(([source, target, partialCorrelation]) => ({
    source,
    target,
    partialCorrelation: Math.round(partialCorrelation * scale * 1e6) / 1e6,
    relationship: relationshipOf(source, target),
  }));
  return {
    seed: OPEN_SNA_SAMPLE_SEED,
    scale,
    minimumEigenvalue: eigenvalue,
    edges,
  };
}

function columnSignature(rows: Array<Array<string | number>>, column: number) {
  return rows.map((row) => row[column]).join("\u0001");
}

function sampleStandardDeviation(values: number[]) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function buildProgrammingResilienceSampleRows() {
  const model = openSnaSampleModel();
  if (model.scale < 0.9) {
    throw new Error("Open SNA sample edges were scaled below the intended partial-correlation strength.");
  }
  const covariance = invertSymmetric(precisionAtScale(model.scale));
  const correlation = correlationFromCovariance(covariance);
  const lower = cholesky(correlation);
  const itemCount = OPEN_SNA_SAMPLE_ITEM_HEADERS.length;
  const rng = createSampleRng(OPEN_SNA_SAMPLE_SEED);
  const rows: Array<Array<string | number>> = Array.from({ length: OPEN_SNA_SAMPLE_ROW_COUNT }, (_, rowIndex) => {
    const gender = rowIndex < OPEN_SNA_SAMPLE_GROUP_SIZE ? "F" : "M";
    const normal = Array.from({ length: itemCount }, () => nextGaussian(rng));
    const items = lower.map((row, itemIndex) => {
      const latent = row.reduce((sum, loading, component) => sum + loading * normal[component], 0);
      const shift = (((itemIndex * 5) % 7) - 3) * 0.04;
      return latentToLikert(latent + (gender === "F" ? shift : -shift));
    });
    return [...items, gender];
  });

  const signatures = new Set(Array.from({ length: itemCount }, (_, column) => columnSignature(rows, column)));
  if (signatures.size !== itemCount) {
    throw new Error("Open SNA sample items must remain unique after Likert discretization.");
  }
  for (let column = 0; column < itemCount; column += 1) {
    const values = rows.map((row) => row[column]);
    if (values.some((value) => typeof value !== "number" || value < 1 || value > 5 || value !== Math.round(value))) {
      throw new Error(`Open SNA sample column ${OPEN_SNA_SAMPLE_ITEM_HEADERS[column]} left the 1-5 Likert range.`);
    }
    const numeric = values.filter((value): value is number => typeof value === "number");
    for (const group of ["F", "M"] as const) {
      const grouped = numeric.filter((_, index) => rows[index][itemCount] === group);
      if (sampleStandardDeviation(grouped) === 0) {
        throw new Error(`Open SNA sample column ${OPEN_SNA_SAMPLE_ITEM_HEADERS[column]} is constant in group ${group}.`);
      }
    }
  }
  return rows;
}

export function buildProgrammingResilienceSampleXlsx() {
  const headers = [...OPEN_SNA_SAMPLE_ITEM_HEADERS, "Gender"];
  return buildMinimalXlsx(
    headers,
    buildProgrammingResilienceSampleRows(),
    OPEN_SNA_SAMPLE_SHEET_NAME,
    { note: OPEN_SNA_SAMPLE_NOTE },
  );
}

function isDirectRun() {
  const entry = process.argv[1];
  if (!entry) return false;
  return path.resolve(entry) === fileURLToPath(import.meta.url);
}

if (isDirectRun()) {
  const output = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public/open-sna/programming-resilience-sample.xlsx");
  const bytes = buildProgrammingResilienceSampleXlsx();
  writeFileSync(output, bytes);
  const model = openSnaSampleModel();
  process.stdout.write(`${JSON.stringify({
    output,
    bytes: bytes.byteLength,
    rows: OPEN_SNA_SAMPLE_ROW_COUNT,
    nodes: OPEN_SNA_SAMPLE_ITEM_HEADERS.length,
    groups: { F: OPEN_SNA_SAMPLE_GROUP_SIZE, M: OPEN_SNA_SAMPLE_GROUP_SIZE },
    plantedEdges: model.edges.length,
    minimumEigenvalue: model.minimumEigenvalue,
    scale: model.scale,
  }, null, 2)}\n`);
}
