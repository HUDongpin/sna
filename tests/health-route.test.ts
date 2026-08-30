import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const healthRoutePath = path.join(repositoryRoot, "app", "api", "health", "route.ts");
const environmentKeys = [
  "SNA_RELEASE_SHA",
  "VERCEL_GIT_COMMIT_SHA",
  "SNA_DEPLOYMENT_ROLE",
  "OPEN_SNA_R_DISABLED",
  "OPEN_SNA_R_API_URL",
  "OPEN_SNA_R_API_TOKEN",
] as const;

function isolateEnvironment() {
  const original = Object.fromEntries(environmentKeys.map((key) => [key, process.env[key]]));
  for (const key of environmentKeys) delete process.env[key];
  return original;
}

function restoreEnvironment(original: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(original)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

async function loadHealthRoute() {
  assert.ok(existsSync(healthRoutePath), "GET /api/health must exist");
  return import("../app/api/health/route");
}

test("health reports exact configured deployment identity without caching", async () => {
  const original = isolateEnvironment();
  try {
    process.env.SNA_RELEASE_SHA = "A".repeat(40);
    process.env.VERCEL_GIT_COMMIT_SHA = "b".repeat(40);
    process.env.SNA_DEPLOYMENT_ROLE = "aliyun-primary";
    process.env.OPEN_SNA_R_API_URL = "https://worker.invalid/api/open-sna/analyze";
    process.env.OPEN_SNA_R_API_TOKEN = "t".repeat(32);

    const { GET } = await loadHealthRoute();
    const response = await GET();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), {
      status: "ok",
      releaseSha: "A".repeat(40),
      deploymentRole: "aliyun-primary",
      rAnalysis: "configured",
    });
  } finally {
    restoreEnvironment(original);
  }
});

test("health falls back to the Vercel SHA and reports deliberate R disablement", async () => {
  const original = isolateEnvironment();
  try {
    process.env.VERCEL_GIT_COMMIT_SHA = "c".repeat(40);
    process.env.SNA_DEPLOYMENT_ROLE = "vercel-backup";
    process.env.OPEN_SNA_R_DISABLED = "1";
    process.env.OPEN_SNA_R_API_URL = "https://still-configured.invalid/private";
    process.env.OPEN_SNA_R_API_TOKEN = "s".repeat(48);

    const { GET } = await loadHealthRoute();
    const response = await GET();
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      status: "ok",
      releaseSha: "c".repeat(40),
      deploymentRole: "vercel-backup",
      rAnalysis: "disabled",
    });
  } finally {
    restoreEnvironment(original);
  }
});

test("health fails closed for missing or invalid deployment and R configuration", async () => {
  const original = isolateEnvironment();
  try {
    const { GET } = await loadHealthRoute();
    const cases = [
      {},
      { SNA_RELEASE_SHA: "not-a-sha", SNA_DEPLOYMENT_ROLE: "aliyun-primary", OPEN_SNA_R_DISABLED: "1" },
      { SNA_RELEASE_SHA: "d".repeat(40), SNA_DEPLOYMENT_ROLE: "primary", OPEN_SNA_R_DISABLED: "1" },
      { SNA_RELEASE_SHA: "e".repeat(40), SNA_DEPLOYMENT_ROLE: "vercel-backup", OPEN_SNA_R_API_URL: "https://worker.invalid" },
      { SNA_RELEASE_SHA: "f".repeat(40), SNA_DEPLOYMENT_ROLE: "aliyun-primary", OPEN_SNA_R_API_TOKEN: "x".repeat(31) },
      {
        SNA_RELEASE_SHA: "1".repeat(40),
        SNA_DEPLOYMENT_ROLE: "aliyun-primary",
        OPEN_SNA_R_API_URL: "not a url",
        OPEN_SNA_R_API_TOKEN: "x".repeat(32),
      },
      {
        SNA_RELEASE_SHA: "2".repeat(40),
        SNA_DEPLOYMENT_ROLE: "vercel-backup",
        OPEN_SNA_R_API_URL: "ftp://user:pass@worker.invalid/path",
        OPEN_SNA_R_API_TOKEN: "y".repeat(32),
      },
      {
        SNA_RELEASE_SHA: "3".repeat(40),
        SNA_DEPLOYMENT_ROLE: "aliyun-primary",
        OPEN_SNA_R_API_URL: "http://worker.example.com/api/open-sna/analyze",
        OPEN_SNA_R_API_TOKEN: "z".repeat(32),
      },
      {
        SNA_RELEASE_SHA: "4".repeat(40),
        SNA_DEPLOYMENT_ROLE: "vercel-backup",
        OPEN_SNA_R_API_URL: "https://worker.invalid/path",
        OPEN_SNA_R_API_TOKEN: "short-token-value",
      },
      {
        SNA_RELEASE_SHA: "5".repeat(40),
        SNA_DEPLOYMENT_ROLE: "aliyun-primary",
        OPEN_SNA_R_API_URL: "http://127.0.0.1:1234/api/open-sna/analyze",
        OPEN_SNA_R_API_TOKEN: "q".repeat(32),
      },
    ] as const;

    for (const environment of cases) {
      for (const key of environmentKeys) delete process.env[key];
      Object.assign(process.env, environment);
      const response = await GET();
      const payload = await response.json() as { status?: string; code?: string };
      const isLoopbackHttp =
        "OPEN_SNA_R_API_URL" in environment &&
        environment.OPEN_SNA_R_API_URL.startsWith("http://127.0.0.1:");
      if (isLoopbackHttp) {
        assert.equal(response.status, 200);
        assert.equal(response.headers.get("cache-control"), "no-store");
        assert.deepEqual(payload, {
          status: "ok",
          releaseSha: environment.SNA_RELEASE_SHA,
          deploymentRole: "aliyun-primary",
          rAnalysis: "configured",
        });
      } else {
        assert.equal(response.status, 503);
        assert.equal(response.headers.get("cache-control"), "no-store");
        assert.deepEqual(payload, {
          status: "unavailable",
          code: "DEPLOYMENT_HEALTH_MISCONFIGURED",
        });
      }
    }
  } finally {
    restoreEnvironment(original);
  }
});

test("health errors never expose raw environment values or infrastructure details", async () => {
  const original = isolateEnvironment();
  try {
    const secretUrl = "https://10.20.30.40/private-worker/resource-987";
    const secretToken = "super-secret-health-token-value-under-test";
    process.env.SNA_RELEASE_SHA = "invalid-release-private-value";
    process.env.SNA_DEPLOYMENT_ROLE = "private-role-value";
    process.env.OPEN_SNA_R_API_URL = secretUrl;
    process.env.OPEN_SNA_R_API_TOKEN = secretToken;

    const { GET } = await loadHealthRoute();
    const response = await GET();
    const responseText = await response.text();
    assert.equal(response.status, 503);
    for (const privateValue of [secretUrl, secretToken, "10.20.30.40", "resource-987", "private-role-value", "invalid-release-private-value"]) {
      assert.ok(!responseText.includes(privateValue), `health response exposed ${privateValue}`);
    }
  } finally {
    restoreEnvironment(original);
  }
});
