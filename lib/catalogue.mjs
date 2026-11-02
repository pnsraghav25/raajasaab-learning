/** Accepts only plain HTTPS URLs without credentials. Returns undefined otherwise. */
export function safeImage(url) {
  if (typeof url !== "string" || !url.trim()) return undefined;
  try {
    const u = new URL(url.trim());
    return u.protocol === "https:" && !u.username && !u.password ? u.href : undefined;
  } catch {
    return undefined;
  }
}

export function validateCatalogue(input) {
  const list = Array.isArray(input) ? input : Array.isArray(input?.courses) ? input.courses : [input];
  if (!list.length || list.length > 1000) throw new Error("Provide 1–1000 courses.");
  const ids = new Set();
  return list.map((c) => {
    if (
      !c ||
      typeof c.id !== "string" ||
      !/^[a-zA-Z0-9_-]{1,120}$/.test(c.id) ||
      typeof c.title !== "string" ||
      !c.title.trim() ||
      !Array.isArray(c.sections) ||
      ids.has(c.id)
    )
      throw new Error("Invalid or duplicate course. Each needs a unique id, title and sections array.");
    ids.add(c.id);
    const seenLessons = new Set();
    const seenSections = new Set();
    return {
      id: c.id,
      title: c.title.slice(0, 300),
      description: String(c.description || "").slice(0, 2000),
      category: typeof c.category === "string" ? c.category : undefined,
      batch: typeof c.batch === "string" ? c.batch : undefined,
      thumbnail: safeImage(c.thumbnail),
      sections: c.sections.map((s) => {
        if (
          !s ||
          typeof s.id !== "string" ||
          !s.id ||
          typeof s.title !== "string" ||
          !Array.isArray(s.lessons) ||
          seenSections.has(s.id)
        )
          throw new Error(`Invalid or duplicate section in ${c.id}`);
        seenSections.add(s.id);
        return {
          id: s.id,
          title: s.title.slice(0, 300),
          isAvailable: s.isAvailable !== false,
          lessons: s.lessons.map((l) => {
            if (
              !l ||
              typeof l.id !== "string" ||
              !l.id ||
              l.id.includes(":") ||
              typeof l.title !== "string" ||
              seenLessons.has(l.id)
            )
              throw new Error(`Invalid or duplicate lesson in ${c.id}`);
            seenLessons.add(l.id);
            if (l.url) {
              let u;
              try {
                u = new URL(l.url);
              } catch {
                throw new Error(`Invalid lesson URL in ${c.id}`);
              }
              if (u.protocol !== "https:" || u.username || u.password)
                throw new Error("Lesson URLs must be HTTPS without credentials.");
            }
            const d = Number(l.duration);
            return {
              id: l.id,
              title: l.title.slice(0, 500),
              type: l.type || "video",
              duration: Number.isFinite(d) ? Math.max(0, d) : 0,
              url: l.url || "",
            };
          }),
        };
      }),
    };
  });
}

export const lessonKey = (courseId, lessonId) => courseId + ":" + lessonId;

export const flatten = (course) =>
  (course?.sections || [])
    .filter((s) => s.isAvailable !== false)
    .flatMap((s) => s.lessons.filter((l) => l.type === "video" && l.url).map((l) => ({ ...l, section: s.title })));

export const localDay = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
