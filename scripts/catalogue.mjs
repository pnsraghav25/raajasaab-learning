// Merges every JSON file in video-data/ (including sub-folders) into app/catalogue.json.
// Runs automatically before `npm run dev` and `npm run build`.
import fs from "node:fs";
import path from "node:path";
import { validateCatalogue } from "../lib/catalogue.mjs";

const file = "app/catalogue.json";
const map = new Map(validateCatalogue(JSON.parse(fs.readFileSync(file, "utf8"))).map((c) => [c.id, c]));
let imported = 0;

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (entry.name.toLowerCase().endsWith(".json")) {
      try {
        // Tolerate invisible characters some editors append after the JSON.
        const raw = fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "").replace(/[\u200B-\u200D\uFEFF\s]+$/, "");
        for (const c of validateCatalogue(JSON.parse(raw))) { map.set(c.id, c); imported += 1; }
      } catch (err) {
        console.error(`✖ ${p}: ${err.message}`);
        process.exitCode = 1;
      }
    }
  }
}

walk("video-data");
if (process.exitCode) process.exit(process.exitCode);
fs.writeFileSync(file, JSON.stringify([...map.values()], null, 2));
const lessons = [...map.values()].reduce((n, c) => n + c.sections.reduce((m, s) => m + s.lessons.length, 0), 0);
console.log(`✔ Catalogue: ${map.size} courses, ${lessons} lessons (${imported} from video-data/)`);
