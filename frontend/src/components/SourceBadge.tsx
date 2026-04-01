'use client';
import { Globe, Send, User, Rss } from 'lucide-react';
import { SourceType } from '@/types';

const SOURCE_META: Record<SourceType, { label: string; color: string; Icon: React.ElementType }> = {
  telegram: { label: 'Telegram', color: '#0088cc', Icon: Send },
  web:      { label: 'Web', color: '#6B7280', Icon: Globe },
  instagram:{ label: 'Instagram', color: '#E1306C', Icon: Globe },
  submitted:{ label: 'Submitted', color: '#059669', Icon: User },
  rss:      { label: 'RSS', color: '#F97316', Icon: Rss },
};

interface Props {
  source_type: SourceType;
  source_name?: string;
  source_url?: string;
  compact?: boolean;
}

export default function SourceBadge({ source_type, source_name, source_url, compact }: Props) {
  const meta = SOURCE_META[source_type] || SOURCE_META.web;
  const { Icon, color, label } = meta;
  const displayName = source_name || label;

  const inner = (
    <span
      className="flex items-center gap-1 text-xs font-medium"
      style={{ color }}
    >
      <Icon className="w-3 h-3 flex-shrink-0" />
      {!compact && <span className="truncate max-w-[120px]">{displayName}</span>}
    </span>
  );

  if (source_url) {
    return (
      <a
        href={source_url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="hover:underline"
      >
        {inner}
      </a>
    );
  }

  return inner;
}
