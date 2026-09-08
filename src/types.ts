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

export interface LanguageInfo {
  id: string
  name: string
  /** Family or period, shown under the language name in the detail panel. */
  era: string
  provenance: RootProvenance
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
  /** Concept tags this root can answer to. Matched against the interpreted query. */
  concepts: string[]
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
  /**
   * True when nothing in the query was understood and `concepts` are Archis's own.
   *
   * The difference between a reading and a guess is the difference between an
   * answer and a shrug, and the page should not present them the same way.
   */
  guessed?: boolean
}

/**
 * The seam. Swap the implementation and the UI does not change.
 */
export interface NameService {
  readonly id: string
  generate(request: GenerationRequest): Promise<GenerationResult>
}
