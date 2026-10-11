import type { DerivationPart, Root, RootUsage } from '../types'

/**
 * Making a name the way its language makes words.
 *
 * The blender in blend.ts cuts two roots from two unrelated languages and negotiates a
 * seam between them. No language ever did that, and it shows: the result has a meaning
 * only because the panel says so. This module is the other way. It takes two roots from
 * ONE language and joins them by that language's own rule — Greek on a linking -o-, Old
 * English stem to word, Hebrew through the construct state, Sindarin by softening the
 * second consonant — or it takes one root and gives it one of the language's own name
 * endings. What comes out is a word that language could have had.
 *
 * Three things follow from that, and each is deliberate:
 *   · A language with no rule here forms no names. Old Irish compounds lose vowels by
 *     rules this file does not model, so Old Irish is left out rather than done wrong.
 *   · A join the language's rule does not cover returns null. Better no name than a
 *     plausible-looking invalid one.
 *   · Every rule cites a real word or name built the same way, so the claim "this is how
 *     Greek does it" can be checked.
 *
 * Only nouns and adjectives are used. A verb needs its own derivation before it can sit
 * in a compound — Latin victor is built on vict-, not on vincere — and that is not
 * something to guess at.
 */

export interface Formed {
  /** Lowercase, plain letters. */
  name: string
  language: string
  kind: 'compound' | 'derived'
  /** The roots in the order they appear in the name. */
  roots: RootUsage[]
  derivation: DerivationPart[]
  /** The rule that was applied, in one sentence, with a real example of it. */
  note: string
  /** What the name literally says, built from the glosses and nothing else. */
  reading: string
}

interface Piece {
  text: string
  kind: 'root' | 'link'
  label: string
  root?: Root
  shape?: string
  gloss?: string
}

interface Built {
  pieces: Piece[]
  note: string
}

interface Affix {
  text: string
  side: 'prefix' | 'suffix'
  /** What the element means, for the panel. */
  means: string
  /** The reading of the whole name, given the root's gloss. */
  reading: (x: string) => string
  note: string
  /** "Son of", "little": only for nouns that can sensibly have one. See Root.kin. */
  kinship?: boolean
  attach: (base: Root) => Built | null
}

interface Former {
  /**
   * Which element is the head. Greek, Germanic and Elvish put the describing element
   * first (night-wolf); the Semitic languages, Egyptian and Sumerian put the head first
   * (king of the land).
   */
  headFirst: boolean
  /** Where an adjective may stand, if it may stand in a compound at all. */
  adjective: 'first' | 'second' | 'none'
  /**
   * Whether two adjectives can be joined into one that means both. Greek does it
   * (glyký-pikros, "sweet-bitter"), Latin does (dulc-amārus) and so does Sanskrit; it is
   * not claimed for the others.
   */
  pairs?: boolean
  compound?: (first: Root, second: Root) => Built | null
  affixes?: Affix[]
}

const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/** The first clause of a gloss — "night, darkness" is "night". */
const core = (gloss: string) => gloss.split(/[,;(]/)[0].trim().replace(/^to /, '')

/**
 * The part of a root's gloss that the search actually asked for.
 *
 * A root glossed "channel for liquids, river" that was found under "river" is in the name
 * as a river. Reading it by its first clause would be true to the dictionary and false to
 * the name.
 */
function said(root: Root, meaning?: string): string {
  if (meaning) {
    const hit = root.gloss.split(/[,;]/).map((part) => part.trim()).find((part) =>
      part.toLowerCase().split(/[^a-z]+/).some((word) => word === meaning || (meaning.length > 4 && word.startsWith(meaning.slice(0, -1)))))
    if (hit) return hit.replace(/^to /, '')
  }
  return core(root.gloss)
}

const last = (text: string) => text[text.length - 1] ?? ''
const isIn = (set: string) => (letter: string | undefined) => Boolean(letter) && set.includes(letter!)
const vowel = isIn('aeiou')
const vowelY = isIn('aeiouy')

const stemOf = (root: Root) => root.comb ?? root.word ?? ''
const wordOf = (root: Root) => root.word ?? ''

const stemPiece = (root: Root, text: string, shape = 'combining stem'): Piece =>
  ({ text, kind: 'root', label: 'stem', root, shape })
const wordPiece = (root: Root, text: string, shape = 'whole word'): Piece =>
  ({ text, kind: 'root', label: 'word', root, shape })
const linkPiece = (text: string, label = 'linking vowel'): Piece => ({ text, kind: 'link', label })

// ── the Indo-European pattern: stem + linking vowel + word ─────────────────────────────

interface Thematic {
  language: string
  link: string
  /** A real compound made this way, and one where the link is dropped before a vowel. */
  example: string
  elided?: string
  isVowel: (letter: string | undefined) => boolean
  /** Greek loses the h of a second element: phil- + híppos is Phílippos. */
  dropAspirate?: boolean
  /** Celtic u- and i-stems already end in their own vowel and take no other. */
  bareAfterVowel?: boolean
  final?: (root: Root) => string
}

function thematic(rule: Thematic) {
  return (first: Root, second: Root): Built | null => {
    const stem = stemOf(first)
    let word = (rule.final ?? wordOf)(second)
    if (!stem || !word) return null

    let aspirate = false
    if (rule.dropAspirate && word[0] === 'h' && rule.isVowel(word[1])) {
      word = word.slice(1)
      aspirate = true
    }

    const open = rule.isVowel(word[0])
    const bare = open || (rule.bareAfterVowel && rule.isVowel(last(stem)))
    const link = bare ? '' : rule.link
    const pieces = [
      stemPiece(first, stem),
      ...(link ? [linkPiece(link)] : []),
      wordPiece(second, word, aspirate ? 'whole word, its h lost in the join' : 'whole word'),
    ]
    const note = link
      ? `${rule.language} joins the two on a linking -${rule.link}-, as in ${rule.example}.`
      : open
        ? `${rule.language} drops its linking -${rule.link}- in front of a vowel${rule.elided ? `, as in ${rule.elided}` : ''}.`
        : `${rule.language} keeps the first stem's own vowel and adds no other, as in ${rule.example}.`
    return { pieces, note }
  }
}

/** A suffix on the combining stem, dropping the stem's vowel if two would meet. */
function suffix(
  text: string,
  means: string,
  reading: (x: string) => string,
  note: string,
  allow: (base: Root) => boolean = () => true,
  on: 'n' | 'a' = 'n',
): Affix {
  return {
    text,
    side: 'suffix',
    means,
    reading,
    note,
    attach: (base) => {
      let stem = stemOf(base)
      if (!stem || base.pos !== on || !allow(base)) return null
      if (vowelY(last(stem)) && vowelY(text[0])) stem = stem.slice(0, -1)
      if (stem.length < 2) return null
      return {
        pieces: [stemPiece(base, stem), { text, kind: 'link', label: 'ending', gloss: means }],
        note,
      }
    },
  }
}

/** A name element set in front of the whole word: Bar-, Neb-, En-. */
function prefix(
  text: string,
  means: string,
  reading: (x: string) => string,
  note: string,
  shapeWord: (base: Root) => string | null = (base) => wordOf(base) || null,
): Affix {
  return {
    text,
    side: 'prefix',
    means,
    reading,
    note,
    attach: (base) => {
      const word = shapeWord(base)
      if (!word || base.pos !== 'n') return null
      return {
        pieces: [{ text, kind: 'link', label: 'name element', gloss: means }, wordPiece(base, word)],
        note,
      }
    },
  }
}

// ── Sanskrit: stem compounds, and the vowels that merge where they meet ────────────────

const VOICELESS = ['k', 'p', 't', 's', 'c']

function sanskrit(first: Root, second: Root): Built | null {
  let a = wordOf(first)
  const b = wordOf(second)
  if (!a || !b) return null

  // rājan compounds as rāja-, yogin as yogi-.
  if (a.endsWith('an') || a.endsWith('in')) a = a.slice(0, -1)

  const end = last(a)
  if (vowel(end) && vowel(b[0])) {
    const merged: Record<string, string> = {
      aa: 'a', ai: 'e', au: 'o', ae: 'ai', ao: 'au', ii: 'i', uu: 'u',
    }
    const result = merged[end + b[0]]
    if (!result) return null
    return {
      pieces: [
        stemPiece(first, a.slice(0, -1), 'stem, its last vowel merged'),
        linkPiece(result, 'merged vowel'),
        wordPiece(second, b.slice(1), 'stem, its first vowel merged'),
      ],
      note: `Sanskrit merges the vowels that meet between two stems — ${end} + ${b[0]} gives ${result}, as in sūrya + udaya → sūryodaya, "sunrise".`,
    }
  }
  if (a.endsWith('as')) {
    // manas is mano- in front of a voiced sound, as in mano-ratha.
    if (vowel(b[0])) return null
    if (!VOICELESS.includes(b[0])) {
      return {
        pieces: [stemPiece(first, `${a.slice(0, -2)}o`, 'stem, -as turned to -o'), wordPiece(second, b, 'stem')],
        note: 'A Sanskrit stem in -as becomes -o in front of a voiced sound, as in manas + ratha → manoratha, "heart\'s wish".',
      }
    }
  } else if (!vowel(end) && end !== 'n' && end !== 'm' && end !== 'r' && end !== 'l') {
    // Final stops and sibilants change by rules that are not modelled here.
    return null
  }
  return {
    pieces: [stemPiece(first, a, 'stem'), wordPiece(second, b, 'stem')],
    note: 'Sanskrit sets one stem in front of another to make a single word, as in rāja-putra, "king\'s son".',
  }
}

function pali(first: Root, second: Root): Built | null {
  const a = wordOf(first)
  const b = wordOf(second)
  // Where two vowels meet Pali usually drops one, and which one is not regular.
  if (!a || !b || !vowel(last(a)) || vowel(b[0])) return null
  return {
    pieces: [stemPiece(first, a, 'stem'), wordPiece(second, b, 'stem')],
    note: 'Pali sets one stem in front of another, as in dhamma-pada, "path of the teaching".',
  }
}

// ── Germanic: one word straight onto another ───────────────────────────────────────────

function germanic(language: string, example: string, final: (root: Root) => [string, string] = (r) => [wordOf(r), 'whole word']) {
  return (first: Root, second: Root): Built | null => {
    const stem = stemOf(first)
    const [word, shape] = final(second)
    if (!stem || !word) return null
    return {
      pieces: [stemPiece(first, stem, 'bare stem'), wordPiece(second, word, shape)],
      note: `${language} sets one word straight onto another, as in ${example}.`,
    }
  }
}

/** Úlfr is written Ulf in English, as Þórólfr is Thorolf: the nominative -r is left off. */
const norseFinal = (root: Root): [string, string] => {
  const word = wordOf(root)
  const stem = stemOf(root)
  return /[^aeiouy]r$/.test(word) && stem && stem !== word
    ? [stem, 'whole word, without its nominative -r']
    : [word, 'whole word']
}

// ── head-first languages: "X of Y" ─────────────────────────────────────────────────────

function hebrew(first: Root, second: Root): Built | null {
  const construct = stemOf(first)
  const word = wordOf(second)
  if (!construct || !word) return null
  return {
    pieces: [stemPiece(first, construct, 'construct state — "… of"'), wordPiece(second, word)],
    note: 'Hebrew puts the first noun in its construct state — the "X of" form — straight in front of the second, as in bêt-leḥem, "house of bread".',
  }
}

/** The genitive of an Akkadian noun, without mimation: šarru → šarri. */
const akkadianGenitive = (root: Root) => {
  const word = wordOf(root)
  return word.endsWith('u') ? `${word.slice(0, -1)}i` : null
}

function akkadian(first: Root, second: Root): Built | null {
  if (second.pos === 'a') {
    const noun = wordOf(first)
    const adjective = wordOf(second)
    if (!noun || !adjective) return null
    return {
      pieces: [wordPiece(first, noun), wordPiece(second, adjective)],
      note: 'An Akkadian adjective follows its noun and agrees with it, as in šarru dannu, "strong king".',
    }
  }
  // Only a construct state the dictionary records is used; they are too irregular to derive.
  const construct = first.comb && first.comb !== first.word ? first.comb : null
  const genitive = akkadianGenitive(second)
  if (!construct || !genitive) return null
  return {
    pieces: [stemPiece(first, construct, 'construct state — "… of"'), wordPiece(second, genitive, 'genitive')],
    note: 'Akkadian puts the first noun in its construct state and the second in the genitive, as in šar māti, "king of the land".',
  }
}

function sumerian(first: Root, second: Root): Built | null {
  const a = wordOf(first)
  const b = wordOf(second)
  if (!a || !b) return null
  if (second.pos === 'a') {
    return {
      pieces: [wordPiece(first, a), wordPiece(second, b)],
      note: 'A Sumerian adjective follows its noun, as in lú-gal, "great man" — which is how the word for king is written.',
    }
  }
  return {
    pieces: [wordPiece(first, a), wordPiece(second, b), ...(vowel(last(b)) ? [] : [linkPiece('a', 'genitive -a(k)')])],
    note: 'Sumerian names the owner second and marks it with -a(k), as in lugal kalam-ma, "king of the land".',
  }
}

function egyptian(first: Root, second: Root): Built | null {
  const a = wordOf(first)
  const b = wordOf(second)
  if (!a || !b) return null
  return {
    pieces: [wordPiece(first, a), wordPiece(second, b)],
    note: second.pos === 'a'
      ? 'An Egyptian adjective follows its noun. The vowels are the Egyptologists\' convention; the script wrote none.'
      : 'Egyptian sets one noun directly after another to mean "X of Y", as in nb tꜣwy, "lord of the Two Lands". The vowels are the Egyptologists\' convention; the script wrote none.',
  }
}

function geez(first: Root, second: Root): Built | null {
  const a = wordOf(first)
  const b = wordOf(second)
  if (!a || !b) return null
  return {
    pieces: [wordPiece(first, a), ...(vowel(last(a)) ? [] : [linkPiece('a', 'construct -a')]), wordPiece(second, b)],
    note: 'Ge\'ez marks the first noun with -a to mean "X of", as in nəguśa nagaśt, "king of kings".',
  }
}

// ── Tolkien's languages ────────────────────────────────────────────────────────────────

/**
 * What Quenya allows between two vowels. Tolkien was strict about this — the language
 * has no "kt", no "sr", no "ln" — and a compound that produces one is not Quenya.
 * "qu" is written Q here so that it reads as the single consonant it is.
 */
const QUENYA_MEDIAL = new Set(`ht hty lk ld lm lp lQ lt lv lw ly mb mm mn mp my nk nd ng ngw nn nQ nt
  nty nw ny ps pt rk rd rm rn rQ rr rt rs rw ry sk st sw ts tt tw ty ll ss x ks hy kw hw ndy lty rty
  sty th`.split(/\s+/))

function quenyaLegal(name: string): boolean {
  const text = name.replace(/qu/g, 'Q')
  if (!/[aeiou]$|[lnrst]$/.test(text) || /[^aeiou]{2}$/.test(text.replace(/nt$/, 'n'))) return false
  for (const match of text.matchAll(/(?<=[aeiou])([^aeiou]+)(?=[aeiou])/g)) {
    if (match[1].length > 1 && !QUENYA_MEDIAL.has(match[1])) return false
  }
  return true
}

/** Consonants that assimilate where two Quenya words meet. */
const QUENYA_MEETS: Record<string, string> = { nl: 'll', nr: 'rr', ns: 'ss', nm: 'mm', np: 'mp', rl: 'll', lr: 'll', ln: 'ld' }

function quenyaJoin(a: string, b: string): { a: string; b: string; change?: string } | null {
  if (vowel(last(a)) && vowel(b[0])) return { a: a.slice(0, -1), b }
  if (!vowel(last(a)) && !vowel(b[0])) {
    const seam = last(a) + b[0]
    const meets = QUENYA_MEETS[seam]
    if (meets) return { a: a.slice(0, -1) + meets[0], b: meets[1] + b.slice(1), change: `${seam[0]} + ${seam[1]} → ${meets}` }
  }
  return { a, b }
}

function quenya(first: Root, second: Root): Built | null {
  const stem = stemOf(first)
  const word = wordOf(second)
  if (!stem || !word) return null
  const joined = quenyaJoin(stem, word)
  if (!joined || !quenyaLegal(joined.a + joined.b)) return null
  return {
    pieces: [stemPiece(first, joined.a, 'stem'), wordPiece(second, joined.b)],
    note: joined.change
      ? `Quenya assimilates the consonants where two words meet — ${joined.change}, as in elen + sar → Elessar, "Elfstone".`
      : 'Quenya joins two words into one with the describing word first, as in Elda-mar, "Elvenhome".',
  }
}

/** A Quenya name ending, attached the way Tolkien attached it. */
function quenyaEnding(text: string, afterConsonant: string, means: string, reading: (x: string) => string, example: string): Affix {
  const note = `Quenya names end in -${text} for "${means}", as in ${example}.`
  return {
    text,
    side: 'suffix',
    means,
    reading,
    note,
    attach: (base) => {
      const stem = stemOf(base)
      if (!stem || base.pos !== 'n') return null
      let head = stem
      let tail = text
      if (vowel(text[0])) {
        // Tindómë + -iel is Tindómiel: the final vowel gives way.
        if (vowel(last(head))) head = head.slice(0, -1)
      } else if (!vowel(last(head))) {
        // Elen + -ndil is Elendil, anar + -ndil is Anardil: the n of the ending is lost.
        tail = afterConsonant
        const joined = quenyaJoin(head, tail)
        if (!joined) return null
        head = joined.a
        tail = joined.b
      }
      if (head.length < 2 || !quenyaLegal(head + tail)) return null
      return { pieces: [stemPiece(base, head, 'stem'), { text: tail, kind: 'link', label: 'name ending', gloss: means }], note }
    },
  }
}

const SINDARIN_UNITS = ['th', 'dh', 'kh', 'ph', 'rh', 'lh', 'hw', 'ng', 'gw']

function sindarinUnits(word: string): string[] {
  const out: string[] = []
  for (let i = 0; i < word.length; i += 1) {
    const pair = word.slice(i, i + 2)
    if (SINDARIN_UNITS.includes(pair)) {
      out.push(pair)
      i += 1
    } else {
      out.push(word[i])
    }
  }
  return out
}

/**
 * Soft mutation of the consonant that opens the second element of a Sindarin compound.
 *
 * The voiceless stops always soften (mor + coth → Morgoth, celebrin + paur →
 * Celebrimbor) and gw- loses its g (ar + gwen → Arwen). The voiced stops soften after a
 * vowel (fanui + dol → Fanuidhol) and stand after a consonant (mor + dôr → Mordor, and +
 * duin → Anduin). S becomes h (calen + sad → Calenhad).
 */
function soften(word: string, afterVowel: boolean): [string, string | null] {
  const units = sindarinUnits(word)
  const head = units[0]
  const rest = units.slice(1).join('')
  const change = (to: string): [string, string] => [to + rest, `${head} → ${to || 'nothing'}`]
  if (head === 'gw') return change('w')
  if (head === 'p') return change('b')
  if (head === 't') return change('d')
  if (head === 'k') return change('g')
  if (head === 's') return change('h')
  if (afterVowel) {
    if (head === 'b') return change('v')
    if (head === 'd') return change('dh')
    if (head === 'm') return change('v')
    if (head === 'g' && vowelY(units[1]?.[0])) return change('')
  }
  return [word, null]
}

/** Join two Sindarin pieces: thin a cluster, merge a doubled consonant, turn n + b into mb. */
function sindarinSeam(a: string, b: string): string | null {
  let left = sindarinUnits(a)
  const right = sindarinUnits(b)
  if (!left.length || !right.length) return null
  const consonant = (unit: string | undefined) => Boolean(unit) && !vowelY(unit![0])
  // morn + dor is Mordor, gond + dor is Gondor, ost + giliath is Osgiliath.
  if (consonant(right[0]) && consonant(left[left.length - 1]) && consonant(left[left.length - 2])) {
    left = left.slice(0, -1)
  }
  if (left[left.length - 1] === right[0]) left = left.slice(0, -1)
  if (left[left.length - 1] === 'n' && right[0] === 'b') left[left.length - 1] = 'm'
  // Three consonants in a row at the seam is more than the language carries.
  if (consonant(left[left.length - 1]) && consonant(left[left.length - 2]) && consonant(right[0])) return null
  if (consonant(left[left.length - 1]) && consonant(right[0]) && consonant(right[1])) return null
  return left.join('')
}

function sindarin(first: Root, second: Root): Built | null {
  const stem = stemOf(first)
  const word = wordOf(second)
  if (!stem || !word) return null
  const [soft, change] = soften(word, vowelY(last(stem)))
  const head = sindarinSeam(stem, soft)
  if (!head || !soft) return null
  return {
    pieces: [stemPiece(first, head, head === stem ? 'whole word' : 'word, its last consonant thinned'), wordPiece(second, soft, change ? `softened: ${change}` : 'whole word')],
    note: change
      ? `Sindarin softens the consonant that opens the second word — ${change} — as in mor + coth → Morgoth, "black foe".`
      : 'Sindarin joins two words into one with the describing word first, as in Mor-dor, "black land".',
  }
}

function sindarinEnding(text: string, means: string, reading: (x: string) => string, example: string): Affix {
  const note = `Sindarin names end in -${text} for "${means}", as in ${example}.`
  return {
    text,
    side: 'suffix',
    means,
    reading,
    note,
    attach: (base) => {
      let stem = stemOf(base)
      if (!stem || base.pos !== 'n') return null
      if (vowelY(text[0]) && vowelY(last(stem))) stem = stem.slice(0, -1)
      const head = vowelY(text[0]) ? stem : sindarinSeam(stem, text)
      if (!head || head.length < 2) return null
      return { pieces: [stemPiece(base, head, 'stem'), { text, kind: 'link', label: 'name ending', gloss: means }], note }
    },
  }
}

function juxtaposed(language: string, example: string) {
  return (first: Root, second: Root): Built | null => {
    const a = wordOf(first)
    const b = wordOf(second)
    if (!a || !b) return null
    return {
      pieces: [wordPiece(first, a), wordPiece(second, b)],
      note: `${language} sets the describing word in front of the other, as in ${example}.`,
    }
  }
}

// ── the readings ───────────────────────────────────────────────────────────────────────

const ofThe = (what: string) => (x: string) => `${what} of the ${x}`

/** Marks a name element as one of kinship or smallness, which not every noun can take. */
const kin = (affix: Affix): Affix => ({ ...affix, kinship: true })

/** "Hipp-eús" is a horseman and "bōc-ere" a scribe: the one whose business the thing is. */
const worker = ofThe('Keeper')
const bornOf = ofThe('Born')
const richIn = (x: string) => `Rich in ${x}`

/** For an ending that only a stem closing on a consonant takes cleanly: aqu-ōsus, not glōri-ōsus. */
const consonantStem = (base: Root) => !vowelY(last(stemOf(base)))

/**
 * An ending on the whole word as it is cited, for the languages that add to the stem
 * and change nothing: Sanskrit bhaga + -vat. `fits` says which words may take it.
 */
function wordEnding(
  text: string,
  means: string,
  reading: (x: string) => string,
  note: string,
  fits: (word: string) => boolean,
): Affix {
  return {
    text,
    side: 'suffix',
    means,
    reading,
    note,
    attach: (base) => {
      const word = wordOf(base)
      if (!word || base.pos !== 'n' || !fits(word)) return null
      return { pieces: [stemPiece(base, word, 'stem'), { text, kind: 'link', label: 'ending', gloss: means }], note }
    },
  }
}

/** An ending that turns an adjective into the name of the quality: new → newness. */
const quality = (text: string, note: string) =>
  suffix(text, 'the quality of being', (x) => `Being ${x}`, note, () => true, 'a')

// ── the languages ──────────────────────────────────────────────────────────────────────

const FORMERS: Record<string, Former> = {
  greek: {
    headFirst: false,
    adjective: 'first',
    compound: thematic({
      language: 'Ancient Greek', link: 'o', isVowel: vowelY, dropAspirate: true,
      example: 'phil-ó-sophos, "lover of wisdom"', elided: 'phil-ánthrōpos, "lover of mankind"',
    }),
    affixes: [
      kin(suffix('ides', 'son of', ofThe('Son'), 'Greek names a son after his father with -ídēs, as in Atre-ídēs, "son of Atreus".')),
      kin(suffix('ion', 'little', (x) => `Little ${x}`, 'Greek makes a diminutive with -ion, as in paid-íon, "little child".')),
      suffix('ios', 'of, belonging to', (x) => `Of the ${x}`, 'Greek makes "belonging to" with -ios, as in ourán-ios, "of the sky".'),
      quality('otes', 'Greek names a quality with -ótēs, as in kain-ótēs, "newness".'),
      suffix('ikos', 'of, in the manner of', (x) => `Of the ${x}`, 'Greek makes "of, in the manner of" with -ikós, as in basil-ikós, "kingly".'),
      suffix('eus', 'one whose work is', worker, 'Greek names a person by what he works with using -eús, as in hipp-eús, "horseman", and keram-eús, "potter".'),
      suffix('on', 'place of', ofThe('Place'), 'Greek names the place where something is kept with -ṓn, as in hipp-ṓn, "stable", and ampel-ṓn, "vineyard".'),
      kin(suffix('iskos', 'little', (x) => `Little ${x}`, 'Greek makes a diminutive with -ískos, as in aster-ískos, "little star".')),
      suffix('ogenes', 'born of', bornOf, 'Greek names end in -genḗs, "born of", on the linking -o-, as in Herm-o-génēs, "born of Hermes".', consonantStem),
    ],
    pairs: true,
  },
  latin: {
    headFirst: false,
    adjective: 'first',
    compound: thematic({
      language: 'Latin', link: 'i', isVowel: vowelY,
      example: 'agr-i-cola, "field-tiller"', elided: 'magn-animus, "great-souled"',
    }),
    affixes: [
      suffix('alis', 'belonging to', (x) => `Of the ${x}`, 'Latin makes "belonging to" with -ālis, as in rēg-ālis, "of a king".'),
      suffix('inus', 'of, like', (x) => `Of the ${x}`, 'Latin makes "of the nature of" with -īnus, as in mar-īnus, "of the sea".'),
      suffix('ius', 'of the house of', (x) => `Of the ${x}`, 'Latin family names end in -ius, as in Iūl-ius.'),
      kin(suffix('ulus', 'little', (x) => `Little ${x}`, 'Latin makes a diminutive with -ulus, as in rēg-ulus, "little king".',
        (base) => /us$/.test(wordOf(base)) && !/[aeiou]$/.test(stemOf(base)))),
      kin(suffix('ula', 'little', (x) => `Little ${x}`, 'Latin makes a diminutive with -ula, as in stēll-ula, "little star".',
        (base) => /[^aeiou]a$/.test(wordOf(base)))),
      quality('itas', 'Latin names a quality with -itās, as in nov-itās, "newness".'),
      suffix('anus', 'belonging to', (x) => `Of the ${x}`, 'Latin makes "belonging to" with -ānus, as in mont-ānus, "of the mountain".', consonantStem),
      suffix('osus', 'full of', (x) => `Full of ${x}`, 'Latin makes "full of" with -ōsus, as in fām-ōsus, "full of fame".', consonantStem),
      suffix('arius', 'one whose work is', worker, 'Latin names a person by what he works with using -ārius, as in argent-ārius, "silver-worker", and libr-ārius, "scribe".', consonantStem),
    ],
    pairs: true,
  },
  sanskrit: {
    headFirst: false,
    adjective: 'first',
    compound: sanskrit,
    affixes: [
      {
        text: 'maya', side: 'suffix', means: 'made of', reading: (x) => `Made of ${x}`,
        note: 'Sanskrit makes "made of" with -maya, as in suvarṇa-maya, "golden".',
        attach: (base) => {
          const word = wordOf(base)
          if (!word || base.pos !== 'n' || !/[aiu]$/.test(word)) return null
          return {
            pieces: [stemPiece(base, word, 'stem'), { text: 'maya', kind: 'link', label: 'ending', gloss: 'made of' }],
            note: 'Sanskrit makes "made of" with -maya, as in suvarṇa-maya, "golden".',
          }
        },
      },
      {
        text: 'ta', side: 'suffix', means: 'the quality of being', reading: (x) => `Being ${x}`,
        note: 'Sanskrit names a quality with -tā, as in śukla-tā, "whiteness".',
        attach: (base) => {
          const word = wordOf(base)
          if (!word || base.pos !== 'a' || !/a$/.test(word)) return null
          return {
            pieces: [stemPiece(base, word, 'stem'), { text: 'ta', kind: 'link', label: 'ending', gloss: 'the quality of being' }],
            note: 'Sanskrit names a quality with -tā, as in śukla-tā, "whiteness".',
          }
        },
      },
      wordEnding('vat', 'possessing', richIn, 'Sanskrit makes "possessing" with -vat, as in bhaga-vat, "possessing fortune".', (word) => /a$/.test(word)),
      wordEnding('mat', 'possessing', richIn, 'Sanskrit makes "possessing" with -mat after i and u, as in dhī-mat, "possessing thought", wise.', (word) => /[iu]$/.test(word)),
      wordEnding('ja', 'born of', bornOf, 'Sanskrit makes "born of" with -ja, as in jala-ja, "born of the water", the lotus.', (word) => /[aiu]$/.test(word)),
      kin(wordEnding('ka', 'little', (x) => `Little ${x}`, 'Sanskrit makes a diminutive with -ka, as in putra-ka, "little son".', (word) => /a$/.test(word))),
    ],
    pairs: true,
  },
  pali: {
    headFirst: false,
    adjective: 'first',
    compound: pali,
    affixes: [
      wordEnding('vant', 'possessing', richIn, 'Pali makes "possessing" with -vant, as in sīla-vant, "possessing virtue".', (word) => /a$/.test(word)),
      wordEnding('ja', 'born of', bornOf, 'Pali makes "born of" with -ja, as in paṅka-ja, "born of the mud", the lotus.', (word) => /[aiu]$/.test(word)),
    ],
  },
  oldpersian: {
    headFirst: false,
    adjective: 'first',
    compound: thematic({
      language: 'Old Persian', link: 'a', isVowel: vowel, bareAfterVowel: true,
      example: 'Arta-xšaça, "whose rule is truth"',
    }),
  },
  oldenglish: {
    headFirst: false,
    adjective: 'first',
    compound: germanic('Old English', 'Wulf-stān, "wolf-stone"'),
    affixes: [
      kin(suffix('ing', 'descendant of', ofThe('Descendant'), 'Old English names a descendant with -ing, as in æþel-ing, "one of noble kin".')),
      quality('nes', 'Old English names a quality with -nes, as in clǣn-nes, "cleanness".'),
      suffix('ere', 'one whose work is', worker, 'Old English names a person by what he works with using -ere, as in bōc-ere, "scribe", from bōc, "book".'),
      suffix('dom', 'the realm or state of', ofThe('Realm'), 'Old English names a realm or a state with -dōm, as in cyning-dōm, "kingdom".'),
      suffix('ling', 'one belonging to', ofThe('One'), 'Old English names one who belongs to something with -ling, as in hȳr-ling, "hireling".'),
    ],
  },
  oldnorse: {
    headFirst: false,
    adjective: 'first',
    compound: germanic('Old Norse', 'Ás-garðr, "enclosure of the gods"', norseFinal),
    affixes: [
      kin(suffix('ing', 'descendant of', ofThe('Descendant'), 'Old Norse names a descendant with -ingr, as in Ylf-ingr, "one of the wolf\'s kin"; the nominative -r is left off, as it usually is in English.')),
      quality('leik', 'Old Norse names a quality with -leikr, as in skjót-leikr, "swiftness"; the nominative -r is left off.'),
      kin(suffix('ung', 'descendant of', ofThe('Descendant'), 'Old Norse names a line with -ungr, as in Vǫls-ungr, "one of Vǫlsi\'s line"; the nominative -r is left off.')),
      suffix('ari', 'one whose work is', worker, 'Old Norse names a person by what he works with using -ari, as in dóm-ari, "judge", from dómr, "judgment".'),
      suffix('dom', 'the realm or state of', ofThe('Realm'), 'Old Norse names a realm or a state with -dómr, as in konung-dómr, "kingdom"; the nominative -r is left off.'),
    ],
  },
  gothic: {
    headFirst: false,
    adjective: 'first',
    compound: thematic({
      language: 'Gothic', link: 'a', isVowel: vowel,
      example: 'figgr-a-gulþ, "finger-gold" (a ring)', elided: 'all-andjo, "wholly"',
    }),
    affixes: [
      kin(suffix('ila', 'little', (x) => `Little ${x}`, 'Gothic makes a diminutive with -ila, as in Wulf-ila, "little wolf".')),
      quality('itha', 'Gothic names a quality with -iþa, as in hauh-iþa, "height".'),
      suffix('areis', 'one whose work is', worker, 'Gothic names a person by what he works with using -areis, as in bōk-areis, "scribe", from bōka, "letter, book".'),
      suffix('eins', 'made of', (x) => `Made of ${x}`, 'Gothic makes "made of" with -eins, as in stain-eins, "of stone".'),
    ],
  },
  pgmc: {
    headFirst: false,
    adjective: 'first',
    compound: thematic({
      language: 'Proto-Germanic, as reconstructed,', link: 'a', isVowel: vowel,
      example: '*Aþal-a-wulfaz, the form behind Old English Æþelwulf',
    }),
    affixes: [
      kin(suffix('ingaz', 'descendant of', ofThe('Descendant'), 'Proto-Germanic names one who belongs to a line with *-ingaz, as in *kun-ingaz, "man of the kin", the word behind "king".')),
    ],
  },
  pcelt: {
    headFirst: false,
    adjective: 'first',
    compound: thematic({
      language: 'Proto-Celtic, as reconstructed,', link: 'o', isVowel: vowel, bareAfterVowel: true,
      example: 'Gaulish Dumn-o-rīx, "world-king"',
    }),
    affixes: [
      suffix('akos', 'belonging to', (x) => `Of the ${x}`, 'Celtic makes "belonging to" with *-ākos, as in the Gaulish place name Ebur-ācum, "the place of the yews".'),
      suffix('ogenos', 'born of', bornOf, 'Celtic names end in *-genos, "born of", on the linking -o-, as in Gaulish Camul-o-genus, "born of Camulos".', consonantStem),
    ],
  },
  hebrew: {
    headFirst: true,
    adjective: 'none',
    compound: hebrew,
    affixes: [
      kin(prefix('ben', 'son of', ofThe('Son'), 'Hebrew names open with Ben-, "son of", as in Ben-ʾônî, "son of my sorrow".')),
      kin(prefix('bat', 'daughter of', ofThe('Daughter'), 'Hebrew names open with Bat-, "daughter of", as in Bat-ševaʿ, "daughter of the oath".')),
      prefix('bet', 'house of', ofThe('House'), 'Hebrew place names open with Bêt-, "house of", as in Bêt-ʾēl, "house of God".'),
      prefix('ish', 'man of', ofThe('Man'), 'Hebrew names open with ʾÎš-, "man of", as in ʾÎš-bōšet, "man of shame".'),
      kin(prefix('abi', 'father of', ofThe('Father'), 'Hebrew names open with ʾĂbî-, "father of", as in ʾĂbî-šālôm, "father of peace".')),
      prefix('baal', 'master of', ofThe('Master'), 'Hebrew calls the master of a thing its baʿal, as in baʿal ha-ḥălōmôt, "master of dreams".'),
      prefix('en', 'spring of', ofThe('Spring'), 'Hebrew place names open with ʿÊn-, "spring of", as in ʿÊn-gedî, "spring of the kid".'),
      prefix('har', 'mount of', ofThe('Mount'), 'Hebrew names a mountain with Har-, "mount of", as in Har-Məgiddô, "mount of Megiddo".'),
      prefix('migdal', 'tower of', ofThe('Tower'), 'Hebrew place names open with Migdal-, "tower of", as in Migdal-ʿēder, "tower of the flock".'),
      prefix('kiryat', 'town of', ofThe('Town'), 'Hebrew place names open with Qiryat-, "town of", as in Qiryat-yəʿārîm, "town of the forests".'),
    ],
  },
  aramaic: {
    headFirst: true,
    adjective: 'none',
    affixes: [
      kin(prefix('bar', 'son of', ofThe('Son'), 'Aramaic names open with Bar-, "son of", as in Bar-Kokhba, "son of the star".')),
      prefix('bet', 'house of', ofThe('House'), 'Aramaic place names open with Bêt-, "house of", as in Bêt-ḥesdā, "house of mercy".'),
      prefix('abd', 'servant of', ofThe('Servant'), 'Aramaic names open with ʿAbd-, "servant of", as in ʿAbd-īšōʿ, "servant of Jesus".'),
    ],
  },
  akkadian: {
    headFirst: true,
    adjective: 'second',
    compound: akkadian,
    affixes: [
      prefix('bel', 'lord of', ofThe('Lord'), 'Akkadian titles open with bēl, "lord of", followed by the genitive, as in bēl māti, "lord of the land".', akkadianGenitive),
      kin(prefix('mar', 'son of', ofThe('Son'), 'Akkadian names open with mār, "son of", followed by the genitive.', akkadianGenitive)),
      prefix('awil', 'man of', ofThe('Man'), 'Akkadian names open with awīl, "man of", followed by the genitive, as in Awīl-Marduk, "man of Marduk".', akkadianGenitive),
      prefix('warad', 'servant of', ofThe('Servant'), 'Akkadian names open with warad, "servant of", followed by the genitive, as in Warad-Sîn, "servant of Sîn".', akkadianGenitive),
      prefix('belet', 'lady of', ofThe('Lady'), 'Akkadian titles open with bēlet, "lady of", followed by the genitive, as in bēlet ilī, "lady of the gods".', akkadianGenitive),
    ],
  },
  sumerian: {
    headFirst: true,
    adjective: 'second',
    compound: sumerian,
    affixes: [
      prefix('en', 'lord of', ofThe('Lord'), 'Sumerian names open with En-, "lord", as in En-líl.'),
      prefix('nin', 'lady of', ofThe('Lady'), 'Sumerian names open with Nin-, "lady", as in Nin-ḫursaĝ, "lady of the mountain".'),
      prefix('lu', 'man of', ofThe('Man'), 'Sumerian names open with Lú-, "man of", as in Lú-Nanna.'),
      prefix('ur', 'servant of', ofThe('Servant'), 'Sumerian names open with Ur-, "man, servant of", as in Ur-Namma, "servant of Namma".'),
      prefix('e', 'house of', ofThe('House'), 'Sumerian temple names open with É-, "house", as in É-kur, "mountain house", and É-anna, "house of heaven".'),
    ],
  },
  egyptian: {
    headFirst: true,
    adjective: 'second',
    compound: egyptian,
    affixes: [
      prefix('neb', 'lord of', ofThe('Lord'), 'Egyptian titles open with nb, "lord of", as in nb tꜣwy, "lord of the Two Lands".'),
      prefix('meri', 'beloved of', ofThe('Beloved'), 'Egyptian names open with mry, "beloved of", as in Mery-Amun.'),
      kin(prefix('sa', 'son of', ofThe('Son'), 'Egyptian names open with sꜣ, "son of", as in sꜣ Rꜥ, "son of Ra".')),
      kin(prefix('sat', 'daughter of', ofThe('Daughter'), 'Egyptian names open with sꜣt, "daughter of", as in Sat-Hathor, "daughter of Hathor".')),
      prefix('per', 'house of', ofThe('House'), 'Egyptian place names open with pr, "house of", as in Per-Bast, "house of Bastet".'),
      prefix('hem', 'servant of', ofThe('Servant'), 'Egyptian titles open with ḥm, "servant of", as in ḥm-nṯr, "servant of the god", a priest.'),
      prefix('hut', 'mansion of', ofThe('Mansion'), 'Egyptian names a temple or an estate with ḥwt, "mansion of", as in Ḥwt-Ḥr, "mansion of Horus", the name Hathor.'),
    ],
  },
  geez: {
    headFirst: true,
    adjective: 'none',
    compound: geez,
    affixes: [
      prefix('gabra', 'servant of', ofThe('Servant'), 'Ge\'ez names open with Gabra-, "servant of", as in Gabra Masqal, "servant of the Cross".'),
      kin(prefix('walda', 'son of', ofThe('Son'), 'Ge\'ez names open with Walda-, "son of".')),
      kin(prefix('walatta', 'daughter of', ofThe('Daughter'), 'Ge\'ez names open with Walatta-, "daughter of", as in Walatta Petros, "daughter of Peter".')),
      prefix('hayla', 'power of', ofThe('Power'), 'Ge\'ez names open with Ḫayla-, "power of", as in Ḫayla Śəllase, "power of the Trinity".'),
      prefix('zara', 'seed of', ofThe('Seed'), 'Ge\'ez names open with Zarʾa-, "seed of", as in Zarʾa Yāʿqob, "seed of Jacob".'),
      prefix('amda', 'pillar of', ofThe('Pillar'), 'Ge\'ez names open with ʿAmda-, "pillar of", as in ʿAmda Ṣəyon, "pillar of Zion".'),
      prefix('takla', 'plant of', ofThe('Plant'), 'Ge\'ez names open with Takla-, "plant of", as in Takla Hāymānot, "plant of faith".'),
    ],
  },
  quenya: {
    headFirst: false,
    adjective: 'first',
    compound: quenya,
    affixes: [
      quenyaEnding('ndil', 'dil', 'friend of', (x) => `Friend of the ${x}`, 'Elen-dil, "star-lover"'),
      quenyaEnding('ndur', 'dur', 'servant of', (x) => `Servant of the ${x}`, 'Isil-dur, "servant of the moon"'),
      kin(quenyaEnding('ion', 'ion', 'son of', ofThe('Son'), 'Anár-ion, "son of the sun"')),
      kin(quenyaEnding('iel', 'iel', 'daughter of', ofThe('Daughter'), 'Tindóm-iel, "daughter of twilight"')),
      quenyaEnding('nor', 'nor', 'land of', ofThe('Land'), 'Vali-nor, "land of the Valar"'),
      quenyaEnding('mar', 'mar', 'home of', ofThe('Home'), 'Elda-mar, "home of the Elves"'),
    ],
  },
  sindarin: {
    headFirst: false,
    adjective: 'first',
    compound: sindarin,
    affixes: [
      kin(sindarinEnding('ion', 'son of', ofThe('Son'), 'Erein-ion, "scion of kings"')),
      kin(sindarinEnding('iel', 'daughter of', ofThe('Daughter'), 'Tinúv-iel, "daughter of twilight"')),
      sindarinEnding('wen', 'maiden', (x) => `Maiden of the ${x}`, 'Mor-wen, "dark maiden"'),
      sindarinEnding('dor', 'land of', ofThe('Land'), 'Gon-dor, "land of stone"'),
    ],
  },
  khuzdul: { headFirst: false, adjective: 'first', compound: juxtaposed('Khuzdul', 'Kheled-zâram, "glass-lake"') },
  adunaic: { headFirst: false, adjective: 'first', compound: juxtaposed('Adûnaic', 'Adûn-akhôr, "lord of the west"') },
  blackspeech: { headFirst: false, adjective: 'first', compound: juxtaposed('The Black Speech', 'Nazg-ûl, "ring-wraith"') },
}

/** The languages a name can be formed in. The rest are in the database and blend only. */
export const FORMING = new Set(Object.keys(FORMERS))

/**
 * Languages whose second dictionary is complete enough that a word missing from it is a
 * warning in itself. A Sanskrit entry Monier-Williams does not have is, as often as not,
 * a modern coinage — Wiktionary has Sanskrit for "blog" and "nail polish". For these a
 * root must be verified to be built on. For the rest (Gothic and Akkadian, checked against
 * a glossary; Ge'ez and Old Persian, against nothing) a root that merely stands on one
 * source is the best there is, and is allowed.
 */
const STRICT = new Set(['greek', 'latin', 'sanskrit', 'pali', 'oldenglish', 'oldnorse', 'hebrew',
  'sumerian', 'egyptian', 'pie', 'pgmc', 'pcelt'])

/** Checked far enough to put in a name. */
export const sound = (root: Root) =>
  root.status === 'verified' || (root.status === 'unconfirmed' && !STRICT.has(root.language))

/** A noun or an adjective that has been checked enough to build on. */
export const usable = (root: Root) =>
  Boolean(root.word) && (root.pos === 'n' || root.pos === 'a') && !root.gloss.startsWith('to ')
  && sound(root)

function finish(language: string, kind: Formed['kind'], built: Built, reading: string, roles: Map<Root, string>): Formed {
  const usages: RootUsage[] = []
  built.pieces.forEach((piece) => {
    if (!piece.root) return
    usages.push({
      root: piece.root,
      contribution: piece.text,
      surface: piece.text,
      position: usages.length === 0 ? 'head' : 'tail',
      role: roles.get(piece.root),
      shape: piece.shape,
    })
  })
  return {
    name: built.pieces.map((piece) => piece.text).join(''),
    language,
    kind,
    roots: usages,
    derivation: built.pieces.map((piece) => ({
      text: piece.text, kind: piece.kind, rootId: piece.root?.id, label: piece.label, gloss: piece.gloss,
    })),
    note: built.note,
    reading: cap(reading),
  }
}

/**
 * Every compound two roots of one language can make. Usually one or two: a pair of nouns
 * can stand in either order and mean different things, an adjective has one place to go.
 */
export function compounds(a: Root, b: Root, meanings: Map<Root, string> = new Map()): Formed[] {
  const former = FORMERS[a.language]
  if (!former?.compound || a.language !== b.language || !usable(a) || !usable(b)) return []
  const out: Formed[] = []

  const attempt = (first: Root, second: Root) => {
    // In surface order. Which of them is the head depends on the language.
    const head = former.headFirst ? first : second
    const other = former.headFirst ? second : first
    if (head.pos === 'a' && other.pos === 'a') {
      if (!former.pairs) return
      const built = former.compound!(first, second)
      if (!built) return
      const reading = `${said(first, meanings.get(first))} and ${said(second, meanings.get(second))}`
      const roles = new Map<Root, string>([[first, 'One of two qualities'], [second, 'The other quality']])
      out.push(finish(a.language, 'compound', built, reading, roles))
      return
    }
    if (head.pos !== 'n') return
    if (other.pos === 'a') {
      const place = former.headFirst ? 'second' : 'first'
      if (former.adjective !== place) return
    }
    const built = former.compound!(first, second)
    if (!built) return
    const h = said(head, meanings.get(head))
    const o = said(other, meanings.get(other))
    const reading = other.pos === 'a'
      ? `${o} ${h}`
      : former.headFirst
        ? `${h} of ${o}`
        : /\s/.test(h + o) ? `${h} of ${o}` : `${o}-${h}`
    const roles = new Map<Root, string>([
      [head, 'Head — what the name is'],
      [other, other.pos === 'a' ? 'Describes the head' : former.headFirst ? 'Whose it is' : 'Qualifies the head'],
    ])
    out.push(finish(a.language, 'compound', built, reading, roles))
  }

  // The same word twice is not a compound, whatever its two entries are glossed as.
  if (a.stem === b.stem || a.word === b.word) return out
  attempt(a, b)
  attempt(b, a)
  return out
}

/** Every name one root can make with its language's own name endings and openings. */
export function derivations(root: Root, meaning?: string, kinship = true): Formed[] {
  const former = FORMERS[root.language]
  if (!former?.affixes || !usable(root)) return []
  const out: Formed[] = []
  for (const affix of former.affixes) {
    if (affix.kinship && (!root.kin || !kinship)) continue
    const built = affix.attach(root)
    if (!built) continue
    out.push(finish(root.language, 'derived', built, affix.reading(said(root, meaning)), new Map([[root, 'The whole meaning']])))
  }
  return out
}
