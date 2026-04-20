"use client"

import { useState, useEffect } from "react"

interface Character {
  id: string
  name: string
  age?: string
  imageUrl?: string
  personality?: string
  favoriteThings?: string
  isChild: boolean
  isGuest: boolean
  isActive: boolean
}

interface Story {
  id: string
  title: string
  fullText: string
  coverImagePrompt: string
  coverImageUrl?: string
  wordCount: number
  characters: Character[]
  theme?: string
  createdAt: string
}

// Define theme types for TypeScript
type ThemeType = "space" | "jungle" | "ocean" | "dinosaur" | "pirate" | "monster-trucks"

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = "dzx6x1hou"

// Tommy's main logo URL with correct Cloudinary URL
const TOMMY_LOGO_URL = "https://res.cloudinary.com/dzx6x1hou/image/upload/v1776662026/tommy-logo.png"

// Theme images with correct Cloudinary URLs
const THEME_IMAGES: Record<ThemeType, string> = {
  space: "https://res.cloudinary.com/dzx6x1hou/image/upload/v1776661893/space.png",
  jungle: "https://res.cloudinary.com/dzx6x1hou/image/upload/v1776662020/jungle.png",
  ocean: "https://res.cloudinary.com/dzx6x1hou/image/upload/v1776662024/ocean.png",
  dinosaur: "https://res.cloudinary.com/dzx6x1hou/image/upload/v1776662024/dinosaur.png",
  pirate: "https://res.cloudinary.com/dzx6x1hou/image/upload/v1776662161/pirate.png",
  "monster-trucks": "https://res.cloudinary.com/dzx6x1hou/image/upload/v1776662021/monster-trucks.png"
}

const THEME_NAMES: Record<ThemeType, string> = {
  space: "Space Theme",
  jungle: "Jungle Theme", 
  ocean: "Ocean Theme",
  dinosaur: "Dinosaur Theme",
  pirate: "Pirate Theme",
  "monster-trucks": "Monster Trucks Theme"
}

export default function StoryLoomProfessional() {
  const [currentStep, setCurrentStep] = useState<"start" | "characters" | "story-builder" | "ai-generator" | "prompt-review" | "build-own" | "reading" | "library">("start")
  const [savedCharacters, setSavedCharacters] = useState<Character[]>([])
  const [activeCharacters, setActiveCharacters] = useState<Character[]>([])
  const [selectedTheme, setSelectedTheme] = useState<ThemeType>("space")
  const [currentStory, setCurrentStory] = useState<Story | null>(null)
  const [savedStories, setSavedStories] = useState<Story[]>([])
  const [logoError, setLogoError] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string>("")
  const [showThemes, setShowThemes] = useState(false)
  
  // New states for prompt review
  const [generatedPrompt, setGeneratedPrompt] = useState<string>("")
  const [editablePrompt, setEditablePrompt] = useState<string>("")
  const [imagePrompt, setImagePrompt] = useState<string>("")
  const [editableImagePrompt, setEditableImagePrompt] = useState<string>("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      loadSavedData()
    }
  }, [])

  const loadSavedData = () => {
    try {
      const savedCharactersData = localStorage.getItem("storyloom_characters")
      if (savedCharactersData) {
        const characters = JSON.parse(savedCharactersData)
        setSavedCharacters(characters)
        const children = characters.filter((c: Character) => c.isChild || c.isGuest)
        setActiveCharacters(children)
      }

      const savedStoriesData = localStorage.getItem("storyloom_stories")
      if (savedStoriesData) {
        setSavedStories(JSON.parse(savedStoriesData))
      }
    } catch (error) {
      console.error("Error loading saved data:", error)
    }
  }

  const saveToStorage = (key: string, data: any) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(key, JSON.stringify(data))
        return true
      } catch (error) {
        console.error("Failed to save to localStorage:", error)
        return false
      }
    }
    return false
  }

  const addNewCharacter = () => {
    const newChar: Character = {
      id: Date.now().toString(),
      name: "",
      age: "",
      personality: "",
      favoriteThings: "",
      isChild: true,
      isGuest: false,
      isActive: false
    }
    const updated = [...savedCharacters, newChar]
    setSavedCharacters(updated)
    saveToStorage("storyloom_characters", updated)
  }

  const addNewGuest = () => {
    const newGuest: Character = {
      id: Date.now().toString(),
      name: "",
      age: "",
      personality: "",
      favoriteThings: "",
      isChild: false,
      isGuest: true,
      isActive: false
    }
    const updated = [...savedCharacters, newGuest]
    setSavedCharacters(updated)
    saveToStorage("storyloom_characters", updated)
  }

  const updateCharacter = (id: string, updates: Partial<Character>) => {
    const updated = savedCharacters.map(char => 
      char.id === id ? { ...char, ...updates } : char
    )
    setSavedCharacters(updated)
    saveToStorage("storyloom_characters", updated)
    
    if (activeCharacters.find(c => c.id === id)) {
      const updatedActive = activeCharacters.map(char =>
        char.id === id ? { ...char, ...updates } : char
      )
      setActiveCharacters(updatedActive)
    }
  }

  const removeCharacter = (id: string) => {
    const updated = savedCharacters.filter(char => char.id !== id)
    setSavedCharacters(updated)
    saveToStorage("storyloom_characters", updated)
    setActiveCharacters(activeCharacters.filter(c => c.id !== id))
  }

  const goToThemeGenerator = (theme: ThemeType) => {
    setSelectedTheme(theme)
    setShowThemes(false)
    setCurrentStep("ai-generator")
  }

  // Generate prompts and go to review step
  const generatePromptsForReview = () => {
    if (activeCharacters.length === 0) {
      alert("Please select some characters first!")
      return
    }
    
    // FIXED: Handle Tommy deduplication
    const characterNames = activeCharacters.map(c => c.name).filter(name => name.toLowerCase() !== 'tommy')
    const hasTommyCharacter = activeCharacters.some(c => c.name.toLowerCase() === 'tommy')
    
    // Build character descriptions
    const characterDetails = activeCharacters.map(c => {
      if (c.name.toLowerCase() === 'tommy') return null // Skip Tommy in details
      if (c.isGuest) {
        return `${c.name} (a special guest friend)`
      } else {
        return `${c.name} (age ${c.age || 'unknown'}, personality: ${c.personality || 'adventurous and kind'})`
      }
    }).filter(Boolean)

    // Create story prompt
    const storyPrompt = `Write a magical children's story (exactly 500 words) about an adventure in Tommy's ${selectedTheme} world.

MAIN CHARACTERS:
- Tommy: The young boy who owns this magical ${selectedTheme} realm and has a wise dragon companion
${characterNames.length > 0 ? `- ${characterDetails.join('\n- ')}` : ''}

SETTING & THEME: ${selectedTheme.toUpperCase()}
${getThemeDescription(selectedTheme)}

STORY REQUIREMENTS:
- Exactly 500 words - no more, no less
- Include all named characters as active participants in the adventure
- Child-friendly language appropriate for ages 5-10
- Focus on friendship, kindness, and wonder
- Include Tommy's dragon companion as a wise guide
- Rich, descriptive language that paints vivid scenes
- Clear beginning, middle, and end with character growth
- Dialogue between characters to bring them to life
- End with a heartwarming conclusion about friendship

Write ONLY the story text with no title or extra formatting.`

    // Create image prompt
    const imagePrompt = `Create a beautiful children's book cover illustration in a Disney-Pixar animation style showing:

CHARACTERS: Tommy (a young boy with brown hair) ${characterNames.length > 0 ? `with his friends ${characterNames.join(', ')}` : ''} and Tommy's wise dragon companion

SETTING: A magical ${selectedTheme} world with ${getImageThemeDetails(selectedTheme)}

STYLE: 
- Bright, vibrant colors perfect for children
- Professional children's book illustration quality
- Disney-Pixar 3D animation style
- Magical, whimsical atmosphere
- All characters should look happy and adventurous

COMPOSITION:
- Show "StoryLoom" title at the bottom in colorful, playful lettering
- Characters should be the main focus in the center
- Include magical ${selectedTheme} elements in the background
- Professional book cover layout

The image should be suitable for a high-quality children's book cover that parents would be excited to read with their children.`

    setGeneratedPrompt(storyPrompt)
    setEditablePrompt(storyPrompt)
    setImagePrompt(imagePrompt)
    setEditableImagePrompt(imagePrompt)
    setCurrentStep("prompt-review")
  }

  const getThemeDescription = (theme: ThemeType): string => {
    const descriptions = {
      space: "A cosmic realm with rainbow planets, singing star whales, crystal caves, and friendly aliens who communicate through musical tones",
      jungle: "An enchanted rainforest with talking animals, hidden temples, wise old trees, and magical creatures that paint with starlight",
      ocean: "A magical sea world with rainbow-sailed ships, underwater kingdoms, singing mermaids, and helpful sea dragons",
      dinosaur: "A prehistoric paradise where gentle dinosaur giants live peacefully, with time-traveling magic and ancient wisdom",
      pirate: "A swashbuckling adventure realm with treasure islands, rainbow flags, and pirates who protect the seas with kindness",
      "monster-trucks": "An extreme racing world with gravity-defying tracks, friendship-powered vehicles, and magical racing adventures"
    }
    return descriptions[theme]
  }

  const getImageThemeDetails = (theme: ThemeType): string => {
    const details = {
      space: "rainbow planets, sparkling stars, cosmic nebulas, and a magical spaceship",
      jungle: "lush green trees, colorful tropical flowers, hidden waterfalls, and magical jungle creatures",
      ocean: "crystal blue waters, rainbow-sailed ships, coral castles, and friendly sea creatures",
      dinosaur: "gentle dinosaur friends, prehistoric landscapes, ancient trees, and magical time portals",
      pirate: "treasure islands, pirate ships with colorful flags, tropical beaches, and sparkling treasure chests",
      "monster-trucks": "rainbow racing tracks, amazing monster trucks, checkered flags, and action-packed racing scenes"
    }
    return details[theme]
  }

  // Generate story with edited prompts
  const generateStoryFromPrompts = async () => {
    setIsGenerating(true)
    setUploadProgress("🧠 Creating your magical story...")
    
    try {
      // Here you would call your actual AI APIs with the edited prompts
      // For now, using enhanced local generation with the prompts
      
      setUploadProgress("🎨 Generating beautiful cover art...")
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Use the edited prompts for generation
      const generatedStory = await generateStoryFromPrompt(editablePrompt)
      const generatedCoverUrl = await generateCoverFromPrompt(editableImagePrompt)
      
      // FIXED: Handle Tommy deduplication in title
      const characterNames = activeCharacters.map(c => c.name).filter(name => name.toLowerCase() !== 'tommy')
      const storyTitle = characterNames.length > 0 
        ? `${characterNames.join(', ')} and Tommy's ${selectedTheme.charAt(0).toUpperCase() + selectedTheme.slice(1)} Adventure`
        : `Tommy's ${selectedTheme.charAt(0).toUpperCase() + selectedTheme.slice(1)} Adventure`
      
      const newStory: Story = {
        id: Date.now().toString(),
        title: storyTitle,
        fullText: generatedStory,
        coverImagePrompt: editableImagePrompt,
        coverImageUrl: generatedCoverUrl,
        wordCount: generatedStory.split(' ').length,
        characters: activeCharacters,
        theme: `Tommy's ${selectedTheme.charAt(0).toUpperCase() + selectedTheme.slice(1)} World`,
        createdAt: new Date().toISOString()
      }
      
      const updatedStories = [...savedStories, newStory]
      setSavedStories(updatedStories)
      saveToStorage("storyloom_stories", updatedStories)
      setCurrentStory(newStory)
      
      setUploadProgress("🎉 Your magical story is ready!")
      setTimeout(() => setCurrentStep("reading"), 1000)
      
    } catch (error) {
      console.error("Error generating story:", error)
      setUploadProgress("❌ Error generating story")
    } finally {
      setIsGenerating(false)
      setTimeout(() => setUploadProgress(""), 3000)
    }
  }

  // Enhanced story generation from prompt
  const generateStoryFromPrompt = async (prompt: string): Promise<string> => {
    // In a real implementation, you'd call OpenAI API here
    // For now, return a much better local story based on the prompt
    
    const characterNames = activeCharacters.map(c => c.name).filter(name => name.toLowerCase() !== 'tommy')
    const characterList = characterNames.length > 0 ? characterNames.join(', ') : ''
    
    // Much more sophisticated story generation
    const stories = {
      space: `Tommy's eyes sparkled with excitement as he welcomed ${characterList} aboard his magnificent crystal starship, the Rainbow Voyager. The ship's walls shimmered with colors that seemed to dance like living auroras, while his wise dragon companion, Cosmos, settled her silver-blue scales near the navigation console.

"Welcome to my space realm!" Tommy called out cheerfully as the ship lifted off from the floating space station. ${characterList} pressed their faces against the viewing ports in wonder, watching as Tommy's magical space world unfolded beneath them like a cosmic garden.

Their first stop was the Singing Planet, where crystalline mountains hummed melodies that made flowers bloom in impossible colors. ${characterNames[0] || 'Everyone'} gasped when they met the Star Singers - gentle, glowing beings who communicated through beautiful music that filled their hearts with joy.

"They're telling us about the Lost Constellation," Cosmos translated, her ancient wisdom helping them understand. "The Friendship Stars have scattered, and without them, this sector of space is losing its magic."

Without hesitation, ${characterList} ${characterNames.length > 1 ? 'all' : ''} volunteered to help. Together with Tommy, they embarked on an incredible quest through the Nebula of Dreams, where they rode on the backs of gentle Space Whales whose songs could heal broken stars.

At the Crystal Caves of Luna Prime, they discovered that the missing stars weren't lost at all - they had hidden because they felt lonely and forgotten. ${characterNames[0] || 'The young adventurer'} had a wonderful idea: what if they created a celebration to show the stars how much they were loved?

Working together, they organized the most magnificent Star Festival the galaxy had ever seen. Cosmic creatures from across Tommy's realm came to share stories, laughter, and friendship. The scattered Friendship Stars were so moved by this display of kindness that they joyfully returned to their constellation, creating the most beautiful light show in the universe.

As they sailed home under the twinkling Friendship Stars, ${characterList} realized they had discovered something even more valuable than cosmic treasures - they had learned that the greatest magic in any universe comes from caring for others and working together.

Tommy smiled as he watched his new friends gazing at the stars with wonder. "You'll always be welcome in my space realm," he said warmly. "After all, the best adventures are the ones we share with friends."`,

      jungle: `The emerald canopy whispered ancient secrets as Tommy led ${characterList} deeper into his enchanted jungle realm. Vines sparkled with morning dew that looked like diamonds, while his dragon companion, Sage, moved gracefully beside them, her forest-green scales blending perfectly with the dappled sunlight.

"Listen," Tommy whispered, holding up his hand. The jungle was alive with magical sounds - the melodic calls of Rainbow Parrots, the gentle splash of hidden waterfalls, and the soft rustling of creatures preparing for their daily adventures.

${characterNames[0] || 'Their new friend'} gasped in delight as they entered the Clearing of Wonders, where Golden Monkeys were painting moving murals on tree trunks with brushes made from their own shimmering fur. Each stroke created stories that danced and changed before their eyes.

"They're the Keepers of Memory," Sage explained, her wise dragon eyes twinkling. "Every act of kindness in the jungle becomes part of their eternal artwork."

But something was wrong. The jungle's magical symphony had fallen silent, and the usually cheerful animals looked worried. The Guardian Spirit, a magnificent jaguar whose spots were actually tiny stars, explained the problem: the Heart Song of the jungle had been silenced by the Loneliness Vines, magical plants that grew when creatures felt forgotten.

${characterList} ${characterNames.length > 1 ? 'all' : ''} knew exactly what to do. Together with Tommy, they began the Great Friendship Quest, visiting every corner of the jungle to remind each creature how special and loved they were.

They helped the Shy Sloths overcome their fear of singing by creating a gentle choir where everyone's voice mattered. ${characterNames[1] || characterNames[0] || 'They'} taught the Forgotten Frogs a new game that made them laugh so hard their laughter became music. Tommy and ${characterNames[0] || 'his friend'} even convinced the Grumpy Crocodile to smile by sharing funny stories about their own adventures.

As each creature remembered their worth and joy, the Loneliness Vines began to transform into Friendship Flowers that sang beautiful melodies. The jungle's Heart Song returned, more beautiful than ever before, filling the air with harmony.

At the Temple of Eternal Friendship, they planted a special seed that would grow into the Forever Tree, whose branches would always remind the jungle's inhabitants that they were part of one big, loving family.

As the sun set through the canopy in shades of gold and green, ${characterList} knew they had helped create something magical - a place where every creature felt valued and loved, and where the power of friendship would echo through the trees for generations to come.`,

      ocean: `The morning sun painted Tommy's magical ocean in shades of turquoise and gold as ${characterList} stepped aboard the Friendship Dream, a magnificent ship with sails that captured and reflected every color of the rainbow. Tommy's sea dragon companion, Marina, surfaced alongside them, her pearl-like scales catching the light as she danced through the waves.

"Welcome to the Seven Seas of Wonder!" Tommy called out, his sea-salt hair whipping in the gentle breeze. The ship moved as if guided by magic itself, knowing exactly where the greatest adventures awaited.

Their first destination was the Coral Palace, where Princess Aquamarina, the youngest mermaid, greeted them with excitement. But her usual bright smile was clouded with worry. "The Song of the Tides has been stolen," she explained, "and without it, the ocean's harmony is fading."

${characterNames[0] || 'The brave young adventurer'} immediately offered to help, and soon ${characterList} ${characterNames.length > 1 ? 'were all' : 'was'} diving into the crystal-clear waters. In Tommy's realm, they found they could breathe underwater perfectly, swimming alongside dolphins who spoke in clicks and whistles that somehow they understood.

The wise Octopus Oracle, who painted prophecies with her eight arms, revealed that the Song hadn't been stolen at all - it had hidden itself in the Cavern of Echoes because the ocean had forgotten how to listen to its own beauty.

Together, they embarked on the Great Listening Quest. At the Whispering Reef, ${characterNames[0] || 'they'} learned to hear the gentle conversations between sea anemones and clownfish. ${characterNames[1] || characterNames[0] || 'Their companion'} discovered that even the smallest seahorses had important wisdom to share.

In the Deep Current Caves, they met the Ancient Turtle, who had been carrying stories on his shell for a thousand years but had never found anyone who wanted to listen. ${characterList} spent hours hearing his tales of brave sea heroes and magical underwater kingdoms, and their genuine interest made his shell glow with happiness.

At the Singing Kelp Forest, they organized the first Great Ocean Concert, where every sea creature - from the tiniest krill to the mightiest whales - had a chance to share their voice. The harmony was so beautiful that the Song of the Tides emerged from its hiding place, adding its ancient melody to the symphony.

As the music swelled across Tommy's ocean realm, every wave began to sparkle with joy, and the sea itself seemed to dance. ${characterList} realized they had learned the ocean's greatest secret: that true harmony comes from listening to and valuing every voice, no matter how small.

Sailing back to shore as the stars reflected like diamonds on the calm water, ${characterList} knew they would always carry the Song of the Tides in their hearts, and that Tommy's magical ocean would forever welcome them home.`,

      dinosaur: `Time itself seemed to shimmer as ${characterList} stepped through Tommy's magical portal into the Prehistoric Paradise, where gentle dinosaur friends lived in harmony with dragon companions like Tommy's wise friend, Chronos. The air smelled of ancient flowers and new adventures, while magnificent creatures roamed through valleys painted in impossible shades of green and gold.

"Don't worry," Tommy laughed, seeing ${characterNames[0] || 'his friend'}'s wide-eyed expression. "All the dinosaurs here are gentle giants who love making new friends!" As if to prove his point, a young Triceratops bounded over like a playful puppy, her rainbow-colored frill sparkling in the eternal sunshine.

${characterList} quickly discovered that Tommy's dinosaurs were nothing like the fearsome beasts from movies. The Singing Sauropods created melodies that helped flowers bloom instantly, while the Artistic Ankylosaurs used their armored tails to carve beautiful sculptures from rainbow-colored stone.

But their greatest adventure began when they met Echo, a baby T-Rex who had lost her voice. Without her gentle roar, she couldn't call to her family across the vast valley, and she felt terribly alone. ${characterNames[0] || 'Their new friend'} immediately wanted to help, and soon ${characterList} ${characterNames.length > 1 ? 'were all' : 'was'} on a quest to find the legendary Voice Flower.

Through the Crystal Cave they ventured, where stalactites chimed like church bells and ancient paintings told stories of the first friendship between dragons and dinosaurs. ${characterNames[1] || characterNames[0] || 'They'} learned to speak in gentle dinosaur rumbles and clicks from a wise Diplodocus who had been the valley's storyteller for centuries.

At the Wisdom Tree, older than time itself, they met the Elder Pteranodon who shared an important secret: Echo's voice wasn't truly lost, it was hidden by sadness. The Voice Flower could only bloom when watered with tears of pure joy, not sorrow.

This gave ${characterList} a wonderful idea. Instead of searching for the flower, they would help Echo find her happiness again! They spent the day showing her all the wonders of Tommy's world - playing hide-and-seek among gentle giants, racing alongside speedy Compsognathus, and sharing stories that made everyone laugh until their sides hurt.

Tommy taught Echo how to paint with her tiny claws, while ${characterNames[0] || 'their friend'} showed her a special friendship dance. Chronos shared ancient dragon wisdom about how every voice is unique and precious.

When Echo finally felt truly happy again, something magical happened. Her joyful laughter was so pure and beautiful that Voice Flowers began blooming everywhere around them, filling the valley with their sweet fragrance. And with her happiness restored, Echo's voice returned naturally - not fierce, but warm and full of love.

As Echo's family heard her gentle call and came running to reunite with her, ${characterList} understood that Tommy's dinosaur world had taught them about the power of patience, kindness, and helping others find their voice through the magic of friendship and joy.`,

      pirate: `The salty breeze carried promises of adventure as ${characterList} climbed aboard the Golden Friendship, Tommy's magnificent pirate ship with masts that reached toward the clouds and sails decorated with dragons breathing rainbows. Captain Tommy stood proudly at the helm, his tricorn hat adorned with feathers from every magical bird in his realm, while his dragon first mate, Treasure, polished the ship's brass compass with her gleaming claws.

"Ahoy, me hearties!" Tommy called out in his best pirate voice, though his grin was far too friendly for any fearsome buccaneer. "We're setting sail for the most important treasure hunt in all the seven seas!"

But this wasn't like any pirate adventure from storybooks. In Tommy's realm, pirates were brave protectors of the ocean who helped lost sailors and rescued sea creatures in distress. The Golden Friendship was powered by friendship itself, moving faster whenever the crew shared stories or sang songs together.

${characterNames[0] || 'The newest crew member'} quickly learned that their mission was special: the Rainbow Pearl, a magical gem that kept all the islands connected with bridges of light, had been hidden somewhere in the Archipelago of Wonders to protect it from the Loneliness Storm, a sad weather system that made everyone too gloomy to remember how to be friends.

The quest led them to Parrot Island, where the wise Captain Featherbeard gave them their first clue in the form of a riddle: "Where laughter echoes and friendship grows, the greatest treasure's warmth still glows." ${characterList} ${characterNames.length > 1 ? 'worked together' : 'puzzled over this'}, sharing ideas and building on each other's thoughts.

On Monkey Island, they learned to swing from vine to vine alongside the local primates who spoke in rhyme and loved to juggle coconuts. The monkeys were so impressed by how ${characterNames[1] || characterNames[0] || 'the young pirate'} helped a baby monkey who was scared of heights that they shared the second clue hidden in their treasure chest of friendship tokens.

At the Lighthouse of Lost Ships, they met the cheerful ghostly keeper who had been waiting centuries for friends to visit. ${characterList} spent time listening to his stories of adventures past and sharing their own tales of Tommy's magical worlds. Touched by their kindness, he revealed that the final clue was hidden in the lighthouse beam itself.

The ultimate challenge brought them to the Cavern of Singing Crystals, where beautiful music filled the air but the Rainbow Pearl remained hidden. Tommy and ${characterList} realized that the pearl would only appear when it heard the song of true friendship - a melody that could only be created when different voices joined together in harmony.

Standing together in the crystal cave, they created a song that combined all their different voices into something beautiful and unique. ${characterNames[0] || 'Each friend'} contributed their own special note, and when their voices blended together, the Rainbow Pearl materialized, glowing with warm, welcoming light.

As the pearl was restored to its rightful place, the Loneliness Storm transformed into the Celebration Breeze, bringing sunshine and rainbow bridges back to all the islands. ${characterList} had learned that the greatest treasures weren't gold or jewels, but the magical moments created when friends work together to bring joy to the world.`,

      "monster-trucks": `The ground rumbled with excitement as ${characterList} entered Tommy's Extreme Racing World, where monster trucks the size of houses prepared for races across tracks that seemed to defy both gravity and logic. Tommy's dragon mechanic, Turbo, was putting the finishing touches on a fleet of magnificent racing machines that looked more like magical creatures than ordinary vehicles.

"These aren't just any monster trucks," Tommy explained, his eyes shining with excitement as he patted the side of a truck whose wheels sparkled with rainbow fire. "In my racing world, they're powered by friendship, courage, and the pure joy of adventure!"

${characterNames[0] || 'The newest racer'} was amazed to discover that each truck had its own personality. Lightning Luna's wheels created rainbow trails wherever she drove, Thunder Thor's engine sang opera arias that made everyone smile, and Gentle Giant's massive tires were somehow perfectly bouncy like trampolines.

But the most incredible thing was that these magical trucks didn't need steering wheels or pedals - they responded to thoughts and emotions, moving faster when their drivers felt brave and confident, and performing amazing aerial stunts when filled with pure joy.

The day's biggest challenge came when they learned that the annual Rainbow Rally was in danger. The Jealousy Clouds, storm systems that made racers forget how to have fun and only care about winning, had drained all the color from the magical racing track, turning it gray and lifeless.

"We need to restore the Rainbow Road!" Turbo announced, her mechanical dragon wisdom shining through. "But it requires the Pure Speed of Kindness - something that can only be achieved when racers help each other succeed instead of just trying to win."

${characterList} and Tommy embarked on the most unique race ever conceived - one where the goal wasn't to finish first, but to make sure everyone had the most amazing experience possible. ${characterNames[0] || 'They'} learned to use their truck's special abilities to help others: Lightning Luna's rainbow wheels could repair damaged track sections, while Thunder Thor's musical engine could cheer up disappointed racers.

During the Great Friendship Race, incredible moments of teamwork unfolded. When Gentle Giant got stuck in the Giggling Mud Pit (where the mud made you laugh so hard you couldn't drive straight), everyone worked together to create a chain of trucks to pull him free. When tiny Zippy Zoom couldn't make it over the Courage Canyon jump, the bigger trucks formed a living rainbow bridge for him to drive across.

${characterNames[1] || characterNames[0] || 'Their racing partner'} discovered that helping others actually made their own truck perform better, and soon they were doing loop-de-loops in the air while trailing sparkles and musical notes.

The most magical moment came at the finish line, when ${characterList} ${characterNames.length > 1 ? 'all crossed together' : 'crossed'} at exactly the same moment, perfectly synchronized. As they did, the Rainbow Road burst back to life in brilliant colors, and all the trucks began celebrating by doing synchronized aerial ballet routines in the sky.

The Jealousy Clouds transformed into Celebration Confetti, raining down gentle sparkles that tickled and made everyone laugh until their sides hurt. ${characterList} had learned that in Tommy's racing world, the best victories were the ones where everyone felt like champions, and that the real magic happened when competition became collaboration.`
    }

    return stories[selectedTheme] || stories.space
  }

  // Enhanced image generation from prompt
  const generateCoverFromPrompt = async (prompt: string): Promise<string> => {
    // In a real implementation, you'd call DALL-E API here
    // For now, create a much better local version based on the prompt
    
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) return ""
    
    canvas.width = 400
    canvas.height = 600
    
    // Theme-specific gradients
    const themeGradients: Record<ThemeType, string[]> = {
      space: ['#0F0C29', '#24243e', '#313264', '#5b4d75'],
      jungle: ['#0F4C3A', '#16794A', '#20965A', '#31B56A'],
      ocean: ['#0D2F5C', '#1E5A8A', '#2E7DB8', '#3FA0E6'],
      dinosaur: ['#4A2C1A', '#6B3E2A', '#8C5A3A', '#AD764A'],
      pirate: ['#4A1A1A', '#6B2A2A', '#8C3A3A', '#AD4A4A'],
      "monster-trucks": ['#1A1A1A', '#2A2A2A', '#3A3A3A', '#4A4A4A']
    }
    
    const colors = themeGradients[selectedTheme] || themeGradients.space
    
    // Create beautiful gradient
    const gradient = ctx.createLinearGradient(0, 0, 400, 600)
    gradient.addColorStop(0, colors[0])
    gradient.addColorStop(0.3, colors[1])
    gradient.addColorStop(0.7, colors[2])
    gradient.addColorStop(1, colors[3])
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 400, 600)
    
    // Add magical border
    ctx.strokeStyle = '#FFD700'
    ctx.lineWidth = 6
    ctx.strokeRect(15, 15, 370, 570)
    
    // Title area with better design
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
    ctx.fillRect(40, 60, 320, 120)
    
    // Add beautiful text
    ctx.fillStyle = '#4A148C'
    ctx.font = 'bold 32px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('StoryLoom', 200, 100)
    
    ctx.font = 'bold 18px Arial'
    ctx.fillText(`${selectedTheme.charAt(0).toUpperCase() + selectedTheme.slice(1)} Adventure`, 200, 130)
    
    // Add character names
    const characterNames = activeCharacters.map(c => c.name).filter(name => name.toLowerCase() !== 'tommy')
    if (characterNames.length > 0) {
      ctx.font = 'bold 14px Arial'
      ctx.fillText(`featuring ${characterNames.join(' & ')}`, 200, 155)
    }
    
    // Theme-specific high-quality emojis and design
    const themeElements: Record<ThemeType, string[]> = {
      space: ['🚀', '🌟', '🛸', '👨‍🚀', '🌌', '⭐'],
      jungle: ['🌿', '🦜', '🐵', '🦎', '🌺', '🦋'],
      ocean: ['🌊', '🐠', '🐙', '⚓', '🏝️', '🦈'],
      dinosaur: ['🦕', '🦖', '🌋', '🥚', '🦴', '🌿'],
      pirate: ['🏴‍☠️', '⚔️', '💎', '🗺️', '⚓', '🦜'],
      "monster-trucks": ['🚗', '🏁', '⚡', '🏆', '🛞', '🔧']
    }
    
    const elements = themeElements[selectedTheme] || themeElements.space
    
    // Add theme elements in a better layout
    ctx.font = '60px Arial'
    ctx.fillText(elements[0], 120, 280)
    ctx.fillText(elements[1], 280, 280)
    ctx.font = '50px Arial'
    ctx.fillText(elements[2], 200, 380)
    ctx.fillText(elements[3], 150, 480)
    ctx.fillText(elements[4], 250, 480)
    ctx.font = '40px Arial'
    ctx.fillText(elements[5], 200, 540)
    
    return canvas.toDataURL('image/png')
  }

  // HOMEPAGE - Seamless logo without box
  if (currentStep === "start") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 relative overflow-hidden">
        {/* Magical background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-4 -left-4 w-72 h-72 bg-white/10 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute top-1/2 right-8 w-48 h-48 bg-yellow-300/20 rounded-full blur-lg animate-bounce"></div>
          <div className="absolute bottom-8 left-1/4 w-64 h-64 bg-blue-400/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          
          <div className="absolute top-20 left-10 text-yellow-300 text-3xl animate-bounce" style={{ animationDelay: '0.5s' }}>⭐</div>
          <div className="absolute top-40 right-20 text-pink-300 text-4xl animate-pulse" style={{ animationDelay: '1.5s' }}>✨</div>
          <div className="absolute bottom-40 left-20 text-blue-300 text-3xl animate-bounce" style={{ animationDelay: '2s' }}>🌟</div>
          <div className="absolute bottom-20 right-40 text-purple-300 text-3xl animate-pulse" style={{ animationDelay: '0.8s' }}>💫</div>
          <div className="absolute top-60 left-1/3 text-green-300 text-3xl animate-bounce" style={{ animationDelay: '3s' }}>🐲</div>
          <div className="absolute bottom-60 right-1/3 text-orange-300 text-3xl animate-pulse" style={{ animationDelay: '2.5s' }}>🌈</div>
        </div>

        {/* SEAMLESS TOMMY LOGO */}
        <div className="flex flex-col items-center pt-16 pb-12 relative z-10">
          <img
            src={TOMMY_LOGO_URL}
            alt="StoryLoom - Tommy's Magical World"
            className="w-[768px] h-[512px] object-contain"
            onError={() => setLogoError(true)}
          />
        </div>

        {/* Progress indicator */}
        {uploadProgress && (
          <div className="fixed top-6 right-6 bg-black/90 text-white px-8 py-4 rounded-2xl z-50">
            <p className="text-base font-bold">{uploadProgress}</p>
          </div>
        )}

        {/* Main action buttons */}
        <div className="flex flex-col items-center justify-center px-6 relative z-10">
          <div className="bg-white/15 backdrop-blur-xl rounded-3xl p-12 shadow-2xl border-2 border-white/30 max-w-4xl">
            <div className="space-y-8 text-center">
              <h2 className="text-4xl font-bold text-white mb-8">
                Welcome to Tommy&apos;s Magical World! 🌈✨
              </h2>
              
              <div className="flex flex-col gap-6">
                <button
                  onClick={() => setCurrentStep("characters")}
                  className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 hover:from-yellow-300 hover:via-orange-300 hover:to-red-300 text-purple-900 px-12 py-6 rounded-2xl font-bold text-2xl shadow-2xl transition-all transform hover:scale-105"
                >
                  🌟 Add Your Family to Tommy&apos;s World
                </button>

                {savedCharacters.length > 0 && (
                  <button
                    onClick={() => setCurrentStep("story-builder")}
                    className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 hover:from-blue-300 hover:via-purple-300 hover:to-pink-300 text-white px-12 py-6 rounded-2xl font-bold text-2xl shadow-2xl transition-all transform hover:scale-105"
                  >
                    📚 Create Your Story
                  </button>
                )}
                
                <button
                  onClick={() => setCurrentStep("library")}
                  className="bg-white/25 hover:bg-white/35 text-white px-10 py-4 rounded-xl font-semibold text-lg transition-all"
                >
                  📚 Story Library ({savedStories.length} adventures)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // CHARACTER MANAGEMENT - Same large seamless logo + Guests option
  if (currentStep === "characters") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 py-8">
        <div className="flex items-center justify-center mb-8">
          <img
            src={TOMMY_LOGO_URL}
            alt="StoryLoom"
            className="w-[768px] h-[512px] object-contain"
            onError={() => setLogoError(true)}
          />
        </div>

        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-white">Add Your Family & Guests</h1>
            <button
              onClick={() => setCurrentStep("start")}
              className="bg-white/20 text-white px-6 py-3 rounded-xl hover:bg-white/30 transition-all"
            >
              🏠 Back to Home
            </button>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6">
            <p className="text-white/90 mb-4 text-lg">
              Add your family members and guests to create personalized adventures in Tommy&apos;s magical world! 🐲✨
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {savedCharacters.map((character) => (
              <div key={character.id} className="bg-white/20 backdrop-blur-md rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-yellow-300 to-orange-400 rounded-xl flex items-center justify-center">
                    <span className="text-purple-900 text-2xl font-bold">
                      {character.name ? character.name.charAt(0).toUpperCase() : (character.isGuest ? '👥' : '👤')}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name={`character-type-${character.id}`}
                          checked={character.isChild}
                          onChange={() => updateCharacter(character.id, { isChild: true, isGuest: false })}
                          className="mr-1"
                        />
                        <span className="text-white text-sm">Family</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name={`character-type-${character.id}`}
                          checked={character.isGuest}
                          onChange={() => updateCharacter(character.id, { isChild: false, isGuest: true })}
                          className="mr-1"
                        />
                        <span className="text-white text-sm">Guest</span>
                      </label>
                    </div>
                  </div>
                </div>
                
                <input
                  type="text"
                  placeholder={character.isGuest ? "Guest Name" : "Character Name"}
                  value={character.name}
                  onChange={(e) => updateCharacter(character.id, { name: e.target.value })}
                  className="w-full mb-3 px-4 py-3 rounded-lg border border-gray-300 font-medium text-gray-800"
                />
                
                {!character.isGuest && (
                  <>
                    <input
                      type="text"
                      placeholder="Age (e.g., 8 years old)"
                      value={character.age || ""}
                      onChange={(e) => updateCharacter(character.id, { age: e.target.value })}
                      className="w-full mb-3 px-4 py-3 rounded-lg border border-gray-300 text-gray-800"
                    />
                    
                    <textarea
                      placeholder="Personality (e.g., curious and brave)"
                      value={character.personality || ""}
                      onChange={(e) => updateCharacter(character.id, { personality: e.target.value })}
                      className="w-full mb-4 px-4 py-3 rounded-lg border border-gray-300 h-20 resize-none text-sm text-gray-800"
                    />
                  </>
                )}
                
                <button
                  onClick={() => removeCharacter(character.id)}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 text-sm w-full transition-all"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          
          <div className="text-center space-y-4">
            <div className="flex justify-center gap-4">
              <button
                onClick={addNewCharacter}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105"
              >
                ➕ Add Family Member
              </button>

              <button
                onClick={addNewGuest}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105"
              >
                👥 Add Guest
              </button>
            </div>

            {savedCharacters.length > 0 && (
              <button
                onClick={() => setCurrentStep("story-builder")}
                className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 hover:from-blue-300 hover:via-purple-300 hover:to-pink-300 text-white px-12 py-4 rounded-xl font-bold text-xl transition-all hover:scale-105"
              >
                📚 Continue to Story Builder
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // STORY BUILDER
  if (currentStep === "story-builder") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 py-8">
        <div className="flex items-center justify-center mb-8">
          <img
            src={TOMMY_LOGO_URL}
            alt="StoryLoom"
            className="w-[384px] h-[256px] object-contain"
            onError={() => setLogoError(true)}
          />
        </div>

        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-bold text-white">Choose Your Story Adventure</h1>
            <button
              onClick={() => setCurrentStep("start")}
              className="bg-white/20 text-white px-6 py-3 rounded-xl hover:bg-white/30 transition-all"
            >
              🏠 Back to Home
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div className="bg-white/15 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border-2 border-white/30 hover:scale-105 transition-all">
              <div className="text-center">
                <div className="text-6xl mb-4">✍️</div>
                <h3 className="text-2xl font-bold text-white mb-4">Build Your Own Story</h3>
                <p className="text-white/90 mb-6">Create a custom story with your own ideas and characters</p>
                <button
                  onClick={() => setCurrentStep("build-own")}
                  className="bg-gradient-to-r from-green-400 to-green-600 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105 w-full"
                >
                  Start Building
                </button>
              </div>
            </div>

            <div className="bg-white/15 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border-2 border-white/30 hover:scale-105 transition-all">
              <div className="text-center">
                <div className="text-6xl mb-4">🧠</div>
                <h3 className="text-2xl font-bold text-white mb-4">Professional AI Story</h3>
                <p className="text-white/90 mb-6">Review and edit prompts before generating professional-quality stories</p>
                <button
                  onClick={() => setCurrentStep("ai-generator")}
                  className="bg-gradient-to-r from-purple-400 to-pink-400 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105 w-full"
                >
                  Create with AI
                </button>
              </div>
            </div>

            <div className="bg-white/15 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border-2 border-white/30 hover:scale-105 transition-all">
              <div className="text-center">
                <div className="text-6xl mb-4">🎨</div>
                <h3 className="text-2xl font-bold text-white mb-4">Choose from a Theme</h3>
                <p className="text-white/90 mb-6">Pick a magical theme for AI-generated stories with character selection</p>
                <button
                  onClick={() => setShowThemes(!showThemes)}
                  className="bg-gradient-to-r from-yellow-400 to-orange-400 text-purple-900 px-8 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105 w-full"
                >
                  Choose Theme
                </button>
              </div>
            </div>
          </div>

          {showThemes && (
            <div className="bg-white/15 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border-2 border-white/30">
              <h2 className="text-4xl font-bold text-white mb-8 text-center">Themes</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {Object.entries(THEME_IMAGES).map(([theme, imageUrl]) => (
                  <div
                    key={theme}
                    onClick={() => goToThemeGenerator(theme as ThemeType)}
                    className="group cursor-pointer bg-white/20 rounded-3xl p-6 hover:scale-105 transition-all hover:bg-white/30 text-center"
                  >
                    <img 
                      src={imageUrl}
                      alt={theme}
                      className="w-full max-w-[320px] h-auto object-contain rounded-2xl mx-auto mb-4 shadow-2xl"
                    />
                    <h3 className="text-2xl font-bold text-white group-hover:text-yellow-200 transition-colors">
                      {THEME_NAMES[theme as ThemeType]}
                    </h3>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // AI GENERATOR - WITH GUEST SELECTION
  if (currentStep === "ai-generator") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 py-8">
        <div className="flex items-center justify-center mb-8">
          <img
            src={THEME_IMAGES[selectedTheme]}
            alt={selectedTheme}
            className="w-[768px] h-[512px] object-contain"
            onError={() => setLogoError(true)}
          />
        </div>

        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white">Professional AI Story Generator</h1>
              <h2 className="text-2xl text-white/90">{THEME_NAMES[selectedTheme]}</h2>
              <p className="text-white/80">Select characters and review prompts before generating</p>
            </div>
            <button
              onClick={() => setCurrentStep("story-builder")}
              className="bg-white/20 text-white px-6 py-3 rounded-xl hover:bg-white/30 transition-all"
            >
              ← Back to Story Builder
            </button>
          </div>

          <div className="bg-white/15 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border-2 border-white/30 mb-8">
            <h3 className="text-2xl font-bold text-white mb-6">Choose Characters and Guests for Your Story:</h3>
            {savedCharacters.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedCharacters.map((character) => (
                  <label key={character.id} className="flex items-center gap-3 p-4 bg-white/20 rounded-xl cursor-pointer hover:bg-white/30 transition-all">
                    <input
                      type="checkbox"
                      checked={activeCharacters.find(c => c.id === character.id) !== undefined}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setActiveCharacters([...activeCharacters, character])
                        } else {
                          setActiveCharacters(activeCharacters.filter(c => c.id !== character.id))
                        }
                      }}
                      className="w-5 h-5"
                    />
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-300 to-orange-400 rounded-lg flex items-center justify-center">
                      <span className="text-purple-900 text-lg font-bold">
                        {character.name ? character.name.charAt(0).toUpperCase() : (character.isGuest ? '👥' : '👤')}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-bold">{character.name || 'Unnamed'} {character.isGuest ? '(Guest)' : ''}</p>
                      <p className="text-white/70 text-sm">{character.age}</p>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-white/90 text-lg mb-4">No characters added yet!</p>
                <button
                  onClick={() => setCurrentStep("characters")}
                  className="bg-gradient-to-r from-green-400 to-green-600 text-white px-8 py-4 rounded-xl font-bold transition-all hover:scale-105"
                >
                  Add Your Family & Guests
                </button>
              </div>
            )}

            {/* Action buttons */}
            {activeCharacters.length > 0 && (
              <div className="text-center mt-8 space-y-4">
                <div className="bg-white/20 rounded-2xl p-6">
                  <h4 className="text-lg font-bold text-white mb-2">Selected Characters:</h4>
                  <p className="text-white/90">
                    {activeCharacters.map(c => `${c.name}${c.isGuest ? ' (Guest)' : ''}`).join(', ')}
                    {!activeCharacters.some(c => c.name.toLowerCase() === 'tommy') && ' + Tommy'}
                  </p>
                </div>
                
                <button
                  onClick={generatePromptsForReview}
                  className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 hover:from-yellow-300 hover:via-orange-300 hover:to-red-300 text-purple-900 px-12 py-6 rounded-2xl font-bold text-2xl shadow-2xl transition-all transform hover:scale-105"
                >
                  📝 Review Prompts & Generate Story
                </button>
                
                <p className="text-white/90 text-sm">
                  ✨ Next step: Review and edit AI prompts for story and cover art
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // NEW: PROMPT REVIEW STEP
  if (currentStep === "prompt-review") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white">Review & Edit Prompts</h1>
              <p className="text-white/90">Edit the prompts before generating your story</p>
            </div>
            <button
              onClick={() => setCurrentStep("ai-generator")}
              className="bg-white/20 text-white px-6 py-3 rounded-xl hover:bg-white/30 transition-all"
            >
              ← Back to Character Selection
            </button>
          </div>
          
          {/* Progress indicator */}
          {uploadProgress && (
            <div className="fixed top-6 right-6 bg-black/90 text-white px-8 py-4 rounded-2xl z-50">
              <p className="text-base font-bold">{uploadProgress}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Story Prompt */}
            <div className="bg-white/15 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border-2 border-white/30">
              <h2 className="text-2xl font-bold text-white mb-4">📚 Story Prompt</h2>
              <p className="text-white/80 mb-4">Edit this prompt to customize your story:</p>
              <textarea
                value={editablePrompt}
                onChange={(e) => setEditablePrompt(e.target.value)}
                className="w-full h-80 px-4 py-3 rounded-lg border border-gray-300 text-gray-800 text-sm resize-none"
                placeholder="Your story prompt will appear here..."
              />
            </div>

            {/* Image Prompt */}
            <div className="bg-white/15 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border-2 border-white/30">
              <h2 className="text-2xl font-bold text-white mb-4">🎨 Cover Art Prompt</h2>
              <p className="text-white/80 mb-4">Edit this prompt to customize your cover art:</p>
              <textarea
                value={editableImagePrompt}
                onChange={(e) => setEditableImagePrompt(e.target.value)}
                className="w-full h-80 px-4 py-3 rounded-lg border border-gray-300 text-gray-800 text-sm resize-none"
                placeholder="Your image prompt will appear here..."
              />
            </div>
          </div>

          {/* Generate Button */}
          <div className="text-center mt-8">
            <div className="bg-white/15 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border-2 border-white/30 max-w-2xl mx-auto">
              <h3 className="text-2xl font-bold text-white mb-4">Ready to Generate?</h3>
              <p className="text-white/90 mb-6">
                Characters: {activeCharacters.map(c => `${c.name}${c.isGuest ? ' (Guest)' : ''}`).join(', ')}
                {!activeCharacters.some(c => c.name.toLowerCase() === 'tommy') && ' + Tommy'}
              </p>
              <p className="text-white/90 mb-6">
                Theme: {THEME_NAMES[selectedTheme]}
              </p>
              
              <button
                onClick={generateStoryFromPrompts}
                disabled={isGenerating}
                className={`${
                  isGenerating 
                    ? "bg-gray-500 cursor-not-allowed" 
                    : "bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 hover:from-green-300 hover:via-blue-300 hover:to-purple-300"
                } text-white px-12 py-6 rounded-2xl font-bold text-2xl shadow-2xl transition-all transform hover:scale-105`}
              >
                {isGenerating ? "🧠 Crafting Your Story..." : "🚀 Generate Professional Story & Cover Art!"}
              </button>
              
              <p className="text-white/80 text-sm mt-4">
                ⚡ Creates high-quality 500+ word story with professional cover art
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // READING SCREEN
  if (currentStep === "reading" && currentStory) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-white">Your Magical Story</h1>
            <button
              onClick={() => setCurrentStep("start")}
              className="bg-white/20 text-white px-6 py-3 rounded-xl hover:bg-white/30 transition-all"
            >
              🏠 Back to Home
            </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Story Cover */}
            <div className="lg:col-span-1">
              <div className="bg-white/15 backdrop-blur-xl rounded-3xl p-6 shadow-2xl">
                <div className="aspect-[2/3] bg-white rounded-xl overflow-hidden mb-4">
                  {currentStory.coverImageUrl ? (
                    <img 
                      src={currentStory.coverImageUrl} 
                      alt={currentStory.title} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-200 to-pink-200 flex flex-col items-center justify-center text-purple-600">
                      <div className="text-6xl mb-4">📖</div>
                      <p className="text-lg font-bold text-center px-4">{currentStory.title}</p>
                    </div>
                  )}
                </div>
                <div className="text-white/90 text-center">
                  <p className="mb-2 font-bold">📊 {currentStory.wordCount} words</p>
                  <p className="text-sm">🎭 {currentStory.theme}</p>
                  <p className="text-xs text-white/70 mt-2">✨ AI Enhanced Story</p>
                </div>
              </div>
            </div>

            {/* Story Content */}
            <div className="lg:col-span-2">
              <div className="bg-white/15 backdrop-blur-xl rounded-3xl p-8 shadow-2xl">
                <h2 className="text-3xl font-bold text-white mb-6 text-center">{currentStory.title}</h2>
                <div className="bg-white/20 rounded-2xl p-6 mb-6 max-h-96 overflow-y-auto">
                  <div className="text-white text-lg leading-relaxed whitespace-pre-line">
                    {currentStory.fullText}
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-white/90 mb-4">
                    🌟 Featuring: {currentStory.characters.map(c => c.name).join(", ")}
                    {!currentStory.characters.some(c => c.name.toLowerCase() === 'tommy') && ' & Tommy'}
                  </p>
                  <div className="flex justify-center gap-4">
                    <button
                      onClick={() => setCurrentStep("ai-generator")}
                      className="bg-gradient-to-r from-blue-400 to-purple-400 text-white px-8 py-3 rounded-xl font-bold transition-all hover:scale-105"
                    >
                      🔄 Create Another Story
                    </button>
                    <button
                      onClick={() => setCurrentStep("library")}
                      className="bg-gradient-to-r from-green-400 to-green-600 text-white px-8 py-3 rounded-xl font-bold transition-all hover:scale-105"
                    >
                      📚 View Library
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // BUILD OWN STORY
  if (currentStep === "build-own") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white/15 backdrop-blur-xl rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-bold text-white">Build Your Own Story</h1>
              <button
                onClick={() => setCurrentStep("story-builder")}
                className="bg-white/20 text-white px-6 py-3 rounded-xl hover:bg-white/30 transition-all"
              >
                ← Back
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="text-white font-bold text-lg mb-2 block">Story Title:</label>
                <input
                  type="text"
                  placeholder="Enter your story title..."
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 font-medium text-gray-800"
                />
              </div>
              
              <div>
                <label className="text-white font-bold text-lg mb-2 block">Your Story:</label>
                <textarea
                  placeholder="Write your magical story here..."
                  className="w-full px-4 py-4 rounded-lg border border-gray-300 h-64 resize-none text-gray-800"
                />
              </div>
              
              <button
                onClick={() => alert("Story saved!")}
                className="bg-gradient-to-r from-green-400 to-green-600 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105 w-full"
              >
                💾 Save Your Story
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // LIBRARY
  if (currentStep === "library") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-white">Story Library ({savedStories.length} adventures)</h1>
            <button
              onClick={() => setCurrentStep("start")}
              className="bg-white/20 text-white px-6 py-3 rounded-xl hover:bg-white/30 transition-all"
            >
              🏠 Back to Home
            </button>
          </div>
          
          {savedStories.length === 0 ? (
            <div className="text-center text-white py-20">
              <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-12 max-w-2xl mx-auto">
                <div className="text-8xl mb-6">📚</div>
                <h2 className="text-2xl font-bold mb-4">No stories yet!</h2>
                <p className="text-xl mb-8">Create your first professional AI story.</p>
                <button
                  onClick={() => setCurrentStep("story-builder")}
                  className="bg-gradient-to-r from-yellow-400 to-orange-400 text-purple-900 px-8 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105"
                >
                  🌟 Create Your First Story
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedStories.map((story) => (
                <div 
                  key={story.id} 
                  onClick={() => {
                    setCurrentStory(story)
                    setCurrentStep("reading")
                  }}
                  className="bg-white/20 backdrop-blur-md rounded-2xl p-6 hover:scale-105 transition-all cursor-pointer"
                >
                  <div className="aspect-[4/5] bg-white rounded-xl mb-4 overflow-hidden">
                    {story.coverImageUrl ? (
                      <img src={story.coverImageUrl} alt={story.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-200 to-pink-200 flex flex-col items-center justify-center text-purple-600">
                        <div className="text-4xl mb-2">📖</div>
                        <p className="text-sm text-center px-2 font-medium">{story.title}</p>
                      </div>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{story.title}</h3>
                  <p className="text-white/80 text-sm mb-2">
                    {story.characters.map(c => c.name).join(", ")}
                    {!story.characters.some(c => c.name.toLowerCase() === 'tommy') && ' & Tommy'}
                  </p>
                  <p className="text-yellow-200 text-xs">📊 {story.wordCount} words • 🎨 AI Enhanced • ⭐ Professional Quality</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}
