'use client';
import React from 'react';
import { Globe, Instagram, User, Rss } from 'lucide-react';
import { SourceType } from '@/types';

// On the public site, we never reveal Telegram as the source.
// We show the actual destination (web/instagram) or nothing.
const SOURCE_META: Record<string, { label: string; color: string; Icon: React.ElementType }> = {
  web:       { label: 'Web', color: '#6B7280', Icon: Globe },
  instagram: { label: 'Instagram', color: '#E1306C', Icon: Instagram },
  submitted: { label: 'Submitted', color: '#059669', Icon: User },
  rss:       { label: 'RSS', color: '#F97316', Icon: Rss },
};

interface Props {
  source_type: SourceType;
  source_name?: string;
  source_url?: string;
  compact?: boolean;
}

export default function SourceBadge({ source_type, source_name, source_url, compact }: Props) {
  // Never show Telegram on the public site
  const displayType = source_type === 'telegram' ? 'web' : source_type;

  // Also hide if the URL is a t.me link
  const isTelegramUrl = source_url?.includes('t.me') || source_url?.includes('telegram');
  if (isTelegramUrl && displayType === 'web') return null;

  const meta = SOURCE_META[displayType] || SOURCE_META.web;
  const { Icon, color, label } = meta;
  const displayName = (!source_name || source_name.startsWith('@')) ? label : source_name;

  const inner = (
    <span className="flex items-center gap-1 text-xs font-medium" style={{ color }}>
      <Icon className="w-3 h-3 flex-shrink-0" />
      {!compact && <span className="truncate max-w-[120px]">{displayName}</span>}
    </span>
  );

  if (source_url && !isTelegramUrl) {
    return (
      <a href={source_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="hover:underline">
        {inner}
      </a>
    );
  }

  return inner;
}
