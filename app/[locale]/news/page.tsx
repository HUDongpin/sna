import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NewsCard from "@/components/NewsCard";
import NewsFilters from "@/components/NewsFilters";
import NewsPagination from "@/components/NewsPagination";
import SectionHeader from "@/components/SectionHeader";
import { getDictionary, getLocaleMeta, isLocale, locales, type Locale } from "@/lib/i18n";
import { filterNewsArticles } from "@/lib/news-filter";
import { localizeNewsArticle, newsArticles, newsYears } from "@/lib/news-reviewed-data";
import { absoluteUrl } from "@/lib/site";

type SearchValue = string | string[] | undefined;

type NewsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, SearchValue>>;
};

function first(value: SearchValue) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ params }: Pick<NewsPageProps, "params">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const copy = getDictionary(locale).news;
  const featured = localizeNewsArticle(newsArticles[0], locale);
  const url = absoluteUrl(`/${locale}/news`);

  return {
    title: copy.eyebrow,
    description: copy.intro,
    alternates: {
      canonical: url,
      languages: Object.fromEntries(
        locales.map((item) => [getLocaleMeta(item).htmlLang, `/${item}/news`])
      ),
    },
    openGraph: {
      title: copy.title,
      description: copy.intro,
      url,
      siteName: "SNA.HK",
      locale: getLocaleMeta(locale).htmlLang,
      images: [{ url: absoluteUrl(featured.coverImage), alt: featured.imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: copy.title,
      description: copy.intro,
      images: [absoluteUrl(featured.coverImage)],
    },
  };
}

export default async function NewsPage({ params, searchParams }: NewsPageProps) {
  const [{ locale }, rawSearchParams] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();

  const typedLocale = locale as Locale;
  const copy = getDictionary(typedLocale).news;
  const requestedType = first(rawSearchParams.type);
  const requestedYear = first(rawSearchParams.year);
  const current = {
    q: first(rawSearchParams.q)?.trim(),
    type: requestedType === "journal" || requestedType === "conference" ? requestedType : undefined,
    year: newsYears.some((year) => String(year) === requestedYear) ? requestedYear : undefined,
    page: first(rawSearchParams.page),
  };
  const localizedArticles = newsArticles.map((article) => localizeNewsArticle(article, typedLocale));
  const result = filterNewsArticles(localizedArticles, current);
  const labels = {
    journal: copy.journal,
    conference: copy.conference,
    readArticle: copy.readArticle,
    openAccess: copy.openAccess,
  };

  return (
    <div className="bg-sna-gradient">
      <section className="container-page pb-10 pt-14 lg:pb-12 lg:pt-20">
        <div className="grid gap-8 lg:grid-cols-[0.98fr_1.02fr] lg:items-end">
          <SectionHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.intro} />
          <aside className="surface-card network-field p-6 sm:p-8" aria-labelledby="news-editorial-scope">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--teal)]">{copy.scopeEyebrow}</p>
            <h2 id="news-editorial-scope" className="mt-3 text-2xl font-black tracking-[-0.03em] text-[var(--ink)]">
              {copy.scopeTitle}
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{copy.scopeText}</p>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-[var(--indigo)]">{copy.inclusionTitle}</p>
            <ul className="mt-3 grid gap-2 text-sm font-semibold leading-6 text-[var(--ink)]">
              {copy.inclusionItems.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--amber)]" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      <section className="container-page pb-24" aria-labelledby="news-results-heading">
        <NewsFilters
          locale={typedLocale}
          labels={{
            searchPlaceholder: copy.searchPlaceholder,
            allTypes: copy.allTypes,
            allYears: copy.allYears,
            search: copy.search,
            reset: copy.reset,
            journal: copy.journal,
            conference: copy.conference,
          }}
          years={newsYears}
          current={current}
        />

        <div className="mb-6 mt-9 flex flex-wrap items-center justify-between gap-3">
          <h2 id="news-results-heading" className="text-sm font-black uppercase tracking-[0.2em] text-[var(--muted)]">
            {result.total} {result.total === 1 ? copy.resultCountSingular : copy.resultCount}
          </h2>
          <p className="text-sm font-semibold text-[var(--muted)]">
            {copy.page} {result.page} / {result.totalPages}
          </p>
        </div>

        {result.items.length > 0 ? (
          <div className="grid gap-6">
            {result.items.map((article, index) => (
              <NewsCard key={article.id} article={article} locale={typedLocale} labels={labels} priority={index === 0} />
            ))}
          </div>
        ) : (
          <div className="surface-card p-10 text-center">
            <p className="text-lg font-bold text-[var(--muted)]">{copy.noResults}</p>
          </div>
        )}

        <NewsPagination
          locale={typedLocale}
          page={result.page}
          totalPages={result.totalPages}
          q={current.q}
          type={current.type}
          year={current.year}
          previous={copy.previous}
          next={copy.next}
          pageLabel={copy.pageLabel}
        />
      </section>
    </div>
  );
}
