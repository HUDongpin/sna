import type { Metadata } from "next";
import { notFound } from "next/navigation";
import EmptyState from "@/components/EmptyState";
import SectionHeader from "@/components/SectionHeader";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const copy = getDictionary(locale).news;
  return { title: copy.title, description: copy.intro };
}

export default async function NewsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = getDictionary(locale as Locale).news;
  return (
    <div className="bg-sna-gradient">
      <section className="container-page pb-10 pt-16 lg:pb-14 lg:pt-20">
        <SectionHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.intro} />
      </section>
      <EmptyState title={copy.emptyTitle} text={copy.emptyText} note={copy.emptyNote} />
    </div>
  );
}
