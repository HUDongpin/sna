import { isIP } from "node:net";

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

const DNS_LABEL_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;
const VISIBLE_ASCII_SERVICE_TOKEN_PATTERN = /^[!-~]{32,}$/;
const RAW_ANALYZE_URL_PATTERN = /^https:\/\/([^/?#]+)(\/api\/open-sna\/analyze)$/;

function normalizePlaceholderToken(token: string) {
  let normalized = token.toLowerCase();
  if (
    normalized.length >= 2 &&
    normalized[0] === normalized[normalized.length - 1] &&
    (normalized[0] === '"' || normalized[0] === "'")
  ) {
    normalized = normalized.slice(1, -1);
  }
  return normalized;
}

export function isValidOpenSnaServiceToken(value: string | undefined) {
  if (!value || !VISIBLE_ASCII_SERVICE_TOKEN_PATTERN.test(value)) return false;
  const normalized = normalizePlaceholderToken(value);
  return !(
    (normalized.startsWith("<") && normalized.endsWith(">")) ||
    normalized.startsWith("replace-with-") ||
    normalized.startsWith("change-me-") ||
    normalized.startsWith("example-") ||
    normalized.includes("placeholder")
  );
}

function hasValidRawAnalyzeUrl(apiUrl: string) {
  if (apiUrl !== apiUrl.trim() || /\s/.test(apiUrl) || apiUrl.includes("%")) return false;
  const match = apiUrl.match(RAW_ANALYZE_URL_PATTERN);
  if (!match) return false;

  const authority = match[1];
  if (authority.includes("@")) return false;

  let rawHostname: string;
  let rawPort: string | undefined;
  if (authority.startsWith("[")) {
    const ipv6Authority = authority.match(/^\[[^\]]+\](?::([0-9]+))?$/);
    if (!ipv6Authority) return false;
    rawHostname = authority.slice(0, authority.indexOf("]") + 1);
    rawPort = ipv6Authority[1];
  } else {
    const hostAuthority = authority.match(/^([^:]+)(?::([0-9]+))?$/);
    if (!hostAuthority) return false;
    rawHostname = hostAuthority[1];
    rawPort = hostAuthority[2];
  }

  if (!isValidOpenSnaHostname(rawHostname)) return false;
  if (rawPort !== undefined) {
    const port = Number(rawPort);
    if (!Number.isInteger(port) || port < 1 || port > 65_535) return false;
  }
  return true;
}

function isValidOpenSnaHostname(hostname: string) {
  const bracketedIpv6 = hostname.startsWith("[") && hostname.endsWith("]");
  const unwrappedHostname = bracketedIpv6 ? hostname.slice(1, -1) : hostname;
  const ipVersion = isIP(unwrappedHostname);
  if (ipVersion === 6) return bracketedIpv6;
  if (ipVersion === 4) return !bracketedIpv6;
  if (bracketedIpv6 || /^[0-9.]+$/.test(hostname) || hostname.length > 253) return false;
  const labels = hostname.split(".");
  return labels.length > 0 && labels.every((label) => DNS_LABEL_PATTERN.test(label));
}

export function readOpenSnaEngineConfigurationStatus(): OpenSnaEngineConfigurationStatus {
  const apiUrl = process.env.OPEN_SNA_R_API_URL || "";
  const apiToken = process.env.OPEN_SNA_R_API_TOKEN || "";
  if (!apiUrl || !apiToken) {
    return { configured: false, reason: "missing" };
  }

  if (!hasValidRawAnalyzeUrl(apiUrl) || !isValidOpenSnaServiceToken(apiToken)) {
    return { configured: false, reason: "invalid" };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(apiUrl);
  } catch {
    return { configured: false, reason: "invalid" };
  }

  const hasExactAnalyzePath = parsedUrl.pathname === "/api/open-sna/analyze";
  if (
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.search ||
    parsedUrl.hash ||
    parsedUrl.protocol !== "https:" ||
    !isValidOpenSnaHostname(parsedUrl.hostname) ||
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
