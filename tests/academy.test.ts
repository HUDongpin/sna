import assert from "node:assert/strict";
import test from "node:test";
import { filterAcademyLessons } from "../lib/academy-filter";
import {
  academyLessons,
  getAcademySequenceNeighbors,
  getRelatedAcademyLessons,
  localizeAcademyLesson,
} from "../lib/academy-reviewed-data";
import { ACADEMY_LEVELS, ACADEMY_TRACKS } from "../lib/academy-types";
import { locales } from "../lib/i18n";
import { academyLearningResourceJsonLd } from "../lib/structured-data";
import sitemap from "../app/sitemap";

function assertCompleteText(value: unknown, location: string): void {
  if (typeof value === "string") {
    assert.ok(value.trim().length > 0, `${location} must not be empty`);
    return;
  }
  if (Array.isArray(value)) {
    assert.ok(value.length > 0, `${location} must not be an empty array`);
    value.forEach((child, index) => assertCompleteText(child, `${location}[${index}]`));
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      assertCompleteText(child, `${location}.${key}`);
    }
  }
}

test("the Academy corpus preserves its baseline and supports ordered three-language growth", () => {
  const baselineIds = [
    "academy-006",
    "academy-005",
    "academy-004",
    "academy-003",
    "academy-002",
    "academy-001",
  ];
  assert.ok(academyLessons.length >= baselineIds.length);
  assert.ok(baselineIds.every((id) => academyLessons.some((lesson) => lesson.id === id)));
  assert.deepEqual(
    academyLessons.map((lesson) => lesson.sequence).sort((left, right) => left - right),
    Array.from({ length: academyLessons.length }, (_, index) => index + 1),
  );
  assert.deepEqual(
    academyLessons.map((lesson) => lesson.sequence),
    [...academyLessons].map((lesson) => lesson.sequence).sort((left, right) => right - left),
  );

  const currentRelease = academyLessons.find((lesson) => lesson.id === "academy-007");
  assert.ok(currentRelease);
  assert.equal(currentRelease.track, "methods-visualization");
  assert.equal(currentRelease.level, "applied");

  const ids = new Set<string>();
  const slugs = new Set<string>();
  const trackCounts = new Map<string, number>();
  const levelCounts = new Map<string, number>();

  for (const lesson of academyLessons) {
    assert.match(lesson.id, /^academy-\d{3}$/);
    assert.equal(lesson.sequence, Number.parseInt(lesson.id.slice(8), 10));
    assert.match(lesson.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.equal(lesson.analysisApproach, "social-network-analysis");
    assert.match(lesson.publishedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(lesson.reviewedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(lesson.durationMinutes >= 8 && lesson.durationMinutes <= 20);
    assert.ok(ACADEMY_TRACKS.includes(lesson.track));
    assert.ok(ACADEMY_LEVELS.includes(lesson.level));
    assert.ok(!ids.has(lesson.id), `${lesson.id} must be unique`);
    assert.ok(!slugs.has(lesson.slug), `${lesson.slug} must be unique`);
    ids.add(lesson.id);
    slugs.add(lesson.slug);
    trackCounts.set(lesson.track, (trackCounts.get(lesson.track) ?? 0) + 1);
    levelCounts.set(lesson.level, (levelCounts.get(lesson.level) ?? 0) + 1);

    assert.ok(lesson.sources.length >= 2);
    for (const source of lesson.sources) {
      assert.match(source.url, /^https:\/\//);
      assert.ok(source.label.length >= 15);
    }

    for (const locale of locales) {
      const localized = localizeAcademyLesson(lesson, locale);
      assertCompleteText(lesson.localizations[locale], `${lesson.id}.${locale}`);
      assert.equal(localized.tags.length, 3);
      assert.equal(localized.learningObjectives.length, 3);
      assert.equal(localized.tutorialSteps.length, 4);
      assert.equal(localized.interpretation.length, 2);
      assert.equal(localized.coreIdeas.length, 3);
      assert.equal(localized.relatedConcepts.length, 3);
      assert.ok(localized.nodes.length >= 15);
      assert.ok(localized.ties.length >= 15);
      assert.ok(localized.networkType.length >= 15);
      assert.ok(localized.responsibleUse.length >= 60);
      const actionMinimum = locale === "en" ? 60 : 45;
      const checkpointMinimum = locale === "en" ? 25 : 18;
      for (const step of localized.tutorialSteps) {
        assert.ok(step.action.length >= actionMinimum);
        assert.ok(step.checkpoint.length >= checkpointMinimum);
      }

      if (lesson.id === "academy-002") {
        const matrixTerms = {
          en: ["N by N", "N squared cells"],
          "zh-hant": ["N 乘 N", "N 平方個儲存格"],
          "zh-hans": ["N 乘 N", "N 平方个单元格"],
        }[locale];
        const representationTerms = {
          en: ["node table", "edge list"],
          "zh-hant": ["節點表", "邊列表"],
          "zh-hans": ["节点表", "边列表"],
        }[locale];

        for (const term of matrixTerms) {
          assert.ok(localized.tutorialSteps[2].checkpoint.includes(term));
        }
        for (const term of representationTerms) {
          assert.ok(localized.practiceTask.includes(term));
        }
      }

      if (lesson.id === "academy-007") {
        const temporalTerms = {
          en: ["missing data", "fixed node coordinates"],
          "zh-hant": ["缺失資料", "固定節點座標"],
          "zh-hans": ["缺失数据", "固定节点坐标"],
        }[locale];

        for (const term of temporalTerms) {
          assert.ok(JSON.stringify(localized).includes(term));
        }
      }
    }
  }

  for (const track of ACADEMY_TRACKS) {
    assert.ok((trackCounts.get(track) ?? 0) >= 1, `${track} must remain represented`);
  }
  for (const level of ACADEMY_LEVELS) {
    assert.ok((levelCounts.get(level) ?? 0) >= 1, `${level} must remain represented`);
  }
});

test("Academy search, track and level filtering, and pagination preserve sequence", () => {
  const english = [...academyLessons]
    .sort((left, right) => left.sequence - right.sequence)
    .map((lesson) => localizeAcademyLesson(lesson, "en"));

  const firstPage = filterAcademyLessons(english, { pageSize: 3 });
  assert.deepEqual(firstPage.items, english.slice(0, 3));
  assert.equal(firstPage.totalPages, Math.max(1, Math.ceil(english.length / 3)));

  const secondPage = filterAcademyLessons(english, { page: "2", pageSize: 3 });
  assert.deepEqual(secondPage.items, english.slice(3, 6));

  const theory = filterAcademyLessons(english, { track: "network-theory" });
  assert.equal(theory.total, english.filter((lesson) => lesson.track === "network-theory").length);
  assert.ok(theory.items.every((lesson) => lesson.track === "network-theory"));

  const advanced = filterAcademyLessons(english, { level: "advanced" });
  assert.equal(advanced.total, english.filter((lesson) => lesson.level === "advanced").length);
  assert.ok(advanced.items.every((lesson) => lesson.level === "advanced"));

  const centrality = filterAcademyLessons(english, { q: "betweenness" });
  assert.equal(centrality.total, 1);
  assert.equal(centrality.items[0].id, "academy-003");

  const combined = filterAcademyLessons(english, {
    q: "QAP",
    track: "responsible-application",
    level: "advanced",
  });
  assert.equal(combined.total, 1);
  assert.equal(combined.items[0].id, "academy-005");

  const ignoredInvalidFilters = filterAcademyLessons(english, {
    track: "not-a-track",
    level: "not-a-level",
  });
  assert.equal(ignoredInvalidFilters.total, english.length);

  const excessivePage = filterAcademyLessons(english, { page: "999", pageSize: 2 });
  const lastPage = Math.max(1, Math.ceil(english.length / 2));
  assert.equal(excessivePage.page, lastPage);
  assert.deepEqual(excessivePage.items, english.slice((lastPage - 1) * 2, lastPage * 2));

  const negativePage = filterAcademyLessons(english, { page: "-4", pageSize: 2 });
  assert.equal(negativePage.page, 1);

  const empty = filterAcademyLessons(english, { q: "no-such-sna-concept" });
  assert.equal(empty.total, 0);
  assert.equal(empty.totalPages, 1);
  assert.deepEqual(empty.items, []);

  const traditionalChinese = [...academyLessons]
    .sort((left, right) => left.sequence - right.sequence)
    .map((lesson) => localizeAcademyLesson(lesson, "zh-hant"));
  const chineseCentrality = filterAcademyLessons(traditionalChinese, { q: "中介中心性" });
  assert.equal(chineseCentrality.total, 1);
  assert.equal(chineseCentrality.items[0].id, "academy-003");
});

test("Academy relations, sequential navigation, structured data, and sitemap are deterministic", () => {
  const first = academyLessons.find((lesson) => lesson.id === "academy-001");
  const third = academyLessons.find((lesson) => lesson.id === "academy-003");
  assert.ok(first && third);

  const firstNeighbors = getAcademySequenceNeighbors(first, "en");
  assert.equal(firstNeighbors.previous, undefined);
  assert.equal(firstNeighbors.next?.id, "academy-002");

  const thirdNeighbors = getAcademySequenceNeighbors(third, "en");
  assert.equal(thirdNeighbors.previous?.id, "academy-002");
  assert.equal(thirdNeighbors.next?.id, "academy-004");

  const related = getRelatedAcademyLessons(third, "en", 3);
  assert.equal(related.length, 3);
  assert.ok(related.every((lesson) => lesson.id !== third.id));

  const localized = localizeAcademyLesson(third, "zh-hant");
  const jsonLd = academyLearningResourceJsonLd(localized, "zh-hant") as Record<string, unknown>;
  assert.equal(jsonLd["@type"], "LearningResource");
  assert.equal(jsonLd.inLanguage, "zh-Hant-HK");
  assert.equal(jsonLd.learningResourceType, "Tutorial");
  assert.equal(jsonLd.timeRequired, `PT${third.durationMinutes}M`);

  const urls = sitemap().map((entry) => entry.url);
  for (const locale of locales) {
    for (const lesson of academyLessons) {
      assert.ok(
        urls.includes(`https://www.sna.hk/${locale}/academy/${lesson.slug}`),
        `${locale}/${lesson.slug} must be in the sitemap`,
      );
    }
  }
});
