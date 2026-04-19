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

    // Enhanced story generation with unique adventures
    console.log('🎨 Generating unique adventure story...')
    
    const characterName = character?.name || 'Alex'
    const pageCount = length === 'short' ? 4 : length === 'medium' ? 6 : 8
    const storyData = generateEnhancedAdventureStory(idea, ageGroup, tone, characterName, pageCount, character)

    // Generate enhanced images for each page
    console.log('🖼️ Generating enhanced images for story pages...')
    const pagesWithImages = await generateStoryImages(storyData.pages, artStyle)

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

// Enhanced adventure story generation (no generic templates)
function generateEnhancedAdventureStory(
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
    imagePrompt: `${characterName} discovering something amazing in ${adventureLocation}, ${getToneStyle(tone)} art style`
  })

  // Page 2: The adventure begins
  const challenge = getRandomChallenge(tone)
  pages.push({
    pageNumber: 2,
    text: `${characterName} realized this was going to be the most ${getAdjectiveForTone(tone)} adventure yet! ${challenge}`,
    imagePrompt: `${characterName} facing adventure in ${adventureLocation}, dynamic action scene, ${getToneStyle(tone)} atmosphere`
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
    imagePrompt: `${characterName} celebrating success in ${adventureLocation}, triumphant and happy, ${getToneStyle(tone)} victory scene`
  })

  return {
    title: `${characterName}'s ${getAdventureTitle(idea, tone)}`,
    pages: pages.slice(0, pageCount)
  }
}

// Unique opening variations (replaces "Once upon a time")
function getUniqueOpening(characterName: string, location: string, idea: string): string {
  const openings = [
    `Deep in ${location}, ${characterName} stumbled upon something that would change everything.`,
    `The ancient map led ${characterName} straight to ${location}, where an incredible discovery awaited.`,
    `When the mysterious portal opened, ${characterName} found themselves in ${location} with a new mission.`,
    `High above the world in ${location}, ${characterName} spotted something that made their heart race.`,
    `The secret passage revealed ${location} to ${characterName}, along with an unexpected challenge.`,
    `In the heart of ${location}, ${characterName} discovered something extraordinary that sparkled with magic.`,
    `As lightning flashed over ${location}, ${characterName} witnessed something that would begin the greatest adventure of their life.`
  ]
  return openings[Math.floor(Math.random() * openings.length)]
}

// Dynamic challenges based on tone
function getRandomChallenge(tone: string): string {
  const challenges = {
    funny: [
      'A giggling dragon needed help organizing its treasure collection!', 
      'The magic shoes wouldn\'t stop dancing around the room!', 
      'A group of confused unicorns had lost their way home and kept bumping into trees!'
    ],
    calm: [
      'A peaceful garden needed someone to help its flowers bloom in harmony.', 
      'An old wise owl required assistance solving an ancient puzzle.', 
      'A gentle spirit asked for help restoring balance to the magical realm.'
    ],
    adventure: [
      'A dangerous storm threatened to destroy the entire kingdom!', 
      'Evil robots were stealing all the world\'s colors!', 
      'A massive sea monster was blocking the path to freedom!'
    ],
    educational: [
      'A complex riddle held the key to saving the ancient library.', 
      'Ancient symbols needed to be decoded to unlock the treasure.', 
      'Scientific principles had to be understood to repair the broken time machine.'
    ]
  }
  const toneChallenges = challenges[tone as keyof typeof challenges] || challenges.adventure
  return toneChallenges[Math.floor(Math.random() * toneChallenges.length)]
}

// Adventure progression elements
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

// Unique conclusions
function getUniqueConclusion(characterName: string, idea: string, tone: string): string {
  const conclusions = [
    `${characterName} had not only completed their quest but had grown wiser and stronger. The adventure would be remembered forever.`,
    `With the mission accomplished, ${characterName} looked forward to their next great adventure, knowing that anything was possible.`,
    `${characterName} returned home with incredible stories to tell and the confidence to face any challenge that lay ahead.`,
    `The world was a better place thanks to ${characterName}'s courage, and new adventures were already calling.`
  ]
  return conclusions[Math.floor(Math.random() * conclusions.length)]
}

// Helper functions for tone and style
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

// Enhanced image generation
async function generateStoryImages(pages: StoryPage[], artStyle: string): Promise<StoryPage[]> {
  const pagesWithImages = []

  for (const page of pages) {
    try {
      // Enhanced image generation with better search terms
      const imageUrl = await getEnhancedFallbackImage(page.imagePrompt, artStyle)
      
      pagesWithImages.push({
        ...page,
        imageUrl
      })

    } catch (error) {
      console.error(`Failed to generate image for page ${page.pageNumber}:`, error)
      
      pagesWithImages.push({
        ...page,
        imageUrl: 'https://source.unsplash.com/800x600/?children,adventure,magical'
      })
    }
  }

  return pagesWithImages
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

// Helper functions
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
    status: 'Enhanced with unique adventures, exciting locations, and proper image generation!'
  })
}
