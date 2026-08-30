import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
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

test("aliyun deployment assets are present and pinned to the requested bases", () => {
  const webDockerfile = read("deploy/aliyun/Dockerfile.web");
  const workerDockerfile = read("deploy/aliyun/Dockerfile.open-sna-worker");
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

  expectContains(webDockerfile, /FROM node:24\.15\.0-bookworm-slim@sha256:4e6b70dd6cbfc88c8157ba19aa3d9f9cce6ba4703576d55459e45efcbc9c5f5d AS build/, "web Dockerfile must pin the requested Node base image");
  expectContains(webDockerfile, /ARG VCS_REF=unknown/, "web Dockerfile must declare the revision build arg");
  expectContains(webDockerfile, /OPEN_SNA_CONTAINER_BUILD=1/, "web Dockerfile must set the container build flag");
  expectContains(webDockerfile, /npm run build -- --webpack/, "web Dockerfile must build with webpack");
  expectContains(webDockerfile, /COPY --from=build \/app\/\.next\/standalone/, "web Dockerfile must copy standalone output");
  expectContains(webDockerfile, /USER 10001:10001/, "web Dockerfile must run as non-root");
  expectContains(webDockerfile, /node server\.js/, "web Dockerfile must use the standalone server");
  expectContains(webDockerfile, /node -e .*\/api\/health/, "web Dockerfile must define a node healthcheck");
  expectContains(webDockerfile, /org\.opencontainers\.image\.revision="\$\{VCS_REF\}"/, "web Dockerfile must annotate the OCI revision");

  expectContains(workerDockerfile, /ARG VCS_REF=unknown/, "worker Dockerfile must declare the revision build arg");
  expectContains(workerDockerfile, /org\.opencontainers\.image\.revision="\$\{VCS_REF\}"/, "worker Dockerfile must annotate the OCI revision");
  expectContains(workerDockerfile, /FROM node:24\.15\.0-bookworm-slim/, "worker Dockerfile must stay on Node 24.15");
  expectContains(workerDockerfile, /R 4\.4\.2|r-base/i, "worker Dockerfile must preserve the R runtime");
  expectContains(workerDockerfile, /preflight\.R/, "worker Dockerfile must run the preflight fixture");
  expectContains(workerDockerfile, /conditioning-regression\.R/, "worker Dockerfile must run the conditioning regression");
  expectContains(workerDockerfile, /group-selection-regression\.R/, "worker Dockerfile must run the group-selection regression");
  expectNotContains(workerDockerfile, /fixture|test harness/i, "worker final stage should not retain fixtures or harness text");

  expectContains(compose, /image:\s*\$\{SNA_WEB_IMAGE\}/, "compose must require the web image digest");
  expectContains(compose, /image:\s*\$\{SNA_WORKER_IMAGE\}/, "compose must require the worker image digest");
  expectContains(compose, /127\.0\.0\.1:3100:3000/, "compose must bind the web loopback port");
  expectContains(compose, /127\.0\.0\.1:3101:3000/, "compose must bind the worker loopback port");
  expectContains(compose, /read_only:\s*true/, "compose must keep containers read-only");
  expectContains(compose, /cap_drop:\s*\n\s*-\s*ALL/, "compose must drop all capabilities");
  expectContains(compose, /no-new-privileges:true/, "compose must disable privilege escalation");
  expectContains(compose, /tmpfs:/, "compose must define tmpfs mounts");
  expectContains(compose, /\/tmp\/open-sna-jobs/, "compose must mount the worker job tmpfs");
  expectContains(compose, /max-size:\s*"10m"/, "compose must cap log size");
  expectContains(compose, /max-file:\s*"5"/, "compose must cap log files");
  expectContains(compose, /SNA_RELEASE_SHA/, "compose must pass the release SHA");
  expectContains(compose, /SNA_DEPLOYMENT_ROLE=aliyun-primary/, "compose must declare the deployment role");

  expectContains(nginx, /origin\.sna\.hk/, "nginx config must cover the origin host");
  expectContains(nginx, /www\.sna\.hk/, "nginx config must cover the main host");
  expectContains(nginx, /sna\.hk/, "nginx config must cover the apex host");
  expectContains(nginx, /worker\.sna\.hk/, "nginx config must cover the worker host");
  expectContains(nginx, /limit_req_zone/, "nginx config must define rate limiting");
  expectContains(nginx, /client_max_body_size\s+6m;/i, "nginx config must enforce upload size");
  expectContains(nginx, /proxy_read_timeout\s+300s;/i, "nginx config must enforce upstream timeout");
  expectContains(nginx, /X-Robots-Tag\s+noindex,nofollow/i, "origin host must return noindex,nofollow");
  expectContains(nginx, /location\s+=\s*\/api\/open-sna\/analyze/, "worker host must proxy only the exact analysis path");
  expectContains(nginx, /proxy_set_header\s+Authorization\s+\$http_authorization;/, "worker proxy must forward authorization when present");
  expectNotContains(nginx, /(?:access_log|log_format)[^\n]*(?:authorization|request_body|body|auth)/i, "nginx config must not log authorization or request bodies");

  expectContains(webEnv, /SNA_RELEASE_SHA=/, "web env example must document the release SHA");
  expectContains(webEnv, /SNA_DEPLOYMENT_ROLE=aliyun-primary/, "web env example must document the deployment role");
  expectContains(webEnv, /OPEN_SNA_R_DISABLED=0/, "web env example must keep R enabled for the primary deployment");
  expectContains(webEnv, /NEXT_PUBLIC_SITE_URL=/, "web env example must document the public site URL");
  assert.ok(exampleValues(webEnv).every((value) => !/^(?:replace-with-|change-me-|secret|password|key|token)/i.test(value)));

  expectContains(workerEnv, /OPEN_SNA_R_WORKER_MODE=1/, "worker env example must enable worker mode");
  expectContains(workerEnv, /OPEN_SNA_R_WORKER_TOKEN=/, "worker env example must document the worker token slot");
  expectContains(workerEnv, /OPEN_SNA_R_WORKER_TMP_ROOT=\/tmp\/open-sna-jobs/, "worker env example must document the tmp root");
  expectContains(workerEnv, /R_LIBS_USER=/, "worker env example must document the R library path");
  assert.ok(exampleValues(workerEnv).every((value) => !/^(?:replace-with-|change-me-|secret|password|key|token)/i.test(value)));

  expectContains(preflight, /set -euo pipefail/, "preflight must use strict shell mode");
  expectContains(preflight, /docker compose/, "preflight must inspect compose");
  expectContains(preflight, /read-only/i, "preflight must be read-only");
  expectNotContains(preflight, /docker run|systemctl|apt-get|rm -rf|stop|start|kill/i, "preflight must not mutate the host");

  expectContains(verify, /set -euo pipefail/, "verify must use strict shell mode");
  expectContains(verify, /rAnalysis/, "verify must check the health payload");
  expectContains(verify, /401/, "verify must check unauthorized worker access");
  expectContains(verify, /no-store/i, "verify must check cache headers");
  expectContains(verify, /https/i, "verify must check HTTPS or redirects");
  expectNotContains(verify, /printenv|cat .*env|echo .*token/i, "verify must not print secrets");

  expectContains(rollback, /set -euo pipefail/, "rollback must use strict shell mode");
  expectContains(rollback, /CONFIRM_ROLLBACK=YES/, "rollback must require confirmation");
  expectContains(rollback, /previous digest/i, "rollback must require a previous digest");
  expectContains(rollback, /verify old worker/i, "rollback must validate the old worker first");
  expectNotContains(rollback, /docker system prune|rm -rf|reset --hard/i, "rollback must avoid destructive resets");

  expectContains(runbook, /4vCPU\/8GiB/i, "runbook must warn about current capacity");
  expectContains(runbook, /backup/i, "runbook must describe backup of the current state");
  expectContains(runbook, /rollback/i, "runbook must describe rollback");
  expectContains(runbook, /kill switch/i, "runbook must describe the kill switch");

  expectContains(workflow, /workflow_dispatch/, "release workflow must be manual only");
  const triggerBlock = workflowTriggerBlock(workflow);
  expectNotContains(triggerBlock, /push:|pull_request:/, "release workflow must not auto-trigger");
  expectContains(workflow, /release_sha/, "release workflow must accept the release SHA input");
  expectContains(workflow, /git rev-parse/, "release workflow must assert the exact checkout SHA");
  expectContains(workflow, /linux\/amd64/, "release workflow must build amd64 artifacts");
  expectContains(workflow, /org\.opencontainers\.image\.revision/, "release workflow must annotate OCI revision");
  expectContains(workflow, /sbom|provenance/i, "release workflow must generate SBOM/provenance");
  expectContains(workflow, /cosign|sign/i, "release workflow must sign releases");

  expectContains(ci, /pull_request:/, "CI workflow must run on pull requests");
  expectContains(ci, /push:\s*\n\s*branches:\s*\n\s*-\s*main/, "CI workflow must run on push to main");
  expectContains(ci, /node-quality/, "CI workflow must expose a stable check name");
  expectContains(ci, /npm ci/, "CI workflow must install dependencies");
  expectContains(ci, /npm test/, "CI workflow must run tests");
  expectContains(ci, /npm run typecheck/, "CI workflow must run typecheck");
  expectContains(ci, /npm run build -- --webpack/, "CI workflow must build with webpack");
  expectContains(ci, /npm run release:hygiene/, "CI workflow must run release hygiene");
});
