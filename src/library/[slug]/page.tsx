// src/app/library/[slug]/page.tsx
//
// Public read-only library page. No login required.

"use client"

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"

type Story = {
  id: string
  title: string
  content: string
  image_url: string | null
  created_at: string
}

export default function PublicLibraryPage({ params }: { params: { slug: string } }) {
  const [ownerName, setOwnerName] = useState<string | null>(null)
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reading, setReading] = useState<Story | null>(null)

  useEffect(() => {
    ;(async () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      const client = createClient(url, key)

      const { data: link } = await client.from("library_public_links")
        .select("owner_id, enabled").eq("slug", params.slug).maybeSingle()
      if (!link || !link.enabled) { setError("This link is not available."); setLoading(false); return }

      const { data: fams } = await client.from("families").select("id").eq("user_id", link.owner_id)
      const familyIds = (fams ?? []).map((f: any) => f.id)

      const [profRes, storyRes] = await Promise.all([
        client.from("profiles").select("display_name").eq("id", link.owner_id).maybeSingle(),
        familyIds.length
          ? client.from("stories").select("id, title, content, image_url, created_at")
              .in("family_id", familyIds).order("created_at", { ascending: false })
          : Promise.resolve({ data: [] as Story[] }),
      ])
      setOwnerName(profRes.data?.display_name ?? "A StoryLoom author")
      setStories((storyRes.data as Story[]) ?? [])
      setLoading(false)
    })()
  }, [params.slug])

  return (
    <div className="min-h-screen">
      <div className="fixed inset-0 -z-50 bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-400" />
      <div className="relative z-10 container mx-auto px-6 py-12">
        {loading ? (
          <p className="text-center text-white">Loading…</p>
        ) : error ? (
          <p className="text-center text-white">{error}</p>
        ) : reading ? (
          <div className="max-w-4xl mx-auto bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-8">
            <button onClick={() => setReading(null)} className="text-white/80 hover:text-white underline mb-4">← Back to library</button>
            <h1 className="text-3xl font-bold text-white mb-4">{reading.title}</h1>
            {reading.image_url && <img src={reading.image_url} alt="" className="w-full max-w-md mx-auto rounded-lg shadow-2xl mb-6" />}
            <div className="prose prose-invert max-w-none">
              {reading.content.split("\n\n").map((p, i) => (
                <p key={i} className="text-white/90 leading-relaxed mb-4 text-lg">{p}</p>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto">
            <p className="text-white/70 text-center mb-2">A shared library from</p>
            <h1 className="text-4xl font-bold text-white mb-12 text-center drop-shadow-2xl">{ownerName}</h1>

            {stories.length === 0 ? (
              <p className="text-white/80 text-center">No stories to show.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stories.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => setReading(s)}
                    className="relative bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform"
                  >
                    <div className="aspect-[3/4] relative">
                      {s.image_url && <img src={s.image_url} alt={s.title} className="w-full h-full object-cover" />}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h3 className="text-white font-bold text-lg line-clamp-2">{s.title}</h3>
                        <p className="text-white/70 text-xs mt-1">{new Date(s.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
