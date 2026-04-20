"use client"

// src/app/page.tsx
// StoryLoom — WITH CUSTOM TOMMY ICONS
// Replaced all stock emojis with beautiful Tommy-themed Cloudinary images

import { useEffect, useMemo, useState } from "react"
import {
  buildImagePrompt,
  type ThemeId,
  type PromptCharacter,
} from "@/lib/imagePrompts"
import { buildStoryPrompt, buildStoryTitle } from "@/lib/storyPrompts"

// ---------- Cloudinary asset URLs ----------
const CLOUDINARY = {
  tommyLogo: "https://res.cloudinary.com/dzx6x1hou/image/upload/v1776662026/tommy-logo.png",
  themes: {
    space: "https://res.cloudinary.com/dzx6x1hou/image/upload/v1776661893/space.png",
    jungle: "https://res.cloudinary.com/dzx6x1hou/image/upload/v1776662020/jungle.png",
    ocean: "https://res.cloudinary.com/dzx6x1hou/image/upload/v1776662024/ocean.png",
    dinosaur: "https://res.cloudinary.com/dzx6x1hou/image/upload/v1776662024/dinosaur.png",
    pirate: "https://res.cloudinary.com/dzx6x1hou/image/upload/v1776662161/pirate.png",
    "monster-trucks": "https://res.cloudinary.com/dzx6x1hou/image/upload/v1776662021/monster-trucks.png",
  } satisfies Record<ThemeId, string>,
  // NEW: Custom Tommy-themed icons
  icons: {
    chooseTheme: "https://res.cloudinary.com/dzx6x1hou/image/upload/v1776688052/tommy-theme.png",
    aiGenerate: "https://res.cloudinary.com/dzx6x1hou/image/upload/v1776688049/tommy-ai.png", 
    buildStory: "https://res.cloudinary.com/dzx6x1hou/image/upload/v1776688046/tommy-write.png",
    addFamily: "https://res.cloudinary.com/dzx6x1hou/image/upload/v1776688045/my-kids.png",
    createStories: "https://res.cloudinary.com/dzx6x1hou/image/upload/v1776688046/tommy-dream.png",
    storyLibrary: "https://res.cloudinary.com/dzx6x1hou/image/upload/v1776688047/tommy-read.png"
  }
} as const

const THEME_ORDER: ThemeId[] = [
  "space",
  "jungle", 
  "ocean",
  "dinosaur",
  "pirate",
  "monster-trucks",
]

const THEME_LABEL: Record<ThemeId, string> = {
  space: "Space Theme",
  jungle: "Jungle Theme", 
  ocean: "Ocean Theme",
  dinosaur: "Dinosaur Theme",
  pirate: "Pirate Theme",
  "monster-trucks": "Monster Trucks Theme",
}

// ---------- Types ----------
type Character = {
  id: string
  name: string
  age?: string
  personality?: string
  isGuest: boolean
}

type SavedStory = {
  id: string
  title: string
  body: string
  coverUrl: string
  theme: ThemeId | "custom"
  imagePrompt: string
  storyPromptUser: string
  createdAt: number
  characterNames: string[]
  isManual?: boolean
}

type Screen =
  | "home"
  | "characters"
  | "builder"
  | "manualBuilder"
  | "aiBuilder"
  | "themeList"     // SPECIAL: Shows theme images, NOT Tommy's logo
  | "prepare"      // SPECIAL: Shows theme image, NOT Tommy's logo  
  | "review"
  | "generating" 
  | "reading"
  | "library"

// ---------- Storage keys ----------
const LS_CHARACTERS = "storyloom:characters"
const LS_STORIES = "storyloom:stories"

// ---------- Utility ----------
const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

function dedupeTommy(chars: PromptCharacter[]): PromptCharacter[] {
  let tommySeen = false
  return chars.filter((c) => {
    if (c.name.toLowerCase() === "tommy") {
      if (tommySeen) return false
      tommySeen = true
    }
    return true
  })
}

// ===================================================================
// FIXED ANIMATED BACKGROUND COMPONENT
// ===================================================================

function AnimatedBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden -z-10">
      {/* Base gradient layer */}
      <div 
        className="absolute inset-0 w-full h-full"
        style={{
          background: `linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)`,
          animation: `colorShift 8s ease-in-out infinite`
        }}
      />
      
      {/* Floating gradient orbs - FIXED: No transform translations */}
      <div 
        className="absolute w-full h-full"
        style={{
          background: `
            radial-gradient(circle at 25% 25%, rgba(255, 107, 107, 0.4) 0%, transparent 40%),
            radial-gradient(circle at 75% 75%, rgba(78, 205, 196, 0.4) 0%, transparent 40%),
            radial-gradient(circle at 50% 50%, rgba(255, 195, 113, 0.3) 0%, transparent 35%)
          `,
          animation: `orbShift 10s ease-in-out infinite`
        }}
      />
      
      {/* Secondary floating orbs */}
      <div 
        className="absolute w-full h-full opacity-70"
        style={{
          background: `
            radial-gradient(circle at 80% 20%, rgba(199, 125, 255, 0.3) 0%, transparent 30%),
            radial-gradient(circle at 20% 80%, rgba(255, 182, 193, 0.3) 0%, transparent 35%),
            radial-gradient(circle at 60% 40%, rgba(135, 206, 250, 0.25) 0%, transparent 25%)
          `,
          animation: `orbShiftAlt 12s ease-in-out infinite reverse`
        }}
      />
      
      <style jsx global>{`
        @keyframes colorShift {
          0% { filter: hue-rotate(0deg) brightness(1) saturate(1); }
          25% { filter: hue-rotate(90deg) brightness(1.1) saturate(1.2); }
          50% { filter: hue-rotate(180deg) brightness(0.9) saturate(0.8); }
          75% { filter: hue-rotate(270deg) brightness(1.05) saturate(1.1); }
          100% { filter: hue-rotate(360deg) brightness(1) saturate(1); }
        }
        
        @keyframes orbShift {
          0%, 100% { 
            background: 
              radial-gradient(circle at 25% 25%, rgba(255, 107, 107, 0.4) 0%, transparent 40%),
              radial-gradient(circle at 75% 75%, rgba(78, 205, 196, 0.4) 0%, transparent 40%),
              radial-gradient(circle at 50% 50%, rgba(255, 195, 113, 0.3) 0%, transparent 35%);
          }
          33% { 
            background: 
              radial-gradient(circle at 40% 10%, rgba(255, 107, 107, 0.5) 0%, transparent 45%),
              radial-gradient(circle at 60% 90%, rgba(78, 205, 196, 0.3) 0%, transparent 35%),
              radial-gradient(circle at 20% 60%, rgba(255, 195, 113, 0.4) 0%, transparent 40%);
          }
          66% { 
            background: 
              radial-gradient(circle at 70% 30%, rgba(255, 107, 107, 0.3) 0%, transparent 35%),
              radial-gradient(circle at 30% 70%, rgba(78, 205, 196, 0.5) 0%, transparent 45%),
              radial-gradient(circle at 80% 80%, rgba(255, 195, 113, 0.3) 0%, transparent 30%);
          }
        }
        
        @keyframes orbShiftAlt {
          0%, 100% { 
            background: 
              radial-gradient(circle at 80% 20%, rgba(199, 125, 255, 0.3) 0%, transparent 30%),
              radial-gradient(circle at 20% 80%, rgba(255, 182, 193, 0.3) 0%, transparent 35%),
              radial-gradient(circle at 60% 40%, rgba(135, 206, 250, 0.25) 0%, transparent 25%);
          }
          50% { 
            background: 
              radial-gradient(circle at 15% 40%, rgba(199, 125, 255, 0.4) 0%, transparent 35%),
              radial-gradient(circle at 85% 60%, rgba(255, 182, 193, 0.25) 0%, transparent 30%),
              radial-gradient(circle at 40% 20%, rgba(135, 206, 250, 0.3) 0%, transparent 28%);
          }
        }
      `}</style>
    </div>
  )
}

// ===================================================================
// TOMMY LOGO COMPONENTS - Using regular img tags
// ===================================================================

function TommyHeaderLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex justify-center mb-8 ${className}`}>
      <img
        src={CLOUDINARY.tommyLogo}
        alt="StoryLoom — Tommy's magical stories"
        className="w-full max-w-[400px] h-auto drop-shadow-2xl filter brightness-110"
        style={{ imageRendering: 'auto' }}
        onError={(e) => {
          console.error('Tommy header logo failed to load:', e);
          // Fallback to direct URL if needed
          const target = e.target as HTMLImageElement;
          if (target.src !== CLOUDINARY.tommyLogo) {
            target.src = CLOUDINARY.tommyLogo;
          }
        }}
        onLoad={() => console.log('Tommy header logo loaded successfully')}
      />
    </div>
  )
}

function TommyLogo({ size = "large", className = "" }: { size?: "large" | "medium" | "small", className?: string }) {
  const sizeClasses = {
    large: "w-full max-w-[768px] h-auto",
    medium: "w-full max-w-[512px] h-auto", 
    small: "w-full max-w-[384px] h-auto"
  }
  
  return (
    <div className={`flex justify-center ${className}`}>
      <img
        src={CLOUDINARY.tommyLogo}
        alt="StoryLoom — Tommy's magical stories"
        className={`${sizeClasses[size]} drop-shadow-2xl filter brightness-110`}
        style={{ imageRendering: 'auto' }}
        onError={(e) => {
          console.error('Tommy main logo failed to load:', e);
          // Fallback to direct URL if needed
          const target = e.target as HTMLImageElement;
          if (target.src !== CLOUDINARY.tommyLogo) {
            target.src = CLOUDINARY.tommyLogo;
          }
        }}
        onLoad={() => console.log('Tommy main logo loaded successfully')}
      />
    </div>
  )
}

// ===================================================================
// NEW: CUSTOM TOMMY ICON COMPONENT
// ===================================================================

function TommyIcon({ 
  iconKey, 
  alt, 
  className = "" 
}: { 
  iconKey: keyof typeof CLOUDINARY.icons
  alt: string
  className?: string 
}) {
  return (
    <img
      src={CLOUDINARY.icons[iconKey]}
      alt={alt}
      className={`w-16 h-16 object-contain drop-shadow-lg filter brightness-110 ${className}`}
      style={{ imageRendering: 'auto' }}
      onError={(e) => {
        console.error(`Tommy icon ${iconKey} failed to load:`, e);
      }}
      onLoad={() => console.log(`Tommy icon ${iconKey} loaded successfully`)}
    />
  )
}

// ===================================================================
// MAGICAL CARD COMPONENT  
// ===================================================================

function MagicalCard({ 
  children, 
  className = "",
  glowColor = "rgba(255, 255, 255, 0.1)"
}: { 
  children: React.ReactNode
  className?: string 
  glowColor?: string
}) {
  return (
    <div 
      className={`
        relative bg-white/10 backdrop-blur-md rounded-3xl p-8 
        border border-white/20 shadow-2xl hover:shadow-3xl
        transition-all duration-500 ease-out
        hover:transform hover:scale-105 hover:-translate-y-2
        group cursor-pointer
        ${className}
      `}
      style={{
        boxShadow: `
          0 25px 50px -12px rgba(0, 0, 0, 0.25),
          0 0 0 1px rgba(255, 255, 255, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.2)
        `
      }}
    >
      {/* Animated glow effect */}
      <div 
        className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at center, ${glowColor} 0%, transparent 70%)`,
          filter: "blur(20px)"
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}

// ===================================================================
// MAIN PAGE COMPONENT
// ===================================================================

export default function StoryLoomPage() {
  // ---------- Navigation ----------
  const [screen, setScreen] = useState<Screen>("home")
  
  // ---------- Persistent state ----------
  const [characters, setCharacters] = useState<Character[]>([])
  const [stories, setStories] = useState<SavedStory[]>([])

  useEffect(() => {
    try {
      const c = localStorage.getItem(LS_CHARACTERS)
      if (c) setCharacters(JSON.parse(c))
      const s = localStorage.getItem(LS_STORIES)
      if (s) setStories(JSON.parse(s))
    } catch {
      // ignore corrupt storage
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(LS_CHARACTERS, JSON.stringify(characters))
  }, [characters])

  useEffect(() => {
    localStorage.setItem(LS_STORIES, JSON.stringify(stories))
  }, [stories])

  // ---------- Flow state ----------
  const [selectedTheme, setSelectedTheme] = useState<ThemeId | null>(null)
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([])
  const [customAngle, setCustomAngle] = useState("")

  // Review screen state
  const [storyPromptUser, setStoryPromptUser] = useState("")
  const [storyPromptSystem, setStoryPromptSystem] = useState("")
  const [imagePrompt, setImagePrompt] = useState("")
  const [storyTitle, setStoryTitle] = useState("")

  // Generation state
  const [genStage, setGenStage] = useState<"idle" | "story" | "image" | "done">("idle")
  const [genError, setGenError] = useState<string | null>(null)

  // Current/reading story
  const [currentStory, setCurrentStory] = useState<SavedStory | null>(null)

  // Manual builder state
  const [manualTitle, setManualTitle] = useState("")
  const [manualStory, setManualStory] = useState("")

  // AI builder state  
  const [aiPrompt, setAiPrompt] = useState("")
  const [aiGenre, setAiGenre] = useState("adventure")
  const [aiLength, setAiLength] = useState("medium")

  // ---------- Character editor ----------
  const addFamilyMember = () => {
    setCharacters((prev) => [
      ...prev,
      { id: uid(), name: "", age: "", personality: "", isGuest: false },
    ])
  }
  const addGuest = () => {
    setCharacters((prev) => [
      ...prev,
      { id: uid(), name: "", isGuest: true },
    ])
  }
  const updateCharacter = (id: string, patch: Partial<Character>) => {
    setCharacters((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }
  const removeCharacter = (id: string) => {
    setCharacters((prev) => prev.filter((c) => c.id !== id))
  }

  // ---------- Flow: theme picked → pick characters → review ----------
  const pickTheme = (theme: ThemeId) => {
    setSelectedTheme(theme)
    setSelectedCharacterIds(
      characters.filter((c) => !c.isGuest && c.name.trim()).map((c) => c.id)
    )
    setCustomAngle("")
    setScreen("prepare")
  }

  const proceedToReview = () => {
    if (!selectedTheme) return
    const chosen = characters
      .filter((c) => selectedCharacterIds.includes(c.id) && c.name.trim())
      .map<PromptCharacter>((c) => ({
        name: c.name.trim(),
        age: c.age || undefined,
        personality: c.personality || undefined,
        isGuest: c.isGuest,
      }))

    const deduped = dedupeTommy(chosen)
    const title = buildStoryTitle({ theme: selectedTheme, characters: deduped })
    setStoryTitle(title)

    const { system, user } = buildStoryPrompt({
      theme: selectedTheme,
      characters: deduped,
      customAngle: customAngle.trim() || undefined,
    })
    setStoryPromptSystem(system)
    setStoryPromptUser(user)

    const imgPrompt = buildImagePrompt({
      theme: selectedTheme,
      characters: deduped,
      storyTitle: title,
    })
    setImagePrompt(imgPrompt)

    setScreen("review")
  }

  // ---------- Manual story save ----------
  const saveManualStory = async () => {
    if (!manualTitle.trim() || !manualStory.trim()) {
      alert("Please fill in both title and story!")
      return
    }

    setScreen("generating")
    setGenError(null)

    try {
      // Generate cover image for manual story
      setGenStage("image")
      const imgRes = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Whimsical children's book cover illustration for a story titled "${manualTitle}". Beautiful, colorful, magical style with soft lighting and fantasy elements. Story excerpt: "${manualStory.slice(0, 200)}"`,
          theme: "custom",
          storyTitle: manualTitle,
          quality: "standard", 
          size: "1024x1024",
          style: "vivid",
        }),
      })

      if (!imgRes.ok) {
        throw new Error(`Cover generation failed`)
      }
      const { url: coverUrl }: { url: string } = await imgRes.json()

      // Save manual story
      const saved: SavedStory = {
        id: uid(),
        title: manualTitle,
        body: manualStory,
        coverUrl,
        theme: "custom",
        imagePrompt: `Manual story cover for "${manualTitle}"`,
        storyPromptUser: "User-written story",
        createdAt: Date.now(),
        characterNames: [],
        isManual: true,
      }
      
      setStories((prev) => [saved, ...prev])
      setCurrentStory(saved)
      setGenStage("done")
      setScreen("reading")
      
      // Reset form
      setManualTitle("")
      setManualStory("")
    } catch (err) {
      console.error(err)
      setGenError(err instanceof Error ? err.message : "Unknown error")
      setGenStage("idle")
    }
  }

  // ---------- AI story generation ----------
  const generateAiStory = async () => {
    if (!aiPrompt.trim()) {
      alert("Please describe what story you'd like!")
      return
    }

    setScreen("generating")
    setGenError(null)

    try {
      // 1. Generate story
      setGenStage("story")
      const characterNames = characters.filter(c => c.name.trim()).map(c => c.name)
      const characterContext = characterNames.length > 0 
        ? ` Include these characters if relevant: ${characterNames.join(", ")}.`
        : ""

      const lengthMap = {
        short: "Keep it short and sweet (3-4 paragraphs).",
        medium: "Make it a good medium length (5-7 paragraphs).", 
        long: "Make it a longer, detailed story (8-12 paragraphs)."
      }

      const systemPrompt = `You are a children's storyteller. Write engaging, wholesome stories for kids aged 4-10. Use simple language, vivid descriptions, and positive messages. Focus on friendship, adventure, and learning.`
      
      const userPrompt = `Write a ${aiGenre} story about: ${aiPrompt}${characterContext} ${lengthMap[aiLength as keyof typeof lengthMap]} Make sure it has a clear beginning, middle, and end with a positive message.`

      const storyRes = await fetch("/api/generate-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt,
          userPrompt,
        }),
      })

      if (!storyRes.ok) {
        throw new Error(`Story generation failed`)
      }
      const { story }: { story: string } = await storyRes.json()

      // 2. Generate cover
      setGenStage("image")
      const imgRes = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Whimsical children's book cover illustration in ${aiGenre} style. ${aiPrompt}. Beautiful, colorful, magical artwork with soft lighting and fantasy elements. Story excerpt: "${story.slice(0, 200)}"`,
          theme: "custom",
          storyTitle: `AI Generated ${aiGenre} Story`,
          quality: "standard",
          size: "1024x1024", 
          style: "vivid",
        }),
      })

      if (!imgRes.ok) {
        throw new Error(`Cover generation failed`)
      }
      const { url: coverUrl }: { url: string } = await imgRes.json()

      // 3. Save
      const saved: SavedStory = {
        id: uid(),
        title: `The ${aiGenre.charAt(0).toUpperCase() + aiGenre.slice(1)} of ${aiPrompt.slice(0, 30)}${aiPrompt.length > 30 ? "..." : ""}`,
        body: story,
        coverUrl,
        theme: "custom",
        imagePrompt: `AI generated ${aiGenre} cover`,
        storyPromptUser: aiPrompt,
        createdAt: Date.now(),
        characterNames,
        isManual: false,
      }

      setStories((prev) => [saved, ...prev])
      setCurrentStory(saved)
      setGenStage("done")  
      setScreen("reading")
      
      // Reset form
      setAiPrompt("")
      setAiGenre("adventure")
      setAiLength("medium")
    } catch (err) {
      console.error(err)
      setGenError(err instanceof Error ? err.message : "Unknown error")
      setGenStage("idle")
    }
  }

  // ---------- Generation ----------
  const generate = async () => {
    if (!selectedTheme) return
    setScreen("generating")
    setGenError(null)

    try {
      // 1. Story
      setGenStage("story")
      const storyRes = await fetch("/api/generate-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: storyPromptSystem,
          userPrompt: storyPromptUser,
        }),
      })
      if (!storyRes.ok) {
        const detail = await storyRes.text().catch(() => "")
        throw new Error(`Story generation failed: ${detail || storyRes.status}`)
      }
      const { story }: { story: string } = await storyRes.json()

      // 2. Image
      setGenStage("image")
      const excerpt = story.split("\n\n")[0]?.slice(0, 240) ?? story.slice(0, 240)
      const groundedImagePrompt =
        imagePrompt + ` Scene inspired by this story opening: "${excerpt}"`

      const imgRes = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: groundedImagePrompt,
          theme: selectedTheme,
          storyTitle,
          quality: "standard",
          size: "1024x1024",
          style: "vivid",
        }),
      })
      if (!imgRes.ok) {
        const detail = await storyRes.text().catch(() => "")
        throw new Error(`Cover generation failed: ${detail || imgRes.status}`)
      }
      const { url: coverUrl }: { url: string } = await imgRes.json()

      // 3. Save
      const saved: SavedStory = {
        id: uid(),
        title: storyTitle,
        body: story,
        coverUrl,
        theme: selectedTheme,
        imagePrompt: groundedImagePrompt,
        storyPromptUser,
        createdAt: Date.now(),
        characterNames: characters
          .filter((c) => selectedCharacterIds.includes(c.id))
          .map((c) => c.name),
      }
      setStories((prev) => [saved, ...prev])
      setCurrentStory(saved)
      setGenStage("done")
      setScreen("reading")
    } catch (err) {
      console.error(err)
      setGenError(err instanceof Error ? err.message : "Unknown error")
      setGenStage("idle")
    }
  }

  // ---------- Render with Tommy Header Logo Logic ----------
  const showTommyHeader = screen !== "home" && screen !== "themeList" && screen !== "prepare"

  return (
    <>
      <AnimatedBackground />
      
      <main className="min-h-screen relative z-10">
        <div className="mx-auto max-w-6xl px-6 py-10">
          {/* Tommy's Logo Header - Shows on all pages except home, themeList, and prepare */}
          {showTommyHeader && <TommyHeaderLogo />}

          {screen === "home" && <HomeScreen go={setScreen} />}
          {screen === "characters" && (
            <CharactersScreen
              characters={characters}
              addFamilyMember={addFamilyMember}
              addGuest={addGuest}
              updateCharacter={updateCharacter}
              removeCharacter={removeCharacter}
              go={setScreen}
            />
          )}
          {screen === "builder" && <BuilderScreen go={setScreen} />}
          {screen === "manualBuilder" && (
            <ManualBuilderScreen
              title={manualTitle}
              setTitle={setManualTitle}
              story={manualStory}
              setStory={setManualStory}
              save={saveManualStory}
              go={setScreen}
            />
          )}
          {screen === "aiBuilder" && (
            <AiBuilderScreen
              prompt={aiPrompt}
              setPrompt={setAiPrompt}
              genre={aiGenre}
              setGenre={setAiGenre}
              length={aiLength}
              setLength={setAiLength}
              characters={characters}
              generate={generateAiStory}
              go={setScreen}
            />
          )}
          {screen === "themeList" && <ThemeListScreen pickTheme={pickTheme} go={setScreen} />}
          {screen === "prepare" && selectedTheme && (
            <PrepareScreen
              theme={selectedTheme}
              characters={characters}
              selectedIds={selectedCharacterIds}
              toggle={(id) =>
                setSelectedCharacterIds((prev) =>
                  prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                )
              }
              customAngle={customAngle}
              setCustomAngle={setCustomAngle}
              back={() => setScreen("themeList")}
              next={proceedToReview}
            />
          )}
          {screen === "review" && selectedTheme && (
            <ReviewScreen
              theme={selectedTheme}
              storyTitle={storyTitle}
              setStoryTitle={setStoryTitle}
              storyPromptUser={storyPromptUser}
              setStoryPromptUser={setStoryPromptUser}
              imagePrompt={imagePrompt}
              setImagePrompt={setImagePrompt}
              back={() => setScreen("prepare")}
              generate={generate}
            />
          )}
          {screen === "generating" && (
            <GeneratingScreen stage={genStage} error={genError} back={() => setScreen("home")} />
          )}
          {screen === "reading" && currentStory && (
            <ReadingScreen story={currentStory} go={setScreen} />
          )}
          {screen === "library" && (
            <LibraryScreen
              stories={stories}
              open={(s) => {
                setCurrentStory(s)
                setScreen("reading")
              }}
              remove={(id) => setStories((prev) => prev.filter((s) => s.id !== id))}
              go={setScreen}
            />
          )}
        </div>
      </main>
    </>
  )
}

// ===================================================================
// SCREENS WITH CUSTOM TOMMY ICONS
// ===================================================================

function HomeScreen({ go }: { go: (s: Screen) => void }) {
  return (
    <div className="flex flex-col items-center text-center pt-6">
      {/* HOME PAGE: Large prominent Tommy logo */}
      <TommyLogo size="large" className="mb-12 animate-pulse" />
      
      <h1 className="text-6xl font-bold text-white mb-6 drop-shadow-lg">
        Welcome to Tommy's World
      </h1>
      <p className="text-2xl text-white/90 mb-12 max-w-3xl leading-relaxed drop-shadow-md">
        Create magical stories with AI-powered adventures, beautiful illustrations, and characters that come to life
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
        <MagicalCard glowColor="rgba(168, 85, 247, 0.3)">
          <div className="text-center">
            {/* CUSTOM ICON: Add Your Family */}
            <div className="flex justify-center mb-6">
              <TommyIcon iconKey="addFamily" alt="Add Your Family" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Add Your Family</h3>
            <p className="text-white/80 mb-6">Create characters inspired by your loved ones</p>
            <button
              onClick={() => go("characters")}
              className="w-full py-4 px-6 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-lg rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl transform hover:scale-105"
            >
              Get Started
            </button>
          </div>
        </MagicalCard>

        <MagicalCard glowColor="rgba(236, 72, 153, 0.3)">
          <div className="text-center">
            {/* CUSTOM ICON: Create Stories */}
            <div className="flex justify-center mb-6">
              <TommyIcon iconKey="createStories" alt="Create Stories" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Create Stories</h3>
            <p className="text-white/80 mb-6">Choose themes and generate magical adventures</p>
            <button
              onClick={() => go("builder")}
              className="w-full py-4 px-6 bg-pink-600 hover:bg-pink-700 text-white font-semibold text-lg rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl transform hover:scale-105"
            >
              Begin Adventure
            </button>
          </div>
        </MagicalCard>

        <MagicalCard glowColor="rgba(59, 130, 246, 0.3)">
          <div className="text-center">
            {/* CUSTOM ICON: Story Library */}
            <div className="flex justify-center mb-6">
              <TommyIcon iconKey="storyLibrary" alt="Story Library" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Story Library</h3>
            <p className="text-white/80 mb-6">Revisit your magical collection</p>
            <button
              onClick={() => go("library")}
              className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl transform hover:scale-105"
            >
              Explore Library
            </button>
          </div>
        </MagicalCard>
      </div>
    </div>
  )
}

function CharactersScreen(props: {
  characters: Character[]
  addFamilyMember: () => void
  addGuest: () => void
  updateCharacter: (id: string, patch: Partial<Character>) => void
  removeCharacter: (id: string) => void
  go: (s: Screen) => void
}) {
  const { characters, addFamilyMember, addGuest, updateCharacter, removeCharacter, go } = props
  return (
    <div className="flex flex-col items-center">
      {/* NO TOMMY LOGO HERE - it's in the header */}
      
      <h2 className="text-4xl font-bold text-white mb-4">Add Your Family to Tommy's World</h2>
      <p className="text-xl text-white/90 mb-8 text-center max-w-2xl">
        Family members become the stars. Guests are special friends who join the adventure.
      </p>

      <div className="w-full max-w-3xl space-y-6 mb-8">
        {characters.length === 0 && (
          <MagicalCard>
            <p className="text-center text-white/70 italic text-lg">
              No characters yet — add your first one below to begin the magic!
            </p>
          </MagicalCard>
        )}
        {characters.map((c) => (
          <MagicalCard key={c.id} glowColor={c.isGuest ? "rgba(245, 158, 11, 0.3)" : "rgba(168, 85, 247, 0.3)"}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-semibold text-white">
                {c.isGuest ? "👥 Guest" : "👤 Family Member"}
              </span>
              <button
                onClick={() => removeCharacter(c.id)}
                className="text-red-400 hover:text-red-300 text-sm font-medium"
              >
                Remove
              </button>
            </div>
            <input
              value={c.name}
              onChange={(e) => updateCharacter(c.id, { name: e.target.value })}
              placeholder={c.isGuest ? "Guest name" : "Name"}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:border-white/40 focus:outline-none text-lg"
            />
            {!c.isGuest && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  value={c.age ?? ""}
                  onChange={(e) => updateCharacter(c.id, { age: e.target.value })}
                  placeholder="Age (optional)"
                  className="px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:border-white/40 focus:outline-none"
                />
                <input
                  value={c.personality ?? ""}
                  onChange={(e) => updateCharacter(c.id, { personality: e.target.value })}
                  placeholder="Personality (e.g. curious, brave)"
                  className="px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:border-white/40 focus:outline-none"
                />
              </div>
            )}
          </MagicalCard>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 justify-center mb-8">
        <button
          onClick={addFamilyMember}
          className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl transform hover:scale-105"
        >
          + Add Family Member
        </button>
        <button
          onClick={addGuest}
          className="px-8 py-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl transform hover:scale-105"
        >
          + Add Guest
        </button>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => go("home")}
          className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 transition-all duration-300"
        >
          ← Home
        </button>
        <button
          onClick={() => go("builder")}
          className="px-8 py-3 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl transform hover:scale-105"
        >
          Continue to Story Builder →
        </button>
      </div>
    </div>
  )
}

function BuilderScreen({ go }: { go: (s: Screen) => void }) {
  const options = [
    {
      id: "own",
      iconKey: "buildStory" as const,
      title: "Build Your Own Story",
      desc: "Write your own magical tale with a custom AI-generated cover.",
      action: () => go("manualBuilder"),
      color: "rgba(34, 197, 94, 0.3)"
    },
    {
      id: "ai", 
      iconKey: "aiGenerate" as const,
      title: "AI Generate a Story",
      desc: "Describe your idea and let AI create the perfect adventure.",
      action: () => go("aiBuilder"),
      color: "rgba(59, 130, 246, 0.3)"
    },
    {
      id: "theme",
      iconKey: "chooseTheme" as const,
      title: "Choose a Theme",
      desc: "Pick from six magical preset worlds and characters.",
      action: () => go("themeList"),
      color: "rgba(245, 158, 11, 0.3)"
    },
  ]
  
  return (
    <div className="flex flex-col items-center">
      {/* NO TOMMY LOGO HERE - it's in the header */}
      
      <h1 className="text-5xl font-bold text-white text-center mb-4">Create Your Story</h1>
      <p className="text-xl text-white/90 mb-12">How would you like to begin this magical journey?</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl mb-12">
        {options.map((o) => (
          <MagicalCard key={o.id} glowColor={o.color}>
            <button
              onClick={o.action}
              className="text-center w-full h-full"
            >
              {/* CUSTOM TOMMY ICONS */}
              <div className="flex justify-center mb-6">
                <TommyIcon iconKey={o.iconKey} alt={o.title} />
              </div>
              <div className="text-2xl font-bold text-white mb-3">{o.title}</div>
              <div className="text-white/80 leading-relaxed">{o.desc}</div>
            </button>
          </MagicalCard>
        ))}
      </div>

      <button
        onClick={() => go("characters")}
        className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 transition-all duration-300"
      >
        ← Back
      </button>
    </div>
  )
}

function ManualBuilderScreen({
  title,
  setTitle,
  story,
  setStory,
  save,
  go
}: {
  title: string
  setTitle: (v: string) => void
  story: string
  setStory: (v: string) => void
  save: () => void
  go: (s: Screen) => void
}) {
  const canSave = title.trim() && story.trim()
  
  return (
    <div className="flex flex-col items-center">
      {/* NO TOMMY LOGO HERE - it's in the header */}
      
      <h1 className="text-4xl font-bold text-white mb-4">Write Your Own Story</h1>
      <p className="text-lg text-white/90 mb-8 text-center max-w-2xl">
        Create your own magical tale! We'll generate a beautiful cover image for your story.
      </p>

      <div className="w-full max-w-4xl space-y-6 mb-8">
        <MagicalCard>
          <label className="block text-lg font-semibold text-white mb-3">Story Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter your story title..."
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:border-white/40 focus:outline-none text-xl font-semibold"
          />
        </MagicalCard>

        <MagicalCard>
          <label className="block text-lg font-semibold text-white mb-3">Your Story</label>
          <textarea
            value={story}
            onChange={(e) => setStory(e.target.value)}
            placeholder="Write your magical story here..."
            rows={15}
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:border-white/40 focus:outline-none resize-none text-lg leading-relaxed"
          />
          <div className="mt-3 text-sm text-white/60">
            📝 Tip: Write in simple language for children ages 4-10. Include exciting adventures and positive messages!
          </div>
        </MagicalCard>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => go("builder")}
          className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 transition-all duration-300"
        >
          ← Back
        </button>
        <button
          onClick={save}
          disabled={!canSave}
          className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold text-xl rounded-xl shadow-2xl transition-all duration-300 hover:shadow-3xl transform hover:scale-105 disabled:transform-none disabled:shadow-none"
        >
          📖 Save & Create Cover
        </button>
      </div>
    </div>
  )
}

function AiBuilderScreen({
  prompt,
  setPrompt,
  genre,
  setGenre,
  length,
  setLength,
  characters,
  generate,
  go
}: {
  prompt: string
  setPrompt: (v: string) => void
  genre: string
  setGenre: (v: string) => void
  length: string
  setLength: (v: string) => void
  characters: Character[]
  generate: () => void
  go: (s: Screen) => void
}) {
  const canGenerate = prompt.trim()
  const namedChars = characters.filter(c => c.name.trim())
  
  return (
    <div className="flex flex-col items-center">
      {/* NO TOMMY LOGO HERE - it's in the header */}
      
      <h1 className="text-4xl font-bold text-white mb-4">AI Story Generator</h1>
      <p className="text-lg text-white/90 mb-8 text-center max-w-2xl">
        Describe your story idea and let AI create a magical adventure with a beautiful cover!
      </p>

      <div className="w-full max-w-4xl space-y-6 mb-8">
        <MagicalCard>
          <label className="block text-lg font-semibold text-white mb-3">What's your story about?</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. A brave mouse who wants to become a knight and save the kingdom from a grumpy dragon"
            rows={4}
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:border-white/40 focus:outline-none resize-none text-lg"
          />
        </MagicalCard>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MagicalCard>
            <label className="block text-lg font-semibold text-white mb-3">Story Genre</label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:border-white/40 focus:outline-none text-lg"
            >
              <option value="adventure" className="bg-gray-800">Adventure</option>
              <option value="fantasy" className="bg-gray-800">Fantasy</option>
              <option value="friendship" className="bg-gray-800">Friendship</option>
              <option value="mystery" className="bg-gray-800">Mystery</option>
              <option value="comedy" className="bg-gray-800">Comedy</option>
              <option value="educational" className="bg-gray-800">Educational</option>
            </select>
          </MagicalCard>

          <MagicalCard>
            <label className="block text-lg font-semibold text-white mb-3">Story Length</label>
            <select
              value={length}
              onChange={(e) => setLength(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:border-white/40 focus:outline-none text-lg"
            >
              <option value="short" className="bg-gray-800">Short (3-4 paragraphs)</option>
              <option value="medium" className="bg-gray-800">Medium (5-7 paragraphs)</option>
              <option value="long" className="bg-gray-800">Long (8-12 paragraphs)</option>
            </select>
          </MagicalCard>
        </div>

        {namedChars.length > 0 && (
          <MagicalCard glowColor="rgba(168, 85, 247, 0.3)">
            <div className="text-lg font-semibold text-white mb-3">Available Characters</div>
            <div className="flex flex-wrap gap-2">
              {namedChars.map((c) => (
                <span
                  key={c.id}
                  className="px-3 py-2 bg-purple-600/30 border border-purple-400/30 rounded-xl text-white text-sm"
                >
                  {c.name} {c.isGuest && "(Guest)"}
                </span>
              ))}
            </div>
            <div className="text-sm text-white/60 mt-2">
              💡 AI will include these characters if they fit your story idea
            </div>
          </MagicalCard>
        )}
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => go("builder")}
          className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 transition-all duration-300"
        >
          ← Back
        </button>
        <button
          onClick={generate}
          disabled={!canGenerate}
          className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold text-xl rounded-xl shadow-2xl transition-all duration-300 hover:shadow-3xl transform hover:scale-105 disabled:transform-none disabled:shadow-none"
        >
          🤖 Generate Story
        </button>
      </div>
    </div>
  )
}

function ThemeListScreen({
  pickTheme,
  go,
}: {
  pickTheme: (t: ThemeId) => void
  go: (s: Screen) => void
}) {
  return (
    <div className="flex flex-col items-center">
      {/* THEME LIST: NO TOMMY LOGO - Shows theme images instead */}
      
      <h1 className="text-5xl font-bold text-white text-center mb-4">Magical Themes</h1>
      <p className="text-xl text-white/90 mb-12">Pick a world for your next adventure</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl mb-12">
        {THEME_ORDER.map((t) => (
          <MagicalCard key={t} glowColor="rgba(168, 85, 247, 0.3)">
            <button
              onClick={() => pickTheme(t)}
              className="w-full h-full text-center"
            >
              <div className="w-full max-w-[280px] mx-auto aspect-square relative overflow-hidden rounded-2xl mb-6">
                <img
                  src={CLOUDINARY.themes[t]}
                  alt={THEME_LABEL[t]}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="text-2xl font-bold text-white">{THEME_LABEL[t]}</div>
            </button>
          </MagicalCard>
        ))}
      </div>

      <button
        onClick={() => go("builder")}
        className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 transition-all duration-300"
      >
        ← Back
      </button>
    </div>
  )
}

function PrepareScreen(props: {
  theme: ThemeId
  characters: Character[]
  selectedIds: string[]
  toggle: (id: string) => void
  customAngle: string
  setCustomAngle: (v: string) => void
  back: () => void
  next: () => void
}) {
  const { theme, characters, selectedIds, toggle, customAngle, setCustomAngle, back, next } = props
  const named = characters.filter((c) => c.name.trim())
  const canProceed = selectedIds.length > 0 || named.length === 0

  return (
    <div className="flex flex-col items-center">
      {/* PREPARE: Shows theme image, NO Tommy logo */}
      <div className="w-full max-w-[600px] mb-8">
        <img
          src={CLOUDINARY.themes[theme]}
          alt={THEME_LABEL[theme]}
          className="w-full h-auto rounded-3xl shadow-2xl"
        />
      </div>
      
      <h1 className="text-4xl font-bold text-white mb-4">{THEME_LABEL[theme]}</h1>
      <p className="text-xl text-white/90 text-center mb-8">
        Choose who joins Tommy on this magical adventure
      </p>

      <div className="w-full max-w-3xl space-y-4 mb-8">
        {named.length === 0 && (
          <MagicalCard>
            <p className="text-center text-white/70 italic text-lg">
              No characters yet — Tommy will go on a solo adventure. You can add family members anytime!
            </p>
          </MagicalCard>
        )}
        {named.map((c) => {
          const selected = selectedIds.includes(c.id)
          return (
            <MagicalCard key={c.id} glowColor={selected ? "rgba(168, 85, 247, 0.4)" : "rgba(255, 255, 255, 0.1)"}>
              <button
                onClick={() => toggle(c.id)}
                className="w-full text-left"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${
                      selected ? "bg-purple-600 border-purple-600" : "border-white/40"
                    }`}
                  >
                    {selected && <span className="text-white text-lg">✓</span>}
                  </div>
                  <div>
                    <div className="text-xl font-semibold text-white">
                      {c.name}{" "}
                      {c.isGuest && <span className="text-sm text-amber-400 ml-2">(Guest)</span>}
                    </div>
                    {!c.isGuest && (c.age || c.personality) && (
                      <div className="text-sm text-white/60">
                        {[c.age && `age ${c.age}`, c.personality].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            </MagicalCard>
          )
        })}
      </div>

      <MagicalCard className="w-full max-w-3xl mb-8">
        <label className="block text-lg font-semibold text-white mb-2">
          What's the story about? (optional)
        </label>
        <textarea
          value={customAngle}
          onChange={(e) => setCustomAngle(e.target.value)}
          placeholder="e.g. Emma loses her favourite toy and everyone helps find it"
          rows={3}
          className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:border-white/40 focus:outline-none resize-none text-lg"
        />
      </MagicalCard>

      <div className="flex gap-4">
        <button
          onClick={back}
          className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 transition-all duration-300"
        >
          ← Themes
        </button>
        <button
          onClick={next}
          disabled={!canProceed}
          className="px-8 py-3 bg-pink-600 hover:bg-pink-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl transform hover:scale-105 disabled:transform-none"
        >
          Review & Generate →
        </button>
      </div>
    </div>
  )
}

function ReviewScreen(props: {
  theme: ThemeId
  storyTitle: string
  setStoryTitle: (v: string) => void
  storyPromptUser: string
  setStoryPromptUser: (v: string) => void
  imagePrompt: string
  setImagePrompt: (v: string) => void
  back: () => void
  generate: () => void
}) {
  const {
    theme,
    storyTitle,
    setStoryTitle,
    storyPromptUser,
    setStoryPromptUser,
    imagePrompt,
    setImagePrompt,
    back,
    generate,
  } = props

  return (
    <div className="flex flex-col items-center">
      {/* NO TOMMY LOGO HERE - it's in the header */}
      
      <h1 className="text-5xl font-bold text-white text-center mb-4">Review & Edit</h1>
      <p className="text-xl text-white/90 text-center mb-12 max-w-3xl">
        Perfect your prompts before we create your magical story
      </p>

      <div className="w-full max-w-4xl space-y-8 mb-12">
        <MagicalCard>
          <label className="block text-lg font-semibold text-white mb-3">Story Title</label>
          <input
            value={storyTitle}
            onChange={(e) => setStoryTitle(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:border-white/40 focus:outline-none text-xl font-semibold"
          />
        </MagicalCard>
        
        <MagicalCard>
          <label className="block text-lg font-semibold text-white mb-3">
            Story Prompt (GPT-4o)
          </label>
          <textarea
            value={storyPromptUser}
            onChange={(e) => setStoryPromptUser(e.target.value)}
            rows={10}
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:border-white/40 focus:outline-none font-mono text-sm resize-none"
          />
        </MagicalCard>
        
        <MagicalCard>
          <label className="block text-lg font-semibold text-white mb-3">
            Cover Image Prompt (DALL-E 3)
          </label>
          <textarea
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            rows={8}
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:border-white/40 focus:outline-none font-mono text-sm resize-none"
          />
        </MagicalCard>
      </div>

      <div className="flex gap-4">
        <button
          onClick={back}
          className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 transition-all duration-300"
        >
          ← Characters
        </button>
        <button
          onClick={generate}
          className="px-8 py-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-semibold text-xl rounded-xl shadow-2xl transition-all duration-300 hover:shadow-3xl transform hover:scale-105"
        >
          ✨ Generate {THEME_LABEL[theme]} Adventure
        </button>
      </div>
    </div>
  )
}

function GeneratingScreen({
  stage,
  error,
  back,
}: {
  stage: "idle" | "story" | "image" | "done"
  error: string | null
  back: () => void
}) {
  const label = useMemo(() => {
    switch (stage) {
      case "story":
        return "Writing your magical story..."
      case "image":
        return "Painting the perfect cover..."
      case "done":
        return "Adding the finishing touches..."
      default:
        return "Beginning the magic..."
    }
  }, [stage])

  return (
    <div className="flex flex-col items-center justify-center py-20">
      {/* NO TOMMY LOGO HERE - it's in the header */}
      
      {!error && (
        <MagicalCard className="text-center">
          <div className="w-20 h-20 mx-auto mb-8">
            <div className="w-full h-full border-4 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
          <p className="text-3xl font-semibold text-white mb-3">{label}</p>
          <p className="text-lg text-white/70">
            Creating something truly special takes about 20–30 seconds
          </p>
        </MagicalCard>
      )}
      
      {error && (
        <MagicalCard className="max-w-2xl bg-red-500/20 border-red-400/30">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <p className="text-2xl font-semibold text-white mb-4">Something went wrong</p>
            <p className="text-white/80 mb-6 font-mono text-sm break-words">{error}</p>
            <button
              onClick={back}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all duration-300"
            >
              ← Back to Review
            </button>
          </div>
        </MagicalCard>
      )}
    </div>
  )
}

function ReadingScreen({ story, go }: { story: SavedStory; go: (s: Screen) => void }) {
  const paragraphs = story.body.split(/\n{2,}/).filter((p) => p.trim())

  return (
    <div className="flex flex-col items-center">
      {/* NO TOMMY LOGO HERE - it's in the header */}
      
      <MagicalCard className="w-full max-w-4xl overflow-hidden p-0">
        <img src={story.coverUrl} alt={story.title} className="w-full h-auto" />
        <div className="p-8">
          <h1 className="text-4xl font-bold text-white mb-8 text-center">{story.title}</h1>
          <div className="space-y-6 text-white leading-relaxed text-lg">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          {story.isManual && (
            <div className="mt-8 p-4 bg-green-500/20 border border-green-400/30 rounded-xl text-center">
              <span className="text-green-400 font-semibold">✍️ User-Written Story</span>
            </div>
          )}
        </div>
      </MagicalCard>

      <div className="mt-12 flex flex-wrap gap-4 justify-center">
        <button
          onClick={() => go("home")}
          className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 transition-all duration-300"
        >
          ← Home
        </button>
        <button
          onClick={() => go("library")}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl"
        >
          📚 Library
        </button>
        <button
          onClick={() => go("builder")}
          className="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl"
        >
          ✨ Create Another
        </button>
      </div>
    </div>
  )
}

function LibraryScreen({
  stories,
  open,
  remove,
  go,
}: {
  stories: SavedStory[]
  open: (s: SavedStory) => void
  remove: (id: string) => void
  go: (s: Screen) => void
}) {
  return (
    <div className="flex flex-col items-center">
      {/* NO TOMMY LOGO HERE - it's in the header */}
      
      <h1 className="text-5xl font-bold text-white mb-4">Story Library</h1>
      <p className="text-xl text-white/90 mb-12">Your magical collection awaits</p>

      {stories.length === 0 ? (
        <MagicalCard className="text-center">
          <div className="flex justify-center mb-6">
            <TommyIcon iconKey="storyLibrary" alt="Empty Library" />
          </div>
          <p className="text-xl text-white/70 italic mb-6">No stories yet — let's create your first magical adventure!</p>
          <button
            onClick={() => go("builder")}
            className="px-8 py-4 bg-pink-600 hover:bg-pink-700 text-white font-semibold text-xl rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl transform hover:scale-105"
          >
            ✨ Create a Story
          </button>
        </MagicalCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-7xl mb-12">
          {stories.map((s) => (
            <MagicalCard key={s.id} className="overflow-hidden p-0">
              <button onClick={() => open(s)} className="block w-full text-left">
                <img src={s.coverUrl} alt={s.title} className="w-full aspect-square object-cover" />
                <div className="p-6">
                  <div className="font-bold text-white text-lg line-clamp-2 mb-2">
                    {s.title}
                    {s.isManual && <span className="text-xs text-green-400 ml-2">✍️</span>}
                  </div>
                  <div className="text-sm text-white/60">
                    {new Date(s.createdAt).toLocaleDateString()} · {
                      s.theme === "custom" ? "Custom" : THEME_LABEL[s.theme as ThemeId]
                    }
                  </div>
                </div>
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete "${s.title}"? This cannot be undone.`)) remove(s.id)
                }}
                className="w-full py-3 text-sm text-red-400 hover:bg-red-500/20 border-t border-white/10 transition-all duration-300"
              >
                Delete Story
              </button>
            </MagicalCard>
          ))}
        </div>
      )}

      <button
        onClick={() => go("home")}
        className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 transition-all duration-300"
      >
        ← Home
      </button>
    </div>
  )
}
