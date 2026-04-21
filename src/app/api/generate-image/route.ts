// src/app/api/generate-image/route.ts
//
// Image generation endpoint. Uses DALL-E 3 at STANDARD quality only (per request).
//
// Accepts: { prompt: string, size?: "1024x1024" | "1792x1024" | "1024x1792" }
// Returns: { imageUrl: string }

import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is missing OPENAI_API_KEY" },
      { status: 500 }
    )
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    )
  }

  const prompt: string | undefined =
    typeof body?.prompt === "string" && body.prompt.trim()
      ? body.prompt
      : typeof body?.imagePrompt === "string" && body.imagePrompt.trim()
      ? body.imagePrompt
      : undefined

  if (!prompt) {
    return NextResponse.json(
      { error: "Request must include a `prompt` string." },
      { status: 400 }
    )
  }

  const size: "1024x1024" | "1792x1024" | "1024x1792" =
    body?.size === "1792x1024" || body?.size === "1024x1792"
      ? body.size
      : "1024x1024"

  try {
    const openaiRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        n: 1,
        size,
        quality: "standard", // standard quality as requested
        style: "vivid",
        response_format: "url",
      }),
    })

    if (!openaiRes.ok) {
      const errText = await openaiRes.text()
      console.error("OpenAI image API error:", openaiRes.status, errText)
      return NextResponse.json(
        {
          error: "OpenAI image generation failed",
          status: openaiRes.status,
          detail: errText.slice(0, 500),
        },
        { status: 502 }
      )
    }

    const data = await openaiRes.json()
    const imageUrl: string | undefined = data?.data?.[0]?.url

    if (!imageUrl) {
      return NextResponse.json(
        { error: "OpenAI returned no image URL" },
        { status: 502 }
      )
    }

    return NextResponse.json({ imageUrl })
  } catch (err: any) {
    console.error("generate-image unexpected error:", err)
    return NextResponse.json(
      { error: "Unexpected server error", detail: String(err?.message ?? err) },
      { status: 500 }
    )
  }
}
