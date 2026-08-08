import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SectionHeader from "@/components/SectionHeader";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const copy = getDictionary(locale).about;
  return { title: copy.title, description: copy.intro };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = getDictionary(locale as Locale).about;
  return (
    <div className="bg-sna-gradient">
      <section className="container-page py-16 lg:py-24">
        <SectionHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.intro} />
      </section>

      <section className="container-page grid gap-6 pb-20 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="surface-card network-field p-8 sm:p-10">
          <h2 className="text-3xl font-black tracking-[-0.035em] text-[var(--ink)]">{copy.purposeTitle}</h2>
          <p className="mt-5 text-lg leading-8 text-[var(--muted)]">{copy.purposeText}</p>
        </article>
        <article className="surface-card p-8 sm:p-10">
          <h2 className="text-3xl font-black tracking-[-0.035em] text-[var(--ink)]">{copy.scopeTitle}</h2>
          <p className="mt-5 text-lg leading-8 text-[var(--muted)]">{copy.scopeText}</p>
        </article>
      </section>

      <section className="container-page pb-24">
        <h2 className="text-balance text-4xl font-black tracking-[-0.04em] text-[var(--ink)]">{copy.principlesTitle}</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {copy.principles.map((item, index) => (
            <article key={item.title} className="surface-card p-7 sm:p-8">
              <div className={`h-1.5 w-14 rounded-full ${index % 2 === 0 ? "bg-[#403A8F]" : "bg-[#18A99A]"}`} />
              <h3 className="mt-6 text-2xl font-black tracking-[-0.025em] text-[var(--ink)]">{item.title}</h3>
              <p className="mt-3 text-base leading-7 text-[var(--muted)]">{item.text}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
