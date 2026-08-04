import type { DerivationPart, Root, RootUsage } from '../types'
import {
  endsInVowel, isVowel, lastVowelOf, linkingVowel, repairClusters, startsWithVowel,
  syllabify, units,
} from './phonology'

/**
 * Growing a name out of two roots.
 *
 * The rule that matters: never concatenate. Two whole words shoved together is not a
 * coinage, it is a compound with a seam down the middle, and it is what makes generated
 * names sound generated. Every join here does at least one of trimming a root back to the
 * part that carries it, spending one vowel where two would collide, or opening a cluster
 * that cannot be said.
 *
 * Each join records what it did, because the detail panel has to be able to show its
 * working — a name whose derivation cannot be explained is not worth offering.
 */

export interface Blend {
  name: string
  head: RootUsage
  tail: RootUsage
  /** The name spelled out as its parts, in order. Adds back up to `name`. */
  derivation: DerivationPart[]
  /** What the join actually did, in one sentence. */
  note: string
}

/**
 * Front pieces of a root, longest first. A head has to keep enough to stay recognisable —
 * "sat" still says *satya*, "s" says nothing — so it is cut at syllable boundaries and at
 * the first consonant after a nucleus, never at an arbitrary letter.
 */
function heads(stem: string): string[] {
  const out = new Set<string>()
  const syllables = syllabify(stem)

  out.add(stem)
  if (syllables.length > 1) {
    // One syllable, then one syllable plus its following onset — "aleth", then "aletha"
    // once a linking vowel is added downstream.
    out.add(syllables[0].text)
    out.add(syllables.slice(0, Math.max(1, syllables.length - 1)).map((s) => s.text).join(''))
  }

  // Trim a trailing vowel: most citation stems end in one, and keeping it forces every
  // name into the same shape.
  if (endsInVowel(stem) && stem.length > 3) out.add(stem.slice(0, -1))

  // A head has to be enough of its root to still point at it. Two letters off a five-letter
  // stem is not a trimmed root, it is a coincidence — "ar" does not say *arcanum*.
  const floor = stem.length >= 5 ? 3 : 2
  return [...out].filter((h) => h.length >= floor)
}

/**
 * Back pieces of a root. A tail may lose its onset entirely — "-thia" out of *aletheia* —
 * because what a tail contributes is its rhythm and its final vowel, and the meaning is
 * already carried by the head.
 */
function tails(stem: string): string[] {
  const out = new Set<string>()
  const syllables = syllabify(stem)

  out.add(stem)
  if (syllables.length > 1) {
    out.add(syllables.slice(1).map((s) => s.text).join(''))
    out.add(syllables[syllables.length - 1].text)
  }
  // A tail that opens on a vowel gives the smoothest joins, so offer that shape too.
  const parts = units(stem)
  const firstVowel = parts.findIndex((p) => p.length === 1 && isVowel(p))
  if (firstVowel > 0) out.add(parts.slice(firstVowel).join(''))

  return [...out].filter((t) => t.length >= 2)
}

interface Join {
  /** Head letters that survive the seam. */
  head: string
  /** Letters owed to neither root — the vowel spent to open the join. Usually empty. */
  link: string
  /** Tail letters that survive the seam. */
  tail: string
  note: string
}

/**
 * Put a head and a tail together, doing whatever the seam requires.
 *
 * The four cases are the whole of it: two vowels meeting, two consonants meeting, and the
 * two mixed cases which need nothing. Returns null when the pieces simply will not join —
 * better to lose a candidate than to force one.
 *
 * Returns the three pieces rather than the finished word, because the panel has to be able
 * to say which letters came from which root and which came from the join itself. A joiner
 * that only hands back a string forces the explanation to be reverse-engineered, and a
 * reverse-engineered derivation is a guess.
 */
function join(head: string, tail: string): Join | null {
  const headEndsVowel = endsInVowel(head)
  const tailStartsVowel = startsWithVowel(tail)

  // ── vowel meets vowel ────────────────────────────────────────────────────
  if (headEndsVowel && tailStartsVowel) {
    const a = head[head.length - 1]
    const b = tail[0]
    if (a === b) {
      // The same vowel twice is one vowel. This is the join that reads as a single word
      // rather than two: *sophia* + *aletheia* meeting on their shared "a".
      return {
        head,
        link: '',
        tail: tail.slice(1),
        note: `the shared "${a}" is spent once, closing the seam`,
      }
    }
    // Two different vowels: keep the pair when English already reads it as one sound,
    // otherwise drop the weaker first one.
    const diphthongs = ['ae', 'ai', 'au', 'ea', 'ei', 'eo', 'ia', 'ie', 'io', 'oa', 'oe', 'ou', 'ua', 'ue']
    if (diphthongs.includes(a + b)) {
      return { head, link: '', tail, note: `"${a}" and "${b}" fall together as one sound` }
    }
    return {
      head: head.slice(0, -1),
      link: '',
      tail,
      note: `the trailing "${a}" gives way to "${b}"`,
    }
  }

  // ── consonant meets consonant ────────────────────────────────────────────
  if (!headEndsVowel && !tailStartsVowel) {
    const direct = repairClusters(head + tail)
    // If repair left the cluster alone and it is short, the two consonants can meet.
    const seam = head[head.length - 1] + tail[0]
    const easy = ['nt', 'nd', 'st', 'sk', 'sp', 'rt', 'rd', 'rn', 'rm', 'rs', 'lt', 'ld',
      'ln', 'lm', 'ms', 'ns', 'ndr', 'mbr', 'str', 'thr', 'nth', 'rth', 'lth', 'sth']
    if (easy.includes(seam) || easy.some((s) => direct.includes(s))) {
      return { head, link: '', tail, note: `"${seam}" is a join the mouth already makes` }
    }
    // Otherwise open it with a vowel harmonised to the head.
    const vowel = linkingVowel(lastVowelOf(head))
    return {
      head,
      link: vowel,
      tail,
      note: `a linking "${vowel}" opens the join, taking its colour from the vowel before it`,
    }
  }

  // ── one of each: nothing to negotiate ────────────────────────────────────
  const note = repairClusters(head + tail) !== head + tail
    ? 'the join was eased where the consonants crowded'
    : 'the two pieces meet cleanly, vowel to consonant'
  return { head, link: '', tail, note }
}

/**
 * Every viable blend of two roots, head-first.
 *
 * Deliberately generative: this produces more candidates than anyone should see, and the
 * scorer is what makes it a shortlist. Filtering here would mean deciding on sound before
 * knowing what the alternatives were.
 */
export function blendRoots(head: Root, tail: Root): Blend[] {
  const out: Blend[] = []
  const seen = new Set<string>()

  for (const h of heads(head.stem)) {
    for (const t of tails(tail.stem)) {
      const joined = join(h, t)
      if (!joined) continue

      let name = repairClusters(joined.head + joined.link + joined.tail)
      // A name is a word, not a stem: give it a vowel to land on if it ends somewhere
      // English does not.
      let terminal = ''
      if (/[jqvwc]$/.test(name)) {
        terminal = linkingVowel(lastVowelOf(name))
        name += terminal
      }
      if (name.length < 4 || name.length > 12) continue
      if (seen.has(name)) continue
      seen.add(name)

      // A blend that swallowed one of its parents is a trimmed word, not a new name.
      if (name === head.stem || name === tail.stem) continue

      const trimmedHead = h !== head.stem
      const trimmedTail = t !== tail.stem
      const trimNote = trimmedHead && trimmedTail
        ? 'Both roots were cut back to the part that carries them'
        : trimmedHead
          ? `${head.form} was cut back to "${h}"`
          : trimmedTail
            ? `${tail.form} was cut back to "${t}"`
            : 'Both roots kept their full stems'

      // The name, spelled out as its parts. Every letter is accounted for and attributed,
      // including the ones no root paid for.
      const derivation: DerivationPart[] = [
        { text: joined.head, kind: 'root', rootId: head.id, label: 'root' },
      ]
      if (joined.link) {
        derivation.push({ text: joined.link, kind: 'link', label: 'linking vowel' })
      }
      derivation.push({ text: joined.tail, kind: 'root', rootId: tail.id, label: 'suffix' })
      if (terminal) {
        derivation.push({ text: terminal, kind: 'link', label: 'closing vowel' })
      }

      out.push({
        name,
        head: { root: head, contribution: h, surface: joined.head, position: 'head' },
        tail: { root: tail, contribution: t, surface: joined.tail, position: 'tail' },
        derivation,
        note: `${trimNote}, then ${joined.note}.`,
      })
    }
  }
  return out
}

/**
 * Plausible respellings of the same name.
 *
 * Offered because these roots reach English through transliteration, and transliteration
 * was never settled — the same Greek letter is someone's "k" and someone else's "c". Each
 * rule is a real convention, not a random letter swap, so every variant is a spelling the
 * name could honestly have had.
 */
export function spellingVariants(name: string): string[] {
  const rules: [RegExp, string][] = [
    [/^k/, 'c'], [/kh/g, 'ch'], [/ph/g, 'f'], [/y/g, 'i'], [/i$/, 'y'],
    [/th/g, 't'], [/ae/g, 'e'], [/ou/g, 'u'], [/s$/, 'sh'], [/z/g, 's'],
    [/a$/, 'ah'], [/e$/, 'ë'], [/j/g, 'y'],
  ]

  const out = new Set<string>()
  for (const [pattern, replacement] of rules) {
    if (!pattern.test(name)) continue
    const variant = name.replace(pattern, replacement)
    if (variant !== name && variant.length >= 4) out.add(variant)
  }
  // Doubling a medial consonant is the other convention that shows up constantly.
  const doubled = name.replace(/([aeiou])([lmnrst])([aeiou])/, '$1$2$2$3')
  if (doubled !== name) out.add(doubled)

  return [...out].slice(0, 4)
}
