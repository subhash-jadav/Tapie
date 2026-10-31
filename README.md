# tapie.

**tapie** lets you make a custom cassette mixtape from YouTube songs, decorate it, and share it with a link.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Production: `npm run build && npm start`.

No API keys or accounts are needed.

## How it works

| Piece | Where |
| --- | --- |
| YouTube import (videos via oEmbed, playlists by reading the public playlist page) | `lib/youtube.ts`, `app/api/youtube` |
| Song search by name (reads the public results page) | `lib/youtube.ts`, `app/api/youtube/search` |
| Dynamic vibe engine: each tape gets mood scores (energy, darkness, warmth, era, tenderness) from per-song genre + year (iTunes), YouTube tags and artwork tone — no artist lists. The design (palette from the song art, fonts, textures, labels, name) is generated from that mood; the 9 vibe names only steer it | `lib/vibes.ts`, `lib/songInfo.ts`, `lib/thumbs.ts`, `app/api/vibe`, `components/editor/VibeBar.tsx` |
| Cassette data + validation (zod) | `lib/schema.ts` |
| Storage: one JSON file per tape in `./data/cassettes` (set `DATA_DIR` to move it) | `lib/store.ts` |
| Create / update / delete API (edit protected by a secret key, stored hashed) | `app/api/cassettes` |
| Tape, cover and inside artwork (designed at 640×400, scaled to fit) | `components/Surfaces.tsx` |
| Draggable / resizable / rotatable stickers, text and photos | `components/Layers.tsx` |
| Editor | `components/editor/*`, `app/create`, `app/edit/[id]` |
| Shared tape page + retro MP3 player (YouTube embed kept hidden for audio, can be shown) | `components/SharedTape.tsx`, `components/RetroPlayer.tsx`, `app/c/[id]` |

- **No accounts.** Saving gives the creator a share link (`/c/<id>`) and a secret edit link (`/edit/<id>#<key>`).
  The browser also remembers edit links under "Your tapes" on the home page.
- **Photos** are resized and compressed in the browser and stored inside the tape's JSON.
- **Rate limits** live in memory per server process (`lib/rateLimit.ts`).

## Deploying

Free hosts like Vercel don't keep files on disk, so `lib/store.ts` needs to be swapped for a
database there (e.g. a free Supabase/Turso/Upstash tier). Only that one file has to change.
Hosts with a persistent disk (a VPS, Railway or Fly volumes) can run the app as is.
