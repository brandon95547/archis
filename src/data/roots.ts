import type { Root } from '../types'

/**
 * The root database.
 *
 * The hand-written lexicon is a few hundred roots and ships with the app. This is the
 * other half: tens of thousands of roots taken from dictionaries, far too many to
 * download before the first name. So it is cut into shards by a hash of the English word
 * each root means, and a search fetches only the handful of shards that hold the words it
 * used. scripts/build_roots.py writes them and says where every entry came from.
 *
 * A shard holds two things, both keyed by an English word:
 *   · `r` — the roots that mean it, in every language that has one
 *   · `t` — the words near it, for a query word that has no root of its own
 */

/** Must match SHARDS in scripts/build_roots.py. */
export const SHARDS = 512

/** language, citation form, stem, gloss, meanings, part of speech, weight */
type Row = [string, string, string, string, string, 'n' | 'v' | 'a', number]

export interface Shard {
  t: Record<string, string>
  r: Record<string, Row[]>
}

export type ShardLoader = (index: number) => Promise<Shard>

/** FNV-1a, 32 bit — the same number scripts/build_roots.py computes. */
export function shardOf(word: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < word.length; i += 1) {
    hash = Math.imul(hash ^ word.charCodeAt(i), 0x01000193) >>> 0
  }
  return hash % SHARDS
}

/** What the database knows about one English word. */
export interface Entry {
  /** Roots that mean exactly this. Empty when no language here has a word for it. */
  roots: Root[]
  /** Nearby meanings in three tiers, closest first: synonyms, kin, distant kin. */
  near: [string[], string[], string[]]
}

const toRoot = ([language, form, stem, gloss, meanings, pos, weight]: Row): Root => {
  const concepts = meanings.split(' ')
  return {
    // Stable across rebuilds as long as the root itself is: a kept name stores its roots
    // whole, but the id is also what stops one root entering a pool twice.
    id: `${language}:${stem}:${concepts[0]}`,
    form,
    stem,
    language,
    gloss,
    concepts,
    weight,
    pos,
  }
}

export class RootDatabase {
  private readonly load: ShardLoader
  private readonly cache = new Map<number, Promise<Shard>>()

  constructor(load: ShardLoader) {
    this.load = load
  }

  private shard(index: number): Promise<Shard> {
    let pending = this.cache.get(index)
    if (!pending) {
      pending = this.load(index)
      // A failed fetch must not be remembered: the next search should try again rather
      // than inherit a rejection from a dropped connection.
      pending.catch(() => this.cache.delete(index))
      this.cache.set(index, pending)
    }
    return pending
  }

  /** Everything known about each word, fetched together. Unknown words come back empty. */
  async lookup(words: Iterable<string>): Promise<Map<string, Entry>> {
    const wanted = [...new Set(words)]
    const shards = await Promise.all(wanted.map((word) => this.shard(shardOf(word))))

    const out = new Map<string, Entry>()
    wanted.forEach((word, i) => {
      const shard = shards[i]
      const tiers = (shard.t[word] ?? '').split('|').map((tier) => tier.split(' ').filter(Boolean))
      out.set(word, {
        roots: (shard.r[word] ?? []).map(toRoot),
        near: [tiers[0] ?? [], tiers[1] ?? [], tiers[2] ?? []],
      })
    })
    return out
  }
}
