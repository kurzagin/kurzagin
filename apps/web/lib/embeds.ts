export interface EmbedItem {
  type: 'youtube' | 'x';
  id: string;
  originalUrl: string;
  embedUrl?: string;
}

export interface ProcessedPostContent {
  cleanedContent: string;
  embeds: EmbedItem[];
  youtubeVideos: {
    id: string;
    embedUrl: string;
    originalUrl: string;
  }[];
  tweetIds: string[];
  ogUrls: string[];
}

/**
 * Parses time expressions such as "90", "90s", "1m30s", "1h2m3s" into total seconds.
 */
export function parseYouTubeTime(timeStr: string | null): number | null {
  if (!timeStr) return null;
  const trimmed = timeStr.trim();
  if (/^\d+s?$/i.test(trimmed)) {
    return parseInt(trimmed, 10);
  }
  let totalSeconds = 0;
  const hMatch = trimmed.match(/(\d+)h/i);
  const mMatch = trimmed.match(/(\d+)m/i);
  const sMatch = trimmed.match(/(\d+)s/i);
  if (hMatch) totalSeconds += parseInt(hMatch[1], 10) * 3600;
  if (mMatch) totalSeconds += parseInt(mMatch[1], 10) * 60;
  if (sMatch) totalSeconds += parseInt(sMatch[1], 10);
  return totalSeconds > 0 ? totalSeconds : null;
}

/**
 * Regular expression for Twitter / X status URLs:
 * matches https://twitter.com/username/status/1234567890 or https://x.com/username/status/1234567890
 */
const TWEET_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/[a-zA-Z0-9_]{1,15}\/status\/([0-9]+)(?:[^\s<>"'()]*)/gi;

/**
 * Regular expression for YouTube URLs
 */
const YOUTUBE_REGEX = /(?:https?:\/\/)?(?:www\.|m\.|music\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[^\s<>"'()]*)/gi;

/**
 * Checks if a hostname or URL belongs to YouTube or Twitter / X (used for native embeds)
 */
export function isOgExcludedUrl(rawUrl: string): boolean {
  try {
    const fullUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
    const parsed = new URL(fullUrl);
    const host = parsed.hostname.toLowerCase();
    return (
      host === 'youtube.com' ||
      host.endsWith('.youtube.com') ||
      host === 'youtu.be' ||
      host === 'twitter.com' ||
      host.endsWith('.twitter.com') ||
      host === 'x.com' ||
      host.endsWith('.x.com')
    );
  } catch {
    return true;
  }
}

/**
 * Extracts candidate URLs for OpenGraph cards from content (excluding YouTube and X/Twitter)
 */
export function extractOgUrls(content: string): string[] {
  if (!content) return [];
  const URL_REGEX = /https?:\/\/[^\s<>'\"()]+/gi;
  const urls: string[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = URL_REGEX.exec(content)) !== null) {
    let url = match[0];
    while (/[.,;:!?)]$/.test(url)) {
      url = url.slice(0, -1);
    }
    if (!isOgExcludedUrl(url) && !seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
  }

  return urls;
}

/**
 * Processes post content:
 * 1. Extracts all unique YouTube video embeds and X (Twitter) tweet embeds.
 * 2. Strips those URLs from the text body so they render as interactive embeds rather than raw text.
 * 3. Extracts remaining candidate URLs for OpenGraph preview cards.
 */
export function processPostContent(content: string): ProcessedPostContent {
  if (!content) {
    return {
      cleanedContent: '',
      embeds: [],
      youtubeVideos: [],
      tweetIds: [],
      ogUrls: [],
    };
  }

  const youtubeVideos: { id: string; embedUrl: string; originalUrl: string }[] = [];
  const tweetIds: string[] = [];
  const embeds: EmbedItem[] = [];
  const seenYouTube = new Set<string>();
  const seenTweets = new Set<string>();
  const rawUrlsToRemove: string[] = [];

  // Match YouTube URLs
  let ytMatch: RegExpExecArray | null;
  const ytRegex = new RegExp(YOUTUBE_REGEX.source, YOUTUBE_REGEX.flags);
  while ((ytMatch = ytRegex.exec(content)) !== null) {
    const rawUrl = ytMatch[0];
    const videoId = ytMatch[1];

    if (videoId && !seenYouTube.has(videoId)) {
      seenYouTube.add(videoId);

      let startTime: number | null = null;
      try {
        const fullUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
        const parsed = new URL(fullUrl);
        startTime = parseYouTubeTime(parsed.searchParams.get('t') || parsed.searchParams.get('start'));
      } catch {}

      const embedUrl = startTime
        ? `https://www.youtube-nocookie.com/embed/${videoId}?start=${startTime}`
        : `https://www.youtube-nocookie.com/embed/${videoId}`;

      const ytItem = {
        id: videoId,
        embedUrl,
        originalUrl: rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`,
      };
      youtubeVideos.push(ytItem);
      embeds.push({ type: 'youtube', ...ytItem });
    }
    rawUrlsToRemove.push(rawUrl);
  }

  // Match X / Twitter URLs
  let tweetMatch: RegExpExecArray | null;
  const tweetRegex = new RegExp(TWEET_REGEX.source, TWEET_REGEX.flags);
  while ((tweetMatch = tweetRegex.exec(content)) !== null) {
    const rawUrl = tweetMatch[0];
    const tweetId = tweetMatch[1];

    if (tweetId && !seenTweets.has(tweetId)) {
      seenTweets.add(tweetId);
      tweetIds.push(tweetId);
      embeds.push({
        type: 'x',
        id: tweetId,
        originalUrl: rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`,
      });
    }
    rawUrlsToRemove.push(rawUrl);
  }

  // Strip matched URLs from text
  let cleaned = content;
  for (const rawUrl of rawUrlsToRemove) {
    const escaped = rawUrl.replace(/[.*+?^${}()|[\]\/\\]/g, '\\$&');
    const urlPattern = new RegExp('(?:<|\\()?[ \\t]*' + escaped + '[ \\t]*(?:>|\\))?', 'g');
    cleaned = cleaned.replace(urlPattern, '');
  }

  cleaned = cleaned
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Extract non-excluded URLs present in cleaned text for OpenGraph rendering
  const ogUrls = extractOgUrls(cleaned);

  return {
    cleanedContent: cleaned,
    embeds,
    youtubeVideos,
    tweetIds,
    ogUrls,
  };
}

/**
 * Backward-compatible alias for processYouTubePost
 */
export function processYouTubePost(content: string) {
  const { cleanedContent, youtubeVideos } = processPostContent(content);
  return {
    cleanedContent,
    videos: youtubeVideos,
  };
}

/**
 * Formats body text:
 * 1. Escapes HTML entities
 * 2. Formats hashtags as clickable styling tags
 * 3. Formats URLs as clickable links
 */
export function formatBody(text: string): string {
  if (!text) return '';

  let safe = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  safe = safe.replace(
    /(^|\s)#([\w\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]+)/g,
    '$1<span class="tag">#$2</span>'
  );

  return safe.replace(/(https?:\/\/[^\s<>'\"()]+)/g, (url) => {
    let trailing = '';
    while (/[.,;:!?)]$/.test(url) || url.endsWith('&gt;') || url.endsWith('&lt;') || url.endsWith('&amp;')) {
      if (url.endsWith('&gt;')) {
        trailing = '&gt;' + trailing;
        url = url.slice(0, -4);
      } else if (url.endsWith('&lt;')) {
        trailing = '&lt;' + trailing;
        url = url.slice(0, -4);
      } else if (url.endsWith('&amp;')) {
        trailing = '&amp;' + trailing;
        url = url.slice(0, -5);
      } else {
        trailing = url.slice(-1) + trailing;
        url = url.slice(0, -1);
      }
    }
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="post-link" onclick="event.stopPropagation()">${url}</a>${trailing}`;
  });
}
