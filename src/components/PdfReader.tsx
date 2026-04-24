// src/components/PdfReader.tsx
//
// PDF reader using pdfjs-dist. Renders one page at a time into a <canvas>.
// Keyboard shortcuts: arrow keys for prev/next page.
//
// pdfjs-dist note: we use the legacy build for broader compatibility. The
// worker is loaded from a CDN to avoid Next.js bundle-size bloat and
// webpack worker-config headaches.

"use client"

import { useCallback, useEffect, useRef, useState } from "react"

// pdfjs types — importing lazily inside the component. We type only what we
// use to keep the import surface small.
type PDFDocumentProxy = any
type PDFPageProxy = any

const PDFJS_VERSION = "4.7.76"
const PDFJS_WORKER_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`

export default function PdfReader({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const pdfRef = useRef<PDFDocumentProxy | null>(null)
  const renderTaskRef = useRef<any>(null)

  const [pageCount, setPageCount] = useState(0)
  const [pageNum, setPageNum] = useState(1)
  const [zoom, setZoom] = useState(1.0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load the PDF once
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true); setError(null)
      try {
        const pdfjs: any = await import("pdfjs-dist")
        pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL
        const loadingTask = pdfjs.getDocument({ url })
        const pdf = await loadingTask.promise
        if (cancelled) return
        pdfRef.current = pdf
        setPageCount(pdf.numPages)
        setPageNum(1)
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load PDF")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [url])

  // Render current page
  const renderPage = useCallback(async () => {
    const pdf = pdfRef.current
    const canvas = canvasRef.current
    if (!pdf || !canvas) return
    try {
      // Cancel any in-flight render so we don't overlap
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel() } catch {}
      }
      const page: PDFPageProxy = await pdf.getPage(pageNum)
      const containerWidth = containerRef.current?.clientWidth ?? 800
      const unscaledViewport = page.getViewport({ scale: 1 })
      // Fit the unscaled page to container width, then apply user zoom
      const fitScale = containerWidth / unscaledViewport.width
      const effectiveScale = fitScale * zoom * (window.devicePixelRatio || 1)
      const viewport = page.getViewport({ scale: effectiveScale })

      const ctx = canvas.getContext("2d")
      if (!ctx) return
      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)
      canvas.style.width = `${Math.floor(viewport.width / (window.devicePixelRatio || 1))}px`
      canvas.style.height = `${Math.floor(viewport.height / (window.devicePixelRatio || 1))}px`

      const task = page.render({ canvasContext: ctx, viewport })
      renderTaskRef.current = task
      await task.promise
    } catch (e: any) {
      if (e?.name !== "RenderingCancelledException") {
        console.error("PDF render error:", e)
      }
    }
  }, [pageNum, zoom])

  useEffect(() => { void renderPage() }, [renderPage])

  // Re-render on resize so page refits
  useEffect(() => {
    let raf = 0
    function onResize() {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => void renderPage())
    }
    window.addEventListener("resize", onResize)
    return () => { window.removeEventListener("resize", onResize); cancelAnimationFrame(raf) }
  }, [renderPage])

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        setPageNum((n) => Math.min(n + 1, pageCount))
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        setPageNum((n) => Math.max(n - 1, 1))
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [pageCount])

  const canPrev = pageNum > 1
  const canNext = pageNum < pageCount

  return (
    <div className="flex flex-col items-center">
      {error && (
        <div className="bg-red-500/20 border border-red-400/30 text-red-100 rounded-lg p-4 mb-4 max-w-xl text-center">
          {error}
        </div>
      )}
      <div
        ref={containerRef}
        className="w-full max-w-4xl bg-white rounded-lg shadow-2xl overflow-hidden flex items-center justify-center min-h-[400px]"
      >
        {loading ? (
          <p className="text-gray-500 p-12">Loading PDF…</p>
        ) : (
          <canvas ref={canvasRef} className="block" />
        )}
      </div>
      <ReaderControls
        pageNum={pageNum}
        pageCount={pageCount}
        zoom={zoom}
        onPrev={() => setPageNum((n) => Math.max(n - 1, 1))}
        onNext={() => setPageNum((n) => Math.min(n + 1, pageCount))}
        onZoomIn={() => setZoom((z) => Math.min(z + 0.1, 2.5))}
        onZoomOut={() => setZoom((z) => Math.max(z - 0.1, 0.5))}
        onZoomReset={() => setZoom(1.0)}
        canPrev={canPrev}
        canNext={canNext}
      />
    </div>
  )
}

function ReaderControls({
  pageNum, pageCount, zoom,
  onPrev, onNext, onZoomIn, onZoomOut, onZoomReset,
  canPrev, canNext,
}: {
  pageNum: number; pageCount: number; zoom: number
  onPrev: () => void; onNext: () => void
  onZoomIn: () => void; onZoomOut: () => void; onZoomReset: () => void
  canPrev: boolean; canNext: boolean
}) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 z-30">
      <button
        onClick={onPrev} disabled={!canPrev}
        className="text-white px-3 py-1 rounded-full hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
        title="Previous page (←)"
      >←</button>
      <span className="text-white/90 text-sm px-2 min-w-[4.5rem] text-center">
        {pageNum} / {pageCount || "…"}
      </span>
      <button
        onClick={onNext} disabled={!canNext}
        className="text-white px-3 py-1 rounded-full hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
        title="Next page (→)"
      >→</button>
      <div className="w-px h-6 bg-white/20 mx-1" />
      <button
        onClick={onZoomOut}
        className="text-white px-3 py-1 rounded-full hover:bg-white/10 text-sm"
        title="Zoom out"
      >−</button>
      <button
        onClick={onZoomReset}
        className="text-white/70 text-xs px-2 py-1 rounded hover:bg-white/10 min-w-[3rem]"
        title="Reset zoom"
      >{Math.round(zoom * 100)}%</button>
      <button
        onClick={onZoomIn}
        className="text-white px-3 py-1 rounded-full hover:bg-white/10 text-sm"
        title="Zoom in"
      >+</button>
    </div>
  )
}
