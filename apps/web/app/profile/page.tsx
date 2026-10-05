import { connection } from 'next/server';
import { getProfile } from '@/lib/db';
import { getServerSession } from '@/lib/serverSession';
import ProfileClient from './ProfileClient';

export async function generateMetadata() {
  const profile = await getProfile();
  return {
    title: `${profile.name} — profile — kurzagin.log`,
  };
}

export default async function ProfilePage() {
  await connection();
  const session = await getServerSession();
  const authenticated = session !== null;
  const profile = await getProfile();

  return (
    <ProfileClient
      profile={JSON.parse(JSON.stringify(profile))}
      authenticated={authenticated}
      session={session}
    />
  );
}
