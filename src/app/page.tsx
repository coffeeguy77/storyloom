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

interface LogoTheme {
    id: string
    imageUrl: string
    themeName: string
    description: string
    storyPrompts: string[]
    backgroundColor: string
    backgroundType: "gradient" | "image"
    backgroundValue: string
    aspectRatio: "3:2"
    uploadedAt: string
    isGitHubDefault?: boolean
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

export default function StoryLoomWithDefaultLogo() {
    const [currentStep, setCurrentStep] = useState<"start" | "characters" | "themes" | "story" | "generating" | "reading" | "library" | "manage-characters">("start")
        const [savedCharacters, setSavedCharacters] = useState<Character[]>([])
            const [activeCharacters, setActiveCharacters] = useState<Character[]>([])
                const [currentStory, setCurrentStory] = useState<Story | null>(null)
                    const [savedStories, setSavedStories] = useState<Story[]>([])
                        const [storyDescription, setStoryDescription] = useState("")
                            const [storyTitle, setStoryTitle] = useState("")
                              
    // Enhanced theme state with GitHub logo
    const [logoThemes, setLogoThemes] = useState<LogoTheme[]>([])
        const [currentTheme, setCurrentTheme] = useState<LogoTheme | null>(null)
            const [aiSuggestedStories, setAiSuggestedStories] = useState<string[]>([])
                const [selectedSuggestion, setSelectedSuggestion] = useState<string>("")
                    
    // Loading magic
    const [isGeneratingStory, setIsGeneratingStory] = useState(false)
      
    // Upload state (for user themes)
    const [showThemeUpload, setShowThemeUpload] = useState(false)
        const [editingTheme, setEditingTheme] = useState<LogoTheme | null>(null)
            const [newThemeName, setNewThemeName] = useState("")
                const [newThemeDescription, setNewThemeDescription] = useState("")
                    const [uploadedFile, setUploadedFile] = useState<File | null>(null)
                        const [isSavingTheme, setIsSavingTheme] = useState(false)
                          
    // Initialize app with GitHub logo as default
    useEffect(() => {
          if (typeof window !== "undefined") {
                  initializeDefaultTheme()
                          loadSavedData()
          }
    }, [])
      
    const initializeDefaultTheme = () => {
          // GitHub logo theme - no localStorage needed!
          const githubDefaultTheme: LogoTheme = {
                  id: "github-storyloom-default",
                  imageUrl: "/logo.png", // Uses the logo.png from your GitHub repo
                  themeName: "StoryLoom Magic",
                  description: "Tommy's magical world with his dragon friend and faithful companion - where stories come to life!",
                  storyPrompts: [
                            "goes on a magical adventure with a friendly dragon",
                            "discovers a book that brings stories to life", 
                            "meets talking animals who need help solving a mystery",
                            "finds a magical paintbrush that makes drawings come alive",
                            "travels to a land where imagination becomes reality"
                          ],
                  backgroundColor: "#8B5CF6",
                  backgroundType: "gradient", 
                  backgroundValue: "from-purple-400 via-pink-500 to-red-500",
                  aspectRatio: "3:2",
                  uploadedAt: new Date().toISOString(),
                  isGitHubDefault: true
          }
            
          // Always set the default theme (no localStorage dependency)
          setCurrentTheme(githubDefaultTheme)
                setLogoThemes([githubDefaultTheme])
                      generateAISuggestions(githubDefaultTheme)
    }
      
    const loadSavedData = () => {
          try {
                  // Load characters
                  const savedCharactersData = localStorage.getItem("storyloom_characters")
                          if (savedCharactersData) {
                                    const characters = JSON.parse(savedCharactersData)
                                              setSavedCharacters(characters)
                                                        const children = characters.filter((c: Character) => c.isChild)
                                                                  setActiveCharacters(children)
                          }
            
                  // Load stories
                  const savedStoriesData = localStorage.getItem("storyloom_stories")
                          if (savedStoriesData) {
                                    setSavedStories(JSON.parse(savedStoriesData))
                          }
          } catch (error) {
                  console.error("Error loading saved data:", error)
          }
    }
      
    const generateAISuggestions = (theme: LogoTheme) => {
          if (!theme) return
            
          if (activeCharacters.length === 0) {
                  setAiSuggestedStories(theme.storyPrompts)
                          setSelectedSuggestion(theme.storyPrompts[0] || "")
                                  setStoryDescription(theme.storyPrompts[0] || "")
                                          return
          }
      
          const characterNames = activeCharacters.map(c => c.name).join(" and ")
                const personalizedPrompts = theme.storyPrompts.map(prompt => 
                        `${characterNames} ${prompt}`
                                                                       )
                      
          setAiSuggestedStories(personalizedPrompts)
                setSelectedSuggestion(personalizedPrompts[0])
                      setStoryDescription(personalizedPrompts[0])
    }
      
    const getThemeBackground = (theme: LogoTheme | null): string => {
          if (!theme) return "from-purple-400 via-pink-500 to-red-500"
                return theme.backgroundValue || "from-purple-400 via-pink-500 to-red-500"
    }
      
    const rotateToRandomTheme = () => {
          if (logoThemes.length > 1) {
                  const availableThemes = logoThemes.filter(theme => theme.id !== currentTheme?.id)
                          const randomTheme = availableThemes[Math.floor(Math.random() * availableThemes.length)]
                                  setCurrentTheme(randomTheme)
                                          generateAISuggestions(randomTheme)
          }
    }
      
    const saveToStorage = (key: string, data: any) => {
          if (typeof window !== "undefined") {
                  try {
                            localStorage.setItem(key, JSON.stringify(data))
                                      return true
                  } catch (error) {
                            console.error("Failed to save to localStorage:", error)
                                      alert("Storage limit reached. Your theme may not be saved permanently.")
                                                return false
                  }
          }
          return false
    }
      
    // Character management
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
                          if (currentTheme) {
                                    generateAISuggestions(currentTheme)
                          }
          }
    }
      
    // START SCREEN WITH GITHUB LOGO ALWAYS LOADING
    if (currentStep === "start") {
          return (
                  <div className={`min-h-screen bg-gradient-to-br ${getThemeBackground(currentTheme)} relative overflow-hidden`}>
                    {/* Magical animated background */}
                            <div className="absolute inset-0 overflow-hidden">
                                      <div className="absolute -top-4 -left-4 w-72 h-72 bg-white/10 rounded-full blur-xl animate-pulse"></div>div>
                                      <div className="absolute top-1/2 right-8 w-48 h-48 bg-yellow-300/20 rounded-full blur-lg animate-bounce"></div>div>
                                      <div className="absolute bottom-8 left-1/4 w-64 h-64 bg-blue-400/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }}></div>div>
                                      <div className="absolute top-1/4 left-1/2 w-32 h-32 bg-pink-300/20 rounded-full blur-md animate-pulse" style={{ animationDelay: '2s' }}></div>div>
                            </div>div>
                  
                    {/* GITHUB LOGO DISPLAY - ALWAYS VISIBLE */}
                          <div className="flex justify-center pt-12 pb-6 relative z-10">
                                    <div className="relative group">
                                                <div className="relative">
                                                              <img
                                                                                src="/logo.png"
                                                                                alt="StoryLoom - Magical Storytelling"
                                                                                style={{
                                                                                                    width: '320px',  // Larger to show off the beautiful logo
                                                                                                    height: '213px', // 3:2 aspect ratio
                                                                                                    objectFit: 'contain'
                                                                                  }}
                                                                                className="rounded-3xl shadow-2xl border-4 border-white/50 group-hover:scale-105 transition-transform duration-300 cursor-pointer bg-white/10 backdrop-blur-sm"
                                                                                onClick={() => logoThemes.length > 1 ? rotateToRandomTheme() : null}
                                                                                onError={(e) => {
                                                                                                    console.log("GitHub logo failed to load, using fallback")
                                                                                                                        // Fallback - hide image and show text logo
                                                                                                    e.currentTarget.style.display = 'none'
                                                                                                                        e.currentTarget.nextElementSibling.style.display = 'block'
                                                                                  }}
                                                                              />
                                                              
                                                  {/* Fallback text logo if GitHub image fails */}
                                                              <div 
                                                                                className="absolute inset-0 bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl shadow-2xl border-4 border-white/50 flex items-center justify-center"
                                                                                style={{ display: 'none' }}
                                                                              >
                                                                              <h1 className="text-4xl font-bold text-white text-center">
                                                                                                StoryLoom
                                                                                                <br />
                                                                                                <span className="text-2xl font-medium">Magic</span>span>
                                                                              </h1>h1>
                                                              </div>div>
                                                </div>div>
                                    
                                      {logoThemes.length > 1 && (
                                  <button
                                                    onClick={() => rotateToRandomTheme()}
                                                    className="absolute -top-3 -right-3 bg-yellow-400 hover:bg-yellow-300 text-purple-900 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all text-lg animate-pulse"
                                                    title="Switch Theme"
                                                  >
                                                  🔄
                                  </button>button>
                                                )}
                                                
                                                <div className="absolute bottom-2 left-2 right-2 bg-black/70 text-white px-4 py-2 rounded-2xl text-center">
                                                              <p className="font-bold text-sm">{currentTheme?.themeName || "StoryLoom Magic"}</p>p>
                                                              <p className="text-xs text-yellow-300">✨ Default Theme</p>p>
                                                </div>div>
                                    </div>div>
                          </div>div>
                  
                    {/* Main content */}
                          <div className="flex flex-col items-center justify-center min-h-[55vh] text-center px-6 relative z-10">
                                    <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20 max-w-3xl">
                                      {activeCharacters.length > 0 && aiSuggestedStories.length > 0 ? (
                                  <div className="space-y-6">
                                                  <h2 className="text-3xl font-bold text-white mb-4">
                                                                    ✨ Ready to Create Magic!
                                                  </h2>h2>
                                                  
                                                  <div className="bg-white/20 rounded-2xl p-6">
                                                                    <h3 className="text-lg font-semibold text-yellow-300 mb-3">
                                                                                        Story Ideas for {activeCharacters.map(c => c.name).join(", ")}
                                                                    </h3>h3>
                                                                    
                                                                    <div className="grid gap-3">
                                                                      {aiSuggestedStories.slice(0, 3).map((suggestion, index) => (
                                                          <div
                                                                                    key={index}
                                                                                    onClick={() => {
                                                                                                                setSelectedSuggestion(suggestion)
                                                                                                                                            setStoryDescription(suggestion)
                                                                                      }}
                                                                                    className={`p-4 rounded-xl cursor-pointer transition-all ${
                                                                                                                selectedSuggestion === suggestion
                                                                                                                  ? "bg-yellow-400 text-purple-900 font-semibold shadow-lg transform scale-105"
                                                                                                                  : "bg-white/20 text-white hover:bg-white/30"
                                                                                      }`}
                                                                                  >
                                                                                  <p className="text-base">{suggestion}</p>p>
                                                          </div>div>
                                                        ))}
                                                                    </div>div>
                                                  </div>div>
                                                  
                                                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                                                    <button
                                                                                          onClick={() => alert("Story generation coming soon! For now, enjoy the beautiful GitHub logo.")}
                                                                                          className="bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-300 hover:to-orange-300 text-purple-900 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl transition-all transform hover:scale-105 flex items-center gap-2"
                                                                                        >
                                                                                        <span className="text-2xl">🪄</span>span>
                                                                                        Create This Magical Story
                                                                    </button>button>
                                                                    
                                                                    <button
                                                                                          onClick={() => setCurrentStep("characters")}
                                                                                          className="bg-white/20 hover:bg-white/30 text-white px-6 py-4 rounded-2xl font-semibold border border-white/30 transition-all"
                                                                                        >
                                                                                        Customize Characters
                                                                    </button>button>
                                                  </div>div>
                                  </div>div>
                                ) : (
                                  <div className="space-y-6">
                                                  <h2 className="text-3xl font-bold text-white mb-4">
                                                                    Welcome to StoryLoom Magic! ✨
                                                  </h2>h2>
                                                  <p className="text-lg text-white/80 mb-6">
                                                                    Create personalized stories with Tommy's magical themes and AI suggestions
                                                  </p>p>
                                                  
                                                  <button
                                                                      onClick={() => setCurrentStep("manage-characters")}
                                                                      className="bg-yellow-400 text-purple-900 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:bg-yellow-300 transition-all transform hover:scale-105"
                                                                    >
                                                                    Add Your Children First
                                                  </button>button>
                                  </div>div>
                                                )}
                                                
                                                <div className="flex justify-center gap-6 mt-6 text-sm">
                                                              <button
                                                                                onClick={() => alert("Theme uploads temporarily disabled due to browser storage limits. Using beautiful GitHub logo!")}
                                                                                className="text-white/80 hover:text-yellow-300 underline flex items-center gap-1"
                                                                              >
                                                                              🎨 Theme Info
                                                              </button>button>
                                                              <button
                                                                                onClick={() => setCurrentStep("library")}
                                                                                className="text-white/80 hover:text-yellow-300 underline flex items-center gap-1"
                                                                              >
                                                                              📚 Story Library
                                                              </button>button>
                                                </div>div>
                                    </div>div>
                          </div>div>
                  </div>div>
                )
    }
  
    // CHARACTER MANAGEMENT SCREEN
    if (currentStep === "manage-characters") {
          return (
                  <div className={`min-h-screen bg-gradient-to-br ${getThemeBackground(currentTheme)} py-8`}>
                          <div className="max-w-6xl mx-auto px-4">
                                    <div className="flex items-center justify-between mb-8">
                                                <h1 className="text-3xl font-bold text-white">Manage Characters</h1>h1>
                                                <button
                                                                onClick={() => setCurrentStep("start")}
                                                                className="bg-white/20 text-white px-6 py-3 rounded-xl hover:bg-white/30 transition-all"
                                                              >
                                                              Back to Home
                                                </button>button>
                                    </div>div>
                                    
                                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6">
                                                <p className="text-white/90 mb-4">
                                                              Save your family members here so you can quickly select them for stories. 
                                                              Children will automatically be selected for new stories.
                                                </p>p>
                                    </div>div>
                          
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                                      {savedCharacters.map((character) => (
                                  <div key={character.id} className="bg-white/20 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                                                  <div className="flex items-center gap-3 mb-4">
                                                                    <div className="aspect-square w-16 h-16 bg-gray-200 rounded-xl flex items-center justify-center overflow-hidden">
                                                                      {character.imageUrl ? (
                                                          <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                          <span className="text-gray-500 text-2xl">👤</span>span>
                                                                                        )}
                                                                    </div>div>
                                                                    <div className="flex-1">
                                                                                        <div className="flex items-center gap-2">
                                                                                                              <input
                                                                                                                                        type="checkbox"
                                                                                                                                        checked={character.isChild}
                                                                                                                                        onChange={(e) => updateCharacter(character.id, { isChild: e.target.checked })}
                                                                                                                                        className="rounded"
                                                                                                                                      />
                                                                                                              <label className="text-white text-sm">Child</label>label>
                                                                                          </div>div>
                                                                    </div>div>
                                                  </div>div>
                                                  
                                                  <input
                                                                      type="text"
                                                                      placeholder="Name"
                                                                      value={character.name}
                                                                      onChange={(e) => updateCharacter(character.id, { name: e.target.value })}
                                                                      className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-300 font-medium"
                                                                    />
                                                  
                                                  <input
                                                                      type="text"
                                                                      placeholder="Age"
                                                                      value={character.age || ""}
                                                                      onChange={(e) => updateCharacter(character.id, { age: e.target.value })}
                                                                      className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-300"
                                                                    />
                                                  
                                                  <textarea
                                                                      placeholder="Personality (e.g., curious and brave, loves dinosaurs)"
                                                                      value={character.personality || ""}
                                                                      onChange={(e) => updateCharacter(character.id, { personality: e.target.value })}
                                                                      className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-300 h-20 resize-none text-sm"
                                                                    />
                                                  
                                                  <textarea
                                                                      placeholder="Favorite things (e.g., trucks, animals, space)"
                                                                      value={character.favoriteThings || ""}
                                                                      onChange={(e) => updateCharacter(character.id, { favoriteThings: e.target.value })}
                                                                      className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-300 h-16 resize-none text-sm"
                                                                    />
                                                  
                                                  <div className="flex gap-2">
                                                                    <button className="flex-1 bg-blue-500 text-white px-3 py-2 rounded-lg text-center text-sm opacity-50 cursor-not-allowed">
                                                                                        Photo Upload (Coming Soon)
                                                                    </button>button>
                                                                    <button
                                                                                          onClick={() => removeCharacter(character.id)}
                                                                                          className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 text-sm"
                                                                                        >
                                                                                        Remove
                                                                    </button>button>
                                                  </div>div>
                                  </div>div>
                                ))}
                                    </div>div>
                                    
                                    <div className="text-center">
                                                <button
                                                                onClick={addNewCharacter}
                                                                className="bg-green-500 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-600 text-lg"
                                                              >
                                                              + Add New Character
                                                </button>button>
                                    </div>div>
                          </div>div>
                  </div>div>
                )
    }
  
    // CHARACTER SELECTION SCREEN
    if (currentStep === "characters") {
          return (
                  <div className={`min-h-screen bg-gradient-to-br ${getThemeBackground(currentTheme)} py-8`}>
                          <div className="max-w-4xl mx-auto px-4">
                                    <h1 className="text-3xl font-bold text-white text-center mb-8">Who's in this story?</h1>h1>
                                    
                                    <div className="bg-white/20 backdrop-blur-md rounded-2xl p-6 mb-6">
                                                <p className="text-white/90 mb-4">
                                                              Select the characters for your story. You can add friends who are visiting too!
                                                </p>p>
                                    </div>div>
                          
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                                      {savedCharacters.map((character) => {
                                  const isActive = activeCharacters.find(c => c.id === character.id)
                                                  return (
                                                                    <div
                                                                                        key={character.id}
                                                                                        onClick={() => toggleCharacterActive(character.id)}
                                                                                        className={`cursor-pointer transition-all rounded-2xl p-4 border-2 ${
                                                                                                              isActive 
                                                                                                                ? "bg-white/30 border-yellow-400 shadow-lg" 
                                                                                                                : "bg-white/10 border-white/20 hover:bg-white/20"
                                                                                          }`}
                                                                                      >
                                                                                      <div className="aspect-square bg-gray-200 rounded-xl mb-3 overflow-hidden">
                                                                                        {character.imageUrl ? (
                                                                                                              <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover" />
                                                                                                            ) : (
                                                                                                              <div className="w-full h-full flex items-center justify-center text-gray-500 text-3xl">
                                                                                                                                      👤
                                                                                                                </div>div>
                                                                                                          )}
                                                                                        </div>div>
                                                                                      
                                                                                      <div className="text-center">
                                                                                                          <p className="text-white font-semibold">{character.name}</p>p>
                                                                                        {character.age && <p className="text-white/70 text-sm">Age {character.age}</p>p>}
                                                                                        {character.isChild && <p className="text-yellow-300 text-xs">Child</p>p>}
                                                                                                          
                                                                                                          <div className="mt-2">
                                                                                                            {isActive ? (
                                                                                                                <div className="bg-yellow-400 text-purple-900 px-3 py-1 rounded-full text-sm font-medium">
                                                                                                                                          ✓ Selected
                                                                                                                  </div>div>
                                                                                                              ) : (
                                                                                                                <div className="bg-white/20 text-white px-3 py-1 rounded-full text-sm">
                                                                                                                                          Tap to select
                                                                                                                  </div>div>
                                                                                                                                )}
                                                                                                            </div>div>
                                                                                        </div>div>
                                                                    </div>div>
                                                                  )
                                      })}
                                    </div>div>
                          
                            {activeCharacters.length > 0 && (
                                <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 mb-6">
                                              <h3 className="text-white font-semibold mb-2">Selected for story:</h3>h3>
                                              <p className="text-white/90">{activeCharacters.map(c => c.name).join(", ")}</p>p>
                                </div>div>
                                    )}
                          
                                    <div className="flex justify-center gap-4">
                                                <button
                                                                onClick={() => setCurrentStep("start")}
                                                                className="bg-white/20 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/30"
                                                              >
                                                              Back to Home
                                                </button>button>
                                                <button
                                                                onClick={() => alert("Story creation coming soon! The GitHub logo integration is working perfectly.")}
                                                                disabled={activeCharacters.length === 0}
                                                                className="bg-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                              >
                                                              Next: Create Story
                                                </button>button>
                                    </div>div>
                          </div>div>
                  </div>div>
                )
    }
  
    // LIBRARY SCREEN
    if (currentStep === "library") {
          return (
                  <div className={`min-h-screen bg-gradient-to-br ${getThemeBackground(currentTheme)} py-8`}>
                          <div className="max-w-6xl mx-auto px-4">
                                    <div className="flex items-center justify-between mb-8">
                                                <h1 className="text-3xl font-bold text-white">Story Library ({savedStories.length})</h1>h1>
                                                <div className="flex gap-3">
                                                              <button
                                                                                onClick={() => setCurrentStep("start")}
                                                                                className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700"
                                                                              >
                                                                              Create New Story
                                                              </button>button>
                                                </div>div>
                                    </div>div>
                                    
                            {savedStories.length === 0 ? (
                                <div className="text-center text-white/80 py-16">
                                              <div className="text-6xl mb-4">📚</div>div>
                                              <p className="text-xl mb-8">No stories yet! Create your first magical story.</p>p>
                                              <button
                                                                onClick={() => setCurrentStep("start")}
                                                                className="bg-yellow-400 text-purple-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-yellow-500"
                                                              >
                                                              Start Creating
                                              </button>button>
                                </div>div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                  {savedStories.map((story) => (
                                                  <div
                                                                      key={story.id}
                                                                      className="bg-white/20 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/30 transition-all"
                                                                    >
                                                                    <div className="aspect-[4/5] bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl mb-4 overflow-hidden shadow-lg flex flex-col items-center justify-center text-gray-400">
                                                                                        <div className="text-4xl mb-2">📖</div>div>
                                                                                        <p className="text-sm text-center px-2">{story.title}</p>p>
                                                                    </div>div>
                                                                    <h3 className="text-lg font-bold text-white mb-2">{story.title}</h3>h3>
                                                                    <p className="text-white/70 text-sm mb-2">
                                                                                        Starring: {story.characters.map(c => c.name).join(", ")}
                                                                    </p>p>
                                                                    <p className="text-white/60 text-xs">
                                                                      {story.wordCount} words • {new Date(story.createdAt).toLocaleDateString()}
                                                                    </p>p>
                                                  </div>div>
                                                ))}
                                </div>div>
                                    )}
                          </div>div>
                  </div>div>
                )
    }
  
    return null
}</div>"use client"

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

interface LogoTheme {
  id: string
  imageUrl: string
  themeName: string
  description: string
  storyPrompts: string[]
  backgroundColor: string
  backgroundType: "gradient" | "image"
  backgroundValue: string
  aspectRatio: "3:2"
  uploadedAt: string
  isGitHubDefault?: boolean
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

export default function StoryLoomWithDefaultLogo() {
  const [currentStep, setCurrentStep] = useState<"start" | "characters" | "themes" | "story" | "generating" | "reading" | "library" | "manage-characters">("start")
  const [savedCharacters, setSavedCharacters] = useState<Character[]>([])
  const [activeCharacters, setActiveCharacters] = useState<Character[]>([])
  const [currentStory, setCurrentStory] = useState<Story | null>(null)
  const [savedStories, setSavedStories] = useState<Story[]>([])
  const [storyDescription, setStoryDescription] = useState("")
  const [storyTitle, setStoryTitle] = useState("")

  // Enhanced theme state with GitHub logo
  const [logoThemes, setLogoThemes] = useState<LogoTheme[]>([])
  const [currentTheme, setCurrentTheme] = useState<LogoTheme | null>(null)
  const [aiSuggestedStories, setAiSuggestedStories] = useState<string[]>([])
  const [selectedSuggestion, setSelectedSuggestion] = useState<string>("")
  
  // Loading magic
  const [isGeneratingStory, setIsGeneratingStory] = useState(false)

  // Upload state (for user themes)
  const [showThemeUpload, setShowThemeUpload] = useState(false)
  const [editingTheme, setEditingTheme] = useState<LogoTheme | null>(null)
  const [newThemeName, setNewThemeName] = useState("")
  const [newThemeDescription, setNewThemeDescription] = useState("")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isSavingTheme, setIsSavingTheme] = useState(false)

  // Initialize app with GitHub logo as default
  useEffect(() => {
    if (typeof window !== "undefined") {
      initializeDefaultTheme()
      loadSavedData()
    }
  }, [])

  const initializeDefaultTheme = () => {
    // GitHub logo theme - no localStorage needed!
    const githubDefaultTheme: LogoTheme = {
      id: "github-storyloom-default",
      imageUrl: "https://raw.githubusercontent.com/coffeeguy77/storyloom/main/logo.png", // Direct GitHub link
      themeName: "StoryLoom Magic",
      description: "Tommy's magical world with his dragon friend and faithful companion - where stories come to life!",
      storyPrompts: [
        "goes on a magical adventure with a friendly dragon",
        "discovers a book that brings stories to life", 
        "meets talking animals who need help solving a mystery",
        "finds a magical paintbrush that makes drawings come alive",
        "travels to a land where imagination becomes reality"
      ],
      backgroundColor: "#8B5CF6",
      backgroundType: "gradient", 
      backgroundValue: "from-purple-400 via-pink-500 to-red-500",
      aspectRatio: "3:2",
      uploadedAt: new Date().toISOString(),
      isGitHubDefault: true
    }

    // Always set the default theme (no localStorage dependency)
    setCurrentTheme(githubDefaultTheme)
    setLogoThemes([githubDefaultTheme])
    generateAISuggestions(githubDefaultTheme)
  }

  const loadSavedData = () => {
    try {
      // Load characters
      const savedCharactersData = localStorage.getItem("storyloom_characters")
      if (savedCharactersData) {
        const characters = JSON.parse(savedCharactersData)
        setSavedCharacters(characters)
        const children = characters.filter((c: Character) => c.isChild)
        setActiveCharacters(children)
      }

      // Load stories
      const savedStoriesData = localStorage.getItem("storyloom_stories")
      if (savedStoriesData) {
        setSavedStories(JSON.parse(savedStoriesData))
      }

      // Load any additional user themes (but always keep GitHub default)
      const savedThemesData = localStorage.getItem("storyloom_themes")
      if (savedThemesData) {
        try {
          const userThemes = JSON.parse(savedThemesData)
          // Filter out any old default themes and merge with new GitHub default
          const validUserThemes = userThemes.filter((t: LogoTheme) => !t.isGitHubDefault)
          const githubDefault = logoThemes[0] // Our GitHub theme
          setLogoThemes([githubDefault, ...validUserThemes])
        } catch (error) {
          console.log("Error loading user themes, using GitHub default only")
        }
      }
    } catch (error) {
      console.error("Error loading saved data:", error)
    }
  }

  const generateAISuggestions = (theme: LogoTheme) => {
    if (!theme) return

    if (activeCharacters.length === 0) {
      setAiSuggestedStories(theme.storyPrompts)
      setSelectedSuggestion(theme.storyPrompts[0] || "")
      setStoryDescription(theme.storyPrompts[0] || "")
      return
    }

    const characterNames = activeCharacters.map(c => c.name).join(" and ")
    const personalizedPrompts = theme.storyPrompts.map(prompt => 
      `${characterNames} ${prompt}`
    )
    
    setAiSuggestedStories(personalizedPrompts)
    setSelectedSuggestion(personalizedPrompts[0])
    setStoryDescription(personalizedPrompts[0])
  }

  const getThemeBackground = (theme: LogoTheme | null): string => {
    if (!theme) return "from-purple-400 via-pink-500 to-red-500"
    return theme.backgroundValue || "from-purple-400 via-pink-500 to-red-500"
  }

  const rotateToRandomTheme = () => {
    if (logoThemes.length > 1) {
      const availableThemes = logoThemes.filter(theme => theme.id !== currentTheme?.id)
      const randomTheme = availableThemes[Math.floor(Math.random() * availableThemes.length)]
      setCurrentTheme(randomTheme)
      generateAISuggestions(randomTheme)
    }
  }

  const saveToStorage = (key: string, data: any) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(key, JSON.stringify(data))
        return true
      } catch (error) {
        console.error("Failed to save to localStorage:", error)
        alert("Storage limit reached. Your theme may not be saved permanently.")
        return false
      }
    }
    return false
  }

  // Character management
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
      if (currentTheme) {
        generateAISuggestions(currentTheme)
      }
    }
  }

  // START SCREEN WITH GITHUB LOGO ALWAYS LOADING
  if (currentStep === "start") {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${getThemeBackground(currentTheme)} relative overflow-hidden`}>
        {/* Magical animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-4 -left-4 w-72 h-72 bg-white/10 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute top-1/2 right-8 w-48 h-48 bg-yellow-300/20 rounded-full blur-lg animate-bounce"></div>
          <div className="absolute bottom-8 left-1/4 w-64 h-64 bg-blue-400/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/4 left-1/2 w-32 h-32 bg-pink-300/20 rounded-full blur-md animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        {/* GITHUB LOGO DISPLAY - ALWAYS VISIBLE */}
        <div className="flex justify-center pt-12 pb-6 relative z-10">
          <div className="relative group">
            <div className="relative">
              <img
                src="https://raw.githubusercontent.com/coffeeguy77/storyloom/main/logo.png"
                alt="StoryLoom - Magical Storytelling"
                style={{
                  width: '320px',  // Larger to show off the beautiful logo
                  height: '213px', // 3:2 aspect ratio
                  objectFit: 'contain'
                }}
                className="rounded-3xl shadow-2xl border-4 border-white/50 group-hover:scale-105 transition-transform duration-300 cursor-pointer bg-white/10 backdrop-blur-sm"
                onClick={() => logoThemes.length > 1 ? rotateToRandomTheme() : null}
                onError={(e) => {
                  console.log("GitHub logo failed to load, using fallback")
                  // Fallback - hide image and show text logo
                  e.currentTarget.style.display = 'none'
                  e.currentTarget.nextElementSibling.style.display = 'block'
                }}
              />
              
              {/* Fallback text logo if GitHub image fails */}
              <div 
                className="absolute inset-0 bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl shadow-2xl border-4 border-white/50 flex items-center justify-center"
                style={{ display: 'none' }}
              >
                <h1 className="text-4xl font-bold text-white text-center">
                  StoryLoom
                  <br />
                  <span className="text-2xl font-medium">Magic</span>
                </h1>
              </div>
            </div>

            {logoThemes.length > 1 && (
              <button
                onClick={() => rotateToRandomTheme()}
                className="absolute -top-3 -right-3 bg-yellow-400 hover:bg-yellow-300 text-purple-900 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all text-lg animate-pulse"
                title="Switch Theme"
              >
                🔄
              </button>
            )}
            
            <div className="absolute bottom-2 left-2 right-2 bg-black/70 text-white px-4 py-2 rounded-2xl text-center">
              <p className="font-bold text-sm">{currentTheme?.themeName || "StoryLoom Magic"}</p>
              <p className="text-xs text-yellow-300">✨ Default Theme</p>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-col items-center justify-center min-h-[55vh] text-center px-6 relative z-10">
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20 max-w-3xl">
            {activeCharacters.length > 0 && aiSuggestedStories.length > 0 ? (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-white mb-4">
                  ✨ Ready to Create Magic!
                </h2>
                
                <div className="bg-white/20 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-yellow-300 mb-3">
                    Story Ideas for {activeCharacters.map(c => c.name).join(", ")}
                  </h3>
                  
                  <div className="grid gap-3">
                    {aiSuggestedStories.slice(0, 3).map((suggestion, index) => (
                      <div
                        key={index}
                        onClick={() => {
                          setSelectedSuggestion(suggestion)
                          setStoryDescription(suggestion)
                        }}
                        className={`p-4 rounded-xl cursor-pointer transition-all ${
                          selectedSuggestion === suggestion
                            ? "bg-yellow-400 text-purple-900 font-semibold shadow-lg transform scale-105"
                            : "bg-white/20 text-white hover:bg-white/30"
                        }`}
                      >
                        <p className="text-base">{suggestion}</p>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => alert("Story generation coming soon! For now, enjoy the beautiful GitHub logo.")}
                    className="bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-300 hover:to-orange-300 text-purple-900 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl transition-all transform hover:scale-105 flex items-center gap-2"
                  >
                    <span className="text-2xl">🪄</span>
                    Create This Magical Story
                  </button>
                  
                  <button
                    onClick={() => setCurrentStep("characters")}
                    className="bg-white/20 hover:bg-white/30 text-white px-6 py-4 rounded-2xl font-semibold border border-white/30 transition-all"
                  >
                    Customize Characters
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-white mb-4">
                  Welcome to StoryLoom Magic! ✨
                </h2>
                <p className="text-lg text-white/80 mb-6">
                  Create personalized stories with Tommy's magical themes and AI suggestions
                </p>
                
                <button
                  onClick={() => setCurrentStep("manage-characters")}
                  className="bg-yellow-400 text-purple-900 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:bg-yellow-300 transition-all transform hover:scale-105"
                >
                  Add Your Children First
                </button>
              </div>
            )}
            
            <div className="flex justify-center gap-6 mt-6 text-sm">
              <button
                onClick={() => alert("Theme uploads temporarily disabled due to browser storage limits. Using beautiful GitHub logo!")}
                className="text-white/80 hover:text-yellow-300 underline flex items-center gap-1"
              >
                🎨 Theme Info
              </button>
              <button
                onClick={() => setCurrentStep("library")}
                className="text-white/80 hover:text-yellow-300 underline flex items-center gap-1"
              >
                📚 Story Library
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // CHARACTER MANAGEMENT SCREEN
  if (currentStep === "manage-characters") {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${getThemeBackground(currentTheme)} py-8`}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-white">Manage Characters</h1>
            <button
              onClick={() => setCurrentStep("start")}
              className="bg-white/20 text-white px-6 py-3 rounded-xl hover:bg-white/30 transition-all"
            >
              Back to Home
            </button>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6">
            <p className="text-white/90 mb-4">
              Save your family members here so you can quickly select them for stories. 
              Children will automatically be selected for new stories.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {savedCharacters.map((character) => (
              <div key={character.id} className="bg-white/20 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="aspect-square w-16 h-16 bg-gray-200 rounded-xl flex items-center justify-center overflow-hidden">
                    {character.imageUrl ? (
                      <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-gray-500 text-2xl">👤</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={character.isChild}
                        onChange={(e) => updateCharacter(character.id, { isChild: e.target.checked })}
                        className="rounded"
                      />
                      <label className="text-white text-sm">Child</label>
                    </div>
                  </div>
                </div>
                
                <input
                  type="text"
                  placeholder="Name"
                  value={character.name}
                  onChange={(e) => updateCharacter(character.id, { name: e.target.value })}
                  className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-300 font-medium"
                />
                
                <input
                  type="text"
                  placeholder="Age"
                  value={character.age || ""}
                  onChange={(e) => updateCharacter(character.id, { age: e.target.value })}
                  className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-300"
                />
                
                <textarea
                  placeholder="Personality (e.g., curious and brave, loves dinosaurs)"
                  value={character.personality || ""}
                  onChange={(e) => updateCharacter(character.id, { personality: e.target.value })}
                  className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-300 h-20 resize-none text-sm"
                />
                
                <textarea
                  placeholder="Favorite things (e.g., trucks, animals, space)"
                  value={character.favoriteThings || ""}
                  onChange={(e) => updateCharacter(character.id, { favoriteThings: e.target.value })}
                  className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-300 h-16 resize-none text-sm"
                />
                
                <div className="flex gap-2">
                  <button className="flex-1 bg-blue-500 text-white px-3 py-2 rounded-lg text-center text-sm opacity-50 cursor-not-allowed">
                    Photo Upload (Coming Soon)
                  </button>
                  <button
                    onClick={() => removeCharacter(character.id)}
                    className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center">
            <button
              onClick={addNewCharacter}
              className="bg-green-500 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-600 text-lg"
            >
              + Add New Character
            </button>
          </div>
        </div>
      </div>
    )
  }

  // CHARACTER SELECTION SCREEN
  if (currentStep === "characters") {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${getThemeBackground(currentTheme)} py-8`}>
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-white text-center mb-8">Who's in this story?</h1>
          
          <div className="bg-white/20 backdrop-blur-md rounded-2xl p-6 mb-6">
            <p className="text-white/90 mb-4">
              Select the characters for your story. You can add friends who are visiting too!
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            {savedCharacters.map((character) => {
              const isActive = activeCharacters.find(c => c.id === character.id)
              return (
                <div
                  key={character.id}
                  onClick={() => toggleCharacterActive(character.id)}
                  className={`cursor-pointer transition-all rounded-2xl p-4 border-2 ${
                    isActive 
                      ? "bg-white/30 border-yellow-400 shadow-lg" 
                      : "bg-white/10 border-white/20 hover:bg-white/20"
                  }`}
                >
                  <div className="aspect-square bg-gray-200 rounded-xl mb-3 overflow-hidden">
                    {character.imageUrl ? (
                      <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 text-3xl">
                        👤
                      </div>
                    )}
                  </div>
                  
                  <div className="text-center">
                    <p className="text-white font-semibold">{character.name}</p>
                    {character.age && <p className="text-white/70 text-sm">Age {character.age}</p>}
                    {character.isChild && <p className="text-yellow-300 text-xs">Child</p>}
                    
                    <div className="mt-2">
                      {isActive ? (
                        <div className="bg-yellow-400 text-purple-900 px-3 py-1 rounded-full text-sm font-medium">
                          ✓ Selected
                        </div>
                      ) : (
                        <div className="bg-white/20 text-white px-3 py-1 rounded-full text-sm">
                          Tap to select
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {activeCharacters.length > 0 && (
            <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 mb-6">
              <h3 className="text-white font-semibold mb-2">Selected for story:</h3>
              <p className="text-white/90">{activeCharacters.map(c => c.name).join(", ")}</p>
            </div>
          )}

          <div className="flex justify-center gap-4">
            <button
              onClick={() => setCurrentStep("start")}
              className="bg-white/20 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/30"
            >
              Back to Home
            </button>
            <button
              onClick={() => alert("Story creation coming soon! The GitHub logo integration is working perfectly.")}
              disabled={activeCharacters.length === 0}
              className="bg-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next: Create Story
            </button>
          </div>
        </div>
      </div>
    )
  }

  // LIBRARY SCREEN
  if (currentStep === "library") {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${getThemeBackground(currentTheme)} py-8`}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-white">Story Library ({savedStories.length})</h1>
            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep("start")}
                className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700"
              >
                Create New Story
              </button>
            </div>
          </div>
          
          {savedStories.length === 0 ? (
            <div className="text-center text-white/80 py-16">
              <div className="text-6xl mb-4">📚</div>
              <p className="text-xl mb-8">No stories yet! Create your first magical story.</p>
              <button
                onClick={() => setCurrentStep("start")}
                className="bg-yellow-400 text-purple-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-yellow-500"
              >
                Start Creating
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedStories.map((story) => (
                <div
                  key={story.id}
                  className="bg-white/20 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:bg-white/30 transition-all"
                >
                  <div className="aspect-[4/5] bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl mb-4 overflow-hidden shadow-lg flex flex-col items-center justify-center text-gray-400">
                    <div className="text-4xl mb-2">📖</div>
                    <p className="text-sm text-center px-2">{story.title}</p>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{story.title}</h3>
                  <p className="text-white/70 text-sm mb-2">
                    Starring: {story.characters.map(c => c.name).join(", ")}
                  </p>
                  <p className="text-white/60 text-xs">
                    {story.wordCount} words • {new Date(story.createdAt).toLocaleDateString()}
                  </p>
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
