// src/lib/cloudinary.ts
//
// Server-side helper for signed Cloudinary uploads. Not a route — free to
// export. Both /api/generate-image and /api/regenerate-cover import from here.

import crypto from "node:crypto"

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
