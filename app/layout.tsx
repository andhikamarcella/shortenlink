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
                <nav className="flex items-center gap-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                  <Link href="/explore" className="focus-ring rounded-md px-2 py-1 hover:text-primary-600 dark:hover:text-primary-400">
                    Explore
                  </Link>
                  <Link href="/dashboard" className="focus-ring rounded-md px-2 py-1 hover:text-primary-600 dark:hover:text-primary-400">
                    Dashboard
                  </Link>
                  <ThemeToggle />
                </nav>
              </div>
            </header>
            <main className="flex-1">{children}</main>
            <footer className="border-t border-slate-200/70 bg-white/80 py-6 text-sm text-slate-500 backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/80 dark:text-slate-400">
              <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 sm:flex-row">
                <p>
                  Built with ❤️ for the web. © {new Date().getFullYear()} shortly
                </p>
                <div className="flex gap-4">
                  <Link href="/explore" className="focus-ring rounded-md px-2 py-1">
                    Popular links
                  </Link>
                  <Link href="/stats/demo" className="focus-ring rounded-md px-2 py-1">
                    Example stats
                  </Link>
                </div>
              </div>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
