import { connection } from 'next/server';
import { getServerSession } from '@/lib/serverSession';
import { getNeonAuthConfig } from '@/lib/auth';
import { getProfile } from '@/lib/db';
import SettingsClient from './SettingsClient';

export const metadata = { title: 'settings — kurzagin' };

export default async function SettingsPage() {
  await connection();
  const session = await getServerSession();
  const authenticated = session !== null;
  const { isConfigured } = getNeonAuthConfig();
  const profile = authenticated ? await getProfile() : null;

  return (
    <SettingsClient
      authenticated={authenticated}
      session={session}
      profile={profile ? JSON.parse(JSON.stringify(profile)) : null}
      isConfigured={isConfigured}
    />
  );
}
