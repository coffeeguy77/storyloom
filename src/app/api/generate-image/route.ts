// src/app/api/generate-image/route.ts
//
// Generates an image with DALL-E 3 standard, uploads to Cloudinary for
// permanent storage, returns the permanent Cloudinary URL.
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
import { uploadToCloudinary } from "@/lib/cloudinary"

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
