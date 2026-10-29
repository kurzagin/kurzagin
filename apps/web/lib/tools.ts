export interface ToolDefinition {
  slug: string;
  name: string;
  nameJp?: string;
  tagline: string;
  description: string;
  category: 'web' | 'text' | 'security' | 'dev';
  status: 'operational' | 'beta';
  badge?: string;
}

export const TOOLS: ToolDefinition[] = [
  {
    slug: 'link-cleaner',
    name: 'Link Cleaner',
    nameJp: 'リンク整形',
    tagline: 'Strip tracking parameters and clean bloated URLs',
    description: 'Instant privacy utility that strips affiliate tags, UTM analytics, tracking tokens (fbclid, gclid, si, igsh, etc.), and normalizes URLs cleanly in your browser.',
    category: 'web',
    status: 'operational',
    badge: 'Privacy',
  },
];

export function getToolBySlug(slug: string): ToolDefinition | undefined {
  return TOOLS.find((tool) => tool.slug === slug);
}
