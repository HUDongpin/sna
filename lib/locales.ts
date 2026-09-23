export const DEFAULT_LOCALE = "en" as const;

export const locales = [DEFAULT_LOCALE, "zh-hant", "zh-hans"] as const;

export type Locale = (typeof locales)[number];

export type LocaleMetadata = {
  label: string;
  languageLabel: string;
  htmlLang: string;
  dir: "ltr";
};

export const localeMeta: Record<Locale, LocaleMetadata> = {
  en: { label: "English", languageLabel: "Select language", htmlLang: "en-HK", dir: "ltr" },
  "zh-hant": {
    label: "繁體中文",
    languageLabel: "選擇語言",
    htmlLang: "zh-Hant-HK",
    dir: "ltr",
  },
  "zh-hans": {
    label: "简体中文",
    languageLabel: "选择语言",
    htmlLang: "zh-Hans-CN",
    dir: "ltr",
  },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

export function getLocaleMeta(value: unknown): LocaleMetadata {
  return localeMeta[isLocale(value) ? value : DEFAULT_LOCALE];
}

export function localeFromPathname(pathname: string): Locale {
  const firstSegment = pathname.startsWith("/")
    ? pathname.slice(1).split("/", 1)[0]
    : pathname.split("/", 1)[0];

  return isLocale(firstSegment) ? firstSegment : DEFAULT_LOCALE;
}
