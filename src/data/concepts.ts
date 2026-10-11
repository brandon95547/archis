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
 *
 * Then the field. Reading a word is not the same as exploring from it: "music" has a
 * dozen roots, and melody, harmony, song and tone — which a person naming a music school
 * is as well served by — have hundreds. So each typed word is followed outward to what
 * it is associated with, and those to what they are associated with, a ring at a time
 * and at a falling weight. What was typed still leads; what is one link away comes
 * next; and a search is no longer over when its own few roots are used up. See `ASSOCIATIONS`
 * below and the `a` fields scripts/build_field.py writes into the database.
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
   * `foundation` is the same trap one step further in. Two of the hand-written roots
   * carrying it — ʾemet and kittu — are truth roots, because in those traditions what
   * is firm and what is true are the same word. So the words for the made thing itself
   * stay off it, and the ones that really do mean a thing built on (framework,
   * construct) keep it.
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
  // Instruments nobody in these languages played. Each is sent to the nearest thing that
  // was — a piano is strings struck in a frame, and the harp and the lyre are its kin —
  // and to music, which is what the instrument is for. Not to "string": the roots filed
  // there are cord and thread, and "son of the string" is nobody's name for a piano.
  piano: ['harp', 'lute', 'music'], pianist: ['musician', 'harp'],
  guitar: ['lute', 'harp', 'music'], guitarist: ['musician', 'lute'],
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

/**
 * What a word brings to mind — by hand, for the words people name things after.
 *
 * The database's own fields come from WordNet, which knows what a thing is a kind of and
 * very little about what goes with it: it has no line from the moon to the night, or
 * from a wolf to its pack. These are those lines. Each word leads to a handful of
 * others, every one of them a meaning the database has roots for (scripts/battery.ts
 * fails if one stops existing), and they are followed before the database's fields are.
 *
 * Associations, not synonyms — and not a second vocabulary. A word here still means
 * itself first; this only says where a search may go once it has.
 */
const ASSOCIATIONS: Record<string, string[]> = Object.fromEntries(`
music: melody harmony rhythm sound tone song composition
song: melody voice hymn poem ballad
melody: tune song harmony tone
harmony: concord balance peace music agreement
rhythm: pulse dance measure
sound: voice tone echo
voice: speech song sound word
dance: rhythm step joy music
learning: knowledge study wisdom lesson scholar school
knowledge: wisdom learning understanding truth insight
wisdom: knowledge insight prudence counsel sage
teacher: master guide scholar lesson school
school: learning lesson teacher student study
study: learning book knowledge scholar
book: page word story scroll writing
story: tale legend word memory
word: speech name language voice
name: word fame title
truth: honesty reality light faith
light: sun dawn flame star brightness radiance
sun: light day fire gold dawn summer
moon: night star silver tide month
star: night sky light heaven
sky: heaven cloud air star
night: moon star darkness shadow dream
day: sun light dawn morning
dawn: morning light sunrise beginning
fire: flame heat light hearth spark ember
water: river sea rain spring wave
sea: ocean wave ship tide shore
ocean: sea wave tide depth water
river: stream water flow bank
rain: storm cloud water
storm: thunder lightning wind rain
wind: air breath storm breeze
earth: soil land stone ground
mountain: peak stone height rock hill
stone: rock mountain strength
forest: tree wood grove leaf wild
tree: leaf root branch oak wood
flower: bloom rose garden spring
garden: flower fruit tree
wolf: pack hunter forest moon howl fang
lion: king pride courage mane strength
eagle: wing sky flight hawk
horse: rider speed mane steed
dragon: fire serpent wing
bear: strength forest
bird: wing feather song flight sky
king: crown throne ruler kingdom lord
queen: crown throne lady
war: battle sword warrior victory
warrior: sword shield battle courage hero
sword: blade steel warrior edge
peace: calm rest harmony quiet
love: heart desire beloved affection
heart: love soul courage breast
soul: spirit breath life heart
spirit: soul breath wind ghost
life: breath birth growth soul
death: end grave shadow
time: age season hour eternity
dream: sleep vision night hope
hope: faith dream light future
faith: trust hope belief
joy: delight laughter
strength: power might force courage
power: strength might force rule
courage: bravery heart valor strength
speed: haste wind arrow
gold: treasure wealth sun crown
silver: moon coin
wealth: gold treasure riches abundance
treasure: gold jewel wealth hoard
home: house hearth family shelter
house: home hall roof door
family: kin home child mother father
child: youth son daughter birth
friend: companion ally love
health: healing strength life medicine
healing: medicine health remedy herb
food: bread feast meal harvest
bread: grain wheat loaf oven
wine: grape vine feast cup
art: craft beauty skill image
craft: skill art tool maker
beauty: grace charm splendor
mind: thought reason wisdom memory
thought: mind idea reason
memory: remembrance past mind
science: knowledge study nature
nature: earth life forest wild
travel: journey road path ship
journey: road path travel wanderer
road: path way journey
ship: sea sail voyage mast
city: wall gate tower people
trade: market merchant coin
money: coin gold wealth silver
law: justice order judge right
justice: law right truth judge
freedom: liberty flight
victory: triumph crown glory
glory: fame honor splendor
honor: glory respect fame
future: hope time dawn
shadow: darkness night shade
darkness: night shadow
ice: frost snow cold winter
winter: snow ice frost cold
summer: sun heat harvest
harvest: grain autumn field
field: plain meadow land
game: play contest sport
play: game joy child
work: labor craft toil
guide: leader path teacher
leader: chief guide king
protection: shield guard defense
shield: protection guard defense
guard: watch protector shield
hunter: hunt bow prey arrow
magic: spell charm
god: divine heaven holy
holy: sacred divine
harp: string music song
lute: string music song
string: harp lute fiddle chord
instrument: harp lute flute drum horn fiddle trumpet
musician: singer bard poet harper
singer: song voice bard choir
tune: melody song
tone: sound voice
composition: song poem verse harmony
poem: verse song poet
lesson: teaching learning school book
scholar: sage student book wisdom
teaching: lesson wisdom guide school
student: learning study scholar school
education: learning knowledge school teaching
`.trim().split('\n').map((line) => {
  const [word, rest] = line.split(':')
  return [word.trim(), rest.trim().split(/\s+/)]
}))

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
  /** The vocabulary's extra ideas for a word that has roots of its own: "star" is also sky. */
  aside: 0.7,
  /** For a word whose own roots are all adjectives: its noun kin, by distance. */
  near: [0.8, 0.6, 0.4],
  /**
   * For a word with no root of its own, where its kin are all there is. The nearest of
   * them stand in for it at the same weight a hand-written stand-in gets: the word was
   * typed like any other, and a search of four words is four equal askings, not three
   * and a footnote because the database happened to have no entry for the fourth.
   */
  stand: [0.95, 0.7, 0.5],
  /** Kin found only at the far end of the thesaurus are a guess, and never count in full. */
  far: 0.7,
  /** For a word that has roots, when the query is too thin to blend from alone. */
  widen: [0.55, 0.4],
  neighbor: 0.45,
} as const

/** A query needs about this many meanings before two unlike roots can be found for it. */
const ENOUGH = 3

/**
 * Following a word outward. Each link multiplies the weight it started from, so a ring
 * can never outrank the one inside it: what was typed is 1, what it leads to about 0.65,
 * and what that leads to about 0.4.
 */
const RING = {
  /** A hand-written association, a near field entry, and a wider one. */
  link: { curated: 0.68, near: 0.64, wider: 0.5 },
  /** How many new meanings one typed word may add in each ring. More is not better:
   *  every one is a fetch, and past these the links are the weak ones. */
  cap: [10, 12, 14],
  /**
   * How strongly a meaning must have been reached to be followed further, ring by ring.
   * Only what came by a near or hand-written link is: a word reached loosely and then
   * followed loosely is where a search for music arrives at rope.
   */
  follow: [0.6, 0.4],
  /** Below this a meaning is too far from the query to build a name on. */
  floor: 0.24,
} as const

/** How many rings out a search can go. `interpret` is asked for one at a time. */
export const MAX_DEPTH = RING.cap.length

export interface Interpretation {
  /** The meanings read out of the query, strongest first. */
  concepts: string[]
  /** How strongly each meaning was asked for: 1 for the word itself, less for its kin. */
  weights: Map<string, number>
  /** Words that could not be read, so the page can say so instead of ignoring them. */
  unmatched: string[]
  /** The roots in the database that answer `weights`. The lexicon is searched separately. */
  roots: Root[]
  /**
   * Verbs that were typed, and the nouns they were read as. A name is built on nouns and
   * adjectives, so "generate" can only come through as creation or maker — and the page
   * has to say that happened, or a two-word search that returns names about one word
   * looks like the other was ignored.
   */
  recast: { word: string; as: string[] }[]
  /** Meanings that cannot take a kinship or diminutive ending. See Shard.x. */
  kinless: Set<string>
  /**
   * Which typed word each meaning came from, and how directly: 0 for the word itself or
   * what stands in for it, higher for its wider kin. A name that joins two meanings of
   * the same typed word has answered half the search twice.
   */
  origin: Map<string, { word: number; tier: number }>
  /**
   * The search as it was typed: every word or phrase that was read, in order. They are
   * equals. None of them leads, a name answers any one of them or joins two, and the page
   * is shared out between them.
   */
  keywords: Keyword[]
  /**
   * Which keywords each meaning answers, as indexes into `keywords`. More than one when
   * two typed words lead to the same place — "education" and "teach" both reach teacher.
   */
  sources: Map<string, number[]>
  /**
   * How many links each meaning is from what was typed: 0 for the word itself and what
   * stands in for it, 1 for what it leads to, and so on out. Only the meanings reached
   * by following the field are here above 0.
   */
  rings: Map<string, number>
  /** Whether going one ring further would find anything more. */
  deeper: boolean
}

/**
 * Where the field's tiers start in `origin`. Tiers below this are the query and its
 * kin; from here up, a meaning was reached by following an association, and two of
 * those from one typed word are different ideas and may be joined in a name.
 */
export const FIELD_TIER = 10

export interface Keyword {
  /** The word or phrase, as it was read. */
  text: string
  /**
   * What stands in for it, nearest first, when no language here has a word for the thing
   * itself. Empty for a word with roots of its own, and for a verb, which `recast` reports.
   */
  readAs: string[]
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
 *
 * `depth` is how many rings of association to follow outward from what was typed: 0 for
 * the query alone, up to MAX_DEPTH. The service asks for the next ring only when a search
 * has shown the best of the one it is in, so most searches never pay for the outer ones.
 */
export async function interpret(query: string, db: RootDatabase, depth = 0): Promise<Interpretation> {
  const weights = new Map<string, number>()
  // A meaning reached through the thesaurus is reached in one part of speech: "fast" is
  // near "fleet" the adjective, not "fleet" the navy. A meaning the user typed is theirs
  // in every sense, and is never restricted.
  const only = new Map<string, string>()
  const origin: Interpretation['origin'] = new Map()
  const keywords: Keyword[] = []
  const sources = new Map<string, number[]>()
  // Which typed word, and how far from it, the meanings being bumped right now belong to.
  let from = { word: -1, tier: 0 }
  // And which keyword that is. Unlike `from`, this never splits one typed word in two.
  let key = -1
  const bump = (meaning: string, amount: number, pos?: string) => {
    if (key >= 0) {
      const heard = sources.get(meaning) ?? []
      if (!heard.includes(key)) sources.set(meaning, [...heard, key])
    }
    const before = weights.get(meaning) ?? 0
    if (amount > before) {
      weights.set(meaning, amount)
      origin.set(meaning, from)
      if (pos) only.set(meaning, pos)
      else only.delete(meaning)
    } else if (amount === before && !pos) {
      only.delete(meaning)
    }
  }

  // Accents come off first, or "café" arrives as "caf".
  const plain = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  let text = ` ${plain.replace(PREAMBLE, '').replace(/[^a-z\s,;/-]/g, ' ').replace(/[,;/-]/g, ' ')} `
  text = text.replace(/\s+/g, ' ')

  // Phrases first, and consumed as they match so their words cannot be counted twice.
  PHRASES.forEach(([phrase, meanings], index) => {
    if (text.includes(` ${phrase} `)) {
      // A phrase is several ideas on purpose — "coffee shop" is drink and hearth — so
      // each of its meanings counts as a typed word of its own. It is still one keyword.
      key = keywords.push({ text: phrase, readAs: [] }) - 1
      meanings.forEach((m, i) => {
        from = { word: -1000 - index * 10 - i, tier: 0 }
        bump(m, WEIGHT.direct)
      })
      text = text.replace(` ${phrase} `, ' ')
    }
  })

  const typed = [...new Set(text.split(' ').filter((word) => word && !FILLER.has(word)))]
  const options = typed.map(spellings)
  const known = await db.lookup(options.flat())

  // One reading per typed word: the first spelling anything at all is known about.
  const read: { word: string; entry: Entry; own: boolean }[] = []
  const unmatched: string[] = []
  typed.forEach((raw, i) => {
    // A spelling with roots of its own beats one the thesaurus merely knows: "hands" is
    // in the thesaurus as custody, and what was typed is the plural of "hand".
    const placed = options[i].find((word) => known.get(word)!.roots.length > 0 || isConcept(word) || WORDS[word])
    const word = placed ?? options[i].find((option) => known.get(option)!.near.some((tier) => tier.length > 0))
    if (word) {
      const entry = known.get(word)!
      read.push({ word, entry, own: entry.roots.length > 0 || isConcept(word) })
    } else if (raw.length > 2) {
      unmatched.push(raw)
    }
  })

  // Where each read word sits among the keywords, after any phrases.
  const keyOf = read.map(({ word, own }) =>
    keywords.push({ text: word, readAs: own ? [] : (WORDS[word] ?? []).slice(0, 3) }) - 1)

  read.forEach(({ word, entry, own }, index) => {
    key = keyOf[index]
    from = { word: index, tier: 0 }
    if (own) bump(word, WEIGHT.direct)
    // "Generation" is filed mostly as an age of people, and was typed as the act of
    // generating. The nouns of its verb stand beside it as the same idea.
    entry.acts.forEach((tagged) => {
      const [meaning, pos] = tagged.split(':')
      bump(meaning, WEIGHT.curated, pos)
    })
    // The vocabulary's ideas for one word are different ideas — software is craft and
    // tool — and a name may join them, so each is its own origin.
    WORDS[word]?.forEach((m, i) => {
      from = { word: own ? index : index + (i + 1) * 0.01, tier: own && m !== word ? 1 : 0 }
      bump(m, own && m !== word ? WEIGHT.aside : WEIGHT.curated)
    })
  })

  // Now the kin. A word with no root of its own is nothing but its kin, so they count
  // nearly in full; a word that has roots only needs them when the query is too thin to
  // find two unlike roots in — one word, or two that mean much the same.
  const thin = weights.size < ENOUGH
  const recast: Interpretation['recast'] = []
  read.forEach(({ word, entry, own }, index) => {
    key = keyOf[index]
    const placed = own || Boolean(WORDS[word])
    // "Strong" has roots, but they are all adjectives, and a name needs a noun to stand
    // on. Its kin — strength — are what it would have been asked for as a thing.
    const nounless = entry.roots.length > 0 && !entry.roots.some((root) => root.pos === 'n')
    // A verb, or near enough: "heal" has one noun among a dozen verbs, and a name built
    // only on that noun would leave the idea all but unanswered.
    const nouns = entry.roots.filter((root) =>
      root.pos !== 'v' && !root.gloss.startsWith('to ') && root.status !== 'flagged')
    if (entry.roots.length > 0 && nouns.length * 4 <= entry.roots.length && !WORDS[word]) {
      // A verb. Its nouns stand in for it, and the nearest of them count as asked for:
      // they are the only way the word that was typed can be in a name at all.
      const stand = [WEIGHT.curated, 0.8, 0.6]
      let level = 0
      const as: string[] = []
      // The nouns built on the verb itself — learn: learning, learner — are the verb,
      // as nearly as a name can have it.
      from = { word: index, tier: 0 }
      entry.field.near.map((tagged) => tagged.split(':')).filter(([, pos]) => pos === 'n').slice(0, 4)
        .forEach(([meaning, pos]) => {
          bump(meaning, WEIGHT.curated, pos)
          if (!as.includes(meaning)) as.push(meaning)
        })
      for (const tier of entry.near) {
        const nouns = tier.map((tagged) => tagged.split(':')).filter(([, pos]) => pos !== 'v')
        if (nouns.length === 0) continue
        const amount = stand[level]
        from = { word: index, tier: level }
        nouns.forEach(([meaning, pos]) => bump(meaning, amount, pos))
        if (level === 0) as.push(...nouns.map(([meaning]) => meaning).filter((meaning) => !as.includes(meaning)).slice(0, 3))
        level += 1
      }
      recast.push({ word, as: as.slice(0, 4) })
      return
    }
    if (placed && !thin && !nounless) return
    if (!placed) {
      // No root and no hand-written reading: the word is its kin and nothing else. The
      // nearest tier that has any stands in for it, and says so on the page.
      let level = 0
      entry.near.forEach((tier, depth) => {
        if (tier.length === 0) return
        const amount = Math.min(WEIGHT.stand[level], depth === 2 ? WEIGHT.far : 1)
        from = { word: index, tier: level }
        tier.forEach((tagged) => {
          const [meaning, pos] = tagged.split(':')
          bump(meaning, amount, pos)
        })
        if (level === 0) keywords[key].readAs = tier.map((tagged) => tagged.split(':')[0]).slice(0, 3)
        level += 1
      })
      return
    }
    const scale = placed && !nounless ? WEIGHT.widen : WEIGHT.near
    entry.near.forEach((tier, depth) => {
      const amount = scale[depth]
      if (!amount) return
      from = { word: index, tier: depth + 1 }
      tier.forEach((tagged) => {
        const [meaning, pos] = tagged.split(':')
        bump(meaning, amount, pos)
      })
    })
  })
  if (thin) {
    for (const meaning of [...weights.keys()]) {
      if (weights.get(meaning)! < WEIGHT.curated) continue
      from = { word: origin.get(meaning)?.word ?? -1, tier: 3 }
      key = sources.get(meaning)?.[0] ?? -1
      for (const near of NEIGHBOURS[meaning as Concept] ?? []) bump(near, WEIGHT.neighbor)
    }
  }

  // ── the field ──────────────────────────────────────────────────────────────────────
  // Everything so far is what the query says. From here on it is what the query leads to.
  const rings: Interpretation['rings'] = new Map([...weights.keys()].map((meaning) => [meaning, 0]))
  // Where each typed word's ring starts: the word itself — unless it was read by hand, in
  // which case what it was read as is the better guide — and whatever stands for it.
  let frontier = new Map<number, Map<string, number>>()
  const start = (keyword: number, word: string, weight: number) => {
    const seeds = frontier.get(keyword) ?? new Map<string, number>()
    seeds.set(word, Math.max(seeds.get(word) ?? 0, weight))
    frontier.set(keyword, seeds)
  }
  read.forEach(({ word, own }, index) => {
    if (own || !WORDS[word]) start(keyOf[index], word, 1)
  })
  for (const [meaning, weight] of weights) {
    if (weight < WEIGHT.curated) continue
    for (const keyword of sources.get(meaning) ?? []) start(keyword, meaning, weight)
  }
  const wordOf = new Map(read.map((_, index) => [keyOf[index], index]))
  // Where each typed word's search already is: everything it has led to so far. A link
  // two rings out is followed only if it ties back to this — see `tied` below.
  const reached = new Map<number, Set<string>>(keywords.map((keyword, index) => [index, new Set([keyword.text])]))
  for (const [meaning, heard] of sources) heard.forEach((keyword) => reached.get(keyword)?.add(meaning))

  // Read no further than what was typed, there is more wherever a word has somewhere to go.
  let deeper = depth < 1 && frontier.size > 0
  for (let ring = 1; ring <= Math.min(depth, MAX_DEPTH) && frontier.size > 0; ring += 1) {
    const entries = await db.lookup([...frontier.values()].flatMap((seeds) => [...seeds.keys()]))
    const next = new Map<number, Map<string, number>>()
    // Each typed word works out its ring from the search as it stood when the ring
    // began, and only then are any of them added. Done one word at a time, whichever
    // was typed first claimed the meanings two of them share — "education" and "teach"
    // both lead to knowledge — and the other was left to fill its ring with scraps.
    const taking: { keyword: number; meaning: string; weight: number; pos?: string }[] = []
    for (const [keyword, seeds] of frontier) {
      // Every link out of this word's ring, at the best weight any path gives it.
      const found = new Map<string, { weight: number; pos?: string; paths: number }>()
      const offer = (tagged: string, weight: number) => {
        const [meaning, pos] = tagged.split(':')
        if (weight < RING.floor || (weights.get(meaning) ?? 0) >= weight) return
        const had = found.get(meaning)
        const paths = (had?.paths ?? 0) + 1
        if (!had || weight > had.weight) found.set(meaning, { weight, pos, paths })
        // The same meaning reached with and without a part of speech is unrestricted.
        else found.set(meaning, { ...had, pos: weight === had.weight && !pos ? undefined : had.pos, paths })
      }
      // A word reached by association was reached in ONE of its senses, and its own
      // associations are worth following only in that sense. String came from the harp:
      // it leads on to the fiddle, and not to rope. So past the first ring, a group of
      // the database's links is taken only when it ties back to what this typed word
      // has already led to — one of the links, or one of the words that place their
      // sense, is among them. What was typed is the user's in every sense: no tie needed.
      const about = reached.get(keyword) ?? new Set<string>()
      const tied = (word: string, links: readonly string[], cues: readonly string[] = []) =>
        cues.some((cue) => about.has(cue))
        || links.some((link) => link.split(':')[0] !== word && about.has(link.split(':')[0]))
      for (const [word, weight] of seeds) {
        // The hand-written associations were each written for one sense, the one a name
        // would want, and are followed as they stand — until the third ring, which is
        // far enough out that it too must tie back or be left.
        const curated = ASSOCIATIONS[word]
        if (curated && (ring < 3 || tied(word, curated))) {
          curated.forEach((meaning) => offer(meaning, weight * RING.link.curated))
        }
        // The database's own fields are followed two rings out and no further.
        if (ring > 2) continue
        const field = entries.get(word)?.field
        for (const group of field?.groups ?? []) {
          if (ring === 1 || tied(word, group.links, group.cues)) {
            group.links.forEach((tagged) => offer(tagged, weight * RING.link.near))
          }
        }
        // The wider field only of what was typed: two loose links in a row is a guess.
        if (ring === 1) field?.wider.forEach((tagged) => offer(tagged, weight * RING.link.wider))
      }
      // The strongest links first. Between equals, the meaning more of this word's field
      // leads to — voice is reached from song and from sound, and belongs to music more
      // surely than what only one of them points at — and then the alphabet, so the same
      // search always explores the same way.
      const taken = [...found.entries()]
        .sort((a, b) => b[1].weight - a[1].weight || b[1].paths - a[1].paths || (a[0] < b[0] ? -1 : 1))
        .slice(0, RING.cap[ring - 1])
      for (const [meaning, { weight, pos }] of taken) taking.push({ keyword, meaning, weight, pos })
    }
    // Added strongest first, and between equals by the word itself — never by where in
    // the search it was typed.
    taking.sort((a, b) => b.weight - a.weight
      || (keywords[a.keyword].text < keywords[b.keyword].text ? -1 : keywords[a.keyword].text > keywords[b.keyword].text ? 1 : 0)
      || (a.meaning < b.meaning ? -1 : 1))
    for (const { keyword, meaning, weight, pos } of taking) {
      key = keyword
      from = { word: wordOf.get(keyword) ?? -2000 - keyword, tier: FIELD_TIER + ring }
      bump(meaning, weight, pos)
      if (weights.get(meaning) !== weight) continue
      rings.set(meaning, ring)
      // Only the first ring joins what a tie is made to: a chain that ties each link
      // to the one before it can end anywhere.
      if (ring === 1) reached.get(keyword)?.add(meaning)
      if (weight >= (RING.follow[ring - 1] ?? 1)) {
        const onward = next.get(keyword) ?? new Map<string, number>()
        onward.set(meaning, weight)
        next.set(keyword, onward)
      }
    }
    frontier = next
    deeper = ring === depth && ring < MAX_DEPTH && next.size > 0
  }

  const fetched = await db.lookup(weights.keys())
  const roots = new Map<string, Root>()
  const kinless = new Set<string>()
  for (const [meaning, entry] of fetched) {
    if (entry.kinless) kinless.add(meaning)
    const pos = only.get(meaning)
    for (const root of entry.roots) {
      if (pos && root.pos !== pos) continue
      // A root found through one meaning must not also score for another it carries
      // in the wrong part of speech.
      const concepts = root.concepts.filter((c) => !only.has(c) || only.get(c) === root.pos)
      roots.set(root.id, concepts.length === root.concepts.length ? root : { ...root, concepts })
    }
  }

  const concepts = [...weights.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([meaning]) => meaning)

  return { concepts, weights, unmatched, roots: [...roots.values()], recast, kinless, origin, keywords, sources, rings, deeper }
}

/** Every meaning the hand-written vocabulary can send a word to. For scripts/battery.ts. */
export const CURATED_TARGETS = [
  ...new Set([
    ...Object.values(WORDS).flat(),
    ...PHRASES.flatMap(([, meanings]) => meanings),
    ...Object.values(ASSOCIATIONS).flat(),
  ]),
]
