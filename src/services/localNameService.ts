import type {
  GeneratedName, GenerationRequest, GenerationResult, NameService, Refinements, Root,
} from '../types'
import { Attested, type AttestedLoader } from '../data/attested'
import { interpret, type Interpretation } from '../data/concepts'
import { LANGUAGES } from '../data/languages'
import { LEXICON } from '../data/lexicon'
import { RootDatabase, type ShardLoader } from '../data/roots'
import { blendRoots, spellingVariants, type Blend } from '../lib/blend'
import { FORMING, compounds, derivations, sound, usable, type Formed } from '../lib/formation'
import { diversify, judge, judgeFormed, meaningStrength } from '../lib/score'
import { pronounce, syllableCount, titleCase } from '../lib/phonology'
import { fullMeaning, shortInterpretation } from '../lib/meaning'

/**
 * The name engine that runs in the browser.
 *
 * Two ways of making a name, and the difference is the product:
 *
 *   · FORMED (the default). Two roots from one language joined by that language's own
 *     rule, or one root with one of its language's name endings. See lib/formation.ts.
 *     The name means what its parts say and is shaped the way that language shapes words.
 *
 *   · BLENDED (only when `refinements.mix` is on). Two roots from two different languages
 *     cut and fused by sound. No language ever made a word that way, so it is something a
 *     person asks for — and an invented language is never blended with a real one.
 *
 * Either way a name has to clear the same bars before it is shown: its roots are not
 * flagged in the audit, it can be said, and it is not already a word in any source the
 * database was built from. Fewer good names is the intended result of a strict search;
 * the page says how many cleared rather than padding the grid.
 *
 * Deterministic for a given query and refinement, with one exception: `exclude`. Asking
 * for more names has to give you different ones, and the only honest way to do that is to
 * remember what was already shown.
 */
export class LocalNameService implements NameService {
  readonly id = 'local'

  private readonly db: RootDatabase
  private readonly attested: Attested

  /** How a shard of the root database, and the list of existing words, are fetched. */
  constructor(loadShard: ShardLoader, loadAttested: AttestedLoader) {
    this.db = new RootDatabase(loadShard)
    this.attested = new Attested(loadAttested)
  }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    const { query, refinements, exclude = [] } = request
    const read = await interpret(query, this.db)
    const { concepts, weights, unmatched, roots, recast } = read

    // Nothing was read. There is no honest set of names for that: the old fallback built
    // them from Archis's own favorite ideas, and every unread query came back about truth.
    if (weights.size === 0) {
      return {
        names: [],
        concepts,
        languages: [],
        notice: `Archis could not read ${quote(unmatched) || 'that'}. Say what the name should mean in plain words — wolf, river, courage, gold.`,
      }
    }

    const excluded = new Set(exclude.map((n) => n.toLowerCase()))

    // A name that already exists is not a coinage. Checked last because it needs the
    // list, and only what is about to be ranked is worth checking.
    const unattested = async (ranked: Scored[]) => {
      const fresh: Scored[] = []
      for (const candidate of ranked) {
        if (!(await this.attested.has(candidate.name))) fresh.push(candidate)
      }
      return fresh
    }

    let fresh = await unattested(refinements.mix
      ? blended(roots, weights, refinements, excluded)
      : formed(read, refinements, excluded, FIRM))
    // A search no language can answer firmly — one rare word, say — is tried again with
    // the word's kin let in. Only then: the kin are what was not asked for.
    if (!refinements.mix && fresh.length < 3) {
      fresh = await unattested(formed(read, refinements, excluded, LOOSE))
    }

    const chosen = refinements.mix ? diversify(fresh, refinements.count) : spread(fresh, refinements.count)
    const names = chosen.map((entry) => entry.build())
    const languages = [...new Set(names.flatMap((n) => n.roots.map((r) => r.root.language)))]

    if (names.length === 0) {
      return {
        names,
        concepts,
        languages,
        notice: refinements.mix
          ? `No blend of ${concepts.slice(0, 3).join(', ')} was good enough to show. Another idea alongside usually helps.`
          : `No single language here could make a sound name from ${concepts.slice(0, 3).join(', ')}. Add a second idea, or turn on Mix languages.`,
      }
    }

    return {
      names,
      concepts,
      languages,
      // Both things can be true at once, and the reading is the more important of them.
      notice: [
        unmatched.length > 0
          ? `Read as ${concepts.slice(0, 4).join(', ')}. Archis could not read ${quote(unmatched)}.`
          : null,
        // A verb cannot sit in a name as it is. Say what it was taken as, or that it
        // could not be taken as anything.
        ...recast.map(({ word, as }) => as.length > 0
          ? `"${word}" is a verb, and a name is built on nouns and adjectives, so it was read as ${as.join(', ')}.`
          : `"${word}" is a verb with no noun of its own here, so it was left out — a noun for the same idea will work.`),
        names.length < refinements.count
          ? `${names.length} ${names.length === 1 ? 'name' : 'names'} cleared the bar for this search — a weak name is left out rather than shown.`
          : null,
      ]
        .filter(Boolean)
        .join(' ') || undefined,
    }
  }
}

/** The words we could not place, quoted, at most three of them. */
function quote(words: string[]): string {
  return words.slice(0, 3).map((word) => `"${word}"`).join(', ')
}

interface Scored {
  name: string
  headId: string
  tailId: string
  score: number
  language?: string
  /** What the name says, so a page is not nine names that all say the same thing. */
  reading?: string
  build: () => GeneratedName
}

/** What a root is answering: the asked-for meaning it carries most strongly. */
const answers = (root: Root, weights: Map<string, number>) =>
  root.concepts.reduce(
    (best, c) => ((weights.get(c) ?? 0) > (weights.get(best) ?? 0) ? c : best),
    root.concepts[0],
  )

/** A meaning counts as asked for when the query named it, not when it was widened to. */
const ASKED = 0.95

/** Below this a formed name is a technically valid word nobody would choose. */
const FLOOR = 52

/**
 * How well a root must answer before a name is built on it. A root filed under an idea
 * only loosely — the head noun of a longer gloss, a distant relative from the thesaurus —
 * is fine as a search result and too thin to be half of a name's meaning.
 */
const FIRM = 0.5
const LOOSE = 0.3

// ── formed: one language, its own rules ────────────────────────────────────────────────

const PER_MEANING = 2
const PER_LANGUAGE_FORMED = 8

function formed(
  read: Interpretation,
  refinements: Refinements,
  excluded: Set<string>,
  firm: number,
): Scored[] {
  const { roots, weights, kinless, origin } = read
  const byLanguage = new Map<string, { root: Root; strength: number; answer: string }[]>()
  for (const root of roots) {
    if (!FORMING.has(root.language) || !usable(root)) continue
    const strength = meaningStrength(root, weights)
    if (strength < firm) continue
    const list = byLanguage.get(root.language) ?? []
    list.push({ root, strength, answer: answers(root, weights) })
    byLanguage.set(root.language, list)
  }

  // How many of the ideas asked for a name could actually be built on. A typed verb has
  // no usable root, and a name on the one remaining idea is then the whole answer, not
  // half of one.
  const asked = new Set(
    [...byLanguage.values()].flat().map((entry) => entry.answer).filter((a) => (weights.get(a) ?? 0) >= ASKED),
  ).size

  // How many typed words have anything to build on. With two, a name has to join one
  // idea from each; with one, it may join the word to its own wider kin.
  const typed = new Set(
    [...byLanguage.values()].flat().map((entry) => origin.get(entry.answer)?.word).filter((w) => w !== undefined),
  ).size

  const out: Scored[] = []
  const seen = new Set<string>()

  const offer = (made: Formed, strengths: number[], direct: boolean) => {
    if (seen.has(made.name) || excluded.has(made.name)) return
    seen.add(made.name)
    const verdict = judgeFormed(made.name, refinements)
    if (verdict.rejected) return

    let score = verdict.score
    // Meaning. A compound that carries two of the ideas asked for is the whole point; a
    // name on one root is the right answer to a one-idea search and a fallback otherwise.
    score += strengths.reduce((sum, s) => sum + s, 0) * 12
    if (made.kind === 'compound') score += direct ? 10 : 0
    else score += asked <= 1 ? 8 : -6
    // A root a second dictionary confirms is worth more than one that stands alone.
    score += made.roots.filter((u) => u.root.status === 'verified').length * 2

    if (score < FLOOR) return
    out.push({
      name: made.name,
      headId: made.roots[0].root.id,
      tailId: made.roots[1]?.root.id ?? made.roots[0].root.id,
      score,
      language: made.language,
      reading: made.reading,
      build: () => fromFormed(made, score),
    })
  }

  for (const list of byLanguage.values()) {
    // The best two roots for each idea, strongest first; the same query always picks
    // the same ones.
    list.sort((a, b) => b.strength - a.strength || (a.root.id < b.root.id ? -1 : 1))
    const taken = new Map<string, number>()
    const picks = list.filter((entry) => {
      const count = taken.get(entry.answer) ?? 0
      if (count >= PER_MEANING) return false
      taken.set(entry.answer, count + 1)
      return true
    }).slice(0, PER_LANGUAGE_FORMED)

    for (let i = 0; i < picks.length; i += 1) {
      for (let j = i + 1; j < picks.length; j += 1) {
        const a = picks[i]
        const b = picks[j]
        // Two roots that say the same thing make a name that says it twice.
        if (a.answer === b.answer) continue
        if (a.root.concepts.some((c) => b.root.concepts.includes(c))) continue
        // "Maker" and "creation" both came from the word "generate". Joined, they answer
        // that one word twice and the rest of the search not at all.
        const from = [origin.get(a.answer), origin.get(b.answer)]
        if (from[0] && from[1] && from[0].word === from[1].word && (typed > 1 || from[0].tier === from[1].tier)) continue
        const direct = (weights.get(a.answer) ?? 0) >= ASKED && (weights.get(b.answer) ?? 0) >= ASKED
        const meanings = new Map([[a.root, a.answer], [b.root, b.answer]])
        for (const made of compounds(a.root, b.root, meanings)) offer(made, [a.strength, b.strength], direct)
      }
    }
    for (const pick of picks) {
      if (firm === FIRM && (weights.get(pick.answer) ?? 0) < ASKED) continue
      for (const made of derivations(pick.root, pick.answer, !kinless.has(pick.answer))) offer(made, [pick.strength], true)
    }
  }

  return out.sort((a, b) => b.score - a.score || (a.name < b.name ? -1 : 1))
}

/**
 * A page of formed names: the best, but from as many languages as can supply one.
 *
 * Left to the score alone the page fills with whichever language has the shortest words
 * for these ideas. The first pass takes two names from any language and uses a root once;
 * the second relaxes both and the third drops them, so a search only two languages can
 * answer still fills. The invented languages come last, together, so they are never
 * mistaken for the old ones.
 */
function spread(ranked: Scored[], count: number): Scored[] {
  const chosen: Scored[] = []
  const perLanguage = new Map<string, number>()
  const rootUse = new Map<string, number>()
  const perReading = new Map<string, number>()

  // The caps are for variety, not for exclusion: every name here has already cleared the
  // bar, so the last pass has none and the grid fills whenever there is enough to fill it.
  for (const [languageCap, rootCap, readingCap] of [[2, 1, 2], [3, 2, 3], [Infinity, Infinity, Infinity]] as const) {
    for (const candidate of ranked) {
      if (chosen.length >= count) break
      if (chosen.includes(candidate)) continue
      const language = candidate.language ?? ''
      const reading = candidate.reading ?? candidate.name
      if ((perLanguage.get(language) ?? 0) >= languageCap) continue
      if ((perReading.get(reading) ?? 0) >= readingCap) continue
      if ((rootUse.get(candidate.headId) ?? 0) >= rootCap) continue
      if (candidate.tailId !== candidate.headId && (rootUse.get(candidate.tailId) ?? 0) >= rootCap) continue
      chosen.push(candidate)
      perLanguage.set(language, (perLanguage.get(language) ?? 0) + 1)
      perReading.set(reading, (perReading.get(reading) ?? 0) + 1)
      rootUse.set(candidate.headId, (rootUse.get(candidate.headId) ?? 0) + 1)
      if (candidate.tailId !== candidate.headId) rootUse.set(candidate.tailId, (rootUse.get(candidate.tailId) ?? 0) + 1)
    }
  }

  const invented = (entry: Scored) => LANGUAGES[entry.language ?? '']?.provenance === 'constructed'
  return [...chosen.filter((c) => !invented(c)), ...chosen.filter(invented)]
}

function fromFormed(made: Formed, score: number): GeneratedName {
  return {
    id: `${made.roots.map((u) => u.root.id).join('__')}__${made.name}`,
    name: titleCase(made.name),
    pronunciation: pronounce(made.name),
    interpretation: made.reading,
    meaning: `${made.reading}. ${made.roots.length === 2
      ? `Formed in ${LANGUAGES[made.language]?.name ?? made.language} from two of its own words`
      : `Formed in ${LANGUAGES[made.language]?.name ?? made.language} from one of its own words`}, the way that language forms them.`,
    blendNote: made.note,
    derivation: made.derivation,
    roots: made.roots,
    language: made.language,
    syllables: syllableCount(made.name),
    variants: [],
    score: Math.round(score),
  }
}

// ── blended: two languages, by sound, on request ───────────────────────────────────────

const PER_LANGUAGE = 3
const PER_FAMILY = 6

function blended(
  roots: Root[],
  weights: Map<string, number>,
  refinements: Refinements,
  excluded: Set<string>,
): Scored[] {
  // The dictionary's copy of a root is the checked one; the hand-written lexicon fills in
  // only where the database has nothing with that stem. Flagged roots and verbs stay out.
  const have = new Set(roots.map((root) => `${root.language}:${root.stem}`))
  const candidates = [
    ...roots.filter((root) => sound(root) && root.pos !== 'v' && !root.gloss.startsWith('to ')),
    ...LEXICON.filter((root) => root.language !== 'euphonic' && !have.has(`${root.language}:${root.stem}`)),
  ]
  const pool = gatherRoots(candidates, weights)
  const invented = (root: Root) => LANGUAGES[root.language]?.provenance === 'constructed'

  const scored: Scored[] = []
  for (const head of pool) {
    for (const tail of pool) {
      if (head.id === tail.id) continue
      // A euphonic ending has no meaning of its own, so it may only ever close a name —
      // never lead one, and never meet another of its kind. See the note in the lexicon.
      if (head.language === 'euphonic') continue
      // An invented language and a real one are never fused into one word.
      if (tail.language !== 'euphonic' && invented(head) !== invented(tail)) continue

      for (const blend of blendRoots(head, tail)) {
        if (excluded.has(blend.name)) continue
        const verdict = judge(blend, refinements, weights)
        if (verdict.rejected) continue
        const score = verdict.score + languageSpread(head, tail)
        if (score < FLOOR) continue
        scored.push({
          name: blend.name,
          headId: head.id,
          tailId: tail.id,
          score,
          build: () => fromBlend(blend, score),
        })
      }
    }
  }
  return scored.sort((a, b) => b.score - a.score)
}

/**
 * The roots worth blending for this query.
 *
 * Capped per language and per family on purpose. Greek and Latin have the deepest
 * coverage for almost any meaning, so an unbounded "best matches" pass returns a Greek
 * and Latin page every time. The caps force the pool wide before the scorer ever sees it.
 *
 * Within a language the picks are spread across what was asked for. Ask for "wolf, night"
 * and a language with two strong words for night must still send its wolf: taking the top
 * three by strength alone would fill the pool with whichever idea has the weightier roots
 * and leave nothing unlike to blend it with.
 */
function gatherRoots(candidates: Root[], weights: Map<string, number>): Root[] {
  const byLanguage = new Map<string, { root: Root; strength: number }[]>()
  for (const root of candidates) {
    const strength = meaningStrength(root, weights)
    if (strength <= 0) continue
    const list = byLanguage.get(root.language) ?? []
    list.push({ root, strength })
    byLanguage.set(root.language, list)
  }

  const picked: { root: Root; strength: number }[] = []
  for (const list of byLanguage.values()) {
    const used = new Map<string, number>()
    for (let n = 0; n < PER_LANGUAGE && list.length > 0; n += 1) {
      let bestIndex = 0
      let bestValue = -Infinity
      list.forEach((entry, i) => {
        const value = entry.strength - 0.2 * (used.get(answers(entry.root, weights)) ?? 0)
        // Ties go to the earlier id, so the same query always builds the same pool.
        if (value > bestValue || (value === bestValue && entry.root.id < list[bestIndex].root.id)) {
          bestValue = value
          bestIndex = i
        }
      })
      const [entry] = list.splice(bestIndex, 1)
      picked.push(entry)
      const answer = answers(entry.root, weights)
      used.set(answer, (used.get(answer) ?? 0) + 1)
    }
  }

  picked.sort((a, b) => b.strength - a.strength || (a.root.id < b.root.id ? -1 : 1))
  const perFamily = new Map<string, number>()
  const pool: Root[] = []
  for (const { root } of picked) {
    const family = LANGUAGES[root.language]?.family ?? root.language
    if ((perFamily.get(family) ?? 0) >= PER_FAMILY) continue
    perFamily.set(family, (perFamily.get(family) ?? 0) + 1)
    pool.push(root)
  }

  // Euphonic endings are added last and unconditionally: they answer no concept, so they
  // never survive the match filter above, and their whole job is to be available as a
  // tail when a real root needs somewhere soft to land.
  pool.push(...LEXICON.filter((root) => root.language === 'euphonic').slice(0, 5))

  return pool
}

/** A small nudge toward names whose two roots come from different traditions. */
function languageSpread(head: Root, tail: Root): number {
  if (head.language === tail.language) return -3
  if (tail.language === 'euphonic') return 0
  return 2
}

function fromBlend(blend: Blend, score: number): GeneratedName {
  const head = blend.head.root
  const tail = blend.tail.root
  return {
    id: `${head.id}__${tail.id}__${blend.name}`,
    name: titleCase(blend.name),
    pronunciation: pronounce(blend.name),
    interpretation: shortInterpretation(head, tail, blend.name),
    meaning: fullMeaning(head, tail, blend.name),
    blendNote: blend.note,
    derivation: blend.derivation,
    roots: [blend.head, blend.tail],
    syllables: syllableCount(blend.name),
    variants: spellingVariants(blend.name).map(titleCase),
    score: Math.round(score),
  }
}
