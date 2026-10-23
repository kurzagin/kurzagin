import { notFound } from 'next/navigation';
import { getNovelBySlug } from '@/lib/novels';
import HeartOfEaVN from './HeartOfEaVN';

interface PlayPageProps {
  params: Promise<{ novel: string }>;
}

export async function generateMetadata({ params }: PlayPageProps) {
  const { novel } = await params;
  const data = getNovelBySlug(novel);
  return {
    title: `Visual Novel: ${data?.title || novel} — kurzagin`,
    description: 'Read-only kinetic visual novel interface.',
  };
}

export default async function PlayPage({ params }: PlayPageProps) {
  const { novel } = await params;
  const novelData = getNovelBySlug(novel);

  if (!novelData) {
    notFound();
  }

  return (
    <div style={{ paddingTop: '16px', paddingBottom: '40px' }}>
      <HeartOfEaVN />
    </div>
  );
}
