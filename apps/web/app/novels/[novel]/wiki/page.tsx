import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Library, ArrowLeft, Users, Shield, Cpu, History, Globe, Sparkles, Skull, ChevronRight } from 'lucide-react';
import { getLoreCategories } from '@/lib/lore';
import { getNovelBySlug } from '@/lib/novels';
import SpoilerGate from '@/components/novels/SpoilerGate';

interface Props {
  params: Promise<{ novel: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { novel } = await params;
  return { title: `wiki & lore — ${novel} — kurzagin` };
}

export default async function NovelWikiPage({ params }: Props) {
  const { novel } = await params;
  const novelData = getNovelBySlug(novel);

  if (!novelData) {
    notFound();
  }

  const categories = getLoreCategories(novel);

  const iconMap: Record<string, any> = {
    overview: Globe,
    characters: Users,
    factions: Shield,
    technology: Cpu,
    timeline: History,
    races: Sparkles,
    bestiary: Skull,
  };

  return (
    <SpoilerGate novel={novel}>
      <div className="page-header">
        <div style={{ marginBottom: '12px' }}>
          <Link
            href={`/novels/${novel}`}
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
            <ArrowLeft size={12} /> back to {novelData.title}
          </Link>
        </div>
        <h1><span className="hl">wiki</span> & lore codex</h1>
        <div className="page-sub">
          <span className="jp-label">設定資料</span> — tactical codex, world bible & archive dossiers
        </div>
      </div>

      <section className="section">
        {/* Classified Banner */}
        <div
          className="bracket-card "
          style={{
            padding: '16px 20px',
            marginBottom: '24px',
            background: 'var(--bg-1)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Library size={18} style={{ color: 'var(--accent)' }} />
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-1)' }}>
                {novelData.title} World Codex
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                Declassified lore entries, personnel files, and tech specifications
              </div>
            </div>
          </div>
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: '0.7rem',
              padding: '3px 8px',
              background: 'var(--bg-2)',
              borderRadius: '4px',
              color: 'var(--text-3)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {novelData.stats?.wikiCount || 0} Total Dossiers
          </span>
        </div>

        {/* Categories Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }} className="">
          {categories.map((cat) => {
            const Icon = iconMap[cat.id] || Library;
            return (
              <Link
                key={cat.id}
                href={`/novels/${novel}/wiki/${cat.id}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '20px',
                  background: 'var(--bg-1)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'border-color 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'var(--bg-2)',
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
                    {cat.count} files
                  </span>
                </div>

                <h3 style={{ fontSize: '1rem', margin: '0 0 6px', color: 'var(--text-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {cat.label}
                  <ChevronRight size={14} style={{ color: 'var(--text-3)' }} />
                </h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-3)', lineHeight: 1.5 }}>
                  {cat.description}
                </p>
              </Link>
            );
          })}
        </div>
      </section>
    </SpoilerGate>
  );
}
