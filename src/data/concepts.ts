/**
 * Reading the query.
 *
 * A user types "truth, wisdom, hidden knowledge" — three ideas, one of them two words.
 * This turns that into concept tags the lexicon is indexed on. It is a vocabulary, not a
 * parser: no stemming library, no embeddings, just the words people actually reach for
 * when they mean these things, mapped onto the tags the roots carry.
 *
 * Order matters in one place only: multi-word phrases are matched before single words, so
 * "hidden knowledge" reads as concealment rather than as "hidden" plus "knowledge" pulling
 * in opposite directions.
 */

export const CONCEPTS = [
  'truth', 'wisdom', 'knowledge', 'hidden', 'law', 'origin', 'beginning', 'creation',
  'discovery', 'light', 'transformation', 'memory', 'consciousness', 'time', 'order',
  'word', 'name', 'mind', 'thought', 'sight', 'speech', 'voice', 'eternity', 'sacred',
  'learning', 'depth', 'clarity', 'life', 'path', 'foundation', 'sky', 'fire', 'water',
  'breath', 'harmony', 'strength',
] as const

export type Concept = (typeof CONCEPTS)[number]

/** Phrases first — see the note above. Each maps to the tags it should light up. */
const PHRASES: [string, Concept[]][] = [
  ['hidden knowledge', ['hidden', 'knowledge']],
  ['secret knowledge', ['hidden', 'knowledge']],
  ['inner knowledge', ['hidden', 'knowledge', 'consciousness']],
  ['universal law', ['law', 'order']],
  ['natural law', ['law', 'order']],
  ['cosmic order', ['order', 'law', 'sky']],
  ['first principle', ['origin', 'foundation', 'law']],
  ['deep time', ['time', 'eternity', 'depth']],
  ['self knowledge', ['consciousness', 'knowledge']],
  ['higher mind', ['mind', 'consciousness', 'sacred']],
  ['sacred word', ['word', 'sacred', 'speech']],
  ['living memory', ['memory', 'life']],
  ['lost knowledge', ['hidden', 'knowledge', 'memory']],
  ['ancient wisdom', ['wisdom', 'time', 'learning']],
  ['first light', ['light', 'origin', 'beginning']],
  ['open mind', ['mind', 'clarity', 'consciousness']],
]

/**
 * Single words. The left side is what someone types; the right is what the lexicon knows.
 * A word may point at several tags — "insight" is knowledge and sight at once, and a name
 * built from both readings is a better name than one that had to pick.
 */
const WORDS: Record<string, Concept[]> = {
  // truth
  truth: ['truth'], true: ['truth'], honest: ['truth'], honesty: ['truth'],
  real: ['truth'], reality: ['truth'], authentic: ['truth'], integrity: ['truth', 'foundation'],
  certainty: ['truth', 'clarity'], fact: ['truth'], proof: ['truth', 'discovery'],
  // wisdom
  wisdom: ['wisdom'], wise: ['wisdom'], sage: ['wisdom'], insight: ['wisdom', 'sight'],
  judgment: ['wisdom', 'mind'], discernment: ['wisdom', 'clarity'], prudence: ['wisdom'],
  understanding: ['wisdom', 'mind'], counsel: ['wisdom', 'speech'],
  // knowledge
  knowledge: ['knowledge'], knowing: ['knowledge'], know: ['knowledge'],
  learning: ['learning', 'knowledge'], study: ['learning'], scholar: ['learning'],
  science: ['knowledge', 'learning'], intellect: ['mind', 'knowledge'],
  archive: ['memory', 'learning'], library: ['learning', 'memory'], lore: ['knowledge', 'memory'],
  // hidden
  hidden: ['hidden'], secret: ['hidden'], mystery: ['hidden', 'depth'],
  mystic: ['hidden', 'sacred'], occult: ['hidden'], esoteric: ['hidden', 'knowledge'],
  veiled: ['hidden'], concealed: ['hidden'], arcane: ['hidden'], cipher: ['hidden', 'word'],
  // law / order
  law: ['law'], order: ['order'], structure: ['order', 'foundation'],
  principle: ['law', 'foundation'], rule: ['law', 'order'], justice: ['law', 'truth'],
  balance: ['harmony', 'order'], harmony: ['harmony'], pattern: ['order'],
  system: ['order'], symmetry: ['harmony', 'order'],
  // origin
  origin: ['origin'], source: ['origin'], beginning: ['beginning', 'origin'],
  first: ['beginning', 'origin'], root: ['origin', 'foundation'], seed: ['origin', 'life'],
  genesis: ['origin', 'creation'], primal: ['origin', 'time'], ancestral: ['origin', 'memory'],
  // creation
  creation: ['creation'], create: ['creation'], make: ['creation'], craft: ['creation'],
  build: ['creation', 'foundation'], forge: ['creation', 'fire'], invention: ['creation', 'discovery'],
  // discovery
  discovery: ['discovery'], discover: ['discovery'], find: ['discovery'],
  search: ['discovery', 'path'], quest: ['discovery', 'path'], explore: ['discovery', 'path'],
  reveal: ['discovery', 'clarity'], uncover: ['discovery', 'hidden'],
  // light
  light: ['light'], bright: ['light'], radiance: ['light'], glow: ['light'],
  dawn: ['light', 'beginning'], illumination: ['light', 'clarity'], clarity: ['clarity'],
  clear: ['clarity'], lucid: ['clarity', 'light'], star: ['sky', 'light'],
  // transformation
  transformation: ['transformation'], change: ['transformation'], become: ['transformation'],
  growth: ['transformation', 'life'], renewal: ['transformation', 'life'],
  evolution: ['transformation', 'time'], alchemy: ['transformation', 'hidden'],
  // memory
  memory: ['memory'], remember: ['memory'], remembrance: ['memory'], record: ['memory', 'word'],
  history: ['memory', 'time'], trace: ['memory', 'discovery'], legacy: ['memory', 'time'],
  // consciousness
  consciousness: ['consciousness'], awareness: ['consciousness'], awake: ['consciousness'],
  mind: ['mind'], thought: ['thought'], reason: ['mind', 'thought'], attention: ['consciousness'],
  soul: ['life', 'breath'], spirit: ['breath', 'life'], presence: ['consciousness'],
  // time
  time: ['time'], eternal: ['eternity'], eternity: ['eternity'], forever: ['eternity'],
  ancient: ['time'], age: ['time'], era: ['time'], moment: ['time'], enduring: ['eternity'],
  // words and names
  word: ['word'], words: ['word'], language: ['word', 'speech'], speech: ['speech'],
  voice: ['voice'], name: ['name'], naming: ['name'], writing: ['word', 'memory'],
  text: ['word'], story: ['word', 'memory'], meaning: ['word', 'thought'],
  // elements and edges
  depth: ['depth'], deep: ['depth'], sky: ['sky'], heaven: ['sky', 'sacred'],
  fire: ['fire'], flame: ['fire', 'light'], water: ['water'], ocean: ['water', 'depth'],
  breath: ['breath'], life: ['life'], living: ['life'], path: ['path'], way: ['path'],
  journey: ['path'], sacred: ['sacred'], holy: ['sacred'], divine: ['sacred'],
  strength: ['strength'], power: ['strength'], foundation: ['foundation'],
  vision: ['sight'], sight: ['sight'], see: ['sight'], seeing: ['sight'],
}

/**
 * Concepts that pull toward each other. When a query is thin — one word — these widen the
 * pool just enough to have something to blend with, at a lower weight so the thing the
 * user actually asked for still leads.
 */
const NEIGHBOURS: Partial<Record<Concept, Concept[]>> = {
  truth: ['clarity', 'law', 'foundation'],
  wisdom: ['knowledge', 'mind', 'learning'],
  knowledge: ['wisdom', 'learning', 'sight'],
  hidden: ['depth', 'sacred', 'knowledge'],
  law: ['order', 'truth', 'foundation'],
  origin: ['beginning', 'creation', 'foundation'],
  creation: ['origin', 'transformation', 'life'],
  discovery: ['sight', 'path', 'clarity'],
  light: ['clarity', 'sight', 'fire'],
  transformation: ['creation', 'life', 'time'],
  memory: ['time', 'word', 'mind'],
  consciousness: ['mind', 'thought', 'breath'],
  time: ['eternity', 'memory', 'path'],
  order: ['law', 'harmony', 'foundation'],
  word: ['name', 'speech', 'voice'],
  name: ['word', 'memory', 'voice'],
}

const isConcept = (value: string): value is Concept => (CONCEPTS as readonly string[]).includes(value)

export interface Interpretation {
  /** Tags the query asked for, strongest first. */
  concepts: Concept[]
  /** Per-tag weight, 1 for asked-for and lower for widened. */
  weights: Map<Concept, number>
  /** Anything we could not place, so the UI can say so rather than silently ignoring it. */
  unmatched: string[]
}

/**
 * Read a free-text query into weighted concepts.
 *
 * Falls back to a broad, coherent set rather than nothing: an unreadable query should
 * still produce names worth looking at, and the UI says the reading was a guess.
 */
export function interpret(query: string): Interpretation {
  const weights = new Map<Concept, number>()
  const bump = (concept: Concept, amount: number) => {
    weights.set(concept, Math.max(weights.get(concept) ?? 0, amount))
  }

  let text = ` ${query.toLowerCase().replace(/[^a-z\s,;/-]/g, ' ').replace(/[,;/]/g, ' ')} `
  text = text.replace(/\s+/g, ' ')

  // Phrases first, and consumed as they match so their words cannot be counted twice.
  for (const [phrase, concepts] of PHRASES) {
    if (text.includes(` ${phrase} `)) {
      concepts.forEach((c) => bump(c, 1))
      text = text.replace(` ${phrase} `, ' ')
    }
  }

  const unmatched: string[] = []
  for (const raw of text.split(' ').filter(Boolean)) {
    // Try the word, then a couple of cheap English endings. A stemmer would be heavier
    // than this problem: the vocabulary above is the real coverage.
    const candidates = [raw, raw.replace(/(ing|ness|ment|ions?|ed|s)$/, ''), `${raw}e`]
    const hit = candidates.map((c) => WORDS[c]).find(Boolean)
    if (hit) hit.forEach((c) => bump(c, 1))
    else if (isConcept(raw)) bump(raw, 1)
    else if (raw.length > 2) unmatched.push(raw)
  }

  const asked = [...weights.keys()]
  if (asked.length === 0) {
    // Nothing landed. Rather than refuse, work from the concepts Archis is built around.
    ;(['truth', 'knowledge', 'origin', 'light', 'memory'] as Concept[]).forEach((c) => bump(c, 0.6))
  } else if (asked.length < 3) {
    // Too thin to blend interestingly — widen along the strongest links, quietly.
    for (const concept of asked) {
      for (const near of NEIGHBOURS[concept] ?? []) bump(near, 0.45)
    }
  }

  const concepts = [...weights.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([concept]) => concept)

  return { concepts, weights, unmatched }
}
