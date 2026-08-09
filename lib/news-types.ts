import type { Locale } from "@/lib/i18n";

export type NewsArticleType = "journal" | "conference";

export type NewsArticleLocalization = {
  title: string;
  imageAlt: string;
  summary: string;
  overview: [string, string];
  howSnaWasUsed: string;
  nodes: string;
  ties: string;
  methods: string;
  keyTakeaways: [string, string, string];
  whyItMatters: string;
  limitations: string;
  tags: [string, string, string];
};

export type NewsArticleRecord = {
  id: `sna-${string}`;
  sequence: number;
  slug: string;
  type: NewsArticleType;
  authors: string[];
  venue: string;
  citation: string;
  doi: string;
  sourceUrl: `https://${string}`;
  sourceLabel: string;
  publishedAt: `${number}-${number}` | `${number}-${number}-${number}`;
  year: number;
  reviewedAt: `${number}-${number}-${number}`;
  openAccess: boolean;
  coverImage: `/images/news/covers/${string}.png`;
  summaryImage: `/images/news/summary/${string}.png`;
  localizations: Record<Locale, NewsArticleLocalization>;
};

export type LocalizedNewsArticle = Omit<NewsArticleRecord, "localizations"> & NewsArticleLocalization;

export const NEWS_PAGE_SIZE = 6;
