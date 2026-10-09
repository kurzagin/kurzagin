import Link from 'next/link';
import { Gamepad2 } from 'lucide-react';
import { desc } from 'drizzle-orm';
import { getDb, games, type Game } from '@/lib/db';
import { getServerSession } from '@/lib/serverSession';
import GamesClient from './GamesClient';

export const metadata = { title: 'games — kurzagin' };

export default async function GamesPage() {
  const authenticated = (await getServerSession()) !== null;
  const db = getDb();
  let gamesList: Game[] = [];
  if (db) { try { gamesList = await db.select().from(games).orderBy(desc(games.updated_at)); } catch {} }
  return (
    <>
      <div className="page-header">
        <h1><span className="hl">games</span> log</h1>
        <div className="page-sub"><span className="jp-label">ゲーム</span> — games I am actually documenting</div>
        <GamesClient authenticated={authenticated} />
      </div>

      <section className="section">
        {gamesList.length === 0 ? (
          <div className="bracket-card empty-state reveal">
            <div className="empty-state-glyph"><Gamepad2 size={36} /></div>
            <div className="empty-state-title">NO GAMES LOGGED</div>
            <p className="empty-state-desc">
              This is not a backlog. A game appears here when there is a story, progress, or ongoing record worth keeping.
            </p>
            <span className="empty-state-meta">// status: idle — awaiting operator session</span>
          </div>
        ) : (
          <div className="cards-grid reveal">
            {gamesList.map((item) => {
              const meta = item.meta || {};
              return <Link href={`/games/${item.slug}`} className="item-card" key={item.id}>
                <div className="card-visual">{item.cover_url ? <img src={item.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Gamepad2 size={28} />}
                </div>
                <div className="card-body">
                  <div className={`card-tag ${meta.status || 'active'}`}>{meta.status || 'active'}</div>
                  <h3 className="card-title">{item.title}</h3>
                  {item.summary && <p className="card-desc">{item.summary}</p>}
                  <div className="card-meta"><span>{meta.platform || 'personal archive'}</span><span>{meta.progress || 'open log'}</span></div>
                </div>
              </Link>;
            })}
          </div>
        )}
      </section>
    </>
  );
}
