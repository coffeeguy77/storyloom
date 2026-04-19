import { NextRequest, NextResponse } from 'next/server'

// Types for request and response
interface StoryRequest {
    idea: string
    ageGroup: '3-5' | '6-8' | '9-12'
    tone: 'funny' | 'calm' | 'adventure' | 'educational'
    length: 'short' | 'medium' | 'long'
    artStyle: 'cartoon' | 'watercolor' | 'sketch'
    character?: {
          name?: string
          age?: string
          appearance?: string
        }
  }

interface StoryPage {
    pageNumber: number
    text: string
    imagePrompt: string
    imageUrl?: string
  }

interface StoryResponse {
    id: string
    title: string
    pages: StoryPage[]
    metadata: {
          ageGroup: string
          tone: string
          length: string
          artStyle: string
          character?: any
          createdAt: string
        }
    success: boolean
  }

export async function POST(request: NextRequest) {
    try {
          console.log('🎬 StoryLoom API: Generating story...')

          const body: StoryRequest = await request.json()
          const { idea, ageGroup, tone, length, artStyle, character } = body

          // Validate required fields
          if (!idea?.trim()) {
                  return NextResponse.json(
                            { success: false, error: 'Story idea is required' },
                            { status: 400 }
                          )
                }

          // Get API keys from environment variables
          const claudeApiKey = process.env.ANTHROPIC_API_KEY
          const falApiKey = process.env.FAL_API_KEY

          if (!claudeApiKey) {
                  console.error('Missing ANTHROPIC_API_KEY')
                  return NextResponse.json(
                            { success: false, error: 'API configuration missing' },
                            { status: 500 }
                          )
                }

          // For now, return a demo story until Claude 3 integration is complete
          console.log('📝 Generating demo story...')

          const demoStory = createDemoStory(idea, ageGroup, tone, length, character)

          const response: StoryResponse = {
                  id: generateStoryId(),
                  title: demoStory.title,
                  pages: demoStory.pages,
                  metadata: {
                            ageGroup,
                            tone,
                            length,
                            artStyle,
                            character: character || null,
                            createdAt: new Date().toISOString()
                          },
                  success: true
                }

          console.log('✅ Demo story generated successfully:', response.title)
          return NextResponse.json(response)

        } catch (error) {
          console.error('❌ Story generation error:', error)
          return NextResponse.json(
                  { success: false, error: 'Internal server error' },
                  { status: 500 }
                )
        }
  }

// Create a demo story for testing
function createDemoStory(
    idea: string, 
    ageGroup: string, 
    tone: string, 
    length: string,
    character?: { name?: string; age?: string; appearance?: string }
  ) {
    const pageCount = length === 'short' ? 4 : length === 'medium' ? 6 : 8
    const characterName = character?.name || 'Luna'

    const pages: StoryPage[] = [
          {
                  pageNumber: 1,
                  text: `Once upon a time, there was a brave little ${characterName} who had a wonderful idea: ${idea}`,
                  imagePrompt: `A cheerful ${characterName} with ${character?.appearance || 'bright eyes and a warm smile'} looking excited about an adventure`
                },
          {
                  pageNumber: 2,
                  text: `${characterName} decided to start this amazing adventure with determination and joy.`,
                  imagePrompt: `${characterName} beginning an exciting journey, ${tone} atmosphere`
                },
          {
                  pageNumber: 3,
                  text: `Along the way, ${characterName} discovered many wonderful things and met friendly creatures.`,
                  imagePrompt: `${characterName} meeting friendly animals and discovering magical things`
                },
          {
                  pageNumber: 4,
                  text: `In the end, ${characterName}'s idea came true, and everyone lived happily ever after!`,
                  imagePrompt: `A happy ending with ${characterName} celebrating success with friends`
                }
        ]

    // Add more pages for medium/long stories
    if (pageCount > 4) {
          pages.push({
                  pageNumber: 5,
                  text: `${characterName} learned important lessons and grew wiser from the experience.`,
                  imagePrompt: `${characterName} looking thoughtful and wise, surrounded by symbols of learning`
                })
        }

    if (pageCount > 5) {
          pages.push({
                  pageNumber: 6,
                  text: `The adventure continued with even more exciting discoveries ahead!`,
                  imagePrompt: `${characterName} looking toward new horizons, ready for more adventures`
                })
        }

    return {
          title: `${characterName}'s ${tone.charAt(0).toUpperCase() + tone.slice(1)} Adventure`,
          pages: pages.slice(0, pageCount)
        }
  }

// Generate unique story ID
function generateStoryId(): string {
    return `story_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

// GET endpoint (for testing)
                 export async function GET() {
                     return NextResponse.json({
                           message: 'StoryLoom API - Story Generation Endpoint',
                           endpoints: {
                                   POST: '/api/generate-story - Generate a new story',
                                 },
                           version: '1.0.0',
                           status: 'Demo Mode - Real Claude 3 integration coming soon!'
                         })
                   }
