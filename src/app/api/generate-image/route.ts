// src/app/api/generate-image/route.ts
// Server-side: calls OpenAI DALL-E 3, uploads the result to Cloudinary, returns the Cloudinary URL.
//
// Env vars required in Vercel:
//   OPENAI_API_KEY
//   CLOUDINARY_CLOUD_NAME        (e.g. "dzx6x1hou")
//   CLOUDINARY_API_KEY           (e.g. "228818781471743")
//   CLOUDINARY_API_SECRET        (the matching secret for the Storyloom key)

import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

export const runtime = "nodejs"
export const maxDuration = 60 // DALL-E 3 typically 10-20s; 60s is comfortable headroom

type Body = {
  prompt: string
  theme?: string
  storyTitle?: string
  quality?: "standard" | "hd"
  size?: "1024x1024" | "1024x1792" | "1792x1024"
  style?: "vivid" | "natural"
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body
    const { prompt, theme = "general", storyTitle = "storyloom-cover" } = body
    const quality = body.quality ?? "standard" // ~$0.04 at 1024x1024 — matches what was working yesterday
    const size = body.size ?? "1024x1024"       // square, cheapest tier, good children's book look
    const style = body.style ?? "vivid"         // saturated, children's-book friendly

    if (!prompt || prompt.trim().length < 10) {
      return NextResponse.json({ error: "Prompt too short" }, { status: 400 })
    }

    const openaiKey = process.env.OPENAI_API_KEY
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const cloudKey = process.env.CLOUDINARY_API_KEY
    const cloudSecret = process.env.CLOUDINARY_API_SECRET

    if (!openaiKey) return NextResponse.json({ error: "OPENAI_API_KEY not set" }, { status: 500 })
    if (!cloudName || !cloudKey || !cloudSecret) {
      return NextResponse.json({ error: "Cloudinary env vars missing" }, { status: 500 })
    }

    // ---------- 1. Call DALL-E 3 ----------
    const openaiRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        n: 1,              // DALL-E 3 only supports n=1
        size,
        quality,
        style,
        response_format: "url", // 60-minute signed URL
      }),
    })

    if (!openaiRes.ok) {
      const errText = await openaiRes.text()
      console.error("OpenAI error:", errText)
      return NextResponse.json(
        { error: "OpenAI image generation failed", detail: errText },
        { status: 502 }
      )
    }

    const openaiJson = await openaiRes.json()
    const tempUrl: string | undefined = openaiJson?.data?.[0]?.url
    const revisedPrompt: string | undefined = openaiJson?.data?.[0]?.revised_prompt
    if (!tempUrl) {
      return NextResponse.json({ error: "No image returned from OpenAI" }, { status: 502 })
    }

    // ---------- 2. Upload to Cloudinary (Cloudinary fetches the URL directly) ----------
    const timestamp = Math.floor(Date.now() / 1000)
    const safeTitle = storyTitle
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "cover"
    const publicId = `${safeTitle}-${timestamp}`
    const folder = "storyloom/book-covers"

    // Cloudinary signature: sha1 of alphabetically-sorted params + api_secret
    const paramsToSign: Record<string, string> = {
      folder,
      public_id: publicId,
      timestamp: String(timestamp),
    }
    const toSign = Object.keys(paramsToSign)
      .sort()
      .map((k) => `${k}=${paramsToSign[k]}`)
      .join("&")
    const signature = crypto
      .createHash("sha1")
      .update(toSign + cloudSecret)
      .digest("hex")

    const form = new FormData()
    form.append("file", tempUrl) // Cloudinary fetches the DALL-E URL server-side
    form.append("api_key", cloudKey)
    form.append("timestamp", String(timestamp))
    form.append("signature", signature)
    form.append("folder", folder)
    form.append("public_id", publicId)

    const cloudRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body: form }
    )

    if (!cloudRes.ok) {
      const errText = await cloudRes.text()
      console.error("Cloudinary error:", errText)
      // The DALL-E URL still works for ~60 minutes, return it so the UI isn't broken.
      return NextResponse.json({
        url: tempUrl,
        cloudinaryFailed: true,
        detail: errText,
        revisedPrompt,
      })
    }

    const cloudJson = await cloudRes.json()

    return NextResponse.json({
      url: cloudJson.secure_url,
      publicId: cloudJson.public_id,
      width: cloudJson.width,
      height: cloudJson.height,
      theme,
      revisedPrompt, // DALL-E 3 rewrites the prompt internally — useful to log/show
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    console.error("generate-image route error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
