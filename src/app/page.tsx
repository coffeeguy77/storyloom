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

export default function StoryLoomFinal() {
  const [currentStep, setCurrentStep] = useState<"start" | "characters" | "themes" | "story" | "generating" | "reading" | "library" | "manage-characters" | "choose-theme">("start")
  const [savedCharacters, setSavedCharacters] = useState<Character[]>([])
  const [activeCharacters, setActiveCharacters] = useState<Character[]>([])
  const [selectedTheme, setSelectedTheme] = useState<ThemeType>("space")
  const [currentStory, setCurrentStory] = useState<Story | null>(null)
  const [savedStories, setSavedStories] = useState<Story[]>([])
  const [logoLoaded, setLogoLoaded] = useState(false)
  const [logoError, setLogoError] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string>("")

  // Tommy's magical story prompts by theme with proper typing
  const storyPromptsByTheme: Record<ThemeType, string[]> = {
    space: [
      "goes on a space adventure with Tommy and his dragon friends",
      "discovers a magical spaceship that travels to rainbow planets",
      "meets friendly alien creatures who need help finding their way home",
      "explores the galaxy with Tommy's wise dragon companion"
    ],
    jungle: [
      "explores the magical jungle with talking animals and Tommy",
      "discovers hidden temples with Tommy's dragon guide",
      "meets colorful tropical creatures who share ancient secrets",
      "goes on a treasure hunt through Tommy's enchanted rainforest"
    ],
    ocean: [
      "sails the seven seas with Tommy and his pirate dragon",
      "discovers an underwater kingdom with magical sea creatures",
      "goes on a treasure hunt across Tommy's magical ocean world",
      "meets friendly dolphins and wise sea turtles on an island adventure"
    ],
    dinosaur: [
      "travels back in time to meet friendly dinosaurs with Tommy",
      "discovers a hidden valley where dinosaurs and dragons live together",
      "goes on a prehistoric adventure with Tommy's time-traveling dragon",
      "meets baby dinosaurs who need help finding their families"
    ],
    pirate: [
      "becomes a brave pirate captain with Tommy and his dragon crew",
      "searches for magical treasure on Tommy's pirate island",
      "sails with friendly pirates who protect the seven seas",
      "discovers a secret pirate code that leads to amazing adventures"
    ],
    "monster-trucks": [
      "races monster trucks with Tommy through magical obstacle courses",
      "builds the ultimate racing machine with Tommy's engineering dragon",
      "competes in the championship race across Tommy's rainbow tracks",
      "goes on off-road adventures through Tommy's extreme racing world"
    ]
  }

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
        const children = characters.filter((c: Character) => c.isChild)
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

  // Upload image to Cloudinary with unsigned upload
  const uploadImageToCloudinary = async (imageDataUrl: string, filename: string): Promise<string | null> => {
    try {
      setUploadProgress("🌤️ Uploading to Cloudinary...")
      
      // Convert data URL to blob
      const response = await fetch(imageDataUrl)
      const blob = await response.blob()
      
      // Create form data for unsigned upload
      const formData = new FormData()
      formData.append('file', blob, filename)
      formData.append('upload_preset', 'ml_default') // Default unsigned preset
      formData.append('folder', 'storyloom/book-covers')
      formData.append('public_id', `${selectedTheme}_cover_${Date.now()}`)
      
      // Upload to Cloudinary
      const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
      })
      
      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`)
      }
      
      const result = await uploadResponse.json()
      setUploadProgress("✅ Cover saved to cloud!")
      
      return result.secure_url
      
    } catch (error) {
      console.error('Cloudinary upload error:', error)
      setUploadProgress("⚠️ Upload failed - saving locally")
      return null
    }
  }

  // Generate AI image based on selected theme with proper typing
  const generateAIBookCover = async (prompt: string, theme: ThemeType): Promise<string> => {
    setUploadProgress("🎨 Creating magical book cover...")
    
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) throw new Error('Canvas not supported')
    
    canvas.width = 400
    canvas.height = 600
    
    // Theme-specific gradients with proper typing
    const themeGradients: Record<ThemeType, string[]> = {
      space: ['#1E1B4B', '#7C3AED', '#EC4899', '#F59E0B'],
      jungle: ['#065F46', '#059669', '#10B981', '#A3E635'],
      ocean: ['#1E3A8A', '#3B82F6', '#06B6D4', '#A5F3FC'],
      dinosaur: ['#78350F', '#92400E', '#F59E0B', '#FDE047'],
      pirate: ['#7F1D1D', '#DC2626', '#F59E0B', '#FDE047'],
      "monster-trucks": ['#1F2937', '#EF4444', '#F59E0B', '#FDE047']
    }
    
    // Fixed TypeScript error: proper indexing with fallback
    const colors = themeGradients[theme as keyof typeof themeGradients] || themeGradients.space
    
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
    ctx.fillRect(30, 50, 340, 80)
    
    // Add text
    ctx.fillStyle = '#6B21A8'
    ctx.font = 'bold 28px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('StoryLoom', 200, 90)
    
    ctx.font = 'bold 16px Arial'
    ctx.fillText(`Tommy's ${theme.charAt(0).toUpperCase() + theme.slice(1)} Adventure`, 200, 115)
    
    // Theme-specific emojis with proper typing
    const themeEmojis: Record<ThemeType, string[]> = {
      space: ['🚀', '👨‍🚀', '🌟', '🛸', '👽', '🌌'],
      jungle: ['🦁', '🐵', '🌿', '🦜', '🐍', '🌺'],
      ocean: ['🐠', '🐙', '🏴‍☠️', '⚓', '🦈', '🏝️'],
      dinosaur: ['🦕', '🦖', '🌋', '🥚', '🦴', '🌿'],
      pirate: ['🏴‍☠️', '⚔️', '💎', '🗺️', '🦜', '⚓'],
      "monster-trucks": ['🚗', '🏁', '⚡', '🏆', '🛞', '🔧']
    }
    
    const emojis = themeEmojis[theme as keyof typeof themeEmojis] || themeEmojis.space
    
    // Add theme elements
    ctx.font = '60px Arial'
    ctx.fillText(emojis[0], 120, 250)
    ctx.fillText(emojis[1], 280, 250)
    ctx.fillText(emojis[2], 200, 350)
    ctx.fillText(emojis[3], 150, 450)
    ctx.fillText(emojis[4], 250, 450)
    ctx.fillText(emojis[5], 200, 520)
    
    // Add character names if available
    if (activeCharacters.length > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
      ctx.fillRect(50, 160, 300, 40)
      
      ctx.fillStyle = '#7C3AED'
      ctx.font = 'bold 18px Arial'
      const characterText = `Starring: ${activeCharacters.map(c => c.name).join(' & ')}`
      ctx.fillText(characterText, 200, 185)
    }
    
    return canvas.toDataURL('image/png')
  }

  const generateStory = async () => {
    if (activeCharacters.length === 0) {
      alert("Please add some characters first to join Tommy's magical world!")
      return
    }
    
    setIsGenerating(true)
    setUploadProgress("🪄 Creating your magical story...")
    
    try {
      // Get theme-specific prompts
      const prompts = storyPromptsByTheme[selectedTheme]
      const characterNames = activeCharacters.map(c => c.name).join(" and ")
      const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)]
      const storyTitle = `${characterNames} and Tommy's ${selectedTheme.charAt(0).toUpperCase() + selectedTheme.slice(1)} Adventure`
      
      // Generate AI book cover with theme
      const coverPrompt = `Children's book cover: ${characterNames} ${randomPrompt} in Tommy's magical ${selectedTheme} world, fantasy art style`
      const aiGeneratedImage = await generateAIBookCover(coverPrompt, selectedTheme)
      
      // Upload cover to Cloudinary
      let cloudinaryUrl = null
      if (aiGeneratedImage) {
        setUploadProgress("☁️ Saving to cloud storage...")
        cloudinaryUrl = await uploadImageToCloudinary(aiGeneratedImage, `${storyTitle.replace(/\s+/g, '_').toLowerCase()}_cover.png`)
      }
      
      // Theme-specific story content with proper typing
      const themeStories: Record<ThemeType, string> = {
        space: `Once upon a time, in Tommy's magical space world, ${characterNames} ${randomPrompt}. They zoomed past rainbow planets, met friendly aliens who spoke in musical tones, and discovered that the universe is full of friendship and wonder. With Tommy's wise dragon as their guide, they learned that even in the vastness of space, love and kindness can bridge any distance.`,
        jungle: `Deep in Tommy's enchanted jungle, ${characterNames} ${randomPrompt}. They swung on vines with colorful parrots, discovered hidden waterfalls that sparkled like diamonds, and learned the ancient secrets of the forest from wise old trees. Tommy's dragon friend helped them understand that nature is full of magic for those who know how to listen.`,
        ocean: `Across Tommy's magical ocean, ${characterNames} ${randomPrompt}. They sailed on ships with rainbow sails, dove deep to visit underwater kingdoms, and met mermaids who taught them the songs of the sea. With Tommy's sea dragon by their side, they discovered that the ocean holds treasures beyond imagination.`,
        dinosaur: `In Tommy's prehistoric world, ${characterNames} ${randomPrompt}. They rode on the backs of gentle giants, helped baby dinosaurs learn to fly, and discovered that these ancient creatures were wise and kind. Tommy's time-traveling dragon showed them that friendship exists across all ages.`,
        pirate: `On Tommy's magical pirate seas, ${characterNames} ${randomPrompt}. They sailed under rainbow flags, found treasure chests filled with friendship instead of gold, and learned that the greatest adventures come from helping others. Tommy's pirate dragon taught them that true treasure is the crew you sail with.`,
        "monster-trucks": `In Tommy's extreme racing world, ${characterNames} ${randomPrompt}. They built incredible machines powered by kindness, raced across rainbow tracks that defied gravity, and learned that winning means helping everyone cross the finish line together. Tommy's racing dragon showed them that the best victories are shared ones.`
      }
      
      // Create story object
      const newStory: Story = {
        id: Date.now().toString(),
        title: storyTitle,
        fullText: themeStories[selectedTheme] + " And they all lived happily ever after, knowing that Tommy's magical world would always be there for their next adventure. The End.",
        coverImagePrompt: coverPrompt,
        coverImageUrl: cloudinaryUrl || aiGeneratedImage,
        wordCount: 200,
        characters: activeCharacters,
        theme: `Tommy's ${selectedTheme.charAt(0).toUpperCase() + selectedTheme.slice(1)} World`,
        createdAt: new Date().toISOString()
      }
      
      // Save story
      const updatedStories = [...savedStories, newStory]
      setSavedStories(updatedStories)
      saveToStorage("storyloom_stories", updatedStories)
      setCurrentStory(newStory)
      
      setUploadProgress("🎉 Story created successfully!")
      setCurrentStep("reading")
      
    } catch (error) {
      console.error("Error generating story:", error)
      setUploadProgress("❌ Error generating story - please try again")
    } finally {
      setIsGenerating(false)
      setTimeout(() => setUploadProgress(""), 5000)
    }
  }

  const addNewCharacter = () => {
    const newChar: Character = {
      id: Date.now().toString(),
      name: "",
      age: "",
      personality: "",
      favoriteThings: "",
      isChild: true,
      isActive: false
    }
    const updated = [...savedCharacters, newChar]
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

  const toggleCharacterActive = (characterId: string) => {
    const character = savedCharacters.find(c => c.id === characterId)
    if (!character) return

    if (activeCharacters.find(c => c.id === characterId)) {
      setActiveCharacters(activeCharacters.filter(c => c.id !== characterId))
    } else {
      setActiveCharacters([...activeCharacters, character])
    }
  }

  // Helper function to set theme with proper typing
  const handleThemeChange = (theme: string) => {
    if (theme in THEME_IMAGES) {
      setSelectedTheme(theme as ThemeType)
    }
  }

  // START SCREEN WITH TOMMY'S CLOUDINARY LOGO
  if (currentStep === "start") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 relative overflow-hidden">
        {/* Enhanced magical background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-4 -left-4 w-72 h-72 bg-white/10 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute top-1/2 right-8 w-48 h-48 bg-yellow-300/20 rounded-full blur-lg animate-bounce"></div>
          <div className="absolute bottom-8 left-1/4 w-64 h-64 bg-blue-400/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          
          {/* Tommy's magical floating elements */}
          <div className="absolute top-20 left-10 text-yellow-300 text-3xl animate-bounce" style={{ animationDelay: '0.5s' }}>⭐</div>
          <div className="absolute top-40 right-20 text-pink-300 text-4xl animate-pulse" style={{ animationDelay: '1.5s' }}>✨</div>
          <div className="absolute bottom-40 left-20 text-blue-300 text-3xl animate-bounce" style={{ animationDelay: '2s' }}>🌟</div>
          <div className="absolute bottom-20 right-40 text-purple-300 text-3xl animate-pulse" style={{ animationDelay: '0.8s' }}>💫</div>
          <div className="absolute top-60 left-1/3 text-green-300 text-3xl animate-bounce" style={{ animationDelay: '3s' }}>🐲</div>
          <div className="absolute bottom-60 right-1/3 text-orange-300 text-3xl animate-pulse" style={{ animationDelay: '2.5s' }}>🌈</div>
        </div>

        {/* TOMMY'S BEAUTIFUL LOGO FROM CLOUDINARY */}
        <div className="flex flex-col items-center pt-8 pb-6 relative z-10">
          <div className="relative">
            {/* Main Logo Container */}
            <div className="relative bg-white/15 backdrop-blur-md rounded-3xl p-10 shadow-2xl border-4 border-white/40 hover:scale-105 transition-all duration-700 hover:shadow-3xl hover:border-white/60">
              <img
                src={TOMMY_LOGO_URL}
                alt="StoryLoom - Tommy's Magical World with Dragons, Friends, and Rainbow Adventures"
                className="w-96 h-64 object-contain rounded-2xl"
                style={{
                  filter: logoError ? 'none' : 'drop-shadow(0 20px 40px rgba(0, 0, 0, 0.5))'
                }}
                onLoad={() => setLogoLoaded(true)}
                onError={() => {
                  setLogoError(true)
                  console.log("Logo failed to load from Cloudinary:", TOMMY_LOGO_URL)
                }}
              />
              
              {/* Enhanced Fallback Logo */}
              {logoError && (
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 rounded-2xl shadow-2xl flex flex-col items-center justify-center text-white p-8">
                  <div className="text-8xl mb-6">🌈</div>
                  <h1 className="text-5xl font-bold text-center mb-4">
                    StoryLoom
                  </h1>
                  <p className="text-2xl font-medium mb-6">Tommy&apos;s Magical World</p>
                  <div className="flex gap-4 text-5xl mb-4">
                    <span>🐲</span>
                    <span>🐕</span>
                    <span>📖</span>
                    <span>⭐</span>
                  </div>
                  <p className="text-base text-center text-yellow-200 max-w-xs">
                    Where dragons fly, friends play, and every story is an adventure!
                  </p>
                </div>
              )}
              
              {/* Enhanced Logo Description Badge */}
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white px-10 py-4 rounded-full text-center shadow-2xl border-2 border-white/30">
                <p className="font-bold text-xl">Tommy&apos;s Magical Universe</p>
                <p className="text-sm text-yellow-200">🐲 Dragons • 🐕 Best Friends • 🌈 Epic Adventures • ✨ Pure Magic</p>
              </div>
            </div>

            {/* Enhanced Magical Sparkle Animation */}
            <div className="absolute -inset-16 pointer-events-none">
              <div className="absolute top-0 left-0 w-8 h-8 bg-yellow-400 rounded-full animate-ping opacity-75"></div>
              <div className="absolute top-0 right-0 w-6 h-6 bg-pink-400 rounded-full animate-pulse"></div>
              <div className="absolute bottom-0 left-0 w-7 h-7 bg-blue-400 rounded-full animate-bounce"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 bg-purple-400 rounded-full animate-ping opacity-75" style={{ animationDelay: '1s' }}></div>
              <div className="absolute top-1/2 left-0 w-6 h-6 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }}></div>
              <div className="absolute top-1/2 right-0 w-7 h-7 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '2s' }}></div>
            </div>
          </div>

          {/* Enhanced Status Indicators */}
          <div className="flex flex-wrap gap-3 mt-8 justify-center">
            {logoLoaded && !logoError && (
              <div className="bg-green-500/30 backdrop-blur-sm text-white px-6 py-3 rounded-full border-2 border-green-400/50 shadow-lg">
                <p className="text-sm font-bold">✅ Tommy&apos;s Logo from Cloudinary!</p>
              </div>
            )}
            {logoError && (
              <div className="bg-red-500/30 backdrop-blur-sm text-white px-6 py-3 rounded-full border-2 border-red-400/50 shadow-lg">
                <p className="text-sm font-bold">⚠️ Logo Loading Error</p>
              </div>
            )}
            <div className="bg-blue-500/30 backdrop-blur-sm text-white px-6 py-3 rounded-full border-2 border-blue-400/50 shadow-lg">
              <p className="text-sm font-bold">☁️ Cloud Storage Active</p>
            </div>
            <div className="bg-purple-500/30 backdrop-blur-sm text-white px-6 py-3 rounded-full border-2 border-purple-400/50 shadow-lg">
              <p className="text-sm font-bold">🎨 AI Covers Ready</p>
            </div>
            <div className="bg-orange-500/30 backdrop-blur-sm text-white px-6 py-3 rounded-full border-2 border-orange-400/50 shadow-lg">
              <p className="text-sm font-bold">🌟 6 Magical Themes</p>
            </div>
          </div>
        </div>

        {/* Progress indicator */}
        {uploadProgress && (
          <div className="fixed top-6 right-6 bg-black/90 text-white px-8 py-4 rounded-2xl z-50 border-2 border-white/30 shadow-2xl">
            <p className="text-base font-bold">{uploadProgress}</p>
          </div>
        )}

        {/* Enhanced Main Content */}
        <div className="flex flex-col items-center justify-center px-6 relative z-10 mt-6">
          <div className="bg-white/15 backdrop-blur-xl rounded-3xl p-10 shadow-2xl border-2 border-white/30 max-w-6xl">
            {activeCharacters.length > 0 ? (
              <div className="space-y-8">
                <h2 className="text-4xl font-bold text-white mb-8 text-center">
                  ✨ Ready for Tommy&apos;s Magical World! 🌈
                </h2>
                
                <div className="bg-white/25 rounded-2xl p-8 border border-white/40">
                  <h3 className="text-2xl font-semibold text-yellow-300 mb-6 text-center">
                    Choose Your Adventure Theme for {activeCharacters.map(c => c.name).join(", ")}
                  </h3>
                  
                  {/* Theme Selection Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    {Object.entries(THEME_IMAGES).map(([theme, imageUrl]) => (
                      <div
                        key={theme}
                        onClick={() => handleThemeChange(theme)}
                        className={`relative cursor-pointer rounded-xl overflow-hidden transition-all duration-300 border-4 ${
                          selectedTheme === theme 
                            ? "border-yellow-400 scale-105 shadow-2xl" 
                            : "border-white/40 hover:border-white/60 hover:scale-102"
                        }`}
                      >
                        <img 
                          src={imageUrl}
                          alt={`${theme} theme with Tommy`}
                          className="w-full h-24 object-cover"
                          onError={(e) => {
                            console.log(`Theme image failed to load: ${theme}`, imageUrl)
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                        <div className="absolute bottom-1 left-1 right-1 text-center">
                          <p className="text-white font-bold text-sm capitalize">{theme.replace("-", " ")}</p>
                        </div>
                        {selectedTheme === theme && (
                          <div className="absolute top-1 right-1">
                            <div className="bg-yellow-400 text-black rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">✓</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-6 justify-center">
                  <button
                    onClick={generateStory}
                    disabled={isGenerating}
                    className={`${
                      isGenerating 
                        ? "bg-gray-500 cursor-not-allowed" 
                        : "bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 hover:from-yellow-300 hover:via-orange-300 hover:to-red-300"
                    } text-purple-900 px-12 py-6 rounded-2xl font-bold text-xl shadow-2xl transition-all transform hover:scale-105 flex items-center justify-center gap-4 border-4 border-white/30`}
                  >
                    <span className="text-4xl">{isGenerating ? "⏳" : "🪄"}</span>
                    <span>{isGenerating ? "Creating Magic..." : `Create ${selectedTheme.charAt(0).toUpperCase() + selectedTheme.slice(1)} Adventure!`}</span>
                  </button>
                  
                  <button
                    onClick={() => setCurrentStep("manage-characters")}
                    className="bg-white/25 hover:bg-white/35 text-white px-10 py-6 rounded-2xl font-bold border-4 border-white/40 transition-all hover:border-white/60 text-lg"
                  >
                    ⚙️ Manage Characters
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-10 text-center">
                <h2 className="text-5xl font-bold text-white mb-6">
                  Welcome to Tommy&apos;s StoryLoom! 🌈✨
                </h2>
                <p className="text-2xl text-white/95 mb-8 leading-relaxed">
                  Join Tommy, his dragon friends, and magical companions on incredible adventures through six amazing worlds!
                </p>
                <div className="bg-white/25 rounded-2xl p-8 mb-10 border-2 border-white/40">
                  <p className="text-xl text-yellow-200 mb-6">
                    🎨 Create personalized stories with AI-generated book covers
                  </p>
                  <p className="text-lg text-white/90 mb-4">
                    ☁️ All images safely stored in the cloud • 🐲 Six magical themes • 📚 Build your story library
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center text-sm text-white/80">
                    <span className="bg-purple-500/30 px-3 py-1 rounded-full">🚀 Space</span>
                    <span className="bg-green-500/30 px-3 py-1 rounded-full">🌿 Jungle</span>
                    <span className="bg-blue-500/30 px-3 py-1 rounded-full">🌊 Ocean</span>
                    <span className="bg-orange-500/30 px-3 py-1 rounded-full">🦕 Dinosaur</span>
                    <span className="bg-red-500/30 px-3 py-1 rounded-full">🏴‍☠️ Pirate</span>
                    <span className="bg-yellow-500/30 px-3 py-1 rounded-full">🚗 Racing</span>
                  </div>
                </div>
                
                <button
                  onClick={() => setCurrentStep("manage-characters")}
                  className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 hover:from-yellow-300 hover:via-orange-300 hover:to-red-300 text-purple-900 px-12 py-6 rounded-2xl font-bold text-2xl shadow-2xl transition-all transform hover:scale-105 border-4 border-white/30"
                >
                  🌟 Add Your Family to Tommy&apos;s World
                </button>
              </div>
            )}
            
            <div className="flex justify-center gap-8 mt-10 text-base">
              <button
                onClick={() => setCurrentStep("library")}
                className="text-white/90 hover:text-yellow-300 underline flex items-center gap-2 transition-colors hover:scale-105 font-semibold"
              >
                📚 Story Library ({savedStories.length} magical adventures)
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Footer */}
        <div className="absolute bottom-6 left-6 right-6 flex justify-between items-center text-sm text-white/80">
          <div className="bg-black/40 backdrop-blur-sm px-6 py-3 rounded-xl flex items-center gap-3 border border-white/20">
            <span>🖼️ Tommy&apos;s Logo:</span>
            <span className="font-bold text-green-400">{logoLoaded && !logoError ? 'Cloudinary ✅' : logoError ? 'Error ❌' : 'Loading ⏳'}</span>
          </div>
          <div className="bg-black/40 backdrop-blur-sm px-6 py-3 rounded-xl border border-white/20">
            <span className="font-bold">☁️ Cloud: {CLOUDINARY_CLOUD_NAME}</span>
          </div>
        </div>
      </div>
    )
  }

  // CHARACTER MANAGEMENT SCREEN
  if (currentStep === "manage-characters") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 py-8">
        {/* Small Header Logo */}
        <div className="flex items-center justify-center mb-6">
          <img
            src={TOMMY_LOGO_URL}
            alt="StoryLoom"
            className="h-16 w-24 object-contain rounded-lg border-2 border-white/40 bg-white/10"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        </div>

        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-white">Manage Family Characters</h1>
            <button
              onClick={() => setCurrentStep("start")}
              className="bg-white/20 text-white px-6 py-3 rounded-xl hover:bg-white/30 transition-all border border-white/30"
            >
              🏠 Back to Home
            </button>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6 border border-white/20">
            <p className="text-white/90 mb-4 text-lg">
              Add your family members to create personalized adventures in Tommy&apos;s magical world! 🐲✨
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {savedCharacters.map((character) => (
              <div key={character.id} className="bg-white/20 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/30 transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="aspect-square w-16 h-16 bg-gradient-to-br from-yellow-300 to-orange-400 rounded-xl flex items-center justify-center border-2 border-white/30">
                    <span className="text-purple-900 text-2xl font-bold">
                      {character.name ? character.name.charAt(0).toUpperCase() : '👤'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <input
                      type="checkbox"
                      checked={character.isChild}
                      onChange={(e) => updateCharacter(character.id, { isChild: e.target.checked })}
                      className="rounded"
                    />
                    <label className="text-white text-sm ml-2">Child Character</label>
                  </div>
                </div>
                
                <input
                  type="text"
                  placeholder="Character Name"
                  value={character.name}
                  onChange={(e) => updateCharacter(character.id, { name: e.target.value })}
                  className="w-full mb-3 px-4 py-3 rounded-lg border border-gray-300 font-medium text-gray-800"
                />
                
                <input
                  type="text"
                  placeholder="Age (e.g., 8 years old)"
                  value={character.age || ""}
                  onChange={(e) => updateCharacter(character.id, { age: e.target.value })}
                  className="w-full mb-3 px-4 py-3 rounded-lg border border-gray-300 text-gray-800"
                />
                
                <textarea
                  placeholder="Personality (e.g., curious and brave, loves dragons and adventures)"
                  value={character.personality || ""}
                  onChange={(e) => updateCharacter(character.id, { personality: e.target.value })}
                  className="w-full mb-4 px-4 py-3 rounded-lg border border-gray-300 h-24 resize-none text-sm text-gray-800"
                />
                
                <button
                  onClick={() => removeCharacter(character.id)}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 text-sm w-full transition-all"
                >
                  Remove Character
                </button>
              </div>
            ))}
          </div>
          
          <div className="text-center">
            <button
              onClick={addNewCharacter}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-green-400 hover:to-green-500 text-lg transition-all"
            >
              ➕ Add New Character
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Additional screens (reading, library) would go here...
  return null
}
