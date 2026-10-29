import { notFound } from 'next/navigation';
import { getToolBySlug, TOOLS } from '@/lib/tools';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import LinkCleanerClient from './LinkCleanerClient';

interface Props {
  params: Promise<{ toolname: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { toolname } = await params;
  const tool = getToolBySlug(toolname);
  if (!tool) return { title: 'tool not found — kurzagin' };

  return {
    title: `${tool.name.toLowerCase()} — tools — kurzagin`,
    description: tool.description,
  };
}

export async function generateStaticParams() {
  return TOOLS.map((t) => ({ toolname: t.slug }));
}

export default async function ToolDetailPage({ params }: Props) {
  const { toolname } = await params;
  const tool = getToolBySlug(toolname);

  if (!tool) {
    notFound();
  }

  return (
    <>
      <div className="breadcrumb-nav">
        <Link href="/tools" className="breadcrumb-back-link">
          <ChevronLeft size={14} />
          <span>back to tools index</span>
        </Link>
      </div>

      {tool.slug === 'link-cleaner' && <LinkCleanerClient tool={tool} />}
    </>
  );
}
