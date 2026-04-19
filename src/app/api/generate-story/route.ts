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
    console.log('🌟 StoryLoom API: Generating unique adventure story...')
    
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

    // Generate unique adventure story using Claude AI
    console.log('🎨 Generating unique adventure story with AI...')
    
    const storyData = await generateRealStory(idea, ageGroup, tone, length, character, claudeApiKey)

    // Generate real images for each page using AI
    console.log('🖼️ Generating AI images for story pages...')
    
    const pagesWithImages = await generateStoryImages(storyData.pages, artStyle, falApiKey)

    const response: StoryResponse = {
      id: generateStoryId(),
      title: storyData.title,
      pages: pagesWithImages,
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

    console.log('✅ Unique adventure story generated successfully!', response.title)
    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Story generation error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Generate real story using Claude AI with unique adventure prompts
async function generateRealStory(
  idea: string,
  ageGroup: string,
  tone: string,
  length: string,
  character?: { name?: string; age?: string; appearance?: string },
  claudeApiKey?: string
) {
  const characterName = character?.name || 'Alex'
  const pageCount = length === 'short' ? 4 : length === 'medium' ? 6 : 8

  // Create unique adventure story prompt that avoids generic templates
  const storyPrompt = createAdventureStoryPrompt(idea, ageGroup, tone, characterName, pageCount, character)

  try {
    if (!claudeApiKey) {
      throw new Error('Claude API key not available')
    }

    // Use real Claude API for story generation
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: storyPrompt
        }]
      })
    })

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`)
    }

    const aiResponse = await response.json()
    const storyContent = aiResponse.content[0].text

    // Parse the AI response to extract structured story data
    return parseAIStoryResponse(storyContent, characterName)

  } catch (error) {
    console.error('AI story generation failed, using enhanced fallback:', error)
    return generateEnhancedFallbackStory(idea, ageGroup, tone, characterName, pageCount, character)
  }
}

// Create unique adventure story prompts (no more generic templates)
function createAdventureStoryPrompt(
  idea: string,
  ageGroup: string,
  tone: string,
  characterName: string,
  pageCount: number,
  character?: { name?: string; age?: string; appearance?: string }
): string {
  const adventureTones = {
    funny: 'hilarious and silly',
    calm: 'peaceful and thoughtful',
    adventure: 'exciting and thrilling',
    educational: 'learning-focused and discovery-filled'
  }

  const uniqueStarterPhrases = [
    `In the heart of the ${getRandomLocation()}, ${characterName} discovered something extraordinary`,
    `High above the clouds in ${getRandomLocation()}, ${characterName} spotted a mysterious`,
    `Deep beneath the waves of ${getRandomLocation()}, ${characterName} found a hidden`,
    `At the edge of ${getRandomLocation()}, ${characterName} heard a strange sound that led to`,
    `While exploring the ancient ${getRandomLocation()}, ${characterName} stumbled upon`,
    `In the magical realm of ${getRandomLocation()}, ${characterName} met a creature who needed help with`,
    `During a thunderstorm over ${getRandomLocation()}, ${characterName} witnessed something that changed everything`
  ]

  const randomStarter = uniqueStarterPhrases[Math.floor(Math.random() * uniqueStarterPhrases.length)]

  return `Create a ${adventureTones[tone as keyof typeof adventureTones]} children's adventure story for ages ${ageGroup}. 

STORY REQUIREMENTS:
- Start with this unique opening: "${randomStarter}"
- Central idea: ${idea}
- Main character: ${characterName}${character?.appearance ? ` (${character.appearance})` : ''}
- Must be exactly ${pageCount} pages
- Each page should have 2-3 sentences maximum
- NO generic openings like "Once upon a time" or fairy tale clichés
- NO boring locations like "backyard" or "bedroom" - use exciting adventure settings
- Focus on unique discoveries, magical encounters, and thrilling exploration
- Include specific sensory details and vivid descriptions
- End with a satisfying resolution that shows character growth

FORMAT your response as JSON:
{
  "title": "Creative Adventure Title",
  "pages": [
    {
      "pageNumber": 1,
      "text": "Story text here...",
      "imagePrompt": "Detailed visual description for AI image generation"
    },
    ...
  ]
}

Make this story truly unique and exciting - something children will remember forever!`
}

// Generate diverse adventure locations (no more "backyard")
function getRandomLocation(): string {
  const adventureLocations = [
    'Crystal Caverns of Mount Starlight',
    'Floating Islands of Nimbus Valley',
    'Underwater City of Coral Dreams',
    'Ancient Forest of Whispering Trees',
    'Sky Palace Among the Northern Lights',
    'Hidden Valley of Dancing Waterfalls',
    'Clockwork Desert of Golden Gears',
    'Ice Castle of the Polar Winds',
    'Volcano Island of Fire Flowers',
    'Secret Garden of Rainbow Butterflies',
    'Underground Kingdom of Glowing Mushrooms',
    'Starship Nebula Station',
    'Dragon\'s Lair in the Mystic Mountains',
    'Pirate Ship Floating in Cloud Seas',
    'Time Travel Library of Lost Stories',
    'Robot City of Tomorrow',
    'Mermaid Kingdom in the Deep Blue',
    'Wizard\'s Tower in the Storm Clouds',
    'Fairy Village in the Giant Sunflower Field',
    'Space Adventure on Planet Zephyr'
  ]
  
  return adventureLocations[Math.floor(Math.random() * adventureLocations.length)]
}

// Parse AI response into structured format
function parseAIStoryResponse(content: string, characterName: string) {
  try {
    // Try to parse JSON response from AI
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.title && parsed.pages) {
        return parsed;
      }
    }
  } catch (error) {
    console.log('Failed to parse AI JSON, extracting manually');
  }

  // Fallback: extract title and content manually
  const lines = content.split('\n').filter(line => line.trim());
  const title = extractTitle(lines, characterName);
  const pages = extractPages(lines);

  return { title, pages };
}

// Enhanced fallback with unique adventures (no generic templates)
function generateEnhancedFallbackStory(
  idea: string,
  ageGroup: string,
  tone: string,
  characterName: string,
  pageCount: number,
  character?: { name?: string; age?: string; appearance?: string }
) {
  const adventureLocation = getRandomLocation()
  const uniqueOpening = getUniqueOpening(characterName, adventureLocation, idea)
  
  const pages: StoryPage[] = []

  // Page 1: Unique opening (no "Once upon a time")
  pages.push({
    pageNumber: 1,
    text: uniqueOpening,
    imagePrompt: `${characterName} ${character?.appearance ? `with ${character.appearance}` : 'looking excited'} discovering something amazing in ${adventureLocation}, ${getToneStyle(tone)} art style`
  })

  // Page 2: The adventure begins
  const challenge = getRandomChallenge(tone)
  pages.push({
    pageNumber: 2,
    text: `${characterName} realized this was going to be the most ${getAdjectiveForTone(tone)} adventure yet! ${challenge}`,
    imagePrompt: `${characterName} facing ${challenge.toLowerCase()} in ${adventureLocation}, dynamic action scene, ${getToneStyle(tone)} atmosphere`
  })

  // Middle pages: Adventure progression
  for (let i = 3; i <= pageCount - 1; i++) {
    const adventureElement = getRandomAdventureElement(i, tone)
    pages.push({
      pageNumber: i,
      text: adventureElement.text.replace('{character}', characterName).replace('{location}', adventureLocation),
      imagePrompt: adventureElement.imagePrompt.replace('{character}', characterName).replace('{location}', adventureLocation)
    })
  }

  // Final page: Triumphant conclusion
  const conclusion = getUniqueConclusion(characterName, idea, tone)
  pages.push({
    pageNumber: pageCount,
    text: conclusion,
    imagePrompt: `${characterName} celebrating success in ${adventureLocation}, triumphant and happy, ${getToneStyle(tone)} victory scene with magical sparkles`
  })

  return {
    title: `${characterName}'s ${getAdventureTitle(idea, tone)}`,
    pages: pages.slice(0, pageCount)
  }
}

function getUniqueOpening(characterName: string, location: string, idea: string): string {
  const openings = [
    `Deep in ${location}, ${characterName} stumbled upon something that would change everything.`,
    `The ancient map led ${characterName} straight to ${location}, where an incredible discovery awaited.`,
    `When the mysterious portal opened, ${characterName} found themselves in ${location} with a new mission.`,
    `High above the world in ${location}, ${characterName} spotted something that made their heart race.`,
    `The secret passage revealed ${location} to ${characterName}, along with an unexpected challenge.`
  ]
  return openings[Math.floor(Math.random() * openings.length)]
}

function getRandomChallenge(tone: string): string {
  const challenges = {
    funny: ['A giggling dragon needed help organizing its treasure!', 'The magic shoes wouldn\'t stop dancing!', 'A group of confused unicorns had lost their way home!'],
    calm: ['A peaceful garden needed someone to help its flowers bloom.', 'An old wise owl required assistance solving an ancient puzzle.', 'A gentle spirit asked for help restoring harmony to the land.'],
    adventure: ['A dangerous storm threatened to destroy the entire kingdom!', 'Evil robots were stealing all the world\'s colors!', 'A massive sea monster was blocking the path to freedom!'],
    educational: ['A complex riddle held the key to saving the library.', 'Ancient symbols needed to be decoded to unlock the treasure.', 'Scientific principles had to be understood to repair the broken machine.']
  }
  const toneChallenges = challenges[tone as keyof typeof challenges] || challenges.adventure
  return toneChallenges[Math.floor(Math.random() * toneChallenges.length)]
}

function getRandomAdventureElement(pageNumber: number, tone: string) {
  const elements = [
    {
      text: 'Through determination and cleverness, {character} discovered a hidden pathway that sparkled with magic.',
      imagePrompt: '{character} walking through a magical glowing pathway in {location}, mystical and beautiful'
    },
    {
      text: '{character} made an unlikely friend who shared ancient wisdom about the mysteries of {location}.',
      imagePrompt: '{character} talking with a wise magical creature in {location}, friendly and enchanting scene'
    },
    {
      text: 'Using quick thinking and courage, {character} solved the puzzle that had stumped adventurers for centuries.',
      imagePrompt: '{character} solving a complex magical puzzle in {location}, focused and determined'
    },
    {
      text: 'The power within {character} grew stronger as they learned to trust their instincts and believe in themselves.',
      imagePrompt: '{character} glowing with inner strength and confidence in {location}, empowering and inspiring'
    }
  ]
  return elements[Math.floor(Math.random() * elements.length)]
}

function getUniqueConclusion(characterName: string, idea: string, tone: string): string {
  const conclusions = [
    `${characterName} had not only completed their quest but had grown wiser and stronger. The adventure would be remembered forever.`,
    `With the mission accomplished, ${characterName} looked forward to their next great adventure, knowing that anything was possible.`,
    `${characterName} returned home with incredible stories to tell and the confidence to face any challenge that lay ahead.`,
    `The world was a better place thanks to ${characterName}'s courage, and new adventures were already calling.`
  ]
  return conclusions[Math.floor(Math.random() * conclusions.length)]
}

function getAdjectiveForTone(tone: string): string {
  const adjectives = {
    funny: 'hilarious',
    calm: 'peaceful',
    adventure: 'thrilling',
    educational: 'fascinating'
  }
  return adjectives[tone as keyof typeof adjectives] || 'amazing'
}

function getAdventureTitle(idea: string, tone: string): string {
  const titleTypes = [
    'Quest for the',
    'Adventure in the',
    'Mystery of the',
    'Journey to the',
    'Secret of the',
    'Discovery at the'
  ]
  const randomTitle = titleTypes[Math.floor(Math.random() * titleTypes.length)]
  return `${randomTitle} ${idea}`
}

function getToneStyle(tone: string): string {
  const styles = {
    funny: 'colorful and whimsical',
    calm: 'soft and peaceful',
    adventure: 'dynamic and exciting',
    educational: 'detailed and inspiring'
  }
  return styles[tone as keyof typeof styles] || 'colorful and engaging'
}

// Generate real AI images using Fal.AI (or fallback to enhanced Unsplash)
async function generateStoryImages(pages: StoryPage[], artStyle: string, falApiKey?: string): Promise<StoryPage[]> {
  const pagesWithImages = []

  for (const page of pages) {
    try {
      let imageUrl: string

      if (falApiKey) {
        // Try real AI image generation with Fal.AI
        imageUrl = await generateAIImage(page.imagePrompt, artStyle, falApiKey)
      } else {
        // Enhanced fallback with better image search
        imageUrl = await getEnhancedFallbackImage(page.imagePrompt, artStyle)
      }

      pagesWithImages.push({
        ...page,
        imageUrl
      })

    } catch (error) {
      console.error(`Failed to generate image for page ${page.pageNumber}:`, error)
      
      // Use enhanced fallback image
      const fallbackImageUrl = await getEnhancedFallbackImage(page.imagePrompt, artStyle)
      
      pagesWithImages.push({
        ...page,
        imageUrl: fallbackImageUrl
      })
    }
  }

  return pagesWithImages
}

// Real AI image generation using Fal.AI
async function generateAIImage(prompt: string, artStyle: string, falApiKey: string): Promise<string> {
  const stylePrompt = getImageStylePrompt(artStyle)
  const fullPrompt = `${prompt}, ${stylePrompt}, children's book illustration, high quality, detailed`

  const response = await fetch('https://fal.run/fal-ai/fast-sdxl', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${falApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt: fullPrompt,
      image_size: 'landscape_4_3',
      num_inference_steps: 25,
      guidance_scale: 7.5,
      num_images: 1,
      enable_safety_checker: true
    })
  })

  if (!response.ok) {
    throw new Error(`Fal.AI API error: ${response.status}`)
  }

  const result = await response.json()
  return result.images[0].url
}

// Enhanced fallback images with better search terms
async function getEnhancedFallbackImage(prompt: string, artStyle: string): Promise<string> {
  // Extract key visual elements from the prompt
  const keywords = extractImageKeywords(prompt, artStyle)
  
  // Use Unsplash with enhanced search terms
  const searchQuery = keywords.join(',')
  const unsplashUrl = `https://source.unsplash.com/800x600/?${encodeURIComponent(searchQuery)}&children,illustration,colorful`
  
  return unsplashUrl
}

function extractImageKeywords(prompt: string, artStyle: string): string[] {
  const keywords = ['children', 'illustration', artStyle, 'colorful', 'magical']
  
  // Extract meaningful words from prompt
  const words = prompt.toLowerCase().split(' ')
  const importantWords = words.filter(word => 
    word.length > 3 && 
    !['with', 'the', 'and', 'looking', 'scene', 'style', 'atmosphere'].includes(word)
  )
  
  // Add the first few important words
  keywords.push(...importantWords.slice(0, 3))
  
  return keywords
}

function getImageStylePrompt(artStyle: string): string {
  const stylePrompts = {
    cartoon: 'cartoon style, bright colors, playful, animated look',
    watercolor: 'watercolor painting, soft brushstrokes, gentle colors, artistic',
    sketch: 'pencil sketch style, hand-drawn, detailed linework, artistic shading'
  }
  return stylePrompts[artStyle as keyof typeof stylePrompts] || stylePrompts.cartoon
}

// Helper functions
function extractTitle(lines: string[], characterName: string): string {
  for (const line of lines) {
    if (line.includes('title') || line.includes('Title')) {
      return line.replace(/.*title[":]*\s*/i, '').replace(/[",].*/, '').trim()
    }
  }
  return `${characterName}'s Amazing Adventure`
}

function extractPages(lines: string[]): StoryPage[] {
  const pages: StoryPage[] = []
  let currentPage = 1
  
  for (const line of lines) {
    if (line.trim() && !line.includes('title') && !line.includes('{')) {
      if (pages.length < 8) { // Limit pages
        pages.push({
          pageNumber: currentPage++,
          text: line.trim(),
          imagePrompt: `Illustration for: ${line.trim()}`
        })
      }
    }
  }
  
  return pages
}

function generateStoryId(): string {
  return `story_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    message: 'StoryLoom API - Enhanced Story Generation Endpoint',
    endpoints: {
      POST: '/api/generate-story → Generate a new adventure story',
    },
    version: '2.0.0',
    status: 'Enhanced with real AI generation, unique adventures, and proper image generation!'
  })
}
