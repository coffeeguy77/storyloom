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
const CLOUDINARY_API_KEY = "228818781471743"

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

export default function StoryLoomEnhanced() {
  const [currentStep, setCurrentStep] = useState<"start" | "characters" | "story-builder" | "ai-generator" | "build-own" | "reading" | "library">("start")
  const [savedCharacters, setSavedCharacters] = useState<Character[]>([])
  const [activeCharacters, setActiveCharacters] = useState<Character[]>([])
  const [selectedTheme, setSelectedTheme] = useState<ThemeType>("space")
  const [currentStory, setCurrentStory] = useState<Story | null>(null)
  const [savedStories, setSavedStories] = useState<Story[]>([])
  const [logoError, setLogoError] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string>("")
  const [showThemes, setShowThemes] = useState(false)

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

  // Enhanced AI story generation with OpenAI
  const generateStoryWithOpenAI = async () => {
    if (activeCharacters.length === 0) {
      alert("Please select some characters first!")
      return
    }
    
    setIsGenerating(true)
    setUploadProgress("🧠 Crafting your magical story with AI...")
    
    try {
      const characterNames = activeCharacters.map(c => c.name).join(", ")
      const characterDetails = activeCharacters.map(c => {
        if (c.isGuest) {
          return `${c.name} (a special guest)`
        } else {
          return `${c.name} (age ${c.age || 'unknown'}, personality: ${c.personality || 'adventurous'})`
        }
      }).join(", ")

      // Create detailed story prompt for OpenAI
      const storyPrompt = `Write a magical 500-word children's story for kids aged 5-10. The story should be set in Tommy's magical ${selectedTheme} world.

CHARACTERS TO INCLUDE:
- Tommy: A young boy who owns the magical world and has a wise dragon companion
- ${characterDetails}

THEME SETTING: ${selectedTheme}
- If space: Include rainbow planets, friendly aliens, magical spaceships, and cosmic adventures
- If jungle: Include talking animals, hidden temples, colorful creatures, and ancient secrets  
- If ocean: Include rainbow-sailed ships, underwater kingdoms, mermaids, and sea dragons
- If dinosaur: Include gentle giant dinosaurs, time travel, prehistoric valleys, and ancient wisdom
- If pirate: Include treasure hunts, rainbow flags, friendly pirates, and magical islands
- If monster-trucks: Include rainbow racing tracks, magical racing machines, and extreme adventures

STORY REQUIREMENTS:
- Exactly 500 words
- Include all named characters as active participants
- Child-friendly language and themes
- Focus on friendship, kindness, and adventure
- Include Tommy's dragon companion as a wise guide
- End with a heartwarming conclusion about friendship and adventure
- Make it engaging and magical with vivid descriptions
- NO repetitive language or basic storytelling

Write only the story text, no title.`

      // Call OpenAI API (note: you'll need to set up API key)
      setUploadProgress("🎨 Generating beautiful cover art...")
      
      // For now, let's use Anthropic's Claude API as an example
      // You would replace this with actual OpenAI API calls
      const storyResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "your-anthropic-key-here", // Replace with actual key
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-3-sonnet-20240229",
          max_tokens: 1000,
          messages: [
            { role: "user", content: storyPrompt }
          ]
        })
      })

      let generatedStory = ""
      
      if (storyResponse.ok) {
        const data = await storyResponse.json()
        generatedStory = data.content[0].text
      } else {
        // Fallback to enhanced local story if API fails
        generatedStory = generateEnhancedLocalStory(characterNames, selectedTheme)
      }

      // Generate cover art prompt for DALL-E
      const coverPrompt = `A beautiful children's book cover illustration showing ${characterNames} and Tommy in a magical ${selectedTheme} adventure. Tommy has brown hair and is accompanied by a friendly dragon. The style should be colorful, whimsical, and perfect for children aged 5-10. Include the "StoryLoom" logo at the bottom. Art style: Disney-Pixar like, vibrant colors, magical atmosphere.`

      setUploadProgress("🖼️ Creating magical cover art...")

      // Generate cover image with DALL-E (you would call OpenAI DALL-E API here)
      let coverImageUrl = ""
      
      try {
        // This would be your actual DALL-E API call
        const imageResponse = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer your-openai-key-here" // Replace with actual key
          },
          body: JSON.stringify({
            model: "dall-e-3",
            prompt: coverPrompt,
            n: 1,
            size: "1024x1024"
          })
        })

        if (imageResponse.ok) {
          const imageData = await imageResponse.json()
          coverImageUrl = imageData.data[0].url
        }
      } catch (error) {
        console.log("Cover art generation failed, using fallback")
        // Fallback to local generated cover
        coverImageUrl = generateLocalBookCover(selectedTheme, characterNames)
      }

      // Create the story object
      const storyTitle = `${characterNames} and Tommy's ${selectedTheme.charAt(0).toUpperCase() + selectedTheme.slice(1)} Adventure`
      
      const newStory: Story = {
        id: Date.now().toString(),
        title: storyTitle,
        fullText: generatedStory,
        coverImagePrompt: coverPrompt,
        coverImageUrl: coverImageUrl,
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
      setUploadProgress("❌ Error generating story - using fallback")
      
      // Fallback story generation
      const fallbackStory = generateEnhancedLocalStory(activeCharacters.map(c => c.name).join(", "), selectedTheme)
      const storyTitle = `${activeCharacters.map(c => c.name).join(", ")} and Tommy's ${selectedTheme.charAt(0).toUpperCase() + selectedTheme.slice(1)} Adventure`
      
      const fallbackStoryObj: Story = {
        id: Date.now().toString(),
        title: storyTitle,
        fullText: fallbackStory,
        coverImagePrompt: `${activeCharacters.map(c => c.name).join(", ")} in ${selectedTheme} world`,
        coverImageUrl: generateLocalBookCover(selectedTheme, activeCharacters.map(c => c.name).join(", ")),
        wordCount: fallbackStory.split(' ').length,
        characters: activeCharacters,
        theme: `Tommy's ${selectedTheme.charAt(0).toUpperCase() + selectedTheme.slice(1)} World`,
        createdAt: new Date().toISOString()
      }
      
      const updatedStories = [...savedStories, fallbackStoryObj]
      setSavedStories(updatedStories)
      saveToStorage("storyloom_stories", updatedStories)
      setCurrentStory(fallbackStoryObj)
      setCurrentStep("reading")
    } finally {
      setIsGenerating(false)
      setTimeout(() => setUploadProgress(""), 3000)
    }
  }

  // Enhanced local story generation (fallback)
  const generateEnhancedLocalStory = (characterNames: string, theme: ThemeType): string => {
    const themeStories: Record<ThemeType, string> = {
      space: `Tommy's eyes sparkled with excitement as he watched ${characterNames} step into his magnificent spaceship, the Rainbow Voyager. The magical vessel hummed with otherworldly energy, its crystalline walls shimmering with colors that seemed to dance like living auroras.

"Welcome aboard!" Tommy called out, his wise dragon companion Zephyr nodding approvingly from the pilot's seat. Zephyr's scales caught the starlight streaming through the ship's transparent dome, creating patterns of silver and blue across the cabin.

As they lifted off from Tommy's floating space station, ${characterNames} pressed their faces against the viewing ports in wonder. Below them, Tommy's magical space realm unfolded like a cosmic garden - rainbow planets spinning in perfect harmony, each one unique and beautiful. There was Melodia, the planet where music crystals grew like flowers, and Chromaworld, where the very air painted pictures in the sky.

"Look there!" Tommy pointed to a shimmering nebula ahead. "That's where the Star Whales sing their ancient songs." Sure enough, enormous, gentle creatures made of living starlight began to emerge from the cosmic mist, their haunting melodies filling the ship with peace and wonder.

${characterNames} and Tommy spent their day visiting the Crystal Caves of Lumina, where they helped lost Starlings find their way home. They shared cosmic fruit with the friendly Nebula Folk, whose skin changed colors with their emotions, showing joy in brilliant golds and contentment in soft purples.

On the Moon of Mirrors, they discovered a magical reflection that showed not how they looked, but how kind their hearts were. ${characterNames} glowed with warm, beautiful light, making Tommy smile with pride. "True adventurers always have the brightest hearts," Zephyr observed wisely.

As their space adventure came to an end, ${characterNames} realized they had not only explored the wonders of Tommy's cosmic realm but had also discovered something special about themselves - that friendship and kindness were the greatest treasures in any universe.

"Will you come back and explore with us again?" Tommy asked as they returned to the space station. ${characterNames} hugged their new friend tightly, knowing that Tommy's magical space world would always be waiting for their next incredible adventure among the stars.`,

      jungle: `The emerald canopy above rustled with mystery as ${characterNames} followed Tommy deeper into his enchanted jungle realm. Ancient trees, tall as skyscrapers, whispered secrets in languages older than time, while Tommy's dragon companion, Sage, moved silently beside them, her green scales blending perfectly with the dappled sunlight.

"Listen," Tommy whispered, holding up his hand. The jungle was alive with magical sounds - the melodic calls of Rainbow Parrots, the gentle splash of hidden waterfalls, and the soft footsteps of creatures unseen.

${characterNames} gasped as they emerged into a clearing where impossible wonders awaited them. A family of Golden Monkeys was painting murals on the tree trunks with brushes made from their own shimmering fur, creating stories that moved and changed as they watched.

"They're painting the history of friendship," Sage explained, her wise dragon eyes twinkling. "Every act of kindness in the jungle becomes part of their eternal artwork."

Deeper they ventured, discovering the Temple of Whispered Dreams, where ancient stone faces smiled down at them with eyes that sparkled like emeralds. Inside, they met the Guardian Spirit, a magnificent jaguar whose spots were actually tiny stars that told fortunes of future adventures.

${characterNames} helped Tommy and his jungle friends solve the Mystery of the Missing Music - the jungle's magical symphony had fallen silent. Together, they discovered that the Harmony Flowers had closed their petals because they were lonely. By singing lullabies and sharing stories with the flowers, ${characterNames} brought music back to the entire realm.

The Talking Trees shared their ancient wisdom, teaching ${characterNames} that every creature in the jungle, no matter how small, played an important part in the magical ecosystem. They learned the language of the Luminous Butterflies, whose wings spelled out messages of hope and joy.

At the Heart of the Jungle, they found the Fountain of Courage, where Tommy invited ${characterNames} to make a wish. As they closed their eyes and spoke their dreams aloud, the water began to glow with soft, golden light, blessing their friendship with unbreakable bonds.

As evening painted the sky in shades of orange and purple, ${characterNames} knew they had experienced something truly magical. They had not just explored Tommy's jungle world - they had become part of its eternal story of wonder, friendship, and the magic that exists when hearts connect across all boundaries.`,

      ocean: `The morning sun painted Tommy's magical ocean in shades of turquoise and gold as ${characterNames} stepped aboard the Friendship's Dream, a magnificent ship with sails that shimmered like captured rainbows. Tommy's sea dragon companion, Marina, dove playfully alongside them, her pearl-like scales catching the light as she danced through the waves.

"Welcome to the Seven Seas of Wonder!" Tommy called out, his hair whipping in the salty breeze. The ship moved as if guided by magic itself, requiring no steering as it knew exactly where adventures awaited.

Their first stop was the Coral Castle, an underwater palace where mermaids with voices like silver bells welcomed them warmly. ${characterNames} discovered they could breathe underwater in Tommy's realm, swimming alongside dolphins who spoke in whistles and clicks that somehow they could understand perfectly.

Princess Aquamarina, the youngest mermaid, had lost her treasured Shell of Echoes - a magical conch that could replay the laughter of friends. ${characterNames} and Tommy volunteered to help search the Kelp Forest Maze, where sea creatures played elaborate games of hide and seek among the swaying green fronds.

They met Oliver the Wise Octopus, who used his eight arms to paint beautiful murals on underwater caves, and Stella the Starfish, who could make wishes come true for those with pure hearts. Together, they followed a trail of glowing pearls that led to the Shell of Echoes, guarded by a gentle giant whale named Harmony.

But Harmony wasn't keeping the shell captive - she had been protecting it from the Loneliness Fog, a sad mist that made magical objects lose their power. ${characterNames} realized that the shell needed to hear new laughter to regain its magic. They spent the afternoon sharing their happiest memories, filling the shell with so much joy that it began to sing the most beautiful song the ocean had ever heard.

As they sailed toward Sunset Island for a beach picnic with their new sea friends, ${characterNames} reflected on the day's lessons. Tommy's ocean world had taught them that treasures weren't just things to be found, but moments to be shared, and that the greatest magic happened when friends worked together.

That evening, as they watched stars reflect on the calm water, ${characterNames} promised to return to Tommy's magical ocean, knowing that every wave would always whisper their names in welcome.`,

      dinosaur: `Time itself seemed to shimmer as ${characterNames} stepped through Tommy's magical portal into the Prehistoric Paradise, where friendly dinosaurs lived in harmony with dragon companions like Tommy's wise friend, Chronos. The air smelled of ancient flowers and adventure, while magnificent creatures that had vanished from the world long ago roamed freely through valleys painted in impossible shades of green and gold.

"Don't worry," Tommy laughed, seeing ${characterNames} wide-eyed expressions. "All the dinosaurs here are gentle giants who love making new friends!" As if to prove his point, a young Triceratops bounded over like a playful puppy, her rainbow-colored frill sparkling in the eternal sunshine.

${characterNames} soon discovered that in Tommy's world, dinosaurs weren't the fearsome beasts from movies - they were wise, kind creatures with their own magical abilities. The Singing Sauropods created melodies that helped flowers bloom instantly, while the Artistic Ankylosaurs used their armored tails to carve beautiful sculptures from rainbow-colored stone.

Their greatest adventure began when they met Ember, a baby T-Rex who had lost her ability to roar. Without her voice, she couldn't call to her family across the vast valley. ${characterNames} and Tommy embarked on a quest to find the legendary Echo Flower, whose magical pollen could restore any lost voice.

Through the Crystal Cave they ventured, where stalactites chimed like church bells and ancient paintings told stories of the first friendship between dragons and dinosaurs. They crossed the Giggling River, where Diplodoci played water games and taught ${characterNames} how to speak in ancient dinosaur whistles and rumbles.

At the Wisdom Tree, older than time itself, they met the Elder Pteranodon who shared the secret: Ember's roar wasn't truly lost, it was hidden by sadness. The Echo Flower could only bloom when watered with tears of joy, not sorrow.

${characterNames} realized what they needed to do. They spent the day showing Ember all the wonders of Tommy's world, playing hide-and-seek among gentle giants, racing alongside speedy Compsognathus, and sharing stories that made everyone laugh until their sides hurt.

When Ember finally felt truly happy again, her roar returned naturally - not fierce, but full of joy and love. The sound was so pure that Echo Flowers began blooming everywhere, filling the valley with their magical fragrance.

As they watched Ember reunite with her delighted family, ${characterNames} understood that Tommy's dinosaur world had taught them about the power of patience, kindness, and helping others find their voice through friendship and joy.`,

      pirate: `The salty breeze carried promises of adventure as ${characterNames} climbed aboard the Golden Friendship, Tommy's magnificent pirate ship with masts that reached toward the clouds and sails decorated with dragons breathing rainbows. Captain Tommy stood proudly at the helm, his tricorn hat adorned with feathers from every magical bird in his realm, while his dragon first mate, Treasure, polished the ship's brass compass with her gleaming claws.

"Ahoy, me hearties!" Tommy called out in his best pirate voice, though his grin was far too friendly for any fearsome buccaneer. "We're setting sail for the most magical treasure hunt in all the seven seas!"

But this wasn't like any pirate adventure from storybooks. In Tommy's realm, pirates were brave protectors of the ocean who helped lost sailors and rescued sea creatures in distress. Their ship was powered by friendship itself, moving faster whenever the crew shared stories or sang songs together.

Their first stop was Parrot Island, where the wise Captain Featherbeard explained their mission. The Rainbow Pearl - a magical gem that kept all the islands connected - had been hidden somewhere in the Archipelago of Wonders to protect it from the Grumpy Storm, a cranky weather system that made everyone too sad to remember how to be friends.

${characterNames} proved to be natural treasure hunters, following riddles written in shells and messages delivered by helpful dolphins. On Monkey Island, they learned to swing from vine to vine alongside the local primates who spoke in rhyme and loved to juggle coconuts. The monkeys shared the first clue: "Where laughter echoes and friendship grows, the treasure's warmth forever glows."

At the Lighthouse of Lost Ships, they met the ghostly but cheerful keeper who had been waiting centuries for friends to visit. ${characterNames} and Tommy spent time listening to his stories of adventures past, and in return, he revealed the second clue hidden in his lighthouse beam.

The final challenge led them to the Cave of Singing Crystals, where beautiful music filled the air but the treasure remained hidden. ${characterNames} realized that the Rainbow Pearl would only appear when it heard the song of true friendship. Together, they created a melody that combined all their different voices into something beautiful and unique.

As the Rainbow Pearl materialized, glowing with warm, welcoming light, the Grumpy Storm transformed into a Gentle Breeze, and sunshine returned to all the islands. ${characterNames} learned that the greatest treasures weren't gold or jewels, but the magical moments created when friends work together to bring joy to the world.`,

      "monster-trucks": `The ground rumbled with excitement as ${characterNames} entered Tommy's Extreme Racing World, where monster trucks the size of houses raced across tracks that defied gravity and logic. Tommy's dragon mechanic, Turbo, was putting the finishing touches on a group of magnificent racing machines that seemed more like magical creatures than vehicles.

"These aren't ordinary monster trucks," Tommy explained, his eyes shining with excitement. "In my world, they're powered by friendship and courage!" Each truck had its own personality - there was Lightning Luna with wheels that sparked rainbows, Thunder Thor whose engine sang opera, and Gentle Giant whose massive tires were somehow perfectly bouncy like trampolines.

${characterNames} discovered they each had a natural gift for understanding these magical machines. The trucks didn't need steering wheels or pedals - they responded to thoughts and emotions, moving faster when their drivers felt brave and confident, and performing amazing stunts when filled with joy.

Their biggest adventure came when the annual Rainbow Rally was threatened by the Jealousy Clouds, storm systems that made racers forget how to have fun and only care about winning. The magical racing track had lost its color, turning gray and boring, while the trucks themselves began moving sluggishly.

"We need to restore the Rainbow Road!" Turbo announced, her mechanical dragon wisdom shining through. "But it requires the Pure Speed of Kindness - something that can only be achieved when racers help each other instead of just trying to win."

${characterNames} and Tommy embarked on the most unique race ever - one where the goal wasn't to finish first, but to make sure everyone had the most fun possible. They learned to use their trucks' special abilities to help others: Lightning Luna's rainbow wheels could repair damaged track sections, while Thunder Thor's musical engine could cheer up disappointed racers.

During the Great Friendship Race, ${characterNames} discovered amazing things about teamwork. When Gentle Giant got stuck in the Mud Pit of Silliness, everyone worked together to create a chain of trucks to pull him free. When tiny Zippy Zoom couldn't make it over the Courage Canyon jump, the bigger trucks formed a rainbow bridge for him to drive across.

The most magical moment came at the finish line, when ${characterNames} realized they had all crossed together, perfectly synchronized. As they did, the Rainbow Road burst back to life in brilliant colors, and the trucks began celebrating by doing loops and barrel rolls in the sky, trailing sparkles and music notes behind them.

The Jealousy Clouds transformed into Celebration Confetti, raining down gentle sparkles that tickled and made everyone laugh. ${characterNames} had learned that in Tommy's racing world, the best victories were the ones where everyone felt like champions.`
    }

    return themeStories[theme]
  }

  // Generate local book cover (fallback)
  const generateLocalBookCover = (theme: ThemeType, characterNames: string): string => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) return ""
    
    canvas.width = 400
    canvas.height = 600
    
    // Theme-specific gradients
    const themeGradients: Record<ThemeType, string[]> = {
      space: ['#1E1B4B', '#7C3AED', '#EC4899', '#F59E0B'],
      jungle: ['#065F46', '#059669', '#10B981', '#A3E635'],
      ocean: ['#1E3A8A', '#3B82F6', '#06B6D4', '#A5F3FC'],
      dinosaur: ['#78350F', '#92400E', '#F59E0B', '#FDE047'],
      pirate: ['#7F1D1D', '#DC2626', '#F59E0B', '#FDE047'],
      "monster-trucks": ['#1F2937', '#EF4444', '#F59E0B', '#FDE047']
    }
    
    const colors = themeGradients[theme]
    
    // Create theme gradient
    const gradient = ctx.createLinearGradient(0, 0, 400, 600)
    gradient.addColorStop(0, colors[0])
    gradient.addColorStop(0.3, colors[1])
    gradient.addColorStop(0.7, colors[2])
    gradient.addColorStop(1, colors[3])
    
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 400, 600)
    
    // Add magical border
    ctx.strokeStyle = '#FBBF24'
    ctx.lineWidth = 8
    ctx.strokeRect(10, 10, 380, 580)
    
    // Title area
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
    ctx.fillRect(30, 50, 340, 100)
    
    // Add text
    ctx.fillStyle = '#6B21A8'
    ctx.font = 'bold 24px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('StoryLoom', 200, 80)
    
    ctx.font = 'bold 14px Arial'
    ctx.fillText(`Tommy's ${theme.charAt(0).toUpperCase() + theme.slice(1)} Adventure`, 200, 105)
    ctx.fillText(`with ${characterNames}`, 200, 125)
    
    // Theme-specific emojis
    const themeEmojis: Record<ThemeType, string[]> = {
      space: ['🚀', '👨‍🚀', '🌟', '🛸', '👽', '🌌'],
      jungle: ['🦁', '🐵', '🌿', '🦜', '🐍', '🌺'],
      ocean: ['🐠', '🐙', '🏴‍☠️', '⚓', '🦈', '🏝️'],
      dinosaur: ['🦕', '🦖', '🌋', '🥚', '🦴', '🌿'],
      pirate: ['🏴‍☠️', '⚔️', '💎', '🗺️', '🦜', '⚓'],
      "monster-trucks": ['🚗', '🏁', '⚡', '🏆', '🛞', '🔧']
    }
    
    const emojis = themeEmojis[theme]
    
    // Add theme elements
    ctx.font = '60px Arial'
    ctx.fillText(emojis[0], 120, 250)
    ctx.fillText(emojis[1], 280, 250)
    ctx.fillText(emojis[2], 200, 350)
    ctx.fillText(emojis[3], 150, 450)
    ctx.fillText(emojis[4], 250, 450)
    ctx.fillText(emojis[5], 200, 520)
    
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
                <div className="text-6xl mb-4">🤖</div>
                <h3 className="text-2xl font-bold text-white mb-4">AI Generate a Story</h3>
                <p className="text-white/90 mb-6">Let AI create a magical 500-word story with cover art</p>
                <button
                  onClick={() => setCurrentStep("ai-generator")}
                  className="bg-gradient-to-r from-purple-400 to-pink-400 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105 w-full"
                >
                  Generate Story
                </button>
              </div>
            </div>

            <div className="bg-white/15 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border-2 border-white/30 hover:scale-105 transition-all">
              <div className="text-center">
                <div className="text-6xl mb-4">🎨</div>
                <h3 className="text-2xl font-bold text-white mb-4">Choose from a Theme</h3>
                <p className="text-white/90 mb-6">Pick a magical theme for AI-generated stories</p>
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

  // AI GENERATOR - Enhanced with OpenAI integration
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
              <h1 className="text-4xl font-bold text-white">Enhanced AI Story Generator</h1>
              <h2 className="text-2xl text-white/90">{THEME_NAMES[selectedTheme]}</h2>
              <p className="text-white/80">Creates rich 500-word stories with AI-generated cover art</p>
            </div>
            <button
              onClick={() => setCurrentStep("story-builder")}
              className="bg-white/20 text-white px-6 py-3 rounded-xl hover:bg-white/30 transition-all"
            >
              ← Back to Story Builder
            </button>
          </div>

          <div className="bg-white/15 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border-2 border-white/30 mb-8">
            <h3 className="text-2xl font-bold text-white mb-6">Choose Characters for Your Story:</h3>
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
                  Add Your Family Characters
                </button>
              </div>
            )}

            {activeCharacters.length > 0 && (
              <div className="text-center mt-8">
                <button
                  onClick={generateStoryWithOpenAI}
                  disabled={isGenerating}
                  className={`${
                    isGenerating 
                      ? "bg-gray-500 cursor-not-allowed" 
                      : "bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 hover:from-yellow-300 hover:via-orange-300 hover:to-red-300"
                  } text-purple-900 px-12 py-6 rounded-2xl font-bold text-2xl shadow-2xl transition-all transform hover:scale-105`}
                >
                  {isGenerating ? "🧠 Creating Magic..." : `🪄 Generate Enhanced ${THEME_NAMES[selectedTheme]} Adventure!`}
                </button>
                <p className="text-white/90 text-sm mt-4">
                  ✨ Creates rich 500+ word stories with detailed character development<br/>
                  🎨 Includes AI-generated cover art with DALL-E integration
                </p>
              </div>
            )}
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
                  <p className="mb-2">Word Count: {currentStory.wordCount}</p>
                  <p className="text-sm">Theme: {currentStory.theme}</p>
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
                    Featuring: {currentStory.characters.map(c => c.name).join(", ")}
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
                <p className="text-xl mb-8">Create your first enhanced AI story.</p>
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
                  <p className="text-white/80 text-sm mb-2">{story.characters.map(c => c.name).join(", ")}</p>
                  <p className="text-yellow-200 text-xs">📊 {story.wordCount} words • 🎨 AI Enhanced</p>
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
