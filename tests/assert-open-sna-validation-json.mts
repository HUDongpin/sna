import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { isOpenSnaValidationResult } from "../lib/open-sna-workbook-validation";

const forbiddenKeys = new Set(["records", "rawData", "row", "ID", "file", "sheet"]);

function hasNoForbiddenKeys(value: unknown): boolean {
  if (Array.isArray(value)) return value.every(hasNoForbiddenKeys);
  if (value === null || typeof value !== "object") return true;
  return Object.entries(value).every(([key, entry]) => !forbiddenKeys.has(key) && hasNoForbiddenKeys(entry));
}

function main(args: readonly string[]) {
  if (args.length !== 2) return false;
  try {
    const result = JSON.parse(readFileSync(args[0], "utf8")) as unknown;
    const fingerprint = `sha256:${createHash("sha256").update(readFileSync(args[1])).digest("hex")}`;
    return isOpenSnaValidationResult(result)
      && hasNoForbiddenKeys(result)
      && result.inputFingerprint === fingerprint;
  } catch {
    return false;
  }
}

if (main(process.argv.slice(2))) console.log("PASS");
else process.exitCode = 1;
