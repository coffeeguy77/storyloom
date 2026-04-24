// src/app/community/books/[id]/page.tsx
//
// Reader page. Fetches the book's metadata + short-lived signed URL, then
// renders either PdfReader or EpubReader based on file_type.

"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { useSupabase } from "@/lib/useSupabase"

// Both readers are client-only (they touch window/document and load workers),
// so we dynamic-import with ssr:false.
const PdfReader = dynamic(() => import("@/components/PdfReader"), { ssr: false })
const EpubReader = dynamic(() => import("@/components/EpubReader"), { ssr: false })

type BookMeta = {
  id: string
  title: string
  author: string | null
  description: string | null
  file_type: "pdf" | "epub"
}

export default function BookReaderPage({ params }: { params: { id: string } }) {
  const { client, user, session, authLoading } = useSupabase()
  const [meta, setMeta] = useState<BookMeta | null>(null)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user || !client || !session?.access_token) {
      setLoading(false)
      setError("You need to be signed in to read community books.")
      return
    }
    let cancelled = false
    async function load() {
      setLoading(true); setError(null)
      try {
        // 1. Fetch metadata via RLS-scoped query
        const { data: book, error: bookErr } = await client!
          .from("community_books")
          .select("id, title, author, description, file_type")
          .eq("id", params.id)
          .maybeSingle()
        if (bookErr) throw bookErr
        if (!book) throw new Error("Book not found or not yet approved.")
        if (cancelled) return
        setMeta(book as BookMeta)

        // 2. Ask our server for a signed URL
        const res = await fetch(`/api/community-books/${params.id}/signed-url`, {
          headers: { Authorization: `Bearer ${session!.access_token}` },
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error ?? "Could not load book file")
        if (cancelled) return
        setSignedUrl(data.url)
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load book")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [authLoading, user, client, session, params.id])

  if (authLoading || loading) {
    return <ReaderShell><p className="text-white/80">Loading…</p></ReaderShell>
  }

  if (error || !meta || !signedUrl) {
    return (
      <ReaderShell>
        <p className="text-red-200 mb-4">{error ?? "Unable to load this book."}</p>
        <Link href="/community/books" className="text-white/80 underline">
          ← Back to library
        </Link>
      </ReaderShell>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-pink-800">
      <div className="sticky top-0 z-20 bg-black/40 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/community/books" className="text-white/80 hover:text-white text-sm">
            ← Library
          </Link>
          <div className="text-center flex-1 px-4">
            <h1 className="text-white font-semibold text-sm md:text-base truncate">
              {meta.title}
            </h1>
            {meta.author && (
              <p className="text-white/60 text-xs truncate">{meta.author}</p>
            )}
          </div>
          <div className="w-12" /> {/* spacer for layout balance */}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-2 md:px-6 py-6">
        {meta.file_type === "pdf" ? (
          <PdfReader url={signedUrl} />
        ) : (
          <EpubReader url={signedUrl} />
        )}
      </div>
    </div>
  )
}

function ReaderShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-pink-800 flex items-center justify-center p-6">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 max-w-md text-center">
        {children}
      </div>
    </div>
  )
}
