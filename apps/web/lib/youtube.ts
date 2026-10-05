export interface YouTubeVideoInfo {
  id: string;
  embedUrl: string;
  originalUrl: string;
}

export interface ProcessedPost {
  cleanedContent: string;
  videos: YouTubeVideoInfo[];
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
 * Processes post content:
 * 1. Extracts all unique YouTube video embeds.
 * 2. Strips the YouTube link from the text so the link does not exist in visible text,
 *    keeping the surrounding text intact.
 */
export function processYouTubePost(content: string): ProcessedPost {
  if (!content) {
    return { cleanedContent: '', videos: [] };
  }

  // Regex to match YouTube URLs (with protocol or schemeless)
  const ytRegex = /(?:https?:\/\/)?(?:www\.|m\.|music\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[^\s<>"'()]*)/gi;

  const videos: YouTubeVideoInfo[] = [];
  const seenIds = new Set<string>();
  const rawMatches: string[] = [];

  let match: RegExpExecArray | null;
  while ((match = ytRegex.exec(content)) !== null) {
    const rawUrl = match[0];
    const videoId = match[1];

    if (videoId && !seenIds.has(videoId)) {
      seenIds.add(videoId);

      let startTime: number | null = null;
      try {
        const fullUrl = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
        const parsed = new URL(fullUrl);
        startTime = parseYouTubeTime(parsed.searchParams.get('t') || parsed.searchParams.get('start'));
      } catch {}

      const embedUrl = startTime
        ? `https://www.youtube-nocookie.com/embed/${videoId}?start=${startTime}`
        : `https://www.youtube-nocookie.com/embed/${videoId}`;

      videos.push({
        id: videoId,
        embedUrl,
        originalUrl: rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`,
      });
    }

    rawMatches.push(rawUrl);
  }

  // Remove the YouTube links from the text so link does not exist in visible text
  let cleaned = content;
  for (const rawUrl of rawMatches) {
    const escaped = rawUrl.replace(/[.*+?^${}()|[\]\/\\]/g, '\\$&');
    // Match optional surrounding brackets like <url> or (url)
    const urlPattern = new RegExp('(?:<|\\()?[ \\t]*' + escaped + '[ \\t]*(?:>|\\))?', 'g');
    cleaned = cleaned.replace(urlPattern, '');
  }

  // Preserve paragraphs and newlines cleanly, removing only trailing/consecutive whitespace
  cleaned = cleaned
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { cleanedContent: cleaned, videos };
}

/**
 * Formats body text:
 * 1. Escapes HTML entities
 * 2. Formats hashtags as clickable styling tags
 * 3. Formats non-YouTube URLs as clickable links
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
