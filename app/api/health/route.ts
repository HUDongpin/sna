import { readOpenSnaEngineConfigurationStatus } from "@/lib/open-sna-config";

export const dynamic = "force-dynamic";

const RELEASE_SHA_PATTERN = /^[0-9a-fA-F]{40}$/;
const DEPLOYMENT_ROLES = new Set(["aliyun-primary", "vercel-backup"]);

function healthJson(body: unknown, status: number) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function GET() {
  const releaseSha = process.env.SNA_RELEASE_SHA || process.env.VERCEL_GIT_COMMIT_SHA || "";
  const deploymentRole = process.env.SNA_DEPLOYMENT_ROLE || "";
  const rDisabled = process.env.OPEN_SNA_R_DISABLED === "1";
  const rConfigured = readOpenSnaEngineConfigurationStatus().configured;

  if (!RELEASE_SHA_PATTERN.test(releaseSha) || !DEPLOYMENT_ROLES.has(deploymentRole) || (!rDisabled && !rConfigured)) {
    return healthJson(
      { status: "unavailable", code: "DEPLOYMENT_HEALTH_MISCONFIGURED" },
      503,
    );
  }

  return healthJson(
    {
      status: "ok",
      releaseSha,
      deploymentRole,
      rAnalysis: rDisabled ? "disabled" : "configured",
    },
    200,
  );
}
