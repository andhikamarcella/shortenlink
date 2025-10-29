import { getSupabaseServerClient } from '@/lib/supabaseClientServer'

export default async function ExplorePage() {
  const supabase = getSupabaseServerClient()
  const { data: links, error } = await supabase
    .from('links')
    .select('slug, url, original_url, created_at')
    .limit(20)

  if (error) {
    console.error('[ExplorePage] Failed to fetch links:', error.message)
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl font-semibold mb-4">Explore</h1>
      {!links && <p className="text-neutral-500 text-sm">Error loading links.</p>}
      {links && links.length === 0 && <p className="text-neutral-500 text-sm">No links yet.</p>}
      {links && links.length > 0 && (
        <ul className="space-y-3">
          {links.map((link: any) => (
            <li key={link.slug} className="rounded bg-neutral-800 p-4">
              <span className="font-mono text-sm text-purple-300">/{link.slug}</span>
              <span className="text-sm text-neutral-300 break-all">
                {link.url ?? link.original_url}
              </span>
              <span className="text-[10px] text-neutral-500">
                {new Date(link.created_at).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
