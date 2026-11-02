# raajasaab-learning

Next.js App Router · React · Tailwind CSS v4 · shadcn-style components · HLS.js

## Quick start

1. Copy your course JSON files (including `alpha.txt` renamed to `alpha-batch-3.json`) into `video-data/`.
2. Run:

```sh
npm install
npm run dev
```

3. Open http://localhost:3000

`npm run dev` and `npm run build` automatically merge everything in `video-data/` into `app/catalogue.json`.
You can also import JSON from the in-app settings (click your avatar, top right).

## Features

- YouTube-style overlay player: auto-hiding controls, theme-coloured seek bar with scrubbing and time tooltip,
  settings menu (speed + quality), theater mode, picture-in-picture, fullscreen, "Up next" countdown.
- Remembers position, speed and volume; resumes where you left off.
- Shortcuts: Space/K, J/L, ←/→, ↑/↓, M, F, T, I, N/P, < / >, 0–9, and / for search.
- Home dashboard with greeting, daily goal ring, streak, continue-watching and recently watched.
- Category, bundle, saved, history and search pages; dark and light themes; mobile bottom navigation.
- Timestamped notes, bookmarks, completion tracking, progress export/restore.

## Notes

- Progress lives in this browser's localStorage only — approximate, not certified completion.
- Video URLs are your own authorized provider links; expiry, CORS or provider restrictions can still block playback.
- The name prompt is a greeting, not authentication.
