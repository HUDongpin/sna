import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { getDictionary, localeMeta, locales } from "../lib/i18n";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));

function fromRoot(...segments: string[]) {
  return path.join(repositoryRoot, ...segments);
}

function read(relativePath: string) {
  return readFileSync(fromRoot(relativePath), "utf8");
}

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if ([".git", ".next", "node_modules", "out", "coverage"].includes(entry.name)) return [];
    const absolutePath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolutePath) : [absolutePath];
  });
}

function dictionaryShape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(dictionaryShape);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, dictionaryShape(child)])
    );
  }
  return typeof value;
}

function assertCompleteText(value: unknown, location: string): void {
  if (typeof value === "string") {
    assert.ok(value.trim().length > 0, `${location} must not be empty`);
    return;
  }
  if (Array.isArray(value)) {
    assert.ok(value.length > 0, `${location} must not be an empty array`);
    value.forEach((child, index) => assertCompleteText(child, `${location}[${index}]`));
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      assertCompleteText(child, `${location}.${key}`);
    }
  }
}

function importSpecifiers(source: string) {
  const specifiers: string[] = [];
  const pattern = /(?:from\s+|import\s*\(|require\s*\()\s*["']([^"']+)["']/g;
  for (const match of source.matchAll(pattern)) specifiers.push(match[1]);
  return specifiers;
}

function trackedTextFiles() {
  const gitResult = spawnSync("git", ["ls-files", "-z"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  const candidates =
    gitResult.status === 0 && gitResult.stdout.length > 0
      ? gitResult.stdout.split("\0").filter(Boolean).map((file) => fromRoot(file))
      : walk(repositoryRoot);
  const textExtensions = new Set([
    ".cjs",
    ".css",
    ".html",
    ".js",
    ".json",
    ".md",
    ".mjs",
    ".svg",
    ".toml",
    ".ts",
    ".tsx",
    ".txt",
    ".xml",
    ".yaml",
    ".yml",
  ]);
  const textBasenames = new Set([".env.example", ".gitignore", ".vercelignore"]);

  return candidates.filter((file) => {
    if (!existsSync(file) || !statSync(file).isFile()) return false;
    return textExtensions.has(path.extname(file).toLowerCase()) || textBasenames.has(path.basename(file));
  });
}

test("the locale contract contains exactly three complete dictionaries with matching shapes", () => {
  assert.deepEqual([...locales], ["en", "zh-hant", "zh-hans"]);
  assert.deepEqual(Object.keys(localeMeta).sort(), [...locales].sort());

  const reference = dictionaryShape(getDictionary("en"));
  for (const locale of locales) {
    const dictionary = getDictionary(locale);
    assert.deepEqual(dictionaryShape(dictionary), reference, `${locale} dictionary shape must match English`);
    assertCompleteText(dictionary, locale);
  }
});

test("the localized Home, Mission, News, Academy, and About route files exist", () => {
  const routeFiles = [
    "app/[locale]/page.tsx",
    "app/[locale]/mission/page.tsx",
    "app/[locale]/news/page.tsx",
    "app/[locale]/academy/page.tsx",
    "app/[locale]/about/page.tsx",
  ];

  for (const routeFile of routeFiles) {
    assert.ok(existsSync(fromRoot(routeFile)), `${routeFile} is required`);
    assert.ok(statSync(fromRoot(routeFile)).isFile(), `${routeFile} must be a file`);
  }
});

test("News and Academy render explicit empty states without content-service imports", () => {
  for (const section of ["news", "academy"] as const) {
    const pageSource = read(`app/[locale]/${section}/page.tsx`);
    assert.match(pageSource, /import\s+EmptyState\s+from\s+["']@\/components\/EmptyState["']/);
    assert.match(pageSource, /<EmptyState\b/);
    assert.match(pageSource, /title=\{copy\.emptyTitle\}/);
    assert.match(pageSource, /text=\{copy\.emptyText\}/);
    assert.match(pageSource, /note=\{copy\.emptyNote\}/);

    const forbiddenPageImport = /(?:^|[\/@.-])(data|database|db|newsletter)(?:$|[\/@.-])/i;
    assert.deepEqual(
      importSpecifiers(pageSource).filter((specifier) => forbiddenPageImport.test(specifier)),
      [],
      `${section} must not import a data, database, or newsletter module`
    );

    const detailSource = read(`app/[locale]/${section}/[slug]/page.tsx`);
    assert.match(detailSource, /notFound\(\)/, `${section} detail routes must remain unavailable while empty`);
  }
});

test("the canonical production host is www.sna.hk", () => {
  const canonicalUrl = "https://www.sna.hk";
  assert.match(read("lib/site.ts"), new RegExp(canonicalUrl.replaceAll(".", "\\.")));
  assert.match(read("app/layout.tsx"), /metadataBase:\s*new URL\("https:\/\/www\.sna\.hk"\)/);
  assert.match(read("next.config.mjs"), /process\.env\.NEXT_PUBLIC_SITE_URL\s*\?\?\s*"https:\/\/www\.sna\.hk"/);
  assert.equal(read(".env.example").trim(), `NEXT_PUBLIC_SITE_URL=${canonicalUrl}`);
});

test("tracked text source contains no retired-site brand or host strings", () => {
  const retiredSitePattern = new RegExp(
    `${["ai", "edhk"].join("")}|${["ai", "ed", "\\.hk"].join("")}`,
    "i"
  );
  const offenders = trackedTextFiles()
    .filter((file) => retiredSitePattern.test(readFileSync(file, "utf8")))
    .map((file) => path.relative(repositoryRoot, file));

  assert.deepEqual(offenders, []);
});

test("the SNA logo is a flat seven-node, eight-edge bridge network", () => {
  const logo = read("public/logos/sna-logo.svg");
  const circles = logo.match(/<circle\b[^>]*\/?\s*>/gi) ?? [];
  const lines = logo.match(/<line\b[^>]*\/?\s*>/gi) ?? [];

  assert.equal(circles.length, 7);
  assert.equal(lines.length, 8);
  assert.doesNotMatch(logo, /<(?:linearGradient|radialGradient|filter)\b|\bfilter\s*=/i);

  const amberNodes = circles.filter((circle) => /\bfill=["']#F4A340["']/i.test(circle));
  assert.equal(amberNodes.length, 1, "there must be exactly one amber bridge node");

  const coordinate = (tag: string, attribute: string) =>
    tag.match(new RegExp(`\\b${attribute}=["']([^"']+)["']`, "i"))?.[1];
  const bridgeX = coordinate(amberNodes[0], "cx");
  const bridgeY = coordinate(amberNodes[0], "cy");
  assert.ok(bridgeX && bridgeY, "the bridge node must have coordinates");

  const incidentEdges = lines.filter((line) => {
    const startsAtBridge = coordinate(line, "x1") === bridgeX && coordinate(line, "y1") === bridgeY;
    const endsAtBridge = coordinate(line, "x2") === bridgeX && coordinate(line, "y2") === bridgeY;
    return startsAtBridge || endsAtBridge;
  });
  assert.equal(incidentEdges.length, 2, "the amber node must bridge the two network clusters");
});

test("the home hero is a 1536 by 864 PNG", () => {
  const heroPath = fromRoot("public/images/home/sna-network-research-studio.png");
  assert.ok(existsSync(heroPath));
  const png = readFileSync(heroPath);
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(png.subarray(12, 16).toString("ascii"), "IHDR");
  assert.equal(png.readUInt32BE(16), 1536);
  assert.equal(png.readUInt32BE(20), 864);
});

test("visible interface source uses neither em dash nor en dash characters", () => {
  const interfaceFiles = ["app", "components", "lib"].flatMap((directory) => walk(fromRoot(directory)));
  const visibleDashPattern = /[\u2013\u2014]/;
  const offenders = interfaceFiles
    .filter((file) => visibleDashPattern.test(readFileSync(file, "utf8")))
    .map((file) => path.relative(repositoryRoot, file));

  assert.deepEqual(offenders, []);
});

test("root and legacy route aliases redirect to the localized canonical routes", async () => {
  assert.match(read("app/page.tsx"), /redirect\(["']\/en["']\)/);

  const configModule = await import(pathToFileURL(fromRoot("next.config.mjs")).href);
  const redirects = await configModule.default.redirects();
  assert.deepEqual(redirects, [
    {
      source: "/:path*",
      has: [{ type: "host", value: "sna.hk" }],
      destination: "https://www.sna.hk/:path*",
      permanent: true,
    },
    { source: "/news", destination: "/en/news", permanent: false },
    { source: "/news/:slug*", destination: "/en/news/:slug*", permanent: false },
    { source: "/academy", destination: "/en/academy", permanent: false },
    { source: "/academy/:slug*", destination: "/en/academy/:slug*", permanent: false },
    { source: "/mission", destination: "/en/mission", permanent: false },
    { source: "/about", destination: "/en/about", permanent: false },
    { source: "/research-news", destination: "/en/news", permanent: true },
    { source: "/research-news/:slug*", destination: "/en/news/:slug*", permanent: true },
    {
      source: "/:locale(en|zh-hant|zh-hans)/research-news",
      destination: "/:locale/news",
      permanent: true,
    },
    {
      source: "/:locale(en|zh-hant|zh-hans)/research-news/:slug*",
      destination: "/:locale/news/:slug*",
      permanent: true,
    },
  ]);
});

test("the site has no database, scheduled-publishing, or mailing dependencies", () => {
  const packageJson = JSON.parse(read("package.json")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const dependencyNames = Object.keys({
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  });
  const forbiddenDependency = /postgres(?:ql)?|^pg$|prisma|drizzle|supabase|neon|cron|newsletter|mailchimp|resend|sendgrid|nodemailer/i;
  assert.deepEqual(dependencyNames.filter((name) => forbiddenDependency.test(name)), []);

  const runtimeSource = ["app", "components", "lib"]
    .flatMap((directory) => walk(fromRoot(directory)))
    .filter((file) => /\.(?:ts|tsx)$/.test(file));
  const forbiddenImports = runtimeSource.flatMap((file) =>
    importSpecifiers(readFileSync(file, "utf8"))
      .filter((specifier) => forbiddenDependency.test(specifier))
      .map((specifier) => `${path.relative(repositoryRoot, file)} -> ${specifier}`)
  );
  assert.deepEqual(forbiddenImports, []);
});

test("semantic layout metadata and Open Graph assets are present", () => {
  const rootLayout = read("app/layout.tsx");
  assert.match(rootLayout, /export const metadata:\s*Metadata\s*=/);
  assert.match(rootLayout, /description:/);
  assert.match(rootLayout, /openGraph:\s*\{/);
  assert.match(rootLayout, /twitter:\s*\{/);
  assert.match(rootLayout, /images:\s*\[/);

  const localeLayout = read("app/[locale]/layout.tsx");
  assert.match(localeLayout, /export async function generateMetadata/);
  assert.match(localeLayout, /alternates:\s*\{/);
  assert.match(localeLayout, /canonical:/);
  assert.match(localeLayout, /languages:/);
  assert.match(localeLayout, /openGraph:\s*\{/);
  assert.match(localeLayout, /<main>\{children\}<\/main>/);

  const openGraphImage = read("app/opengraph-image.tsx");
  assert.match(openGraphImage, /export const alt\s*=/);
  assert.match(openGraphImage, /export const size\s*=\s*\{\s*width:\s*1200,\s*height:\s*630\s*\}/);
  assert.match(openGraphImage, /export const contentType\s*=\s*["']image\/png["']/);
  assert.match(openGraphImage, /new ImageResponse\(/);

  assert.match(read("components/Header.tsx"), /<header\b/);
  assert.match(read("components/Header.tsx"), /<nav\b[^>]*aria-label=/);
  assert.match(read("components/Footer.tsx"), /<footer\b/);
  assert.match(read("components/SectionHeader.tsx"), /<h1\b/);
});
