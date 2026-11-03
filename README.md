# raajasaab-learning

A private, invite-only course library with a YouTube-style player.
Next.js App Router · React · Tailwind CSS v4 · shadcn-style components · HLS.js

## 1. Add your course data

Copy your course JSON files into `video-data/` (rename `alpha.txt` to `alpha-batch-3.json`).
See `video-data/README.md` for the format. Optional course cover images go in
`lib/course-thumbnails.json`:

```json
{
  "alpha-batch-3": "https://your-site.com/alpha3.jpg",
  "sigma-9": "https://your-site.com/sigma9.jpg"
}
```

Keys are course, bundle or category IDs (listed under `titles` in `lib/navigation.json`).

## 2. Create logins

```sh
npm install
npm run auth-secret              # prints a random secret
npm run add-user -- raghav       # asks for a password, prints a line
npm run add-user -- friend1
```

Create `.env.local` (never commit it):

```
AUTH_SECRET=the-secret-you-printed
AUTH_USERS=raghav:xxxx:yyyy,friend1:aaaa:bbbb
```

## 3. Run locally

```sh
npm run dev       # http://localhost:3000
npm test          # data + login tests
```

`npm run dev` and `npm run build` merge everything in `video-data/` into `app/catalogue.json`.

## 4. Deploy to Vercel

1. Push to a **private** GitHub repository (commit `video-data/` and `lib/course-thumbnails.json`).
2. In Vercel: **Add New → Project → Import** the repository. Defaults are fine.
3. **Settings → Environment Variables**: add `AUTH_SECRET` and `AUTH_USERS` (same values as `.env.local`).
4. Deploy (or **Redeploy** if it was already deployed — env-var changes need a new deployment).
5. In **Deployment Protection**, keep **Standard Protection** so your friends see this login page
   rather than a Vercel sign-in.

## Managing access

| To…               | Do this                                                                 |
| ----------------- | ----------------------------------------------------------------------- |
| Add someone       | `npm run add-user -- name`, add the line to `AUTH_USERS`, redeploy      |
| Remove someone    | Delete their entry from `AUTH_USERS`, redeploy — signed out immediately |
| Reset a password  | Run `add-user` again with the same name, replace their entry, redeploy  |
| Sign everyone out | Change `AUTH_SECRET`, redeploy                                          |

## Player shortcuts

Space/K play-pause · J/L ±10s · ←/→ ±5s · ↑/↓ volume (player focused) · M mute · F fullscreen ·
T theater · I picture-in-picture · N/P next/previous · `<`/`>` speed · 0–9 jump to 0–90% · `/` search

## Good to know

- **Progress, notes and bookmarks** are stored in each person's browser (localStorage), per site address.
  Use avatar → _Export progress_ / _Restore backup_ to move them.
- **Signed-in users can see video URLs.** Only share accounts with people you trust.
- **Login attempts** are limited (5 failures → 10-minute lock per IP, per server instance). Use strong passwords.
- **The course list** is built into the site's JavaScript bundle, which isn't behind the login.
  The file names are random and only linked from signed-in pages, but this isn't airtight.
- **Videos** are your own authorized provider links; expiry, CORS or provider restrictions can block playback.
- **Thumbnails** come from your own URLs or Wistia's public oEmbed endpoint; if unavailable, cards use a text layout.
- `next.config.mjs` contains `allowedDevOrigins` for testing from another device on your network (dev only).

<!-- npm run auth-secret
npm run add-user -- raghav -->
