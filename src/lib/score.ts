import type { Refinements, Root } from '../types'
import type { Concept } from '../data/concepts'
import { OVERUSED_ENDINGS, screen } from '../data/blocklist'
import { harshness, softness, syllabify, syllableCount, vowelRatio } from './phonology'
import type { Blend } from './blend'

/**
 * Deciding which blends are names.
 *
 * The generator is loose on purpose; this is where the standard lives. Two jobs, and they
 * are different: reject outright anything that must never be shown, then rank whatever
 * survives. Keeping them apart matters — a hard rule expressed as a heavy penalty will
 * eventually be outweighed by something else and ship the name anyway.
 */

export interface Judgement {
  score: number
  rejected?: string
}

const TARGET_SYLLABLES: Record<Refinements['length'], [number, number]> = {
  short: [2, 2],
  medium: [2, 3],
  long: [3, 4],
}

/** Hard floor and ceiling, whatever the refinement asks for. */
const ABSOLUTE_SYLLABLES: [number, number] = [2, 4]

const SOUND_TARGET: Record<Refinements['sound'], number> = {
  softer: 0.78,
  balanced: 0.58,
  stronger: 0.36,
}

/**
 * How archaic a name reads, 0–1, from the letters that only turn up in older
 * transliteration. Rough by nature — it is a look, not a fact — but it moves the right
 * direction: "kh", "th" and a consonant coda feel older than an open CV run.
 */
function archaism(name: string): number {
  let score = 0.35
  if (/kh|gh|dh|zh/.test(name)) score += 0.25
  if (/th|ph/.test(name)) score += 0.12
  if (/[qxz]/.test(name)) score += 0.1
  if (/[bcdfgklmnprstvz]$/.test(name)) score += 0.12
  if (/^(a|e|i|o|u)/.test(name)) score += 0.06
  if (/(ia|io|eo|ae)/.test(name)) score += 0.08
  if (/[aeiou]$/.test(name) && !/kh|th|ph/.test(name)) score -= 0.12
  return Math.max(0, Math.min(1, score))
}

/** How well a root answers the query, weighted by how completely it carries the concept. */
export function meaningStrength(root: Root, weights: Map<Concept, number>): number {
  let best = 0
  for (const concept of root.concepts) {
    const asked = weights.get(concept as Concept)
    if (asked) best = Math.max(best, asked * root.weight)
  }
  return best
}

const endingOf = (name: string) => {
  const syllables = syllabify(name)
  return syllables[syllables.length - 1]?.text ?? name.slice(-2)
}

/**
 * Judge one blend on its own. Batch-level concerns — variety, repetition across results —
 * are handled separately in `diversify`, because they are not properties of a single name.
 */
export function judge(
  blend: Blend,
  refinements: Refinements,
  weights: Map<Concept, number>,
): Judgement {
  const name = blend.name

  // ── the hard gate ────────────────────────────────────────────────────────
  const blocked = screen(name)
  if (blocked.blocked) return { score: 0, rejected: blocked.reason }

  const syllables = syllableCount(name)
  if (syllables < ABSOLUTE_SYLLABLES[0]) return { score: 0, rejected: 'only one syllable' }
  if (syllables > ABSOLUTE_SYLLABLES[1]) return { score: 0, rejected: 'more than four syllables' }

  const harsh = harshness(name)
  if (harsh >= 4) return { score: 0, rejected: 'consonants crowd too hard' }

  const vowels = vowelRatio(name)
  if (vowels < 0.3) return { score: 0, rejected: 'too few vowels to carry it' }
  if (vowels > 0.72) return { score: 0, rejected: 'so vowel-heavy it loses its shape' }

  // A vowel pile-up. Two vowels are a diphthong an English reader takes in one go; three
  // is a guess — "temporyuan" has "yua" in the middle and nobody knows what to do with it.
  if (syllabify(name).some((s) => s.nucleus.length > 2)) {
    return { score: 0, rejected: 'three vowels run together' }
  }

  // A name has to mean something. If neither root answered the query, whatever came out
  // is a pleasant noise, and the whole point was that it should be traceable.
  const headMeaning = meaningStrength(blend.head.root, weights)
  const tailMeaning = meaningStrength(blend.tail.root, weights)
  if (headMeaning === 0) return { score: 0, rejected: 'the leading root does not answer the query' }

  // Two roots that say the same thing make a name that says it twice. "Light joined to
  // light" is not a meaning, it is a stutter, and the interpretation reads as one:
  // "Light, brought into the light". Euphonic tails are exempt — they claim nothing, so
  // there is nothing to duplicate.
  let overlapPenalty = 0
  if (blend.tail.root.language !== 'euphonic') {
    const headTop = blend.head.root.concepts[0]
    const tailTop = blend.tail.root.concepts[0]
    if (headTop && headTop === tailTop) {
      return { score: 0, rejected: 'both roots mean the same thing' }
    }
    const shared = blend.head.root.concepts.filter((c) => blend.tail.root.concepts.includes(c))
    if (shared.length >= 2) overlapPenalty = 8
  }

  // ── ranking ──────────────────────────────────────────────────────────────
  let score = 50 - overlapPenalty

  // Meaning first. The head carries more because it is what survives most intact.
  score += headMeaning * 22
  score += tailMeaning * 12

  // How the name lands. A final vowel or a sonorant is a name you can say without
  // stopping; a final voiceless stop is a chopped stem, and unchecked the blender
  // produces pages of them because so many roots trim to CVC.
  const final = name[name.length - 1]
  if ('aeiou'.includes(final)) score += 6
  else if ('lmnrs'.includes(final)) score += 3
  else if ('ktpqx'.includes(final)) score -= 7
  else if ('bdg'.includes(final)) score -= 4
  if (/(sm|sn|tl|dl|kl|shm|thm)$/.test(name)) score -= 10

  // Rhythm: the requested length, and a real preference for three syllables, which is
  // where names sit most comfortably.
  const [lo, hi] = TARGET_SYLLABLES[refinements.length]
  if (syllables >= lo && syllables <= hi) score += 10
  else score -= 6 * Math.min(Math.abs(syllables - lo), Math.abs(syllables - hi))
  if (syllables === 3) score += 3

  // Flow.
  score -= harsh * 4
  score += (0.5 - Math.abs(vowels - 0.5)) * 16

  // Sound, as asked for.
  score -= Math.abs(softness(name) - SOUND_TARGET[refinements.sound]) * 20

  // Era, as asked for.
  const eraTarget = refinements.era === 'ancient' ? 0.8 : refinements.era === 'modern' ? 0.25 : 0.5
  score -= Math.abs(archaism(name) - eraTarget) * 16

  // The endings the brief singles out. Penalised hard rather than banned — an ending is
  // not a crime, and one good name in "-ara" is fine. What must not happen is a page of
  // them, which `diversify` prevents.
  const ending = endingOf(name)
  if (OVERUSED_ENDINGS.some((e) => name.endsWith(e))) score -= 14
  if (/(.)\1/.test(ending)) score -= 4

  // Spelling anyone can take down over the phone.
  if (/[^a-z]/.test(name)) score -= 6
  if (name.length > 10) score -= 5
  if (/(.)\1\1/.test(name)) score -= 10

  // A blend that reads as one of its parents with a letter changed looks like a typo of a
  // real word rather than a new name.
  if (name.startsWith(blend.head.root.stem) && name.length - blend.head.root.stem.length <= 1) {
    score -= 12
  }

  return { score: Math.max(0, Math.min(100, score)) }
}

/**
 * Turn a ranked list into a varied one.
 *
 * Left alone, the scorer returns near-duplicates: the same two roots produce a dozen
 * blends that differ by one letter, and the highest-scoring family crowds out everything
 * else. This walks the ranked list and takes a name only if it is different enough from
 * what has already been taken — a different ending, a different opening, and a different
 * pair of roots than the last one that got through.
 */
export function diversify<T extends { name: string; headId: string; tailId: string; score: number }>(
  ranked: T[],
  count: number,
): T[] {
  const chosen: T[] = []
  const endings = new Map<string, number>()
  const openings = new Map<string, number>()
  const pairs = new Set<string>()
  const rootUse = new Map<string, number>()

  // Two passes: strict first, then relaxed if the strict pass could not fill the page.
  // Better to repeat an ending than to hand back four names when six were asked for.
  for (const relaxed of [false, true]) {
    for (const candidate of ranked) {
      if (chosen.length >= count) break
      if (chosen.includes(candidate)) continue

      const ending = endingOf(candidate.name)
      const opening = candidate.name.slice(0, 2)
      const pair = [candidate.headId, candidate.tailId].sort().join('+')

      const endingCap = relaxed ? 3 : 1
      const openingCap = relaxed ? 3 : 2
      const rootCap = relaxed ? 4 : 2

      if (pairs.has(pair)) continue
      if ((endings.get(ending) ?? 0) >= endingCap) continue
      if ((openings.get(opening) ?? 0) >= openingCap) continue
      if ((rootUse.get(candidate.headId) ?? 0) >= rootCap) continue
      if ((rootUse.get(candidate.tailId) ?? 0) >= rootCap) continue

      chosen.push(candidate)
      pairs.add(pair)
      endings.set(ending, (endings.get(ending) ?? 0) + 1)
      openings.set(opening, (openings.get(opening) ?? 0) + 1)
      rootUse.set(candidate.headId, (rootUse.get(candidate.headId) ?? 0) + 1)
      rootUse.set(candidate.tailId, (rootUse.get(candidate.tailId) ?? 0) + 1)
    }
    if (chosen.length >= count) break
  }

  return chosen
}
