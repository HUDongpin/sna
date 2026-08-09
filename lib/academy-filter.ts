import {
  ACADEMY_LEVELS,
  ACADEMY_PAGE_SIZE,
  ACADEMY_TRACKS,
  type AcademyLevel,
  type AcademyTrack,
  type LocalizedAcademyLesson,
} from "@/lib/academy-types";

export type AcademyFilterOptions = {
  q?: string;
  track?: string;
  level?: string;
  page?: string | number;
  pageSize?: number;
};

export type AcademyFilterResult = {
  items: LocalizedAcademyLesson[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function validTrack(value: string | undefined): AcademyTrack | undefined {
  return ACADEMY_TRACKS.find((track) => track === value);
}

function validLevel(value: string | undefined): AcademyLevel | undefined {
  return ACADEMY_LEVELS.find((level) => level === value);
}

function clampPage(value: string | number | undefined, totalPages: number) {
  const parsed = typeof value === "number" ? value : Number.parseInt(value ?? "1", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(Math.floor(parsed), totalPages);
}

export function filterAcademyLessons(
  lessons: LocalizedAcademyLesson[],
  options: AcademyFilterOptions = {},
): AcademyFilterResult {
  const query = options.q?.trim().toLocaleLowerCase() ?? "";
  const track = validTrack(options.track?.trim());
  const level = validLevel(options.level?.trim());
  const requestedPageSize = options.pageSize ?? ACADEMY_PAGE_SIZE;
  const pageSize =
    Number.isFinite(requestedPageSize) && requestedPageSize > 0
      ? Math.min(Math.floor(requestedPageSize), 50)
      : ACADEMY_PAGE_SIZE;

  const filtered = lessons.filter((lesson) => {
    if (track && lesson.track !== track) return false;
    if (level && lesson.level !== level) return false;
    if (!query) return true;

    const searchable = [
      lesson.title,
      lesson.shortSummary,
      lesson.tags.join(" "),
      lesson.visualLabel,
      lesson.nodes,
      lesson.ties,
      lesson.networkType,
      lesson.learningObjectives.join(" "),
      lesson.coreIdeas.join(" "),
      lesson.relatedConcepts.join(" "),
      lesson.tutorialSteps.map((step) => `${step.title} ${step.action} ${step.checkpoint}`).join(" "),
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
