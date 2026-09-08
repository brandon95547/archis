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
  ['first form', ['origin', 'creation', 'foundation']],
  ['working model', ['creation', 'order', 'foundation']],
  ['proof of concept', ['creation', 'truth', 'discovery']],
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

  /*
   * Making, modelling and synthesis.
   *
   * This whole field was missing, and it is the one people naming a product
   * reach for first. "prototype, model, synthesize" matched nothing at all, so
   * the reader fell back to the house concepts and answered a query about
   * building things with names about truth.
   *
   * Mapped mostly onto creation and foundation, and deliberately not onto
   * "order". The tag names read like ordinary English and are not: `order`
   * here is cosmic law — ṛta, ma'at, dharma, dào — so sending "model" to it
   * answers a question about making with the moral order of the universe, and
   * puts "Truth, given its measure" at the top of the page again.
   *
   * `foundation` is the same trap one step further in. Five of the nine roots
   * carrying it — ʾemet, kittu, *ʾ-m-n, kun — are truth roots, because in those
   * traditions what is firm and what is true are the same word. So the words
   * for the made thing itself stay off it, and the ones that really do mean a
   * thing built on (framework, construct) keep it.
   */
  prototype: ['origin', 'creation'],
  archetype: ['origin', 'creation'],
  model: ['creation', 'origin'],
  template: ['creation', 'order'],
  blueprint: ['creation', 'thought', 'foundation'],
  schema: ['order', 'thought'],
  draft: ['beginning', 'creation'],
  sketch: ['beginning', 'creation'],
  design: ['creation', 'thought'],
  form: ['creation', 'transformation'],
  shape: ['creation', 'transformation'],
  mould: ['creation', 'transformation'], mold: ['creation', 'transformation'],
  frame: ['foundation'], framework: ['foundation', 'creation'],
  engineer: ['creation', 'foundation'], engine: ['creation', 'strength'],
  construct: ['creation', 'foundation'], assemble: ['creation', 'harmony'],
  fabricate: ['creation'], forming: ['creation', 'transformation'],
  prototyping: ['origin', 'creation', 'foundation'],
  // synthesis — putting made things together, which is not the same as making
  synthesis: ['creation', 'harmony'],
  synthesize: ['creation', 'harmony'],
  combine: ['harmony', 'creation'], merge: ['harmony', 'creation'],
  fuse: ['harmony', 'creation', 'fire'], blend: ['harmony', 'creation'],
  unify: ['harmony', 'foundation'], unity: ['harmony'], union: ['harmony'],
  weave: ['creation', 'harmony'], compose: ['creation', 'harmony', 'word'],
  integrate: ['harmony', 'order'], compound: ['harmony', 'creation'],
  join: ['harmony'], bind: ['harmony', 'foundation'],
  whole: ['harmony', 'order'], coherence: ['harmony', 'clarity', 'order'],
  // and the work around it
  method: ['path', 'order'], technique: ['creation', 'learning'],
  skill: ['creation', 'learning'], practice: ['learning', 'path'],
  precision: ['clarity', 'order'], refine: ['clarity', 'transformation'],
  iterate: ['transformation', 'path'], prove: ['truth', 'discovery'],
  test: ['discovery', 'truth'], measure: ['order', 'clarity'],
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
  creation: ['origin', 'transformation', 'harmony'],
  harmony: ['order', 'creation', 'foundation'],
  foundation: ['order', 'origin', 'strength'],
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
  /**
   * True when *nothing* in the query landed.
   *
   * The concepts below are then Archis's own, not the user's, and every caller
   * has to know the difference. Reading "prototype, model, synthesize" as
   * truth and light and saying so in a footnote is not the same as answering
   * the question, and it looks from the outside like the query was ignored.
   */
  guessed: boolean
}

/**
 * Read a free-text query into weighted concepts.
 *
 * Falls back to a broad, coherent set rather than nothing: an unreadable query should
 * still produce names worth looking at. But it says so — `guessed` is how the caller
 * knows the concepts came from Archis rather than from the person who typed.
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
    // Try the word, then a few cheap English endings. A stemmer would be heavier than
    // this problem: the vocabulary above is the real coverage. The retries that add an
    // "e" back earn their place — stripping "ing" off "prototyping" leaves "prototyp",
    // which is in no vocabulary anywhere — and undoubling turns "modelling" into "model".
    const stem = raw.replace(/(ing|ness|ment|ions?|ed|s)$/, '')
    const undoubled = stem.replace(/([bdglmnprt])\1$/, '$1')
    // British spellings of the -ize verbs. Guarded by length so "wise" is left alone.
    const ise = raw.length > 5 ? raw.replace(/is(e|ed|ing)$/, 'iz$1') : raw
    const candidates = [raw, stem, `${stem}e`, undoubled, `${undoubled}e`, `${raw}e`, ise]
    const hit = candidates.map((c) => WORDS[c]).find(Boolean)
    if (hit) hit.forEach((c) => bump(c, 1))
    else if (isConcept(raw)) bump(raw, 1)
    else if (raw.length > 2) unmatched.push(raw)
  }

  const asked = [...weights.keys()]
  const guessed = asked.length === 0
  if (guessed) {
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

  return { concepts, weights, unmatched, guessed }
}
