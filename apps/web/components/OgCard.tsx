'use client';

import React, { useEffect, useState } from 'react';
import { ExternalLink, Globe } from 'lucide-react';
import type { OpenGraphData } from '@/app/api/og/route';

interface OgCardProps {
  url: string;
}

// Client-side cache to share fetched OG data across posts without re-fetching
const clientOgCache = new Map<string, OpenGraphData | null>();
const pendingPromises = new Map<string, Promise<OpenGraphData | null>>();

async function fetchOgData(url: string): Promise<OpenGraphData | null> {
  if (clientOgCache.has(url)) {
    return clientOgCache.get(url) || null;
  }
  if (pendingPromises.has(url)) {
    return pendingPromises.get(url)!;
  }

  const promise = fetch(`/api/og?url=${encodeURIComponent(url)}`)
    .then((res) => {
      if (!res.ok) return null;
      return res.json() as Promise<OpenGraphData>;
    })
    .then((data) => {
      clientOgCache.set(url, data && data.hasOg ? data : null);
      return data && data.hasOg ? data : null;
    })
    .catch(() => {
      clientOgCache.set(url, null);
      return null;
    })
    .finally(() => {
      pendingPromises.delete(url);
    });

  pendingPromises.set(url, promise);
  return promise;
}

export function OgCard({ url }: OgCardProps) {
  const [data, setData] = useState<OpenGraphData | null>(() => {
    return clientOgCache.get(url) || null;
  });
  const [loading, setLoading] = useState<boolean>(() => !clientOgCache.has(url));

  useEffect(() => {
    if (clientOgCache.has(url)) {
      setData(clientOgCache.get(url) || null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    fetchOgData(url).then((res) => {
      if (active) {
        setData(res);
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [url]);

  // If loading or no OG metadata found, render nothing (the URL remains clickable in the text)
  if (loading || !data || !data.hasOg) {
    return null;
  }

  let domain = '';
  try {
    domain = new URL(data.url).hostname.replace(/^www\./, '');
  } catch {
    domain = data.url;
  }

  return (
    <div className="post-og-card-container" onClick={(e) => e.stopPropagation()}>
      <a
        href={data.url}
        target="_blank"
        rel="noopener noreferrer"
        className="post-og-card"
        title={data.title || data.url}
      >
        {data.image && (
          <div className="post-og-card-image-wrap">
            <img
              src={data.image}
              alt={data.title || 'Preview image'}
              className="post-og-card-image"
              loading="lazy"
              onError={(e) => {
                // If the remote image fails to load (hotlink protection/404), hide the image container
                (e.currentTarget.parentElement as HTMLElement)?.classList.add('is-hidden');
              }}
            />
          </div>
        )}
        <div className="post-og-card-content">
          <div className="post-og-card-site">
            <Globe size={11} className="post-og-card-globe" />
            <span className="post-og-card-domain">{data.siteName || domain}</span>
            <ExternalLink size={10} className="post-og-card-external" />
          </div>
          {data.title && <div className="post-og-card-title">{data.title}</div>}
          {data.description && <div className="post-og-card-desc">{data.description}</div>}
        </div>
      </a>
    </div>
  );
}

export function OgCardList({ urls }: { urls: string[] }) {
  if (!urls || urls.length === 0) return null;

  return (
    <div className="post-og-list" onClick={(e) => e.stopPropagation()}>
      {urls.map((url) => (
        <OgCard key={url} url={url} />
      ))}
    </div>
  );
}
