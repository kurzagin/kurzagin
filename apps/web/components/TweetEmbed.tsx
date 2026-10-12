'use client';

import React from 'react';
import { Tweet } from 'react-tweet';

interface TweetEmbedProps {
  id: string;
}

export function TweetEmbed({ id }: TweetEmbedProps) {
  return (
    <div
      className="post-tweet-embed tweet-dark-theme"
      onClick={(e) => {
        // Prevent clicking inside tweet from triggering post card navigation
        e.stopPropagation();
      }}
    >
      <Tweet id={id} />
    </div>
  );
}
