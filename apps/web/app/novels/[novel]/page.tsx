import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BookOpen, Edit3, ScrollText, Library, ArrowLeft, ChevronRight } from 'lucide-react';
import { getNovelBySlug } from '@/lib/novels';

interface NovelProps {
  params: Promise<{ novel: string }>;
}

export async function generateMetadata({ params }: NovelProps) {
  const { novel } = await params;
  const data = getNovelBySlug(novel);
  return {
    title: `${data?.title || novel} — novels — kurzagin`,
  };
}

export default async function NovelOverviewPage({ params }: NovelProps) {
  const { novel } = await params;
  const novelData = getNovelBySlug(novel);

  if (!novelData) {
    notFound();
  }

  const sections = [
    {
      title: 'Story',
      href: `/novels/${novel}/story`,
      desc: 'Official published releases, completed manuscripts, and canonical chapters.',
      icon: ScrollText,
      badge: `${novelData.stats?.storyCount || 0} Releases`,
    },
    {
      title: 'Draft',
      href: `/novels/${novel}/draft`,
      desc: 'Work-in-progress manuscripts, volume drafts, rough cuts, and ongoing revisions.',
      icon: Edit3,
      badge: `${novelData.stats?.draftsCount || 0} Drafts`,
    },
    {
      title: 'Wiki & Lore',
      href: `/novels/${novel}/wiki`,
      desc: 'World bible, character dossiers, faction files, timeline chronicles, and terminology.',
      icon: Library,
      badge: `${novelData.stats?.wikiCount || 0} Entries`,
    },
  ];

  return (
    <>
      <div className="page-header">
        <div style={{ marginBottom: '12px' }}>
          <Link
            href="/novels"
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
            <ArrowLeft size={12} /> back to novels archive
          </Link>
        </div>
        <h1>
          <span className="hl">{novelData.title}</span>{' '}
          {novelData.titleJp && <span style={{ opacity: 0.6, fontSize: '0.7em' }}>{novelData.titleJp}</span>}
        </h1>
        <div className="page-sub">
          <span className="jp-label">目録</span> — {novelData.tagline || 'manuscript hub & tactical archive'}
        </div>
      </div>

      <section className="section">
        {/* Premise / Overview banner */}
        <div
          className="bracket-card "
          style={{
            padding: '24px',
            marginBottom: '24px',
            background: 'var(--bg-1)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-2)', fontFamily: 'var(--mono)', fontSize: '0.8rem', marginBottom: '8px' }}>
            <BookOpen size={16} style={{ color: 'var(--accent)' }} />
            <span>// MASTER PREMISE & STATUS [{novelData.status.toUpperCase()}]</span>
          </div>
          <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
            {novelData.summary}
          </p>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px' }}>
            {novelData.genres.map((g) => (
              <span
                key={g}
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '0.7rem',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: 'var(--bg-2)',
                  color: 'var(--text-3)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                #{g}
              </span>
            ))}
          </div>
        </div>

        {/* Section Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }} className="">
          {sections.map((sec) => {
            const Icon = sec.icon;
            return (
              <Link
                key={sec.title}
                href={sec.href}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '20px',
                  background: 'var(--bg-1)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'var(--bg-2)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      color: 'var(--accent)',
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: '0.7rem',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: 'var(--bg-2)',
                      color: 'var(--text-3)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    {sec.badge}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.05rem', margin: '0 0 8px 0', color: 'var(--text-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {sec.title}
                  <ChevronRight size={14} style={{ color: 'var(--text-3)' }} />
                </h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-3)', lineHeight: 1.5, flex: 1 }}>
                  {sec.desc}
                </p>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
