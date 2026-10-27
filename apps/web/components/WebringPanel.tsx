'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export interface WebringNode {
  id: string;
  name: string;
  url: string;
  badge: string;
  desc: string;
  external?: boolean;
}

export const WEBRING_MEMBERS: WebringNode[] = [
  {
    id: 'kurzagin',
    name: 'Kur Zagin',
    url: 'https://kurzagin.com',
    badge: '/badges/kurzagin.svg',
    desc: 'Digital Archive & Systems Architecture',
    external: false,
  },
  {
    id: 'sakana',
    name: 'Sakana Japanese',
    url: 'https://sakanajp.site',
    badge: '/badges/sakana.svg',
    desc: 'Retro Kana Study App',
    external: true,
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
];

export default function WebringPanel() {
  const currentSiteId = 'kurzagin';
  const otherSites = WEBRING_MEMBERS.filter((n) => n.id !== currentSiteId);
  const [activeNode, setActiveNode] = useState<WebringNode | null>(null);

  // In ring order: kurzagin -> sakana -> e-teyvat -> vxnus -> kurzagin
  const currentIndex = WEBRING_MEMBERS.findIndex((n) => n.id === currentSiteId);
  const prevNode = WEBRING_MEMBERS[(currentIndex - 1 + WEBRING_MEMBERS.length) % WEBRING_MEMBERS.length];
  const nextNode = WEBRING_MEMBERS[(currentIndex + 1) % WEBRING_MEMBERS.length];

  const handleRandom = () => {
    const random = otherSites[Math.floor(Math.random() * otherSites.length)];
    if (random.external) {
      window.open(random.url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = random.url;
    }
  };

  const displayList = [
    ...otherSites,
    {
      id: 'join',
      name: 'Join Webring',
      url: '/guestbook',
      badge: '/badges/join.svg',
      desc: 'Leave your site link in the guestbook',
      external: false,
    },
  ];

  return (
    <div className="sb-section webring-panel" aria-label="Webring federation">
      <div className="sb-title flex items-center justify-between">
        <span>webring</span>
        <span className="text-[10px] font-mono text-[var(--fg-2)]">FEDERATION</span>
      </div>

      <div className="webring-grid" role="list">
        {displayList.map((node) => {
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
                alt={`${node.name} 88x31 button`}
                width={88}
                height={31}
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
            <span className="webring-ticker-desc">{otherSites.length} nodes connected · click badge to visit</span>
          </>
        )}
      </div>

      {/* Retro Webring Bar Controls */}
      <div className="webring-ctrls">
        <a
          href={prevNode.url}
          target={prevNode.external ? '_blank' : undefined}
          rel={prevNode.external ? 'noopener noreferrer' : undefined}
          className="webring-ctrl-btn"
          title={`Previous site: ${prevNode.name}`}
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
          href={nextNode.url}
          target={nextNode.external ? '_blank' : undefined}
          rel={nextNode.external ? 'noopener noreferrer' : undefined}
          className="webring-ctrl-btn"
          title={`Next site: ${nextNode.name}`}
        >
          next ›
        </a>
      </div>
    </div>
  );
}
