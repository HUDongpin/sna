import { NEWS_PAGE_SIZE, type LocalizedNewsArticle, type NewsArticleType } from "@/lib/news-types";

export type NewsFilterOptions = {
  q?: string;
  type?: string;
  year?: string;
  page?: string | number;
  pageSize?: number;
};

export type NewsFilterResult = {
  items: LocalizedNewsArticle[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function articleType(value: string | undefined): NewsArticleType | undefined {
  return value === "journal" || value === "conference" ? value : undefined;
}

function clampPage(value: string | number | undefined, totalPages: number) {
  const parsed = typeof value === "number" ? value : Number.parseInt(value ?? "1", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(Math.floor(parsed), totalPages);
}

export function filterNewsArticles(
  articles: LocalizedNewsArticle[],
  options: NewsFilterOptions = {}
): NewsFilterResult {
  const query = options.q?.trim().toLocaleLowerCase() ?? "";
  const type = articleType(options.type?.trim());
  const year = options.year?.trim();
  const requestedPageSize = options.pageSize ?? NEWS_PAGE_SIZE;
  const pageSize =
    Number.isFinite(requestedPageSize) && requestedPageSize > 0
      ? Math.min(Math.floor(requestedPageSize), 50)
      : NEWS_PAGE_SIZE;

  const filtered = articles.filter((article) => {
    if (type && article.type !== type) return false;
    if (year && String(article.year) !== year) return false;
    if (!query) return true;

    const searchable = [
      article.title,
      article.authors.join(" "),
      article.venue,
      article.summary,
      article.methods,
      article.nodes,
      article.ties,
      article.tags.join(" "),
    ]
      .join(" ")
      .toLocaleLowerCase();

    return searchable.includes(query);
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = clampPage(options.page, totalPages);
  const start = (page - 1) * pageSize;

  return {
    items: filtered.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    totalPages,
  };
}
