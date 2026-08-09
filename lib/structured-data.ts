import { SITE_URL, absoluteUrl } from "@/lib/site";
import { getLocaleMeta, type Locale } from "@/lib/i18n";
import type { LocalizedAcademyLesson } from "@/lib/academy-types";
import type { LocalizedNewsArticle } from "@/lib/news-types";

const ORGANIZATION_ID = `${SITE_URL}/#organization`;

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: "SNA.HK",
    alternateName: "Social Network Analysis",
    url: SITE_URL,
    description: "A knowledge platform for rigorous, accessible social network analysis.",
    logo: absoluteUrl("/favicon.svg"),
  };
}

export function webSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: "SNA.HK",
    url: SITE_URL,
    publisher: { "@id": ORGANIZATION_ID },
  };
}

export function personJsonLd(input: {
  name: string;
  url: string;
  jobTitle?: string;
  description?: string;
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: input.name,
    url: input.url,
    ...(input.jobTitle ? { jobTitle: input.jobTitle } : {}),
    ...(input.description ? { description: input.description } : {}),
    ...(input.image ? { image: input.image } : {}),
  };
}

export function aboutOrganizationJsonLd(input: {
  name: string;
  url: string;
  description?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: input.name,
    url: input.url,
    ...(input.description ? { description: input.description } : {}),
  };
}

export function newsReviewArticleJsonLd(article: LocalizedNewsArticle, locale: Locale) {
  const url = absoluteUrl(`/${locale}/news/${article.slug}`);
  const sourceArticle = {
    "@type": "ScholarlyArticle",
    headline: article.title,
    url: article.sourceUrl,
    sameAs: article.sourceUrl,
    datePublished: article.publishedAt,
    author: article.authors.map((name) => ({
      "@type": "Person",
      name,
    })),
    identifier: {
      "@type": "PropertyValue",
      propertyID: "DOI",
      value: article.doi,
      url: article.sourceUrl,
    },
    citation: article.citation,
    isAccessibleForFree: article.openAccess,
  };

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#article`,
    url,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    headline: article.title,
    description: article.summary,
    image: absoluteUrl(article.coverImage),
    datePublished: article.reviewedAt,
    dateModified: article.reviewedAt,
    author: { "@id": ORGANIZATION_ID },
    publisher: { "@id": ORGANIZATION_ID },
    about: sourceArticle,
    citation: article.sourceUrl,
    isBasedOn: article.sourceUrl,
    inLanguage: getLocaleMeta(locale).htmlLang,
    keywords: article.tags,
    articleSection: "SNA Research News",
  };
}

export function academyLearningResourceJsonLd(lesson: LocalizedAcademyLesson, locale: Locale) {
  const url = absoluteUrl(`/${locale}/academy/${lesson.slug}`);

  return {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    "@id": `${url}#learning-resource`,
    url,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    name: lesson.title,
    headline: lesson.title,
    description: lesson.shortSummary,
    learningResourceType: "Tutorial",
    educationalLevel: lesson.level,
    teaches: lesson.learningObjectives,
    timeRequired: `PT${lesson.durationMinutes}M`,
    datePublished: lesson.publishedAt,
    dateModified: lesson.reviewedAt,
    author: { "@id": ORGANIZATION_ID },
    publisher: { "@id": ORGANIZATION_ID },
    inLanguage: getLocaleMeta(locale).htmlLang,
    isAccessibleForFree: true,
    about: {
      "@type": "Thing",
      name: "Social Network Analysis",
    },
    keywords: lesson.tags,
    citation: lesson.sources.map((source) => source.url),
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
