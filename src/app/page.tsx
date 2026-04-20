"use client"

// src/app/page.tsx
// StoryLoom — Tommy's magical story creator
//
// Requires (alongside this file):
//   src/app/api/generate-image/route.ts   — DALL-E 3 + Cloudinary upload
//   src/app/api/generate-story/route.ts   — GPT-4o story generation
//   src/lib/imagePrompts.ts               — theme image prompt builder
//   src/lib/storyPrompts.ts               — theme story prompt builder
//
// Env vars needed in Vercel:
//   OPENAI_API_KEY
//   CLOUDINARY_CLOUD_NAME = dzx6x1hou
//   CLOUDINARY_API_KEY    = <your Storyloom key>
//   CLOUDINARY_API_SECRET = <matching secret>

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
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
  theme: ThemeId
  imagePrompt: string
  storyPromptUser: string
  createdAt: number
  characterNames: string[]
}

type Screen =
  | "home"
  | "characters"
  | "builder"
  | "themeList"
  | "prepare"   // character selection for a chosen theme
  | "review"    // prompt preview & edit
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
// PAGE
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
    // Default-select all family members, leave guests unchecked
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

      // 2. Image — ground the cover in the actual story opening
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

  // ---------- Render ----------
  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100">
      <div className="mx-auto max-w-5xl px-6 py-10">
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
          <GeneratingScreen stage={genStage} error={genError} back={() => setScreen("review")} />
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
  )
}

// ===================================================================
// SCREENS
// ===================================================================

function HomeScreen({ go }: { go: (s: Screen) => void }) {
  return (
    <div className="flex flex-col items-center text-center pt-6">
      <Image
        src={CLOUDINARY.tommyLogo}
        alt="StoryLoom — Tommy's magical stories"
        width={1536}
        height={1024}
        priority
        className="w-full max-w-[768px] h-auto"
      />
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <button
          onClick={() => go("characters")}
          className="px-8 py-4 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-lg shadow-lg transition"
        >
          👨‍👩‍👧‍👦 Add Your Family to Tommy's World
        </button>
        <button
          onClick={() => go("builder")}
          className="px-8 py-4 rounded-2xl bg-pink-500 hover:bg-pink-600 text-white font-semibold text-lg shadow-lg transition"
        >
          ✨ Create a Story
        </button>
        <button
          onClick={() => go("library")}
          className="px-8 py-4 rounded-2xl bg-white hover:bg-gray-50 text-purple-700 font-semibold text-lg shadow-lg transition border-2 border-purple-200"
        >
          📚 Story Library
        </button>
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
      <Image
        src={CLOUDINARY.tommyLogo}
        alt="StoryLoom"
        width={1536}
        height={1024}
        priority
        className="w-full max-w-[768px] h-auto"
      />
      <h2 className="mt-6 text-3xl font-bold text-purple-800">Add Your Family to Tommy's World</h2>
      <p className="mt-2 text-purple-700">Family members become the stars. Guests are cameo friends who join the adventure.</p>

      <div className="mt-6 w-full max-w-2xl space-y-4">
        {characters.length === 0 && (
          <p className="text-center text-gray-500 italic">No characters yet — add your first one below.</p>
        )}
        {characters.map((c) => (
          <div
            key={c.id}
            className={`rounded-2xl p-5 shadow-md border-2 ${
              c.isGuest ? "bg-amber-50 border-amber-200" : "bg-white border-purple-200"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-purple-700">
                {c.isGuest ? "👥 Guest" : "👤 Family Member"}
              </span>
              <button
                onClick={() => removeCharacter(c.id)}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                Remove
              </button>
            </div>
            <input
              value={c.name}
              onChange={(e) => updateCharacter(c.id, { name: e.target.value })}
              placeholder={c.isGuest ? "Guest name" : "Name"}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-purple-500 focus:outline-none"
            />
            {!c.isGuest && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  value={c.age ?? ""}
                  onChange={(e) => updateCharacter(c.id, { age: e.target.value })}
                  placeholder="Age (optional)"
                  className="px-4 py-2 rounded-lg border border-gray-300 focus:border-purple-500 focus:outline-none"
                />
                <input
                  value={c.personality ?? ""}
                  onChange={(e) => updateCharacter(c.id, { personality: e.target.value })}
                  placeholder="Personality (e.g. curious, brave)"
                  className="px-4 py-2 rounded-lg border border-gray-300 focus:border-purple-500 focus:outline-none"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-3 justify-center">
        <button
          onClick={addFamilyMember}
          className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow"
        >
          + Add Family Member
        </button>
        <button
          onClick={addGuest}
          className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow"
        >
          + Add Guest
        </button>
      </div>

      <div className="mt-8 flex gap-3">
        <button
          onClick={() => go("home")}
          className="px-6 py-3 rounded-xl bg-white hover:bg-gray-50 text-purple-700 font-semibold border-2 border-purple-200"
        >
          ← Home
        </button>
        <button
          onClick={() => go("builder")}
          disabled={characters.filter((c) => c.name.trim()).length === 0}
          className="px-8 py-3 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold shadow-lg"
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
      icon: "✍️",
      title: "Build Your Own Story",
      desc: "Write it yourself with a little help.",
      action: () => alert("Custom story builder — coming soon!"),
    },
    {
      id: "ai",
      icon: "🤖",
      title: "AI Generate a Story",
      desc: "Tell the AI what to write about.",
      action: () => alert("Freeform AI flow — use 'Choose a Theme' for now."),
    },
    {
      id: "theme",
      icon: "🎨",
      title: "Choose a Theme",
      desc: "Pick from six magical worlds.",
      action: () => go("themeList"),
    },
  ]
  return (
    <div className="flex flex-col items-center">
      <h1 className="text-4xl font-bold text-purple-800 text-center">Create Your Story</h1>
      <p className="mt-2 text-purple-700">How would you like to begin?</p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={o.action}
            className="group text-left bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition border-2 border-purple-100 hover:border-purple-400"
          >
            <div className="text-5xl mb-3">{o.icon}</div>
            <div className="text-xl font-bold text-purple-800">{o.title}</div>
            <div className="text-sm text-gray-600 mt-1">{o.desc}</div>
          </button>
        ))}
      </div>

      <button
        onClick={() => go("characters")}
        className="mt-10 px-6 py-3 rounded-xl bg-white hover:bg-gray-50 text-purple-700 font-semibold border-2 border-purple-200"
      >
        ← Back
      </button>
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
      <h1 className="text-4xl font-bold text-purple-800 text-center">Themes</h1>
      <p className="mt-2 text-purple-700">Pick a world for your adventure.</p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
        {THEME_ORDER.map((t) => (
          <button
            key={t}
            onClick={() => pickTheme(t)}
            className="group bg-white rounded-3xl p-6 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition border-2 border-purple-100 hover:border-purple-400 flex flex-col items-center"
          >
            <div className="w-full max-w-[320px] aspect-square relative overflow-hidden rounded-2xl">
              {/* Use <img> here so we can constrain max width without worrying about Next/Image remote config */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={CLOUDINARY.themes[t]}
                alt={THEME_LABEL[t]}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="mt-4 text-xl font-bold text-purple-800">{THEME_LABEL[t]}</div>
          </button>
        ))}
      </div>

      <button
        onClick={() => go("builder")}
        className="mt-10 px-6 py-3 rounded-xl bg-white hover:bg-gray-50 text-purple-700 font-semibold border-2 border-purple-200"
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
      {/* Theme logo replaces Tommy logo, same size */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={CLOUDINARY.themes[theme]}
        alt={THEME_LABEL[theme]}
        className="w-full max-w-[768px] h-auto"
      />
      <h1 className="mt-6 text-3xl font-bold text-purple-800">{THEME_LABEL[theme]}</h1>
      <p className="mt-2 text-purple-700 text-center">
        Choose who joins Tommy on this adventure.
      </p>

      <div className="mt-6 w-full max-w-2xl space-y-3">
        {named.length === 0 && (
          <p className="text-center text-gray-500 italic">
            No characters yet — Tommy will go solo. You can add family members any time.
          </p>
        )}
        {named.map((c) => {
          const selected = selectedIds.includes(c.id)
          return (
            <button
              key={c.id}
              onClick={() => toggle(c.id)}
              className={`w-full text-left p-4 rounded-xl border-2 transition ${
                selected
                  ? "bg-purple-100 border-purple-500"
                  : "bg-white border-gray-200 hover:border-purple-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                    selected ? "bg-purple-600 border-purple-600" : "border-gray-400"
                  }`}
                >
                  {selected && <span className="text-white text-sm">✓</span>}
                </div>
                <div>
                  <div className="font-semibold text-purple-800">
                    {c.name}{" "}
                    {c.isGuest && <span className="text-xs text-amber-600 ml-1">(Guest)</span>}
                  </div>
                  {!c.isGuest && (c.age || c.personality) && (
                    <div className="text-xs text-gray-500">
                      {[c.age && `age ${c.age}`, c.personality].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="mt-6 w-full max-w-2xl">
        <label className="block text-sm font-semibold text-purple-700 mb-1">
          What's the story about? (optional)
        </label>
        <textarea
          value={customAngle}
          onChange={(e) => setCustomAngle(e.target.value)}
          placeholder="e.g. Emma loses her favourite toy and everyone helps find it"
          rows={2}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-purple-500 focus:outline-none"
        />
      </div>

      <div className="mt-8 flex gap-3">
        <button
          onClick={back}
          className="px-6 py-3 rounded-xl bg-white hover:bg-gray-50 text-purple-700 font-semibold border-2 border-purple-200"
        >
          ← Themes
        </button>
        <button
          onClick={next}
          disabled={!canProceed}
          className="px-8 py-3 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold shadow-lg"
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
      <h1 className="text-4xl font-bold text-purple-800 text-center">Review & Edit</h1>
      <p className="mt-2 text-purple-700 text-center">
        Tweak the prompts before we generate. Leave them as-is if you're happy.
      </p>

      <div className="mt-6 w-full max-w-3xl space-y-5">
        <div>
          <label className="block text-sm font-semibold text-purple-700 mb-1">Story Title</label>
          <input
            value={storyTitle}
            onChange={(e) => setStoryTitle(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-purple-500 focus:outline-none text-lg font-semibold"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-purple-700 mb-1">
            Story Prompt (GPT-4o)
          </label>
          <textarea
            value={storyPromptUser}
            onChange={(e) => setStoryPromptUser(e.target.value)}
            rows={10}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-purple-500 focus:outline-none font-mono text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-purple-700 mb-1">
            Cover Image Prompt (DALL-E 3)
          </label>
          <textarea
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            rows={8}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-purple-500 focus:outline-none font-mono text-sm"
          />
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <button
          onClick={back}
          className="px-6 py-3 rounded-xl bg-white hover:bg-gray-50 text-purple-700 font-semibold border-2 border-purple-200"
        >
          ← Characters
        </button>
        <button
          onClick={generate}
          className="px-8 py-3 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-semibold shadow-lg"
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
        return "Writing your story…"
      case "image":
        return "Painting the cover…"
      case "done":
        return "Finishing up…"
      default:
        return "Starting…"
    }
  }, [stage])

  return (
    <div className="flex flex-col items-center justify-center py-20">
      {!error && (
        <>
          <div className="w-16 h-16 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
          <p className="mt-6 text-xl font-semibold text-purple-800">{label}</p>
          <p className="mt-1 text-sm text-purple-600">
            This takes about 20–30 seconds.
          </p>
        </>
      )}
      {error && (
        <div className="max-w-xl w-full bg-red-50 border-2 border-red-200 rounded-2xl p-6 text-center">
          <p className="text-red-700 font-semibold">Something went wrong</p>
          <p className="text-sm text-red-600 mt-2 font-mono break-words">{error}</p>
          <button
            onClick={back}
            className="mt-4 px-6 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold"
          >
            ← Back to Review
          </button>
        </div>
      )}
    </div>
  )
}

function ReadingScreen({ story, go }: { story: SavedStory; go: (s: Screen) => void }) {
  const paragraphs = story.body.split(/\n{2,}/).filter((p) => p.trim())

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={story.coverUrl} alt={story.title} className="w-full h-auto" />
        <div className="p-8">
          <h1 className="text-3xl font-bold text-purple-800">{story.title}</h1>
          <div className="mt-6 space-y-4 text-gray-800 leading-relaxed text-lg">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3 justify-center">
        <button
          onClick={() => go("home")}
          className="px-6 py-3 rounded-xl bg-white hover:bg-gray-50 text-purple-700 font-semibold border-2 border-purple-200"
        >
          ← Home
        </button>
        <button
          onClick={() => go("library")}
          className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow"
        >
          📚 Library
        </button>
        <button
          onClick={() => go("builder")}
          className="px-6 py-3 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-semibold shadow"
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
      <h1 className="text-4xl font-bold text-purple-800">Story Library</h1>
      <p className="mt-2 text-purple-700">Every story you've created, saved for next time.</p>

      {stories.length === 0 ? (
        <div className="mt-10 text-center">
          <p className="text-gray-500 italic">No stories yet — go make one!</p>
          <button
            onClick={() => go("builder")}
            className="mt-4 px-6 py-3 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-semibold shadow-lg"
          >
            ✨ Create a Story
          </button>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {stories.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-purple-100 hover:border-purple-400 transition"
            >
              <button onClick={() => open(s)} className="block w-full text-left">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.coverUrl} alt={s.title} className="w-full aspect-square object-cover" />
                <div className="p-4">
                  <div className="font-bold text-purple-800 line-clamp-2">{s.title}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(s.createdAt).toLocaleDateString()} · {THEME_LABEL[s.theme]}
                  </div>
                </div>
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete "${s.title}"?`)) remove(s.id)
                }}
                className="w-full py-2 text-sm text-red-600 hover:bg-red-50 border-t border-gray-200"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => go("home")}
        className="mt-10 px-6 py-3 rounded-xl bg-white hover:bg-gray-50 text-purple-700 font-semibold border-2 border-purple-200"
      >
        ← Home
      </button>
    </div>
  )
}
