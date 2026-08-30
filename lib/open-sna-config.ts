export type OpenSnaEngineConfiguration = {
  apiUrl: string;
  apiToken: string;
};

export type OpenSnaEngineConfigurationStatus =
  | { configured: false; reason: "missing" | "invalid" }
  | {
      configured: true;
      apiUrl: string;
      apiToken: string;
    };

function normalizeValue(value: string | undefined) {
  return value?.trim() || "";
}

export function readOpenSnaEngineConfigurationStatus(): OpenSnaEngineConfigurationStatus {
  const apiUrl = normalizeValue(process.env.OPEN_SNA_R_API_URL);
  const apiToken = normalizeValue(process.env.OPEN_SNA_R_API_TOKEN);
  if (!apiUrl || !apiToken) {
    return { configured: false, reason: "missing" };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(apiUrl);
  } catch {
    return { configured: false, reason: "invalid" };
  }

  const isLoopbackHost = ["localhost", "127.0.0.1", "[::1]"].includes(parsedUrl.hostname);
  const hasExactAnalyzePath = parsedUrl.pathname === "/api/open-sna/analyze";
  if (
    apiToken.length < 32 ||
    parsedUrl.username ||
    parsedUrl.password ||
    (parsedUrl.protocol !== "https:" && !isLoopbackHost) ||
    !hasExactAnalyzePath
  ) {
    return { configured: false, reason: "invalid" };
  }

  return {
    configured: true,
    apiUrl,
    apiToken,
  };
}
