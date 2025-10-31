import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { cn } from '@/lib/utils';

const inter = Inter({ subsets: ['latin'] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shortly.example.com';

export const metadata: Metadata = {
  title: 'shortly — Fast, accessible URL shortener',
  description: 'Create memorable, trackable short links with shortly.',
  metadataBase: new URL(siteUrl),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(inter.className, 'min-h-screen bg-transparent')}>
        <ThemeProvider>
          <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/80">
              <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
                <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100 focus-ring">
                  shortly
                </Link>
                <ThemeToggle />
              </div>
            </header>
            <main className="flex-1">{children}</main>
            <footer className="border-t border-slate-200/70 bg-white/80 py-6 text-sm text-slate-500 backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/80 dark:text-slate-400">
              <div className="mx-auto flex w-full max-w-6xl items-center justify-center px-4">
                <p>Built with ❤️ for the web. © {new Date().getFullYear()} shortly</p>
              </div>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
