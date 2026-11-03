# Put your course JSON files here

Each file can be one course, an array of courses, or `{ "courses": [...] }`.
The course `id` must match the route, e.g. `alpha-batch-3` → `/courses/alpha-batch-3`.
Sub-folders are fine. Only `.json` files are read (rename `alpha.txt` → `alpha-batch-3.json`).
After adding files, restart `npm run dev`.

```json
{
  "id": "alpha-batch-3",
  "title": "Alpha Batch 3.0",
  "thumbnail": "https://your-site.com/optional-cover.jpg",
  "sections": [
    {
      "id": "section-1",
      "title": "Introduction",
      "lessons": [
        { "id": "lesson-1", "title": "Welcome", "type": "video", "duration": 120, "url": "https://fast.wistia.com/embed/medias/XXXX.m3u8" }
      ]
    }
  ]
}
```
