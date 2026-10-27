import { NextResponse } from 'next/server';

export interface OpenGraphData {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  hasOg: boolean;
}

// In-memory cache for OG data to reduce redundant outbound requests
const ogCache = new Map<string, { data: OpenGraphData | null; expiresAt: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

function isExcludedOgHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === 'youtube.com' ||
    host.endsWith('.youtube.com') ||
    host === 'youtu.be' ||
    host === 'twitter.com' ||
    host.endsWith('.twitter.com') ||
    host === 'x.com' ||
    host.endsWith('.x.com')
  );
}

function sanitizeUrl(rawUrl: string): string | null {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    const host = parsed.hostname.toLowerCase();
    // Prevent SSRF: block localhost, local IPs, private address ranges
    if (
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) ||
      host.endsWith('.local') ||
      host.endsWith('.internal')
    ) {
      return null;
    }

    // Exclude YouTube and X/Twitter
    if (isExcludedOgHost(host)) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .trim();
}

function extractMeta(html: string, propertyOrName: string): string | null {
  const p = propertyOrName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const r1 = new RegExp('<meta[^>]+(?:property|name)=["\']' + p + '["\'][^>]+content=["\']([^"\']*)["\']', 'i');
  const m1 = html.match(r1);
  if (m1) return decodeHtmlEntities(m1[1]);

  const r2 = new RegExp('<meta[^>]+content=["\']([^"\']*)["\'][^>]+(?:property|name)=["\']' + p + '["\']', 'i');
  const m2 = html.match(r2);
  if (m2) return decodeHtmlEntities(m2[1]);

  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  const validUrl = sanitizeUrl(targetUrl);
  if (!validUrl) {
    return NextResponse.json({
      url: targetUrl,
      title: null,
      description: null,
      image: null,
      siteName: null,
      hasOg: false,
    });
  }

  // Check cache
  const cached = ogCache.get(validUrl);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data);
  }

  try {
    const res = await fetch(validUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 KurzaginBot/1.0',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,ja;q=0.8',
      },
      signal: AbortSignal.timeout(4500),
      redirect: 'follow',
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      const emptyResult: OpenGraphData = {
        url: validUrl,
        title: null,
        description: null,
        image: null,
        siteName: null,
        hasOg: false,
      };
      ogCache.set(validUrl, { data: emptyResult, expiresAt: Date.now() + CACHE_TTL_MS });
      return NextResponse.json(emptyResult);
    }

    // Limit HTML read to 250KB to keep memory low and fast
    const reader = res.body?.getReader();
    let html = '';
    if (reader) {
      const decoder = new TextDecoder('utf-8');
      let bytesRead = 0;
      const maxBytes = 256 * 1024;
      while (bytesRead < maxBytes) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        bytesRead += value.length;
        html += decoder.decode(value, { stream: true });
        // If we found closing head tag, we can stop reading
        if (/<\/head>/i.test(html)) break;
      }
      reader.cancel().catch(() => {});
    } else {
      html = await res.text();
    }

    const ogTitle = extractMeta(html, 'og:title');
    const ogDescription = extractMeta(html, 'og:description');
    let ogImage = extractMeta(html, 'og:image') || extractMeta(html, 'og:image:url');
    const ogSiteName = extractMeta(html, 'og:site_name');

    // Resolve relative og:image URL if needed
    if (ogImage && !ogImage.startsWith('http://') && !ogImage.startsWith('https://')) {
      try {
        ogImage = new URL(ogImage, validUrl).toString();
      } catch {
        ogImage = null;
      }
    }

    // A valid OG preview card must have at least ogTitle, or ogDescription, or ogImage
    const hasOg = Boolean(ogTitle || ogDescription || ogImage);

    // Fallbacks if og:title or og:description are missing but hasOg is true
    let finalTitle = ogTitle;
    if (!finalTitle && hasOg) {
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      if (titleMatch) {
        finalTitle = decodeHtmlEntities(titleMatch[1]);
      }
    }

    let finalDescription = ogDescription;
    if (!finalDescription && hasOg) {
      finalDescription = extractMeta(html, 'description');
    }

    const result: OpenGraphData = {
      url: validUrl,
      title: finalTitle || null,
      description: finalDescription || null,
      image: ogImage || null,
      siteName: ogSiteName || null,
      hasOg,
    };

    ogCache.set(validUrl, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch {
    // If request fails or times out, consider it as no og available
    const failResult: OpenGraphData = {
      url: validUrl,
      title: null,
      description: null,
      image: null,
      siteName: null,
      hasOg: false,
    };
    ogCache.set(validUrl, { data: failResult, expiresAt: Date.now() + 1000 * 60 * 10 }); // 10 min cache for failures
    return NextResponse.json(failResult);
  }
}
