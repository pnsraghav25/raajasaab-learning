import courseThumbs from "./course-thumbnails.json";
import { safeImage } from "./catalogue.mjs";

/**
 * Cover image for a course, bundle or category.
 * Priority: `thumbnail` inside the course JSON → lib/course-thumbnails.json → none.
 */
export function coverFor(id, course) {
  return safeImage(course?.thumbnail) || safeImage(courseThumbs[id]) || null;
}
