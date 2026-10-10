/**
 * Everyday searches run through the real engine.
 *
 *     npx jiti scripts/battery.ts          # one line per query, and the tallies
 *     npx jiti scripts/battery.ts -v       # with the names each one returned
 *     npx jiti scripts/battery.ts wolf "coffee shop"
 *
 * This exists because of one bug. The reader once knew a few hundred words, and anything
 * else fell back to a fixed set of ideas — so eighty of these queries returned the same
 * nine names about truth and knowledge. Two things are checked, and the script exits
 * non-zero if either fails:
 *   · every query here is read, and gets names
 *   · no root answers more than a sliver of unrelated queries
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { LocalNameService } from '../src/services/localNameService'
import { CONCEPTS, CURATED_TARGETS } from '../src/data/concepts'
import { RootDatabase, type Shard } from '../src/data/roots'

const shards = fileURLToPath(new URL('../src/data/generated/shards/', import.meta.url))
const load = async (index: number): Promise<Shard> =>
  JSON.parse(await readFile(`${shards}${index}.json`, 'utf8'))

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

const service = new LocalNameService(load)
const refinements = { length: 'medium', sound: 'balanced', era: 'balanced', count: 9 } as const
const args = process.argv.slice(2)
const verbose = args.includes('-v')
const asked = args.filter((arg) => arg !== '-v')

const show = (query: string, out: Awaited<ReturnType<LocalNameService['generate']>>) => {
  for (const n of out.names) {
    const roots = n.roots.map((u) => `${u.root.form} (${u.root.language}: ${u.root.gloss})`).join(' + ')
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
    if (state !== 'OK   ') failures += 1
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

// The worked examples on the landing page (src/components/landing.tsx) say they are what
// the engine returns for the query on the card. This is what keeps that true.
const LANDING: [string, string][] = [
  ['truth, light, order', 'Emetur'],
  ['wisdom, memory, origin', 'Sophokur'],
  ['hidden knowledge, discovery, transformation', 'Gnoseper'],
]
for (const [query, name] of LANDING) {
  const out = await service.generate({ query, refinements })
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
