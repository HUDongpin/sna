import { notFound } from "next/navigation";
import SectionHeader from "@/components/SectionHeader";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";

export default async function MissionPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dictionary = getDictionary(locale as Locale);

  return (
    <div className="bg-sna-gradient">
      <section className="container-page py-16 lg:py-24">
        <SectionHeader eyebrow={dictionary.mission.eyebrow} title={dictionary.mission.title} description={dictionary.mission.intro} />
      </section>

      <section className="container-page grid gap-6 pb-20 lg:grid-cols-2">
        {dictionary.mission.principles.map((item, index) => (
          <article
            key={item.title}
            className={`surface-card p-8 sm:p-10 ${index === 0 ? "network-field lg:row-span-2 lg:flex lg:flex-col lg:justify-end" : ""} ${index === dictionary.mission.principles.length - 1 ? "lg:col-span-2" : ""}`}
          >
            <div className={`h-1.5 w-16 rounded-full ${index === 0 ? "bg-[#403A8F]" : index === 1 ? "bg-[#18A99A]" : "bg-[#F4A340]"}`} />
            <h2 className="mt-7 text-3xl font-black tracking-[-0.035em] text-[var(--ink)]">{item.title}</h2>
            <p className="mt-4 text-lg leading-8 text-[var(--muted)]">{item.text}</p>
          </article>
        ))}
      </section>

      <section className="border-y border-[var(--line)] bg-[var(--surface-glass)] py-20">
        <div className="container-page">
          <div className="max-w-3xl">
            <h2 className="text-balance text-4xl font-black tracking-[-0.04em] text-[var(--ink)]">{dictionary.mission.strategyTitle}</h2>
            <p className="mt-5 max-w-[65ch] text-lg leading-8 text-[var(--muted)]">{dictionary.mission.strategyIntro}</p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {dictionary.mission.strategies.map((item, index) => (
              <article key={item.title} className="surface-card group p-7 transition duration-300 hover:-translate-y-1 hover:border-[#18A99A]">
                <div>
                  <span aria-hidden="true" className={`block h-1.5 w-14 rounded-full ${index === 2 ? "bg-[#F4A340]" : index % 2 === 0 ? "bg-[#403A8F]" : "bg-[#18A99A]"}`} />
                  <h3 className="mt-6 text-2xl font-black tracking-[-0.025em] text-[var(--ink)]">{item.title}</h3>
                </div>
                <p className="mt-4 text-base leading-7 text-[var(--muted)]">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
