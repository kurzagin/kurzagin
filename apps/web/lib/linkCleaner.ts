// List of common universal tracking / analytics query params to remove
const TRACKING_PARAMS = new Set([
  // Google / Marketing
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'utm_name',
  'utm_cid',
  'utm_reader',
  'utm_viz_id',
  'utm_pubreferrer',
  'gclid',
  'gclsrc',
  'dclid',
  'wbraid',
  'gbraid',
  'gad_source',

  // Meta / Facebook / Instagram
  'fbclid',
  'fbadid',
  'fb_action_ids',
  'fb_action_types',
  'fb_source',
  'fb_ref',
  'igsh',
  'igshid',

  // Twitter / X
  'twclid',
  's', // Twitter / X share tracking param (e.g. ?s=19, ?s=20)
  't', // Twitter / X timestamp tracking or share token
  'a', // Twitter / X affiliate / share campaign token
  'ref_src',
  'ref_url',
  'cn',

  // TikTok / ByteDance
  'tt_medium',
  'tt_content',
  '_r',

  // Spotify / Music
  'si', // Spotify share identifier

  // YouTube
  'si', // YouTube share tracker
  'feature', // YouTube referer tag (e.g. youtu.be/xxx?feature=shared)
  'pp', // YouTube watch tracking

  // Microsoft / Bing / LinkedIn
  'msclkid',
  'li_fat_id',

  // Affiliate & E-commerce general
  'tag',
  'ascsubtag',
  'ref',
  'ref_',
  'referrer',
  '_ga',
  '_gl',
  'mc_cid',
  'mc_eid',
  'mkt_tok',
  'zanpid',
  'wickedid',
  'yclid',
  'rb_clickid',
  'sc_cid',
]);

export interface CleanUrlResult {
  original: string;
  cleaned: string;
  removedParams: string[];
  protocolChanged?: boolean;
  notes?: string[];
  error?: string;
}

export function cleanUrl(rawInput: string): CleanUrlResult {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      original: '',
      cleaned: '',
      removedParams: [],
      error: 'Please enter a URL to clean.',
    };
  }

  // Prepend protocol if missing
  let candidate = trimmed;
  let addedProtocol = false;
  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(candidate)) {
    candidate = 'https://' + candidate;
    addedProtocol = true;
  }

  try {
    const url = new URL(candidate);
    const removedParams: string[] = [];
    const notes: string[] = [];

    // Special handlers for specific platforms

    // 1. Amazon: clean down to amazon.com/dp/ASIN or /gp/product/ASIN
    if (url.hostname.includes('amazon.')) {
      const dpMatch = url.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
      if (dpMatch) {
        url.pathname = `/dp/${dpMatch[1]}`;
        notes.push('Amazon canonical product path isolated');
      }
    }

    // 2. AliExpress: isolate item/id.html
    if (url.hostname.includes('aliexpress.')) {
      const aliMatch = url.pathname.match(/\/item\/(\d+)\.html/);
      if (aliMatch) {
        url.pathname = `/item/${aliMatch[1]}.html`;
        notes.push('AliExpress clean item link isolated');
      }
    }

    // 3. Twitter / X: strip status query params completely unless they are intentional search queries
    if (url.hostname === 'twitter.com' || url.hostname === 'x.com' || url.hostname.endsWith('.x.com')) {
      if (url.pathname.includes('/status/')) {
        const xKeys = Array.from(url.searchParams.keys());
        for (const k of xKeys) {
          // Twitter status URLs almost exclusively have tracking params like s, t, a, ref_src, etc.
          const lower = k.toLowerCase();
          if (['s', 't', 'a', 'ref_src', 'ref_url', 'cn', 'mx'].includes(lower) || lower.startsWith('utm_') || TRACKING_PARAMS.has(lower)) {
            removedParams.push(k);
            url.searchParams.delete(k);
          }
        }
      }
    }

    // Process Search Params
    const keys = Array.from(url.searchParams.keys());
    for (const key of keys) {
      const lowerKey = key.toLowerCase();
      if (TRACKING_PARAMS.has(lowerKey) || lowerKey.startsWith('utm_')) {
        removedParams.push(key);
        url.searchParams.delete(key);
      }
    }

    // Remove empty trailing question mark if params are empty
    let cleanedResult = url.toString();

    // If user originally provided without trailing slash and no pathname, strip trailing slash if safe
    if (!trimmed.endsWith('/') && url.pathname === '/' && !url.search && !url.hash) {
      cleanedResult = cleanedResult.replace(/\/$/, '');
    }

    if (addedProtocol && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      notes.push('Added default https:// scheme');
    }

    return {
      original: trimmed,
      cleaned: cleanedResult,
      removedParams,
      notes: notes.length > 0 ? notes : undefined,
    };
  } catch {
    return {
      original: trimmed,
      cleaned: '',
      removedParams: [],
      error: 'Invalid URL format. Please check the input.',
    };
  }
}
