import { getSupabaseServerClient } from '@/lib/supabaseClientServer'

export default async function ExplorePage() {
  const supabase = getSupabaseServerClient()

  let links: { slug: string; url: string; created_at: string }[] | null = null
  let fetchError: string | null = null

  if (!supabase) {
    fetchError = 'Supabase not configured'
  } else {
    const { data, error } = await supabase
      .from('links')
      .select('slug, url, created_at')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('[explore] supabase error:', error)
      fetchError = error.message ?? 'Unknown error'
    } else {
      links = data ?? []
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl font-semibold mb-4">Explore</h1>

      {fetchError && (
        <p className="text-red-400 text-sm">Error loading links.</p>
      )}

      {!fetchError && links && links.length === 0 && (
        <p className="text-neutral-500 text-sm">No links yet.</p>
      )}

      {!fetchError && links && links.length > 0 && (
        <ul className="space-y-3">
          {links.map((row) => (
            <li
              key={row.slug}
              className="rounded bg-neutral-800 p-4 flex flex-col"
            >
              <span className="font-mono text-sm text-purple-300">
                /{row.slug}
              </span>
              <span className="text-sm text-neutral-300 break-all">
                {row.url}
              </span>
              <span className="text-[10px] text-neutral-500">
                {new Date(row.created_at).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
