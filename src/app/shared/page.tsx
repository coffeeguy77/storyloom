// src/app/shared/page.tsx

"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSupabase } from "@/lib/useSupabase"
import { useSharedWithMe } from "@/lib/useSharing"

type Story = {
  id: string
  family_id: string
  title: string
  content: string
  image_url: string | null
  created_at: string
}

export default function SharedWithMePage() {
  const { client, user, authLoading } = useSupabase()
  const { incoming, loading: incomingLoading } = useSharedWithMe()
  const [activeOwner, setActiveOwner] = useState<string | null>(null)
  const [ownerName, setOwnerName] = useState("")
  const [stories, setStories] = useState<Story[]>([])
  const [reading, setReading] = useState<Story | null>(null)

  useEffect(() => {
    if (!client || !activeOwner) return
    ;(async () => {
      const [profRes, famRes] = await Promise.all([
        client.from("profiles").select("display_name").eq("id", activeOwner).maybeSingle(),
        client.from("families").select("id").eq("user_id", activeOwner),
      ])
      setOwnerName(profRes.data?.display_name ?? "")
      const familyIds = (famRes.data ?? []).map((f: any) => f.id)
      if (familyIds.length === 0) { setStories([]); return }
      const { data } = await client.from("stories")
        .select("id, family_id, title, content, image_url, created_at")
        .in("family_id", familyIds).order("created_at", { ascending: false })
      setStories((data as Story[]) ?? [])
    })()
  }, [client, activeOwner])

  return (
    <div className="min-h-screen">
      <div className="fixed inset-0 -z-50 bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-400" />
      <div className="relative z-10 container mx-auto px-6 py-12">
        {authLoading ? (
          <p className="text-center text-white">Loading…</p>
        ) : !user ? (
          <div className="text-center">
            <p className="text-white mb-4">Please sign in to see libraries shared with you.</p>
            <Link href="/" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-semibold inline-block">
              Go home
            </Link>
          </div>
        ) : reading ? (
          <div className="max-w-4xl mx-auto bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-8">
            <button onClick={() => setReading(null)} className="text-white/80 hover:text-white underline mb-4">← Back</button>
            <h1 className="text-3xl font-bold text-white mb-4">{reading.title}</h1>
            {reading.image_url && <img src={reading.image_url} alt="" className="w-full max-w-md mx-auto rounded-lg shadow-2xl mb-6" />}
            <div className="prose prose-invert max-w-none">
              {reading.content.split("\n\n").map((p, i) => (
                <p key={i} className="text-white/90 leading-relaxed mb-4 text-lg">{p}</p>
              ))}
            </div>
          </div>
        ) : activeOwner ? (
          <div className="max-w-6xl mx-auto">
            <button
              onClick={() => { setActiveOwner(null); setStories([]) }}
              className="text-white/80 hover:text-white underline mb-4"
            >
              ← All shared libraries
            </button>
            <h1 className="text-4xl font-bold text-white mb-8 text-center drop-shadow-2xl">{ownerName}'s library</h1>
            {stories.length === 0 ? (
              <p className="text-white/80 text-center">No stories visible.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stories.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => setReading(s)}
                    className="relative bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform"
                  >
                    <div className="aspect-[3/4] relative">
                      {s.image_url && <img src={s.image_url} alt={s.title} className="w-full h-full object-cover" />}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h3 className="text-white font-bold text-lg line-clamp-2">{s.title}</h3>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold text-white mb-8 text-center drop-shadow-2xl">Shared with me</h1>
            {incomingLoading ? (
              <p className="text-white text-center">Loading…</p>
            ) : incoming.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-12 text-center">
                <p className="text-white/80">Nobody has shared a library with you yet.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {incoming.map((row) => (
                  <div
                    key={row.owner_id}
                    onClick={() => setActiveOwner(row.owner_id)}
                    className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-6 cursor-pointer hover:scale-[1.01] transition-transform"
                  >
                    <h2 className="text-xl font-bold text-white">{row.owner_name}</h2>
                    <p className="text-white/70 text-sm mt-1">
                      {row.story_count} {row.story_count === 1 ? "story" : "stories"}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div className="text-center mt-8">
              <Link href="/" className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700">
                Back to Home
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
