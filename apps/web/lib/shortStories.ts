import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';

function getShortStoriesDir(): string {
  const candidates = [
    path.resolve(process.cwd(), '../../content/short-stories'),
    path.resolve(process.cwd(), '../content/short-stories'),
    path.resolve(process.cwd(), 'content/short-stories'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

export interface ShortStoryChapter {
  slug: string;
  chapterNumber: number;
  title: string;
  type?: string;
  summary?: string;
  rawContent: string;
  contentHtml: string;
}

export interface ShortStoryMeta {
  slug: string;
  title: string;
  titleJp?: string;
  tagline?: string;
  status: 'planning' | 'in-progress' | 'completed';
  genres: string[];
  summary: string;
  chaptersCount: number;
}

export interface ShortStoryDetail extends ShortStoryMeta {
  chapters: ShortStoryChapter[];
}

export function getAllShortStories(): ShortStoryMeta[] {
  const dir = getShortStoriesDir();
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const stories: ShortStoryMeta[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const storyDir = path.join(dir, entry.name);
      const metaPath = path.join(storyDir, 'story.json');
      let meta: Partial<ShortStoryMeta> = {};

      if (fs.existsSync(metaPath)) {
        try {
          meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        } catch (e) {
          console.error(`Error reading short story meta for ${entry.name}:`, e);
        }
      }

      const chapterFiles = fs
        .readdirSync(storyDir)
        .filter((file) => file.endsWith('.md') && file !== 'README.md');

      stories.push({
        slug: entry.name,
        title: meta.title || entry.name.replace(/-/g, ' '),
        titleJp: meta.titleJp,
        tagline: meta.tagline || '',
        status: meta.status || 'in-progress',
        genres: meta.genres || ['Short Story'],
        summary: meta.summary || '',
        chaptersCount: chapterFiles.length,
      });
    } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md') {
      const filePath = path.join(dir, entry.name);
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const { data } = matter(raw);
        const slug = entry.name.replace(/\.md$/, '');

        stories.push({
          slug,
          title: data.title || slug.replace(/-/g, ' '),
          titleJp: data.titleJp,
          tagline: data.tagline || '',
          status: data.status || 'completed',
          genres: data.genres || ['Short Story'],
          summary: data.summary || '',
          chaptersCount: 1,
        });
      } catch (e) {
        console.error(`Error reading standalone short story file ${entry.name}:`, e);
      }
    }
  }

  return stories;
}

export async function getShortStory(slug: string): Promise<ShortStoryDetail | null> {
  const dir = getShortStoriesDir();
  const storyDir = path.join(dir, slug);
  const standaloneFile = path.join(dir, `${slug}.md`);

  if (fs.existsSync(storyDir) && fs.statSync(storyDir).isDirectory()) {
    const metaPath = path.join(storyDir, 'story.json');
    let meta: Partial<ShortStoryMeta> = {};

    if (fs.existsSync(metaPath)) {
      try {
        meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      } catch (e) {
        console.error(`Error reading story.json for ${slug}:`, e);
      }
    }

    const chapterFiles = fs
      .readdirSync(storyDir)
      .filter((file) => file.endsWith('.md') && file !== 'README.md')
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    const chapters: ShortStoryChapter[] = [];

    for (const file of chapterFiles) {
      const filePath = path.join(storyDir, file);
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const { data, content } = matter(raw);
        const chapterSlug = file.replace(/\.md$/, '');
        const chapterNum =
          typeof data.chapter === 'number'
            ? data.chapter
            : parseInt(chapterSlug.replace(/\D/g, ''), 10) || chapters.length + 1;

        const contentHtml = await marked.parse(content);

        chapters.push({
          slug: chapterSlug,
          chapterNumber: chapterNum,
          title: data.title || (chapterFiles.length === 1 ? meta.title || slug : `Chapter ${chapterNum}`),
          type: data.type || (chapterFiles.length === 1 ? 'one-shot' : 'chapter'),
          summary: data.summary || '',
          rawContent: content,
          contentHtml,
        });
      } catch (e) {
        console.error(`Error reading chapter ${slug}/${file}:`, e);
      }
    }

    chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);

    return {
      slug,
      title: meta.title || slug.replace(/-/g, ' '),
      titleJp: meta.titleJp,
      tagline: meta.tagline || '',
      status: meta.status || 'in-progress',
      genres: meta.genres || ['Short Story'],
      summary: meta.summary || '',
      chaptersCount: chapters.length,
      chapters,
    };
  }

  if (fs.existsSync(standaloneFile) && fs.statSync(standaloneFile).isFile()) {
    try {
      const raw = fs.readFileSync(standaloneFile, 'utf8');
      const { data, content } = matter(raw);
      const contentHtml = await marked.parse(content);

      const chapter: ShortStoryChapter = {
        slug: 'main',
        chapterNumber: 1,
        title: data.title || slug.replace(/-/g, ' '),
        type: data.type || 'one-shot',
        summary: data.summary || '',
        rawContent: content,
        contentHtml,
      };

      return {
        slug,
        title: data.title || slug.replace(/-/g, ' '),
        titleJp: data.titleJp,
        tagline: data.tagline || '',
        status: data.status || 'completed',
        genres: data.genres || ['Short Story'],
        summary: data.summary || '',
        chaptersCount: 1,
        chapters: [chapter],
      };
    } catch {
      return null;
    }
  }

  return null;
}
