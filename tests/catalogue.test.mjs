import test from "node:test";
import assert from "node:assert/strict";
import { validateCatalogue, flatten, lessonKey, localDay, safeImage } from "../lib/catalogue.mjs";

const sample = {
  id: "demo",
  title: "Demo",
  thumbnail: "https://example.com/cover.jpg",
  sections: [
    {
      id: "s1",
      title: "Intro",
      lessons: [
        { id: "l1", title: "One", type: "video", duration: 60, url: "https://example.com/a.m3u8" },
        { id: "l2", title: "Notes", type: "text" },
      ],
    },
  ],
};

test("flattens only playable video lessons", () => assert.equal(flatten(validateCatalogue(sample)[0]).length, 1));
test("keeps a safe course thumbnail", () => assert.equal(validateCatalogue(sample)[0].thumbnail, "https://example.com/cover.jpg"));
test("drops unsafe image URLs", () => {
  for (const bad of ["javascript:alert(1)", "http://x.com/a.jpg", "https://u:p@x.com/a.jpg", ""]) assert.equal(safeImage(bad), undefined);
});
test("keys are course scoped", () => assert.notEqual(lessonKey("a", "1"), lessonKey("b", "1")));
test("rejects duplicate course IDs", () => assert.throws(() => validateCatalogue([sample, sample])));
test("rejects unsafe lesson URLs", () => {
  const bad = structuredClone(sample);
  bad.sections[0].lessons[0].url = "javascript:alert(1)";
  assert.throws(() => validateCatalogue(bad));
});
test("accepts empty courses", () => assert.equal(flatten(validateCatalogue({ id: "e", title: "E", sections: [] })[0]).length, 0));
test("uses the local calendar day", () => assert.equal(localDay(new Date(2026, 10, 2, 0, 1)), "2026-11-02"));
