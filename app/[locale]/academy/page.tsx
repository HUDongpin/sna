import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AcademyCard from "@/components/AcademyCard";
import AcademyFilters from "@/components/AcademyFilters";
import AcademyPagination from "@/components/AcademyPagination";
import SectionHeader from "@/components/SectionHeader";
import { filterAcademyLessons } from "@/lib/academy-filter";
import { ACADEMY_LEVELS, ACADEMY_TRACKS } from "@/lib/academy-types";
import { academyLessons, localizeAcademyLesson } from "@/lib/academy-reviewed-data";
import { getDictionary, getLocaleMeta, isLocale, locales, type Locale } from "@/lib/i18n";
import { absoluteUrl } from "@/lib/site";

type SearchValue = string | string[] | undefined;

type AcademyPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, SearchValue>>;
};

function first(value: SearchValue) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ params }: Pick<AcademyPageProps, "params">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const copy = getDictionary(locale).academy;
  const url = absoluteUrl(`/${locale}/academy`);
  const image = absoluteUrl("/opengraph-image");

  return {
    title: copy.eyebrow,
    description: copy.intro,
    alternates: {
      canonical: url,
      languages: Object.fromEntries(
        locales.map((item) => [getLocaleMeta(item).htmlLang, `/${item}/academy`]),
      ),
    },
    openGraph: {
      type: "website",
      title: copy.title,
      description: copy.intro,
      url,
      siteName: "SNA.HK",
      locale: getLocaleMeta(locale).htmlLang,
      images: [{ url: image, alt: copy.socialImageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: copy.title,
      description: copy.intro,
      images: [image],
    },
  };
}

export default async function AcademyPage({ params, searchParams }: AcademyPageProps) {
  const [{ locale }, rawSearchParams] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();

  const typedLocale = locale as Locale;
  const copy = getDictionary(typedLocale).academy;
  const requestedTrack = first(rawSearchParams.track);
  const requestedLevel = first(rawSearchParams.level);
  const current = {
    q: first(rawSearchParams.q)?.trim(),
    track: ACADEMY_TRACKS.some((track) => track === requestedTrack) ? requestedTrack : undefined,
    level: ACADEMY_LEVELS.some((level) => level === requestedLevel) ? requestedLevel : undefined,
    page: first(rawSearchParams.page),
  };
  const orderedLessons = [...academyLessons]
    .sort((left, right) => left.sequence - right.sequence)
    .map((lesson) => localizeAcademyLesson(lesson, typedLocale));
  const result = filterAcademyLessons(orderedLessons, current);
  const labels = {
    tracks: copy.tracks,
    levels: copy.levels,
    analysisLens: copy.analysisLens,
    tutorial: copy.tutorial,
    startTutorial: copy.startTutorial,
    minutes: copy.minutes,
  };

  return (
    <div className="bg-sna-gradient">
      <section className="container-page pb-10 pt-14 lg:pb-12 lg:pt-20">
        <div className="grid gap-8 lg:grid-cols-[0.98fr_1.02fr] lg:items-end">
          <SectionHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.intro} />
          <aside className="surface-card network-field p-6 sm:p-8" aria-labelledby="academy-pathway-heading">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--teal)]">{copy.pathwayEyebrow}</p>
            <h2 id="academy-pathway-heading" className="mt-3 text-2xl font-black tracking-[-0.03em] text-[var(--ink)]">{copy.pathwayTitle}</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{copy.pathwayText}</p>
            <ol className="mt-5 grid gap-3">
              {copy.pathwaySteps.map((step, index) => (
                <li key={step} className="flex items-start gap-3 text-sm font-semibold leading-6 text-[var(--ink)]">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--amber)] text-xs font-black text-[#101828]">{index + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </section>

      <section className="container-page pb-24" aria-labelledby="academy-results-heading">
        <AcademyFilters
          locale={typedLocale}
          labels={{
            searchPlaceholder: copy.searchPlaceholder,
            searchFieldLabel: copy.searchFieldLabel,
            allTracks: copy.allTracks,
            allLevels: copy.allLevels,
            trackFieldLabel: copy.trackFieldLabel,
            levelFieldLabel: copy.levelFieldLabel,
            search: copy.search,
            reset: copy.reset,
            tracks: copy.tracks,
            levels: copy.levels,
          }}
          current={current}
        />

        <div className="mb-6 mt-9 flex flex-wrap items-center justify-between gap-3">
          <h2 id="academy-results-heading" className="text-sm font-black uppercase tracking-[0.2em] text-[var(--muted)]">
            {result.total} {result.total === 1 ? copy.resultCountSingular : copy.resultCount}
          </h2>
          <p className="text-sm font-semibold text-[var(--muted)]">{copy.page} {result.page} / {result.totalPages}</p>
        </div>

        {result.items.length > 0 ? (
          <div className="grid gap-6">
            {result.items.map((lesson) => (
              <AcademyCard key={lesson.id} lesson={lesson} locale={typedLocale} labels={labels} />
            ))}
          </div>
        ) : (
          <div className="surface-card p-10 text-center">
            <p className="text-lg font-bold text-[var(--muted)]">{copy.noResults}</p>
          </div>
        )}

        <AcademyPagination
          locale={typedLocale}
          page={result.page}
          totalPages={result.totalPages}
          q={current.q}
          track={current.track}
          level={current.level}
          previous={copy.previous}
          next={copy.next}
          pageLabel={copy.pageLabel}
        />
      </section>
    </div>
  );
}
