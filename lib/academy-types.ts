import type { Locale } from "@/lib/i18n";

export const ACADEMY_TRACKS = [
  "network-theory",
  "methods-visualization",
  "responsible-application",
] as const;

export const ACADEMY_LEVELS = ["foundation", "applied", "advanced"] as const;
export const ACADEMY_PAGE_SIZE = 6;

export type AcademyTrack = (typeof ACADEMY_TRACKS)[number];
export type AcademyLevel = (typeof ACADEMY_LEVELS)[number];

export type AcademySource = {
  label: string;
  url: string;
};

export type AcademyTutorialStep = {
  title: string;
  action: string;
  checkpoint: string;
};

export type AcademyLessonLocalization = {
  title: string;
  shortSummary: string;
  tags: [string, string, string];
  visualLabel: string;
  learningObjectives: [string, string, string];
  scenario: string;
  nodes: string;
  ties: string;
  networkType: string;
  tutorialSteps: [
    AcademyTutorialStep,
    AcademyTutorialStep,
    AcademyTutorialStep,
    AcademyTutorialStep,
  ];
  interpretation: [string, string];
  coreIdeas: [string, string, string];
  practiceTask: string;
  responsibleUse: string;
  relatedConcepts: [string, string, string];
};

export type AcademyLessonRecord = {
  id: string;
  sequence: number;
  slug: string;
  track: AcademyTrack;
  level: AcademyLevel;
  analysisApproach: "social-network-analysis";
  publishedAt: string;
  reviewedAt: string;
  durationMinutes: number;
  sources: [AcademySource, ...AcademySource[]];
  localizations: Record<Locale, AcademyLessonLocalization>;
};

export type LocalizedAcademyLesson = Omit<AcademyLessonRecord, "localizations"> &
  AcademyLessonLocalization;
