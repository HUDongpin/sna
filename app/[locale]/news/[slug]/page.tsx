import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import NewsCard from "@/components/NewsCard";
import { getDictionary, getLocaleMeta, isLocale, locales, type Locale } from "@/lib/i18n";
import {
  getNewsArticle,
  getRelatedNewsArticles,
  localizeNewsArticle,
  newsArticles,
} from "@/lib/news-reviewed-data";
import { absoluteUrl } from "@/lib/site";
import { breadcrumbJsonLd, newsReviewArticleJsonLd } from "@/lib/structured-data";
import { formatDate, readingTimeMinutes } from "@/lib/utils";

type NewsDetailPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export function generateStaticParams() {
  return locales.flatMap((locale) => newsArticles.map((article) => ({ locale, slug: article.slug })));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: NewsDetailPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const record = getNewsArticle(slug);
  if (!record) return { title: getDictionary(locale).news.eyebrow };

  const article = localizeNewsArticle(record, locale);
  const url = absoluteUrl(`/${locale}/news/${slug}`);
  const image = absoluteUrl(article.coverImage);

  return {
    title: article.title,
    description: article.summary,
    alternates: {
      canonical: url,
      languages: Object.fromEntries(
        locales.map((item) => [getLocaleMeta(item).htmlLang, `/${item}/news/${slug}`])
      ),
    },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.summary,
      url,
      siteName: "SNA.HK",
      locale: getLocaleMeta(locale).htmlLang,
      publishedTime: article.reviewedAt,
      modifiedTime: article.reviewedAt,
      tags: article.tags,
      images: [{ url: image, width: 1536, height: 960, alt: article.imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.summary,
      images: [image],
    },
  };
}

export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale = locale as Locale;
  const record = getNewsArticle(slug);
  if (!record) notFound();

  const copy = getDictionary(typedLocale).news;
  const article = localizeNewsArticle(record, typedLocale);
  const relatedArticles = getRelatedNewsArticles(record, typedLocale, 3);
  const typeLabel = article.type === "journal" ? copy.journal : copy.conference;
  const identifier = `${typeLabel} ${String(article.sequence).padStart(2, "0")}`;
  const readingMinutes = readingTimeMinutes(
    [article.summary, ...article.overview, article.howSnaWasUsed, ...article.keyTakeaways, article.whyItMatters, article.limitations].join(" "),
    typedLocale
  );
  const articleUrl = absoluteUrl(`/${typedLocale}/news/${article.slug}`);
  const structuredData = [
    newsReviewArticleJsonLd(article, typedLocale),
    breadcrumbJsonLd([
      { name: "SNA.HK", url: absoluteUrl(`/${typedLocale}`) },
      { name: copy.eyebrow, url: absoluteUrl(`/${typedLocale}/news`) },
      { name: article.title, url: articleUrl },
    ]),
  ];
  const cardLabels = {
    journal: copy.journal,
    conference: copy.conference,
    readArticle: copy.readArticle,
    openAccess: copy.openAccess,
  };

  return (
    <div className="bg-sna-gradient">
      <JsonLd data={structuredData} />
      <article className="container-page py-12 lg:py-20">
        <Link
          href={`/${typedLocale}/news`}
          className="focus-ring inline-flex min-h-11 items-center rounded-full border border-[var(--line)] bg-[var(--surface)] px-5 py-2.5 text-sm font-black text-[var(--indigo)] shadow-sm transition hover:border-[var(--teal)]"
        >
          <span aria-hidden="true" className="mr-2">←</span>
          {copy.backToNews}
        </Link>

        <header className="mt-8 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="relative aspect-[16/10] overflow-hidden rounded-[2rem] border border-[var(--line)] bg-[var(--page-strong)] shadow-[var(--shadow-soft)]">
            <Image
              src={article.coverImage}
              alt={article.imageAlt}
              fill
              priority
              sizes="(min-width: 1024px) 45vw, calc(100vw - 32px)"
              className="object-cover"
            />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.16em]">
              <span className="rounded-full bg-[var(--teal)] px-3 py-1 text-[#101828]">{typeLabel}</span>
              <span className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-[var(--indigo)]">
                {identifier}
              </span>
              <span className="rounded-full bg-[var(--surface)] px-3 py-1 text-[var(--indigo)] shadow-sm">{article.year}</span>
              {article.openAccess ? (
                <span className="rounded-full bg-[color:rgba(24,169,154,0.14)] px-3 py-1 text-[var(--teal)]">{copy.openAccess}</span>
              ) : null}
            </div>
            <h1 className="mt-6 text-balance text-4xl font-black leading-[1.06] tracking-[-0.045em] text-[var(--ink)] sm:text-5xl">
              {article.title}
            </h1>
            <p className="mt-5 text-lg leading-8 text-[var(--muted)]">{article.authors.join(", ")}</p>
            <p className="mt-2 text-base font-bold leading-7 text-[var(--indigo)]">{article.venue}</p>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-[var(--muted)]">
              <span>{copy.publicationDate}: {formatDate(article.publishedAt, typedLocale)}</span>
              <span>{copy.readingTime}: {readingMinutes} {copy.minute}</span>
              <span>{copy.reviewedOn}: {formatDate(article.reviewedAt, typedLocale)}</span>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-xs font-bold text-[var(--muted)]">
                  {tag}
                </span>
              ))}
            </div>
            <a
              href={article.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="focus-ring mt-7 inline-flex min-h-12 items-center rounded-full bg-[#403A8F] px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#302B78]"
            >
              {copy.originalArticle}<span aria-hidden="true" className="ml-2">↗</span>
            </a>
          </div>
        </header>

        <section className="surface-card mt-12 grid gap-0 overflow-hidden md:grid-cols-3" aria-labelledby="network-design-heading">
          <h2 id="network-design-heading" className="sr-only">{copy.networkDesign}</h2>
          {[
            { label: copy.nodes, value: article.nodes, color: "var(--indigo)" },
            { label: copy.ties, value: article.ties, color: "var(--teal)" },
            { label: copy.methods, value: article.methods, color: "var(--amber)" },
          ].map((item, index) => (
            <div key={item.label} className={`p-6 sm:p-7 ${index > 0 ? "border-t border-[var(--line)] md:border-l md:border-t-0" : ""}`}>
              <span className="block h-1.5 w-12 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
              <h3 className="mt-4 text-sm font-black uppercase tracking-[0.16em] text-[var(--ink)]">{item.label}</h3>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{item.value}</p>
            </div>
          ))}
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-8">
            <section className="surface-card p-7 sm:p-9" aria-labelledby="reviewed-summary-heading">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--indigo)]">{copy.source}: {article.sourceLabel}</p>
              <h2 id="reviewed-summary-heading" className="mt-3 text-3xl font-black tracking-[-0.035em] text-[var(--ink)]">
                {copy.reviewedSummary}
              </h2>
              <figure className="relative mt-6 aspect-[16/10] overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--page-strong)]">
                <Image src={article.summaryImage} alt="" fill sizes="(min-width: 1024px) 62vw, calc(100vw - 80px)" className="object-cover" />
              </figure>
              <div className="mt-7 grid gap-5 text-lg leading-8 text-[var(--muted)]">
                {article.overview.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </section>

            <section className="surface-card network-field p-7 sm:p-9" aria-labelledby="how-sna-heading">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--teal)]">SNA</p>
              <h2 id="how-sna-heading" className="mt-3 text-3xl font-black tracking-[-0.035em] text-[var(--ink)]">
                {copy.howSnaWasUsed}
              </h2>
              <p className="mt-5 text-lg leading-8 text-[var(--muted)]">{article.howSnaWasUsed}</p>
            </section>

            <section className="surface-card p-7 sm:p-9" aria-labelledby="source-heading">
              <h2 id="source-heading" className="text-2xl font-black tracking-[-0.03em] text-[var(--ink)]">{copy.source}</h2>
              <p className="mt-4 break-words text-base leading-7 text-[var(--muted)]">{article.citation}</p>
              <p className="mt-3 break-all text-sm font-semibold text-[var(--indigo)]">{copy.doiLabel}: {article.doi}</p>
            </section>
          </div>

          <aside className="grid content-start gap-6">
            <section className="surface-card p-7" aria-labelledby="takeaways-heading">
              <h2 id="takeaways-heading" className="text-2xl font-black tracking-[-0.03em] text-[var(--ink)]">{copy.keyTakeaways}</h2>
              <ul className="mt-5 grid gap-5">
                {article.keyTakeaways.map((takeaway) => (
                  <li key={takeaway} className="flex gap-3 text-base font-semibold leading-7 text-[var(--muted)]">
                    <span className="mt-1.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--teal)] text-xs font-black text-[#101828]" aria-hidden="true">✓</span>
                    <span>{takeaway}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="surface-card border-l-8 border-l-[var(--amber)] p-7" aria-labelledby="why-heading">
              <h2 id="why-heading" className="text-2xl font-black tracking-[-0.03em] text-[var(--ink)]">{copy.whyItMatters}</h2>
              <p className="mt-4 text-base font-semibold leading-7 text-[var(--muted)]">{article.whyItMatters}</p>
            </section>

            <section className="surface-card p-7" aria-labelledby="boundary-heading">
              <h2 id="boundary-heading" className="text-2xl font-black tracking-[-0.03em] text-[var(--ink)]">{copy.evidenceBoundary}</h2>
              <p className="mt-4 text-base leading-7 text-[var(--muted)]">{article.limitations}</p>
            </section>
          </aside>
        </div>
      </article>

      <section className="border-t border-[var(--line)] bg-[var(--surface-glass)] py-16" aria-labelledby="related-articles-heading">
        <div className="container-page">
          <h2 id="related-articles-heading" className="text-3xl font-black tracking-[-0.035em] text-[var(--ink)]">{copy.relatedArticles}</h2>
          <div className="mt-8 grid gap-6">
            {relatedArticles.map((related) => (
              <NewsCard key={related.id} article={related} locale={typedLocale} labels={cardLabels} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
