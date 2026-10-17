import { getAllNovels } from '@/lib/novels';
import { getAllShortStories } from '@/lib/shortStories';
import NovelsHubClient from './NovelsHubClient';

export const metadata = { title: 'novels & stories — kurzagin' };

export default function NovelsPage() {
  const novelsList = getAllNovels();
  const shortStoriesList = getAllShortStories();

  return <NovelsHubClient novels={novelsList} shortStories={shortStoriesList} />;
}
