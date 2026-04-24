// src/components/FlagBookButton.tsx
//
// Small button + dialog that lets a signed-in user flag a book for admin review.
// Place in the reader page header.

"use client"

import { useState } from "react"
import { useSupabase } from "@/lib/useSupabase"

export default function FlagBookButton({ bookId }: { bookId: string }) {
  const { session } = useSupabase()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  async function submit() {
    if (!session?.access_token) return
    setBusy(true); setMsg(null)
    try {
      const res = await fetch(`/api/community-books/${bookId}/flag`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ reason: reason.trim() || null }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg({ type: "err", text: data?.error ?? "Failed to flag" })
      } else {
        setMsg({ type: "ok", text: "Thanks — an admin will review this." })
        setReason("")
        setTimeout(() => { setOpen(false); setMsg(null) }, 2000)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-white/70 hover:text-white text-xs underline"
        title="Report this book"
      >
        🚩 Flag
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
            <h3 className="text-white font-semibold text-lg mb-2">Flag this book</h3>
            <p className="text-white/70 text-sm mb-4">
              Tell us why this book shouldn't be here. An admin will review it.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="e.g. inappropriate content, copyright issue…"
              className="w-full p-3 rounded-lg bg-white/10 text-white placeholder-white/40 border border-white/20 focus:border-white/40 focus:outline-none resize-none text-sm"
            />
            {msg && (
              <div className={`mt-3 text-sm rounded-lg p-2 ${
                msg.type === "ok"
                  ? "bg-green-500/20 text-green-100 border border-green-400/30"
                  : "bg-red-500/20 text-red-100 border border-red-400/30"
              }`}>
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
                className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                {busy ? "Sending…" : "Flag book"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
