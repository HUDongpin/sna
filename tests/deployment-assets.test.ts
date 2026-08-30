import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));

function fromRoot(...segments: string[]) {
  return path.join(repositoryRoot, ...segments);
}

function read(relativePath: string) {
  const absolutePath = fromRoot(relativePath);
  assert.ok(existsSync(absolutePath), `${relativePath} must exist`);
  assert.ok(statSync(absolutePath).isFile(), `${relativePath} must be a file`);
  return readFileSync(absolutePath, "utf8");
}

function expectContains(source: string, pattern: RegExp, label: string) {
  assert.match(source, pattern, label);
}

function expectNotContains(source: string, pattern: RegExp, label: string) {
  assert.doesNotMatch(source, pattern, label);
}

function exampleValues(source: string) {
  return source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .map((line) => (line.includes("=") ? line.slice(line.indexOf("=") + 1).trim() : line));
}

function workflowTriggerBlock(source: string) {
  const match = source.match(/on:[\s\S]*?jobs:/);
  return match ? match[0] : source;
}

function stepIndex(source: string, label: string) {
  const index = source.indexOf(label);
  assert.ok(index >= 0, `${label} step must exist`);
  return index;
}

function runShell(scriptPath: string, env: Record<string, string | undefined>) {
  return spawnSync("bash", [scriptPath], {
    cwd: repositoryRoot,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
}

function composeServiceBlock(compose: string, serviceName: string) {
  const marker = `${serviceName}:\n`;
  const start = compose.indexOf(marker);
  assert.ok(start >= 0, `${serviceName} service must exist`);
  const remainder = compose.slice(start + marker.length);
  const nextService = remainder.search(/\n  [A-Za-z0-9._-]+:\n/);
  return nextService >= 0 ? remainder.slice(0, nextService) : remainder;
}

test("aliyun deployment assets are present and pinned to the requested bases", () => {
  const webDockerfile = read("Dockerfile.web");
  const workerDockerfile = read("Dockerfile.open-sna-worker");
  const compose = read("deploy/aliyun/compose.yaml");
  const nginx = read("deploy/aliyun/nginx/sna.conf.example");
  const webEnv = read("deploy/aliyun/env/web.env.example");
  const workerEnv = read("deploy/aliyun/env/worker.env.example");
  const runbook = read("deploy/aliyun/RUNBOOK.md");
  const preflight = read("deploy/aliyun/scripts/preflight.sh");
  const verify = read("deploy/aliyun/scripts/verify.sh");
  const rollback = read("deploy/aliyun/scripts/rollback.sh");
  const workflow = read(".github/workflows/release-containers.yml");
  const ci = read(".github/workflows/ci.yml");

  assert.ok(existsSync(fromRoot("Dockerfile.web")), "root web Dockerfile must exist");
  assert.ok(existsSync(fromRoot("Dockerfile.open-sna-worker")), "root worker Dockerfile must exist");

  expectContains(webDockerfile, /FROM node:24\.15\.0-bookworm-slim@sha256:4e6b70dd6cbfc88c8157ba19aa3d9f9cce6ba4703576d55459e45efcbc9c5f5d AS build/, "web Dockerfile must pin the requested Node base image");
  expectContains(webDockerfile, /ARG VCS_REF=unknown/, "web Dockerfile must declare the revision build arg");
  expectContains(webDockerfile, /OPEN_SNA_CONTAINER_BUILD=1/, "web Dockerfile must set the container build flag");
  expectContains(webDockerfile, /NEXT_TELEMETRY_DISABLED=1/, "web Dockerfile must disable Next telemetry during build");
  expectContains(webDockerfile, /npm run build -- --webpack/, "web Dockerfile must build with webpack");
  expectContains(webDockerfile, /COPY --from=build \/app\/\.next\/standalone/, "web Dockerfile must copy standalone output");
  expectContains(webDockerfile, /USER 10001:10001/, "web Dockerfile must run as non-root");
  expectContains(webDockerfile, /CMD \["node", "server\.js"\]/, "web Dockerfile must use the standalone server");
  expectContains(webDockerfile, /node -e .*\/api\/health/, "web Dockerfile must define a node healthcheck");
  expectContains(webDockerfile, /org\.opencontainers\.image\.revision="\$\{VCS_REF\}"/, "web Dockerfile must annotate the OCI revision");
  expectNotContains(webDockerfile, /deploy\/aliyun/, "root web Dockerfile must not refer to deploy copies");

  expectContains(workerDockerfile, /ARG VCS_REF=unknown/, "worker Dockerfile must declare the revision build arg");
  expectContains(workerDockerfile, /org\.opencontainers\.image\.revision="\$\{VCS_REF\}"/, "worker Dockerfile must annotate the OCI revision");
  expectContains(workerDockerfile, /FROM node:24\.15\.0-bookworm-slim/, "worker Dockerfile must stay on Node 24.15");
  expectContains(workerDockerfile, /rocker\/r-ver:4\.4\.2@sha256:[0-9a-f]{64}/, "worker Dockerfile must use the pinned rocker base");
  expectContains(workerDockerfile, /COPY analysis\/open-sna\/renv\.lock/, "worker Dockerfile must copy the exact lockfile");
  expectContains(workerDockerfile, /renv::restore/, "worker Dockerfile must restore renv");
  expectContains(workerDockerfile, /OPEN_SNA_R_LIBS_USER=\/opt\/open-sna\/r-library/, "worker Dockerfile must lock the R library path for runtime and preflight");
  expectContains(workerDockerfile, /COPY analysis\/open-sna\/tests\/conditioning-regression\.R/, "worker verify stage must copy the conditioning regression harness");
  expectContains(workerDockerfile, /COPY analysis\/open-sna\/tests\/group-selection-regression\.R/, "worker verify stage must copy the group-selection regression harness");
  expectContains(workerDockerfile, /preflight\.R/, "worker Dockerfile must run the preflight fixture");
  expectContains(workerDockerfile, /verify-conditioning\.R/, "worker Dockerfile must run the conditioning regression via the wrapper");
  expectContains(workerDockerfile, /verify-group-selection\.R/, "worker Dockerfile must run the group-selection regression via the wrapper");
  expectContains(workerDockerfile, /analysis\/analyze\.R/, "worker final stage must include the analysis entrypoint");
  expectContains(workerDockerfile, /COPY --from=web-build \/app\/\.next\/standalone/, "worker Dockerfile must embed the standalone server");
  expectContains(workerDockerfile, /COPY --from=web-build \/app\/\.next\/static/, "worker Dockerfile must include static assets");
  expectContains(workerDockerfile, /COPY --from=web-build \/app\/public/, "worker Dockerfile must include public assets");
  expectContains(workerDockerfile, /USER open-sna/, "worker Dockerfile must run as non-root");
  expectContains(workerDockerfile, /CMD \["sh", "-c", "Rscript --vanilla analysis\/preflight\.R && exec node server\.js"\]/, "worker Dockerfile must healthcheck and start through the standalone server");
  const workerFinalStage = workerDockerfile.slice(workerDockerfile.indexOf("FROM worker-base AS final"));
  expectNotContains(workerFinalStage, /analysis\/open-sna\/tests|fixture|test harness/i, "worker final stage should not retain tests or harness text");

  const webService = composeServiceBlock(compose, "sna-web");
  const workerService = composeServiceBlock(compose, "sna-r-worker");
  expectContains(webService, /image:\s*ghcr\.io\/hudongpin\/sna-web@sha256:\$\{SNA_WEB_IMAGE_DIGEST:\?set a 64-character image digest\}/, "compose must require the pinned web digest");
  expectContains(workerService, /image:\s*ghcr\.io\/hudongpin\/sna-worker@sha256:\$\{SNA_WORKER_IMAGE_DIGEST:\?set a 64-character image digest\}/, "compose must require the pinned worker digest");
  expectContains(compose, /127\.0\.0\.1:3100:3000/, "compose must bind the web loopback port");
  expectContains(compose, /127\.0\.0\.1:3101:3000/, "compose must bind the worker loopback port");
  expectContains(compose, /read_only:\s*true/, "compose must keep containers read-only");
  expectContains(compose, /cap_drop:\s*\n\s*-\s*ALL/, "compose must drop all capabilities");
  expectContains(compose, /no-new-privileges:true/, "compose must disable privilege escalation");
  expectContains(compose, /tmpfs:/, "compose must define tmpfs mounts");
  expectContains(compose, /\/tmp\/open-sna-jobs/, "compose must mount the worker job tmpfs");
  expectContains(compose, /max-size:\s*"10m"/, "compose must cap log size");
  expectContains(compose, /max-file:\s*"5"/, "compose must cap log files");
  expectContains(compose, /SNA_RELEASE_SHA:\s*\$\{SNA_RELEASE_SHA:\?set the release SHA for this deployment\}/, "compose must require the release SHA");
  expectContains(compose, /SNA_DEPLOYMENT_ROLE=aliyun-primary/, "compose must declare the deployment role");
  expectContains(compose, /https:\/\/worker\.sna\.hk\/api\/open-sna\/analyze/, "compose must point the web adapter at the HTTPS worker URL");
  expectContains(compose, /NEXT_PUBLIC_SITE_URL:\s*https:\/\/www\.sna\.hk/, "compose must pin the public site URL");
  expectContains(compose, /R_LIBS_USER:\s*\/opt\/open-sna\/r-library/, "compose must pin the worker R library path");
  expectContains(compose, /OPEN_SNA_R_LIBS_USER:\s*\/opt\/open-sna\/r-library/, "compose must export the locked worker R library path");
  expectNotContains(compose, /OPEN_SNA_R_API_TOKEN:\s*\$\{/, "compose must not interpolate secret tokens");

  expectContains(nginx, /origin\.sna\.hk/, "nginx config must cover the origin host");
  expectContains(nginx, /www\.sna\.hk/, "nginx config must cover the main host");
  expectContains(nginx, /sna\.hk/, "nginx config must cover the apex host");
  expectContains(nginx, /worker\.sna\.hk/, "nginx config must cover the worker host");
  expectContains(nginx, /limit_req_zone/, "nginx config must define rate limiting");
  expectContains(nginx, /client_max_body_size\s+6m;/i, "nginx config must enforce upload size");
  expectContains(nginx, /proxy_read_timeout\s+300s;/i, "nginx config must enforce upstream timeout");
  expectContains(nginx, /X-Robots-Tag\s+noindex,nofollow/i, "origin host must return noindex,nofollow");
  expectContains(nginx, /server_name\s+sna\.hk;\s*\n\s*return 301 https:\/\/www\.sna\.hk\$request_uri;/, "apex HTTP must redirect directly to www");
  expectContains(nginx, /location\s+=\s*\/api\/open-sna\/analyze/, "worker host must proxy only the exact analysis path");
  expectContains(nginx, /proxy_set_header\s+Authorization\s+\$http_authorization;/, "worker proxy must forward authorization when present");
  expectContains(nginx, /ssl_certificate\s+\/etc\/nginx\/ssl\/sna\.hk\.crt;/, "nginx config must declare a certificate placeholder");
  expectContains(nginx, /ssl_certificate_key\s+\/etc\/nginx\/ssl\/sna\.hk\.key;/, "nginx config must declare a key placeholder");
  expectContains(nginx, /Strict-Transport-Security/i, "nginx config must emit HSTS when verify enforces it");
  expectContains(nginx, /limit_req_zone\s+\$binary_remote_addr\s+zone=sna_api:10m\s+rate=2r\/m;/, "nginx config must use the strict 2r/m worker limit");
  expectContains(nginx, /limit_conn\s+sna_conn\s+1;/, "nginx config must limit worker concurrency to one");
  expectNotContains(nginx, /(?:access_log|log_format)[^\n]*(?:authorization|request_body|body|auth)/i, "nginx config must not log authorization or request bodies");

  expectContains(webEnv, /SNA_RELEASE_SHA=/, "web env example must document the release SHA");
  expectContains(webEnv, /SNA_DEPLOYMENT_ROLE=aliyun-primary/, "web env example must document the deployment role");
  expectContains(webEnv, /OPEN_SNA_R_DISABLED=0/, "web env example must keep R enabled for the primary deployment");
  expectContains(webEnv, /NEXT_PUBLIC_SITE_URL=/, "web env example must document the public site URL");
  assert.ok(exampleValues(webEnv).every((value) => !/^(?:replace-with-|change-me-|secret|password)/i.test(value)));
  expectContains(webEnv, /OPEN_SNA_R_API_URL=https:\/\/worker\.sna\.hk\/api\/open-sna\/analyze/, "web env example must point at the HTTPS worker host");
  assert.ok(exampleValues(webEnv).every((value) => !/^(?:http:\/\/sna-r-worker|token=)/i.test(value)));

  expectContains(workerEnv, /OPEN_SNA_R_WORKER_MODE=1/, "worker env example must enable worker mode");
  expectContains(workerEnv, /OPEN_SNA_R_WORKER_TOKEN=/, "worker env example must document the worker token slot");
  expectContains(workerEnv, /OPEN_SNA_R_WORKER_TMP_ROOT=\/tmp\/open-sna-jobs/, "worker env example must document the tmp root");
  expectContains(workerEnv, /R_LIBS_USER=\/opt\/open-sna\/r-library/, "worker env example must document the exact R library path");
  assert.ok(exampleValues(workerEnv).every((value) => !/^(?:replace-with-|change-me-|secret|password)/i.test(value)));

  expectContains(preflight, /set -euo pipefail/, "preflight must use strict shell mode");
  expectContains(preflight, /OPEN_SNA_WEB_IMAGE_DIGEST|SNA_WEB_IMAGE_DIGEST/, "preflight must inspect the web digest");
  expectContains(preflight, /OPEN_SNA_WORKER_IMAGE_DIGEST|SNA_WORKER_IMAGE_DIGEST/, "preflight must inspect the worker digest");
  expectContains(preflight, /docker compose/, "preflight must inspect compose");
  expectContains(preflight, /read-only/i, "preflight must be read-only");
  expectContains(preflight, /stat -c '%U'/, "preflight must check secret file ownership");
  expectContains(preflight, /stat -c '%a'/, "preflight must check secret file mode");
  expectContains(preflight, /\/opt\/sna\/\.env/, "preflight must validate the non-secret compose env file");
  expectContains(preflight, /127\.0\.0\.1:3100/, "preflight must check the web loopback binding");
  expectContains(preflight, /127\.0\.0\.1:3101/, "preflight must check the worker loopback binding");
  expectContains(preflight, /port must bind on 127\.0\.0\.1 only/, "preflight must reject public binds");
  expectNotContains(preflight, /docker run|systemctl|apt-get|rm -rf|stop|start|kill/i, "preflight must not mutate the host");

  expectContains(verify, /set -euo pipefail/, "verify must use strict shell mode");
  expectContains(verify, /mktemp/, "verify must use temporary files");
  expectContains(verify, /trap/, "verify must clean up temporary files");
  expectContains(verify, /rAnalysis/, "verify must check the health payload");
  expectContains(verify, /401/, "verify must check unauthorized worker access");
  expectContains(verify, /WORKER_UNAUTHORIZED/, "verify must check the worker unauthorized body");
  expectContains(verify, /https:\/\/sna\.hk/, "verify must support the apex redirect check");
  expectContains(verify, /(301|308)/, "verify must allow apex 301 or 308 redirects");
  assert.ok(
    verify.includes("root status error: expected 307 redirect; got") &&
      verify.includes("grep -Eqi '^location: (/?en/?|https://www\\.sna\\.hk/en/?)(\\?.*)?$'"),
    "verify must pin the www root redirect to /en with HTTP 307",
  );
  expectContains(verify, /no-store/i, "verify must check cache headers");
  expectContains(verify, /worker network request failed/, "verify must separate worker network failures");
  expectContains(verify, /apex network request failed/, "verify must separate apex network failures");
  expectContains(verify, /www root network request failed/, "verify must separate www network failures");
  expectContains(verify, /strict-transport-security/i, "verify must check HSTS when the config emits it");
  expectNotContains(verify, /printenv|cat .*env|echo .*token/i, "verify must not print secrets");

  expectContains(rollback, /set -euo pipefail/, "rollback must use strict shell mode");
  expectContains(rollback, /CONFIRM_ROLLBACK=YES/, "rollback must require confirmation");
  expectContains(rollback, /previous web digest/i, "rollback must require a previous web digest");
  expectContains(rollback, /previous worker digest/i, "rollback must require a previous worker digest");
  expectContains(rollback, /release SHA/i, "rollback must require a release SHA");
  expectContains(rollback, /worker first/i, "rollback must update the worker before the web service");
  expectContains(rollback, /--no-deps/, "rollback must avoid cascading restarts");
  expectContains(rollback, /Waiting for the worker container health status to become healthy/i, "rollback must wait for the worker health status");
  expectContains(rollback, /docker inspect -f '\{\{\.State\.Health\.Status\}\}'/, "rollback must poll Docker health directly");
  expectContains(rollback, /expected worker to return 401 after rollback/i, "rollback must validate the worker authorization boundary");
  expectContains(rollback, /export SNA_WEB_IMAGE_DIGEST/, "rollback must override the web digest in the compose environment");
  expectContains(rollback, /export SNA_WORKER_IMAGE_DIGEST/, "rollback must override the worker digest in the compose environment");
  expectContains(rollback, /export SNA_RELEASE_SHA/, "rollback must override the release SHA in the compose environment");
  expectContains(rollback, /rollback_dir/, "rollback must keep a rollback backup directory");
  expectContains(rollback, /mv "\$tmp_env_file" "\$compose_env_file"/, "rollback must update the compose env file atomically");
  assert.ok(
    rollback.indexOf("Waiting for the worker container health status to become healthy") <
      rollback.indexOf("cp -p \"$compose_env_file\" \"$backup_file\""),
    "rollback must persist env only after worker health and 401 verification",
  );
  expectContains(rollback, /docker compose --env-file .* pull --no-parallel sna-r-worker/, "rollback must pull the worker first");
  expectContains(rollback, /docker compose --env-file .* up -d --no-deps --force-recreate sna-r-worker/, "rollback must recreate the worker before web");
  expectContains(rollback, /docker compose --env-file .* pull --no-parallel sna-web/, "rollback must only touch web after the worker check");
  expectNotContains(rollback, /docker system prune|rm -rf|reset --hard|down\b|delete\b/i, "rollback must avoid destructive resets");

  expectContains(runbook, /4vCPU\/8GiB/i, "runbook must warn about current capacity");
  expectContains(runbook, /backup/i, "runbook must describe backup of the current state");
  expectContains(runbook, /rollback/i, "runbook must describe rollback");
  expectContains(runbook, /kill switch/i, "runbook must describe the kill switch");
  expectContains(runbook, /Dockerfile\.web/, "runbook must reference the root web Dockerfile");
  expectContains(runbook, /Dockerfile\.open-sna-worker/, "runbook must reference the root worker Dockerfile");
  expectContains(runbook, /compose.yaml/, "runbook must reference the compose file");
  expectContains(runbook, /\/opt\/sna\/\.env/, "runbook must describe the non-secret compose env file");
  assert.ok(
    runbook.includes("`sna.hk` on HTTP goes directly to `https://www.sna.hk$request_uri` in one hop."),
    "runbook must document the apex redirect",
  );
  expectContains(runbook, /Authorization` forwarding limited to `worker\.sna\.hk`/, "runbook must document authorization scoping");
  expectContains(runbook, /Baota|nginx -t|reload/i, "runbook must describe the safe Nginx update sequence");

  const preflightTemp = mkdtempSync(path.join(repositoryRoot, "tmp", "deployment-assets-"));
  const preflightFailure = runShell("deploy/aliyun/scripts/preflight.sh", {
    SNA_WEB_IMAGE_DIGEST: "short",
    SNA_WORKER_IMAGE_DIGEST: "short",
    OPEN_SNA_WEB_ENV_FILE: path.join(preflightTemp, "missing-web.env"),
    OPEN_SNA_WORKER_ENV_FILE: path.join(preflightTemp, "missing-worker.env"),
    DOCKER_HOST: "unix:///does-not-exist",
  });
  assert.notEqual(preflightFailure.status, 0, "preflight must fail without required env files and digests");
  assert.match((preflightFailure.stderr || "") + (preflightFailure.stdout || ""), /digest|env file|missing/i);

  const verifyFailure = runShell("deploy/aliyun/scripts/verify.sh", {
    SNA_BASE_URL: "",
    SNA_WORKER_URL: "",
  });
  assert.notEqual(verifyFailure.status, 0, "verify must fail without required URLs");
  assert.match((verifyFailure.stderr || "") + (verifyFailure.stdout || ""), /usage:/i);

  expectContains(workflow, /workflow_dispatch/, "release workflow must be manual only");
  const triggerBlock = workflowTriggerBlock(workflow);
  expectNotContains(triggerBlock, /push:|pull_request:/, "release workflow must not auto-trigger");
  expectContains(workflow, /release_sha/, "release workflow must accept the release SHA input");
  expectContains(workflow, /ref:\s*\$\{\{ inputs\.release_sha \}\}/, "release workflow must checkout the exact requested SHA");
  expectContains(workflow, /git merge-base --is-ancestor HEAD origin\/main/, "release workflow must verify the input commit is on main");
  expectContains(workflow, /test "\$\(git rev-parse --verify HEAD\)" = "\$\{\{ inputs\.release_sha \}\}"/, "release workflow must pin HEAD to the requested SHA");
  expectContains(workflow, /linux\/amd64/, "release workflow must build amd64 artifacts");
  expectContains(workflow, /org\.opencontainers\.image\.revision/, "release workflow must annotate OCI revision");
  expectContains(workflow, /sbom|provenance/i, "release workflow must generate SBOM/provenance");
  expectContains(workflow, /cosign|sign/i, "release workflow must sign releases");
  expectContains(workflow, /steps\.web_build\.outputs\.digest/, "release workflow must work with web digests");
  expectContains(workflow, /steps\.worker_build\.outputs\.digest/, "release workflow must work with worker digests");
  expectContains(workflow, /file: Dockerfile\.web/, "release workflow must use the root web Dockerfile");
  expectContains(workflow, /file: Dockerfile\.open-sna-worker/, "release workflow must use the root worker Dockerfile");
  expectContains(workflow, /target:\s*verify/, "release workflow must build the worker verify stage");
  expectContains(workflow, /release-digests\.json/, "release workflow must emit a digest manifest");
  expectContains(workflow, /upload-artifact/i, "release workflow must upload the digest manifest");
  assert.ok(stepIndex(workflow, "Set up Buildx") < stepIndex(workflow, "Build worker verify stage"), "buildx must be ready before verify builds");
  assert.ok(stepIndex(workflow, "Build worker verify stage") < stepIndex(workflow, "Build web final image"), "worker verify must happen before the final prebuilds");
  assert.ok(stepIndex(workflow, "Build web final image") < stepIndex(workflow, "Build worker final image"), "web final prebuild must happen before worker final prebuild");
  assert.ok(stepIndex(workflow, "Build worker final image") < stepIndex(workflow, "Log in to GHCR"), "both final prebuilds must complete before registry login");
  assert.ok(stepIndex(workflow, "Log in to GHCR") < stepIndex(workflow, "Build and push web image"), "push steps must wait for registry login");
  assert.ok(stepIndex(workflow, "Build and push web image") < stepIndex(workflow, "Build and push worker image"), "web push must stay before worker push");

  expectContains(ci, /pull_request:/, "CI workflow must run on pull requests");
  expectContains(ci, /push:\s*\n\s*branches:\s*\n\s*-\s*main/, "CI workflow must run on push to main");
  expectContains(ci, /node-quality/, "CI workflow must expose a stable check name");
  expectContains(ci, /npm ci/, "CI workflow must install dependencies");
  expectContains(ci, /npm test/, "CI workflow must run tests");
  expectContains(ci, /npm run typecheck/, "CI workflow must run typecheck");
  expectContains(ci, /npm run build -- --webpack/, "CI workflow must build with webpack");
  expectContains(ci, /npm run release:hygiene/, "CI workflow must run release hygiene");

  assert.ok(!existsSync(fromRoot("deploy/aliyun/Dockerfile.web")), "duplicate deploy web Dockerfile should be removed");
  assert.ok(!existsSync(fromRoot("deploy/aliyun/Dockerfile.open-sna-worker")), "duplicate deploy worker Dockerfile should be removed");
});
