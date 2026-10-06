import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// Root novels directory in the project
const NOVELS_DIR = path.resolve(process.cwd(), '../../content/novels');

export interface NovelMeta {
  slug: string;
  title: string;
  titleJp?: string;
  tagline: string;
  status: 'planning' | 'in-progress' | 'completed' | 'hiatus';
  genres: string[];
  summary: string;
  stats?: {
    draftsCount: number;
    storyCount: number;
    wikiCount: number;
  };
}

export function getAllNovels(): NovelMeta[] {
  if (!fs.existsSync(NOVELS_DIR)) return [];

  const novelDirs = fs.readdirSync(NOVELS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  const novels: NovelMeta[] = [];

  for (const slug of novelDirs) {
    const metaPath = path.join(NOVELS_DIR, slug, 'novel.json');
    if (fs.existsSync(metaPath)) {
      try {
        const raw = fs.readFileSync(metaPath, 'utf8');
        const data = JSON.parse(raw);

        // Count stats
        const draftDir = path.join(NOVELS_DIR, slug, 'draft');
        const storyDir = path.join(NOVELS_DIR, slug, 'story');
        const loreDir = path.join(NOVELS_DIR, slug, 'lore');

        let draftsCount = 0;
        let storyCount = 0;
        let wikiCount = 0;

        if (fs.existsSync(draftDir)) {
          draftsCount = countMarkdownFiles(draftDir);
        }
        if (fs.existsSync(storyDir)) {
          storyCount = countMarkdownFiles(storyDir);
        }
        if (fs.existsSync(loreDir)) {
          wikiCount = countMarkdownFiles(loreDir);
        }

        novels.push({
          ...data,
          slug,
          stats: {
            draftsCount,
            storyCount,
            wikiCount,
          },
        });
      } catch (e) {
        console.error(`Error reading novel metadata for ${slug}:`, e);
      }
    }
  }

  return novels;
}

export function getNovelBySlug(slug: string): NovelMeta | null {
  const metaPath = path.join(NOVELS_DIR, slug, 'novel.json');
  if (!fs.existsSync(metaPath)) return null;

  try {
    const raw = fs.readFileSync(metaPath, 'utf8');
    const data = JSON.parse(raw);

    const draftDir = path.join(NOVELS_DIR, slug, 'draft');
    const storyDir = path.join(NOVELS_DIR, slug, 'story');
    const loreDir = path.join(NOVELS_DIR, slug, 'lore');

    return {
      ...data,
      slug,
      stats: {
        draftsCount: fs.existsSync(draftDir) ? countMarkdownFiles(draftDir) : 0,
        storyCount: fs.existsSync(storyDir) ? countMarkdownFiles(storyDir) : 0,
        wikiCount: fs.existsSync(loreDir) ? countMarkdownFiles(loreDir) : 0,
      },
    };
  } catch {
    return null;
  }
}

function countMarkdownFiles(dir: string): number {
  let count = 0;
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    if (item.isDirectory()) {
      count += countMarkdownFiles(path.join(dir, item.name));
    } else if (item.name.endsWith('.md')) {
      count++;
    }
  }
  return count;
}
