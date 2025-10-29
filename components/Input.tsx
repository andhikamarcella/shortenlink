'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  hint?: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, hint, error, id, ...props }, ref) => {
    const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
      .filter(Boolean)
      .join(' ');

    return (
      <div className="space-y-1">
        <input
          ref={ref}
          id={id}
          aria-describedby={describedBy || undefined}
          aria-invalid={Boolean(error)}
          className={cn(
            'block w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-base text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
            'focus-ring',
            error && 'border-red-500 focus:border-red-500 dark:border-red-500',
            className,
          )}
          {...props}
        />
        {hint && !error && (
          <p id={`${id}-hint`} className="text-sm text-slate-500 dark:text-slate-400">
            {hint}
          </p>
        )}
        {error && (
          <p id={`${id}-error`} role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
