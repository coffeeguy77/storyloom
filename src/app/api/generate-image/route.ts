import { NextRequest, NextResponse } from 'next/server'

interface ImageGenerationRequest {
  prompt: string
  style?: string
  size?: string
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, style = 'children-book-illustration', size = '1024x1024' } = await request.json() as ImageGenerationRequest

    console.log('🎨 AI Image generation request:', { prompt, style, size })

    // Validate OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY not found in environment variables')
      return NextResponse.json({
        success: false,
        error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables.'
      }, { status: 500 })
    }

    // Enhanced prompt specifically for high-quality children's book illustrations
    const enhancedPrompt = `A vibrant, detailed children's storybook illustration: ${prompt}. 
    Style: Colorful, whimsical, child-friendly cartoon illustration with smooth gradients and soft lighting. 
    Art style: Digital painting, bright and cheerful colors, enchanting atmosphere, professional children's book quality. 
    Safe for children, magical and engaging, storybook art style similar to popular children's book illustrations.`

    try {
      console.log('🚀 Calling OpenAI DALL-E 3 API...')
      
      const openaiResponse = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: enhancedPrompt,
          n: 1,
          size: size as '1024x1024' | '1792x1024' | '1024x1792',
          quality: 'standard', // 'hd' for higher quality but slower/more expensive
          style: 'vivid' // 'vivid' for more dramatic, 'natural' for more realistic
        }),
      })

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text()
        console.error('❌ OpenAI API error:', openaiResponse.status, errorText)
        throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorText}`)
      }

      const openaiData = await openaiResponse.json()
      console.log('✅ OpenAI API response received')
      
      if (openaiData.data && openaiData.data[0]?.url) {
        console.log('🎉 AI image generated successfully with DALL-E 3')
        
        return NextResponse.json({
          success: true,
          imageUrl: openaiData.data[0].url,
          provider: 'dall-e-3',
          revisedPrompt: openaiData.data[0].revised_prompt || prompt
        })
      } else {
        console.error('❌ Invalid OpenAI response format:', openaiData)
        throw new Error('Invalid response format from OpenAI API')
      }

    } catch (openaiError) {
      console.error('❌ OpenAI API request failed:', openaiError)
      
      // Enhanced Unsplash fallback with better search terms
      console.log('🔄 Falling back to enhanced Unsplash...')
      try {
        // Create better search terms from the prompt
        const searchTerms = prompt
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(' ')
          .filter(word => word.length > 2)
          .slice(0, 3)
          .join(',')

        const fallbackUrl = `https://source.unsplash.com/1024x1024/?${searchTerms},children,illustration,cartoon,colorful,storybook&sig=${Date.now()}`
        
        console.log('✅ Using enhanced Unsplash fallback')
        return NextResponse.json({
          success: true,
          imageUrl: fallbackUrl,
          provider: 'unsplash-fallback',
          note: 'Using enhanced Unsplash fallback - OpenAI API temporarily unavailable'
        })
      } catch (fallbackError) {
        console.error('❌ Unsplash fallback failed:', fallbackError)
        throw openaiError // Throw original error if fallback also fails
      }
    }

  } catch (error) {
    console.error('❌ Image generation error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred during image generation'
    }, { status: 500 })
  }
}

// Optional: Add a GET endpoint for health check
export async function GET() {
  return NextResponse.json({
    status: 'AI Image Generation API Ready',
    provider: process.env.OPENAI_API_KEY ? 'OpenAI DALL-E 3' : 'Fallback only',
    timestamp: new Date().toISOString()
  })
}
