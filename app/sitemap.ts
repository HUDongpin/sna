import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n";
import { absoluteUrl } from "@/lib/site";

const paths = ["", "/mission", "/news", "/academy", "/about"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return locales.flatMap((locale) =>
    paths.map((path) => ({
      url: absoluteUrl(`/${locale}${path}`),
      lastModified: now,
      changeFrequency: path === "" ? ("monthly" as const) : ("yearly" as const),
      priority: path === "" ? 1 : 0.7,
    }))
  );
}
