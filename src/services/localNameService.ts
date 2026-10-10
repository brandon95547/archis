import type {
  GeneratedName, GenerationRequest, GenerationResult, NameService, Root,
} from '../types'
import { interpret } from '../data/concepts'
import { LANGUAGES } from '../data/languages'
import { LEXICON } from '../data/lexicon'
import { RootDatabase, type ShardLoader } from '../data/roots'
import { blendRoots, spellingVariants, type Blend } from '../lib/blend'
import { diversify, judge, meaningStrength } from '../lib/score'
import { pronounce, syllableCount, titleCase } from '../lib/phonology'
import { fullMeaning, shortInterpretation } from '../lib/meaning'

/**
 * The name engine that runs in the browser.
 *
 * This is a real generator, not a bag of pre-written names: it reads the query, gathers
 * the roots that answer it, blends them and judges the results. It is also the reference
 * implementation of the NameService contract — a remote service has to produce the same
 * shapes, and this is what those shapes look like when everything is filled in.
 *
 * Deterministic for a given query and refinement, with one exception: `exclude`. Asking
 * for more names has to give you different ones, and the only honest way to do that is to
 * remember what was already shown.
 */
export class LocalNameService implements NameService {
  readonly id = 'local'

  private readonly db: RootDatabase

  /** `load` is how a shard of the root database is fetched — see data/browserShards.ts. */
  constructor(load: ShardLoader) {
    this.db = new RootDatabase(load)
  }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    const { query, refinements, exclude = [] } = request
    const { concepts, weights, unmatched, roots } = await interpret(query, this.db)

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

    const pool = gatherRoots([...LEXICON, ...roots], weights)
    // One root is enough — it can still take a euphonic ending. None is not.
    if (pool.every((root) => root.language === 'euphonic')) {
      return {
        names: [],
        concepts,
        languages: [],
        notice: `No root in the database means ${concepts.slice(0, 3).join(' or ')}. A nearby word may have one.`,
      }
    }

    const excluded = new Set(exclude.map((n) => n.toLowerCase()))
    const scored: Scored[] = []

    for (const head of pool) {
      for (const tail of pool) {
        if (head.id === tail.id) continue
        // A euphonic ending has no meaning of its own, so it may only ever close a name —
        // never lead one, and never meet another of its kind. See the note in the lexicon.
        if (head.language === 'euphonic') continue

        for (const blend of blendRoots(head, tail)) {
          if (excluded.has(blend.name)) continue
          const verdict = judge(blend, refinements, weights)
          if (verdict.rejected) continue
          scored.push({
            blend,
            name: blend.name,
            headId: head.id,
            tailId: tail.id,
            score: verdict.score + languageSpread(head, tail),
          })
        }
      }
    }

    scored.sort((a, b) => b.score - a.score)
    const chosen = diversify(scored, refinements.count)

    const names = chosen.map(toGeneratedName)
    const languages = [...new Set(names.flatMap((n) => n.roots.map((r) => r.root.language)))]

    return {
      names,
      concepts,
      languages,
      // Both things can be true at once, and the reading is the more important of them.
      notice: [
        unmatched.length > 0
          ? `Read as ${concepts.slice(0, 4).join(', ')}. Archis could not read ${quote(unmatched)}.`
          : null,
        names.length < refinements.count
          ? `Only ${names.length} names cleared the filters for this query. Widening the ideas usually helps.`
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
  blend: Blend
  name: string
  headId: string
  tailId: string
  score: number
}

const PER_LANGUAGE = 3
const PER_FAMILY = 6
/** Tolkien's languages together get what one large real tradition gets alone. */
const PER_INVENTED_FAMILY = 4

/**
 * The roots worth blending for this query.
 *
 * Capped per language and per family on purpose. Greek and Latin have the deepest
 * coverage for almost any meaning, so an unbounded "best matches" pass returns a Greek
 * and Latin page every time — which is the failure the brief names outright. The caps
 * force the pool wide before the scorer ever sees it.
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

  // What a root is answering: the asked-for meaning it carries most strongly.
  const answers = (root: Root) =>
    root.concepts.reduce(
      (best, c) => ((weights.get(c) ?? 0) > (weights.get(best) ?? 0) ? c : best),
      root.concepts[0],
    )

  const picked: { root: Root; strength: number }[] = []
  for (const list of byLanguage.values()) {
    const used = new Map<string, number>()
    for (let n = 0; n < PER_LANGUAGE && list.length > 0; n += 1) {
      let bestIndex = 0
      let bestValue = -Infinity
      list.forEach((entry, i) => {
        const value = entry.strength - 0.2 * (used.get(answers(entry.root)) ?? 0)
        // Ties go to the earlier id, so the same query always builds the same pool.
        if (value > bestValue || (value === bestValue && entry.root.id < list[bestIndex].root.id)) {
          bestValue = value
          bestIndex = i
        }
      })
      const [entry] = list.splice(bestIndex, 1)
      picked.push(entry)
      used.set(answers(entry.root), (used.get(answers(entry.root)) ?? 0) + 1)
    }
  }

  picked.sort((a, b) => b.strength - a.strength || (a.root.id < b.root.id ? -1 : 1))
  const perFamily = new Map<string, number>()
  const pool: Root[] = []
  for (const { root } of picked) {
    const info = LANGUAGES[root.language]
    const family = info?.family ?? root.language
    const cap = info?.provenance === 'constructed' ? PER_INVENTED_FAMILY : PER_FAMILY
    if ((perFamily.get(family) ?? 0) >= cap) continue
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

function toGeneratedName(entry: Scored): GeneratedName {
  const { blend } = entry
  const head = blend.head.root
  const tail = blend.tail.root
  const display = titleCase(blend.name)

  return {
    id: `${entry.headId}__${entry.tailId}__${blend.name}`,
    name: display,
    pronunciation: pronounce(blend.name),
    interpretation: shortInterpretation(head, tail, blend.name),
    meaning: fullMeaning(head, tail, blend.name),
    blendNote: blend.note,
    derivation: blend.derivation,
    roots: [blend.head, blend.tail],
    syllables: syllableCount(blend.name),
    variants: spellingVariants(blend.name).map(titleCase),
    score: Math.round(entry.score),
  }
}
