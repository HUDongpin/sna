import type { MetadataRoute } from "next";
import { academyLessons } from "@/lib/academy-reviewed-data";
import { locales } from "@/lib/i18n";
import { newsArticles } from "@/lib/news-reviewed-data";
import { absoluteUrl } from "@/lib/site";

const paths = [
  { path: "", changeFrequency: "monthly", priority: 1 },
  { path: "/mission", changeFrequency: "yearly", priority: 0.7 },
  { path: "/news", changeFrequency: "weekly", priority: 0.7 },
  { path: "/academy", changeFrequency: "weekly", priority: 0.8 },
  { path: "/about", changeFrequency: "yearly", priority: 0.7 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return locales.flatMap((locale) =>
    [
      ...paths.map(({ path, changeFrequency, priority }) => ({
        url: absoluteUrl(`/${locale}${path}`),
        lastModified: now,
        changeFrequency,
        priority,
      })),
      ...newsArticles.map((article) => ({
        url: absoluteUrl(`/${locale}/news/${article.slug}`),
        lastModified: new Date(`${article.reviewedAt}T00:00:00.000Z`),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...academyLessons.map((lesson) => ({
        url: absoluteUrl(`/${locale}/academy/${lesson.slug}`),
        lastModified: new Date(`${lesson.reviewedAt}T00:00:00.000Z`),
        changeFrequency: "monthly" as const,
        priority: 0.8,
      })),
    ]
  );
}
