import type { Root } from '../types'
import type { Entry, RootDatabase } from './roots'

/**
 * Reading the query.
 *
 * A user types "wolf, winter, loyal" — three ideas. This turns them into the English
 * meanings the roots are filed under, each with a weight, and fetches the roots.
 *
 * Three layers, tried in this order for every word:
 *   1. The word itself. The database files roots under what they mean, so "wolf" finds
 *      lýkos, lupus, vṛ́ka and úlfr directly. Nearly ten thousand meanings have roots.
 *   2. The hand-written vocabulary below — the words where what to reach for is a
 *      judgment and not a lookup. "Software" has no ancient root; craft and tool do.
 *   3. The thesaurus in the database: what a word is a kind of, and what means the same.
 *
 * What it never does is answer a query it could not read. It used to: anything outside a
 * few hundred known words fell back to truth, knowledge, origin, light and memory, so
 * "wolf", "coffee shop" and "love" all returned the same nine names about knowing. A word
 * that cannot be read is reported, and contributes nothing.
 *
 * Multi-word phrases are matched before single words, so "hidden knowledge" reads as
 * concealment rather than as "hidden" plus "knowledge" pulling in opposite directions.
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
const PHRASES: [string, string[]][] = [
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
  ['real estate', ['land', 'house', 'estate']],
  ['artificial intelligence', ['mind', 'thought', 'craft']],
  ['machine learning', ['learning', 'mind', 'craft']],
  ['coffee shop', ['drink', 'hearth', 'shop']],
  ['law firm', ['law', 'justice', 'counsel']],
  ['video game', ['game', 'play', 'vision']],
  ['social media', ['people', 'voice', 'bond']],
  ['health care', ['healing', 'care', 'health']],
  ['day care', ['child', 'care', 'play']],
  ['north star', ['star', 'north', 'guide']],
]

/**
 * Single words. The left side is what someone types; the right is what the lexicon knows.
 * A word may point at several tags — "insight" is knowledge and sight at once, and a name
 * built from both readings is a better name than one that had to pick.
 */
const WORDS: Record<string, string[]> = {
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

  /*
   * Things the old languages had no word for.
   *
   * Nobody in Ur ran a software company, so these cannot be looked up — each is sent to
   * the old ideas it is made of. The right side here is any meaning the database has
   * roots for, not only the house concepts above; scripts/battery.ts fails if one of
   * them stops existing.
   */
  software: ['craft', 'tool', 'thought'], app: ['tool', 'craft'], apps: ['tool', 'craft'],
  data: ['knowledge', 'record', 'memory'], database: ['memory', 'record', 'store'],
  network: ['net', 'web', 'bond'], internet: ['net', 'web', 'world'], online: ['net', 'web'],
  digital: ['number', 'light'], cyber: ['net', 'guard'], cybersecurity: ['guard', 'net', 'shield'],
  robot: ['servant', 'machine', 'craft'], robotics: ['servant', 'machine', 'craft'],
  computer: ['reckon', 'count', 'mind'], computing: ['reckon', 'count', 'mind'],
  ai: ['mind', 'thought', 'craft'], tech: ['craft', 'skill', 'art'],
  technology: ['craft', 'skill', 'art'], crypto: ['hidden', 'secret', 'coin'],
  blockchain: ['chain', 'bond', 'record'], analytics: ['measure', 'insight', 'reckon'],
  platform: ['foundation', 'stage', 'base'], startup: ['beginning', 'seed', 'dawn'],
  finance: ['wealth', 'treasure', 'gold'], financial: ['wealth', 'treasure', 'gold'],
  bank: ['treasure', 'wealth', 'trust'], banking: ['treasure', 'wealth', 'trust'],
  fintech: ['wealth', 'craft', 'coin'], invest: ['seed', 'growth', 'wealth'],
  investment: ['seed', 'growth', 'wealth'], investing: ['seed', 'growth', 'wealth'],
  capital: ['wealth', 'treasure', 'head'], insurance: ['protection', 'guard', 'trust'],
  accounting: ['count', 'reckon', 'measure'], accountant: ['count', 'reckon', 'measure'],
  consulting: ['counsel', 'advice', 'wisdom'], consultant: ['counsel', 'advice', 'wisdom'],
  consultancy: ['counsel', 'advice', 'wisdom'], advisor: ['counsel', 'advice', 'guide'],
  advisory: ['counsel', 'advice', 'guide'], legal: ['law', 'justice'],
  lawyer: ['law', 'advocate', 'justice'], attorney: ['law', 'advocate', 'justice'],
  realty: ['land', 'house', 'home'], brand: ['mark', 'name', 'sign'],
  branding: ['mark', 'name', 'sign'], agency: ['messenger', 'help', 'work'],
  studio: ['workshop', 'craft', 'art'], media: ['herald', 'voice', 'message'],
  marketing: ['market', 'herald', 'voice'], advertising: ['herald', 'voice', 'call'],
  video: ['sight', 'image', 'vision'], photo: ['light', 'image', 'sight'],
  photography: ['light', 'image', 'sight'], film: ['image', 'story', 'light'],
  movie: ['image', 'story', 'light'], cinema: ['image', 'story', 'light'],
  podcast: ['voice', 'story', 'speech'], blog: ['word', 'story', 'record'],
  news: ['herald', 'message', 'word'], publishing: ['book', 'word', 'scribe'],
  delivery: ['messenger', 'swift', 'carry'], logistics: ['carry', 'path', 'order'],
  shipping: ['ship', 'carry', 'path'], transport: ['carry', 'path', 'wheel'],
  express: ['swift', 'messenger'], car: ['chariot', 'wheel', 'swift'],
  cars: ['chariot', 'wheel', 'swift'], auto: ['chariot', 'wheel', 'swift'],
  automotive: ['chariot', 'wheel', 'swift'], truck: ['wagon', 'wheel', 'carry'],
  trucking: ['wagon', 'wheel', 'carry'], bike: ['wheel', 'swift'], bicycle: ['wheel', 'swift'],
  aviation: ['wing', 'sky', 'flight'], airline: ['wing', 'sky', 'flight'],
  rocket: ['arrow', 'fire', 'star'], space: ['star', 'sky', 'void'],
  fitness: ['strength', 'body', 'vigor'], gym: ['strength', 'body', 'contest'],
  workout: ['strength', 'body', 'toil'], wellness: ['health', 'peace', 'life'],
  energy: ['power', 'force', 'fire'], solar: ['sun', 'light', 'power'],
  electric: ['lightning', 'power', 'amber'], electrical: ['lightning', 'power', 'amber'],
  electricity: ['lightning', 'power', 'amber'], battery: ['power', 'store', 'lightning'],
  hotel: ['inn', 'guest', 'house'], restaurant: ['feast', 'table', 'hearth'],
  cafe: ['drink', 'hearth', 'table'], coffee: ['drink', 'bean', 'dawn'],
  tea: ['leaf', 'drink', 'peace'], bar: ['drink', 'wine', 'hall'], pub: ['drink', 'ale', 'hall'],
  brewery: ['brew', 'ale', 'barley'], bakery: ['bread', 'bake', 'oven'],
  pizza: ['bread', 'fire', 'hearth'], catering: ['feast', 'table', 'cook'],
  chocolate: ['sweet', 'dark', 'delight'], fashion: ['garment', 'beauty', 'style'],
  clothing: ['garment', 'cloth', 'weave'], apparel: ['garment', 'cloth', 'weave'],
  jewelry: ['jewel', 'gold', 'gem'], cosmetics: ['beauty', 'adorn', 'face'],
  salon: ['beauty', 'hair', 'adorn'], spa: ['water', 'rest', 'healing'],
  coach: ['guide', 'teacher', 'path'], coaching: ['guide', 'teacher', 'path'],
  tutor: ['teacher', 'learning', 'guide'], tutoring: ['teacher', 'learning', 'guide'],
  university: ['learning', 'school', 'wisdom'], college: ['learning', 'school', 'wisdom'],
  academy: ['learning', 'school', 'wisdom'], kids: ['child', 'play', 'youth'],
  baby: ['child', 'infant', 'new'], pet: ['beast', 'companion', 'friend'],
  pets: ['beast', 'companion', 'friend'], vet: ['beast', 'healing', 'care'],
  veterinary: ['beast', 'healing', 'care'], dental: ['tooth', 'healing'],
  dentist: ['tooth', 'healing'], clinic: ['healing', 'physician', 'health'],
  medical: ['healing', 'physician', 'health'], pharmacy: ['remedy', 'herb', 'healing'],
  therapy: ['healing', 'care', 'mind'], therapist: ['healing', 'care', 'mind'],
  cleaning: ['pure', 'clean', 'wash'], laundry: ['wash', 'clean', 'cloth'],
  construction: ['build', 'builder', 'stone'], contractor: ['build', 'builder', 'stone'],
  roofing: ['roof', 'shelter'], plumbing: ['water', 'pipe', 'flow'],
  plumber: ['water', 'pipe', 'flow'], landscaping: ['garden', 'earth', 'green'],
  organic: ['living', 'earth', 'pure'], eco: ['earth', 'green', 'life'],
  recycling: ['renewal', 'cycle', 'earth'], solution: ['answer', 'remedy', 'key'],
  solutions: ['answer', 'remedy', 'key'], systems: ['order', 'harmony'],
  global: ['world', 'earth', 'all'], international: ['world', 'nation', 'far'],
  smart: ['wise', 'clever', 'mind'], lab: ['workshop', 'discovery', 'craft'],
  labs: ['workshop', 'discovery', 'craft'], laboratory: ['workshop', 'discovery', 'craft'],
  hub: ['center', 'heart', 'wheel'], link: ['bond', 'chain', 'bridge'],
  sync: ['harmony', 'bond'], boost: ['raise', 'strength', 'growth'],
  premium: ['noble', 'precious', 'best'], pro: ['skill', 'master', 'craft'],
  professional: ['skill', 'master', 'craft'], expert: ['master', 'skill', 'wise'],
  elite: ['chosen', 'noble', 'best'], team: ['band', 'fellowship', 'companion'],
  social: ['people', 'companion', 'bond'], dating: ['love', 'meeting', 'heart'],
  event: ['feast', 'gathering', 'festival'], events: ['feast', 'gathering', 'festival'],
  party: ['feast', 'joy', 'gathering'], tour: ['journey', 'wander', 'path'],
  tourism: ['journey', 'wander', 'path'], outdoor: ['wild', 'field', 'sky'],
  outdoors: ['wild', 'field', 'sky'], sport: ['contest', 'game', 'strength'],
  sports: ['contest', 'game', 'strength'], esports: ['game', 'play', 'contest'],
  gaming: ['game', 'play', 'contest'], gamer: ['game', 'play', 'contest'],
  toy: ['play', 'child', 'joy'], toys: ['play', 'child', 'joy'],
  ministry: ['service', 'sacred', 'servant'], charity: ['gift', 'mercy', 'love'],
  nonprofit: ['gift', 'mercy', 'help'], military: ['army', 'war', 'soldier'],
  police: ['guard', 'law', 'watch'],
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

/** Words that are grammar, not ideas. Skipped without comment — "of" is not unread. */
const FILLER = new Set(`a an the of for and or to in on with my our your their his her its
  that this these those is are be it as by from at into about like i we me us you they
  please something some any called named`.split(/\s+/))

/** "names for my bakery" is asking about a bakery. On its own, "name" is still an idea. */
const PREAMBLE = /^\s*(?:(?:a|an|some|good|cool|new)\s+)*(?:names?|ideas?)\s+(?:for|of)\s+/

/**
 * How much each kind of match is worth. A root that means the word outranks one reached
 * through a judgment, which outranks a synonym, which outranks what the word is a kind of.
 */
const WEIGHT = {
  direct: 1,
  curated: 0.95,
  /** For a word with no root of its own, where the thesaurus is all there is. */
  near: [0.8, 0.6, 0.4],
  /** For a word that has roots, when the query is too thin to blend from alone. */
  widen: [0.55, 0.4],
  neighbor: 0.45,
} as const

/** A query needs about this many meanings before two unlike roots can be found for it. */
const ENOUGH = 3

export interface Interpretation {
  /** The meanings read out of the query, strongest first. */
  concepts: string[]
  /** How strongly each meaning was asked for: 1 for the word itself, less for its kin. */
  weights: Map<string, number>
  /** Words that could not be read, so the page can say so instead of ignoring them. */
  unmatched: string[]
  /** The roots in the database that answer `weights`. The lexicon is searched separately. */
  roots: Root[]
}

/**
 * The spellings a typed word might be filed under: itself first, then with its English
 * endings taken off. Itself first matters — "king" is a word, not "k" plus "-ing".
 */
function spellings(raw: string): string[] {
  const out = [raw]
  const add = (word: string) => {
    if (word.length >= 3 && !out.includes(word)) out.push(word)
  }
  if (raw.endsWith('ies')) add(`${raw.slice(0, -3)}y`)
  if (raw.endsWith('ves')) {
    add(`${raw.slice(0, -3)}f`)
    add(`${raw.slice(0, -3)}fe`)
  }
  if (raw.endsWith('es')) add(raw.slice(0, -2))
  if (raw.endsWith('s') && !raw.endsWith('ss')) add(raw.slice(0, -1))
  for (const ending of ['ing', 'ed', 'er', 'est', 'ly', 'ness', 'ment', 'ions', 'ion']) {
    if (!raw.endsWith(ending)) continue
    const stem = raw.slice(0, -ending.length)
    add(stem)
    // "prototyping" is "prototype", and "modelling" is "model".
    add(`${stem}e`)
    add(stem.replace(/([bdglmnprt])\1$/, '$1'))
    if (stem.endsWith('i')) add(`${stem.slice(0, -1)}y`)
  }
  // British spellings of the -ize verbs. Guarded by length so "wise" is left alone.
  if (raw.length > 5) add(raw.replace(/is(e|ed|ing)$/, 'iz$1'))
  return out
}

/**
 * Read a free-text query into weighted meanings and fetch the roots that answer them.
 */
export async function interpret(query: string, db: RootDatabase): Promise<Interpretation> {
  const weights = new Map<string, number>()
  const bump = (meaning: string, amount: number) => {
    weights.set(meaning, Math.max(weights.get(meaning) ?? 0, amount))
  }

  // Accents come off first, or "café" arrives as "caf".
  const plain = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  let text = ` ${plain.replace(PREAMBLE, '').replace(/[^a-z\s,;/-]/g, ' ').replace(/[,;/-]/g, ' ')} `
  text = text.replace(/\s+/g, ' ')

  // Phrases first, and consumed as they match so their words cannot be counted twice.
  for (const [phrase, meanings] of PHRASES) {
    if (text.includes(` ${phrase} `)) {
      meanings.forEach((m) => bump(m, WEIGHT.direct))
      text = text.replace(` ${phrase} `, ' ')
    }
  }

  const typed = [...new Set(text.split(' ').filter((word) => word && !FILLER.has(word)))]
  const options = typed.map(spellings)
  const known = await db.lookup(options.flat())

  // One reading per typed word: the first spelling anything at all is known about.
  const read: { word: string; entry: Entry; own: boolean }[] = []
  const unmatched: string[] = []
  typed.forEach((raw, i) => {
    for (const word of options[i]) {
      const entry = known.get(word)!
      const own = entry.roots.length > 0 || isConcept(word)
      if (!own && !WORDS[word] && !entry.near.some((tier) => tier.length > 0)) continue
      read.push({ word, entry, own })
      return
    }
    if (raw.length > 2) unmatched.push(raw)
  })

  for (const { word, own } of read) {
    if (own) bump(word, WEIGHT.direct)
    WORDS[word]?.forEach((m) => bump(m, WEIGHT.curated))
  }

  // Now the kin. A word with no root of its own is nothing but its kin, so they count
  // nearly in full; a word that has roots only needs them when the query is too thin to
  // find two unlike roots in — one word, or two that mean much the same.
  const thin = weights.size < ENOUGH
  for (const { word, entry, own } of read) {
    const placed = own || Boolean(WORDS[word])
    if (placed && !thin) continue
    const scale = placed ? WEIGHT.widen : WEIGHT.near
    entry.near.forEach((tier, depth) => {
      const amount = scale[depth]
      if (amount) tier.forEach((m) => bump(m, amount))
    })
  }
  if (thin) {
    for (const meaning of [...weights.keys()]) {
      if (weights.get(meaning)! < WEIGHT.curated) continue
      for (const near of NEIGHBOURS[meaning as Concept] ?? []) bump(near, WEIGHT.neighbor)
    }
  }

  const fetched = await db.lookup(weights.keys())
  const roots = new Map<string, Root>()
  for (const entry of fetched.values()) {
    for (const root of entry.roots) roots.set(root.id, root)
  }

  const concepts = [...weights.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([meaning]) => meaning)

  return { concepts, weights, unmatched, roots: [...roots.values()] }
}

/** Every meaning the hand-written vocabulary can send a word to. For scripts/battery.ts. */
export const CURATED_TARGETS = [
  ...new Set([...Object.values(WORDS).flat(), ...PHRASES.flatMap(([, meanings]) => meanings)]),
]
