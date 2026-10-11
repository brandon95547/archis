/**
 * Names that already exist.
 *
 * A compound built by a language's own rules will sometimes be a word that language
 * already had: Greek lyk-ánthrōpos, Sindarin Mor-dor. Those are not coinages, and a name
 * offered here as new must not be one of them. This is the list they are checked against
 * — every headword in every source the database is built from, and every ordinary English
 * word, a little over two hundred thousand in all, written the way a coined name would be.
 *
 * Kept as a Bloom filter (scripts/build_roots.py writes it) because the words themselves
 * would be megabytes. It never misses a word that is on the list. About one new name in
 * fifty is wrongly taken for an old one and dropped, which costs nothing.
 *
 * What it does not know: inflected forms, and anything no source here has an entry for.
 */

/** Must match BLOOM_HASHES in scripts/build_roots.py. */
const HASHES = 6

export type AttestedLoader = () => Promise<Uint8Array>

function fnv(text: string, seed: number): number {
  let hash = (0x811c9dc5 ^ seed) >>> 0
  for (let i = 0; i < text.length; i += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193) >>> 0
  }
  return hash
}

export class Attested {
  private readonly load: AttestedLoader
  private bits: Promise<Uint8Array> | undefined

  constructor(load: AttestedLoader) {
    this.load = load
  }

  /** True when the name is, as far as the sources go, already a word. */
  async has(name: string): Promise<boolean> {
    this.bits ??= this.load()
    const bits = await this.bits
    const size = bits.length * 8
    for (let i = 0; i < HASHES; i += 1) {
      const bit = fnv(name, Math.imul(i, 0x9e3779b1) >>> 0) % size
      if ((bits[bit >> 3] & (1 << (bit & 7))) === 0) return false
    }
    return true
  }
}
