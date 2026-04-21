// src/app/api/generate-image/route.ts
//
// Generates an image with DALL-E 3 standard, downloads the bytes while the
// OpenAI URL is still valid, and uploads them to Cloudinary for permanent
// storage. Returns the permanent Cloudinary URL.
//
// Accepts: { prompt: string, size?: "1024x1024" | "1792x1024" | "1024x1792" }
// Returns: { imageUrl: string }
//
// Required env vars:
//   OPENAI_API_KEY
//   CLOUDINARY_CLOUD_NAME
//   CLOUDINARY_API_KEY
//   CLOUDINARY_API_SECRET

import { NextRequest, NextResponse } from "next/server"
import crypto from "node:crypto"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const openaiKey = process.env.OPENAI_API_KEY
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const cloudKey = process.env.CLOUDINARY_API_KEY
  const cloudSecret = process.env.CLOUDINARY_API_SECRET

  if (!openaiKey) {
    return NextResponse.json({ error: "Server is missing OPENAI_API_KEY" }, { status: 500 })
  }
  if (!cloudName || !cloudKey || !cloudSecret) {
    return NextResponse.json(
      { error: "Server is missing CLOUDINARY_* env vars" },
      { status: 500 }
    )
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 })
  }

  const prompt: string | undefined =
    typeof body?.prompt === "string" && body.prompt.trim()
      ? body.prompt
      : typeof body?.imagePrompt === "string" && body.imagePrompt.trim()
      ? body.imagePrompt
      : undefined

  if (!prompt) {
    return NextResponse.json({ error: "Request must include a `prompt` string." }, { status: 400 })
  }

  const size: "1024x1024" | "1792x1024" | "1024x1792" =
    body?.size === "1792x1024" || body?.size === "1024x1792" ? body.size : "1024x1024"

  try {
    // ---- 1. Generate via DALL-E 3 --------------------------------------------
    const openaiRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        n: 1,
        size,
        quality: "standard",
        style: "vivid",
        response_format: "url",
      }),
    })

    if (!openaiRes.ok) {
      const errText = await openaiRes.text()
      console.error("OpenAI image API error:", openaiRes.status, errText)
      return NextResponse.json(
        { error: "OpenAI image generation failed", detail: errText.slice(0, 500) },
        { status: 502 }
      )
    }

    const openaiData = await openaiRes.json()
    const tempUrl: string | undefined = openaiData?.data?.[0]?.url
    if (!tempUrl) {
      return NextResponse.json({ error: "OpenAI returned no image URL" }, { status: 502 })
    }

    // ---- 2. Upload to Cloudinary --------------------------------------------
    // We upload via the URL directly — Cloudinary fetches from OpenAI's
    // expiring URL while it's still valid and stores the result permanently.
    const permanentUrl = await uploadToCloudinary({
      sourceUrl: tempUrl,
      cloudName,
      apiKey: cloudKey,
      apiSecret: cloudSecret,
      folder: "storyloom/covers",
    })

    return NextResponse.json({ imageUrl: permanentUrl })
  } catch (err: any) {
    console.error("generate-image unexpected error:", err)
    return NextResponse.json(
      { error: "Unexpected server error", detail: String(err?.message ?? err) },
      { status: 500 }
    )
  }
}

// -----------------------------------------------------------------------------
// Signed upload helper
// -----------------------------------------------------------------------------
export async function uploadToCloudinary(opts: {
  sourceUrl: string
  cloudName: string
  apiKey: string
  apiSecret: string
  folder?: string
}): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000)
  const folder = opts.folder ?? "storyloom/covers"

  // Cloudinary signature: SHA-1 of params sorted alphabetically, joined with &,
  // then appended with the api_secret. See:
  //   https://cloudinary.com/documentation/signatures
  const params: Record<string, string> = {
    folder,
    timestamp: String(timestamp),
  }
  const sigString =
    Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&") + opts.apiSecret
  const signature = crypto.createHash("sha1").update(sigString).digest("hex")

  const form = new FormData()
  form.append("file", opts.sourceUrl)         // Cloudinary fetches this URL
  form.append("api_key", opts.apiKey)
  form.append("timestamp", String(timestamp))
  form.append("folder", folder)
  form.append("signature", signature)

  const uploadUrl = `https://api.cloudinary.com/v1_1/${opts.cloudName}/image/upload`
  const uploadRes = await fetch(uploadUrl, { method: "POST", body: form })

  if (!uploadRes.ok) {
    const errText = await uploadRes.text()
    throw new Error(`Cloudinary upload failed: ${uploadRes.status} ${errText.slice(0, 300)}`)
  }

  const uploadData = await uploadRes.json()
  const secureUrl: string | undefined = uploadData?.secure_url
  if (!secureUrl) {
    throw new Error("Cloudinary upload returned no secure_url")
  }
  return secureUrl
}
