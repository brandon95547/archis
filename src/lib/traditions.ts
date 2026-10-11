import type { GeneratedName } from '../types'
import { LANGUAGES } from '../data/languages'

/**
 * The languages a set of names draws on, in the order they first appear.
 *
 * Counted from the names themselves, every time, because the count is a claim about what
 * is on the page. It used to be taken from the last batch fetched, so asking for more
 * names replaced the list with the newest page's — and when there were no more names to
 * give, with nothing: "39 names from 0 traditions".
 *
 * A euphonic ending is a sound, not a tradition, and is left out.
 */
export function traditions(names: GeneratedName[]): string[] {
  const seen = new Set<string>()
  for (const name of names) {
    for (const usage of name.roots) {
      if (LANGUAGES[usage.root.language]?.provenance !== 'phonetic') seen.add(usage.root.language)
    }
  }
  return [...seen]
}
