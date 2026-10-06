import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, FileText, ChevronRight, Shield, Tag } from 'lucide-react';
import { getLoreEntriesByCategory } from '@/lib/lore';
import { getNovelBySlug } from '@/lib/novels';
import SpoilerGate from '@/components/novels/SpoilerGate';

interface Props {
  params: Promise<{ novel: string; category: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { novel, category } = await params;
  return { title: `${category} — wiki — ${novel} — kurzagin` };
}

export default async function NovelWikiCategoryPage({ params }: Props) {
  const { novel, category } = await params;
  const novelData = getNovelBySlug(novel);
  if (!novelData) notFound();

  const entries = getLoreEntriesByCategory(novel, category);

  return (
    <SpoilerGate novel={novel}>
      <div className="page-header">
        <div style={{ marginBottom: '12px' }}>
          <Link
            href={`/novels/${novel}/wiki`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'var(--mono)',
              fontSize: '0.75rem',
              color: 'var(--text-3)',
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={12} /> back to {novelData.title} codex
          </Link>
        </div>
        <h1>
          <span className="hl">{category}</span> dossiers
        </h1>
        <div className="page-sub">
          <span className="jp-label">分類</span> — {entries.length} documents archived in this category
        </div>
      </div>

      <section className="section">
        {entries.length === 0 ? (
          <div className="bracket-card empty-state reveal">
            <div className="empty-state-glyph"><FileText size={36} /></div>
            <div className="empty-state-title">NO ENTRIES FOUND</div>
            <p className="empty-state-desc">
              No files archived under {category} yet.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }} className="reveal">
            {entries.map((entry) => (
              <Link
                key={entry.slug}
                href={`/novels/${novel}/wiki/${category}/${entry.slug}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '18px',
                  background: 'var(--bg-1)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'border-color 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '0.65rem',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      background: 'var(--bg-2)',
                      color: entry.security_level === 'TOP_SECRET' ? '#ef4444' : 'var(--text-3)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    {entry.security_level || 'UNCLASSIFIED'}
                  </span>

                  {entry.faction && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--accent)', fontFamily: 'var(--mono)' }}>
                      {entry.faction}
                    </span>
                  )}
                </div>

                <h3 style={{ fontSize: '1rem', margin: '0 0 6px', color: 'var(--text-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {entry.title}
                  <ChevronRight size={14} style={{ color: 'var(--text-3)' }} />
                </h3>

                {entry.summary && (
                  <p style={{ margin: '0 0 12px', fontSize: '0.78rem', color: 'var(--text-3)', lineHeight: 1.5, flex: 1 }}>
                    {entry.summary}
                  </p>
                )}

                {entry.tags && entry.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: 'auto' }}>
                    {entry.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: '0.65rem',
                          fontFamily: 'var(--mono)',
                          color: 'var(--text-3)',
                          opacity: 0.8,
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </SpoilerGate>
  );
}
