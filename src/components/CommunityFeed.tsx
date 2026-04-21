// src/components/CommunityFeed.tsx

"use client"

import { useState } from "react"
import { useSupabase } from "@/lib/useSupabase"
import {
  useCommunityFeed, useFavourites, useMyPublishing, useModerationQueue,
  type CommunityFeedItem,
} from "@/lib/useCommunity"

export default function CommunityFeed({ onBack }: { onBack: () => void }) {
  const { user, isAdmin } = useSupabase()
  const [tab, setTab] = useState<"feed" | "publish" | "mine" | "moderate">("feed")

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-4xl font-bold text-white mb-6 text-center drop-shadow-2xl">Community</h1>

      <div className="flex gap-2 justify-center mb-8 flex-wrap">
        <Tab active={tab === "feed"}     onClick={() => setTab("feed")}>Feed</Tab>
        {user && <Tab active={tab === "publish"} onClick={() => setTab("publish")}>Publish</Tab>}
        {user && <Tab active={tab === "mine"}    onClick={() => setTab("mine")}>My submissions</Tab>}
        {isAdmin && <Tab active={tab === "moderate"} onClick={() => setTab("moderate")}>Moderate</Tab>}
      </div>

      {tab === "feed"     && <Feed />}
      {tab === "publish"  && <PublishPanel />}
      {tab === "mine"     && <MySubmissions />}
      {tab === "moderate" && <ModerationPanel />}

      <div className="text-center mt-8">
        <button
          onClick={onBack}
          className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
        >
          Back to Home
        </button>
      </div>
    </div>
  )
}

function Tab({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-semibold transition-all ${
        active
          ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
          : "bg-white/10 text-white hover:bg-white/20"
      }`}
    >
      {children}
    </button>
  )
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl ${className}`}
      style={{ boxShadow: "0 25px 50px -12px rgba(168, 85, 247, 0.2), 0 0 0 1px rgba(255,255,255,0.05)" }}
    >
      {children}
    </div>
  )
}

// ---------- Feed -----------------------------------------------------------
function Feed() {
  const { items, loading } = useCommunityFeed()
  const { user } = useSupabase()
  const { myFavIds, toggle } = useFavourites()
  const [reading, setReading] = useState<CommunityFeedItem | null>(null)

  if (reading) {
    return (
      <Card className="p-8">
        <button onClick={() => setReading(null)} className="text-white/80 hover:text-white underline mb-4">← Back to feed</button>
        <h2 className="text-3xl font-bold text-white mb-2">{reading.title}</h2>
        {reading.author_name && <p className="text-white/70 text-sm mb-4">by {reading.author_name}</p>}
        {reading.image_url && <img src={reading.image_url} alt="" className="w-full max-w-md mx-auto rounded-lg shadow-2xl mb-6" />}
        <div className="prose prose-invert max-w-none">
          {reading.content.split("\n\n").map((p, i) => (
            <p key={i} className="text-white/90 leading-relaxed mb-4 text-lg">{p}</p>
          ))}
        </div>
      </Card>
    )
  }

  if (loading) return <Card className="p-8 text-center"><p className="text-white">Loading…</p></Card>
  if (items.length === 0) return (
    <Card className="p-8 text-center">
      <p className="text-white/80">No community stories yet. Be the first to publish!</p>
    </Card>
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((it) => (
        <Card key={it.id} className="overflow-hidden hover:scale-[1.02] transition-transform">
          <div onClick={() => setReading(it)} className="cursor-pointer aspect-[3/4] relative">
            {it.image_url && <img src={it.image_url} alt="" className="w-full h-full object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h3 className="text-white font-bold text-lg mb-1 line-clamp-2">{it.title}</h3>
              <p className="text-white/70 text-xs">{it.author_name ? `by ${it.author_name}` : "anonymous"}</p>
            </div>
          </div>
          <div className="p-3 flex items-center justify-between border-t border-white/10">
            <span className="text-white/70 text-xs">{new Date(it.submitted_at).toLocaleDateString()}</span>
            <button
              onClick={() => user && toggle(it.id)} disabled={!user}
              className="bg-white/10 text-white px-3 py-1 rounded-lg text-sm hover:bg-white/20 disabled:opacity-50"
              title={user ? "Favourite" : "Sign in to favourite"}
            >
              {myFavIds.has(it.id) ? "★" : "☆"} {it.favourite_count}
            </button>
          </div>
        </Card>
      ))}
    </div>
  )
}

// ---------- Publish --------------------------------------------------------
function PublishPanel() {
  const { stories } = useSupabase()
  const { myPosts, publish } = useMyPublishing()
  const [storyId, setStoryId] = useState("")
  const [showAuthor, setShowAuthor] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const postedIds = new Set(myPosts.map((p) => p.story_id))
  const available = stories.filter((s) => !postedIds.has(s.id))

  async function onPublish() {
    const chosen = stories.find((s) => s.id === storyId)
    if (!chosen) return
    setBusy(true); setErr(null); setMsg(null)
    try {
      await publish({
        story: { id: chosen.id, title: chosen.title, content: chosen.content, image_url: chosen.image_url },
        showAuthor,
      })
      setMsg("Submitted. It will appear on the feed once approved."); setStoryId("")
    } catch (e: any) { setErr(e?.message ?? "Failed") }
    finally { setBusy(false) }
  }

  return (
    <Card className="p-8 max-w-2xl mx-auto">
      {msg && <div className="mb-4 text-green-100 text-center bg-green-500/20 p-3 rounded-lg">{msg}</div>}
      {err && <div className="mb-4 text-red-200 text-center bg-red-500/20 p-3 rounded-lg">{err}</div>}

      {available.length === 0 ? (
        <p className="text-white/80 text-center">You don't have any stories to publish that aren't already submitted.</p>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-white font-semibold mb-2">Story to publish</label>
            <select
              value={storyId} onChange={(e) => setStoryId(e.target.value)}
              className="w-full p-3 rounded-lg bg-white/20 text-white border border-white/30 focus:border-white/60 focus:outline-none"
            >
              <option value="" className="text-black">— pick a story —</option>
              {available.map((s) => (
                <option key={s.id} value={s.id} className="text-black">{s.title}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-white cursor-pointer">
            <input type="checkbox" checked={showAuthor} onChange={(e) => setShowAuthor(e.target.checked)} />
            <span>Show my display name on this story</span>
          </label>
          <button
            onClick={onPublish} disabled={!storyId || busy}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50"
          >
            {busy ? "Submitting…" : "Submit for approval"}
          </button>
        </div>
      )}
    </Card>
  )
}

// ---------- My submissions -------------------------------------------------
function MySubmissions() {
  const { myPosts, unpublish } = useMyPublishing()
  if (myPosts.length === 0) return (
    <Card className="p-8 text-center"><p className="text-white/80">You haven't submitted anything yet.</p></Card>
  )
  return (
    <div className="space-y-3 max-w-2xl mx-auto">
      {myPosts.map((p) => (
        <Card key={p.id} className="p-4 flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-white font-semibold">{p.title}</h3>
            <p className="text-white/70 text-sm mt-1">
              {p.status === "pending"  && "⏳ Awaiting review"}
              {p.status === "approved" && "✅ Live on community feed"}
              {p.status === "rejected" && `❌ Rejected${p.moderation_note ? `: ${p.moderation_note}` : ""}`}
              {p.status === "removed"  && `🚫 Removed${p.moderation_note ? `: ${p.moderation_note}` : ""}`}
            </p>
          </div>
          <button
            onClick={() => unpublish(p.id)}
            className="text-red-300 hover:text-red-200 px-3 py-1 rounded hover:bg-red-500/20"
          >
            Remove
          </button>
        </Card>
      ))}
    </div>
  )
}

// ---------- Moderation -----------------------------------------------------
function ModerationPanel() {
  const { queue, loading, decide, removeLive } = useModerationQueue()
  const [note, setNote] = useState<Record<string, string>>({})

  if (loading) return <Card className="p-8 text-center"><p className="text-white">Loading queue…</p></Card>
  if (queue.length === 0) return (
    <Card className="p-8 text-center"><p className="text-white/80">The queue is empty.</p></Card>
  )

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {queue.map((p) => (
        <Card key={p.id} className="p-6">
          <h3 className="text-white font-bold text-xl mb-2">{p.title}</h3>
          {p.image_url && <img src={p.image_url} alt="" className="w-full max-h-64 object-cover rounded-lg mb-4" />}
          <div className="max-h-48 overflow-y-auto bg-black/20 rounded-lg p-3 text-white/90 whitespace-pre-wrap text-sm mb-4">
            {p.content}
          </div>
          <input
            type="text" value={note[p.id] ?? ""} onChange={(e) => setNote({ ...note, [p.id]: e.target.value })}
            placeholder="Optional note to author"
            className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-white/50 border border-white/30 mb-3"
          />
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => decide(p.id, "approved", note[p.id])} className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700">Approve</button>
            <button onClick={() => decide(p.id, "rejected", note[p.id])} className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700">Reject</button>
            <button onClick={() => removeLive(p.id, note[p.id])} className="ml-auto bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700">Remove</button>
          </div>
        </Card>
      ))}
    </div>
  )
}
