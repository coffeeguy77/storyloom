// src/components/EpubReader.tsx
//
// EPUB reader using epubjs. Renders a paginated reflowable view.
// Keyboard: arrow keys to turn pages.

"use client"

import { useEffect, useRef, useState } from "react"

export default function EpubReader({ url }: { url: string }) {
  const viewerRef = useRef<HTMLDivElement | null>(null)
  const bookRef = useRef<any>(null)
  const renditionRef = useRef<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fontSize, setFontSize] = useState(100) // %
  const [ready, setReady] = useState(false)

  // Load book + render
  useEffect(() => {
    let cancelled = false
    async function init() {
      setLoading(true); setError(null); setReady(false)
      try {
        // Dynamic import: epubjs ships as ESM and uses JSZip. We fetch the
        // file ourselves so the signed URL works cross-origin without CORS
        // headaches on the Blob flow.
        const ePubModule: any = await import("epubjs")
        const ePub = ePubModule.default || ePubModule

        const res = await fetch(url)
        if (!res.ok) throw new Error(`Could not fetch EPUB (${res.status})`)
        const buffer = await res.arrayBuffer()
        if (cancelled) return

        const book = ePub(buffer)
        bookRef.current = book
        await book.ready
        if (cancelled) return

        if (!viewerRef.current) return
        const rendition = book.renderTo(viewerRef.current, {
          width: "100%",
          height: "100%",
          flow: "paginated",
          spread: "none",
          allowScriptedContent: false,
        })
        renditionRef.current = rendition

        rendition.themes.fontSize(`${fontSize}%`)
        rendition.themes.register("storyloom", {
          body: { background: "transparent", color: "#1f2937" },
        })
        rendition.themes.select("storyloom")

        await rendition.display()
        if (cancelled) return
        setReady(true)
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load EPUB")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void init()
    return () => {
      cancelled = true
      try { renditionRef.current?.destroy() } catch {}
      try { bookRef.current?.destroy() } catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])

  // Apply font size changes
  useEffect(() => {
    if (!ready) return
    try { renditionRef.current?.themes.fontSize(`${fontSize}%`) } catch {}
  }, [fontSize, ready])

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const rendition = renditionRef.current
      if (!rendition) return
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        void rendition.next()
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        void rendition.prev()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <div className="flex flex-col items-center">
      {error && (
        <div className="bg-red-500/20 border border-red-400/30 text-red-100 rounded-lg p-4 mb-4 max-w-xl text-center">
          {error}
        </div>
      )}
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-2xl overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <p className="text-gray-500">Loading book…</p>
          </div>
        )}
        <div
          ref={viewerRef}
          className="w-full"
          style={{ height: "min(80vh, 900px)" }}
        />
      </div>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 z-30">
        <button
          onClick={() => void renditionRef.current?.prev()}
          className="text-white px-3 py-1 rounded-full hover:bg-white/10"
          title="Previous page (←)"
        >←</button>
        <button
          onClick={() => void renditionRef.current?.next()}
          className="text-white px-3 py-1 rounded-full hover:bg-white/10"
          title="Next page (→)"
        >→</button>
        <div className="w-px h-6 bg-white/20 mx-1" />
        <button
          onClick={() => setFontSize((v) => Math.max(v - 10, 60))}
          className="text-white px-3 py-1 rounded-full hover:bg-white/10 text-sm"
          title="Smaller text"
        >A−</button>
        <span className="text-white/70 text-xs px-1 min-w-[3rem] text-center">
          {fontSize}%
        </span>
        <button
          onClick={() => setFontSize((v) => Math.min(v + 10, 180))}
          className="text-white px-3 py-1 rounded-full hover:bg-white/10 text-sm"
          title="Bigger text"
        >A+</button>
      </div>
    </div>
  )
}
