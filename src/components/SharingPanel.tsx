// src/components/SharingPanel.tsx
//
// Full-screen sharing management page. Uses the same visual language as the
// rest of the app. Self-contained — render it as its own screen when the user
// clicks the "Sharing" tile on the home page.

"use client"

import { useMemo, useState } from "react"
import { useSupabase } from "@/lib/useSupabase"
import { useSharing } from "@/lib/useSharing"

export default function SharingPanel({ onBack }: { onBack: () => void }) {
  const { stories } = useSupabase()
  const {
    shares, publicLink, loading,
    inviteByEmail, revokeShare,
    enablePublicLink, disablePublicLink, rotatePublicSlug,
  } = useSharing()

  const [email, setEmail]         = useState("")
  const [scope, setScope]         = useState<"all" | "selected">("all")
  const [selectedIds, setIds]     = useState<string[]>([])
  const [busy, setBusy]           = useState(false)
  const [msg, setMsg]             = useState<string | null>(null)
  const [err, setErr]             = useState<string | null>(null)

  const publicUrl = useMemo(() => {
    if (!publicLink?.slug) return null
    if (typeof window === "undefined") return `/library/${publicLink.slug}`
    return `${window.location.origin}/library/${publicLink.slug}`
  }, [publicLink])

  async function onInvite() {
    setBusy(true); setErr(null); setMsg(null)
    try {
      await inviteByEmail(email, scope, scope === "selected" ? selectedIds : [])
      setMsg(`Shared with ${email}`); setEmail(""); setIds([])
    } catch (e: any) { setErr(e?.message ?? "Failed to invite") }
    finally { setBusy(false) }
  }

  async function onTogglePublic() {
    setBusy(true); setErr(null); setMsg(null)
    try {
      if (publicLink?.enabled) await disablePublicLink()
      else                      await enablePublicLink(scope, scope === "selected" ? selectedIds : [])
    } catch (e: any) { setErr(e?.message ?? "Failed") }
    finally { setBusy(false) }
  }

  function toggleStory(id: string) {
    setIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-white mb-8 text-center drop-shadow-2xl">Sharing</h1>

      {err && <div className="mb-4 text-red-200 text-center bg-red-500/20 p-3 rounded-lg">{err}</div>}
      {msg && <div className="mb-4 text-green-100 text-center bg-green-500/20 p-3 rounded-lg">{msg}</div>}

      <Card>
        <h2 className="text-xl font-bold text-white mb-4">What to share</h2>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer text-white">
            <input type="radio" checked={scope === "all"}      onChange={() => setScope("all")} />
            <span>All my stories</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-white">
            <input type="radio" checked={scope === "selected"} onChange={() => setScope("selected")} />
            <span>Only selected stories</span>
          </label>
        </div>
        {scope === "selected" && (
          <div className="mt-4 max-h-60 overflow-y-auto border border-white/20 rounded-lg p-3">
            {stories.length === 0 && <p className="text-white/60">You have no stories yet.</p>}
            {stories.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-white py-1 cursor-pointer">
                <input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => toggleStory(s.id)} />
                <span>{s.title}</span>
              </label>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-xl font-bold text-white mb-2">Invite by email</h2>
        <p className="text-white/70 text-sm mb-4">
          They'll see your library under "Shared with me" when they sign in with this email.
        </p>
        <div className="flex gap-2">
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="their@email.com"
            className="flex-1 p-3 rounded-lg bg-white/20 text-white placeholder-white/50 border border-white/30 focus:border-white/60 focus:outline-none"
          />
          <button
            onClick={onInvite} disabled={busy || !email}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50"
          >
            {busy ? "…" : "Invite"}
          </button>
        </div>

        {shares.length > 0 && (
          <ul className="mt-6 space-y-2">
            {shares.map((s) => (
              <li key={s.id} className="flex items-center justify-between bg-white/10 rounded-lg p-3">
                <div>
                  <span className="text-white">{s.invitee_email}</span>
                  <span className="ml-2 text-white/60 text-sm">
                    ({s.scope === "all" ? "all stories" : `${s.scoped_story_ids?.length ?? 0} selected`})
                  </span>
                </div>
                <button
                  onClick={() => revokeShare(s.id)}
                  className="text-red-300 hover:text-red-200 px-3 py-1 rounded hover:bg-red-500/20"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="text-xl font-bold text-white mb-2">Public link</h2>
        <p className="text-white/70 text-sm mb-4">
          Anyone with the link can read. No account required. Turn it off any time.
        </p>
        <div className="flex items-center justify-between">
          <span className="text-white">{publicLink?.enabled ? "Enabled" : "Disabled"}</span>
          <button
            onClick={onTogglePublic} disabled={busy || loading}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50"
          >
            {publicLink?.enabled ? "Turn off" : "Turn on"}
          </button>
        </div>
        {publicLink?.enabled && publicUrl && (
          <div className="mt-4">
            <code className="block break-all text-sm text-white/90 bg-black/20 p-3 rounded-lg">{publicUrl}</code>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => navigator.clipboard.writeText(publicUrl)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700"
              >
                Copy
              </button>
              <button
                onClick={rotatePublicSlug}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700"
              >
                Rotate link
              </button>
            </div>
          </div>
        )}
      </Card>

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

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl p-6 mb-6"
      style={{ boxShadow: "0 25px 50px -12px rgba(168, 85, 247, 0.2), 0 0 0 1px rgba(255,255,255,0.05)" }}
    >
      {children}
    </div>
  )
}
