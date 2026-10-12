'use client';

import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    twttr?: {
      widgets: {
        createTweet: (
          tweetId: string,
          element: HTMLElement,
          options?: Record<string, any>
        ) => Promise<HTMLElement | null>;
        load: (element?: HTMLElement) => void;
      };
    };
  }
}

interface TweetEmbedProps {
  id: string;
}

export function TweetEmbed({ id }: TweetEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const render = () => {
      if (isCancelled || !containerRef.current || !window.twttr?.widgets) return;

      containerRef.current.innerHTML = '';
      window.twttr.widgets
        .createTweet(id, containerRef.current, {
          theme: 'dark',
          dnt: true,
          align: 'center',
          conversation: 'none',
        })
        .then((el) => {
          if (!isCancelled) {
            setLoaded(Boolean(el));
          }
        })
        .catch((err) => {
          console.warn('[TweetEmbed] Failed to create tweet:', err);
        });
    };

    if (window.twttr?.widgets) {
      render();
    } else {
      let script = document.getElementById('twitter-wjs') as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.id = 'twitter-wjs';
        script.src = 'https://platform.twitter.com/widgets.js';
        script.async = true;
        document.body.appendChild(script);
      }
      script.addEventListener('load', render);
      return () => {
        isCancelled = true;
        script?.removeEventListener('load', render);
      };
    }

    return () => {
      isCancelled = true;
    };
  }, [id]);

  return (
    <div
      className="post-tweet-embed official-x-embed"
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <div ref={containerRef} className="tweet-widget-container" />
    </div>
  );
}
