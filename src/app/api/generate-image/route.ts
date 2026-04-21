import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { prompt } = body

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid prompt' },
        { status: 400 }
      )
    }

    console.log('Generating image with DALL-E 3...')

    // Enhanced prompt for children's book cover quality
    const enhancedPrompt = `${prompt}

Art style: Professional children's book illustration, Disney-Pixar quality, vibrant colors, soft lighting, whimsical and magical atmosphere, high detail, masterpiece quality, suitable for a published children's book cover.`

    // Use DALL-E 3 for highest quality images
    const response = await openai.images.generate({
      model: "dall-e-3", // Using DALL-E 3 for highest quality
      prompt: enhancedPrompt,
      size: "1024x1024", // High resolution
      quality: "standard", // Standard quality is usually sufficient and faster
      style: "vivid", // More vibrant and hyper-real images
      n: 1,
    })

    const imageUrl = response.data[0]?.url

    if (!imageUrl) {
      throw new Error('No image URL returned from DALL-E 3')
    }

    console.log('Image generated successfully with DALL-E 3')

    return NextResponse.json({
      imageUrl,
      model: 'dall-e-3',
      size: '1024x1024',
      quality: 'standard',
      style: 'vivid'
    })

  } catch (error) {
    console.error('Image generation error:', error)
    
    // Handle specific OpenAI errors
    if (error instanceof Error) {
      if (error.message.includes('content_policy')) {
        return NextResponse.json(
          { 
            error: 'Content not allowed',
            details: 'The image prompt was rejected by content policy. Please try a different description.'
          },
          { status: 400 }
        )
      }
      
      if (error.message.includes('rate_limit')) {
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded',
            details: 'Too many requests. Please wait a moment and try again.'
          },
          { status: 429 }
        )
      }
    }
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to generate image',
        details: 'Image generation failed using DALL-E 3'
      },
      { status: 500 }
    )
  }
}
