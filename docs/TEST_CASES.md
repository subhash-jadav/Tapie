# Tapie — Test Cases & Results

Test plan and results for tapie: functional, screen-size (responsive) and security tests.

| | |
|---|---|
| **Build tested** | Production build (`npm run build && npm start`) with the full security configuration (CSP, headers) |
| **Date** | 31 Oct 2026 |
| **Browser** | Microsoft Edge (Chromium) headless, driven via the Chrome DevTools Protocol |
| **Result** | **Functional 54/54 pass · Screen 276/276 views clean · Security 37/37 pass** |

Legend: ✅ pass · ❌ fail · 🔧 failed first, bug fixed, re-tested and passing.

---

## 1. Functional test cases

Each case was run end-to-end in a real browser against the production build.

### 1.1 Home & create

| ID | Test case | Steps | Expected result | Result |
|---|---|---|---|---|
| F01 | Home page loads | Open `/` | Headline "Make someone a mixtape." and "Start your mixtape" button visible | ✅ |
| F02 | Start a tape | Click "Start your mixtape" | Navigates to `/create` | ✅ |
| F03 | Reject non-YouTube link | Paste `https://example.com/not-youtube`, click Fetch | Message "That doesn't look like a YouTube link." | ✅ |
| F04 | Search by song name | Type "arctic monkeys do i wanna know" | Result list with thumbnails and "+ Add" buttons appears | ✅ |
| F05 | Add a search result | Click "+ Add" on a result | Editor opens with the song on the tape | ✅ |
| F06 | Automatic mood styling | After the first song is added | Vibe chip shows a generated mood (e.g. "moody · mellow · balanced") and the design is applied | ✅ |

### 1.2 Songs

| ID | Test case | Steps | Expected result | Result |
|---|---|---|---|---|
| F07 | Import a whole playlist | Songs tab → paste a 100-song playlist link → Add | "Added 99 songs · 1 didn't fit (max 100)" | ✅ |
| F08 | Duplicate detection | Paste a link of a song already on the tape | "… already on the tape", nothing added twice | ✅ |
| F09 | Remove a song | Click ✕ on a song | Song count decreases by 1 | ✅ |
| F10 | Reorder songs | Click ▲ on the 2nd song | It becomes the 1st song | ✅ |
| F11 | Move a song to the other side | Click "→B" | Song appears under SIDE B | ✅ |

### 1.3 Decorating

| ID | Test case | Steps | Expected result | Result |
|---|---|---|---|---|
| F12 | Add a sticker | Stickers tab → click ⭐ | Sticker appears on the current surface, selected | ✅ |
| F13 | Drag a sticker | Drag it 120 px left, 40 px up | Sticker moves exactly with the pointer | ✅ |
| F14 | Resize & rotate | Drag the ↻ handle outward | Sticker grows (and rotates with the angle) | ✅ |
| F15 | Delete with keyboard | Press Delete while selected | Sticker removed | ✅ |
| F16 | Add text | Text tab → type "hello friend" → Add text | Text sticker appears in the chosen font/style | ✅ |
| F17 | Add a photo | Photos tab → upload an image | Image is compressed and shown as a polaroid | ✅ |
| F18 | Shuffle | Click 🎲 Shuffle | A different design is generated (same mood) | ✅ |
| F19 | Undo restyle | After Shuffle | Toast with an "Undo" button appears | ✅ |
| F20 | Steer the mood | Vibe menu → Retro | Mood changes to "bright · vintage · warm" and the design follows | ✅ |
| F21 | Song-art cover | Vibe menu → Song collage | A 2×2 collage of song art becomes the cover photo | ✅ |
| F22 | Flip to the inside | Click "Case · Inside" | Inside card with note and SIDE A / SIDE B tracklist | ✅ |
| F23 | Note fields | Inside tab → To "Priya", message | Inside card shows "Dear Priya," and the message | ✅ |

### 1.4 Saving, links & editing

| ID | Test case | Steps | Expected result | Result |
|---|---|---|---|---|
| F24 | Save & share | Click "Save & share" | Dialog "Your mixtape is ready!" with share link and secret edit link | ✅ |
| F25 | Edit URL | After saving | Address bar becomes `/edit/<10-char id>#<24-char key>` | ✅ |
| F26 | Re-open with edit link | Open the edit link in a new tab | Editor loads the saved tape | ✅ |
| F27 | Wrong edit key | Open `/edit/<id>#wrongkey` (fresh browser) | "This edit link isn't valid", with a "Listen to it" option | ✅ |
| F37 | "Your tapes" list | Open the home page after saving | Tape listed under "Your tapes" with Play / Edit | ✅ |
| F38 | Draft restore | Add a song on `/create`, reload (accept "leave site?") | Banner "We restored your unsaved mixtape" and the songs are back | 🔧 |
| F39 | Start over | Click "Start over" on the banner | Draft cleared, back to "What's on the tape?" | ✅ |
| F40 | Delete | Delete the tape with its key | Share link returns 404 | ✅ |
| F41 | 404 page | Open an unknown URL | Custom "This mixtape got lost" page | ✅ |

### 1.5 Share page & player

| ID | Test case | Steps | Expected result | Result |
|---|---|---|---|---|
| F28 | Share page | Open `/c/<id>` | Title, from/to, case, tape and tracklist shown | ✅ |
| F29 | Open the case | Click "Open the case" | Case flips to the inside (note + tracklist) | ✅ |
| F30 | Player loads | Wait for the player | Play button becomes enabled (YouTube API loaded under the CSP) | ✅ |
| F31 | Play | Click ▶ | Music plays; button becomes ❚❚; reels spin | ✅ |
| F32 | Hidden video | While playing | YouTube video invisible (opacity 0) | ✅ |
| F33 | Next track | Click ⏭ | Screen shows "· 02/" | ✅ |
| F34 | Side switch | Click B on the A/B switch | Screen shows "SIDE B"; tape flips to side B | ✅ |
| F35 | Show video | Click 📺 | Video appears and the music keeps playing | ✅ |
| F36 | Pause | Click ❚❚ | Playback pauses | ✅ |

### 1.6 Whole-run checks

| ID | Check | Expected | Result |
|---|---|---|---|
| S-CSP | Content-Security-Policy violations during all flows | none | ✅ (0) |
| S-JS | JavaScript errors during all flows | none | ✅ (0) |

### 1.7 Themes (dark mode & random palettes)

| ID | Test case | Steps | Expected result | Result |
|---|---|---|---|---|
| T01 | Dark mode | Home → click ☾ | Whole UI switches to the dark (espresso) theme; button turns into ☀ | ✅ |
| T02 | Light mode | Click ☀ | Back to the light theme | ✅ |
| T03 | Random theme | Click 🎲 | A curated palette (e.g. "Sage", "Midnight plum") is applied and its name is shown briefly | ✅ |
| T04 | Theme is remembered | Pick a theme, reload / open another page | Same theme, no flash of the wrong colours on load | ✅ |
| T05 | System preference | First visit with the OS in dark mode | Site opens in dark mode | ✅ |
| T06 | Editor in dark mode | Open the editor with dark theme | Panels, inputs, chips and buttons readable; cassette art unchanged | ✅ |
| T07 | Shared tape default | Open a share link with any theme set | The creator's backdrop and design are shown | 🔧 |
| T08 | Theme on shared tape | Share page → ☾ or 🎲 | Page, panels, tracklist and player switch theme; cassette art (cover, tape, inside) stays as designed | ✅ |
| T09 | Original look | After switching on a share page, click ↺ | Creator's backdrop returns; choice remembered across reloads | ✅ |
| T10 | Player in dark themes | Share page in a dark theme | Charcoal player with amber screen; all labels readable | 🔧 |
| T11 | Button contrast | Primary (orange) buttons in every theme | Text readable on the accent colour | 🔧 |

### 1.8 Vibe engine checks (API level)

| ID | Input | Expected | Result |
|---|---|---|---|
| V01 | Same artist, different genres: Taylor Swift *Shake It Off* / *Love Story* / *cardigan* | Three different moods (Pop / Country / Alternative) | ✅ |
| V02 | Whole playlist (100 songs) | 10 songs sampled across the playlist; mood is their blend | ✅ |
| V03 | Lo-fi filed as "Hip-Hop/Rap" by the store (Lofi Girl) | Read as lo-fi (mellow), not hip-hop | 🔧 |
| V04 | Old song, re-release date (ABBA) | Real era ("'70s"), vintage mood | 🔧 |
| V05 | Artist not on any list (Central Cee, Bad Bunny, Slipknot, The Marías) | Mood from genre, tags and artwork | ✅ |

---

## 2. Screen-size (responsive) test cases

**Method.** Every view below was opened on each of the 12 viewports, and these checks ran automatically in the page:

| Check | Fails when |
|---|---|
| Horizontal scroll | the page is wider than the screen |
| Off-screen content | a visible element sticks out of the screen and isn't inside a clipping/scrolling container |
| Overlapping controls | two buttons/links overlap by more than 3 px (measured on their *visible* area) |
| Text overflow | a button's label doesn't fit inside it |
| Touch targets (phones/tablets) | a button or link is smaller than 24 × 24 px |

Screenshots were also reviewed manually for the 320, 360, 390, 768 and 1280 px widths.

### 2.1 Viewports

| Device class | Viewport | Touch |
|---|---|---|
| iPhone SE (1st gen) | 320 × 568 | ✓ |
| Galaxy S | 360 × 740 | ✓ |
| iPhone 8 | 375 × 667 | ✓ |
| iPhone 14 | 390 × 844 | ✓ |
| Pixel 7 | 412 × 915 | ✓ |
| iPhone Pro Max | 430 × 932 | ✓ |
| iPad mini | 768 × 1024 | ✓ |
| iPad Air | 820 × 1180 | ✓ |
| Tablet landscape | 1024 × 768 | ✓ |
| Laptop | 1280 × 800 | |
| Laptop L | 1440 × 900 | |
| Desktop | 1920 × 1080 | |

### 2.2 Views tested on every viewport (20 × 12 = 240)

| ID | View | Result |
|---|---|---|
| R01 | Home (top) | 🔧 → ✅ |
| R02 | Home (bottom, "Your tapes") | 🔧 → ✅ |
| R03 | Create start (search box) | ✅ |
| R04 | Editor: Tape panel | 🔧 → ✅ |
| R05 | Editor: Songs panel | 🔧 → ✅ |
| R06 | Editor: Cover panel | 🔧 → ✅ |
| R07 | Editor: Inside panel | 🔧 → ✅ |
| R08 | Editor: Stickers panel | 🔧 → ✅ |
| R09 | Editor: Share panel | 🔧 → ✅ |
| R10 | Editor: vibe menu open | 🔧 → ✅ |
| R11 | Editor: sticker selected (toolbar) | 🔧 → ✅ |
| R12 | Editor: case inside | 🔧 → ✅ |
| R13 | Share page, dark backdrop | ✅ |
| R14 | Share page: case open | ✅ |
| R15 | Share page: player | ✅ |
| R16 | Share page: video shown | ✅ |
| R17 | Share page: tracklist | ✅ |
| R18 | Share page, light backdrop | ✅ |
| R19 | Invalid edit link | ✅ |
| R20 | 404 page | ✅ |

### 2.3 Theme views (phone 360, tablet 768, laptop 1280 × dark, random light, random dark = 9 combinations)

| ID | View | Result |
|---|---|---|
| R21 | Home in theme | ✅ |
| R22 | Create start in theme | ✅ |
| R23 | Editor in theme | ✅ |
| R24 | Shared tape (keeps the creator's look) | ✅ |

Totals: 20 views × 12 viewports + 4 views × 9 themed combinations = **276 views**, all clean.

### 2.4 Responsive bugs found and fixed

| # | Found | Where | Fix |
|---|---|---|---|
| 1 | Tilted demo cassette/case stuck out past the left edge; 2–3 px horizontal scroll on 430 px and 1024 px | Home, all phones + tablet landscape | Repositioned the illustration on small screens; page clips stray overflow |
| 2 | Touch targets below 24 px: "skip, decorate first" (20 px tall), "Delete this mixtape" (20 px), "↗ open on YouTube" (9×16 px) | Create, Share panel, share tracklist | Larger tap areas (32 px) |
| 3 | View tabs wrapped onto 2 rows, so the pinned preview used ~60% of a small phone screen | Editor, ≤ 640 px | One row: short labels (Side A / Side B / Cover / Inside) and an icon-only ↻ Flip button on phones |
| 4 | Player title cut to "Die With A Sm…" on 320 px | Share page player | Title scrolls (marquee) whenever it doesn't fit, measured on the actual screen |
| 5 | Search placeholder cut off ("…paste a Yo") on 320 px | Create / Songs | Shorter placeholder "Song name or YouTube link" |
| 6 | Pamphlet PDF printed in the phone layout over 2 pages | `docs/pamphlet.html` | Mobile breakpoint limited to screens; fits one A4 page |
| 7 | Full tape reel overlapped the centre window of the cassette; empty reel looked bare and uneven | Tape art, every size | Max reel size reduced so it stops short of the window; empty reel always shows a ring of tape; narrower centre window |
| 8 | "Remove from your tapes" ✕ was 13 × 24 px | Home, phones/tablets | 32 × 32 px tap area |
| 9 | In dark themes the player's screen frame turned cream and its label vanished | Share page player | Player keeps its own fixed palette in every theme |
| 10 | First tap on ☾ on a shared tape switched to light when the device itself was in dark mode | Share page | Toggle follows what the page actually looks like |

---

## 3. Security test cases

Run against the production build with an attack script (`fetch` from Node) plus header and CSP checks.

### 3.1 Injection & input validation

| ID | Attack | Expected | Result |
|---|---|---|---|
| SEC01 | Stored XSS: `"><script>alert(1)</script><img src=x onerror=…>` in title, from, message, song title and a text sticker | Saved as text; share page HTML contains no executable `<script>` / `onerror` | ✅ |
| SEC02 | Cover photo `javascript:alert(1)` | 400 "Invalid image" | ✅ |
| SEC03 | Cover photo `data:image/svg+xml` (SVG can carry script) | 400 | ✅ |
| SEC04 | Cover photo `data:text/html` | 400 | ✅ |
| SEC05 | Malformed base64 with an injected quote | 400 | ✅ |
| SEC06 | CSS injection in a colour: `red;background:url(//evil)` | 400 "Invalid color" | ✅ |
| SEC07 | CSS injection via the font field | 400 (enum) | ✅ |
| SEC08 | Out-of-range numbers (x = 1e9) | 400 | ✅ |
| SEC09 | Sticker id `../../x` | 400 (pattern) | ✅ |
| SEC10 | Prototype pollution (`__proto__`, `constructor.prototype`) and unknown fields | Unknown keys stripped; no global pollution | ✅ |

### 3.2 Access control & data exposure

| ID | Attack | Expected | Result |
|---|---|---|---|
| SEC11 | PUT without an edit key | 403 | ✅ |
| SEC12 | DELETE with a wrong key | 403 | ✅ |
| SEC13 | Edit key or its hash in the public GET response | Neither present | ✅ |
| SEC14 | Path traversal ids (`..%2F..%2Fpackage`, `....`, 200-char id) | 404, no file access | ✅ |
| SEC15 | Edit key exposure | Key only in the URL **hash** (never sent to servers or `Referer`); stored as SHA-256; constant-time compare | ✅ (code review) |

### 3.3 Abuse / denial of service

| ID | Attack | Expected | Result |
|---|---|---|---|
| SEC16 | 10 MB body with Content-Length | 413 | ✅ |
| SEC17 | 20 MB **chunked** body without Content-Length | 413, upload cut off at 8 MB while streaming | 🔧 |
| SEC18 | Rate-limit bypass by forging `X-Forwarded-For` (25 creates, new fake IP each time) | Limit still enforced | 🔧 (before: 25/25 created · after: 19 blocked) |
| SEC19 | DELETE flooding | Rate limited (30 / 10 min) | 🔧 |
| SEC20 | 1000-character search query | 400 | ✅ |
| SEC21 | Invalid JSON / invalid video ids on `/api/vibe` | 400 | ✅ |

### 3.4 SSRF & link handling

| ID | Attack | Expected | Result |
|---|---|---|---|
| SEC22 | Import `http://169.254.169.254/latest/meta-data` | 422 (not a YouTube link), no request made | ✅ |
| SEC23 | Import `file:///etc/passwd` | 422 | ✅ |
| SEC24 | `https://evil.com/youtube.com/watch?v=…` | 422 | ✅ |
| SEC25 | `https://youtube.com.evil.com/watch?v=…` | 422 | ✅ |

### 3.5 Security headers & browser policy

| ID | Check | Expected | Result |
|---|---|---|---|
| SEC26 | Content-Security-Policy on pages | `script-src 'self' 'nonce-…' 'strict-dynamic'`, no `unsafe-eval` in production, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'` | 🔧 (was missing) |
| SEC27 | Nonce is unique per request | Two requests → different nonces | ✅ |
| SEC28 | Clickjacking | `X-Frame-Options: DENY` + `frame-ancestors 'none'` | 🔧 |
| SEC29 | MIME sniffing | `X-Content-Type-Options: nosniff` on pages **and** API | 🔧 |
| SEC30 | Referrer leakage | `Referrer-Policy: strict-origin-when-cross-origin` | 🔧 |
| SEC31 | Powerful features | `Permissions-Policy` disables camera, microphone, geolocation, payment, USB | 🔧 |
| SEC32 | Window isolation | `Cross-Origin-Opener-Policy: same-origin` | 🔧 |
| SEC33 | HTTPS enforcement | `Strict-Transport-Security` in production | 🔧 |
| SEC34 | Framework fingerprint | No `X-Powered-By` header | ✅ |
| SEC35 | CSP compatibility | All flows (incl. YouTube player, thumbnails, fonts) work with **zero** CSP violations | ✅ |
| SEC36 | Dependencies | `npm audit --omit=dev`: 0 vulnerabilities | ✅ |
| SEC37 | Source scan | No `dangerouslySetInnerHTML`, no `eval`, no control characters in sources | ✅ |

### 3.6 Residual risks (accepted, documented)

| Risk | Why accepted / mitigation |
|---|---|
| Edit keys are kept in `localStorage` ("Your tapes") | Needed without accounts; protected by the strict CSP |
| Rate limits are in memory, per server process | Fine for one server; move to a shared store (e.g. Postgres/Redis) on serverless hosting |
| Without `TRUST_PROXY`, all clients share one rate-limit bucket | Safe default; set `TRUST_PROXY=1` behind a trusted proxy (automatic on Vercel) |
| The YouTube player is hidden | Conflicts with YouTube's embed policy for a public launch; the 📺 toggle reveals it |
| YouTube / iTunes page formats can change | Playlist import, search and mood data would need an update; errors are handled with friendly messages |

---

## 4. How to re-run

1. `npm run build && npm start` (or set `DATA_DIR` to a scratch folder).
2. Run the browser-driven suites (Chrome DevTools Protocol against Edge/Chrome): functional journey, 12-viewport responsive sweep, and the API attack script.
3. `npx tsc --noEmit` and `npm audit --omit=dev`.

Restart the server between suites: rate limits are in memory and the suites deliberately trigger them.
