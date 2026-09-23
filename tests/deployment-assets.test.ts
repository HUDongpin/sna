import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
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

function workflowRunScripts(source: string) {
  const scripts: string[] = [];
  const lines = source.split(/\r?\n/);
  let runIndent = -1;
  for (const line of lines) {
    const runMatch = line.match(/^(\s*)run:\s*\|\s*$/);
    if (runMatch) {
      runIndent = runMatch[1].length;
      continue;
    }
    if (runIndent < 0) continue;
    const lineIndent = line.match(/^\s*/)?.[0].length || 0;
    if (line.trim().length === 0 || lineIndent > runIndent) {
      scripts.push(line);
      continue;
    }
    runIndent = -1;
  }
  return scripts.join("\n");
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

function nginxServerBlocks(source: string) {
  const blocks: string[] = [];
  const serverStart = /\bserver\s*\{/g;
  let match: RegExpExecArray | null;
  while ((match = serverStart.exec(source)) !== null) {
    const openingBrace = source.indexOf("{", match.index);
    let depth = 0;
    let end = -1;
    for (let index = openingBrace; index < source.length; index += 1) {
      if (source[index] === "{") depth += 1;
      if (source[index] === "}") depth -= 1;
      if (depth === 0) {
        end = index + 1;
        break;
      }
    }
    assert.ok(end > openingBrace, "every nginx server block must close");
    blocks.push(source.slice(match.index, end));
    serverStart.lastIndex = end;
  }
  return blocks;
}

function createFakeOriginCurl() {
  const fakeBin = mkdtempSync(path.join(tmpdir(), "sna-origin-curl-"));
  const fakeCurl = path.join(fakeBin, "curl");
  writeFileSync(
    fakeCurl,
    `#!/usr/bin/env bash
set -euo pipefail

headers_file=""
body_file=""
method="GET"
url=""
write_format=""
connect_timeout=""
max_time=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    -D|--dump-header)
      headers_file="$2"
      shift 2
      ;;
    -o|--output)
      body_file="$2"
      shift 2
      ;;
    -w|--write-out)
      write_format="$2"
      shift 2
      ;;
    -X|--request)
      method="$2"
      shift 2
      ;;
    --connect-timeout)
      connect_timeout="$2"
      shift 2
      ;;
    --max-time)
      max_time="$2"
      shift 2
      ;;
    -*)
      shift
      ;;
    *)
      url="$1"
      shift
      ;;
  esac
done

if [ "\${FAKE_REQUIRE_TIMEOUTS:-0}" = "1" ]; then
  [ "$connect_timeout" = "2" ] || exit 28
  [ "$max_time" = "5" ] || exit 28
fi

if [ "\${FAKE_CURL_EXIT_28:-0}" = "1" ]; then
  if [ -n "\${FAKE_CURL_DELAY_SECONDS:-}" ]; then
    sleep "$FAKE_CURL_DELAY_SECONDS"
  fi
  exit 28
fi

case "$method:$url" in
  GET:*/api/health)
    status="\${FAKE_HEALTH_STATUS:-200}"
    : > "$headers_file"
    if [ "\${FAKE_HEALTH_EARLY_CACHE_CONTROL+x}" = "x" ]; then
      printf 'HTTP/1.1 103 Early\r\nCache-Control: %s\r\n\r\n' "$FAKE_HEALTH_EARLY_CACHE_CONTROL" >> "$headers_file"
    fi
    printf 'HTTP/1.1 %s Health\r\n' "$status" >> "$headers_file"
    if [ "\${FAKE_HEALTH_OMIT_CACHE_CONTROL:-0}" != "1" ]; then
      printf 'Cache-Control: %s\r\n' "\${FAKE_HEALTH_CACHE_CONTROL-no-store}" >> "$headers_file"
    fi
    printf '\r\n' >> "$headers_file"
    if [ "\${FAKE_HEALTH_BODY+x}" = "x" ]; then
      printf '%s' "$FAKE_HEALTH_BODY" > "$body_file"
    else
      printf '{"status":"ok","releaseSha":"%s","deploymentRole":"%s","rAnalysis":"%s"}' \\
        "\${FAKE_HEALTH_RELEASE_SHA:-}" \\
        "\${FAKE_HEALTH_ROLE:-aliyun-primary}" \\
        "\${FAKE_HEALTH_R_ANALYSIS:-disabled}" > "$body_file"
    fi
    ;;
  GET:*/)
    status="\${FAKE_ROOT_STATUS:-307}"
    : > "$headers_file"
    if [ "\${FAKE_ROOT_EARLY_LOCATION+x}" = "x" ]; then
      printf 'HTTP/1.1 103 Early\r\nLocation: %s\r\nX-Robots-Tag: %s\r\n\r\n' "$FAKE_ROOT_EARLY_LOCATION" "\${FAKE_ROOT_EARLY_ROBOTS:-noindex,nofollow}" >> "$headers_file"
    fi
    printf 'HTTP/1.1 %s Redirect\r\nLocation: %s\r\n' \\
      "$status" "\${FAKE_ROOT_LOCATION:-/en}" >> "$headers_file"
    if [ "\${FAKE_ROOT_OMIT_ROBOTS:-0}" != "1" ]; then
      printf 'X-Robots-Tag: %s\r\n' "\${FAKE_ROBOTS_HEADER:-noindex,nofollow}" >> "$headers_file"
    fi
    printf '\r\n' >> "$headers_file"
    : > "$body_file"
    ;;
  POST:*/api/open-sna/analyze)
    status="\${FAKE_UPLOAD_STATUS:-503}"
    : > "$headers_file"
    if [ "\${FAKE_UPLOAD_EARLY_CACHE_CONTROL+x}" = "x" ]; then
      printf 'HTTP/1.1 103 Early\r\nCache-Control: %s\r\n\r\n' "$FAKE_UPLOAD_EARLY_CACHE_CONTROL" >> "$headers_file"
    fi
    printf 'HTTP/1.1 %s Disabled\r\n' "$status" >> "$headers_file"
    if [ "\${FAKE_UPLOAD_OMIT_CACHE_CONTROL:-0}" != "1" ]; then
      printf 'Cache-Control: %s\r\n' "\${FAKE_UPLOAD_CACHE_CONTROL-no-store}" >> "$headers_file"
    fi
    printf '\r\n' >> "$headers_file"
    if [ "\${FAKE_UPLOAD_BODY+x}" = "x" ]; then
      printf '%s' "$FAKE_UPLOAD_BODY" > "$body_file"
    else
      printf '{"code":"%s"}' "\${FAKE_UPLOAD_CODE:-R_ENGINE_DISABLED}" > "$body_file"
    fi
    ;;
  *)
    echo "unexpected fake curl request" >&2
    exit 22
    ;;
esac

case "$write_format" in
  *time_total*) printf '%s\n%s\n' "$status" "\${FAKE_UPLOAD_TIME_TOTAL-0.125}" ;;
  *http_code*) printf '%s' "$status" ;;
  "") ;;
  *) exit 22 ;;
esac
`,
    { mode: 0o755 },
  );
  return fakeBin;
}

function createFakePreflightCommands() {
  const fakeBin = mkdtempSync(path.join(tmpdir(), "sna-preflight-bin-"));
  writeFileSync(
    path.join(fakeBin, "stat"),
    `#!/usr/bin/env bash
set -euo pipefail
if [ "$1" != "-c" ]; then exit 2; fi
case "$2" in
  %U) printf 'root\n' ;;
  %a) printf '600\n' ;;
  *) exit 2 ;;
esac
`,
    { mode: 0o755 },
  );
  writeFileSync(
    path.join(fakeBin, "docker"),
    "#!/usr/bin/env bash\nset -euo pipefail\nexit 0\n",
    { mode: 0o755 },
  );
  writeFileSync(
    path.join(fakeBin, "ss"),
    "#!/usr/bin/env bash\nset -euo pipefail\nexit 0\n",
    { mode: 0o755 },
  );
  return fakeBin;
}

test("aliyun deployment assets are present and pinned to the requested bases", () => {
  const webDockerfile = read("Dockerfile.web");
  const workerDockerfile = read("Dockerfile.open-sna-worker");
  const compose = read("deploy/aliyun/compose.yaml");
  const nginx = read("deploy/aliyun/nginx/sna.conf.example");
  const originNginx = read("deploy/aliyun/nginx/origin-only.conf.example");
  const webEnv = read("deploy/aliyun/env/web.env.example");
  const workerEnv = read("deploy/aliyun/env/worker.env.example");
  const runbook = read("deploy/aliyun/RUNBOOK.md");
  const preflight = read("deploy/aliyun/scripts/preflight.sh");
  const verify = read("deploy/aliyun/scripts/verify.sh");
  const verifyOrigin = read("deploy/aliyun/scripts/verify-origin.sh");
  const deploymentValidator = read("deploy/aliyun/scripts/deployment-validator.py");
  const rollback = read("deploy/aliyun/scripts/rollback.sh");
  const workflow = read(".github/workflows/release-containers.yml");
  const ci = read(".github/workflows/ci.yml");
  const dockerignore = read(".dockerignore");

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
  expectContains(workerDockerfile, /FROM worker-base AS verify[\s\S]*WORKDIR \/app/, "worker verify stage must set an explicit working directory");
  expectContains(workerDockerfile, /Rscript --vanilla \/app\/analysis\/open-sna\/verify-conditioning\.R/, "worker verify stage must invoke regression scripts by absolute path");
  expectContains(workerDockerfile, /Rscript --vanilla \/app\/analysis\/open-sna\/verify-group-selection\.R/, "worker verify stage must invoke group selection by absolute path");
  expectContains(workerDockerfile, /COPY analysis\/open-sna\/tests\/conditioning-regression\.R/, "worker verify stage must copy the conditioning regression harness");
  expectContains(workerDockerfile, /COPY analysis\/open-sna\/tests\/group-selection-regression\.R/, "worker verify stage must copy the group-selection regression harness");
  expectContains(read("analysis/open-sna/verify-conditioning.R"), /system2\(rscript_bin/, "conditioning wrapper must execute the direct regression script");
  expectContains(read("analysis/open-sna/verify-group-selection.R"), /system2\(rscript_bin/, "group-selection wrapper must execute the direct regression script");
  expectContains(workerDockerfile, /preflight\.R/, "worker Dockerfile must run the preflight fixture");
  expectContains(workerDockerfile, /verify-conditioning\.R/, "worker Dockerfile must run the conditioning regression via the wrapper");
  expectContains(workerDockerfile, /verify-group-selection\.R/, "worker Dockerfile must run the group-selection regression via the wrapper");
  expectContains(workerDockerfile, /analysis\/analyze\.R/, "worker final stage must include the analysis entrypoint");
  expectContains(workerDockerfile, /COPY --from=web-build \/app\/\.next\/standalone/, "worker Dockerfile must embed the standalone server");
  expectContains(workerDockerfile, /COPY --from=web-build \/app\/\.next\/static/, "worker Dockerfile must include static assets");
  expectContains(workerDockerfile, /COPY --from=web-build \/app\/public/, "worker Dockerfile must include public assets");
  expectContains(workerDockerfile, /USER open-sna/, "worker Dockerfile must run as non-root");
  expectContains(workerDockerfile, /CMD \["sh", "-c", "Rscript --vanilla \/app\/analysis\/preflight\.R && exec node \/app\/server\.js"\]/, "worker Dockerfile must healthcheck and start through the standalone server");
  const workerFinalStage = workerDockerfile.slice(workerDockerfile.indexOf("FROM worker-base AS final"));
  expectNotContains(workerFinalStage, /analysis\/open-sna\/tests|fixture|test harness/i, "worker final stage should not retain tests or harness text");
  const webRuntimeStage = webDockerfile.slice(webDockerfile.indexOf("FROM node:24.15.0-bookworm-slim@sha256:4e6b70dd6cbfc88c8157ba19aa3d9f9cce6ba4703576d55459e45efcbc9c5f5d AS runtime"));
  expectContains(webRuntimeStage, /apt-get update[\s\S]*apt-get upgrade/, "web runtime must refresh Debian security packages");
  expectContains(webRuntimeStage, /rm -rf[\s\S]*\/usr\/local\/lib\/node_modules\/npm[\s\S]*\/usr\/local\/lib\/node_modules\/corepack[\s\S]*\/usr\/local\/bin\/npm[\s\S]*\/usr\/local\/bin\/npx[\s\S]*\/usr\/local\/bin\/corepack/, "web runtime must explicitly remove npm/npx/corepack tooling");
  expectNotContains(webRuntimeStage, /(?:^|\n)\s*RUN\b[^\n]*(?:npm ci|npm install|corepack prepare)\b/i, "web runtime must not install or reintroduce npm tooling");
  const workerBaseStage = workerDockerfile.slice(workerDockerfile.indexOf("FROM rocker/r-ver:4.4.2@sha256:df26749182af64d5263bf64149d51a427b476ed28c4e046997143be3f97fdd7c AS worker-base"));
  expectContains(workerBaseStage, /apt-get update[\s\S]*apt-get upgrade/, "worker base must refresh Debian security packages");
  expectContains(dockerignore, /\*\.md/, "Docker build context must exclude repository Markdown and internal reports");
  expectContains(dockerignore, /!analysis\/open-sna\/tests\/conditioning-regression\.R/, "Docker context must retain the conditioning regression source");
  expectContains(dockerignore, /!analysis\/open-sna\/tests\/group-selection-regression\.R/, "Docker context must retain the group selection regression source");

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
  expectContains(webService, /env_file:\s*\n\s*-\s*\/opt\/sna\/secrets\/web\.env/, "compose must source the root-owned web env file");
  expectNotContains(webService, /OPEN_SNA_R_DISABLED\s*:/, "compose must not override the web R kill switch");
  expectNotContains(webService, /OPEN_SNA_R_API_URL\s*:/, "compose must not override the web R worker URL");
  expectNotContains(webService, /OPEN_SNA_R_API_TOKEN\s*:/, "compose must not override the web R worker token");
  expectNotContains(compose, /https:\/\/worker\.sna\.hk\/api\/open-sna\/analyze/, "compose must not hard-code a public worker URL");
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
  expectContains(nginx, /limit_req zone=sna_api burst=1 nodelay;/, "nginx config must allow only a burst of one request");
  expectContains(nginx, /limit_conn\s+sna_conn\s+1;/, "nginx config must limit worker concurrency to one");
  expectNotContains(nginx, /(?:access_log|log_format)[^\n]*(?:authorization|request_body|body|auth)/i, "nginx config must not log authorization or request bodies");

  const originServerBlocks = nginxServerBlocks(originNginx);
  assert.equal(originServerBlocks.length, 2, "origin-only nginx must contain exactly two server blocks");
  const originHttpBlock = originServerBlocks.find((block) => /listen\s+80\s*;/.test(block));
  const originHttpsBlock = originServerBlocks.find((block) => /listen\s+443\s+ssl\s+http2\s*;/.test(block));
  assert.ok(originHttpBlock, "origin-only nginx must contain the HTTP server block");
  assert.ok(originHttpsBlock, "origin-only nginx must contain the HTTPS server block");
  for (const block of [originHttpBlock, originHttpsBlock]) {
    expectContains(block, /server_name\s+origin\.sna\.hk\s*;/, "each origin server block must bind only origin.sna.hk");
    expectContains(block, /X-Robots-Tag\s+noindex,nofollow\s+always\s*;/i, "each origin server block must return noindex,nofollow");
  }
  expectContains(originHttpBlock, /return\s+301\s+https:\/\/origin\.sna\.hk\$request_uri\s*;/, "origin-only HTTP must redirect to origin HTTPS");
  expectContains(originHttpsBlock, /proxy_pass\s+http:\/\/127\.0\.0\.1:3100\s*;/, "origin-only nginx must proxy web through loopback");
  expectContains(originHttpsBlock, /proxy_set_header\s+Authorization\s+""\s*;/, "origin-only nginx must strip client authorization before proxying to web");
  expectNotContains(originNginx, /server_name\s+(?:sna\.hk|www\.sna\.hk|worker\.sna\.hk)\b/, "origin-only nginx must not contain apex, www, or worker servers");
  expectNotContains(originNginx, /listen\s+(?:3100|3101)\b/, "origin-only nginx must not expose container ports");
  expectNotContains(originNginx, /127\.0\.0\.1:3101|Authorization\s+\$http_authorization/, "origin-only nginx must not proxy or authorize the worker");

  expectContains(webEnv, /SNA_RELEASE_SHA=/, "web env example must document the release SHA");
  expectContains(webEnv, /SNA_DEPLOYMENT_ROLE=aliyun-primary/, "web env example must document the deployment role");
  expectContains(webEnv, /^OPEN_SNA_R_DISABLED=1$/m, "web env example must disable public R by default");
  expectContains(webEnv, /NEXT_PUBLIC_SITE_URL=/, "web env example must document the public site URL");
  assert.ok(exampleValues(webEnv).every((value) => !/^(?:replace-with-|change-me-|secret|password)/i.test(value)));
  expectContains(webEnv, /only after.*approved.*enable/i, "web env example must gate future R enablement on approval");
  expectContains(webEnv, /^#\s*OPEN_SNA_R_API_URL=/m, "web env example must document the disabled worker URL slot as a comment");
  expectContains(webEnv, /^#\s*OPEN_SNA_R_API_TOKEN=/m, "web env example must document the disabled worker token slot as a comment");
  expectNotContains(webEnv, /^\s*OPEN_SNA_R_API_(?:URL|TOKEN)=/m, "web env example must not require worker configuration while disabled");
  assert.ok(exampleValues(webEnv).every((value) => !/^(?:http:\/\/sna-r-worker|token=)/i.test(value)));
  const webTokenPlaceholder = webEnv.match(/^#\s*OPEN_SNA_R_API_TOKEN=(.*)$/m)?.[1].trim() || "";
  assert.ok(webTokenPlaceholder.length > 0 && webTokenPlaceholder.length < 32, "web token placeholder must not satisfy the runtime token length contract");

  expectContains(workerEnv, /OPEN_SNA_R_WORKER_MODE=1/, "worker env example must enable worker mode");
  expectContains(workerEnv, /OPEN_SNA_R_WORKER_TOKEN=/, "worker env example must document the worker token slot");
  expectContains(workerEnv, /OPEN_SNA_R_WORKER_TMP_ROOT=\/tmp\/open-sna-jobs/, "worker env example must document the tmp root");
  expectContains(workerEnv, /R_LIBS_USER=\/opt\/open-sna\/r-library/, "worker env example must document the exact R library path");
  assert.ok(exampleValues(workerEnv).every((value) => !/^(?:replace-with-|change-me-|secret|password)/i.test(value)));
  const workerTokenPlaceholder = workerEnv.match(/^OPEN_SNA_R_WORKER_TOKEN=(.*)$/m)?.[1].trim() || "";
  assert.ok(workerTokenPlaceholder.length > 0 && workerTokenPlaceholder.length < 32, "worker token placeholder must not satisfy the runtime token length contract");

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
  expectContains(preflight, /OPEN_SNA_R_DISABLED/, "preflight must inspect the web R kill switch");
  expectContains(preflight, /env_assignment_count/, "preflight must require unique token assignments");
  expectContains(preflight, /OPEN_SNA_R_API_TOKEN/, "preflight must inspect the web token only when configured");
  expectContains(preflight, /OPEN_SNA_R_WORKER_TOKEN/, "preflight must inspect the worker token");
  expectContains(preflight, /token-files\s+"\$web_env_file"\s+"\$worker_env_file"/, "preflight must validate tokens from files without argv token values");
  expectNotContains(preflight, /python3[^\n]*(?:\$web_token|\$worker_token)/, "preflight must never place token values in Python argv");
  expectContains(preflight, /command -v python3/, "preflight must fail closed when python3 is unavailable");
  expectContains(preflight, /deployment-validator\.py[\s\S]*worker-url/, "preflight must validate worker URLs structurally");
  expectContains(preflight, /printf\s+['"]PASS\\n['"]/, "preflight must print PASS on success");
  expectContains(preflight, /printf\s+['"]FAIL\\n['"]/, "preflight must print FAIL on failure");
  expectNotContains(preflight, /df\s+-h|free\s+-h|echo\s+.*(?:digest|env file|token)|printenv|cat\s+.*env/i, "preflight must not print host details, env values, or tokens");
  expectNotContains(preflight, /docker run|systemctl|apt-get|rm -rf|stop|start|kill/i, "preflight must not mutate the host");

  expectContains(verify, /set -euo pipefail/, "verify must use strict shell mode");
  expectContains(verify, /mktemp/, "verify must use temporary files");
  expectContains(verify, /trap/, "verify must clean up temporary files");
  expectContains(verify, /rAnalysis/, "verify must check the health payload");
  expectContains(verify, /401/, "verify must check unauthorized worker access");
  expectContains(verify, /WORKER_UNAUTHORIZED/, "verify must check the worker unauthorized body");
  expectContains(verify, /X-Robots-Tag/i, "verify must check the origin robots header");
  expectContains(verify, /404/, "verify must check the worker root 404");
  expectContains(verify, /base_url=.*SNA_BASE_URL/, "verify must check the public base separately from origin");
  expectContains(verify, /usage: verify\.sh \[https:\/\/www\.sna\.hk\] \[https:\/\/origin\.sna\.hk\] \[https:\/\/sna\.hk\] https:\/\/worker\.sna\.hk/, "verify usage must document all endpoint arguments");
  expectContains(verify, /https:\/\/sna\.hk/, "verify must support the apex redirect check");
  expectContains(verify, /(301|308)/, "verify must allow apex 301 or 308 redirects");
  assert.ok(
    verify.includes("root status error: expected 307, got") &&
      verify.includes("grep -Eqi '^location: (/?en/?|https://www\\.sna\\.hk/en/?)(\\?.*)?$'"),
    "verify must pin the www root redirect to /en with HTTP 307",
  );
  expectContains(verify, /no-store/i, "verify must check cache headers");
  expectContains(verify, /worker network request failed/, "verify must separate worker network failures");
  expectContains(verify, /worker root network request failed/, "verify must separate worker root network failures");
  expectContains(verify, /apex network request failed/, "verify must separate apex network failures");
  expectContains(verify, /www root network request failed/, "verify must separate www network failures");
  expectContains(verify, /strict-transport-security/i, "verify must check HSTS when the config emits it");
  expectNotContains(verify, /printenv|cat .*env|echo .*token/i, "verify must not print secrets");

  expectContains(verifyOrigin, /set -euo pipefail/, "origin verify must use strict shell mode");
  expectContains(verifyOrigin, /SNA_RELEASE_SHA/, "origin verify must require the expected release SHA from the environment");
  expectContains(verifyOrigin, /\^\[0-9a-f\]\{40\}\$/, "origin verify must require an exact lowercase 40-character SHA");
  expectContains(verifyOrigin, /command -v curl/, "origin verify must fail closed when curl is unavailable");
  expectContains(verifyOrigin, /command -v python3/, "origin verify must fail closed when python3 is unavailable");
  expectContains(verifyOrigin, /--connect-timeout\s+2/, "origin verify must bound every connection attempt");
  expectContains(verifyOrigin, /--max-time\s+5/, "origin verify must cap total request time at five seconds");
  expectContains(verifyOrigin, /%\{time_total\}/, "origin verify must record upload time_total");
  expectContains(verifyOrigin, /deployment-validator\.py/, "origin verify must use the structured deployment validator");
  expectContains(verifyOrigin, /health-json/, "origin verify must parse the health payload structurally");
  expectContains(verifyOrigin, /upload-json/, "origin verify must parse the disabled upload payload structurally");
  expectContains(verifyOrigin, /upload-metrics/, "origin verify must validate status and upload timing together");
  expectContains(verifyOrigin, /printf\s+['"]PASS\\n['"]/, "origin verify must print only PASS on success");
  expectContains(verifyOrigin, /printf\s+['"]FAIL\\n['"]/, "origin verify must print only FAIL on failure");
  expectNotContains(verifyOrigin, /\bgrep\b/, "origin verify must not search JSON or headers as unstructured strings");
  expectNotContains(verifyOrigin, /SNA_WORKER_URL|worker\.sna\.hk|OPEN_SNA_R_API_TOKEN/i, "origin verify must not require a public worker or token");
  expectNotContains(verifyOrigin, /printenv|\becho\b|cat .*env/i, "origin verify must not print probe details or secrets");

  expectContains(deploymentValidator, /json\.load/, "deployment validator must decode JSON structurally");
  expectContains(deploymentValidator, /object_pairs_hook/, "deployment validator must reject duplicate JSON keys");
  expectContains(deploymentValidator, /payload\.get\("status"\)/, "deployment validator must read top-level health status");
  expectContains(deploymentValidator, /payload\.get\("releaseSha"\)/, "deployment validator must read top-level release SHA");
  expectContains(deploymentValidator, /payload\.get\("deploymentRole"\)/, "deployment validator must read the top-level deployment role");
  expectContains(deploymentValidator, /payload\.get\("rAnalysis"\)/, "deployment validator must read top-level R status");
  expectContains(deploymentValidator, /payload\.get\("code"\)/, "deployment validator must read the top-level upload code");
  expectContains(deploymentValidator, /urlsplit/, "deployment validator must parse URLs structurally");
  expectContains(deploymentValidator, /import ipaddress/, "deployment validator must validate IP literals structurally");
  expectContains(deploymentValidator, /def validate_hostname/, "deployment validator must enforce the explicit hostname contract");
  expectContains(deploymentValidator, /"%" in parsed\.netloc/, "deployment validator must reject percent escapes in hosts");
  expectContains(deploymentValidator, /parsed\.query/, "deployment validator must reject URL queries");
  expectContains(deploymentValidator, /parsed\.fragment/, "deployment validator must reject URL fragments");
  expectContains(deploymentValidator, /parsed\.username/, "deployment validator must reject URL usernames");
  expectContains(deploymentValidator, /parsed\.password/, "deployment validator must reject URL passwords");
  expectContains(deploymentValidator, /parsed\.port/, "deployment validator must validate ports through the parser");
  expectContains(deploymentValidator, /\/api\/open-sna\/analyze/, "deployment validator must require the exact analyze pathname");
  expectContains(deploymentValidator, /Decimal/, "deployment validator must parse time_total as a finite number");
  expectContains(deploymentValidator, /def validate_visible_ascii_token/, "deployment validator must require visible ASCII tokens");
  expectContains(deploymentValidator, /33\s*<=.*<=\s*126/, "deployment validator must restrict every token byte to visible ASCII");
  expectContains(deploymentValidator, /def normalize_placeholder_token/, "deployment validator must detect quoted placeholders");
  expectContains(deploymentValidator, /token-files/, "deployment validator must validate web and worker token files");
  expectNotContains(deploymentValidator, /\bprint\s*\(/, "deployment validator must never print probe data");

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
  expectContains(runbook, /origin-only stage/i, "runbook must identify the bounded origin-only rollout stage");
  expectContains(runbook, /only.*origin\.sna\.hk.*DNS|DNS.*only.*origin\.sna\.hk/i, "runbook must limit this stage to origin DNS");
  expectContains(runbook, /worker.*loopback|loopback.*worker/i, "runbook must keep the worker on loopback");
  expectContains(runbook, /no alert group[\s\S]*public R[\s\S]*(?:forbidden|must remain disabled)/i, "runbook must forbid public R without an alert group");
  expectContains(runbook, /never save[\s\S]*full `?docker compose config`?/i, "runbook must forbid retaining expanded compose output");
  expectContains(runbook, /first ECS deployment[\s\S]*stop[\s\S]*sna-r-worker[\s\S]*sna-web[\s\S]*restore[\s\S]*Nginx[\s\S]*single security-group rule/i, "runbook must define the first-deployment rollback without prior digests");
  expectContains(runbook, /no previous image digest|not.*previous.*digest/i, "runbook must not pretend a previous digest exists on first deployment");
  expectContains(runbook, /Python 3\.6\.8/, "runbook must record the verified ECS python3 compatibility floor");
  expectContains(runbook, /t-hk06vkvrcei3e2o/, "runbook must retain the Cloud Assistant dependency evidence identifier");
  expectContains(runbook, /origin DNS[\s\S]*exact pre-state[\s\S]*record ID/i, "runbook must record exact origin DNS pre-state and record identity before rollout");
  expectContains(runbook, /origin vhost[\s\S]*exact path[\s\S]*(?:existed|absent)[\s\S]*record ID/i, "runbook must record exact origin vhost pre-state before rollout");
  expectContains(runbook, /security-group[\s\S]*exact rule ID[\s\S]*pre-state/i, "runbook must record the exact security-group rule before rollout");
  const firstRollbackSection = runbook.slice(runbook.indexOf("## First ECS deployment rollback"), runbook.indexOf("## DNS boundary"));
  const dnsRollbackIndex = firstRollbackSection.indexOf("Origin DNS rollback");
  const vhostRollbackIndex = firstRollbackSection.indexOf("Origin vhost rollback");
  const nginxValidationIndex = firstRollbackSection.indexOf("`nginx -t`");
  const externalConfirmationIndex = firstRollbackSection.indexOf("External origin confirmation");
  const securityGroupRollbackIndex = firstRollbackSection.indexOf("Security-group rollback");
  assert.ok(
    dnsRollbackIndex >= 0 &&
      dnsRollbackIndex < vhostRollbackIndex &&
      vhostRollbackIndex < nginxValidationIndex &&
      nginxValidationIndex < externalConfirmationIndex &&
      externalConfirmationIndex < securityGroupRollbackIndex,
    "first rollback must restore exact DNS, then vhost, validate/reload Nginx, externally confirm, and finally restore the exact security-group rule",
  );
  expectContains(firstRollbackSection, /DNS[\s\S]*existed[\s\S]*restore[\s\S]*record ID[\s\S]*absent[\s\S]*delete only[\s\S]*created record ID/i, "DNS rollback must distinguish restore from exact-record deletion");
  expectContains(firstRollbackSection, /vhost[\s\S]*existed[\s\S]*atomically restore[\s\S]*absent[\s\S]*delete only[\s\S]*exact new file/i, "vhost rollback must restore or remove only the recorded path");
  expectContains(firstRollbackSection, /must not perform broad|no broad deletion/i, "rollback must prohibit broad deletion");

  const preflightTemp = mkdtempSync(path.join(tmpdir(), "sna-deployment-assets-"));
  const preflightFailure = runShell("deploy/aliyun/scripts/preflight.sh", {
    SNA_WEB_IMAGE_DIGEST: "short",
    SNA_WORKER_IMAGE_DIGEST: "short",
    OPEN_SNA_WEB_ENV_FILE: path.join(preflightTemp, "missing-web.env"),
    OPEN_SNA_WORKER_ENV_FILE: path.join(preflightTemp, "missing-worker.env"),
    DOCKER_HOST: "unix:///does-not-exist",
  });
  assert.notEqual(preflightFailure.status, 0, "preflight must fail without required env files and digests");
  assert.equal((preflightFailure.stderr || "") + (preflightFailure.stdout || ""), "FAIL\n");

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
  assert.ok((workflow.match(/^\s+RELEASE_SHA:\s*\$\{\{ inputs\.release_sha \}\}\s*$/gm) || []).length >= 3, "each shell step using the dispatch SHA must receive it through step env");
  const workflowShell = workflowRunScripts(workflow);
  expectNotContains(workflowShell, /\$\{\{\s*inputs\.release_sha\s*\}\}/, "release workflow shell must not directly interpolate the dispatch SHA");
  expectContains(workflowShell, /\[\[ "\$RELEASE_SHA" =~ \^\[0-9a-f\]\{40\}\$ \]\]/, "release workflow must validate the env SHA before shell use");
  assert.ok(workflowShell.indexOf('[[ "$RELEASE_SHA" =~ ^[0-9a-f]{40}$ ]]') < workflowShell.indexOf("git fetch origin main"), "release workflow must validate SHA format before Git operations");
  expectContains(workflowShell, /test "\$\(git rev-parse --verify HEAD\)" = "\$RELEASE_SHA"/, "release workflow must pin HEAD to the env-provided SHA");
  expectContains(workflow, /linux\/amd64/, "release workflow must build amd64 artifacts");
  expectContains(workflow, /org\.opencontainers\.image\.revision/, "release workflow must annotate OCI revision");
  expectContains(workflow, /sbom|provenance/i, "release workflow must generate SBOM/provenance");
  expectContains(workflow, /cosign|sign/i, "release workflow must sign releases");
  expectContains(workflow, /Node source gate/, "release workflow must gate with Node checks before pushes");
  expectContains(workflow, /steps\.web_build\.outputs\.digest/, "release workflow must work with web digests");
  expectContains(workflow, /steps\.worker_build\.outputs\.digest/, "release workflow must work with worker digests");
  expectContains(workflow, /aquasecurity\/trivy-action@ed142fd0673e97e23eac54620cfb913e5ce36c25/, "release workflow must pin the official Trivy action to the requested commit");
  expectContains(workflow, /Confirm prebuilt images are loaded locally/, "release workflow must verify the prebuilds are local before scanning");
  expectContains(workflow, /file: Dockerfile\.web/, "release workflow must use the root web Dockerfile");
  expectContains(workflow, /file: Dockerfile\.open-sna-worker/, "release workflow must use the root worker Dockerfile");
  expectContains(workflow, /target:\s*verify/, "release workflow must build the worker verify stage");
  expectContains(workflow, /npm ci/, "release workflow must install dependencies in the source gate");
  expectContains(workflow, /npm run release:hygiene/, "release workflow must run release hygiene in the source gate");
  expectContains(workflow, /release-digests\.json/, "release workflow must emit a digest manifest");
  expectContains(workflow, /upload-artifact/i, "release workflow must upload the digest manifest");
  assert.ok(
    stepIndex(workflow, "Set up Buildx") < stepIndex(workflow, "Node source gate") &&
      stepIndex(workflow, "Node source gate") < stepIndex(workflow, "Build worker verify stage") &&
      stepIndex(workflow, "Build worker verify stage") < stepIndex(workflow, "Build web final image") &&
      stepIndex(workflow, "Build web final image") < stepIndex(workflow, "Build worker final image") &&
      stepIndex(workflow, "Build worker final image") < stepIndex(workflow, "Confirm prebuilt images are loaded locally") &&
      stepIndex(workflow, "Confirm prebuilt images are loaded locally") < stepIndex(workflow, "Scan web image with Trivy") &&
      stepIndex(workflow, "Scan web image with Trivy") < stepIndex(workflow, "Scan worker image with Trivy") &&
      stepIndex(workflow, "Scan worker image with Trivy") < stepIndex(workflow, "Log in to GHCR") &&
      stepIndex(workflow, "Build worker final image") < stepIndex(workflow, "Log in to GHCR") &&
      stepIndex(workflow, "Log in to GHCR") < stepIndex(workflow, "Build and push web image") &&
      stepIndex(workflow, "Build and push web image") < stepIndex(workflow, "Build and push worker image"),
    "release workflow must keep buildx first, then source/verify gates, then local prebuild verification, then Trivy scans, then login and pushes",
  );

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

test("origin-only verification applies bounded curl timeouts and accepts the five-second boundary", () => {
  const fakeBin = createFakeOriginCurl();
  const deployedReleaseSha = "a".repeat(40);
  const baseEnvironment = {
    PATH: `${fakeBin}:${process.env.PATH || ""}`,
    SNA_ORIGIN_URL: "https://origin.sna.hk",
    SNA_RELEASE_SHA: deployedReleaseSha,
    FAKE_HEALTH_RELEASE_SHA: deployedReleaseSha,
    FAKE_HEALTH_ROLE: "aliyun-primary",
    FAKE_HEALTH_R_ANALYSIS: "disabled",
    FAKE_UPLOAD_STATUS: "503",
    FAKE_UPLOAD_CODE: "R_ENGINE_DISABLED",
    FAKE_UPLOAD_TIME_TOTAL: "5",
    FAKE_REQUIRE_TIMEOUTS: "1",
  };

  try {
    const success = runShell("deploy/aliyun/scripts/verify-origin.sh", baseEnvironment);
    assert.equal(success.status, 0, (success.stderr || "") + (success.stdout || ""));
    assert.equal((success.stderr || "") + (success.stdout || ""), "PASS\n");

    const finalHeaderWins = runShell("deploy/aliyun/scripts/verify-origin.sh", {
      ...baseEnvironment,
      FAKE_HEALTH_EARLY_CACHE_CONTROL: "public, max-age=3600",
      FAKE_UPLOAD_EARLY_CACHE_CONTROL: "public, max-age=3600",
      FAKE_ROOT_EARLY_LOCATION: "/zh-hant",
      FAKE_ROOT_EARLY_ROBOTS: "index,follow",
    });
    assert.equal(finalHeaderWins.status, 0, (finalHeaderWins.stderr || "") + (finalHeaderWins.stdout || ""));
    assert.equal((finalHeaderWins.stderr || "") + (finalHeaderWins.stdout || ""), "PASS\n");
  } finally {
    rmSync(fakeBin, { recursive: true, force: true });
  }
});

test("origin-only verification fails quickly and silently when curl exits 28", () => {
  const fakeBin = createFakeOriginCurl();
  const deployedReleaseSha = "a".repeat(40);
  const startedAt = Date.now();

  try {
    const result = runShell("deploy/aliyun/scripts/verify-origin.sh", {
      PATH: `${fakeBin}:${process.env.PATH || ""}`,
      SNA_ORIGIN_URL: "https://origin.sna.hk",
      SNA_RELEASE_SHA: deployedReleaseSha,
      FAKE_HEALTH_RELEASE_SHA: deployedReleaseSha,
      FAKE_CURL_DELAY_SECONDS: "0.05",
      FAKE_CURL_EXIT_28: "1",
      FAKE_REQUIRE_TIMEOUTS: "1",
    });
    const elapsedMilliseconds = Date.now() - startedAt;
    const output = (result.stderr || "") + (result.stdout || "");

    assert.notEqual(result.status, 0);
    assert.equal(output, "FAIL\n");
    assert.ok(elapsedMilliseconds >= 25, `fake curl delay was not applied: ${elapsedMilliseconds}ms`);
    assert.ok(elapsedMilliseconds < 2_000, `curl timeout failure took too long: ${elapsedMilliseconds}ms`);
    assert.doesNotMatch(output, /origin\.sna\.hk|api\/open-sna|response|secret|token/i);
  } finally {
    rmSync(fakeBin, { recursive: true, force: true });
  }
});

test("origin-only verification rejects structured response, header, redirect, SHA, and timing decoys", () => {
  const fakeBin = createFakeOriginCurl();
  const deployedReleaseSha = "a".repeat(40);
  const baseEnvironment = {
    PATH: `${fakeBin}:${process.env.PATH || ""}`,
    SNA_ORIGIN_URL: "https://origin.sna.hk",
    SNA_RELEASE_SHA: deployedReleaseSha,
    FAKE_HEALTH_RELEASE_SHA: deployedReleaseSha,
    FAKE_HEALTH_ROLE: "aliyun-primary",
    FAKE_HEALTH_R_ANALYSIS: "disabled",
    FAKE_UPLOAD_STATUS: "503",
    FAKE_UPLOAD_CODE: "R_ENGINE_DISABLED",
    FAKE_UPLOAD_TIME_TOTAL: "0.125",
  };
  const validHealth = {
    status: "ok",
    releaseSha: deployedReleaseSha,
    deploymentRole: "aliyun-primary",
    rAnalysis: "disabled",
  };
  const cases: Array<{ name: string; env: Record<string, string> }> = [
    {
      name: "wrong top-level health with nested valid decoy",
      env: {
        FAKE_HEALTH_BODY: JSON.stringify({
          status: "unavailable",
          releaseSha: "b".repeat(40),
          deploymentRole: "vercel-backup",
          rAnalysis: "configured",
          nested: { ...validHealth, marker: "TOP_SECRET_RESPONSE" },
        }),
      },
    },
    {
      name: "wrong top-level upload code with nested valid decoy",
      env: {
        FAKE_UPLOAD_BODY: JSON.stringify({
          code: "R_ENGINE_UNAVAILABLE",
          nested: { code: "R_ENGINE_DISABLED", marker: "TOP_SECRET_RESPONSE" },
        }),
      },
    },
    {
      name: "malformed health JSON containing valid strings",
      env: { FAKE_HEALTH_BODY: `${JSON.stringify(validHealth)} trailing-response-marker` },
    },
    {
      name: "duplicate top-level health key",
      env: {
        FAKE_HEALTH_BODY: `{"status":"unavailable","status":"ok","releaseSha":"${deployedReleaseSha}","deploymentRole":"aliyun-primary","rAnalysis":"disabled"}`,
      },
    },
    { name: "missing health no-store", env: { FAKE_HEALTH_OMIT_CACHE_CONTROL: "1" } },
    { name: "incorrect health no-store directive", env: { FAKE_HEALTH_CACHE_CONTROL: "private, no-store-ish" } },
    { name: "missing upload no-store", env: { FAKE_UPLOAD_OMIT_CACHE_CONTROL: "1" } },
    { name: "incorrect upload no-store directive", env: { FAKE_UPLOAD_CACHE_CONTROL: "private, no-store-ish" } },
    { name: "wrong health HTTP status", env: { FAKE_HEALTH_STATUS: "201" } },
    { name: "wrong upload HTTP status", env: { FAKE_UPLOAD_STATUS: "200" } },
    { name: "wrong root HTTP status", env: { FAKE_ROOT_STATUS: "200" } },
    { name: "wrong root location", env: { FAKE_ROOT_LOCATION: "/zh-hant" } },
    { name: "root location trailing slash", env: { FAKE_ROOT_LOCATION: "/en/" } },
    { name: "root absolute location", env: { FAKE_ROOT_LOCATION: "https://origin.sna.hk/en" } },
    { name: "root location query", env: { FAKE_ROOT_LOCATION: "/en?next=1" } },
    { name: "root location case change", env: { FAKE_ROOT_LOCATION: "/EN" } },
    { name: "root location double slash", env: { FAKE_ROOT_LOCATION: "//en" } },
    { name: "root location trailing space", env: { FAKE_ROOT_LOCATION: "/en " } },
    { name: "missing root noindex", env: { FAKE_ROOT_OMIT_ROBOTS: "1" } },
    { name: "incorrect root robots directives", env: { FAKE_ROBOTS_HEADER: "index,follow" } },
    {
      name: "early valid health header cannot rescue final invalid header",
      env: { FAKE_HEALTH_EARLY_CACHE_CONTROL: "no-store", FAKE_HEALTH_CACHE_CONTROL: "no-store-ish" },
    },
    {
      name: "early valid upload header cannot rescue missing final header",
      env: { FAKE_UPLOAD_EARLY_CACHE_CONTROL: "no-store", FAKE_UPLOAD_OMIT_CACHE_CONTROL: "1" },
    },
    {
      name: "early valid root headers cannot rescue final invalid headers",
      env: {
        FAKE_ROOT_EARLY_LOCATION: "/en",
        FAKE_ROOT_EARLY_ROBOTS: "noindex,nofollow",
        FAKE_ROOT_LOCATION: "/en/",
        FAKE_ROBOTS_HEADER: "index,follow",
      },
    },
    { name: "uppercase expected SHA", env: { SNA_RELEASE_SHA: deployedReleaseSha.toUpperCase() } },
    { name: "short expected SHA", env: { SNA_RELEASE_SHA: deployedReleaseSha.slice(0, 39) } },
    { name: "missing upload time_total", env: { FAKE_UPLOAD_TIME_TOTAL: "" } },
    { name: "non-numeric upload time_total", env: { FAKE_UPLOAD_TIME_TOTAL: "not-a-number" } },
    { name: "non-finite upload time_total", env: { FAKE_UPLOAD_TIME_TOTAL: "NaN" } },
    { name: "upload exceeds five seconds", env: { FAKE_UPLOAD_TIME_TOTAL: "5.000001" } },
  ];

  try {
    const violations: string[] = [];
    for (const fixture of cases) {
      const result = runShell("deploy/aliyun/scripts/verify-origin.sh", {
        ...baseEnvironment,
        ...fixture.env,
      });
      const output = (result.stderr || "") + (result.stdout || "");
      if (result.status === 0 || output !== "FAIL\n") violations.push(fixture.name);
      assert.doesNotMatch(output, /TOP_SECRET_RESPONSE|trailing-response-marker|origin\.sna\.hk|api\/open-sna/i);
    }

    writeFileSync(path.join(fakeBin, "python3"), "#!/usr/bin/env bash\nexit 127\n", { mode: 0o755 });
    const missingPython = runShell("deploy/aliyun/scripts/verify-origin.sh", baseEnvironment);
    if (missingPython.status === 0 || (missingPython.stderr || "") + (missingPython.stdout || "") !== "FAIL\n") {
      violations.push("missing python3 dependency");
    }

    assert.deepEqual(violations, []);
  } finally {
    rmSync(fakeBin, { recursive: true, force: true });
  }
});

test("preflight permits credential-free disabled web and gates future matching tokens without disclosure", () => {
  const fakeBin = createFakePreflightCommands();
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), "sna-preflight-fixtures-"));
  const webEnvFile = path.join(fixtureRoot, "web.env");
  const workerEnvFile = path.join(fixtureRoot, "worker.env");
  const composeEnvFile = path.join(fixtureRoot, "compose.env");
  const validToken = "w".repeat(48);
  const commonEnvironment = {
    PATH: `${fakeBin}:${process.env.PATH || ""}`,
    OPEN_SNA_WEB_ENV_FILE: webEnvFile,
    OPEN_SNA_WORKER_ENV_FILE: workerEnvFile,
    OPEN_SNA_COMPOSE_ENV_FILE: composeEnvFile,
    OPEN_SNA_COMPOSE_FILE: fromRoot("deploy/aliyun/compose.yaml"),
    SNA_WEB_IMAGE_DIGEST: "a".repeat(64),
    SNA_WORKER_IMAGE_DIGEST: "b".repeat(64),
  };

  try {
    writeFileSync(composeEnvFile, `SNA_WEB_IMAGE_DIGEST=${"a".repeat(64)}\nSNA_WORKER_IMAGE_DIGEST=${"b".repeat(64)}\n`);
    writeFileSync(webEnvFile, "OPEN_SNA_R_DISABLED=1\n");
    writeFileSync(workerEnvFile, `OPEN_SNA_R_WORKER_TOKEN=${validToken}\n`);

    const disabled = runShell("deploy/aliyun/scripts/preflight.sh", commonEnvironment);
    assert.equal(disabled.status, 0, (disabled.stderr || "") + (disabled.stdout || ""));
    assert.equal((disabled.stderr || "") + (disabled.stdout || ""), "PASS\n");

    writeFileSync(
      webEnvFile,
      `OPEN_SNA_R_DISABLED=0\nOPEN_SNA_R_API_URL=https://worker.internal:8443/api/open-sna/analyze\nOPEN_SNA_R_API_TOKEN=${validToken}\n`,
    );
    const enabled = runShell("deploy/aliyun/scripts/preflight.sh", commonEnvironment);
    assert.equal(enabled.status, 0, (enabled.stderr || "") + (enabled.stdout || ""));
    assert.equal((enabled.stderr || "") + (enabled.stdout || ""), "PASS\n");

    const exactMinimumToken = "V".repeat(32);
    for (const validUrl of [
      "https://normal.example/api/open-sna/analyze",
      "https://192.0.2.10:443/api/open-sna/analyze",
      "https://[2001:db8::1]:8443/api/open-sna/analyze",
    ]) {
      writeFileSync(
        webEnvFile,
        `OPEN_SNA_R_DISABLED=0\nOPEN_SNA_R_API_URL=${validUrl}\nOPEN_SNA_R_API_TOKEN=${exactMinimumToken}\n`,
      );
      writeFileSync(workerEnvFile, `OPEN_SNA_R_WORKER_TOKEN=${exactMinimumToken}\n`);
      const validHost = runShell("deploy/aliyun/scripts/preflight.sh", commonEnvironment);
      assert.equal(validHost.status, 0, (validHost.stderr || "") + (validHost.stdout || ""));
      assert.equal((validHost.stderr || "") + (validHost.stdout || ""), "PASS\n");
    }

    const publicPlaceholder = "replace-with-a-unique-32-byte-token";
    const enabledWeb = (url: string, token = validToken) =>
      `OPEN_SNA_R_DISABLED=0\nOPEN_SNA_R_API_URL=${url}\nOPEN_SNA_R_API_TOKEN=${token}\n`;
    const cases = [
      {
        name: "disabled web credentials must be absent",
        web: `OPEN_SNA_R_DISABLED=1\nOPEN_SNA_R_API_URL=https://worker.internal/api/open-sna/analyze\nOPEN_SNA_R_API_TOKEN=${validToken}\n`,
        worker: `OPEN_SNA_R_WORKER_TOKEN=${validToken}\n`,
      },
      {
        name: "mismatched web and worker tokens",
        web: enabledWeb("https://worker.internal/api/open-sna/analyze"),
        worker: `OPEN_SNA_R_WORKER_TOKEN=${"m".repeat(48)}\n`,
      },
      {
        name: "public placeholders on both sides",
        web: enabledWeb("https://worker.internal/api/open-sna/analyze", publicPlaceholder),
        worker: `OPEN_SNA_R_WORKER_TOKEN=${publicPlaceholder}\n`,
      },
      {
        name: "duplicate web token assignment",
        web: `${enabledWeb("https://worker.internal/api/open-sna/analyze")}OPEN_SNA_R_API_TOKEN=${validToken}\n`,
        worker: `OPEN_SNA_R_WORKER_TOKEN=${validToken}\n`,
      },
      {
        name: "short worker token",
        web: "OPEN_SNA_R_DISABLED=1\n",
        worker: "OPEN_SNA_R_WORKER_TOKEN=short-worker-token\n",
      },
      {
        name: "duplicate worker token assignment",
        web: "OPEN_SNA_R_DISABLED=1\n",
        worker: `OPEN_SNA_R_WORKER_TOKEN=${validToken}\nOPEN_SNA_R_WORKER_TOKEN=${validToken}\n`,
      },
      {
        name: "web-only placeholder",
        web: enabledWeb("https://worker.internal/api/open-sna/analyze", publicPlaceholder),
        worker: `OPEN_SNA_R_WORKER_TOKEN=${validToken}\n`,
      },
      {
        name: "worker-only placeholder",
        web: enabledWeb("https://worker.internal/api/open-sna/analyze"),
        worker: `OPEN_SNA_R_WORKER_TOKEN=${publicPlaceholder}\n`,
      },
      {
        name: "quoted placeholders on both sides",
        web: enabledWeb("https://worker.internal/api/open-sna/analyze", `"${publicPlaceholder}"`),
        worker: `OPEN_SNA_R_WORKER_TOKEN="${publicPlaceholder}"\n`,
      },
      {
        name: "quoted placeholder on web only",
        web: enabledWeb("https://worker.internal/api/open-sna/analyze", `'${publicPlaceholder}'`),
        worker: `OPEN_SNA_R_WORKER_TOKEN=${validToken}\n`,
      },
      {
        name: "worker token is 32 spaces",
        web: "OPEN_SNA_R_DISABLED=1\n",
        worker: `OPEN_SNA_R_WORKER_TOKEN=${" ".repeat(32)}\n`,
      },
      {
        name: "web and worker tokens have leading whitespace",
        web: enabledWeb("https://worker.internal/api/open-sna/analyze", ` ${validToken}`),
        worker: `OPEN_SNA_R_WORKER_TOKEN= ${validToken}\n`,
      },
      {
        name: "web and worker tokens have trailing whitespace",
        web: enabledWeb("https://worker.internal/api/open-sna/analyze", `${validToken} `),
        worker: `OPEN_SNA_R_WORKER_TOKEN=${validToken} \n`,
      },
      {
        name: "web and worker tokens contain tab",
        web: enabledWeb("https://worker.internal/api/open-sna/analyze", `${validToken.slice(0, 24)}\t${validToken.slice(24)}`),
        worker: `OPEN_SNA_R_WORKER_TOKEN=${validToken.slice(0, 24)}\t${validToken.slice(24)}\n`,
      },
      {
        name: "web and worker tokens contain CR",
        web: enabledWeb("https://worker.internal/api/open-sna/analyze", `${validToken}\r`),
        worker: `OPEN_SNA_R_WORKER_TOKEN=${validToken}\r\n`,
      },
      {
        name: "web and worker tokens contain LF continuation",
        web: enabledWeb("https://worker.internal/api/open-sna/analyze", `${validToken}\nTOKEN_CONTINUATION_MARKER`),
        worker: `OPEN_SNA_R_WORKER_TOKEN=${validToken}\nTOKEN_CONTINUATION_MARKER\n`,
      },
      {
        name: "web and worker tokens contain control byte",
        web: enabledWeb("https://worker.internal/api/open-sna/analyze", `${validToken.slice(0, 24)}\u0007${validToken.slice(24)}`),
        worker: `OPEN_SNA_R_WORKER_TOKEN=${validToken.slice(0, 24)}\u0007${validToken.slice(24)}\n`,
      },
      {
        name: "web and worker tokens contain non-ASCII characters",
        web: enabledWeb("https://worker.internal/api/open-sna/analyze", "界".repeat(32)),
        worker: `OPEN_SNA_R_WORKER_TOKEN=${"界".repeat(32)}\n`,
      },
      {
        name: "query decoy path",
        web: enabledWeb("https://worker.internal/api/open-sna/analyze?next=/api/open-sna/analyze&SENSITIVE_URL_MARKER=1"),
        worker: `OPEN_SNA_R_WORKER_TOKEN=${validToken}\n`,
      },
      {
        name: "fragment decoy path",
        web: enabledWeb("https://worker.internal/api/open-sna/analyze#/api/open-sna/analyze-SENSITIVE_URL_MARKER"),
        worker: `OPEN_SNA_R_WORKER_TOKEN=${validToken}\n`,
      },
      {
        name: "URL userinfo",
        web: enabledWeb("https://user:TOP_SECRET_TOKEN@worker.internal/api/open-sna/analyze"),
        worker: `OPEN_SNA_R_WORKER_TOKEN=${validToken}\n`,
      },
      {
        name: "wrong analyze path",
        web: enabledWeb("https://worker.internal/api/open-sna/analyze/extra-SENSITIVE_URL_MARKER"),
        worker: `OPEN_SNA_R_WORKER_TOKEN=${validToken}\n`,
      },
      {
        name: "out-of-range port",
        web: enabledWeb("https://worker.internal:70000/api/open-sna/analyze"),
        worker: `OPEN_SNA_R_WORKER_TOKEN=${validToken}\n`,
      },
      {
        name: "non-numeric port",
        web: enabledWeb("https://worker.internal:notaport/api/open-sna/analyze"),
        worker: `OPEN_SNA_R_WORKER_TOKEN=${validToken}\n`,
      },
      {
        name: "empty port",
        web: enabledWeb("https://worker.internal:/api/open-sna/analyze"),
        worker: `OPEN_SNA_R_WORKER_TOKEN=${validToken}\n`,
      },
      {
        name: "leading URL whitespace",
        web: enabledWeb(" https://worker.internal/api/open-sna/analyze"),
        worker: `OPEN_SNA_R_WORKER_TOKEN=${validToken}\n`,
      },
      {
        name: "trailing URL whitespace",
        web: enabledWeb("https://worker.internal/api/open-sna/analyze "),
        worker: `OPEN_SNA_R_WORKER_TOKEN=${validToken}\n`,
      },
      {
        name: "missing URL host",
        web: enabledWeb("https:///api/open-sna/analyze"),
        worker: `OPEN_SNA_R_WORKER_TOKEN=${validToken}\n`,
      },
      {
        name: "invalid percent escape in host",
        web: enabledWeb("https://bad%zz.internal/api/open-sna/analyze"),
        worker: `OPEN_SNA_R_WORKER_TOKEN=${validToken}\n`,
      },
      {
        name: "isolated percent in host",
        web: enabledWeb("https://bad%.internal/api/open-sna/analyze"),
        worker: `OPEN_SNA_R_WORKER_TOKEN=${validToken}\n`,
      },
      {
        name: "invalid bracketed IPv6",
        web: enabledWeb("https://[2001:db8:::1]/api/open-sna/analyze"),
        worker: `OPEN_SNA_R_WORKER_TOKEN=${validToken}\n`,
      },
      {
        name: "unbracketed IPv6",
        web: enabledWeb("https://2001:db8::1/api/open-sna/analyze"),
        worker: `OPEN_SNA_R_WORKER_TOKEN=${validToken}\n`,
      },
      {
        name: "empty interior DNS label",
        web: enabledWeb("https://worker..internal/api/open-sna/analyze"),
        worker: `OPEN_SNA_R_WORKER_TOKEN=${validToken}\n`,
      },
      {
        name: "empty trailing DNS label",
        web: enabledWeb("https://worker.internal./api/open-sna/analyze"),
        worker: `OPEN_SNA_R_WORKER_TOKEN=${validToken}\n`,
      },
      {
        name: "leading hyphen DNS label",
        web: enabledWeb("https://-worker.internal/api/open-sna/analyze"),
        worker: `OPEN_SNA_R_WORKER_TOKEN=${validToken}\n`,
      },
      {
        name: "trailing hyphen DNS label",
        web: enabledWeb("https://worker-.internal/api/open-sna/analyze"),
        worker: `OPEN_SNA_R_WORKER_TOKEN=${validToken}\n`,
      },
      {
        name: "underscore DNS label",
        web: enabledWeb("https://worker_name.internal/api/open-sna/analyze"),
        worker: `OPEN_SNA_R_WORKER_TOKEN=${validToken}\n`,
      },
      {
        name: "overlong DNS label",
        web: enabledWeb(`https://${"a".repeat(64)}.internal/api/open-sna/analyze`),
        worker: `OPEN_SNA_R_WORKER_TOKEN=${validToken}\n`,
      },
      {
        name: "overlong DNS host",
        web: enabledWeb(`https://${Array(5).fill("a".repeat(63)).join(".")}/api/open-sna/analyze`),
        worker: `OPEN_SNA_R_WORKER_TOKEN=${validToken}\n`,
      },
      {
        name: "invalid IPv4 literal",
        web: enabledWeb("https://999.0.0.1/api/open-sna/analyze"),
        worker: `OPEN_SNA_R_WORKER_TOKEN=${validToken}\n`,
      },
      {
        name: "abbreviated IPv4 literal",
        web: enabledWeb("https://127.1/api/open-sna/analyze"),
        worker: `OPEN_SNA_R_WORKER_TOKEN=${validToken}\n`,
      },
    ];

    const violations: string[] = [];
    for (const fixture of cases) {
      writeFileSync(webEnvFile, fixture.web);
      writeFileSync(workerEnvFile, fixture.worker);
      const result = runShell("deploy/aliyun/scripts/preflight.sh", commonEnvironment);
      const output = (result.stderr || "") + (result.stdout || "");
      if (result.status === 0 || output !== "FAIL\n") violations.push(fixture.name);
      assert.doesNotMatch(output, /TOP_SECRET_TOKEN|TOKEN_CONTINUATION_MARKER|SENSITIVE_URL_MARKER|worker\.internal|api\/open-sna/i);
    }

    writeFileSync(webEnvFile, enabledWeb("https://worker.internal/api/open-sna/analyze"));
    writeFileSync(workerEnvFile, `OPEN_SNA_R_WORKER_TOKEN=${validToken}\n`);
    writeFileSync(path.join(fakeBin, "python3"), "#!/usr/bin/env bash\nexit 127\n", { mode: 0o755 });
    const missingPython = runShell("deploy/aliyun/scripts/preflight.sh", commonEnvironment);
    if (missingPython.status === 0 || (missingPython.stderr || "") + (missingPython.stdout || "") !== "FAIL\n") {
      violations.push("missing python3 dependency");
    }

    assert.deepEqual(violations, []);
  } finally {
    rmSync(fakeBin, { recursive: true, force: true });
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});
