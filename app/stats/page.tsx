'use client'

import Navbar from '@/components/Navbar'

export default function StatsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <main className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4 px-6 py-16 text-center">
        <h1 className="text-3xl font-semibold">Stats &amp; analytics</h1>
        <p className="max-w-xl text-sm text-neutral-400">
          Stats and analytics are coming soon. You&apos;ll be able to track clicks, top referrers,
          and performance metrics for each of your short links right here.
        </p>
        <div className="mt-6 w-full max-w-md rounded border border-white/10 bg-white/5 p-6 text-sm text-neutral-200">
          We&apos;re working on rich insights to help you understand how your links perform. Stay tuned!
        </div>
      </main>
    </div>
  )
}
