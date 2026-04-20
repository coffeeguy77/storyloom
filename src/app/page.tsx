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

const THEME_NAMES: Record<ThemeType, string> = {
  space: "Space Theme",
  jungle: "Jungle Theme", 
  ocean: "Ocean Theme",
  dinosaur: "Dinosaur Theme",
  pirate: "Pirate Theme",
  "monster-trucks": "Monster Trucks Theme"
}

export default function StoryLoomClean() {
  const [currentStep, setCurrentStep] = useState<"start" | "characters" | "story-builder" | "ai-generator" | "build-own" | "reading" | "library">("start")
  const [savedCharacters, setSavedCharacters] = useState<Character[]>([])
  const [activeCharacters, setActiveCharacters] = useState<Character[]>([])
  const [selectedTheme, setSelectedTheme] = useState<ThemeType>("space")
  const [currentStory, setCurrentStory] = useState<Story | null>(null)
  const [savedStories, setSavedStories] = useState<Story[]>([])
  const [logoError, setLogoError] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string>("")
  const [showThemeDropdown, setShowThemeDropdown] = useState(false)

  // Tommy's magical story prompts by theme
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

  const goToThemeGenerator = (theme: ThemeType) => {
    setSelectedTheme(theme)
    setShowThemeDropdown(false)
    setCurrentStep("ai-generator")
  }

  // HOMEPAGE - Clean with large logo
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

        {/* LARGE TOMMY LOGO - Double size, no decorations */}
        <div className="flex flex-col items-center pt-16 pb-12 relative z-10">
          <div className="relative">
            <img
              src={TOMMY_LOGO_URL}
              alt="StoryLoom - Tommy's Magical World"
              className="w-[768px] h-[512px] object-contain rounded-3xl shadow-2xl"
              onError={() => setLogoError(true)}
            />
            
            {/* Simple fallback logo */}
            {logoError && (
              <div className="w-[768px] h-[512px] bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 rounded-3xl shadow-2xl flex flex-col items-center justify-center text-white">
                <div className="text-[120px] mb-8">🌈</div>
                <h1 className="text-8xl font-bold text-center mb-6">StoryLoom</h1>
                <p className="text-3xl font-medium">Tommy&apos;s Magical World</p>
              </div>
            )}
          </div>
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

  // CHARACTER MANAGEMENT - Same size logo as homepage, no box
  if (currentStep === "characters") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 py-8">
        {/* Large Header Logo - Same size as homepage */}
        <div className="flex items-center justify-center mb-8">
          <img
            src={TOMMY_LOGO_URL}
            alt="StoryLoom"
            className="w-[384px] h-[256px] object-contain rounded-2xl shadow-2xl"
            onError={() => setLogoError(true)}
          />
        </div>

        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-white">Add Your Family Characters</h1>
            <button
              onClick={() => setCurrentStep("start")}
              className="bg-white/20 text-white px-6 py-3 rounded-xl hover:bg-white/30 transition-all"
            >
              🏠 Back to Home
            </button>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6">
            <p className="text-white/90 mb-4 text-lg">
              Add your family members to create personalized adventures in Tommy&apos;s magical world! 🐲✨
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {savedCharacters.map((character) => (
              <div key={character.id} className="bg-white/20 backdrop-blur-md rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-yellow-300 to-orange-400 rounded-xl flex items-center justify-center">
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
                  placeholder="Personality (e.g., curious and brave)"
                  value={character.personality || ""}
                  onChange={(e) => updateCharacter(character.id, { personality: e.target.value })}
                  className="w-full mb-4 px-4 py-3 rounded-lg border border-gray-300 h-20 resize-none text-sm text-gray-800"
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
          
          <div className="text-center space-y-4">
            <button
              onClick={addNewCharacter}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105"
            >
              ➕ Add New Character
            </button>

            {savedCharacters.length > 0 && (
              <button
                onClick={() => setCurrentStep("story-builder")}
                className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 hover:from-blue-300 hover:via-purple-300 hover:to-pink-300 text-white px-12 py-4 rounded-xl font-bold text-xl transition-all hover:scale-105 ml-4"
              >
                📚 Continue to Story Builder
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // STORY BUILDER - 3 options
  if (currentStep === "story-builder") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 py-8">
        {/* Header */}
        <div className="flex items-center justify-center mb-8">
          <img
            src={TOMMY_LOGO_URL}
            alt="StoryLoom"
            className="w-[384px] h-[256px] object-contain rounded-2xl shadow-2xl"
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
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Build Your Own Story */}
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

            {/* AI Generate Story */}
            <div className="bg-white/15 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border-2 border-white/30 hover:scale-105 transition-all">
              <div className="text-center">
                <div className="text-6xl mb-4">🤖</div>
                <h3 className="text-2xl font-bold text-white mb-4">AI Generate a Story</h3>
                <p className="text-white/90 mb-6">Let AI create a magical story with your characters</p>
                <button
                  onClick={() => setCurrentStep("ai-generator")}
                  className="bg-gradient-to-r from-purple-400 to-pink-400 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105 w-full"
                >
                  Generate Story
                </button>
              </div>
            </div>

            {/* Choose from a Theme */}
            <div className="bg-white/15 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border-2 border-white/30 hover:scale-105 transition-all relative">
              <div className="text-center">
                <div className="text-6xl mb-4">🎨</div>
                <h3 className="text-2xl font-bold text-white mb-4">Choose from a Theme</h3>
                <p className="text-white/90 mb-6">Pick a magical theme and create themed adventures</p>
                <button
                  onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                  className="bg-gradient-to-r from-yellow-400 to-orange-400 text-purple-900 px-8 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105 w-full"
                >
                  Choose Theme ▼
                </button>

                {/* Theme Dropdown */}
                {showThemeDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-4 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border-2 border-white/40 z-50">
                    <div className="p-4 space-y-3">
                      {Object.entries(THEME_IMAGES).map(([theme, imageUrl]) => (
                        <button
                          key={theme}
                          onClick={() => goToThemeGenerator(theme as ThemeType)}
                          className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-purple-100 transition-all"
                        >
                          <img 
                            src={imageUrl}
                            alt={theme}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                          <span className="text-purple-900 font-bold text-lg">
                            {THEME_NAMES[theme as ThemeType]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // AI GENERATOR - Theme selection and character choice
  if (currentStep === "ai-generator") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 py-8">
        {/* Header */}
        <div className="flex items-center justify-center mb-8">
          <img
            src={TOMMY_LOGO_URL}
            alt="StoryLoom"
            className="w-[384px] h-[256px] object-contain rounded-2xl shadow-2xl"
            onError={() => setLogoError(true)}
          />
        </div>

        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-bold text-white">AI Story Generator</h1>
            <button
              onClick={() => setCurrentStep("story-builder")}
              className="bg-white/20 text-white px-6 py-3 rounded-xl hover:bg-white/30 transition-all"
            >
              ← Back to Story Builder
            </button>
          </div>

          {/* Selected Theme Display */}
          <div className="bg-white/15 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border-2 border-white/30 mb-8">
            <div className="flex items-center gap-6 mb-6">
              <img 
                src={THEME_IMAGES[selectedTheme]}
                alt={selectedTheme}
                className="w-24 h-24 object-cover rounded-xl"
              />
              <div>
                <h2 className="text-3xl font-bold text-white">{THEME_NAMES[selectedTheme]}</h2>
                <p className="text-white/90 text-lg">Create magical adventures in Tommy&apos;s {selectedTheme} world</p>
              </div>
            </div>

            {/* Character Selection */}
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-white mb-4">Choose Characters for Your Story:</h3>
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
                          {character.name ? character.name.charAt(0).toUpperCase() : '👤'}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-bold">{character.name || 'Unnamed'}</p>
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
            </div>

            {/* Generate Button */}
            {activeCharacters.length > 0 && (
              <div className="text-center">
                <button
                  onClick={() => {
                    // Generate story logic would go here
                    alert(`Generating ${selectedTheme} story with ${activeCharacters.map(c => c.name).join(', ')}!`)
                  }}
                  className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 hover:from-yellow-300 hover:via-orange-300 hover:to-red-300 text-purple-900 px-12 py-6 rounded-2xl font-bold text-2xl shadow-2xl transition-all transform hover:scale-105"
                >
                  🪄 Generate {THEME_NAMES[selectedTheme]} Adventure!
                </button>
              </div>
            )}
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
                <p className="text-xl mb-8">Create your first magical adventure.</p>
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
                <div key={story.id} className="bg-white/20 backdrop-blur-md rounded-2xl p-6 hover:scale-105 transition-all cursor-pointer">
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
                  <p className="text-white/80 text-sm">{story.characters.map(c => c.name).join(", ")}</p>
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
