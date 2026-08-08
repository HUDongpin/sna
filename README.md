# SNA.HK

SNA.HK is a multilingual knowledge website for clear, rigorous, and responsible social network analysis. The site uses the Next.js App Router, TypeScript, React, and Tailwind CSS. Its production target is [https://www.sna.hk](https://www.sna.hk).

## Architecture

The project is intentionally static and compact:

| Area | Location | Responsibility |
| --- | --- | --- |
| Application shell | `app/layout.tsx` | Global metadata, analytics, global styles, and shared page behavior |
| Localized shell | `app/[locale]/layout.tsx` | Locale validation, alternate-language metadata, header, footer, and structured data |
| Pages | `app/[locale]` | Home, Mission, News, Academy, and About routes |
| Shared interface | `components` | Navigation, logo, calls to action, section headings, and empty states |
| Localization | `lib/i18n.ts` | Locale registry, locale metadata, dictionary type, and all interface copy |
| Site identity | `lib/site.ts` | Canonical URL and absolute URL construction |
| Search semantics | `lib/structured-data.ts`, `app/robots.ts`, `app/sitemap.ts` | JSON-LD, robots policy, and localized sitemap entries |
| Static assets | `public` | Logo, favicon, and home hero image |
| Contract validation | `tests/site.test.ts` | Mechanical checks for routes, localization, branding, content boundaries, metadata, and redirects |

There is no content database, scheduled publishing service, or mailing integration in the current architecture.

## Locales

The site supports exactly three URL locales:

| URL prefix | Language |
| --- | --- |
| `/en` | English |
| `/zh-hant` | Traditional Chinese |
| `/zh-hans` | Simplified Chinese |

Every locale uses the same typed dictionary shape. When interface copy changes, update all three dictionaries in `lib/i18n.ts`; the test suite checks key, array, and nested-object parity and rejects empty values.

The root route redirects to `/en`. Nonlocalized aliases such as `/news`, `/academy`, `/mission`, and `/about` also redirect to their English routes. Historical `research-news` paths redirect to the canonical `news` route.

## Logo

The SNA mark represents two network clusters connected through one bridge node. Its flat SVG construction uses seven nodes and eight edges, with no gradients or filters.

| Color | Hex | Meaning |
| --- | --- | --- |
| Indigo | `#403A8F` | One network community and analytical rigor |
| Teal | `#18A99A` | A second community and relational exchange |
| Amber | `#F4A340` | The single bridge node connecting the communities |
| Soft violet | `#F5F3FF` | Mark background and visual continuity |

The canonical logo is `public/logos/sna-logo.svg`. The favicon and generated Open Graph image use the same visual system.

## News and Academy content contract

News and Academy are deliberate empty-state pages. Each page provides localized introductory copy and a clear coming-soon message, but neither page loads article records, course records, a database, nor a mailing workflow.

Until real content and its publishing model are approved:

1. Keep `app/[locale]/news/page.tsx` and `app/[locale]/academy/page.tsx` as explicit `EmptyState` consumers.
2. Keep their dynamic detail routes unavailable through `notFound()`.
3. Do not add content-data, database, or newsletter imports to either page.
4. Update the three dictionaries together if the empty-state wording changes.

## Local development

Prerequisites are a current Node.js LTS release and npm.

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
```

`npm run release:verify` runs the contract tests, production build, TypeScript check, and repository hygiene check in sequence.

## Validation contract

The site test mechanically verifies:

- exactly three complete locale dictionaries with structural parity;
- the five required localized page routes;
- explicit empty states for News and Academy;
- the canonical `www.sna.hk` host and route aliases;
- removal of retired-site branding from tracked text source;
- the logo's node, edge, bridge-node, and flat-SVG constraints;
- the presence and dimensions of the 1536 by 864 PNG hero;
- interface punctuation constraints;
- absence of database, scheduled-publishing, and mailing dependencies; and
- semantic metadata, alternate-language metadata, structured layout elements, and Open Graph assets.

Before release, run:

```bash
npm run release:verify
```

## Deployment target

The intended hosting platform is Vercel and the intended production URL is [https://www.sna.hk](https://www.sna.hk). Set `NEXT_PUBLIC_SITE_URL=https://www.sna.hk` in the Vercel project so canonical URLs, sitemap entries, robots metadata, and structured data agree.

A release should only be described as complete after all of the following are independently verified:

1. The project has been published to the intended GitHub repository named `sna`.
2. The intended Vercel project is connected to that repository.
3. A production deployment reaches the `READY` state.
4. `www.sna.hk` is attached to that Vercel project and resolves to the production deployment.
5. The localized routes, logo, hero image, metadata, and redirects work on the live domain.

Repository publication, Vercel deployment, and domain attachment are release operations outside this documentation. Their completion is not asserted here.
