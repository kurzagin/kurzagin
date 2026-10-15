'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface WebringNode {
  id: string;
  name: string;
  url: string;
  badge: string;
  desc: string;
  external?: boolean;
}

const WEBRING_NODES: WebringNode[] = [
  {
    id: 'sakana',
    name: 'Sakana Japanese',
    url: 'https://kurzagin.com/sakana', // Or external/local route
    badge: '/badges/sakana.svg',
    desc: 'Retro Kana Study App',
    external: false,
  },
  {
    id: 'e-teyvat',
    name: 'E-Teyvat',
    url: 'https://e-teyvat.vxnus.xyz',
    badge: '/badges/e-teyvat.svg',
    desc: 'Genshin Impact Knowledge Base',
    external: true,
  },
  {
    id: 'vxnus',
    name: 'VXNUS Studio',
    url: 'https://vxnus.xyz',
    badge: '/badges/vxnus.svg',
    desc: 'Creative Technology Studio',
    external: true,
  },
  {
    id: 'join',
    name: 'Join Webring',
    url: '/guestbook',
    badge: '/badges/join.svg',
    desc: 'Leave your site link in the guestbook',
    external: false,
  },
];

export default function WebringPanel() {
  const [activeNode, setActiveNode] = useState<WebringNode | null>(null);

  // Quick random node navigation (excluding the 'join' button)
  const realSites = WEBRING_NODES.filter((n) => n.id !== 'join');

  const handleRandom = () => {
    const random = realSites[Math.floor(Math.random() * realSites.length)];
    if (random.external) {
      window.open(random.url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = random.url;
    }
  };

  return (
    <div className="sb-section webring-panel" aria-label="Webring federation">
      <div className="sb-title flex items-center justify-between">
        <span>webring</span>
        <span className="text-[10px] font-mono text-[var(--fg-2)]">FEDERATION</span>
      </div>

      <div className="webring-grid" role="list">
        {WEBRING_NODES.map((node) => {
          const isExternal = node.external;
          const linkProps = isExternal
            ? { target: '_blank', rel: 'noopener noreferrer' }
            : {};

          return (
            <a
              key={node.id}
              href={node.url}
              {...linkProps}
              className={`webring-badge-link ${node.id === 'sakana' ? 'badge-sakana' : ''}`}
              title={`${node.name} — ${node.desc}`}
              onMouseEnter={() => setActiveNode(node)}
              onMouseLeave={() => setActiveNode(null)}
              role="listitem"
            >
              <Image
                src={node.badge}
                alt={`${node.name} 80x33 button`}
                width={80}
                height={33}
                className="webring-badge-img"
                unoptimized
              />
            </a>
          );
        })}
      </div>

      {/* Dynamic or default node info ticker */}
      <div className="webring-ticker" aria-live="polite">
        {activeNode ? (
          <>
            <span className="webring-ticker-name">{activeNode.name}</span>
            <span className="webring-ticker-desc">{activeNode.desc}</span>
          </>
        ) : (
          <>
            <span className="webring-ticker-name">indie webring</span>
            <span className="webring-ticker-desc">3 nodes online · click badge to visit</span>
          </>
        )}
      </div>

      {/* Retro Webring Bar Controls */}
      <div className="webring-ctrls">
        <a
          href={realSites[0].url}
          target={realSites[0].external ? '_blank' : undefined}
          rel={realSites[0].external ? 'noopener noreferrer' : undefined}
          className="webring-ctrl-btn"
          title="Previous site"
        >
          ‹ prev
        </a>
        <button
          type="button"
          onClick={handleRandom}
          className="webring-ctrl-btn random-btn"
          title="Random site in ring"
        >
          random
        </button>
        <Link href="/guestbook" className="webring-ctrl-btn join-link" title="Join webring via guestbook">
          + join
        </Link>
        <a
          href={realSites[1].url}
          target={realSites[1].external ? '_blank' : undefined}
          rel={realSites[1].external ? 'noopener noreferrer' : undefined}
          className="webring-ctrl-btn"
          title="Next site"
        >
          next ›
        </a>
      </div>
    </div>
  );
}
