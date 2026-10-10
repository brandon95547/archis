import type { Shard } from './roots'

/**
 * Every shard of the root database, as a function that fetches it.
 *
 * Each one becomes its own fingerprinted file under /assets at build time, so it is
 * fetched at most once and cached for as long as its bytes stay the same. This module is
 * itself loaded on the first search and not before: the list of five hundred file names
 * is forty kilobytes that a visitor reading the landing page has no use for.
 */
export const files = import.meta.glob<Shard>('./generated/shards/*.json', { import: 'default' })
