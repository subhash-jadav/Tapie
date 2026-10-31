// Fetches song info from YouTube without an API key:
//  - single videos via the public oEmbed endpoint
//  - playlists by reading the public playlist page (+ its "load more" endpoint)

export type ImportedTrack = { videoId: string; title: string; artist: string; duration?: number };
export type ImportResult = { kind: "video" | "playlist"; title: string; tracks: ImportedTrack[] };

export class YouTubeError extends Error {}

const MAX_TRACKS = 100;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const HEADERS = { "user-agent": UA, "accept-language": "en-US,en;q=0.9", cookie: "CONSENT=YES+1; SOCS=CAI" };
const VIDEO_ID = /^[\w-]{11}$/;

export function parseYouTubeUrl(input: string): { videoId?: string; listId?: string } | null {
  const raw = input.trim();
  if (VIDEO_ID.test(raw)) return { videoId: raw };
  let url: URL;
  try {
    url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  if (host !== "youtube.com" && host !== "youtu.be" && host !== "youtube-nocookie.com") return null;

  // YouTube Music shares playlists/albums as /browse/VL<listId>.
  const browse = url.pathname.match(/^\/browse\/VL([\w-]{10,64})/);
  const listId = url.searchParams.get("list") || browse?.[1] || undefined;
  let videoId = url.searchParams.get("v") || undefined;
  if (host === "youtu.be") videoId = url.pathname.slice(1).split("/")[0];
  const m = url.pathname.match(/^\/(shorts|embed|live|v)\/([\w-]{11})/);
  if (m) videoId = m[2];

  if (videoId && !VIDEO_ID.test(videoId)) videoId = undefined;
  const cleanList = listId && /^[\w-]{10,64}$/.test(listId) ? listId : undefined;
  if (!videoId && !cleanList) return null;
  return { videoId, listId: cleanList };
}

// "Artist - Song (Official Video)" -> { artist, title }
export function splitTitle(rawTitle: string, channel: string) {
  const title = rawTitle
    .replace(/\s*[([](official|lyrics?|audio|video|music video|hd|hq|4k|visualizer|mv|m\/v)[^)\]]*[)\]]/gi, "")
    .replace(/\s*\|.*$/, "")
    .trim();
  const artistFromChannel = channel.replace(/\s*-\s*Topic$/i, "").replace(/VEVO$/i, "").trim();
  const dash = title.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (dash) return { artist: dash[1].trim(), title: dash[2].trim() };
  return { artist: artistFromChannel, title: title || rawTitle };
}

function parseDuration(text?: string): number | undefined {
  if (!text || !/^\d+(:\d{2}){1,2}$/.test(text)) return undefined;
  return text.split(":").reduce((acc, p) => acc * 60 + Number(p), 0);
}

async function fetchVideo(videoId: string): Promise<ImportedTrack> {
  const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${videoId}`,
  )}`;
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(10_000) });
  if (res.status === 401 || res.status === 403) throw new YouTubeError("That video can't be embedded or is private.");
  if (!res.ok) throw new YouTubeError("Couldn't find that video. Is the link right?");
  const data = (await res.json()) as { title?: string; author_name?: string };
  const { artist, title } = splitTitle(data.title ?? "Untitled", data.author_name ?? "");
  return { videoId, title, artist };
}

type Json = Record<string, unknown>;

function collect(node: unknown, keys: string[], out: [string, Json][]) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const n of node) collect(n, keys, out);
    return;
  }
  for (const [k, v] of Object.entries(node as Json)) {
    if (keys.includes(k) && v && typeof v === "object") out.push([k, v as Json]);
    else collect(v, keys, out);
  }
}

const ITEM_KEYS = ["playlistVideoRenderer", "lockupViewModel", "continuationItemRenderer", "continuationItemViewModel"];

function readItems(data: unknown, keys = ITEM_KEYS): { tracks: ImportedTrack[]; continuation?: string } {
  const found: [string, Json][] = [];
  collect(data, keys, found);
  const tracks: ImportedTrack[] = [];
  let continuation: string | undefined;
  for (const [key, item] of found) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const it = item as any;
    if (key === "playlistVideoRenderer") {
      const rawTitle = it.title?.runs?.[0]?.text ?? it.title?.simpleText;
      if (!VIDEO_ID.test(it.videoId ?? "") || !rawTitle || it.isPlayable === false) continue;
      const channel = it.shortBylineText?.runs?.[0]?.text ?? "";
      const d = Number(it.lengthSeconds);
      tracks.push({ videoId: it.videoId, ...splitTitle(rawTitle, channel), duration: d > 0 ? d : undefined });
    } else if (key === "videoRenderer") {
      const rawTitle = it.title?.runs?.[0]?.text;
      if (!VIDEO_ID.test(it.videoId ?? "") || !rawTitle) continue;
      const channel = it.ownerText?.runs?.[0]?.text ?? it.longBylineText?.runs?.[0]?.text ?? "";
      tracks.push({ videoId: it.videoId, ...splitTitle(rawTitle, channel), duration: parseDuration(it.lengthText?.simpleText) });
    } else if (key === "lockupViewModel") {
      if (it.contentType && it.contentType !== "LOCKUP_CONTENT_TYPE_VIDEO") continue;
      const meta = it.metadata?.lockupMetadataViewModel;
      const rawTitle: string | undefined = meta?.title?.content;
      if (!VIDEO_ID.test(it.contentId ?? "") || !rawTitle) continue;
      if (/^\[(private|deleted) video\]$/i.test(rawTitle)) continue;
      const channel = meta?.metadata?.contentMetadataViewModel?.metadataRows?.[0]?.metadataParts?.[0]?.text?.content ?? "";
      const badges: [string, Json][] = [];
      collect(it.contentImage, ["thumbnailBadgeViewModel"], badges);
      const badgeText = badges.map(([, b]) => b.text as string | undefined).find((t) => parseDuration(t));
      tracks.push({ videoId: it.contentId, ...splitTitle(rawTitle, channel), duration: parseDuration(badgeText) });
    } else {
      const token =
        it.continuationEndpoint?.continuationCommand?.token ??
        it.continuationCommand?.innertubeCommand?.continuationCommand?.token;
      if (token) continuation = token;
    }
  }
  return { tracks, continuation };
}

const cache = new Map<string, { at: number; result: ImportResult }>();
const CACHE_MS = 10 * 60_000;

async function fetchPlaylist(listId: string): Promise<ImportResult> {
  const hit = cache.get(listId);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.result;

  const res = await fetch(`https://www.youtube.com/playlist?list=${listId}&hl=en`, {
    headers: HEADERS,
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new YouTubeError("Couldn't open that playlist.");
  const html = await res.text();
  const m = html.match(/var ytInitialData = (\{.*?\});<\/script>/s);
  if (!m) throw new YouTubeError("Couldn't read that playlist. Is it public?");
  const data = JSON.parse(m[1]);
  const title: string =
    data?.metadata?.playlistMetadataRenderer?.title ??
    data?.header?.playlistHeaderRenderer?.title?.simpleText ??
    "Playlist";

  let { tracks, continuation } = readItems(data);
  const clientVersion = html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/)?.[1];

  // Follow "load more" pages until we have enough songs.
  for (let page = 0; continuation && clientVersion && tracks.length < MAX_TRACKS && page < 3; page++) {
    try {
      const r = await fetch("https://www.youtube.com/youtubei/v1/browse?prettyPrint=false", {
        method: "POST",
        headers: { ...HEADERS, "content-type": "application/json" },
        body: JSON.stringify({ context: { client: { clientName: "WEB", clientVersion, hl: "en" } }, continuation }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!r.ok) break;
      const more = readItems(await r.json());
      tracks = tracks.concat(more.tracks);
      continuation = more.continuation;
    } catch {
      break;
    }
  }

  const seen = new Set<string>();
  tracks = tracks.filter((t) => !seen.has(t.videoId) && seen.add(t.videoId)).slice(0, MAX_TRACKS);
  if (!tracks.length) throw new YouTubeError("That playlist is empty or private.");

  const result: ImportResult = { kind: "playlist", title, tracks };
  cache.set(listId, { at: Date.now(), result });
  if (cache.size > 200) cache.delete(cache.keys().next().value!);
  return result;
}

export async function importFromYouTube(input: string): Promise<ImportResult> {
  const parsed = parseYouTubeUrl(input);
  if (!parsed) throw new YouTubeError("That doesn't look like a YouTube link.");
  const { videoId, listId } = parsed;

  // "RD..." lists are auto-generated mixes that can't be read as playlists.
  if (listId && !listId.startsWith("RD")) {
    try {
      return await fetchPlaylist(listId);
    } catch (e) {
      if (!videoId) throw e;
    }
  }
  if (!videoId) throw new YouTubeError("YouTube Mixes can't be imported. Try a normal playlist.");
  const track = await fetchVideo(videoId);
  return { kind: "video", title: track.title, tracks: [track] };
}

const searchCache = new Map<string, { at: number; tracks: ImportedTrack[] }>();

/** Search YouTube videos by text (reads the public results page, no API key). */
export async function searchYouTube(query: string): Promise<ImportedTrack[]> {
  const q = query.trim().toLowerCase().replace(/\s+/g, " ");
  const hit = searchCache.get(q);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.tracks;

  // sp=EgIQAQ== limits results to videos (no channels, playlists or shorts shelves).
  const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=EgIQAQ%253D%253D&hl=en`, {
    headers: HEADERS,
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new YouTubeError("Search isn't working right now. Try pasting a link.");
  const m = (await res.text()).match(/var ytInitialData = (\{.*?\});<\/script>/s);
  if (!m) throw new YouTubeError("Search isn't working right now. Try pasting a link.");

  const seen = new Set<string>();
  const tracks = readItems(JSON.parse(m[1]), ["videoRenderer", "lockupViewModel"])
    .tracks.filter((t) => !seen.has(t.videoId) && seen.add(t.videoId))
    .slice(0, 12);

  searchCache.set(q, { at: Date.now(), tracks });
  if (searchCache.size > 500) searchCache.delete(searchCache.keys().next().value!);
  return tracks;
}
