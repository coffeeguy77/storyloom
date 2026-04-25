// src/components/PublishStoryButton.tsx
//
// Lives on the story reading screen for the story's owner. Submits to
// community_posts as status='pending' with show_author matching the user's
// choice.

"use client"

import { useState } from "react"
import { useSupabase } from "@/lib/useSupabase"

export default function PublishStoryButton({ storyId }: { storyId: string }) {
  const { session, profile } = useSupabase()
  const [open, setOpen] = useState(false)
  const [showName, setShowName] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  async function submit() {
    if (!session?.access_token) return
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch("/api/community-posts/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ storyId, showAuthor: showName }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg({ type: "err", text: data?.error ?? "Failed to publish" })
      } else {
        setMsg({ type: "ok", text: "Submitted for admin review. Thanks!" })
        setTimeout(() => {
          setOpen(false)
          setMsg(null)
        }, 2000)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-purple-600 hover:to-pink-600"
      >
        📢 Publish to Community
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-6"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="bg-gray-900 border border-white/20 rounded-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-white font-bold text-xl mb-2">Publish to Community</h3>
            <p className="text-white/80 text-sm mb-4">
              Submit this story to the StoryLoom community. An admin will review it before
              it appears in the Stories tab. The story stays in your own library either way.
            </p>

            <label className="flex items-start gap-3 p-3 bg-white/5 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={showName}
                onChange={(e) => setShowName(e.target.checked)}
                className="mt-0.5"
              />
              <div>
                <p className="text-white text-sm">
                  Show my name:{" "}
                  {profile?.display_name
                    ? `"${profile.display_name}"`
                    : "(no display name set)"}
                </p>
                <p className="text-white/60 text-xs mt-0.5">
                  Uncheck to publish anonymously.
                </p>
              </div>
            </label>

            {msg && (
              <div
                className={`mt-3 text-sm rounded-lg p-2 ${
                  msg.type === "ok"
                    ? "bg-green-500/20 text-green-100 border border-green-400/30"
                    : "bg-red-500/20 text-red-100 border border-red-400/30"
                }`}
              >
                {msg.text}
              </div>
            )}

            <div className="flex gap-2 justify-end mt-4">
              <button
                onClick={() => setOpen(false)}
                disabled={busy}
                className="px-4 py-2 text-white/80 hover:text-white text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={busy || msg?.type === "ok"}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                {busy ? "Submitting…" : "Submit for review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
