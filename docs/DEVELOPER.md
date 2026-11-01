# Tapiee — Developer Guide

Technical reference for people working on the tapie codebase: how it is built, how data flows, and how to run, test and deploy it.

- [1. What tapie does](#1-what-tapie-does)
- [2. Stack](#2-stack)
- [3. Running locally](#3-running-locally)
- [4. Project layout](#4-project-layout)
- [5. Architecture](#5-architecture)
- [6. Data model](#6-data-model)
- [7. API reference](#7-api-reference)
- [8. The vibe engine](#8-the-vibe-engine)
- [9. Rendering the cassette](#9-rendering-the-cassette)
- [10. The shared-tape player](#10-the-shared-tape-player)
- [10a. Themes](#10a-themes)
- [10b. Motion, sound & the create flow](#10b-motion-sound--the-create-flow)
- [11. Security model](#11-security-model)
- [12. Configuration](#12-configuration)
- [13. Deployment](#13-deployment)
- [14. Testing](#14-testing)
- [15. Known limitations](#15-known-limitations)

---

## 1. What tapie does

1. A user adds songs by **searching** or by pasting a **YouTube video / playlist link**.
2. tapie **reads the songs' mood** (genre, era, YouTube tags, artwork tone) and **generates a design**: colours from the songs' artwork, fonts, textures, labels and a name.
3. The user customises everything: tape shell & label, case cover (photo, title, pattern), the inside card (message, paper), stickers, text and polaroid photos, on four surfaces (tape side A, side B, case cover, case inside).
4. Saving gives a **share link** (`/c/<id>`) and a **secret edit link** (`/edit/<id>#<key>`). No accounts.
5. The friend opens the share link: flips the case, reads the note, and plays the tape through a retro walkman-style player (audio comes from a hidden YouTube embed).

## 2. Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | **Next.js 16** (App Router, Turbopack) | `proxy.ts` is Next 16's name for middleware |
| UI | **React 19**, **Tailwind CSS 4** | Cassette art uses inline styles at a fixed design size |
| Language | **TypeScript 5** (strict) | TS 7 is not used: Next's build-time type-check needs the TS 5 API |
| Validation | **zod 4** | One schema shared by client and server (`lib/schema.ts`) |
| Fonts | `next/font/google` | Self-hosted at build time, so no runtime calls to Google |
| Storage | JSON files on disk | Swappable: see [Deployment](#13-deployment) |
| Music data | YouTube (public pages + oEmbed), iTunes Search API | **No API keys** |

No other runtime dependencies.

## 3. Running locally

Requirements: Node.js ≥ 20 (tested on 22.19).

```bash
npm install
npm run dev            # http://localhost:3000 (Turbopack, hot reload)
npm run build && npm start   # production build
npx tsc --noEmit       # type-check
```

Saved tapes are written to `./data/cassettes/<id>.json` (git-ignored).

To try it on a phone on the same Wi-Fi: `npm run dev -- -H 0.0.0.0`, then open `http://<pc-ip>:3000`.

## 4. Project layout

```
app/
  layout.tsx              Root layout, fonts, forces per-request rendering (CSP nonce)
  page.tsx                Landing page
  create/page.tsx         Start screen (search/paste) → editor; draft restore
  edit/[id]/page.tsx      Loads a tape with the key from the URL hash → editor
  c/[id]/page.tsx         Public share page (server-rendered) + metadata
  not-found.tsx           404
  api/
    cassettes/route.ts        POST   create
    cassettes/[id]/route.ts   GET / PUT / DELETE
    cassettes/body.ts         Size-limited body reader + validation
    youtube/route.ts          POST   import video/playlist link
    youtube/search/route.ts   GET    search songs by name
    vibe/route.ts             POST   compute a tape's mood from song data
components/
  Surfaces.tsx            Tape, cover and inside artwork + SurfaceView (art + layers)
  Stage.tsx               Fixed 640×400 design canvas scaled to fit
  Layers.tsx              Stickers/text/photos: render, drag, resize/rotate
  FlipCard.tsx            3-D flip between two faces
  Stickers.tsx            Hand-drawn SVG sticker set
  SharedTape.tsx          Share page UI
  RetroPlayer.tsx         Walkman-style player (hidden YouTube embed)
  MyTapes.tsx             "Your tapes" list (localStorage)
  ThemeToggle.tsx         ☾/☀ dark mode + 🎲 random palette buttons
  editor/                 Editor shell + panels (Songs, Tape, Cover, Inside, Stickers, Share, VibeBar)
lib/
  schema.ts               zod schemas + types (Cassette, Layer, Track, Mood)
  constants.ts            Limits, fonts, patterns, sticker keys, sizes
  store.ts                File storage, ids, edit-key hashing, per-tape write lock
  youtube.ts              Link parsing, oEmbed, playlist + search scraping
  songInfo.ts             Server-only song metadata (iTunes genre/year, YouTube tags)
  vibes.ts                Mood engine + design generator
  thumbs.ts               Browser: artwork colour extraction, song-art covers
  patterns.ts             CSS patterns, grain texture, inside papers
  defaults.ts             Default tape, backdrops ("scenes"), landing demo tape
  rateLimit.ts            In-memory rate limiter + client IP logic
  useYouTube.ts           YouTube IFrame API hook
  client.ts               Browser helpers (ids, image compression, my-tapes, clipboard)
  theme.ts                Site themes: palettes, apply/save, no-flash boot script
proxy.ts                  Per-request Content-Security-Policy with nonce
next.config.ts            Security headers for every response
```

## 5. Architecture

```
 Browser                                                  Server (Next.js)                     External (no keys)
 ───────                                                  ────────────────                     ──────────────────
 /create ─ search / paste ───────────────────────────────▶ /api/youtube(/search) ─────────────▶ youtube.com (oEmbed, pages)
         ◀─ tracks ──────────────────────────────────────
 artwork colours (canvas, i.ytimg.com) ──┐
 tracks + colours + search words ────────┴──────────────▶ /api/vibe ──── songInfo ────────────▶ itunes.apple.com, youtube.com
         ◀─ mood ───────────────────────────────────────
 designFromMood() in the browser → editor state
 Save ─ JSON ────────────────────────────────────────────▶ /api/cassettes ─ zod ─ store.ts ─▶ data/cassettes/<id>.json
         ◀─ id + editKey (once) ─────────────────────────
 /c/<id> (server-rendered) ◀──────────────────────────────  getCassette()
 Player: YouTube IFrame API (hidden iframe) ───────────────────────────────────────────────────▶ youtube.com
```

Key decisions:

- **One fixed design size.** Every surface is designed at 640×400 and scaled with a CSS transform (`Stage`), so a tape looks identical on every screen and sticker positions are stored in design pixels.
- **Images inline.** Photos are resized and compressed in the browser (JPEG/WebP) and stored as data URLs inside the tape JSON. One tape is one document, which makes swapping the storage backend trivial.
- **No accounts.** Ownership is a random secret edit key. Only its SHA-256 hash is stored.
- **Design generation runs in the browser** (pure functions in `lib/vibes.ts`). The server only computes the mood, because it needs outbound requests to iTunes and YouTube.

## 6. Data model

Defined in `lib/schema.ts` (`CassetteInputSchema`). A stored file is `{ cassette, editKeyHash }`.

| Field | Type | Notes |
|---|---|---|
| `title`, `from`, `to`, `message` | strings | ≤ 60 / 40 / 40 / 600 chars |
| `scene` | enum | Backdrop of the share page |
| `vibe`, `mood` | optional | Last generated mood (energy, darkness, warmth, age, tenderness ∈ 0..1, family, year) |
| `tape` | object | shell colour + finish, label colour + pattern, ink, font, side A/B label text |
| `cover` | object | bg, pattern, accent, photo (data URL), zoom/x/y, title, subtitle, font, ink, spine |
| `inside` | object | paper, ink, font, showTracklist |
| `layers` | `{ tapeA, tapeB, cover, inside }` | ≤ 40 each; types `emoji`, `sticker`, `image`, `photo`, `text` |
| `tracks` | 1–100 | `{ id, videoId, title, artist, duration?, side: "A"|"B" }` |

Limits (`lib/constants.ts → LIMITS`): 100 tracks, 40 layers per surface, 16 images per tape, 1.5 MB per image, 8 MB per request body.

Layers generated by the vibe engine have ids starting with `vibe-`. Restyling replaces only those, so the user's own stickers are never touched.

## 7. API reference

All bodies are JSON. Errors are `{ "error": "<friendly message>" }`.

| Method & path | Purpose | Auth | Rate limit |
|---|---|---|---|
| `POST /api/youtube` `{ url }` | Import a video or playlist link → `{ kind, title, tracks[] }` | – | 40 / 10 min |
| `GET /api/youtube/search?q=` | Search songs (2–120 chars) → `{ results[] }` (≤ 12) | – | 80 / 10 min |
| `POST /api/vibe` `{ tracks[], context?, colors? }` | Mood from song data → `{ mood, vibe, songs[] }` | – | 30 / 10 min |
| `POST /api/cassettes` | Create → `201 { id, editKey, cassette }`. **The key is only ever returned here.** | – | 20 / hour |
| `GET /api/cassettes/:id` | Public tape. With `x-edit-key`, also `canEdit` | key optional | – |
| `PUT /api/cassettes/:id` | Replace the tape | `x-edit-key` | 120 / 10 min |
| `DELETE /api/cassettes/:id` | Delete | `x-edit-key` | 30 / 10 min |

Status codes: `400` invalid data, `403` wrong key, `404` not found, `413` body too large, `422` the link/search can't be used, `429` rate limited, `502` YouTube didn't answer.

## 8. The vibe engine

`lib/vibes.ts` has two stages. It contains **no artist lists**: every song goes through the same path.

**1. Mood (`moodFromSignals`).** For up to 10 songs sampled evenly across the tape or playlist, `lib/songInfo.ts` collects:

- iTunes Search API → **genre** and **release year**. Falls back to the artist's main genre when the song isn't found.
- YouTube watch page → **creator tags**, **description**, `℗ YYYY` / `Released on:` year.

Each song is scored on five continuous dimensions (energy, darkness, warmth, age, tenderness) from:

- a genre table (e.g. metal → energy+, darkness+; bedroom pop → energy−);
- general mood vocabulary in English and Hindi (sad, love, lofi, remix…);
- era from the median release year.

The scores are averaged across songs. The artwork tone (brightness, saturation, warm/cool hue), measured in the browser by `lib/thumbs.ts` from up to 8 thumbnails spread across the tape, and the user's search words or playlist name are added, then everything is squashed to 0..1. Each song is looked up on its own, so one artist's pop, country and indie songs get different moods. Special case: stores file lo-fi as "Hip-Hop/Rap", so songs that say "lofi" are re-read as lo-fi.

**2. Design (`designFromMood`).** Seeded, so Shuffle is reproducible:

- **Palette** from the songs' artwork hue (skin tones de-prioritised). It commits to one tone: *deep* (dark moods), *light* (soft moods) or *bold* (energetic), with saturation guard rails and contrast-checked ink (WCAG ≥ 4.5 for titles).
- **Fonts, cover texture, label pattern, shell finish, paper, backdrop:** each option has a mood-scoring function, and the best fit wins (plus a little randomness).
- **Labels:** typeset J-card text (`℗ 2026`, `after dark`, the real decade).
- **Name & subtitle:** mood phrases or the songs' own words.

The 9 vibe names (`VIBE_INFO`) are only archetypes: `nearestVibe()` labels a mood, and `moodForVibe()` lets users steer it.

The editor runs this automatically once, when the first songs are added, and only while the user hasn't styled anything by hand (`touched` ref). The title/subtitle are replaced only if empty or previously auto-generated.

## 9. Rendering the cassette

- `SurfaceView` = artwork (`TapeArt` | `CoverArt` | `InsideArt`) + `LayerCanvas` (+ plastic sheen on the cover), inside a `Stage`.
- `LayerCanvas` handles pointer events: drag to move, corner handle to scale and rotate (angle and distance from the centre), keyboard Delete / Esc / arrows. Pointer deltas are divided by the stage scale.
- Text fitting: `fitFontSize` / `fitLine` estimate glyph widths per font (`FONTS[k].width`).
- Patterns are CSS gradients. Film grain is an inline SVG `feTurbulence` data URI.

## 10. The shared-tape player

- `useYouTubePlayer` loads the IFrame API once and creates the player in a child node (React never owns the iframe).
- `RetroPlayer` keeps that node mounted at all times (moving an iframe reloads it). Hidden mode = 200×200, `opacity: 0`, `pointer-events: none`. The 📺 toggle shows it.
- If playback hasn't started 3 s after Play (some mobile browsers require a tap on the video itself), the video is revealed with a hint.
- Embed errors (101/150: the owner disabled embedding) skip to the next track.
- Tape reels spin while playing, and the wound tape follows progress through the current side.

## 10a. Themes

- The UI is coloured through CSS variables (`--color-cream`, `paper`, `ink`, `field`, `shadow`, `dot`, `orange`, `mustard`) defined in `app/globals.css`. Light is the default; `html[data-theme="dark"]` overrides them.
- **Random theme** picks one of 9 hand-tuned palettes in `lib/theme.ts` (5 light, 4 dark) and sets the same variables inline on `<html>`. Every palette keeps ink-on-paper contrast high.
- The choice is saved in `localStorage` (`tapie:theme`). A tiny boot script (`THEME_BOOT_SCRIPT`), inlined in `<head>` with the request's CSP nonce, applies it before first paint, so there is no flash. Without a saved choice it follows the OS dark-mode preference.
- **Shared tapes** render inside `.theme-classic` (pinned variables), so friends see the creator's backdrop and design. The viewer can still switch theme on that page; that only re-themes the page around the cassette, and ↺ restores the original look (`tapie:share-viewer-theme`).
- The cassette art (`Surfaces.tsx`) and the retro player use fixed colours, never theme variables, so they look identical in every theme.

## 10b. Motion, sound & the create flow

- **Create flow:** `/create` collects songs first (search or paste, many at once) into a "Your tape" list kept in `localStorage` (`tapie:collect`). **Start designing →** opens the editor. The vibe engine then runs **once**, from all picked songs plus the search words and playlist names, behind a short "reading your songs…" overlay (`components/editor/ReadingSongs.tsx`). After that the design is never restyled automatically.
- **Auto note:** the design step also writes a short mood-matched note inside the case (`NOTES` in `lib/vibes.ts`), but only when the note is empty or was itself auto-written. A user's own words are never replaced.
- **Motion** (`lib/motion.ts`, the "Motion" section of `globals.css`): shared easing/timing tokens; View Transitions for the theme change (a circle revealed from the pressed button) and design crossfades; a FLIP helper for reordering songs; animated removal; sticker pop/lift; tab indicator; toast/dialog enter and exit; motor-like reel spin-up/down. Only `transform`/`opacity` are animated, and `prefers-reduced-motion` turns animations off.
- **Sound** (`lib/sfx.ts`): very quiet sine tones made live with the Web Audio API (no audio files) for add/remove/flip/save/play and "design ready", plus light vibration on phones. Buttons themselves are silent. 🔊/🔇 is stored as `tapie:sound`.
- **About:** the ⓘ button (`components/AboutButton.tsx`) shows the builder's note and `APP_VERSION` from `lib/constants.ts` (keep it in sync with `package.json`).

## 11. Security model

See also the security test cases in `docs/TEST_CASES.md`.

| Threat | Mitigation |
|---|---|
| XSS via user text | React escaping only (no `dangerouslySetInnerHTML`); strict CSP with per-request nonce + `strict-dynamic` (`proxy.ts`) |
| Malicious images | Only `data:image/(png|jpeg|webp|gif);base64,…` accepted (no SVG/HTML); ≤ 1.5 MB each; rendered via `<img>` |
| CSS injection | Colours must be `#rrggbb`; fonts, patterns, papers, styles are enums; numbers are range-checked |
| Unknown / polluted fields | zod strips unknown keys; `__proto__` / `constructor` have no effect |
| Tape takeover | 24-char random edit key (~139 bits); stored as SHA-256; compared in constant time; sent as a header; lives in the URL **hash** so it never reaches servers or `Referer` |
| Enumeration | 10-char random ids (~58 bits) |
| Path traversal | Ids must match `^[A-Za-z0-9]{10}$` before touching the disk |
| Oversized requests | Body streamed and cut at 8 MB (with or without `Content-Length`) |
| Abuse / DoS | Per-IP rate limits; bounded in-memory caches; outbound requests have timeouts and a concurrency of 4 |
| SSRF | Outbound URLs are built only from validated YouTube ids / encoded search terms; hosts are fixed (youtube.com, itunes.apple.com) |
| Clickjacking | `frame-ancestors 'none'` + `X-Frame-Options: DENY` |
| Other headers | `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `COOP: same-origin`, HSTS in production |
| Rate-limit spoofing | `X-Forwarded-For` is trusted only when `TRUST_PROXY=1` or on Vercel, and then the right-most hop is used |
| Concurrent writes | Per-tape promise lock + atomic write (temp file + rename) |

Residual risks:
- Edit keys are remembered in `localStorage` (protected by the CSP).
- The rate limiter is per process (in memory).
- Hiding the YouTube player conflicts with YouTube's embed policy. It's acceptable for a personal project; revisit for a public launch.

## 12. Configuration

| Env var | Default | Meaning |
|---|---|---|
| `DATA_DIR` | `./data` | Where tape JSON files are stored |
| `TRUST_PROXY` | unset | Set to `1` behind a reverse proxy that sets `X-Forwarded-For`, so rate limits are per client. Without it, all clients share one bucket (safe but strict). On Vercel this is automatic. |
| `NODE_ENV` | — | `production` enables HSTS and removes `'unsafe-eval'` from the CSP |

## 13. Deployment

- **Any Node host with a persistent disk** (VPS, Railway or Fly with a volume): `npm ci && npm run build && npm start`, set `DATA_DIR` to the volume, and put it behind HTTPS with `TRUST_PROXY=1`.
- **Serverless hosts (Vercel, Netlify)** have no persistent disk. Replace `lib/store.ts` with a database adapter, keeping its five exported functions (`getCassette`, `canEdit`, `createCassette`, `updateCassette`, `deleteCassette`). Good free options: Supabase Postgres, Turso, Upstash Redis.
- For multiple server instances, move rate limiting to a shared store (e.g. Upstash).

## 14. Testing

`docs/TEST_CASES.md` lists every functional, screen-size and security test case with its last result. The suites were run with a small Chrome DevTools Protocol driver against headless Microsoft Edge:

- **Functional:** the full user journey (search → auto-style → stickers → save → edit link → share page → playback → delete).
- **Screen:** 12 viewports from 320 px phones to 1920 px desktops, every page and editor panel, with automatic checks for horizontal scroll, off-screen elements, overlapping controls, overflowing button text and small touch targets.
- **Security:** an attack script against the API (stored XSS, malicious data URLs, CSS injection, prototype pollution, oversized and chunked bodies, path traversal, wrong keys, header spoofing, SSRF-style links), plus checks of the security headers and of CSP violations during the flows.

Always type-check (`npx tsc --noEmit`) and build (`npm run build`) before committing.

## 15. Known limitations

- **YouTube scraping:** playlist import, search and tag reading parse YouTube's public pages, so a YouTube page change can break them. iTunes is limited to roughly 20 requests/min per server IP (results are cached for 24 h).
- **Mood is an estimate** from genre, tags and artwork. There's no free source of audio "feel".
- **Playlists import up to 100 songs.** YouTube "Mix" (`RD…`) lists can't be imported.
- **Some videos can't be played** because the owner disabled embedding. The player skips them.
