import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import SectionHeader from "@/components/SectionHeader";
import { getDictionary, getLocaleMeta, isLocale, locales, type Locale } from "@/lib/i18n";
import { absoluteUrl } from "@/lib/site";
import { aboutOrganizationJsonLd, personJsonLd } from "@/lib/structured-data";

interface AboutPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: AboutPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const typedLocale = locale as Locale;
  const copy = getDictionary(typedLocale).about;
  const url = absoluteUrl(`/${typedLocale}/about`);

  return {
    title: copy.title,
    description: copy.personText,
    alternates: {
      canonical: url,
      languages: Object.fromEntries(
        locales.map((item) => [getLocaleMeta(item).htmlLang, absoluteUrl(`/${item}/about`)])
      ),
    },
    openGraph: {
      type: "profile",
      title: copy.title,
      description: copy.personText,
      url,
      siteName: "SNA.HK",
      locale: getLocaleMeta(typedLocale).htmlLang,
      images: [
        {
          url: absoluteUrl("/opengraph-image"),
          width: 1200,
          height: 630,
          alt: "SNA.HK Social Network Analysis",
        },
      ],
    },
  };
}

const profileLinks = [
  {
    name: "Hu Dongpin",
    label: "hudongpin.com",
    href: "https://www.hudongpin.com",
    logo: "hudongpin",
  },
  {
    name: "PedaNova",
    label: "pedanova.tech",
    href: "https://www.pedanova.tech",
    logo: "pedanova",
  },
  {
    name: "SNA.js",
    label: "github.com/HUDongpin/sna.js",
    href: "https://github.com/HUDongpin/sna.js",
    logo: "sna",
  },
  {
    name: "3D ENA",
    label: "3dena.com",
    href: "https://www.3dena.com",
    logo: "ena",
  },
] as const;

const productWebsiteLinks: Record<string, { href: string; label: string }> = {
  "SNA.js": { href: "https://github.com/HUDongpin/sna.js", label: "GitHub" },
  "3D ENA": { href: "https://www.3dena.com", label: "3dena.com" },
};

type ProfileLogo = (typeof profileLinks)[number]["logo"];

function WebsiteLogo({ logo }: { logo: ProfileLogo }) {
  if (logo === "pedanova") {
    return (
      <img
        src="/logos/pedanova-mark-transparent.png"
        alt=""
        aria-hidden="true"
        width={44}
        height={44}
        decoding="async"
        className="h-11 w-11 rounded-full object-contain"
      />
    );
  }

  if (logo === "sna") {
    return (
      <img
        src="/logos/sna-logo.svg"
        alt=""
        aria-hidden="true"
        width={44}
        height={44}
        decoding="async"
        className="h-11 w-11 object-contain"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--ink)] text-[0.68rem] font-black tracking-[-0.03em] text-[var(--page)]"
    >
      {logo === "hudongpin" ? "PH" : "3D"}
    </span>
  );
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale = locale as Locale;
  const copy = getDictionary(typedLocale).about;

  const structuredData = [
    personJsonLd({
      name: "Dr. Peter Hu Dongpin",
      url: "https://www.hudongpin.com",
      jobTitle: copy.principalLabel,
      description: copy.personText,
      image: absoluteUrl("/images/about/dr-peter-hu-dongpin.png"),
    }),
    aboutOrganizationJsonLd({
      name: "PedaNova Ed-Tech",
      url: "https://www.pedanova.tech",
      description: copy.companyText,
    }),
  ];

  return (
    <div className="bg-sna-gradient">
      <JsonLd data={structuredData} />

      <section className="container-page py-16 lg:py-24">
        <SectionHeader eyebrow={copy.eyebrow} title={copy.title} center />
      </section>

      <section className="container-page grid gap-6 pb-20 lg:grid-cols-[1.05fr_0.95fr]">
        <article className="surface-card network-field p-5 sm:p-8">
          <div className="flex items-start gap-3 sm:gap-5">
            <div className="relative h-14 w-14 shrink-0 rounded-3xl bg-[var(--surface-soft)] shadow-[0_16px_38px_rgba(64,58,143,0.14)] sm:h-20 sm:w-20">
              <Image
                src="/images/about/dr-peter-hu-dongpin.png"
                alt="Dr. Peter Hu Dongpin"
                width={80}
                height={80}
                priority
                className="h-14 w-14 rounded-3xl border-2 border-[var(--teal)] object-cover sm:h-20 sm:w-20"
              />
              <span className="absolute -bottom-1 -right-2 grid h-6 w-6 place-items-center rounded-xl border-2 border-[var(--surface)] bg-[#403A8F] text-[9px] font-black text-[#F8FAFC] shadow-sm sm:h-8 sm:w-8 sm:text-xs">
                PH
              </span>
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--indigo)] sm:text-sm sm:tracking-[0.25em]">
                {copy.principalLabel}
              </p>
              <h2 className="mt-1 text-[17px] font-black leading-tight tracking-[-0.025em] text-[var(--ink)] sm:mt-3 sm:text-3xl">
                {copy.personTitle}
              </h2>
            </div>
          </div>

          <p className="mt-5 text-sm leading-6 text-[var(--muted)] sm:mt-6 sm:text-lg sm:leading-8">
            {copy.personText}
          </p>

          <div className="mt-7 rounded-[1.75rem] border border-[var(--line)] bg-[var(--surface-soft)] p-5 sm:mt-8 sm:p-6">
            <h3 className="text-base font-black tracking-[-0.025em] text-[var(--ink)] sm:text-xl">
              {copy.focusTitle}
            </h3>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-5">
              {copy.focusItems.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-[10px] font-bold leading-4 text-[var(--muted)] shadow-sm sm:px-4 sm:text-sm sm:leading-5"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="surface-card flex h-full flex-col p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-[var(--indigo)] sm:text-sm">
            {copy.companyTitle}
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.035em] text-[var(--ink)]">PedaNova</h2>
          <p className="mt-4 text-base leading-7 text-[var(--muted)] sm:text-lg sm:leading-8">
            {copy.companyText}
          </p>

          <p className="mt-8 text-xs font-black uppercase tracking-[0.25em] text-[var(--indigo)] sm:text-sm">
            {copy.productsTitle}
          </p>
          <div
            className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"
            aria-label={copy.productsTitle}
          >
            {copy.products.map((product) => {
              const productLink = productWebsiteLinks[product.name];
              if (!productLink) return null;

              return (
                <a
                  key={product.name}
                  href={productLink.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${copy.externalLink}: ${product.name}`}
                  className="focus-ring group flex min-h-[12.5rem] flex-col rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--teal)] hover:bg-[var(--surface-soft)] hover:shadow-[var(--shadow)]"
                >
                  <h3 className="text-2xl font-black leading-tight text-[var(--ink)] transition group-hover:text-[var(--indigo)] sm:text-3xl">
                    {product.name}
                  </h3>
                  <p className="mt-4 text-base leading-7 text-[var(--muted)]">{product.text}</p>
                  <span className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-black text-[var(--indigo)]">
                    <span>{productLink.label}</span>
                    <span
                      aria-hidden="true"
                      className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    >
                      ↗
                    </span>
                  </span>
                </a>
              );
            })}
          </div>
        </article>
      </section>

      <section className="container-page pb-24">
        <div className="surface-card p-6 sm:p-8">
          <h2 className="text-3xl font-black tracking-[-0.035em] text-[var(--ink)]">{copy.linksTitle}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {profileLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                aria-label={`${copy.externalLink}: ${link.name}`}
                className="focus-ring group grid min-h-20 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-3xl border border-[var(--line)] bg-[var(--surface)] px-3 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--teal)] hover:bg-[var(--surface-soft)] hover:shadow-[var(--shadow)]"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--surface)] shadow-[inset_0_0_0_1px_var(--line),0_10px_28px_rgba(15,23,42,0.08)] transition group-hover:scale-105">
                  <WebsiteLogo logo={link.logo} />
                </span>
                <span className="min-w-0">
                  <span className="block text-base font-black tracking-[-0.025em] text-[var(--ink)] transition group-hover:text-[var(--indigo)]">
                    {link.name}
                  </span>
                  <span className="mt-1 block truncate text-xs font-bold text-[var(--indigo)] sm:text-sm">
                    {link.label}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="text-lg font-black leading-none text-[var(--indigo)] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                >
                  ↗
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
