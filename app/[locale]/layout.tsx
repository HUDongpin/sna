import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import HtmlLangSync from "@/components/HtmlLangSync";
import JsonLd from "@/components/JsonLd";
import { getDictionary, getLocaleMeta, isLocale, locales, type Locale } from "@/lib/i18n";
import { organizationJsonLd, webSiteJsonLd } from "@/lib/structured-data";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dictionary = getDictionary(locale);
  const meta = getLocaleMeta(locale);
  return {
    title: dictionary.home.title,
    description: dictionary.home.intro,
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(locales.map((item) => [getLocaleMeta(item).htmlLang, `/${item}`])),
    },
    openGraph: {
      title: dictionary.home.title,
      description: dictionary.home.intro,
      locale: meta.htmlLang,
      url: `/${locale}`,
    },
  };
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale = locale as Locale;
  const dictionary = getDictionary(typedLocale);
  const meta = getLocaleMeta(typedLocale);

  return (
    <div lang={meta.htmlLang} dir={meta.dir}>
      <HtmlLangSync lang={meta.htmlLang} dir={meta.dir} />
      <JsonLd data={[organizationJsonLd(), webSiteJsonLd()]} />
      <Header locale={typedLocale} dictionary={dictionary} />
      <main>{children}</main>
      <Footer locale={typedLocale} dictionary={dictionary} />
    </div>
  );
}
