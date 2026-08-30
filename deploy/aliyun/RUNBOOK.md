# SNA.HK Aliyun container deployment runbook

This runbook covers the current origin-only stage on ECS and preserves the separate full-production procedure for a later approved cutover.

## Current origin-only stage

This stage is a fail-closed soak, not a public R launch:

- Create DNS only for `origin.sna.hk`. Do not create or change ECS DNS for `sna.hk`, `www.sna.hk`, or `worker.sna.hk` in this stage.
- Use `deploy/aliyun/nginx/origin-only.conf.example`. It exposes only ports 80 and 443 for `origin.sna.hk` and proxies web traffic to `127.0.0.1:3100`.
- Keep the R worker on loopback at `127.0.0.1:3101`. Do not add an Nginx worker server or a public security-group rule for port 3101.
- Keep `OPEN_SNA_R_DISABLED=1` in the root-owned web env file. Disabled mode does not require `OPEN_SNA_R_API_URL` or `OPEN_SNA_R_API_TOKEN` in `web.env`.
- If there is no alert group, public R is forbidden and `OPEN_SNA_R_DISABLED` must remain disabled.

## Before you change anything

Before any first-deployment mutation, create one immutable change-record ID and record the exact current state:

- Origin DNS exact pre-state: provider/zone, hostname, type, value/target, TTL, routing/proxy flags, whether the record existed, the original record ID if it existed, and the created record ID if this rollout creates it.
- Origin vhost exact path and pre-state: whether it existed or was absent, owner, mode, SHA-256, backup path when present, and a vhost record ID binding those facts to the change record.
- Security-group exact rule ID and pre-state: direction, protocol, port range, source, action, priority and description; also record the created rule ID if this rollout adds one.
- The current env file ownership and modes under `/opt/sna/secrets`, intended `SNA_RELEASE_SHA` and image digests, and current container/loopback-port state.

Keep a backup of the current Nginx file before changing it.

This deployment runs on a host that is already near capacity. The host warning is at least `4vCPU/8GiB` with existing services already present, so treat every rollout as capacity-sensitive.

## ECS command prerequisites

- `python3` is a hard fail-closed dependency for structured JSON, header, timing, and URL validation. The deployment validator uses only Python 3.6.8-compatible standard-library APIs; it does not require Node or jq on the host.
- Owner-supplied Cloud Assistant read-only evidence recorded Python 3.6.8 as present on the target ECS under execution ID `t-hk06vkvrcei3e2o`. This is dependency evidence, not deployment approval; both scripts still check `python3` on every run and return only `FAIL` if it is unavailable.
- `verify-origin.sh` also requires `curl`, `mktemp`, and `rm`. `preflight.sh` requires `stat`, `awk`, `python3`, and Docker Compose. Missing required commands fail closed without printing paths, URLs, response bodies, or env values.

## Image flow

1. Build and push the `linux/amd64` web and worker images from the exact `main` commit SHA with `Dockerfile.web` and `Dockerfile.open-sna-worker`.
1. Attach OCI revision labels, SBOM, provenance, and signature metadata.
1. Record the pushed digests.
1. Only deploy by digest.

## Env files

- Put secrets only in root-owned env files under `/opt/sna/secrets`.
- Keep repository examples secret-free.
- Do not store credentials in the compose file or workflow.
- Use `/opt/sna/.env` or `--env-file /opt/sna/.env` for non-secret compose interpolation values.
- The root-owned `/opt/sna/secrets/web.env` controls `OPEN_SNA_R_DISABLED`, `OPEN_SNA_R_API_URL`, and `OPEN_SNA_R_API_TOKEN`; compose must not override them.
- In the current disabled stage, omit the Web URL and token entirely. The worker token must still be a non-placeholder value that satisfies the worker runtime contract.
- For a future approved enablement, preflight requires exactly one Web token assignment and exactly one Worker token assignment. Each raw token must contain at least 32 visible ASCII bytes (`0x21` through `0x7e`) with no spaces, tabs, CR/LF, control bytes, non-ASCII bytes, or leading/trailing whitespace. It then rejects plain or symmetrically quoted public placeholders and requires the Web and Worker bytes to be equal.
- The approved worker URL contract accepts an ASCII DNS host with non-empty RFC-style labels of at most 63 characters and total host length at most 253, canonical dotted-decimal IPv4, or a valid bracketed IPv6 literal. It rejects percent escapes, unbracketed/invalid IPv6, empty or illegal DNS labels, userinfo, query, fragment, invalid ports, and any pathname other than `/api/open-sna/analyze`.
- Preflight and origin verification print only `PASS` or `FAIL`; they never print token values or probe details.
- Never save the full `docker compose config` output because it expands env-file values, including tokens. Validate it with output redirected to `/dev/null`; retain only the exit status and a redacted field inventory.

## Compose

Use `deploy/aliyun/compose.yaml` to run exactly two containers:

- `sna-web` on loopback `127.0.0.1:3100 -> 3000`
- `sna-r-worker` on loopback `127.0.0.1:3101 -> 3000`

The compose file enforces:

- no host networking
- no privileged mode
- dropped capabilities
- no-new-privileges
- read-only root filesystems
- bounded logs
- bounded tmpfs mounts
- digest-pinned `ghcr.io/hudongpin/sna-web@sha256:${SNA_WEB_IMAGE_DIGEST}` and `ghcr.io/hudongpin/sna-worker@sha256:${SNA_WORKER_IMAGE_DIGEST}`

## Start and verify the origin soak

1. Prepare `/opt/sna/.env` with `SNA_RELEASE_SHA`, `SNA_WEB_IMAGE_DIGEST`, and `SNA_WORKER_IMAGE_DIGEST`.
1. Prepare root-owned mode `0600` web and worker env files. Keep public R disabled in the Web env and omit the Web worker URL/token.
1. Run `deploy/aliyun/scripts/preflight.sh`; do not capture expanded compose output.
1. Pull the exact digests and start the compose stack with `docker compose --env-file /opt/sna/.env -f deploy/aliyun/compose.yaml up -d`.
1. Install the origin-only Nginx template in a staging-safe order: back up the current file, update the include or Baota configuration, run `nginx -t`, then reload. If validation fails, restore the backup before any reload.
1. Confirm ports 3100 and 3101 listen only on `127.0.0.1` and neither has a public security-group rule.
1. Export the exact expected SHA without printing env contents, then run `SNA_RELEASE_SHA=<40-character-lowercase-release-sha> deploy/aliyun/scripts/verify-origin.sh https://origin.sna.hk`.

The origin verifier structurally reads only top-level JSON fields and the final curl header block. It requires HTTP 200 health with the exact SHA, `deploymentRole=aliyun-primary`, `rAnalysis=disabled`, and final `Cache-Control: no-store`; root HTTP 307 with a byte-exact `Location: /en` and final `X-Robots-Tag: noindex,nofollow`; and an immediate public upload HTTP 503 with top-level `R_ENGINE_DISABLED` and final `no-store`. `/en/`, absolute URLs, query strings, case changes and double slashes are rejected. Every curl uses a 2-second connection timeout and a 5-second total timeout. The upload probe additionally requires a present, finite numeric `time_total` no greater than 5 seconds.

## Nginx and TLS

- During this stage, only `origin.sna.hk` has server blocks. HTTP redirects to origin HTTPS, and HTTPS proxies only to `127.0.0.1:3100`.
- The origin proxy explicitly sets `Authorization` to an empty value so client credentials cannot reach Web.
- Keep TLS at 1.2/1.3, `client_max_body_size` at `6m`, and upstream read/send timeouts at `300s`.
- Keep `X-Robots-Tag: noindex,nofollow` with `always` in both the HTTP 80 redirect server block and the HTTPS 443 proxy server block.
- Keep the TLS certificate and key at `/etc/nginx/ssl/sna.hk.crt` and `/etc/nginx/ssl/sna.hk.key` as placeholders to be mounted by the host.

The full template `deploy/aliyun/nginx/sna.conf.example` and verifier `deploy/aliyun/scripts/verify.sh` remain available for a separately approved apex/www/worker cutover. For that future approved cutover:

- `sna.hk` on HTTP goes directly to `https://www.sna.hk$request_uri` in one hop.
- Keep `Authorization` forwarding limited to `worker.sna.hk`.
- Keep worker rate limiting at `2r/m`, `limit_conn` at `1`, request-body and authorization logging disabled, and non-target worker paths at HTTP 404.
- Run `deploy/aliyun/scripts/verify.sh https://www.sna.hk https://origin.sna.hk https://sna.hk https://worker.sna.hk` only after those public endpoints are authorized and configured.

## First ECS deployment rollback

The first ECS deployment has no previous image digest. Do not pretend that a previous digest set exists, and do not use `rollback.sh` for this first rollback.

For the first ECS deployment rollback:

1. **Origin DNS rollback:** consult the immutable change record first. If the origin record existed, restore its exact pre-state using the original record ID. If it was absent, delete only the origin record created by this rollout using the created record ID. Do not alter any other DNS record.
1. Stop `sna-r-worker`, then stop `sna-web`.
1. **Origin vhost rollback:** if the exact-path Nginx origin vhost existed, atomically restore the recorded backup and verify owner, mode and SHA-256. If it was absent, delete only the exact new file recorded for this rollout. The operator must not perform broad directory, wildcard, site-wide or unrelated-file deletion.
1. **Nginx validation and reload:** run `nginx -t`; reload only after it succeeds. If validation fails, keep Nginx running on its pre-reload state and resolve the exact recorded file discrepancy.
1. **External origin confirmation:** from a resolver/client outside this ECS, confirm `origin.sna.hk` no longer resolves, routes or responds from this deployment as dictated by the restored DNS pre-state.
1. **Security-group rollback:** use the exact rule ID and recorded pre-state. Restore the original single security-group rule if it existed, or remove only the exact created rule ID if it did not. No broad deletion, port-range sweep or unrelated-rule mutation is permitted.
1. Leave public R disabled and record each rollback receipt against the same change-record ID without env values.

For a later deployment, use `deploy/aliyun/scripts/rollback.sh` only after a prior successful ECS release has established confirmed previous Web and Worker digests and a release SHA. It requires `CONFIRM_ROLLBACK=YES`, rolls back the worker first, verifies worker health and the authorization boundary, atomically updates `/opt/sna/.env`, and then rolls back Web. Never use rollback as a reset or delete operation.

## DNS boundary

- Add only the `origin.sna.hk` DNS record for this soak.
- Do not point apex, www, or worker DNS at ECS in this stage.
- Do not move existing public traffic during the origin soak.

## Evidence to keep

- exact release SHA and image digests
- redacted container health/status results
- health and acceptance responses that contain no secrets
- Nginx template hash and `nginx -t` result
- env file path, owner, and mode only
- first-rollout rollback rehearsal notes

Never save full `docker compose config` output, env-file contents, bearer tokens, request bodies, or authorization headers.

## Kill switch

If any origin check fails, if R is not reported disabled, if ports 3100/3101 are externally reachable, or if Nginx leaks credentials or bodies, stop the origin soak. Keep public R disabled, roll back using the first-deployment procedure, and leave existing public traffic on its known-good path.
