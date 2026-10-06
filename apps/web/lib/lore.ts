import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';

const NOVELS_DIR = path.resolve(process.cwd(), '../../content/novels');

export interface LoreCategoryInfo {
  id: string;
  label: string;
  description: string;
  count: number;
}

export interface LoreItem {
  slug: string;
  category: string;
  title: string;
  summary?: string;
  tags?: string[];
  security_level?: string;
  status?: string;
  role?: string;
  faction?: string;
  threat_rank?: string;
  rawContent: string;
  contentHtml: string;
  metadata: Record<string, any>;
}

export function getNovelLoreDir(novelSlug: string): string {
  return path.join(NOVELS_DIR, novelSlug, 'lore');
}

export function getLoreCategories(novelSlug: string): LoreCategoryInfo[] {
  const loreDir = getNovelLoreDir(novelSlug);
  if (!fs.existsSync(loreDir)) return [];

  const entries = fs.readdirSync(loreDir, { withFileTypes: true });
  const categories: LoreCategoryInfo[] = [];

  const categoryLabels: Record<string, { label: string; description: string }> = {
    overview: { label: 'World Overview', description: 'Cosmology, premise, and core world systems.' },
    characters: { label: 'Personnel & Characters', description: 'Commanders, figures, operatives, and profiles.' },
    factions: { label: 'Factions & Powers', description: 'Military coalitions, doctrines, and organizations.' },
    technology: { label: 'Weapons & Tech', description: 'Relics, armaments, prototypes, and equipment.' },
    timeline: { label: 'Chronicles & Timeline', description: 'Historical epochs, turning points, and warfare logs.' },
    races: { label: 'Species & Lineages', description: 'Races, demographics, and biological lineages.' },
    bestiary: { label: 'Threat Bestiary', description: 'Bio-constructs, apex threats, and monsters.' },
  };

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const catSlug = entry.name;
      const catPath = path.join(loreDir, catSlug);
      const files = fs.readdirSync(catPath).filter(f => f.endsWith('.md'));
      const conf = categoryLabels[catSlug] || {
        label: catSlug.charAt(0).toUpperCase() + catSlug.slice(1),
        description: `Archives and dossiers for ${catSlug}.`
      };

      categories.push({
        id: catSlug,
        label: conf.label,
        description: conf.description,
        count: files.length,
      });
    }
  }

  return categories;
}

export function getLoreEntriesByCategory(novelSlug: string, category: string): LoreItem[] {
  const catDir = path.join(getNovelLoreDir(novelSlug), category);
  if (!fs.existsSync(catDir)) return [];

  const files = fs.readdirSync(catDir).filter(f => f.endsWith('.md'));
  const items: LoreItem[] = [];

  for (const file of files) {
    const slug = file.replace(/\.md$/, '');
    const fullPath = path.join(catDir, file);
    try {
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data, content } = matter(fileContents);

      items.push({
        slug,
        category,
        title: data.title || slug.replace(/-/g, ' '),
        summary: data.summary || '',
        tags: data.tags || [],
        security_level: data.security_level,
        status: data.status,
        role: data.role,
        faction: data.faction,
        threat_rank: data.threat_rank,
        rawContent: content,
        contentHtml: '', // parsed on single view
        metadata: data,
      });
    } catch (e) {
      console.error(`Error parsing lore entry ${category}/${file}:`, e);
    }
  }

  return items;
}

export async function getLoreEntry(novelSlug: string, category: string, slug: string): Promise<LoreItem | null> {
  const filePath = path.join(getNovelLoreDir(novelSlug), category, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;

  try {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContents);
    const contentHtml = await marked.parse(content);

    return {
      slug,
      category,
      title: data.title || slug.replace(/-/g, ' '),
      summary: data.summary || '',
      tags: data.tags || [],
      security_level: data.security_level,
      status: data.status,
      role: data.role,
      faction: data.faction,
      threat_rank: data.threat_rank,
      rawContent: content,
      contentHtml,
      metadata: data,
    };
  } catch {
    return null;
  }
}
