# shortly

Production-ready URL shortener built with Next.js 14 App Router, TypeScript, Tailwind CSS, and Supabase.

## Features

- 🔗 Lightning-fast URL shortening with optional custom slugs (validated in real time)
- 🔁 Server-side redirects with automatic click tracking
- 📊 Public explore page (ISR) and per-link stats pages for sharing analytics
- 🔐 Authenticated dashboard with Supabase magic-link login, responsive table/cards, and link management
- 🧊 Built-in rate limiting, phishing-safe URL validation, and QR code downloads
- 🌗 Dark mode with persistent user preference and accessible UI components

## Getting started

### Prerequisites

- Node.js 18.17+
- npm 9+
- A Supabase project with the `links` table provisioned

### Supabase setup

Run the following SQL in Supabase SQL editor:

```sql
create table if not exists public.links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  slug text unique not null,
  original_url text not null,
  clicks integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  is_public boolean not null default true
);

create index if not exists links_slug_idx on public.links (slug);
```

Configure Row Level Security to allow authenticated users to manage their own links while keeping public reads safe:

```sql
alter table public.links enable row level security;

create policy "Public read access" on public.links
for select using (true);

create policy "Users manage their own links" on public.links
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### Environment variables

Create a `.env.local` file at the project root with:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SITE_URL=http://localhost:3000
```

> **Security note:** Never expose `SUPABASE_SERVICE_ROLE_KEY` outside server environments.

### Install dependencies

```bash
npm install
```

### Development

```bash
npm run dev
```

Visit http://localhost:3000 to start shortening links.

### Build & production

```bash
npm run build
npm start
```

### Deploying to Vercel

1. Push this repo to GitHub.
2. Create a new project on Vercel and import the repo.
3. Set the environment variables above in the Vercel dashboard (include `NEXT_PUBLIC_SITE_URL` pointing to your Vercel domain).
4. Connect Supabase service role key in the Vercel environment (Server-side only).
5. Trigger a deployment — the app uses ISR for `/explore` and `/stats/[slug]` and dynamic rendering for redirects.

### Testing the workflow

1. Sign in via `/dashboard` using Supabase Auth magic link.
2. Create short links from the homepage, optionally making them private by sending `is_public=false` via API or adjusting UI.
3. Monitor the click counter in Supabase, the explore page, and stats pages.

## Accessibility & performance highlights

- Semantic HTML with associated labels, `aria-live` regions, and focus management
- Keyboard-accessible modal dialogs with focus trap and ESC support
- Tailwind-based responsive design with high-contrast color palette
- Lightweight client bundle: QR code library loaded only where needed
- Rate limiting and URL sanitization to prevent abuse and unsafe schemes

## License

MIT
