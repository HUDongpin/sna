export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const localeTags = {
  en: "en-HK",
  "zh-hant": "zh-Hant-HK",
  "zh-hans": "zh-Hans-CN",
} as const;

export function formatDate(value: string, locale: keyof typeof localeTags) {
  const monthPrecision = /^\d{4}-\d{2}$/u.test(value);
  return new Intl.DateTimeFormat(localeTags[locale], {
    year: "numeric",
    month: "long",
    ...(monthPrecision ? {} : { day: "numeric" as const }),
    timeZone: "UTC",
  }).format(new Date(`${value}${monthPrecision ? "-01" : ""}T00:00:00Z`));
}

export function readingTimeMinutes(text: string, locale: keyof typeof localeTags) {
  const compact = text.trim();
  if (!compact) return 1;
  if (locale === "en") return Math.max(1, Math.ceil(compact.split(/\s+/u).length / 200));
  const meaningfulCharacters = compact.replace(/\s/gu, "").length;
  return Math.max(1, Math.ceil(meaningfulCharacters / 350));
}
