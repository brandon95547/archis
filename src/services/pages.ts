import type { GenerationResult } from '../types'
import { traditions } from '../lib/traditions'

/**
 * Put the next page of names under the ones already on screen.
 *
 * What the line above the grid says has to be true of everything in the grid, so the
 * languages are counted again from all of the names. Taking them from the new page alone
 * is how "More names" came to list only the newest page's languages over every name on
 * screen — and, once the search had run out, to report thirty-nine names from no
 * traditions at all, over a notice saying nothing could be made.
 *
 * A page with no names in it changes nothing but the notice, which is where the service
 * says the search has given everything it has.
 */
export function appendPage(shown: GenerationResult, next: GenerationResult): GenerationResult {
  const have = new Set(shown.names.map((name) => name.id))
  const names = [...shown.names, ...next.names.filter((name) => !have.has(name.id))]
  return { ...shown, names, languages: traditions(names), notice: next.notice }
}
