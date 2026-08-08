import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");

function runGit(arguments_) {
  return spawnSync("git", arguments_, {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
}

const repositoryCheck = runGit(["rev-parse", "--is-inside-work-tree"]);

if (repositoryCheck.status !== 0) {
  console.log("Release hygiene: Git repository not initialized; tracked-file checks skipped.");
  process.exit(0);
}

for (const arguments_ of [
  ["diff", "--check"],
  ["diff", "--cached", "--check"],
]) {
  const result = runGit(arguments_);

  if (result.status !== 0) {
    process.stderr.write(result.stdout);
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }
}

const trackedResult = runGit(["ls-files", "-z"]);

if (trackedResult.status !== 0) {
  process.stderr.write(trackedResult.stderr);
  process.exit(trackedResult.status ?? 1);
}

const trackedFiles = trackedResult.stdout.split("\0").filter(Boolean);
const unsafeTrackedFiles = trackedFiles.filter((file) => {
  const normalized = file.toLowerCase();
  const basename = path.posix.basename(normalized);
  const isEnvironmentFile =
    basename === ".env" ||
    (basename.startsWith(".env.") && !basename.endsWith(".example"));

  return (
    isEnvironmentFile ||
    normalized.startsWith(".vercel/") ||
    normalized.startsWith(".next/") ||
    normalized.startsWith("node_modules/") ||
    basename.startsWith("all api keys") ||
    basename.endsWith(".pem")
  );
});

if (unsafeTrackedFiles.length > 0) {
  console.error("Release hygiene: sensitive or generated files are tracked:");
  for (const file of unsafeTrackedFiles) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

console.log("Release hygiene: tracked files and patch whitespace checks passed.");
