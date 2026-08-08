import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import CTA from "@/components/CTA";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale = locale as Locale;
  const dictionary = getDictionary(typedLocale);
  const cardLinks = [`/${typedLocale}/mission`, `/${typedLocale}/news`, `/${typedLocale}/about`];

  return (
    <div className="bg-sna-gradient">
      <section className="container-page grid min-h-[calc(100dvh-5rem)] gap-12 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-16">
        <div className="hero-enter">
          <p className="inline-flex rounded-full border border-[#DAD8EF] bg-[#F5F3FF] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#403A8F]">
            {dictionary.home.eyebrow}
          </p>
          <h1 className="mt-5 max-w-[18ch] text-balance text-4xl font-black leading-[1.02] tracking-[-0.05em] text-[var(--ink)] sm:text-5xl lg:text-6xl">
            {dictionary.home.title}
          </h1>
          <p className="mt-6 max-w-[52ch] text-lg leading-8 text-[var(--muted)]">{dictionary.home.intro}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <CTA href={`/${typedLocale}/mission`}>{dictionary.home.primaryCta}</CTA>
            <CTA href={`/${typedLocale}/about`} variant="secondary">
              {dictionary.home.secondaryCta}
            </CTA>
          </div>
        </div>

        <figure className="hero-enter-delayed surface-card overflow-hidden">
          <div className="relative aspect-video w-full overflow-hidden bg-[var(--page-strong)]">
            <Image
              src="/images/home/sna-network-research-studio.png"
              alt={`${dictionary.home.showcaseTitle}: ${dictionary.home.showcaseText}`}
              fill
              sizes="(min-width: 1024px) 52vw, calc(100vw - 32px)"
              className="object-cover"
            />
          </div>
          <figcaption className="px-7 py-6 sm:px-9 sm:py-7">
            <p className="text-sm font-black text-[var(--indigo)]">{dictionary.home.showcaseTitle}</p>
            <p className="mt-2 text-lg font-semibold leading-7 text-[var(--muted)]">{dictionary.home.showcaseText}</p>
          </figcaption>
        </figure>
      </section>

      <section className="container-page grid gap-5 pb-20 md:grid-cols-2">
        {dictionary.home.cards.map((card, index) => (
          <Link
            key={card.title}
            href={cardLinks[index]}
            className={`focus-ring group surface-card p-7 transition duration-300 hover:-translate-y-1 hover:border-[#18A99A] ${index === 0 ? "md:col-span-2 md:grid md:grid-cols-[0.7fr_1.3fr] md:items-center md:gap-10" : ""}`}
          >
            <div className={`h-1.5 w-16 rounded-full ${index === 0 ? "bg-[#403A8F]" : index === 1 ? "bg-[#18A99A]" : "bg-[#F4A340]"}`} />
            <div className={index === 0 ? "mt-6 md:mt-0" : "mt-6"}>
              <h2 className="text-2xl font-black tracking-[-0.03em] text-[var(--ink)] transition group-hover:text-[var(--indigo)]">{card.title}</h2>
              <p className="mt-3 text-base leading-7 text-[var(--muted)]">{card.text}</p>
            </div>
          </Link>
        ))}
      </section>

      <section className="container-page grid gap-6 pb-24 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="surface-card network-field p-8 sm:p-10">
          <h2 className="max-w-[15ch] text-balance text-3xl font-black tracking-[-0.035em] text-[var(--ink)] sm:text-4xl">{dictionary.home.whyTitle}</h2>
          <p className="mt-5 max-w-[58ch] text-lg leading-8 text-[var(--muted)]">{dictionary.home.whyText}</p>
        </article>
        <article className="surface-card border-l-8 border-l-[#F4A340] p-8 sm:p-10">
          <h2 className="text-balance text-3xl font-black tracking-[-0.035em] text-[var(--ink)]">{dictionary.home.impactTitle}</h2>
          <p className="mt-5 text-lg leading-8 text-[var(--muted)]">{dictionary.home.impactText}</p>
        </article>
      </section>
    </div>
  );
}
