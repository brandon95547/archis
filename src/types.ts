/**
 * The shapes the whole app agrees on.
 *
 * These are deliberately independent of how names are produced. The local engine fills
 * them today; a Claude-backed service is meant to fill exactly the same shapes tomorrow,
 * which is why nothing here refers to blending internals.
 */

/** How much we are claiming about a root's reality. */
export type RootProvenance =
  /** A word or stem recorded in surviving texts of a real language. */
  | 'attested'
  /** A form linguists reconstruct from evidence; never written down by a speaker. */
  | 'reconstructed'
  /**
   * Sound only. A handful of syllable shapes borrowed from the *aesthetics* of invented
   * languages — never their vocabulary, names or places. These carry no meaning of their
   * own and can only ever be a name's tail, so a name is never built from sound alone.
   */
  | 'phonetic'
  /**
   * A root from an invented language — Tolkien's Quenya, Sindarin and the rest. As real as
   * any entry in a dictionary of them, and never an ancient one; the panel says which.
   */
  | 'constructed'

export interface LanguageInfo {
  id: string
  name: string
  /** Family or period, shown under the language name in the detail panel. */
  era: string
  provenance: RootProvenance
  /**
   * The wider tradition a language belongs to. The pool is capped per family as well as
   * per language, or four Germanic languages answer a query four times over.
   */
  family: string
}

export interface Root {
  id: string
  /** The citation form, written the way the source tradition is normally transliterated. */
  form: string
  /**
   * The blendable stem: plain ASCII, no diacritics, no laryngeals. Reconstructed roots
   * especially cannot be joined in their cited shape — *ǵneh₃- has to become "gno" before
   * anything can be built from it. Keeping both means the detail panel can show the real
   * citation while the engine works with something pronounceable.
   */
  stem: string
  language: string
  /** What the root means, in as few words as will carry it. */
  gloss: string
  /**
   * The meanings this root answers to, as plain English words, strongest first. For the
   * hand-written roots these are the concept tags in data/concepts.ts; for the roots
   * taken from dictionaries they are the headwords of the gloss.
   */
  concepts: string[]
  /**
   * Noun, verb or adjective, where the source dictionary says. It decides how the two
   * glosses are put into a sentence — "the black wolf" and not "wolf and black".
   */
  pos?: 'n' | 'v' | 'a'
  /**
   * The root as the LAST element of a compound: the whole word, in plain letters. Greek
   * nýx is "nyx" here. Only the roots taken from dictionaries have one.
   */
  word?: string
  /**
   * The root as the FIRST element of a compound: its combining stem. Greek nýx is "nykt",
   * which is what nykt-o-phýlax is built on. Absent when it is the same as `word`.
   */
  comb?: string
  /**
   * How far the entry has been checked. `verified`: a second, independent source gives
   * the same word the same meaning. `unconfirmed`: one source, nothing against it.
   * `flagged`: something about it is doubtful — it stays in the database and is never
   * used to build a name.
   */
  status?: 'verified' | 'unconfirmed' | 'flagged'
  /** What it was checked against, when it was. */
  checkedBy?: string
  /**
   * Whether the noun can sensibly take a kinship or diminutive ending. "Son of the wolf"
   * is a name; "son of the delivery" is not, and nouns that name an act or a process are
   * marked so here.
   */
  kin?: boolean
  /**
   * 0–1. How strongly the root evokes its concepts on its own — a root whose whole
   * meaning is "truth" outranks one where truth is a shade of a broader sense.
   */
  weight: number
}

export type Sound = 'softer' | 'balanced' | 'stronger'
export type Era = 'ancient' | 'balanced' | 'modern'
export type Length = 'short' | 'medium' | 'long'

export interface Refinements {
  length: Length
  sound: Sound
  era: Era
  count: number
  /**
   * False, the default: every name is formed inside ONE language, by that language's own
   * rules. True: two roots from different languages may be blended — which no language
   * ever did, so it is something the user asks for, not something they are handed.
   */
  mix: boolean
}

export interface RootUsage {
  root: Root
  /** The segment cut out of the stem — before the join had its say. */
  contribution: string
  position: 'head' | 'tail'
  /**
   * The same segment as it actually reads in the finished name. Usually identical to
   * `contribution`; different when the seam ate a letter — *sophia* + *aletheia* meet on
   * one "a", so one of them contributes a segment it does not fully keep. Optional
   * because a remote service may not track its joins this closely.
   */
  surface?: string
  /**
   * What this root is doing in a name formed by a language's own rules — "Head", or
   * "Describes the head". Absent on a cross-language blend, which has no grammar.
   */
  role?: string
  /** Which form of the root went in: "combining stem", "whole word", "construct state". */
  shape?: string
}

/**
 * One piece of the finished name, and where it came from.
 *
 * The parts concatenate back into the name, which is the point: a derivation you cannot
 * add up is a story, not a working. `kind: 'link'` marks letters that belong to neither
 * root — a vowel spent to open a join, or one added so the name lands somewhere English
 * can end a word.
 */
export interface DerivationPart {
  text: string
  kind: 'root' | 'link'
  /** Set when kind is 'root'. */
  rootId?: string
  /** How to name this piece in the panel: 'root', 'suffix', 'linking vowel'. */
  label: string
  /** For a name element that is not a root in the database — what "-ion" means. */
  gloss?: string
}

export interface GeneratedName {
  id: string
  name: string
  /** A respelling anyone can read aloud, e.g. "sa-TEE-ra". */
  pronunciation: string
  /** One line. What the blend means, said plainly. */
  interpretation: string
  /** The longer reading, for the detail panel. */
  meaning: string
  /** Prose describing what the join actually did — elision, linking vowel, trimming. */
  blendNote: string
  /**
   * The name spelled out as its parts, in order. Optional: a remote service that cannot
   * show its working simply omits it, and the panel falls back to the roots alone.
   */
  derivation?: DerivationPart[]
  roots: RootUsage[]
  /**
   * The one language the name was formed in. Absent when it is a blend of two — and the
   * difference matters: a name with a language follows that language's rules for making
   * words, and a blend follows none.
   */
  language?: string
  syllables: number
  variants: string[]
  /** 0–100, only used for ordering. Never shown as a number; a score is not a fact. */
  score: number
}

export interface GenerationRequest {
  query: string
  refinements: Refinements
  /** Names already shown, so "more like these" does not repeat them. */
  exclude?: string[]
}

export interface GenerationResult {
  names: GeneratedName[]
  /** The concepts we read out of the query — shown back so a bad reading is visible. */
  concepts: string[]
  /** Every language that contributed a root to this batch. */
  languages: string[]
  /** Set when the query matched too little to work with. */
  notice?: string
}

/**
 * The seam. Swap the implementation and the UI does not change.
 */
export interface NameService {
  readonly id: string
  generate(request: GenerationRequest): Promise<GenerationResult>
}
