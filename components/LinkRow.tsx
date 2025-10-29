'use client';

import { useState } from 'react';
import { Button } from './Button';
import { QRModal } from './QRModal';
import { Copy, ExternalLink, QrCode, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export interface LinkRecord {
  slug: string;
  original_url: string;
  clicks: number;
  created_at: string;
  shortUrl: string;
}

interface LinkRowProps {
  link: LinkRecord;
  onCopy: (url: string) => void;
  onDelete: (slug: string) => Promise<void>;
  qrGenerator: (slug: string) => Promise<string>;
}

export function LinkRow({ link, onCopy, onDelete, qrGenerator }: LinkRowProps) {
  const [qrOpen, setQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleOpenQr = async () => {
    setQrOpen(true);
    if (qrDataUrl) return;
    setLoading(true);
    const dataUrl = await qrGenerator(link.slug);
    setQrDataUrl(dataUrl);
    setLoading(false);
  };

  const handleDelete = async () => {
    await onDelete(link.slug);
  };

  return (
    <article className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">{link.slug}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {link.clicks} clicks
          </span>
        </div>
        <p className="line-clamp-2 break-all text-sm text-slate-600 dark:text-slate-300" title={link.original_url}>
          {link.original_url}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Created {format(new Date(link.created_at), 'PPP p')}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          variant="secondary"
          onClick={() => window.open(link.shortUrl, '_blank', 'noopener')}
          aria-label={`Open ${link.shortUrl}`}
        >
          <ExternalLink className="h-4 w-4" aria-hidden />
          Open
        </Button>
        <Button
          variant="secondary"
          onClick={() => onCopy(link.shortUrl)}
          aria-label={`Copy ${link.shortUrl}`}
        >
          <Copy className="h-4 w-4" aria-hidden />
          Copy
        </Button>
        <Button
          variant="secondary"
          onClick={handleOpenQr}
          aria-label={`View QR code for ${link.slug}`}
        >
          <QrCode className="h-4 w-4" aria-hidden />
          QR
        </Button>
        <Button
          variant="ghost"
          className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40"
          onClick={handleDelete}
          aria-label={`Delete ${link.slug}`}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          Delete
        </Button>
      </div>
      <QRModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        qrDataUrl={loading ? null : qrDataUrl}
        shortUrl={link.shortUrl}
      />
    </article>
  );
}
