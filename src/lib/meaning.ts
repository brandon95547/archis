import type { Root } from '../types'

/**
 * Saying what a name means.
 *
 * The temptation is a template — "X of Y" for everything — and it reads as a template
 * within three results. So the phrasing is chosen by what the two roots are *doing* to
 * each other: a light root behind a knowledge root is illumination, a time root behind
 * anything is endurance, and a name root turns whatever precedes it into an act of naming.
 *
 * The head's gloss leads because the head is the part that survives most intact.
 */

/** The first clause of a gloss — "truth, what is real" becomes "truth". */
const core = (gloss: string) => gloss.split(/[,;(]/)[0].trim()

const has = (root: Root, ...concepts: string[]) =>
  concepts.some((c) => root.concepts.includes(c))

/**
 * Two phrasings per relation, picked by the name itself.
 *
 * One phrasing per relation is a tell: three light-tailed names in a batch all read
 * "brought into the light" and the whole page looks stamped out. Choosing by a hash of
 * the name rather than at random keeps a given name's line stable across re-renders —
 * a description that changes when you reopen a card is not a description.
 */
const RELATIONS: [string[], ((a: string) => string)[]][] = [
  [['light', 'clarity'], [(a) => `${cap(a)}, brought into the light`, (a) => `${cap(a)} made plain`]],
  [['time', 'eternity'], [(a) => `${cap(a)} that outlasts its age`, (a) => `${cap(a)}, carried through time`]],
  [['memory'], [(a) => `${cap(a)}, kept and remembered`, (a) => `${cap(a)} held in memory`]],
  [['name', 'word', 'speech', 'voice'], [(a) => `${cap(a)}, spoken and named`, (a) => `${cap(a)} put into words`]],
  [['origin', 'beginning', 'foundation'], [(a) => `${cap(a)} at its source`, (a) => `${cap(a)}, traced to its beginning`]],
  [['path'], [(a) => `${cap(a)} as a way to walk`, (a) => `${cap(a)} taken as a path`]],
  [['hidden', 'depth'], [(a) => `${cap(a)} held in the deep`, (a) => `${cap(a)}, kept out of sight`]],
  [['creation', 'transformation'], [(a) => `${cap(a)} in the making`, (a) => `${cap(a)} as it becomes`]],
  [['order', 'law', 'harmony'], [(a) => `${cap(a)} set in order`, (a) => `${cap(a)}, given its measure`]],
  [['mind', 'consciousness', 'thought'], [(a) => `${cap(a)} known from within`, (a) => `${cap(a)} turned over in the mind`]],
  [['sight'], [(a) => `${cap(a)}, seen clearly`, (a) => `${cap(a)} brought into view`]],
  [['knowledge', 'wisdom', 'learning'], [(a) => `${cap(a)} understood`, (a) => `${cap(a)}, come to know`]],
  [['life', 'breath'], [(a) => `${cap(a)}, alive`, (a) => `${cap(a)} drawing breath`]],
  [['sacred'], [(a) => `${cap(a)}, held sacred`, (a) => `${cap(a)} set apart`]],
  [['strength'], [(a) => `${cap(a)}, made to hold`, (a) => `${cap(a)} standing firm`]],
  [['fire'], [(a) => `${cap(a)}, kindled`, (a) => `${cap(a)} set alight`]],
  [['water'], [(a) => `${cap(a)}, running deep`, (a) => `${cap(a)} at the spring`]],
  [['sky'], [(a) => `${cap(a)} under an open sky`, (a) => `${cap(a)}, raised high`]],
]

/** Stable small hash — same name, same phrasing, every render. */
const pick = <T,>(options: T[], seed: string): T => {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return options[hash % options.length]
}

/** One line, for the card. Short enough to read at a glance. */
export function shortInterpretation(head: Root, tail: Root, seed = ''): string {
  const a = core(head.gloss)
  const b = core(tail.gloss)
  const key = seed || head.id + tail.id

  if (tail.concepts.length === 0) return `${cap(a)}, given a shape to be said aloud`

  for (const [concepts, phrasings] of RELATIONS) {
    if (has(tail, ...concepts)) return pick(phrasings, key)(a)
  }
  return `${cap(a)} and ${b}`
}

/** The longer reading, for the detail panel: what the two glosses make together. */
export function fullMeaning(head: Root, tail: Root, seed = ''): string {
  const a = core(head.gloss)
  const b = core(tail.gloss)

  if (tail.concepts.length === 0) {
    return `The name carries one meaning, ${a}, and closes on a sound chosen only for how it falls. `
      + `Nothing is claimed by the ending; it is there to make the name sayable.`
  }

  return `${cap(a)} joined to ${b}. The name reads as `
    + `${shortInterpretation(head, tail, seed).toLowerCase()} — the first root sets what it is `
    + `about, the second says what becomes of it.`
}

const cap = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)
