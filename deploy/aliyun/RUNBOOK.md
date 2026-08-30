# SNA.HK Aliyun container deployment runbook

This runbook covers the primary Aliyun container deployment for `www.sna.hk`, `origin.sna.hk`, `sna.hk`, and `worker.sna.hk`.

## Before you change anything

Record the current state first:

- the current `sna-web` and `sna-r-worker` image digests
- the active `SNA_RELEASE_SHA`
- the current env file permissions under `/opt/sna/secrets`
- the current Nginx TLS and upstream mapping
- the current container health status

Keep a backup of this pre-change state before changing anything else.

This deployment runs on a host that is already near capacity. The host warning is at least `4vCPU/8GiB` with existing services already present, so treat every rollout as capacity-sensitive.

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

## Start and verify

1. Prepare `/opt/sna/.env` with non-secret compose inputs such as `SNA_RELEASE_SHA`, `SNA_WEB_IMAGE_DIGEST`, and `SNA_WORKER_IMAGE_DIGEST`.
1. Pull the exact digests.
1. Start the compose stack with `docker compose --env-file /opt/sna/.env -f deploy/aliyun/compose.yaml up -d`.
1. Confirm `GET /api/health` returns HTTP 200 and reports the expected SHA and role.
1. Confirm `POST /api/open-sna/analyze` without credentials returns HTTP 401 on the worker.
1. Confirm the HTTP entrypoint redirects to HTTPS.
1. Confirm `origin.sna.hk` returns `X-Robots-Tag: noindex,nofollow`.

## Nginx and TLS

- `www.sna.hk` is the main host.
- `sna.hk` should redirect to `www.sna.hk`.
- `origin.sna.hk` is the pre-acceptance host and should expose the web container only.
- `worker.sna.hk` must proxy only the exact `/api/open-sna/analyze` route.
- Keep request body and authorization logging disabled.
- Keep the TLS certificate and key at `/etc/nginx/ssl/sna.hk.crt` and `/etc/nginx/ssl/sna.hk.key` as placeholders to be mounted by the host.
- Apply the Baota/Nginx include or config replacement in a staging-safe order: back up the current file, update the template, run `nginx -t`, then reload. If validation fails, restore the backup before any reload.

## Rollback

Use the rollback script only when you have a confirmed previous digest and `CONFIRM_ROLLBACK=YES`.

Rollback order:

1. validate the compose file and digests
1. switch the worker back first and wait for a healthy 401 response
1. switch the web service last

Never use rollback as a reset or delete operation.

## DNS and cutover

- Warm the origin host first.
- Verify worker analysis readiness before moving public traffic.
- Cut over DNS only after the digest, health, and redirect checks pass.

## Evidence to keep

- compose config output
- image digests
- health responses
- Nginx config snapshot
- rollback rehearsal notes
- secret file permissions under `/opt/sna/secrets`

## Kill switch

If health checks fail, if the worker starts returning non-401 unauthenticated responses, or if Nginx begins leaking credentials or bodies, stop the cutover and keep traffic on the known-good path until the issue is resolved.
