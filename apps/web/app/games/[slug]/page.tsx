import Link from 'next/link';
import { notFound } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { ArrowLeft, Gamepad2 } from 'lucide-react';
import { getDb, games, posts } from '@/lib/db';

export default async function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = getDb();
  if (!db) notFound();
  const game = (await db.select().from(games).where(eq(games.slug, slug)).limit(1))[0];
  if (!game) notFound();
  const logs = await db.select().from(posts).where(eq(posts.game_id, game.id)).orderBy(desc(posts.created_at)).limit(50);
  const meta = game.meta || {};
  return <>
    <div className="page-header">
      <Link href="/games" className="back-link"><ArrowLeft size={13} /> games archive</Link>
      <h1><span className="hl">{game.title}</span> log</h1>
      <div className="page-sub"><span className="jp-label">記録</span> — a personal record, not a completion checklist</div>
    </div>
    <section className="section">
      <div className="bracket-card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
          <div className="empty-state-glyph"><Gamepad2 size={28} /></div>
          <div><div className={`card-tag ${meta.status || 'active'}`}>{meta.status || 'active'}</div><h2>{game.title}</h2><p className="card-desc">{game.summary || 'An ongoing personal game archive.'}</p><div className="card-meta"><span>{meta.platform || 'personal archive'}</span><span>{meta.progress || 'progress unrecorded'}</span></div></div>
        </div>
        {meta.stats?.length ? <div className="card-meta" style={{ marginTop: 20 }}>{meta.stats.map((s) => <span key={s.label}>{s.label}: {s.value}</span>)}</div> : null}
      </div>
      <div className="section-head"><h2>journal</h2><span className="jp-label">日誌</span><div className="line" /></div>
      {logs.length === 0 ? <div className="bracket-card empty-state"><div className="empty-state-title">NO LOGS YET</div><p className="empty-state-desc">Progress, struggles, pulls, puzzles, builds, and discoveries will live here.</p></div> : logs.map((log) => <article className="bracket-card" style={{ padding: 20, marginBottom: 14 }} key={log.id}><div className="card-meta"><span>{new Date(log.created_at).toLocaleDateString()}</span><span>{log.category}</span></div><p style={{ whiteSpace: 'pre-wrap' }}>{log.content}</p><Link href={`/post/${log.id}`} className="card-meta">open transmission →</Link></article>)}
    </section>
  </>;
}
