"use client"

// src/app/page.tsx
// StoryLoom — FIXED: Much larger icons + proper logo visibility
// Icons increased from 64px to 120px and logo given proper background protection

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
  // Custom Tommy-themed icons
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
    <div className="fixed inset-0 overflow-hidden -z-50">{/* Changed from -z-10 to -z-50 */}
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
// FIXED TOMMY LOGO COMPONENTS with PROPER BACKGROUND PROTECTION
// ===================================================================

function TommyHeaderLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex justify-center mb-8 ${className}`}>
      <img
        src={CLOUDINARY.tommyLogo}
        alt="StoryLoom — Tommy's magical stories"
        className="w-full max-w-[500px] h-auto drop-shadow-2xl filter brightness-125 relative z-50"
        style={{ imageRendering: 'auto' }}
        onError={(e) => {
          console.error('Tommy header logo failed to load:', e);
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
        className={`${sizeClasses[size]} drop-shadow-2xl filter brightness-125 relative z-50`}
        style={{ imageRendering: 'auto' }}
        onError={(e) => {
          console.error('Tommy main logo failed to load:', e);
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
// FIXED: MUCH LARGER TOMMY ICON COMPONENT (120px instead of 64px)
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
      className={`object-contain drop-shadow-xl filter brightness-110 relative z-30 ${className}`}
      style={{ 
        imageRendering: 'auto',
        width: '480px',
        height: '480px',
        maxWidth: 'none',
        maxHeight: 'none'
      }}
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
  glowColor = "rgba(255, 255, 255, 0.1)",
  onClick
}: { 
  children: React.ReactNode
  className?: string 
  glowColor?: string
  onClick?: () => void
}) {
  return (
    <div 
      className={`
        relative bg-white/10 backdrop-blur-md rounded-3xl py-0 px-1 
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
      onClick={onClick}
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
        const detail = await imgRes.text().catch(() => "")
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
// SCREENS WITH MUCH LARGER CUSTOM TOMMY ICONS
// ===================================================================

function HomeScreen({ go }: { go: (s: Screen) => void }) {
  return (
    <div className="flex flex-col items-center text-center pt-6">
      {/* HOME PAGE: Large prominent Tommy logo with background protection and subtle pulsing */}
      <TommyLogo 
        size="large" 
        className="mb-12 animate-pulse" 
      />

      {/* Three main action cards - MUCH LARGER ICONS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl">
        <MagicalCard
          onClick={() => go("characters")}
          className="text-center flex flex-col h-96 max-h-96"
          glowColor="rgba(255, 107, 107, 0.2)"
        >
          <div className="flex justify-center flex-shrink-0 -mt-2">
            <TommyIcon iconKey="addFamily" alt="Add Your Family" />
          </div>
          <div className="flex-1 flex flex-col justify-end -mt-6 pb-3 px-3">
            <h3 className="text-xl font-bold text-white mb-2 drop-shadow-lg">
              Add Your Family
            </h3>
            <p className="text-white/80 text-base leading-snug">
              Create profiles for your children and family members to include them in magical stories
            </p>
          </div>
        </MagicalCard>

        <MagicalCard
          onClick={() => go("builder")}
          className="text-center flex flex-col h-96 max-h-96"
          glowColor="rgba(78, 205, 196, 0.2)"
        >
          <div className="flex justify-center flex-shrink-0 -mt-2">
            <TommyIcon iconKey="createStories" alt="Create Stories" />
          </div>
          <div className="flex-1 flex flex-col justify-end -mt-6 pb-3 px-3">
            <h3 className="text-xl font-bold text-white mb-2 drop-shadow-lg">
              Create Stories
            </h3>
            <p className="text-white/80 text-base leading-snug">
              Choose from themes, write your own, or let AI create personalized adventures
            </p>
          </div>
        </MagicalCard>

        <MagicalCard
          onClick={() => go("library")}
          className="text-center flex flex-col h-96 max-h-96"
          glowColor="rgba(199, 125, 255, 0.2)"
        >
          <div className="flex justify-center flex-shrink-0 -mt-2">
            <TommyIcon iconKey="storyLibrary" alt="Story Library" />
          </div>
          <div className="flex-1 flex flex-col justify-end -mt-6 pb-3 px-3">
            <h3 className="text-xl font-bold text-white mb-2 drop-shadow-lg">
              Story Library
            </h3>
            <p className="text-white/80 text-base leading-snug">
              Browse and read all your saved stories with beautiful cover art
            </p>
          </div>
        </MagicalCard>
      </div>
    </div>
  )
}

function CharactersScreen({ 
  characters, 
  addFamilyMember, 
  addGuest, 
  updateCharacter, 
  removeCharacter, 
  go 
}: {
  characters: Character[]
  addFamilyMember: () => void
  addGuest: () => void
  updateCharacter: (id: string, patch: Partial<Character>) => void
  removeCharacter: (id: string) => void
  go: (s: Screen) => void
}) {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-white text-center mb-12 drop-shadow-lg">
        Manage Your Characters
      </h1>

      {/* Add buttons */}
      <div className="flex justify-center gap-6 mb-12">
        <button
          onClick={addFamilyMember}
          className="px-8 py-4 bg-white/20 backdrop-blur-md rounded-2xl text-white font-semibold 
                   border border-white/20 shadow-xl hover:bg-white/30 transition-all duration-300
                   hover:transform hover:scale-105"
        >
          + Add Family Member
        </button>
        <button
          onClick={addGuest}
          className="px-8 py-4 bg-white/20 backdrop-blur-md rounded-2xl text-white font-semibold 
                   border border-white/20 shadow-xl hover:bg-white/30 transition-all duration-300
                   hover:transform hover:scale-105"
        >
          + Add Guest Character
        </button>
      </div>

      {/* Character list */}
      <div className="space-y-6">
        {characters.map((char) => (
          <MagicalCard key={char.id} className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Name"
                  value={char.name}
                  onChange={(e) => updateCharacter(char.id, { name: e.target.value })}
                  className="px-4 py-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 
                           text-white placeholder-white/60 focus:outline-none focus:ring-2 
                           focus:ring-white/30"
                />
                {!char.isGuest && (
                  <>
                    <input
                      type="text"
                      placeholder="Age (optional)"
                      value={char.age || ""}
                      onChange={(e) => updateCharacter(char.id, { age: e.target.value })}
                      className="px-4 py-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 
                               text-white placeholder-white/60 focus:outline-none focus:ring-2 
                               focus:ring-white/30"
                    />
                    <input
                      type="text"
                      placeholder="Personality (optional)"
                      value={char.personality || ""}
                      onChange={(e) => updateCharacter(char.id, { personality: e.target.value })}
                      className="px-4 py-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 
                               text-white placeholder-white/60 focus:outline-none focus:ring-2 
                               focus:ring-white/30"
                    />
                  </>
                )}
                {char.isGuest && (
                  <div className="md:col-span-2 flex items-center px-4 py-3 bg-blue-500/20 rounded-xl border border-blue-300/30">
                    <span className="text-blue-200 font-medium">Guest Character (name only)</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => removeCharacter(char.id)}
                className="px-6 py-3 bg-red-500/20 backdrop-blur-md rounded-xl text-red-200 
                         hover:bg-red-500/30 transition-all duration-300 border border-red-300/30"
              >
                Remove
              </button>
            </div>
          </MagicalCard>
        ))}
      </div>

      {characters.length === 0 && (
        <MagicalCard className="text-center py-12">
          <p className="text-white/80 text-xl mb-6">
            No characters yet! Add family members or guest characters to include them in your stories.
          </p>
          <div className="flex justify-center">
            <TommyIcon iconKey="addFamily" alt="Add Family" className="opacity-50" />
          </div>
        </MagicalCard>
      )}

      {/* Navigation */}
      <div className="flex justify-center mt-12">
        <button
          onClick={() => go("home")}
          className="px-8 py-4 bg-white/20 backdrop-blur-md rounded-2xl text-white font-semibold 
                   border border-white/20 shadow-xl hover:bg-white/30 transition-all duration-300
                   hover:transform hover:scale-105"
        >
          Back to Home
        </button>
      </div>
    </div>
  )
}

function BuilderScreen({ go }: { go: (s: Screen) => void }) {
  return (
    <div className="flex flex-col items-center text-center">
      <h1 className="text-4xl font-bold text-white mb-12 drop-shadow-lg">
        How would you like to create your story?
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl">
        <MagicalCard 
          onClick={() => go("manualBuilder")}
          className="text-center flex flex-col h-96 max-h-96"
          glowColor="rgba(255, 195, 113, 0.2)"
        >
          <div className="flex justify-center flex-shrink-0 -mt-2">
            <TommyIcon iconKey="buildStory" alt="Build Your Own Story" />
          </div>
          <div className="flex-1 flex flex-col justify-end -mt-6 pb-3 px-3">
            <h3 className="text-xl font-bold text-white mb-2 drop-shadow-lg">
              Build Your Own Story
            </h3>
            <p className="text-white/80 text-base leading-snug">
              Write your own magical tale and we'll create a beautiful cover image
            </p>
          </div>
        </MagicalCard>

        <MagicalCard 
          onClick={() => go("aiBuilder")}
          className="text-center flex flex-col h-96 max-h-96"
          glowColor="rgba(135, 206, 250, 0.2)"
        >
          <div className="flex justify-center flex-shrink-0 -mt-2">
            <TommyIcon iconKey="aiGenerate" alt="AI Generate a Story" />
          </div>
          <div className="flex-1 flex flex-col justify-end -mt-6 pb-3 px-3">
            <h3 className="text-xl font-bold text-white mb-2 drop-shadow-lg">
              AI Generate a Story
            </h3>
            <p className="text-white/80 text-base leading-snug">
              Describe any story idea and our AI will create a complete tale for you
            </p>
          </div>
        </MagicalCard>

        <MagicalCard 
          onClick={() => go("themeList")}
          className="text-center flex flex-col h-96 max-h-96"
          glowColor="rgba(255, 107, 107, 0.2)"
        >
          <div className="flex justify-center flex-shrink-0 -mt-2">
            <TommyIcon iconKey="chooseTheme" alt="Choose from a Theme" />
          </div>
          <div className="flex-1 flex flex-col justify-end -mt-6 pb-3 px-3">
            <h3 className="text-xl font-bold text-white mb-2 drop-shadow-lg">
              Choose from a Theme
            </h3>
            <p className="text-white/80 text-base leading-snug">
              Pick a magical theme and we'll create a personalized story with your characters
            </p>
          </div>
        </MagicalCard>
      </div>

      <div className="mt-12">
        <button
          onClick={() => go("home")}
          className="px-8 py-4 bg-white/20 backdrop-blur-md rounded-2xl text-white font-semibold 
                   border border-white/20 shadow-xl hover:bg-white/30 transition-all duration-300
                   hover:transform hover:scale-105"
        >
          Back to Home
        </button>
      </div>
    </div>
  )
}

function ManualBuilderScreen({
  title,
  setTitle,
  story,
  setStory,
  save,
  go,
}: {
  title: string
  setTitle: (title: string) => void
  story: string
  setStory: (story: string) => void
  save: () => void
  go: (s: Screen) => void
}) {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-white text-center mb-12 drop-shadow-lg">
        Build Your Own Story
      </h1>

      <div className="space-y-8">
        <MagicalCard>
          <label className="block text-white font-semibold mb-4 text-xl">Story Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter your story title..."
            className="w-full px-6 py-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 
                     text-white placeholder-white/60 focus:outline-none focus:ring-2 
                     focus:ring-white/30 text-lg"
          />
        </MagicalCard>

        <MagicalCard>
          <label className="block text-white font-semibold mb-4 text-xl">Your Story</label>
          <textarea
            value={story}
            onChange={(e) => setStory(e.target.value)}
            placeholder="Once upon a time..."
            rows={12}
            className="w-full px-6 py-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 
                     text-white placeholder-white/60 focus:outline-none focus:ring-2 
                     focus:ring-white/30 text-lg resize-none"
          />
        </MagicalCard>

        <div className="flex justify-center gap-6">
          <button
            onClick={() => go("builder")}
            className="px-8 py-4 bg-white/20 backdrop-blur-md rounded-2xl text-white font-semibold 
                     border border-white/20 shadow-xl hover:bg-white/30 transition-all duration-300
                     hover:transform hover:scale-105"
          >
            Back
          </button>
          <button
            onClick={save}
            disabled={!title.trim() || !story.trim()}
            className="px-8 py-4 bg-green-500/30 backdrop-blur-md rounded-2xl text-white font-semibold 
                     border border-green-300/30 shadow-xl hover:bg-green-500/40 transition-all duration-300
                     hover:transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed
                     disabled:hover:transform-none"
          >
            Create Story & Cover
          </button>
        </div>
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
  go,
}: {
  prompt: string
  setPrompt: (prompt: string) => void
  genre: string
  setGenre: (genre: string) => void
  length: string
  setLength: (length: string) => void
  characters: Character[]
  generate: () => void
  go: (s: Screen) => void
}) {
  const genres = ["adventure", "fantasy", "friendship", "mystery", "comedy", "educational"]
  const lengths = ["short", "medium", "long"]

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-white text-center mb-12 drop-shadow-lg">
        AI Story Generator
      </h1>

      <div className="space-y-8">
        <MagicalCard>
          <label className="block text-white font-semibold mb-4 text-xl">
            What story would you like to create?
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your story idea... (e.g., 'A brave princess who saves a village from a friendly dragon')"
            rows={4}
            className="w-full px-6 py-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 
                     text-white placeholder-white/60 focus:outline-none focus:ring-2 
                     focus:ring-white/30 text-lg resize-none"
          />
        </MagicalCard>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <MagicalCard>
            <label className="block text-white font-semibold mb-4 text-xl">Genre</label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full px-6 py-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 
                       text-white focus:outline-none focus:ring-2 focus:ring-white/30 text-lg"
            >
              {genres.map((g) => (
                <option key={g} value={g} className="bg-purple-800">
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </option>
              ))}
            </select>
          </MagicalCard>

          <MagicalCard>
            <label className="block text-white font-semibold mb-4 text-xl">Length</label>
            <select
              value={length}
              onChange={(e) => setLength(e.target.value)}
              className="w-full px-6 py-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 
                       text-white focus:outline-none focus:ring-2 focus:ring-white/30 text-lg"
            >
              {lengths.map((l) => (
                <option key={l} value={l} className="bg-purple-800">
                  {l.charAt(0).toUpperCase() + l.slice(1)}
                </option>
              ))}
            </select>
          </MagicalCard>
        </div>

        {characters.length > 0 && (
          <MagicalCard>
            <h3 className="text-white font-semibold mb-4 text-xl">Available Characters</h3>
            <p className="text-white/80 mb-4">
              Your family characters will be included automatically when relevant:
            </p>
            <div className="flex flex-wrap gap-3">
              {characters.filter(c => c.name.trim()).map((char) => (
                <span
                  key={char.id}
                  className="px-4 py-2 bg-white/10 rounded-lg text-white/90 border border-white/20"
                >
                  {char.name} {char.isGuest ? "(Guest)" : ""}
                </span>
              ))}
            </div>
          </MagicalCard>
        )}

        <div className="flex justify-center gap-6">
          <button
            onClick={() => go("builder")}
            className="px-8 py-4 bg-white/20 backdrop-blur-md rounded-2xl text-white font-semibold 
                     border border-white/20 shadow-xl hover:bg-white/30 transition-all duration-300
                     hover:transform hover:scale-105"
          >
            Back
          </button>
          <button
            onClick={generate}
            disabled={!prompt.trim()}
            className="px-8 py-4 bg-blue-500/30 backdrop-blur-md rounded-2xl text-white font-semibold 
                     border border-blue-300/30 shadow-xl hover:bg-blue-500/40 transition-all duration-300
                     hover:transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed
                     disabled:hover:transform-none"
          >
            Generate Story
          </button>
        </div>
      </div>
    </div>
  )
}

function ThemeListScreen({ 
  pickTheme, 
  go 
}: { 
  pickTheme: (theme: ThemeId) => void
  go: (s: Screen) => void 
}) {
  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold text-white text-center mb-12 drop-shadow-lg">
        Choose Your Adventure Theme
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {THEME_ORDER.map((theme) => (
          <MagicalCard 
            key={theme} 
            onClick={() => pickTheme(theme)}
            className="text-center hover:scale-110 transition-transform duration-300"
            glowColor="rgba(255, 255, 255, 0.15)"
          >
            <img
              src={CLOUDINARY.themes[theme]}
              alt={THEME_LABEL[theme]}
              className="w-full h-48 object-cover rounded-2xl mb-6 shadow-lg"
            />
            <h3 className="text-2xl font-bold text-white mb-4 drop-shadow-lg">
              {THEME_LABEL[theme]}
            </h3>
          </MagicalCard>
        ))}
      </div>

      <div className="flex justify-center mt-12">
        <button
          onClick={() => go("builder")}
          className="px-8 py-4 bg-white/20 backdrop-blur-md rounded-2xl text-white font-semibold 
                   border border-white/20 shadow-xl hover:bg-white/30 transition-all duration-300
                   hover:transform hover:scale-105"
        >
          Back to Story Builder
        </button>
      </div>
    </div>
  )
}

function PrepareScreen({
  theme,
  characters,
  selectedIds,
  toggle,
  customAngle,
  setCustomAngle,
  back,
  next,
}: {
  theme: ThemeId
  characters: Character[]
  selectedIds: string[]
  toggle: (id: string) => void
  customAngle: string
  setCustomAngle: (angle: string) => void
  back: () => void
  next: () => void
}) {
  const availableCharacters = characters.filter((c) => c.name.trim())

  return (
    <div className="max-w-4xl mx-auto">
      {/* SPECIAL: Theme image replaces Tommy's logo on this page */}
      <div className="flex justify-center mb-8">
        <div className="relative bg-white/15 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/30">
          <img
            src={CLOUDINARY.themes[theme]}
            alt={THEME_LABEL[theme]}
            className="w-full max-w-[512px] h-auto drop-shadow-2xl filter brightness-110 relative z-10"
            style={{ imageRendering: 'auto' }}
          />
        </div>
      </div>

      <h1 className="text-4xl font-bold text-white text-center mb-12 drop-shadow-lg">
        Prepare Your {THEME_LABEL[theme]} Story
      </h1>

      {availableCharacters.length > 0 && (
        <MagicalCard className="mb-8">
          <h3 className="text-2xl font-bold text-white mb-6">Select Characters for This Story</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableCharacters.map((char) => {
              const isSelected = selectedIds.includes(char.id)
              return (
                <div
                  key={char.id}
                  onClick={() => toggle(char.id)}
                  className={`
                    p-4 rounded-xl border-2 cursor-pointer transition-all duration-300
                    ${isSelected
                      ? "bg-white/20 border-white/50 shadow-lg"
                      : "bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/30"
                    }
                  `}
                >
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // Handled by parent div onClick
                      className="mr-4 w-5 h-5 accent-white"
                    />
                    <div className="text-white">
                      <div className="font-semibold text-lg">{char.name}</div>
                      {!char.isGuest && (
                        <div className="text-sm text-white/70">
                          {char.age && `Age: ${char.age}`}
                          {char.age && char.personality && " • "}
                          {char.personality && `${char.personality}`}
                        </div>
                      )}
                      {char.isGuest && (
                        <div className="text-sm text-blue-300">Guest Character</div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </MagicalCard>
      )}

      <MagicalCard className="mb-8">
        <h3 className="text-2xl font-bold text-white mb-6">Custom Story Angle (Optional)</h3>
        <textarea
          value={customAngle}
          onChange={(e) => setCustomAngle(e.target.value)}
          placeholder="Add your own twist to this theme... (e.g., 'Make it about learning to share')"
          rows={3}
          className="w-full px-6 py-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 
                   text-white placeholder-white/60 focus:outline-none focus:ring-2 
                   focus:ring-white/30 text-lg resize-none"
        />
      </MagicalCard>

      <div className="flex justify-center gap-6">
        <button
          onClick={back}
          className="px-8 py-4 bg-white/20 backdrop-blur-md rounded-2xl text-white font-semibold 
                   border border-white/20 shadow-xl hover:bg-white/30 transition-all duration-300
                   hover:transform hover:scale-105"
        >
          Back to Themes
        </button>
        <button
          onClick={next}
          className="px-8 py-4 bg-purple-500/30 backdrop-blur-md rounded-2xl text-white font-semibold 
                   border border-purple-300/30 shadow-xl hover:bg-purple-500/40 transition-all duration-300
                   hover:transform hover:scale-105"
        >
          Review & Generate
        </button>
      </div>
    </div>
  )
}

function ReviewScreen({
  theme,
  storyTitle,
  setStoryTitle,
  storyPromptUser,
  setStoryPromptUser,
  imagePrompt,
  setImagePrompt,
  back,
  generate,
}: {
  theme: ThemeId
  storyTitle: string
  setStoryTitle: (title: string) => void
  storyPromptUser: string
  setStoryPromptUser: (prompt: string) => void
  imagePrompt: string
  setImagePrompt: (prompt: string) => void
  back: () => void
  generate: () => void
}) {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-white text-center mb-12 drop-shadow-lg">
        Review & Edit Your Story Details
      </h1>

      <div className="space-y-8">
        <MagicalCard>
          <h3 className="text-2xl font-bold text-white mb-6">Story Title</h3>
          <input
            type="text"
            value={storyTitle}
            onChange={(e) => setStoryTitle(e.target.value)}
            className="w-full px-6 py-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 
                     text-white placeholder-white/60 focus:outline-none focus:ring-2 
                     focus:ring-white/30 text-lg"
          />
        </MagicalCard>

        <MagicalCard>
          <h3 className="text-2xl font-bold text-white mb-6">Story Direction</h3>
          <textarea
            value={storyPromptUser}
            onChange={(e) => setStoryPromptUser(e.target.value)}
            rows={6}
            className="w-full px-6 py-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 
                     text-white placeholder-white/60 focus:outline-none focus:ring-2 
                     focus:ring-white/30 text-lg resize-none"
          />
        </MagicalCard>

        <MagicalCard>
          <h3 className="text-2xl font-bold text-white mb-6">Cover Image Description</h3>
          <textarea
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            rows={4}
            className="w-full px-6 py-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 
                     text-white placeholder-white/60 focus:outline-none focus:ring-2 
                     focus:ring-white/30 text-lg resize-none"
          />
        </MagicalCard>

        <div className="flex justify-center gap-6">
          <button
            onClick={back}
            className="px-8 py-4 bg-white/20 backdrop-blur-md rounded-2xl text-white font-semibold 
                     border border-white/20 shadow-xl hover:bg-white/30 transition-all duration-300
                     hover:transform hover:scale-105"
          >
            Back
          </button>
          <button
            onClick={generate}
            className="px-8 py-4 bg-green-500/30 backdrop-blur-md rounded-2xl text-white font-semibold 
                     border border-green-300/30 shadow-xl hover:bg-green-500/40 transition-all duration-300
                     hover:transform hover:scale-105"
          >
            Generate Story
          </button>
        </div>
      </div>
    </div>
  )
}

function GeneratingScreen({ 
  stage, 
  error, 
  back 
}: { 
  stage: "idle" | "story" | "image" | "done"
  error: string | null
  back: () => void
}) {
  if (error) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <MagicalCard className="p-12">
          <div className="text-6xl mb-8">😞</div>
          <h1 className="text-3xl font-bold text-white mb-6 drop-shadow-lg">
            Oops! Something went wrong
          </h1>
          <p className="text-white/80 text-lg mb-8">
            {error}
          </p>
          <button
            onClick={back}
            className="px-8 py-4 bg-white/20 backdrop-blur-md rounded-2xl text-white font-semibold 
                     border border-white/20 shadow-xl hover:bg-white/30 transition-all duration-300
                     hover:transform hover:scale-105"
          >
            Try Again
          </button>
        </MagicalCard>
      </div>
    )
  }

  const stageMessages = {
    idle: "Getting ready...",
    story: "Writing your magical story...",
    image: "Painting the perfect cover...",
    done: "Your story is ready!"
  }

  return (
    <div className="max-w-2xl mx-auto text-center">
      <MagicalCard className="p-12">
        <div className="animate-spin w-16 h-16 border-4 border-white/30 border-t-white rounded-full mx-auto mb-8"></div>
        <h1 className="text-3xl font-bold text-white mb-6 drop-shadow-lg">
          Creating Your Story
        </h1>
        <p className="text-white/80 text-xl">
          {stageMessages[stage]}
        </p>
      </MagicalCard>
    </div>
  )
}

function ReadingScreen({ 
  story, 
  go 
}: { 
  story: SavedStory
  go: (s: Screen) => void 
}) {
  return (
    <div className="max-w-4xl mx-auto">
      <MagicalCard className="text-center mb-8">
        <img
          src={story.coverUrl}
          alt={`Cover for ${story.title}`}
          className="w-full max-w-md mx-auto rounded-2xl shadow-2xl mb-8"
        />
        <h1 className="text-4xl font-bold text-white mb-6 drop-shadow-lg">
          {story.title}
        </h1>
        {story.isManual && (
          <span className="inline-block px-4 py-2 bg-green-500/30 rounded-lg text-green-200 text-sm mb-6">
            ✍️ Written by You
          </span>
        )}
      </MagicalCard>

      <MagicalCard className="mb-8">
        <div className="prose prose-lg prose-invert max-w-none">
          {story.body.split('\n\n').map((paragraph, idx) => (
            <p key={idx} className="text-white/90 text-lg leading-relaxed mb-6">
              {paragraph}
            </p>
          ))}
        </div>
      </MagicalCard>

      <div className="flex justify-center gap-6">
        <button
          onClick={() => go("home")}
          className="px-8 py-4 bg-white/20 backdrop-blur-md rounded-2xl text-white font-semibold 
                   border border-white/20 shadow-xl hover:bg-white/30 transition-all duration-300
                   hover:transform hover:scale-105"
        >
          Home
        </button>
        <button
          onClick={() => go("library")}
          className="px-8 py-4 bg-blue-500/30 backdrop-blur-md rounded-2xl text-white font-semibold 
                   border border-blue-300/30 shadow-xl hover:bg-blue-500/40 transition-all duration-300
                   hover:transform hover:scale-105"
        >
          Library
        </button>
        <button
          onClick={() => go("builder")}
          className="px-8 py-4 bg-purple-500/30 backdrop-blur-md rounded-2xl text-white font-semibold 
                   border border-purple-300/30 shadow-xl hover:bg-purple-500/40 transition-all duration-300
                   hover:transform hover:scale-105"
        >
          Create Another
        </button>
      </div>
    </div>
  )
}

function LibraryScreen({ 
  stories, 
  open, 
  remove, 
  go 
}: {
  stories: SavedStory[]
  open: (story: SavedStory) => void
  remove: (id: string) => void
  go: (s: Screen) => void
}) {
  if (stories.length === 0) {
    return (
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold text-white mb-12 drop-shadow-lg">
          Your Story Library
        </h1>
        
        <MagicalCard className="p-12">
          <div className="flex justify-center">
            <TommyIcon iconKey="storyLibrary" alt="Empty Library" className="opacity-50" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-6">No stories yet!</h2>
          <p className="text-white/80 text-lg mb-8">
            Create your first magical story to start building your library.
          </p>
          <button
            onClick={() => go("builder")}
            className="px-8 py-4 bg-purple-500/30 backdrop-blur-md rounded-2xl text-white font-semibold 
                     border border-purple-300/30 shadow-xl hover:bg-purple-500/40 transition-all duration-300
                     hover:transform hover:scale-105"
          >
            Create Your First Story
          </button>
        </MagicalCard>

        <div className="mt-12">
          <button
            onClick={() => go("home")}
            className="px-8 py-4 bg-white/20 backdrop-blur-md rounded-2xl text-white font-semibold 
                     border border-white/20 shadow-xl hover:bg-white/30 transition-all duration-300
                     hover:transform hover:scale-105"
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold text-white text-center mb-12 drop-shadow-lg">
        Your Story Library
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
        {stories.map((story) => (
          <MagicalCard 
            key={story.id}
            className="group cursor-pointer hover:scale-105 transition-transform duration-300"
            onClick={() => open(story)}
          >
            <img
              src={story.coverUrl}
              alt={`Cover for ${story.title}`}
              className="w-full h-48 object-cover rounded-2xl mb-4 shadow-lg"
            />
            <h3 className="text-xl font-bold text-white mb-3 line-clamp-2 group-hover:text-yellow-200 transition-colors">
              {story.title}
            </h3>
            <div className="flex items-center justify-between text-sm text-white/70 mb-4">
              <span>
                {new Date(story.createdAt).toLocaleDateString()}
              </span>
              {story.isManual && (
                <span className="px-2 py-1 bg-green-500/20 rounded text-green-300">
                  ✍️ Manual
                </span>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (confirm("Are you sure you want to delete this story?")) {
                  remove(story.id)
                }
              }}
              className="w-full px-4 py-2 bg-red-500/20 backdrop-blur-md rounded-xl text-red-200 
                       hover:bg-red-500/30 transition-all duration-300 border border-red-300/30"
            >
              Delete
            </button>
          </MagicalCard>
        ))}
      </div>

      <div className="flex justify-center gap-6">
        <button
          onClick={() => go("home")}
          className="px-8 py-4 bg-white/20 backdrop-blur-md rounded-2xl text-white font-semibold 
                   border border-white/20 shadow-xl hover:bg-white/30 transition-all duration-300
                   hover:transform hover:scale-105"
        >
          Home
        </button>
        <button
          onClick={() => go("builder")}
          className="px-8 py-4 bg-purple-500/30 backdrop-blur-md rounded-2xl text-white font-semibold 
                   border border-purple-300/30 shadow-xl hover:bg-purple-500/40 transition-all duration-300
                   hover:transform hover:scale-105"
        >
          Create Another Story
        </button>
      </div>
    </div>
  )
}
