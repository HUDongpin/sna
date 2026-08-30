# SNA.HK

SNA.HK is a multilingual knowledge website for clear, rigorous, and responsible social network analysis. The site uses the Next.js App Router, TypeScript, React, and Tailwind CSS. Its production target is [https://www.sna.hk](https://www.sna.hk).

## Architecture

The project is static-first and compact. Open SNA adds an explicitly bounded analysis boundary while the reviewed content areas remain static:

| Area | Location | Responsibility |
| --- | --- | --- |
| Application shell | `app/layout.tsx` | Global metadata, analytics, global styles, and shared page behavior |
| Localized shell | `app/[locale]/layout.tsx` | Locale validation, alternate-language metadata, header, footer, and structured data |
| Pages | `app/[locale]` | Home, Mission, Open SNA, News, Academy, and About routes |
| Shared interface | `components` | Navigation, logo, calls to action, section headings, News and Academy discovery controls, cards, pagination, and tutorial visuals |
| Localization | `lib/i18n.ts` | Locale registry, locale metadata, dictionary type, and all interface copy |
| Reviewed News corpus | `lib/news-reviewed-data.ts` | Static journal and conference records, three-language summaries, SNA methods, and evidence boundaries |
| News discovery | `lib/news-filter.ts`, `lib/news-types.ts` | Search, filters, pagination, and typed article contracts |
| Reviewed Academy corpus | `lib/academy-reviewed-data.ts` | A growing sequence of static SNA tutorials with complete three-language content, method sources, and evidence and privacy boundaries |
| Academy discovery | `lib/academy-filter.ts`, `lib/academy-types.ts` | Search, track and level filters, pagination, and typed tutorial contracts |
| Open SNA workbench | `app/[locale]/open-sna`, `components/open-sna`, `lib/open-sna.ts` | English analysis interface, accessible visualizations, aggregate result contract, and downloads |
| Open SNA R boundary | `analysis/open-sna`, `app/api/open-sna/analyze` | Reproducible R runner, bounded local adapter, and fail-closed production service integration |
| Site identity | `lib/site.ts` | Canonical URL and absolute URL construction |
| Search semantics | `lib/structured-data.ts`, `app/robots.ts`, `app/sitemap.ts` | JSON-LD, robots policy, and localized sitemap entries |
| Static assets | `public` | Logo, favicon, home hero image, public About-page identity assets, and reviewed News media |
| Contract validation | `tests/site.test.ts` | Mechanical checks for routes, localization, branding, content boundaries, metadata, and redirects |

There is no content database, scheduled publishing service, or mailing integration in the current architecture. The Open SNA production upload path requires an independently deployed R service; without it, the upload action fails closed while the bundled aggregate reference remains available.

## Locales

The site supports exactly three URL locales:

| URL prefix | Language |
| --- | --- |
| `/en` | English |
| `/zh-hant` | Traditional Chinese |
| `/zh-hans` | Simplified Chinese |

Every locale uses the same typed dictionary shape. When interface copy changes, update all three dictionaries in `lib/i18n.ts`; the test suite checks key, array, and nested-object parity and rejects empty values.

The root route redirects to `/en`. Nonlocalized aliases such as `/news`, `/academy`, `/mission`, `/open-sna`, and `/about` also redirect to their English routes. Historical `research-news` paths redirect to the canonical `news` route.

## Open SNA analysis contract

Open SNA is an English research workbench available within all three localized shells. Its canonical and sitemap entry is `/en/open-sna` because the workbench itself is not presented as a three-language translation. It exposes eight connected result areas: Data Overview, Network Visualization, Centrality Analysis, Bridge Node Analysis, Predictability Analysis, Subgroup Comparison (NCT), Stability Analysis, and AI Interpretation. Every successful result uses aggregate schema `1.1` and includes one valid binary `Gender` or metadata grouping column with at least 20 analyzed rows in each group after listwise deletion. For uploaded analyses, the final area uses GPT-5.6 Luna through OpenRouter when `OPENROUTER_API_KEY` is configured; only a bounded aggregate-statistics payload is sent, with zero-data-retention and no-data-collection routing required. If LUNA is unavailable, the result remains usable and clearly falls back to the deterministic, evidence-bound R summary.

All network-based panels use the named `npn-ebicglasso-v1` profile. Predictability uses a separately identified MGM model with the same input and preprocessing provenance. NCT uses 1,000 independent-group permutations with Holm-adjusted edge tests, and the recommended stability result uses 1,000 case-dropping bootstrap samples. CS coefficients below 0.25 are marked "Do not interpret."

The public Programming Resilience example contains aggregate results only. The original workbook, respondent rows, and ID values are not public assets. See `analysis/open-sna/README.md` for the method, workbook schema, runtime, local command, privacy boundary, and production-worker requirements.

## Logo

The SNA mark represents two network clusters connected through one bridge node. Its flat SVG construction uses seven nodes and eight edges, with no gradients or filters.

| Color | Hex | Meaning |
| --- | --- | --- |
| Indigo | `#403A8F` | One network community and analytical rigor |
| Teal | `#18A99A` | A second community and relational exchange |
| Amber | `#F4A340` | The single bridge node connecting the communities |
| Soft violet | `#F5F3FF` | Mark background and visual continuity |

The canonical logo is `public/logos/sna-logo.svg`. The favicon and generated Open Graph image use the same visual system.

## About profile contract

The localized About page presents Dr. Peter Hu Dongpin and the SNA-specific research and development ecosystem. Its structure is intentionally stable:

1. A centered localized page heading.
2. A profile card with the authorized public portrait at `public/images/about/dr-peter-hu-dongpin.png`, an initiator label, a concise biography, and four SNA focus areas.
3. A related-company panel for PedaNova and cards for the SNA.js and 3D ENA network tools.
4. Public R&D links to [hudongpin.com](https://www.hudongpin.com), [pedanova.tech](https://www.pedanova.tech), [SNA.js](https://github.com/HUDongpin/sna.js), and [3D ENA](https://www.3dena.com).
5. About-specific profile metadata plus localized Person and Organization JSON-LD.

Update the English, Traditional Chinese, and Simplified Chinese About dictionaries together. Keep biography statements limited to public, verifiable professional information. Do not add private contact details, affiliations, awards, or achievements without a current authoritative source.

## News content contract

News is a static, reviewed collection of journal and peer-reviewed conference articles that use social network analysis as a substantive data analysis approach. It uses a structured research-news discovery and article-summary pattern with an SNA-specific editorial lens.

Every News record must:

1. Identify relational data with meaningful nodes and ties.
2. Describe the SNA method or model actually used in the source study.
3. Link to an authoritative article, proceedings, or repository page over HTTPS and retain the DOI.
4. Distinguish findings from causal claims and state the study's evidence boundary.
5. Provide complete English, Traditional Chinese, and Simplified Chinese localizations with the same typed field structure.
6. Use a 1536 by 960 PNG master image with two article-aligned paths: one under `public/images/news/covers` and one under `public/images/news/summary`. The two files for one article must contain the same bitmap, while different articles must use distinct masters.

The News index is server-rendered from a static reviewed corpus. Search, article type, year filters, and six-item pagination use URL query parameters. Article detail pages expose localized metadata, an `Article` JSON-LD record whose source study is embedded as `ScholarlyArticle`, breadcrumb JSON-LD, the network design, reviewed summary, key takeaways, responsible limitations, source citation, and related articles. There is no content database, scheduled publisher, newsletter, or mailing workflow.

## Academy content contract

Academy is a static, reviewed learning pathway that adapts the News presentation grammar to instruction without treating tutorials as research papers. Its preserved baseline progresses from network specification and representation through centrality, cohesion, QAP, and ERGM analysis, with later reviewed lessons extending the sequence into topics such as longitudinal network comparison.

Every Academy record must:

1. Use a stable `academy-NNN` identifier, sequence, slug, track, level, duration, publication date, and review date.
2. Declare `social-network-analysis` as its analysis approach and state nodes, ties, network type, direction, weights, boundary, and missing-data meaning where relevant.
3. Provide exactly three learning objectives, four tutorial steps with checkpoints, two interpretation sections, three core ideas, a practice task, three related concepts, and an explicit evidence and privacy boundary.
4. Link to at least two authoritative methodological sources over HTTPS.
5. Provide complete English, Traditional Chinese, and Simplified Chinese localizations with the same typed field structure. Silent body-copy fallback is not permitted.
6. Use the shared CSS network visual as a purposeful lesson preview. Academy does not inherit News' two-path same-bitmap storage contract.

The Academy index follows the News discovery pattern with URL-based search, track and level filters, and six-item pagination. Lesson details expose localized metadata, `LearningResource` and breadcrumb JSON-LD, learning objectives, a network specification, step-by-step analysis, careful interpretation, responsible-use guidance, sequential navigation, sources, and related tutorials. There is no progress storage, account state, database, scheduled publisher, newsletter, audio, or mailing workflow.

## Local development

Prerequisites are a current Node.js LTS release and npm. Viewing the aggregate Open SNA reference requires only the web application. Running local workbook analysis also requires the exact verified R runtime documented in `analysis/open-sna/README.md`; a production container and transitive dependency lock remain a separate deployment gate.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The root route will take you to the English home page.

Useful commands:

```bash
npm run test
npm run typecheck
npm run build
npm run release:hygiene
npm run release:verify
npm run open-sna:r-preflight
```

`npm run release:verify` runs the contract tests, production build, TypeScript check, and repository hygiene check in sequence.

## Validation contract

The site test mechanically verifies:

- exactly three complete locale dictionaries with structural parity;
- the six required localized page routes;
- the Open SNA navigation order, eight analysis areas, aggregate result contract, R method profile, and bounded upload adapter;
- a growing, source-linked, three-language News corpus that preserves all baseline records and contains only SNA journal and conference research;
- News search, article-type and year filtering, six-item pagination, detail routes, structured data, and sitemap entries;
- exact News image dimensions, same-bitmap cover/summary pairs, and distinct masters across articles;
- a growing, source-linked, three-language Academy corpus that preserves all baseline lessons in a deterministic SNA learning sequence;
- Academy search, track and level filtering, pagination, detail routes, `LearningResource` structured data, and sitemap entries;
- complete Academy nodes, ties, network-type, tutorial-step, interpretation, and evidence and privacy contracts;
- the canonical `www.sna.hk` host and route aliases;
- removal of retired-site branding from tracked text source;
- the logo's node, edge, bridge-node, and flat-SVG constraints;
- the presence and dimensions of the 1536 by 864 PNG hero;
- the localized Dr. Peter Hu profile, SNA tool links, profile metadata, structured data, and exact 640 by 640 portrait;
- interface punctuation constraints;
- absence of database, scheduled-publishing, and mailing dependencies; and
- semantic metadata, alternate-language metadata, structured layout elements, and Open Graph assets.

Before release, run:

```bash
npm run release:verify
```

## Deployment

The source repository is [HUDongpin/sna](https://github.com/HUDongpin/sna) and the production Vercel project is `peter-dongpin-hu-s-projects/sna`. The canonical production URL is [https://www.sna.hk](https://www.sna.hk). Set `NEXT_PUBLIC_SITE_URL=https://www.sna.hk` in the Vercel project so canonical URLs, sitemap entries, robots metadata, and structured data agree.

Vercel can serve the Open SNA interface and its precomputed aggregate reference, but it does not supply the R runtime in this repository. Set `OPEN_SNA_R_API_URL` only after a version-locked, privacy-reviewed R worker is deployed and verified. Set the server-only `OPENROUTER_API_KEY` for GPT-5.6 Luna interpretation; never expose it through a `NEXT_PUBLIC_` variable. When the R service variable is absent, production workbook analysis returns a clear `503 R_ENGINE_NOT_CONFIGURED` response and never substitutes the reference result.

For the Vercel backup path, `deploy/aliyun/env/vercel.env.example` records the non-secret contract only: `SNA_RELEASE_SHA`, `SNA_DEPLOYMENT_ROLE=vercel-backup`, `NEXT_PUBLIC_SITE_URL`, and `OPEN_SNA_R_DISABLED=1`.

The apex host `sna.hk` is attached for discoverability and permanently redirects to the canonical `www.sna.hk` host while preserving the requested path and query string.

A release should only be described as complete after all of the following are independently verified:

1. The project has been published to the intended GitHub repository named `sna`.
2. The intended Vercel project is connected to that repository.
3. A production deployment reaches the `READY` state.
4. `www.sna.hk` is attached to that Vercel project and resolves to the production deployment.
5. The localized routes, logo, hero image, metadata, and redirects work on the live domain.

Use current GitHub, Vercel, DNS, certificate, and route evidence when reporting a release. A historical README or local build is not sufficient production proof.
