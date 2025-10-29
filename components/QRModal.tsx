'use client';

import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';

interface QRModalProps {
  open: boolean;
  onClose: () => void;
  qrDataUrl: string | null;
  shortUrl: string;
}

export function QRModal({ open, onClose, qrDataUrl, shortUrl }: QRModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    previouslyFocused.current = document.activeElement;
    const dialog = dialogRef.current;
    dialog?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }

      if (event.key === 'Tab' && dialog) {
        const focusable = dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) {
          event.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused.current instanceof HTMLElement) {
        previouslyFocused.current.focus();
      }
    };
  }, [open, onClose]);

  const handleBackdropClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4"
      onClick={handleBackdropClick}
      aria-modal="true"
      role="dialog"
      aria-labelledby="qr-modal-title"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl focus-ring dark:bg-slate-900"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="qr-modal-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              QR code for {shortUrl}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Scan the code below or download it as a PNG.
            </p>
          </div>
          <Button variant="ghost" aria-label="Close QR code" onClick={onClose}>
            ✕
          </Button>
        </div>
        <div className="mt-6 flex justify-center">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR code for ${shortUrl}`}
              className="h-48 w-48 rounded-xl border border-slate-200 p-4 dark:border-slate-700"
            />
          ) : (
            <p role="status" aria-live="polite" className="text-sm text-slate-500">
              Generating QR code...
            </p>
          )}
        </div>
        {qrDataUrl && (
          <div className="mt-6 flex justify-end">
            <a
              href={qrDataUrl}
              download={`qr-${shortUrl}.png`}
              className="focus-ring inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-400"
            >
              Download PNG
            </a>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
