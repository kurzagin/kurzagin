import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Shield, Calendar, Tag, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { getLoreEntry } from '@/lib/lore';
import { getNovelBySlug } from '@/lib/novels';
import SpoilerGate from '@/components/novels/SpoilerGate';
import CopyMarkdownButton from '@/components/novels/CopyMarkdownButton';
import { isServerAuthenticated } from '@/lib/serverSession';
import { getDb, wikiVisualReferences } from '@/lib/db';
import { and, asc, eq } from 'drizzle-orm';
import WikiVisualReferencePanel from '@/components/novels/WikiVisualReferencePanel';

interface Props {
  params: Promise<{ novel: string; category: string; slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { novel, category, slug } = await params;
  const entry = await getLoreEntry(novel, category, slug);
  return { title: `${entry?.title || slug} — wiki — ${novel} — kurzagin` };
}

export default async function NovelWikiDetailPage({ params }: Props) {
  const { novel, category, slug } = await params;
  const novelData = getNovelBySlug(novel);
  const entry = await getLoreEntry(novel, category, slug);
  const authenticated = await isServerAuthenticated();
  const db = authenticated ? getDb() : null;
  const references = db ? await db.select().from(wikiVisualReferences).where(and(eq(wikiVisualReferences.novel_slug, novel), eq(wikiVisualReferences.category, category), eq(wikiVisualReferences.entry_slug, slug))).orderBy(asc(wikiVisualReferences.created_at)) : [];

  if (!novelData || !entry) notFound();

  return (
    <SpoilerGate novel={novel}>
      <div className="page-header">
        <div className="novel-detail-actions">
          <Link
            href={`/novels/${novel}/wiki/${category}`}
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
            <ArrowLeft size={12} /> back to {category} dossiers
          </Link>
          <CopyMarkdownButton text={`# ${entry.title}\n\n${entry.rawContent.trim()}`} />
        </div>
        <h1>
          <span className="hl">{entry.title}</span>
        </h1>
        <div className="page-sub">
          <span className="jp-label">機密</span> — classified codex entry // {category}
        </div>
      </div>

      <section className="section">
        {authenticated && <WikiVisualReferencePanel novel={novel} category={category} slug={slug} initialItems={references} />}
        {authenticated && entry.visual_reference && (
          <aside
            aria-label="Unofficial visual reference"
            style={{
              marginBottom: '24px',
              padding: '16px',
              background: 'var(--bg-1)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontFamily: 'var(--mono)', fontSize: '0.72rem', color: 'var(--accent)' }}>
              <ImageIcon size={14} />
              VISUAL REFERENCE — UNOFFICIAL / NOT FINAL ARTWORK
            </div>
            <img
              src={entry.visual_reference.url}
              alt={entry.visual_reference.alt || `${entry.title} unofficial visual reference`}
              style={{ display: 'block', width: '100%', maxHeight: '680px', objectFit: 'contain', background: 'var(--bg-2)', borderRadius: '4px' }}
            />
            <p style={{ margin: '12px 0 0', color: 'var(--text-3)', fontSize: '0.78rem', lineHeight: 1.55 }}>
              This image is an interpretive reference for imagination only. It is not official or canonical, and finished artwork may differ.
              {entry.visual_reference.caption && ` ${entry.visual_reference.caption}`}
            </p>
            {entry.visual_reference.source && (
              <p style={{ margin: '8px 0 0', color: 'var(--text-3)', fontFamily: 'var(--mono)', fontSize: '0.68rem' }}>
                SOURCE: {entry.visual_reference.source}
              </p>
            )}
          </aside>
        )}

        {/* Classification Header / Metadata Card */}
        <div
          className="bracket-card "
          style={{
            padding: '20px',
            marginBottom: '24px',
            background: 'var(--bg-1)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '0.72rem',
                  padding: '3px 8px',
                  borderRadius: '3px',
                  background: 'var(--bg-2)',
                  color: entry.security_level === 'TOP_SECRET' ? '#ef4444' : 'var(--accent)',
                  border: '1px solid var(--border-subtle)',
                  fontWeight: 600,
                }}
              >
                LEVEL: {entry.security_level || 'STANDARD'}
              </span>

              {entry.status && (
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: '0.72rem',
                    color: 'var(--text-3)',
                  }}
                >
                  STATUS: {entry.status}
                </span>
              )}
            </div>

            {entry.faction && (
              <div style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem', color: 'var(--text-2)' }}>
                FACTION: <span style={{ color: 'var(--accent)' }}>{entry.faction}</span>
              </div>
            )}
          </div>

          {entry.summary && (
            <p style={{ marginTop: '16px', marginBottom: 0, fontSize: '0.88rem', color: 'var(--text-2)', lineHeight: 1.6, fontStyle: 'italic' }}>
              "{entry.summary}"
            </p>
          )}

          {entry.tags && entry.tags.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '14px' }}>
              {entry.tags.map((t) => (
                <span
                  key={t}
                  style={{
                    fontSize: '0.7rem',
                    fontFamily: 'var(--mono)',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    background: 'var(--bg-2)',
                    color: 'var(--text-3)',
                  }}
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Markdown Rendered Content */}
        <article
          className=" markdown-body"
          style={{
            background: 'var(--bg-1)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            padding: '32px 28px',
            color: 'var(--text-2)',
            lineHeight: 1.8,
            fontSize: '0.95rem',
          }}
          dangerouslySetInnerHTML={{ __html: entry.contentHtml }}
        />
      </section>
    </SpoilerGate>
  );
}
