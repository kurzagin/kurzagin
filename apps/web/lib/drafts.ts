import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';

const NOVELS_DIR = path.resolve(process.cwd(), '../../content/novels');

export interface DraftMetadata {
  title: string;
  volume: number;
  volume_title?: string;
  chapter: number;
  type?: string;
  language?: string;
  summary?: string;
  pov_characters?: string[];
  location?: string;
  timeline_date?: string;
  characters_featured?: string[];
  factions_mentioned?: string[];
  [key: string]: any;
}

export interface DraftEntry {
  slug: string;
  folder: string;
  metadata: DraftMetadata;
  contentHtml: string;
  rawContent: string;
}

export function getNovelDraftDir(novelSlug: string): string {
  return path.join(NOVELS_DIR, novelSlug, 'draft');
}

export function getAllNovelDrafts(novelSlug: string): DraftEntry[] {
  const draftDir = getNovelDraftDir(novelSlug);
  const entries: DraftEntry[] = [];

  if (!fs.existsSync(draftDir)) return entries;

  const items = fs.readdirSync(draftDir, { withFileTypes: true });

  for (const item of items) {
    if (item.isDirectory()) {
      const folderPath = path.join(draftDir, item.name);
      const files = fs
        .readdirSync(folderPath)
        .filter((file) => file.endsWith('.md') && file !== 'index.md');

      for (const file of files) {
        const filePath = path.join(folderPath, file);
        try {
          const fullRawMarkdown = fs.readFileSync(filePath, 'utf-8');
          const { data, content } = matter(fullRawMarkdown);
          const slug = file.replace(/\.md$/, '');

          entries.push({
            slug,
            folder: item.name,
            metadata: {
              title: data.title || slug.replace(/-/g, ' '),
              volume: data.volume || 1,
              chapter: data.chapter ?? (slug === 'prologue' ? 0 : parseInt(slug.replace(/\D/g, ''), 10) || 0),
              type: data.type || (slug === 'prologue' ? 'prologue' : 'chapter'),
              language: data.language || 'en',
              ...data,
            },
            contentHtml: '', // rendered on demand
            rawContent: content,
          });
        } catch (e) {
          console.error(`Error reading draft file ${item.name}/${file}:`, e);
        }
      }
    } else if (item.isFile() && item.name.endsWith('.md') && item.name !== 'index.md') {
      const filePath = path.join(draftDir, item.name);
      try {
        const fullRawMarkdown = fs.readFileSync(filePath, 'utf-8');
        const { data, content } = matter(fullRawMarkdown);
        const slug = item.name.replace(/\.md$/, '');

        entries.push({
          slug,
          folder: 'root',
          metadata: {
            title: data.title || slug.replace(/-/g, ' '),
            volume: data.volume || 1,
            chapter: data.chapter ?? 0,
            type: data.type || 'chapter',
            language: data.language || 'en',
            ...data,
          },
          contentHtml: '',
          rawContent: content,
        });
      } catch (e) {
        console.error(`Error reading draft file ${item.name}:`, e);
      }
    }
  }

  return entries.sort((a, b) => {
    if (a.metadata.volume !== b.metadata.volume) {
      return a.metadata.volume - b.metadata.volume;
    }
    return a.metadata.chapter - b.metadata.chapter;
  });
}

export async function getNovelDraft(novelSlug: string, folder: string, slug: string): Promise<DraftEntry | null> {
  const draftDir = getNovelDraftDir(novelSlug);
  const filePath = folder === 'root'
    ? path.join(draftDir, `${slug}.md`)
    : path.join(draftDir, folder, `${slug}.md`);

  if (!fs.existsSync(filePath)) return null;

  try {
    const fullRawMarkdown = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(fullRawMarkdown);
    const contentHtml = await marked.parse(content);

    return {
      slug,
      folder,
      metadata: {
        title: data.title || slug.replace(/-/g, ' '),
        volume: data.volume || 1,
        chapter: data.chapter ?? (slug === 'prologue' ? 0 : parseInt(slug.replace(/\D/g, ''), 10) || 0),
        type: data.type || (slug === 'prologue' ? 'prologue' : 'chapter'),
        language: data.language || 'en',
        ...data,
      },
      contentHtml,
      rawContent: content,
    };
  } catch {
    return null;
  }
}
