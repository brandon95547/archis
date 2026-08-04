import type {
  GeneratedName, GenerationRequest, GenerationResult, NameService, Root,
} from '../types'
import type { Concept } from '../data/concepts'
import { interpret } from '../data/concepts'
import { LEXICON } from '../data/lexicon'
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

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    // A beat of latency. Not theatre — the UI has loading states that a synchronous
    // service would never exercise, and they have to be right before a real backend makes
    // them matter.
    await new Promise((resolve) => setTimeout(resolve, 260))

    const { query, refinements, exclude = [] } = request
    const { concepts, weights, unmatched } = interpret(query)

    const pool = gatherRoots(weights)
    if (pool.length < 2) {
      return {
        names: [],
        concepts,
        languages: [],
        notice: 'That did not match anything in the lexicon. Try ideas like truth, memory, or hidden knowledge.',
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
      notice: names.length < refinements.count
        ? `Only ${names.length} names cleared the filters for this query. Widening the ideas usually helps.`
        : unmatched.length > 0
          ? `Read as ${concepts.slice(0, 4).join(', ')}. Nothing matched "${unmatched.slice(0, 3).join('", "')}".`
          : undefined,
    }
  }
}

interface Scored {
  blend: Blend
  name: string
  headId: string
  tailId: string
  score: number
}

/**
 * The roots worth blending for this query.
 *
 * Capped per language on purpose. Greek and Latin have the deepest coverage in this
 * lexicon for almost any concept, so an unbounded "best matches" pass returns a Greek and
 * Latin page every time — which is the failure the brief names outright. The cap forces
 * the pool wide before the scorer ever sees it.
 */
function gatherRoots(weights: Map<Concept, number>): Root[] {
  const PER_LANGUAGE = 4

  const matched = LEXICON
    .map((root) => ({ root, strength: meaningStrength(root, weights) }))
    .filter(({ strength }) => strength > 0)
    .sort((a, b) => b.strength - a.strength)

  const byLanguage = new Map<string, Root[]>()
  for (const { root } of matched) {
    const list = byLanguage.get(root.language) ?? []
    if (list.length < PER_LANGUAGE) {
      list.push(root)
      byLanguage.set(root.language, list)
    }
  }

  const pool = [...byLanguage.values()].flat()

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
    roots: [blend.head, blend.tail],
    syllables: syllableCount(blend.name),
    variants: spellingVariants(blend.name).map(titleCase),
    score: Math.round(entry.score),
  }
}
