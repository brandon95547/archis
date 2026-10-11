/**
 * Everyday searches run through the real engine.
 *
 *     npx jiti scripts/battery.ts          # one line per query, and the tallies
 *     npx jiti scripts/battery.ts -v       # with the names each one returned
 *     npx jiti scripts/battery.ts --mix    # with cross-language blending on
 *     npx jiti scripts/battery.ts wolf "coffee shop"
 *
 * This exists because of one bug. The reader once knew a few hundred words, and anything
 * else fell back to a fixed set of ideas — so eighty of these queries returned the same
 * nine names about truth and knowledge. It exits non-zero if any of these fails:
 *   · every query here is read, and gets at least one name
 *   · no root answers more than a sliver of unrelated queries
 *   · each language's joining rule still reproduces the real word it is modelled on
 *   · the worked examples on the landing page are still what the engine returns
 *   · the hand-written vocabulary points only at meanings that have roots
 *
 * A query that comes back with fewer names than asked for is reported and is not a
 * failure: a weak name is supposed to be left out.
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { LocalNameService } from '../src/services/localNameService'
import { CONCEPTS, CURATED_TARGETS } from '../src/data/concepts'
import { RootDatabase, type Shard } from '../src/data/roots'
import { compounds, derivations } from '../src/lib/formation'
import type { Root } from '../src/types'

const generated = fileURLToPath(new URL('../src/data/generated/', import.meta.url))
const load = async (index: number): Promise<Shard> =>
  JSON.parse(await readFile(`${generated}shards/${index}.json`, 'utf8'))
const loadAttested = async () => new Uint8Array(await readFile(`${generated}attested.bin`))

// Ordinary things people name: companies, products, pets, bands, characters, places.
const BATTERY: Record<string, string[]> = {
  business: ['fast delivery company', 'coffee shop', 'law firm', 'real estate', 'bakery', 'accounting software', 'marketing agency', 'fitness gym', 'trading app', 'consulting', 'wealth, trust, growth', 'money, gold, trade', 'security, protection, shield'],
  tech: ['cloud storage', 'artificial intelligence', 'data, network, speed', 'robot, machine, future', 'code, software, developer', 'video editing', 'voice assistant', 'search engine', 'game studio'],
  nature: ['ocean, wave, storm', 'mountain, stone, earth', 'forest, tree, leaf', 'river, rain, mist', 'moon, night, shadow', 'sun, summer, gold', 'winter, snow, ice', 'flower, garden, spring', 'wind, air, cloud', 'thunder, lightning'],
  animals: ['wolf', 'lion, courage', 'eagle, hawk, flight', 'horse, speed', 'dragon', 'raven, crow', 'bear, strength', 'serpent', 'fox, clever', 'cat', 'dog, loyal'],
  feeling: ['love, heart', 'joy, happiness', 'peace, calm, rest', 'hope, faith', 'courage, bravery', 'freedom', 'friendship, family', 'beauty, grace', 'anger, rage, fury', 'fear, dread', 'dream, sleep'],
  might: ['war, battle, victory', 'king, queen, crown', 'warrior, sword, shield', 'hunter', 'guardian, protector', 'hero, champion', 'empire, throne', 'iron, steel, forge', 'death, end, ruin', 'dark, chaos, void'],
  people: ['music, song, melody', 'dance', 'food, feast, wine', 'home, hearth', 'child, youth', 'mother, father', 'healer, medicine, health', 'teacher, school', 'traveler, ship, sea voyage', 'city, tower, gate', 'art, paint, color'],
  quality: ['fast, swift, quick', 'strong, bold', 'small, gentle, quiet', 'new, fresh, modern', 'pure, clean, simple', 'red, blood', 'blue, green', 'silver, white', 'luxury, elegant', 'wild, fierce', 'luck, fate, fortune'],
  house: ['truth, wisdom, hidden knowledge', 'memory, time, origin', 'light, discovery, consciousness', 'creation, transformation, order', 'awakening', 'enlightenment', 'prototype, model, synthesize'],
}

const service = new LocalNameService(load, loadAttested)
const mix = process.argv.includes('--mix')
const refinements = { length: 'medium', sound: 'balanced', era: 'balanced', count: 9, mix } as const
const args = process.argv.slice(2)
const verbose = args.includes('-v')
const asked = args.filter((arg) => !arg.startsWith('-'))

const show = (query: string, out: Awaited<ReturnType<LocalNameService['generate']>>) => {
  for (const n of out.names) {
    const roots = `[${n.language ?? "blend"}] ` + n.roots.map((u) => `${u.root.form} "${u.root.gloss}"${u.root.status === "verified" ? " ✓" : ""}`).join(" + ")
    console.log(`    ${n.name.padEnd(13)} ${n.interpretation.padEnd(44)} ${roots}`)
  }
  if (out.notice) console.log(`    · ${out.notice}`)
  void query
}

if (asked.length > 0) {
  for (const query of asked) {
    const out = await service.generate({ query, refinements })
    console.log(`\n"${query}"  →  ${out.concepts.slice(0, 8).join(', ')}`)
    show(query, out)
  }
  process.exit(0)
}

let failures = 0
const rootUse = new Map<string, number>()
let counted = 0
for (const [group, queries] of Object.entries(BATTERY)) {
  for (const query of queries) {
    const started = performance.now()
    const out = await service.generate({ query, refinements })
    const ms = Math.round(performance.now() - started)
    const unread = /could not read (.*)\./.exec(out.notice ?? '')?.[1]
    const state = out.names.length === 0 ? 'EMPTY' : unread ? 'PART ' : out.names.length < 9 ? 'SHORT' : 'OK   '
    if (state === 'EMPTY' || state === 'PART ') failures += 1
    console.log(`${state} [${group}] "${query}" → ${out.concepts.slice(0, 6).join(', ')}${unread ? `   ✗ ${unread}` : ''}  (${out.names.length} names, ${ms} ms)`)
    if (verbose) show(query, out)
    if (group !== 'house') {
      counted += 1
      const seen = new Set(out.names.flatMap((n) => n.roots.map((u) => u.root.id)).filter((id) => !id.startsWith('eu-')))
      seen.forEach((id) => rootUse.set(id, (rootUse.get(id) ?? 0) + 1))
    }
  }
}

// A root that turns up under a tenth of unrelated searches is the old bug coming back.
const busiest = [...rootUse.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
const worst = busiest[0]?.[1] ?? 0
console.log(`\nMost-used roots across ${counted} unrelated queries: ${busiest.map(([id, n]) => `${id} ×${n}`).join(', ')}`)
if (worst > counted / 10) {
  failures += 1
  console.log(`FAIL: one root answered ${worst} of ${counted} unrelated queries.`)
}

// Each language's joining rule, run on the real word it is modelled on. If the rule for
// Sindarin stops turning mor + coth into Morgoth, it is no longer Tolkien's rule.
const part = (language: string, word: string, pos: 'n' | 'a' = 'n', comb?: string): Root => ({
  id: `${language}:${word}`, form: word, stem: word, language, gloss: word, concepts: [word],
  weight: 0.9, pos, word, comb: comb ?? word, status: 'verified', kin: true,
})
const RULES: [string, Root, Root | null][] = [
  ['mordor', part('sindarin', 'morn', 'a'), part('sindarin', 'dor')],
  ['morgoth', part('sindarin', 'morn', 'a'), part('sindarin', 'koth')],
  ['osgiliath', part('sindarin', 'ost'), part('sindarin', 'giliath')],
  ['arwen', part('sindarin', 'ar', 'a'), part('sindarin', 'gwen')],
  ['fanuidhol', part('sindarin', 'fanui', 'a'), part('sindarin', 'dol')],
  ['anduin', part('sindarin', 'and', 'a'), part('sindarin', 'duin')],
  ['kalenhad', part('sindarin', 'kalen', 'a'), part('sindarin', 'sad')],
  ['elessar', part('quenya', 'elen'), part('quenya', 'sar')],
  ['eldamar', part('quenya', 'elda'), part('quenya', 'mar')],
  ['elendil', part('quenya', 'elen'), null],
  ['isildur', part('quenya', 'isil'), null],
  ['anarion', part('quenya', 'anar'), null],
  ['tindomiel', part('quenya', 'tindome'), null],
  ['philosophos', part('greek', 'philos', 'a', 'phil'), part('greek', 'sophos')],
  ['philanthropos', part('greek', 'philos', 'a', 'phil'), part('greek', 'anthropos')],
  ['philippos', part('greek', 'philos', 'a', 'phil'), part('greek', 'hippos')],
  ['nyktophylax', part('greek', 'nyx', 'n', 'nykt'), part('greek', 'phylax', 'n', 'phylak')],
  ['magnanimus', part('latin', 'magnus', 'a', 'magn'), part('latin', 'animus', 'n', 'anim')],
  ['agricultor', part('latin', 'ager', 'n', 'agr'), part('latin', 'cultor')],
  ['suryodaya', part('sanskrit', 'surya'), part('sanskrit', 'udaya')],
  ['rajaputra', part('sanskrit', 'rajan'), part('sanskrit', 'putra')],
  ['manoratha', part('sanskrit', 'manas'), part('sanskrit', 'ratha')],
  ['wulfstan', part('oldenglish', 'wulf'), part('oldenglish', 'stan')],
  ['asgard', part('oldnorse', 'ass', 'n', 'as'), part('oldnorse', 'gardr', 'n', 'gard')],
  ['figgragulth', part('gothic', 'figgrs', 'n', 'figgr'), part('gothic', 'gulth')],
  ['betlehem', part('hebrew', 'bayit', 'n', 'bet'), part('hebrew', 'lehem')],
  ['sharmati', part('akkadian', 'sharru', 'n', 'shar'), part('akkadian', 'matu', 'n', 'mat')],
  ['lugalkalama', part('sumerian', 'lugal'), part('sumerian', 'kalam')],
  ['nebtawy', part('egyptian', 'neb'), part('egyptian', 'tawy')],
  ['negusanagast', part('geez', 'negus'), part('geez', 'nagast')],
]
for (const [expected, first, second] of RULES) {
  const made = (second ? compounds(first, second) : derivations(first)).map((m) => m.name)
  if (!made.includes(expected)) {
    failures += 1
    console.log(`FAIL: ${first.language} no longer forms "${expected}" — got ${made.join(', ') || 'nothing'}.`)
  }
}

// The worked examples on the landing page (src/components/landing.tsx) say they are what
// the engine returns for the query on the card. This is what keeps that true.
const LANDING: [string, string][] = [
  ['truth, light, order', 'Leohtsoth'],
  ['wisdom, memory, origin', 'Mnemarkhe'],
  ['hidden knowledge, discovery, transformation', 'Krypteurema'],
]
for (const [query, name] of LANDING) {
  // The cards were captured with the defaults, whatever this run was asked to use.
  const out = await service.generate({ query, refinements: { ...refinements, mix: false } })
  if (!out.names.some((n) => n.name === name)) {
    failures += 1
    console.log(`FAIL: the landing page shows ${name} for "${query}", and the engine no longer returns it.`)
  }
}

// The hand-written vocabulary points at meanings by name. One that has no roots is a
// word that reads as understood and then contributes nothing.
const db = new RootDatabase(load)
const targets = await db.lookup(CURATED_TARGETS)
const dead = CURATED_TARGETS.filter(
  (m) => !(CONCEPTS as readonly string[]).includes(m) && targets.get(m)!.roots.length === 0,
)
if (dead.length > 0) {
  failures += 1
  console.log(`FAIL: the vocabulary points at meanings with no roots: ${dead.join(', ')}`)
}

console.log(failures === 0 ? '\nAll read, all answered.' : `\n${failures} problem(s).`)
process.exit(failures === 0 ? 0 : 1)
