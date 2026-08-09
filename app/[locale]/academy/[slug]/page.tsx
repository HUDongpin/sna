import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AcademyCard from "@/components/AcademyCard";
import AcademyLessonVisual from "@/components/AcademyLessonVisual";
import JsonLd from "@/components/JsonLd";
import {
  academyLessons,
  getAcademyLesson,
  getAcademySequenceNeighbors,
  getRelatedAcademyLessons,
  localizeAcademyLesson,
} from "@/lib/academy-reviewed-data";
import { getDictionary, getLocaleMeta, isLocale, locales, type Locale } from "@/lib/i18n";
import { absoluteUrl } from "@/lib/site";
import { academyLearningResourceJsonLd, breadcrumbJsonLd } from "@/lib/structured-data";
import { formatDate } from "@/lib/utils";

type AcademyDetailPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    academyLessons.map((lesson) => ({ locale, slug: lesson.slug })),
  );
}

export const dynamicParams = false;

export async function generateMetadata({ params }: AcademyDetailPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const record = getAcademyLesson(slug);
  if (!record) return { title: getDictionary(locale).academy.eyebrow };

  const lesson = localizeAcademyLesson(record, locale);
  const url = absoluteUrl(`/${locale}/academy/${slug}`);
  const image = absoluteUrl("/opengraph-image");

  return {
    title: lesson.title,
    description: lesson.shortSummary,
    alternates: {
      canonical: url,
      languages: Object.fromEntries(
        locales.map((item) => [getLocaleMeta(item).htmlLang, `/${item}/academy/${slug}`]),
      ),
    },
    openGraph: {
      type: "article",
      title: lesson.title,
      description: lesson.shortSummary,
      url,
      siteName: "SNA.HK",
      locale: getLocaleMeta(locale).htmlLang,
      publishedTime: lesson.publishedAt,
      modifiedTime: lesson.reviewedAt,
      tags: lesson.tags,
      images: [{ url: image, alt: getDictionary(locale).academy.socialImageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: lesson.title,
      description: lesson.shortSummary,
      images: [image],
    },
  };
}

export default async function AcademyDetailPage({ params }: AcademyDetailPageProps) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale = locale as Locale;
  const record = getAcademyLesson(slug);
  if (!record) notFound();

  const copy = getDictionary(typedLocale).academy;
  const lesson = localizeAcademyLesson(record, typedLocale);
  const relatedLessons = getRelatedAcademyLessons(record, typedLocale, 3);
  const neighbors = getAcademySequenceNeighbors(record, typedLocale);
  const lessonUrl = absoluteUrl(`/${typedLocale}/academy/${lesson.slug}`);
  const structuredData = [
    academyLearningResourceJsonLd(lesson, typedLocale),
    breadcrumbJsonLd([
      { name: "SNA.HK", url: absoluteUrl(`/${typedLocale}`) },
      { name: copy.eyebrow, url: absoluteUrl(`/${typedLocale}/academy`) },
      { name: lesson.title, url: lessonUrl },
    ]),
  ];
  const cardLabels = {
    tracks: copy.tracks,
    levels: copy.levels,
    analysisLens: copy.analysisLens,
    tutorial: copy.tutorial,
    startTutorial: copy.startTutorial,
    minutes: copy.minutes,
  };

  return (
    <div className="bg-sna-gradient">
      <JsonLd data={structuredData} />
      <article className="container-page py-12 lg:py-20">
        <Link href={`/${typedLocale}/academy`} className="focus-ring inline-flex min-h-11 items-center rounded-full border border-[var(--line)] bg-[var(--surface)] px-5 py-2.5 text-sm font-black text-[var(--indigo)] shadow-sm transition hover:border-[var(--teal)]">
          <span aria-hidden="true" className="mr-2">←</span>{copy.backToAcademy}
        </Link>

        <header className="mt-8 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="min-h-[25rem] overflow-hidden rounded-[2rem] border border-[var(--line)] bg-[var(--page-strong)] shadow-[var(--shadow-soft)]">
            <AcademyLessonVisual sequence={lesson.sequence} track={lesson.track} eyebrow={copy.analysisLens} label={lesson.visualLabel} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.16em]">
              <span className="rounded-full bg-[var(--teal)] px-3 py-1 text-[#101828]">{copy.tracks[lesson.track]}</span>
              <span className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-[var(--indigo)]">{copy.levels[lesson.level]}</span>
              <span className="rounded-full bg-[var(--surface)] px-3 py-1 text-[var(--indigo)] shadow-sm">{copy.tutorial} {String(lesson.sequence).padStart(2, "0")}</span>
            </div>
            <h1 className="mt-6 text-balance text-4xl font-black leading-[1.06] tracking-[-0.045em] text-[var(--ink)] sm:text-5xl">{lesson.title}</h1>
            <p className="mt-5 text-lg leading-8 text-[var(--muted)]">{lesson.shortSummary}</p>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-[var(--muted)]">
              <span>{lesson.durationMinutes} {copy.minutes}</span>
              <span>{copy.published}: {formatDate(lesson.publishedAt, typedLocale)}</span>
              <span>{copy.reviewed}: {formatDate(lesson.reviewedAt, typedLocale)}</span>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {lesson.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-xs font-bold text-[var(--muted)]">{tag}</span>
              ))}
            </div>
            <p className="mt-7 text-xs font-black uppercase tracking-[0.2em] text-[var(--muted)]">{copy.sources}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {lesson.sources.map((source) => (
                <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="focus-ring inline-flex min-h-11 items-center rounded-full bg-[#403A8F] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#302B78]">
                  {source.label}<span aria-hidden="true" className="ml-2">↗</span>
                </a>
              ))}
            </div>
          </div>
        </header>

        <section className="surface-card mt-12 p-7 sm:p-9" aria-labelledby="learning-objectives-heading">
          <h2 id="learning-objectives-heading" className="text-3xl font-black tracking-[-0.035em] text-[var(--ink)]">{copy.learningObjectives}</h2>
          <ol className="mt-6 grid gap-5 md:grid-cols-3">
            {lesson.learningObjectives.map((objective, index) => (
              <li key={objective} className="flex gap-4 text-base font-semibold leading-7 text-[var(--muted)]">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--teal)] text-sm font-black text-[#101828]">{index + 1}</span>
                <span>{objective}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="surface-card mt-8 overflow-hidden" aria-labelledby="network-specification-heading">
          <div className="border-b border-[var(--line)] p-7 sm:p-9">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--teal)]">SNA</p>
            <h2 id="network-specification-heading" className="mt-3 text-3xl font-black tracking-[-0.035em] text-[var(--ink)]">{copy.networkSpecification}</h2>
            <h3 className="mt-6 text-sm font-black uppercase tracking-[0.16em] text-[var(--indigo)]">{copy.scenario}</h3>
            <p className="mt-3 text-lg leading-8 text-[var(--muted)]">{lesson.scenario}</p>
          </div>
          <div className="grid md:grid-cols-3">
            {[
              { label: copy.nodes, value: lesson.nodes, color: "var(--indigo)" },
              { label: copy.ties, value: lesson.ties, color: "var(--teal)" },
              { label: copy.networkType, value: lesson.networkType, color: "var(--amber)" },
            ].map((item, index) => (
              <div key={item.label} className={`p-6 sm:p-7 ${index > 0 ? "border-t border-[var(--line)] md:border-l md:border-t-0" : ""}`}>
                <span className="block h-1.5 w-12 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
                <h3 className="mt-4 text-sm font-black uppercase tracking-[0.16em] text-[var(--ink)]">{item.label}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-8">
            <section className="surface-card p-7 sm:p-9" aria-labelledby="tutorial-steps-heading">
              <h2 id="tutorial-steps-heading" className="text-3xl font-black tracking-[-0.035em] text-[var(--ink)]">{copy.stepByStep}</h2>
              <div className="mt-8 grid gap-8">
                {lesson.tutorialSteps.map((step, index) => (
                  <section key={step.title} className="border-t border-[var(--line)] pt-7 first:border-t-0 first:pt-0" aria-labelledby={`step-${index + 1}`}>
                    <div className="flex items-start gap-4">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[var(--indigo)] text-sm font-black text-white">{index + 1}</span>
                      <div>
                        <h3 id={`step-${index + 1}`} className="text-2xl font-black tracking-[-0.03em] text-[var(--ink)]">{step.title}</h3>
                        <p className="mt-3 text-lg leading-8 text-[var(--muted)]">{step.action}</p>
                        <div className="mt-4 rounded-2xl border-l-4 border-l-[var(--teal)] bg-[var(--surface-soft)] px-5 py-4">
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--teal)]">{copy.checkpoint}</p>
                          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--ink)]">{step.checkpoint}</p>
                        </div>
                      </div>
                    </div>
                  </section>
                ))}
              </div>
            </section>

            <section className="surface-card network-field p-7 sm:p-9" aria-labelledby="interpretation-heading">
              <h2 id="interpretation-heading" className="text-3xl font-black tracking-[-0.035em] text-[var(--ink)]">{copy.interpretation}</h2>
              <div className="mt-6 grid gap-5 text-lg leading-8 text-[var(--muted)]">
                {lesson.interpretation.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </section>
          </div>

          <aside className="grid content-start gap-6">
            <section className="surface-card p-7" aria-labelledby="core-ideas-heading">
              <h2 id="core-ideas-heading" className="text-2xl font-black tracking-[-0.03em] text-[var(--ink)]">{copy.coreIdeas}</h2>
              <ol className="mt-5 grid gap-5">
                {lesson.coreIdeas.map((idea, index) => (
                  <li key={idea} className="flex gap-3 text-base font-semibold leading-7 text-[var(--muted)]">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--teal)] text-xs font-black text-[#101828]">{index + 1}</span>
                    <span>{idea}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="surface-card p-7" aria-labelledby="practice-task-heading">
              <h2 id="practice-task-heading" className="text-2xl font-black tracking-[-0.03em] text-[var(--ink)]">{copy.practiceTask}</h2>
              <p className="mt-4 text-base font-semibold leading-7 text-[var(--muted)]">{lesson.practiceTask}</p>
            </section>

            <section className="surface-card border-l-8 border-l-[var(--amber)] p-7" aria-labelledby="responsible-use-heading">
              <h2 id="responsible-use-heading" className="text-2xl font-black tracking-[-0.03em] text-[var(--ink)]">{copy.responsibleUse}</h2>
              <p className="mt-4 text-base leading-7 text-[var(--muted)]">{lesson.responsibleUse}</p>
            </section>

            <section className="surface-card p-7" aria-labelledby="related-concepts-heading">
              <h2 id="related-concepts-heading" className="text-2xl font-black tracking-[-0.03em] text-[var(--ink)]">{copy.relatedConcepts}</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {lesson.relatedConcepts.map((concept) => (
                  <span key={concept} className="rounded-full bg-[var(--surface-soft)] px-3 py-1.5 text-sm font-bold text-[var(--indigo)]">{concept}</span>
                ))}
              </div>
            </section>
          </aside>
        </div>

        <nav className="mt-10 grid gap-4 sm:grid-cols-2" aria-label={copy.eyebrow}>
          {neighbors.previous ? (
            <Link href={`/${typedLocale}/academy/${neighbors.previous.slug}`} rel="prev" className="focus-ring surface-card p-6 transition hover:border-[var(--teal)]">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">← {copy.previousLesson}</span>
              <span className="mt-2 block text-lg font-black text-[var(--indigo)]">{neighbors.previous.title}</span>
            </Link>
          ) : <span />}
          {neighbors.next ? (
            <Link href={`/${typedLocale}/academy/${neighbors.next.slug}`} rel="next" className="focus-ring surface-card p-6 text-right transition hover:border-[var(--teal)]">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">{copy.nextLesson} →</span>
              <span className="mt-2 block text-lg font-black text-[var(--indigo)]">{neighbors.next.title}</span>
            </Link>
          ) : <span />}
        </nav>
      </article>

      <section className="border-t border-[var(--line)] bg-[var(--surface-glass)] py-16" aria-labelledby="related-lessons-heading">
        <div className="container-page">
          <h2 id="related-lessons-heading" className="text-3xl font-black tracking-[-0.035em] text-[var(--ink)]">{copy.relatedLessons}</h2>
          <div className="mt-8 grid gap-6">
            {relatedLessons.map((related) => (
              <AcademyCard key={related.id} lesson={related} locale={typedLocale} labels={cardLabels} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
