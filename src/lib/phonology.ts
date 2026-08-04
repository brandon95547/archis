/**
 * The sound rules.
 *
 * Everything here works on romanised letters, not IPA. That is a deliberate limit: the
 * output is a name an English reader has to look at and say, so the thing being judged is
 * the spelling in front of them. A phoneme-accurate model would be more correct and less
 * useful — it would happily approve a name nobody can read.
 *
 * Digraphs are treated as single consonants throughout (kh, th, sh, ph, ch, dh, zh, gh),
 * which is what stops "kheper" reading as a four-consonant pile-up.
 */

export const VOWELS = 'aeiouy'
const DIGRAPHS = ['kh', 'th', 'sh', 'ph', 'ch', 'dh', 'zh', 'gh', 'ts', 'qu']

export const isVowel = (letter: string) => VOWELS.includes(letter)

/** Split a word into letters, keeping digraphs whole. */
export function units(word: string): string[] {
  const out: string[] = []
  for (let i = 0; i < word.length; i += 1) {
    const pair = word.slice(i, i + 2)
    if (DIGRAPHS.includes(pair)) {
      out.push(pair)
      i += 1
    } else {
      out.push(word[i])
    }
  }
  return out
}

const isNucleus = (part: string) => part.length === 1 && isVowel(part)

/**
 * Onsets an English reader starts a syllable with without stumbling. Anything not here
 * gets broken up or repaired rather than shipped.
 */
const LEGAL_ONSETS = new Set([
  '', 'b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'q', 'r', 's', 't', 'v',
  'w', 'x', 'y', 'z', 'kh', 'th', 'sh', 'ph', 'ch', 'dh', 'zh', 'gh', 'qu', 'ts',
  'bl', 'br', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr', 'kl', 'kr', 'pl', 'pr', 'sl',
  'sm', 'sn', 'sp', 'st', 'sw', 'tr', 'tw', 'vr', 'thr', 'shr', 'str', 'spr',
  'khr', 'phr', 'chr', 'ps', 'sk', 'sc', 'sv', 'jn', 'sr',
])

/**
 * Clusters that are legal but tiring, with what to do about them. Repairs keep the letters
 * that carry the root's identity — "shm" becomes "sham", not "sam".
 */
const CLUSTER_REPAIRS: [RegExp, string][] = [
  [/([bcdfgkpt])([bcdfgkpt])([bcdfgkpt])/g, '$1a$2$3'], // three stops in a row
  [/([^aeiouy])\1/g, '$1'],                              // doubled consonant
  [/([mn])([mn])/g, '$1'],                               // nasal on nasal
  [/([sz])([sz])/g, '$1'],                               // sibilant on sibilant
  [/([lr])([lr])/g, '$1'],                               // liquid on liquid
  [/gn([bcdfgkpt])/g, 'gen$1'],
  [/([bcdfgkpt])h([bcdfgkpt])/g, '$1e$2'],
]

/** Consonant sequences that read as harsh however legal they are. Scored, not banned. */
const HARSH = ['kt', 'kd', 'gd', 'tk', 'pk', 'bk', 'zg', 'gz', 'xh', 'kts', 'pth', 'ksh', 'tsh']

export interface Syllable {
  onset: string
  nucleus: string
  coda: string
  text: string
}

/**
 * Split into syllables by the maximal-onset principle: whatever a syllable can legally
 * begin with, it does. Both sides of every boundary run the same test, so the pieces
 * always reassemble into the original word.
 */
export function syllabify(word: string): Syllable[] {
  const parts = units(word.toLowerCase())

  const groups: [number, number][] = []
  for (let i = 0; i < parts.length; i += 1) {
    if (!isNucleus(parts[i])) continue
    let end = i
    // Adjacent vowels are one beat, not two — "ae", "ei" and "ou" each ride one nucleus.
    while (end + 1 < parts.length && isNucleus(parts[end + 1])) end += 1
    groups.push([i, end])
    i = end
  }
  if (groups.length === 0) return [{ onset: word, nucleus: '', coda: '', text: word }]

  /** How many units at the END of a consonant run can start the next syllable. */
  const onsetTake = (run: string[]) => {
    for (let take = Math.min(run.length, 3); take >= 0; take -= 1) {
      if (LEGAL_ONSETS.has(run.slice(run.length - take).join(''))) return take
    }
    return 0
  }

  const syllables: Syllable[] = []
  for (let g = 0; g < groups.length; g += 1) {
    const [start, end] = groups[g]
    const prevEnd = g === 0 ? -1 : groups[g - 1][1]
    const nextStart = g === groups.length - 1 ? parts.length : groups[g + 1][0]

    const before = parts.slice(prevEnd + 1, start)
    const after = parts.slice(end + 1, nextStart)

    // The first syllable keeps everything in front of it; later ones take only what a
    // legal onset allows, and the rest stayed behind as the previous syllable's coda.
    const onset = g === 0 ? before.join('') : before.slice(before.length - onsetTake(before)).join('')
    const coda = g === groups.length - 1
      ? after.join('')
      : after.slice(0, after.length - onsetTake(after)).join('')

    const nucleus = parts.slice(start, end + 1).join('')
    syllables.push({ onset, nucleus, coda, text: onset + nucleus + coda })
  }
  return syllables
}

export const syllableCount = (word: string) => syllabify(word).length

/** Repair the clusters that make a blend unreadable. Runs to a fixed point. */
export function repairClusters(word: string): string {
  let out = word.toLowerCase()
  for (let pass = 0; pass < 3; pass += 1) {
    const before = out
    for (const [pattern, replacement] of CLUSTER_REPAIRS) out = out.replace(pattern, replacement)
    if (out === before) break
  }
  return out
}

/** 0 is smooth; higher is a name people will stumble over. */
export function harshness(word: string): number {
  const value = word.toLowerCase()
  let score = 0
  for (const cluster of HARSH) if (value.includes(cluster)) score += 2

  let run = 0
  for (const part of units(value)) {
    if (isNucleus(part)) {
      run = 0
    } else {
      run += 1
      if (run >= 3) score += 2
      else if (run === 2) score += 0.5
    }
  }
  return score
}

/** Share of units that are vowels — a crude but reliable measure of flow. */
export function vowelRatio(word: string): number {
  const parts = units(word.toLowerCase())
  if (parts.length === 0) return 0
  return parts.filter(isNucleus).length / parts.length
}

/**
 * How soft a name sounds, 0–1. Sonorants and fricatives lift it; stops and velars pull it
 * down. This is what the softer/stronger control actually moves.
 */
const SOFT_LETTERS = 'lmnrvszfhwy'
const HARD_LETTERS = 'kgtdpbqx'
const SOFT_DIGRAPHS = ['th', 'sh', 'ph', 'zh', 'dh']
export function softness(word: string): number {
  let soft = 0
  let hard = 0
  for (const part of units(word.toLowerCase())) {
    if (isNucleus(part)) continue
    if (part.length > 1) {
      if (SOFT_DIGRAPHS.includes(part)) soft += 1
      else hard += 1
      continue
    }
    if (SOFT_LETTERS.includes(part)) soft += 1
    else if (HARD_LETTERS.includes(part)) hard += 1
  }
  const total = soft + hard
  return total === 0 ? 0.5 : soft / total
}

/**
 * Which vowel to slip between two consonants that cannot meet. Harmonised to the vowel
 * before it, because a linking vowel that ignores its neighbours is exactly what makes a
 * blend sound assembled rather than grown.
 */
export function linkingVowel(previousVowel: string): string {
  return 'aeiou'.includes(previousVowel) ? previousVowel : 'a'
}

export function lastVowelOf(word: string): string {
  const parts = units(word.toLowerCase())
  for (let i = parts.length - 1; i >= 0; i -= 1) if (isNucleus(parts[i])) return parts[i]
  return 'a'
}

export const endsInVowel = (word: string) => isVowel(word[word.length - 1] ?? '')
export const startsWithVowel = (word: string) => isVowel(word[0] ?? '')

/** Nudge a few spellings toward how they are said. Used for the respelling only. */
function respell(chunk: string): string {
  return chunk
    .replace(/kh/g, 'k')
    .replace(/ph/g, 'f')
    .replace(/gh/g, 'g')
    .replace(/c([eiy])/g, 's$1')
    .replace(/c/g, 'k')
    .replace(/x/g, 'ks')
    // Order matters here. A final "y" becomes "ee" BEFORE "ae" becomes "ay", or the "y"
    // this rule just created is rewritten again and "phae" respells as "faee".
    .replace(/y$/g, 'ee')
    .replace(/ae/g, 'ay')
}

/**
 * A respelling anyone can read: syllables hyphenated, the stressed one capitalised.
 *
 * Stress falls on the penultimate syllable — the rule that covers Latin, Greek and most of
 * what these roots came from, and which reads naturally in English besides. A short name
 * with a heavy final syllable takes final stress instead, which is why "a-LETH" and not
 * "A-leth".
 */
export function pronounce(word: string): string {
  const syllables = syllabify(word)
  if (syllables.length <= 1) return respell(word).toUpperCase()

  const last = syllables[syllables.length - 1]
  const heavyFinal = last.coda.length > 1 || last.nucleus.length > 1
  const stressed = heavyFinal && syllables.length <= 3
    ? syllables.length - 1
    : syllables.length - 2

  return syllables
    .map((s, i) => (i === stressed ? respell(s.text).toUpperCase() : respell(s.text)))
    .join('-')
}

/** Capitalised for display; the engine works in lowercase throughout. */
export const titleCase = (word: string) => word.charAt(0).toUpperCase() + word.slice(1)
