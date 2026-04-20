// src/lib/storyPrompts.ts
// Fixed version - using Array.from to avoid downlevelIteration error

export type ThemeId = "space" | "jungle" | "ocean" | "dinosaur" | "pirate" | "monster-trucks"

export type PromptCharacter = {
  name: string
  age?: number | string
  personality?: string
  isGuest?: boolean
}

const THEME_STORY_HOOKS: Record<ThemeId, { world: string; hook: string; vocabulary: string[] }> = {
  space: {
    world: "Tommy's magical universe — a friendly galaxy of candy-colored nebulae, ringed planets, and helpful alien creatures who live among the stars",
    hook: "a mysterious signal, a lost baby comet, or a planet whose colors have stopped glowing",
    vocabulary: ["nebula", "constellation", "gravity", "telescope", "orbit", "stardust"],
  },
  jungle: {
    world: "Tommy's emerald jungle — a steamy, sun-dappled rainforest where talking animals, hidden temples, and glowing fireflies guide young explorers",
    hook: "a missing toucan chick, an overgrown path to a forgotten waterfall, or a map found inside a hollow log",
    vocabulary: ["canopy", "vine", "explorer", "waterfall", "compass", "rainforest"],
  },
  ocean: {
    world: "Tommy's sparkling ocean — a warm turquoise sea with sunlit coral reefs, singing mermaids, and gentle sea creatures who remember ancient songs",
    hook: "a pearl that hums, a seahorse separated from its family, or a coral garden that has lost its colors",
    vocabulary: ["reef", "tide", "current", "snorkel", "lagoon", "seashell"],
  },
  dinosaur: {
    world: "Tommy's prehistoric valley — a golden-hour world of gentle long-necks, playful hatchlings, and distant volcanoes puffing pink smoke",
    hook: "a hatchling who has wandered from its nest, a river that has stopped flowing, or footprints leading somewhere no one has been",
    vocabulary: ["fossil", "prehistoric", "herd", "crater", "volcano", "discovery"],
  },
  pirate: {
    world: "Tommy's tropical seas — a crystal-blue ocean of friendly pirate crews, palm-tree islands, and treasure chests that hold more than gold",
    hook: "a bottle with half a map inside, an island that only appears at sunrise, or a parrot who remembers a forgotten song",
    vocabulary: ["captain", "compass", "spyglass", "island", "treasure", "sail"],
  },
  "monster-trucks": {
    world: "Tommy's racing arena — a sunny stadium of dirt ramps, flame decals, and cheering crowds where monster trucks have big hearts and bigger wheels",
    hook: "a championship race, a missing trophy, or a broken ramp that needs fixing before the big show",
    vocabulary: ["throttle", "suspension", "ramp", "checkered flag", "pit crew", "horsepower"],
  },
}

function describeCast(characters: PromptCharacter[]): string {
  if (!characters.length) return "Tommy, a curious and kind-hearted child"

  // Deduplicate Tommy
  const seen = new Set<string>()
  const unique = characters.filter((c) => {
    const key = c.name.toLowerCase().trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return unique
    .map((c) => {
      const bits: string[] = [c.name]
      if (c.age) bits.push(`(age ${c.age})`)
      if (c.personality) bits.push(`— ${c.personality}`)
      if (c.isGuest) bits.push("[guest]")
      return bits.join(" ")
    })
    .join(", ")
}

export function buildStoryPrompt(opts: {
  theme: ThemeId
  characters: PromptCharacter[]
  customAngle?: string
}): { system: string; user: string } {
  const lore = THEME_STORY_HOOKS[opts.theme]
  const cast = describeCast(opts.characters)
  const hasTommy = opts.characters.some((c) => c.name.toLowerCase() === "tommy")

  const system = [
    "You are a warm, imaginative children's book author writing for ages 4–8.",
    "You write in the style of Julia Donaldson crossed with Oliver Jeffers — gentle, funny, vivid, with a clear moral heart.",
    "Every story has: a strong opening hook, a problem, a journey of discovery, a moment of courage or kindness, and a warm resolution.",
    "Use sensory details (what things look, sound, smell, feel like). Use dialogue. Give each named character something meaningful to do.",
    "Avoid repetition. Avoid template phrases like 'they all lived happily ever after' and 'The End'.",
    "Write between 500 and 650 words. Paragraphs should be short (2–4 sentences) and suitable for reading aloud.",
    "Return ONLY the story body as plain prose. No title, no markdown, no preamble, no 'Once upon a time' unless it fits.",
  ].join(" ")

  const tommyClause = hasTommy
    ? "Tommy is already in the cast list — do NOT add a second Tommy."
    : "Tommy is the series mascot, a curly-haired child adventurer. Include Tommy as a supporting companion."

  const user = [
    `Theme: ${opts.theme}.`,
    `World: ${lore.world}.`,
    `Cast: ${cast}.`,
    tommyClause,
    `Story hook idea (pick one or invent a similar one): ${lore.hook}.`,
    opts.customAngle ? `Angle requested by the family: ${opts.customAngle}.` : "",
    `Try to naturally work in a few of these theme words: ${lore.vocabulary.join(", ")}.`,
    `Give every named character at least one specific action or line of dialogue. Guests should feel welcomed into the adventure.`,
    `End on a warm, satisfying image — not a clichéd tagline.`,
  ]
    .filter(Boolean)
    .join("\n")

  return { system, user }
}

export function buildStoryTitle(opts: {
  theme: ThemeId
  characters: PromptCharacter[]
}): string {
  const themeLabel: Record<ThemeId, string> = {
    space: "Space Adventure",
    jungle: "Jungle Expedition",
    ocean: "Ocean Voyage",
    dinosaur: "Dinosaur Discovery",
    pirate: "Pirate Tale",
    "monster-trucks": "Monster Truck Rally",
  }

  // Fixed: Use Array.from instead of spread operator to avoid downlevelIteration error
  const names = Array.from(new Set(opts.characters.map((c) => c.name)))
    .filter((n) => n.toLowerCase() !== "tommy")

  if (names.length === 0) return `Tommy's ${themeLabel[opts.theme]}`
  if (names.length === 1) return `${names[0]} and Tommy's ${themeLabel[opts.theme]}`
  if (names.length === 2) return `${names[0]}, ${names[1]} and Tommy's ${themeLabel[opts.theme]}`
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}'s ${themeLabel[opts.theme]}`
}
