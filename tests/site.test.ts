import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { getDictionary, localeMeta, locales } from "../lib/i18n";
import { filterNewsArticles } from "../lib/news-filter";
import { localizeNewsArticle, newsArticles, newsYears } from "../lib/news-reviewed-data";

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

test("the localized Home, Mission, Open SNA, News, Academy, and About route files exist", () => {
  const routeFiles = [
    "app/[locale]/page.tsx",
    "app/[locale]/mission/page.tsx",
    "app/[locale]/open-sna/page.tsx",
    "app/[locale]/news/page.tsx",
    "app/[locale]/academy/page.tsx",
    "app/[locale]/about/page.tsx",
  ];

  for (const routeFile of routeFiles) {
    assert.ok(existsSync(fromRoot(routeFile)), `${routeFile} is required`);
    assert.ok(statSync(fromRoot(routeFile)).isFile(), `${routeFile} must be a file`);
  }
});

test("Academy uses a reviewed tutorial corpus, discovery controls, and real detail routes", () => {
  const pageSource = read("app/[locale]/academy/page.tsx");
  assert.doesNotMatch(pageSource, /EmptyState/);
  assert.match(pageSource, /academyLessons/);
  assert.match(pageSource, /filterAcademyLessons/);
  assert.match(pageSource, /<AcademyFilters\b/);
  assert.match(pageSource, /<AcademyCard\b/);
  assert.match(pageSource, /<AcademyPagination\b/);
  assert.match(pageSource, /copy\.pathwaySteps\.map/);

  const detailSource = read("app/[locale]/academy/[slug]/page.tsx");
  assert.match(detailSource, /generateStaticParams/);
  assert.match(detailSource, /export const dynamicParams = false/);
  assert.match(detailSource, /getAcademyLesson\(slug\)/);
  assert.match(detailSource, /if \(!record\) notFound\(\)/);
  assert.match(detailSource, /academyLearningResourceJsonLd/);
  assert.match(detailSource, /breadcrumbJsonLd/);
  assert.match(detailSource, /lesson\.learningObjectives\.map/);
  assert.match(detailSource, /lesson\.tutorialSteps\.map/);
  assert.match(detailSource, /lesson\.responsibleUse/);
  assert.match(detailSource, /getAcademySequenceNeighbors/);

  const structuredDataSource = read("lib/structured-data.ts");
  assert.match(structuredDataSource, /export function academyLearningResourceJsonLd/);
  assert.match(structuredDataSource, /"@type": "LearningResource"/);
});

test("News uses a static reviewed corpus, research discovery controls, and real detail routes", () => {
  const pageSource = read("app/[locale]/news/page.tsx");
  assert.doesNotMatch(pageSource, /EmptyState/);
  assert.match(pageSource, /newsArticles\.map/);
  assert.match(pageSource, /filterNewsArticles/);
  assert.match(pageSource, /<NewsFilters\b/);
  assert.match(pageSource, /alt: featured\.imageAlt/);
  assert.match(pageSource, /<NewsCard\b/);
  assert.match(pageSource, /<NewsPagination\b/);
  assert.match(pageSource, /copy\.inclusionItems\.map/);
  assert.doesNotMatch(pageSource, /newsletter|mailing/i);

  const detailSource = read("app/[locale]/news/[slug]/page.tsx");
  assert.match(detailSource, /generateStaticParams/);
  assert.match(detailSource, /export const dynamicParams = false/);
  assert.match(detailSource, /getNewsArticle\(slug\)/);
  assert.match(detailSource, /if \(!record\) notFound\(\)/);
  assert.match(detailSource, /newsReviewArticleJsonLd/);
  assert.match(detailSource, /breadcrumbJsonLd/);
  assert.match(detailSource, /publishedTime: article\.reviewedAt/);
  assert.match(detailSource, /article\.nodes/);
  assert.match(detailSource, /article\.ties/);
  assert.match(detailSource, /article\.methods/);
  assert.match(detailSource, /article\.limitations/);
  assert.match(detailSource, /article\.keyTakeaways\.map/);
  assert.match(read("components/NewsCard.tsx"), /<h3\b/);
  assert.doesNotMatch(read("components/NewsCard.tsx"), /<h2\b/);
  assert.match(read("components/NewsFilters.tsx"), /aria-current/);

  const structuredDataSource = read("lib/structured-data.ts");
  assert.match(structuredDataSource, /"@type": "Article"/);
  assert.match(structuredDataSource, /about: sourceArticle/);
  assert.match(structuredDataSource, /datePublished: article\.reviewedAt/);
});

test("the reviewed News corpus preserves its baseline and supports complete scholarly growth", () => {
  const baselineIds = [
    "sna-007",
    "sna-006",
    "sna-005",
    "sna-004",
    "sna-003",
    "sna-002",
    "sna-001",
  ];
  assert.ok(newsArticles.length >= baselineIds.length);
  assert.ok(baselineIds.every((id) => newsArticles.some((article) => article.id === id)));
  assert.deepEqual(
    newsArticles.map((article) => article.sequence).sort((left, right) => left - right),
    Array.from({ length: newsArticles.length }, (_, index) => index + 1),
  );
  assert.deepEqual(
    newsYears,
    [...new Set(newsArticles.map((article) => article.year))].sort((left, right) => right - left),
  );
  assert.equal(newsArticles.find((article) => article.id === "sna-001")?.publishedAt, "2016-12-29");

  const currentRelease = newsArticles.find((article) => article.id === "sna-008");
  assert.ok(currentRelease);
  assert.equal(currentRelease.doi, "10.1007/s41109-025-00750-7");
  assert.equal(currentRelease.publishedAt, "2025-12-02");
  assert.equal(currentRelease.openAccess, true);

  const ids = new Set<string>();
  const slugs = new Set<string>();
  const sources = new Set<string>();
  const dois = new Set<string>();
  const citations = new Set<string>();
  const titles = new Set<string>();
  const events = new Set<string>();
  let previousDate = "9999-12-31";

  for (const article of newsArticles) {
    assert.ok(article.type === "journal" || article.type === "conference");
    assert.match(article.id, /^sna-\d{3}$/);
    assert.equal(article.sequence, Number.parseInt(article.id.slice(4), 10));
    assert.match(article.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.match(article.sourceUrl, /^https:\/\//);
    assert.match(article.doi, /^10\./);
    assert.match(article.publishedAt, /^\d{4}-\d{2}(?:-\d{2})?$/);
    assert.equal(article.year, Number.parseInt(article.publishedAt.slice(0, 4), 10));
    assert.match(article.reviewedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(article.authors.length >= 2);
    assert.ok(article.venue.trim().length > 0);
    assert.ok(article.citation.trim().length > 0);
    assert.ok(article.publishedAt <= previousDate, "articles must be ordered newest to oldest");
    previousDate = article.publishedAt;

    assert.ok(!ids.has(article.id), `${article.id} must be unique`);
    assert.ok(!slugs.has(article.slug), `${article.slug} must be unique`);
    const normalizedSource = new URL(article.sourceUrl);
    normalizedSource.hash = "";
    normalizedSource.search = "";
    const normalizedSourceKey = `${normalizedSource.hostname.replace(/^www\./, "").toLowerCase()}${normalizedSource.pathname.replace(/\/+$/, "").toLowerCase()}`;
    const normalizedDoi = article.doi.trim().toLowerCase().replace(/^https?:\/\/(?:dx\.)?doi\.org\//, "");
    const normalizedTitle = article.localizations.en.title.trim().toLowerCase();
    const normalizedEvent = `${article.publishedAt}|${article.venue.trim().toLowerCase()}|${normalizedTitle}`;

    assert.ok(!sources.has(normalizedSourceKey), `${article.sourceUrl} must be unique`);
    assert.ok(!dois.has(normalizedDoi), `${article.doi} must be unique`);
    assert.ok(!citations.has(article.citation), `${article.citation} must be unique`);
    assert.ok(!titles.has(normalizedTitle), `${article.localizations.en.title} must be unique`);
    assert.ok(!events.has(normalizedEvent), `${normalizedEvent} must be unique`);
    ids.add(article.id);
    slugs.add(article.slug);
    sources.add(normalizedSourceKey);
    dois.add(normalizedDoi);
    citations.add(article.citation);
    titles.add(normalizedTitle);
    events.add(normalizedEvent);

    for (const locale of locales) {
      const localized = localizeNewsArticle(article, locale);
      assertCompleteText(article.localizations[locale], `${article.id}.${locale}`);
      assert.equal(localized.tags.length, 3);
      assert.equal(localized.overview.length, 2);
      assert.equal(localized.keyTakeaways.length, 3);
      const summaryMinimum = locale === "en" ? 80 : 40;
      const methodMinimum = locale === "en" ? 80 : 40;
      const limitationMinimum = locale === "en" ? 50 : 30;
      const designMinimum = locale === "en" ? 20 : 10;
      assert.ok(localized.summary.length >= summaryMinimum, `${article.id}.${locale} summary must be substantive`);
      assert.ok(localized.howSnaWasUsed.length >= methodMinimum, `${article.id}.${locale} must explain the SNA approach`);
      assert.ok(localized.nodes.length >= designMinimum);
      assert.ok(localized.ties.length >= designMinimum);
      assert.ok(localized.methods.length >= designMinimum);
      assert.ok(localized.limitations.length >= limitationMinimum, `${article.id}.${locale} must state an evidence boundary`);
    }
  }

  assert.ok(newsArticles.some((article) => article.type === "journal"));
  assert.ok(newsArticles.some((article) => article.type === "conference"));
  assert.ok(newsArticles.some((article) => !article.openAccess), "the corpus must represent access status honestly");
});

test("News search, filtering, and six-item pagination preserve the reviewed corpus contract", () => {
  const english = newsArticles.map((article) => localizeNewsArticle(article, "en"));
  const firstPage = filterNewsArticles(english);
  assert.deepEqual(firstPage.items, english.slice(0, 6));
  assert.equal(firstPage.total, english.length);
  assert.equal(firstPage.page, 1);
  assert.equal(firstPage.totalPages, Math.max(1, Math.ceil(english.length / 6)));

  const secondPage = filterNewsArticles(english, { page: "2" });
  assert.deepEqual(secondPage.items, english.slice(6, 12));

  const conference = filterNewsArticles(english, { type: "conference" });
  assert.ok(conference.items.length > 0);
  assert.ok(conference.items.every((article) => article.type === "conference"));

  const search = filterNewsArticles(english, { q: "centrality" });
  assert.ok(search.total > 0);
  assert.ok(search.items.some((article) => article.methods.toLowerCase().includes("centrality")));

  const filteredYear = filterNewsArticles(english, { year: "2024" });
  assert.equal(filteredYear.total, 1);
  assert.equal(filteredYear.items[0].id, "sna-006");
});

test("each News article has a distinct 1536 by 960 PNG and a byte-identical summary copy", () => {
  const distinctCoverHashes = new Set<string>();

  for (const article of newsArticles) {
    const coverPath = fromRoot("public", article.coverImage.slice(1));
    const summaryPath = fromRoot("public", article.summaryImage.slice(1));
    assert.ok(existsSync(coverPath), `${article.coverImage} must exist`);
    assert.ok(existsSync(summaryPath), `${article.summaryImage} must exist`);

    const cover = readFileSync(coverPath);
    const summary = readFileSync(summaryPath);
    assert.deepEqual([...cover.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(cover.subarray(12, 16).toString("ascii"), "IHDR");
    assert.equal(cover.readUInt32BE(16), 1536);
    assert.equal(cover.readUInt32BE(20), 960);

    const coverHash = createHash("sha256").update(cover).digest("hex");
    const summaryHash = createHash("sha256").update(summary).digest("hex");
    assert.equal(summaryHash, coverHash, `${article.id} cover and summary image must be the same bitmap`);
    distinctCoverHashes.add(coverHash);
  }

  assert.equal(distinctCoverHashes.size, newsArticles.length, "every article must have a distinct master image");
});

test("the About page presents Dr. Peter Hu's localized SNA profile and verified public tools", () => {
  const pageSource = read("app/[locale]/about/page.tsx");

  assert.match(pageSource, /import Image from ["']next\/image["']/);
  assert.match(pageSource, /src=["']\/images\/about\/dr-peter-hu-dongpin\.png["']/);
  assert.match(pageSource, /src=["']\/logos\/pedanova-mark-transparent\.png["']/);
  assert.ok(existsSync(fromRoot("public/logos/pedanova-mark-transparent.png")));
  assert.match(pageSource, /<SectionHeader\b/);
  assert.match(pageSource, /<JsonLd data=\{structuredData\}/);
  assert.match(pageSource, /personJsonLd\(\{/);
  assert.match(pageSource, /aboutOrganizationJsonLd\(\{/);
  assert.match(pageSource, /type:\s*["']profile["']/);
  assert.match(pageSource, /images:\s*\[/);
  assert.match(pageSource, /absoluteUrl\(["']\/opengraph-image["']\)/);
  assert.match(pageSource, /canonical:\s*url/);
  assert.match(pageSource, /languages:\s*Object\.fromEntries/);
  assert.match(pageSource, /\{copy\.principalLabel\}/);
  assert.match(pageSource, /\{copy\.personTitle\}/);
  assert.match(pageSource, /\{copy\.personText\}/);
  assert.match(pageSource, /copy\.focusItems\.map/);
  assert.match(pageSource, /copy\.products\.map/);
  assert.match(pageSource, /profileLinks\.map/);
  assert.match(pageSource, /target=["']_blank["']/);
  assert.match(pageSource, /rel=["']noreferrer["']/);

  const expectedUrls = [
    "https://www.hudongpin.com",
    "https://www.pedanova.tech",
    "https://github.com/HUDongpin/sna.js",
    "https://www.3dena.com",
  ];
  for (const url of expectedUrls) assert.ok(pageSource.includes(url), `${url} must be linked from About`);

  const retiredTopicPattern = new RegExp(["ai", "ed"].join(""), "i");
  for (const locale of locales) {
    const about = getDictionary(locale).about;
    assert.match(about.personText, /Dr\. Peter Hu Dongpin/);
    assert.match(`${about.title} ${about.personText}`, /SNA\.HK/);
    assert.equal(about.focusItems.length, 4, `${locale} must have four SNA focus items`);
    assert.deepEqual(
      about.products.map((product) => product.name),
      ["SNA.js", "3D ENA"],
      `${locale} must expose the two SNA tools`
    );
    assert.doesNotMatch(JSON.stringify(about), retiredTopicPattern);
  }
});

test("the canonical production host is www.sna.hk", () => {
  const canonicalUrl = "https://www.sna.hk";
  assert.match(read("lib/site.ts"), new RegExp(canonicalUrl.replaceAll(".", "\\.")));
  assert.match(read("app/layout.tsx"), /metadataBase:\s*new URL\("https:\/\/www\.sna\.hk"\)/);
  assert.match(read("next.config.mjs"), /process\.env\.NEXT_PUBLIC_SITE_URL\s*\?\?\s*"https:\/\/www\.sna\.hk"/);
  const environment = read(".env.example").split(/\r?\n/);
  assert.equal(environment[0], `NEXT_PUBLIC_SITE_URL=${canonicalUrl}`);
  assert.ok(environment.includes("OPEN_SNA_R_API_URL="));
  assert.ok(environment.includes("OPEN_SNA_R_API_TOKEN="));
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
  assert.match(read("components/Logo.tsx"), /Social Network Analysis Hub of Knowledge/);
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

test("the Dr. Peter Hu portrait is the expected 640 by 640 PNG", () => {
  const portraitPath = fromRoot("public/images/about/dr-peter-hu-dongpin.png");
  assert.ok(existsSync(portraitPath));
  const png = readFileSync(portraitPath);
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(png.subarray(12, 16).toString("ascii"), "IHDR");
  assert.equal(png.readUInt32BE(16), 640);
  assert.equal(png.readUInt32BE(20), 640);
  assert.equal(
    createHash("sha256").update(png).digest("hex"),
    "1b1fd7d8eef4d17cbf2d74610bf9d2e8f748e96b3db76a0f9ea7b75f2ec33071"
  );
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
    { source: "/open-sna", destination: "/en/open-sna", permanent: false },
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

  const aboutPage = read("app/[locale]/about/page.tsx");
  const structuredData = read("lib/structured-data.ts");
  assert.match(aboutPage, /openGraph:\s*\{[\s\S]*type:\s*["']profile["']/);
  assert.match(aboutPage, /personJsonLd/);
  assert.match(structuredData, /export function personJsonLd/);
  assert.match(structuredData, /export function aboutOrganizationJsonLd/);
});
