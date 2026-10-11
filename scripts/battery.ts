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
 *   · the words of a search are equals: each is answered, none has to share a name or a
 *     language with the others, and the order they are typed in changes nothing
 *   · every word has a field of associations, the reader follows it outward in rings, and
 *     a word reached in one sense is not followed in another
 *   · a search goes on: "More names" keeps finding fresh ones, hundreds deep, in many
 *     languages, without repeating one or miscounting the languages on the page — and
 *     asked for 250 at once it returns the same names it gives nine at a time
 *   · and a search that does run out says it is exhausted rather than that it failed
 *
 * A query that comes back with fewer names than asked for is reported and is not a
 * failure: a weak name is supposed to be left out.
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { LocalNameService } from '../src/services/localNameService'
import { appendPage } from '../src/services/pages'
import { traditions } from '../src/lib/traditions'
import { CONCEPTS, CURATED_TARGETS, MAX_DEPTH, interpret } from '../src/data/concepts'
import { RootDatabase, type Shard } from '../src/data/roots'
import { compounds, derivations } from '../src/lib/formation'
import type { GenerationResult, Root } from '../src/types'

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
  // The endings and openings: one root, and the real word the rule is modelled on.
  ['hippon', part('greek', 'hippos', 'n', 'hipp'), null],
  ['hippeus', part('greek', 'hippos', 'n', 'hipp'), null],
  ['hermogenes', part('greek', 'hermes', 'n', 'herm'), null],
  ['montanus', part('latin', 'mons', 'n', 'mont'), null],
  ['famosus', part('latin', 'fama', 'n', 'fam'), null],
  ['argentarius', part('latin', 'argentum', 'n', 'argent'), null],
  ['bocere', part('oldenglish', 'boc'), null],
  ['cyningdom', part('oldenglish', 'cyning'), null],
  ['domari', part('oldnorse', 'domr', 'n', 'dom'), null],
  ['bokareis', part('gothic', 'boka', 'n', 'bok'), null],
  ['staineins', part('gothic', 'stains', 'n', 'stain'), null],
  ['kuningaz', part('pgmc', 'kunja', 'n', 'kun'), null],
  ['eburakos', part('pcelt', 'eburos', 'n', 'ebur'), null],
  ['bhagavat', part('sanskrit', 'bhaga'), null],
  ['jalaja', part('sanskrit', 'jala'), null],
  ['silavant', part('pali', 'sila'), null],
  ['abishalom', part('hebrew', 'shalom'), null],
  ['engedi', part('hebrew', 'gedi'), null],
  ['ekur', part('sumerian', 'kur'), null],
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
  ['truth, light, order', 'Phaonta'],
  ['wisdom, memory, origin', 'Mnemarkhe'],
  ['hidden knowledge, discovery, transformation', 'Fundari'],
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

// The words of a search are equals, and each is its own source of names.
//
// This is the search the rule was written on. No ancient language has a word for a piano,
// "teach" is a verb, and no one language has roots for all four — which is fine, because
// nothing asks one to. What must hold: every word is answered by some name, every name
// sits inside a single language, the page is a mix of languages and of single roots and
// joined ones, and typing the words in another order returns the same page.
const fail = (message: string) => {
  failures += 1
  console.log(`FAIL: ${message}`)
}
const EQUALS = ['piano', 'music', 'education', 'teach']
const ANSWERS: Record<string, string[]> = {
  piano: ['harp', 'lute'],
  music: ['music'],
  education: ['education', 'teacher', 'instruction'],
  teach: ['teacher', 'instruction'],
}
const plain = { ...refinements, mix: false }
const page = await service.generate({ query: EQUALS.join(', '), refinements: plain })
if (page.names.length < plain.count) fail(`"${EQUALS.join(', ')}" filled ${page.names.length} of ${plain.count} names.`)
for (const word of EQUALS) {
  const answered = page.names.some((n) => n.roots.some((u) => u.root.concepts.some((c) => ANSWERS[word].includes(c))))
  if (!answered) fail(`no name for "${EQUALS.join(', ')}" draws on "${word}".`)
}
if (/No name here draws on/.test(page.notice ?? '')) fail(`a word of "${EQUALS.join(', ')}" went unanswered: ${page.notice}`)
const strays = page.names.filter((n) => !n.language || n.roots.some((u) => u.root.language !== n.language))
if (strays.length > 0) fail(`with one language per name, ${strays.map((n) => n.name).join(', ')} mixed languages.`)
if (page.languages.length < 5) fail(`"${EQUALS.join(', ')}" drew on only ${page.languages.length} languages.`)
if (!page.names.some((n) => n.roots.length === 1) || !page.names.some((n) => n.roots.length === 2)) {
  fail(`"${EQUALS.join(', ')}" should show both single roots and joined ones.`)
}
const orders = (words: string[]): string[][] => words.length <= 1
  ? [words]
  : words.flatMap((word, i) => orders([...words.slice(0, i), ...words.slice(i + 1)]).map((rest) => [word, ...rest]))
for (const mixed of [false, true]) {
  const pages = new Set<string>()
  for (const order of orders(EQUALS)) {
    const out = await service.generate({ query: order.join(', '), refinements: { ...refinements, mix: mixed } })
    if (out.names.length === 0) fail(`"${order.join(', ')}" returned nothing${mixed ? ' with languages mixed' : ''}.`)
    pages.add(out.names.map((n) => n.name).sort().join(' '))
  }
  if (pages.size > 1) fail(`the order of the words changed the page for "${EQUALS.join(', ')}"${mixed ? ' with languages mixed' : ''}: ${pages.size} different pages.`)
}

// The field. scripts/build_field.py gives every word the meanings it leads to, and the
// reader follows them outward a ring at a time. Without them a search is what was typed
// and its synonyms, which is how "music, piano, learn" once ended at 44 names.
const music = await interpret('music', db, MAX_DEPTH)
for (const [meaning, ring] of [['melody', 1], ['harmony', 1], ['song', 1], ['hymn', 2], ['voice', 2]] as const) {
  if (music.rings.get(meaning) !== ring) {
    fail(`"music" should lead to ${meaning} at ring ${ring}, and it is at ${music.rings.get(meaning) ?? 'none'}. Has scripts/build_field.py been run?`)
  }
}
if ((music.weights.get('melody') ?? 0) <= (music.weights.get('hymn') ?? 1)) fail('what is two links from "music" weighs as much as what is one.')
// A word reached by association is followed in the sense it was reached in. The harp
// has strings, and its strings lead to the fiddle — not to rope, which is the other
// thing a string is. And the roots filed under "cub" are lions and bears, whatever
// WordNet says about greenhorns.
const harp = await interpret('harp', db, MAX_DEPTH)
if (!harp.rings.has('string')) fail('"harp" no longer leads to string.')
for (const stray of ['rope', 'twine', 'cord']) {
  if (harp.rings.has(stray)) fail(`"harp" leads to ${stray}: string was followed in the wrong sense.`)
}
if ((await interpret('learner, apprentice', db, MAX_DEPTH)).rings.has('cub')) fail('"learner" leads to cub, and every root under cub is an animal.')
// And typing the words in another order reads the same search, all the way out.
const reading = async (words: string[]) => {
  const read = await interpret(words.join(', '), db, MAX_DEPTH)
  return [...read.weights].map(([meaning, weight]) =>
    `${meaning}:${weight.toFixed(3)}:${(read.sources.get(meaning) ?? []).map((k) => read.keywords[k].text).sort().join('+')}`).sort().join(' ')
}
if (new Set(await Promise.all(orders(EQUALS).map(reading))).size > 1) fail(`the order of the words changed how "${EQUALS.join(', ')}" was read.`)

// A search goes on. "More names" is pressed sixty times on the search that used to end
// at 44: every press finds a full page of fresh names, the page never repeats one, and
// the count of languages above the grid — a claim about everything in it, which once
// read "39 names from 0 traditions" — stays true.
const WIDE = 'music, piano, learn'
let shown: GenerationResult = await service.generate({ query: WIDE, refinements: plain })
let widened = false
for (let presses = 0; presses < 60; presses += 1) {
  const next = await service.generate({ query: WIDE, refinements: plain, exclude: shown.names.map((n) => n.name) })
  shown = appendPage(shown, next)
  widened ||= /Also drawing on/.test(next.notice ?? '')
  if (next.names.length < plain.count) {
    fail(`"${WIDE}" ran dry after ${shown.names.length} names.`)
    break
  }
}
if (new Set(shown.names.map((n) => n.name)).size !== shown.names.length) fail('"More names" repeated a name.')
if (shown.languages.length === 0 || shown.languages.length !== traditions(shown.names).length) {
  fail(`"More names" reports ${shown.languages.length} languages for ${shown.names.length} names.`)
}
if (shown.languages.length < 12) fail(`${shown.names.length} names for "${WIDE}" came from only ${shown.languages.length} languages.`)
if (!widened) fail(`"${WIDE}" never said it was drawing on what the words lead to.`)
const mixedUp = shown.names.filter((n) => !n.language || n.roots.some((u) => u.root.language !== n.language))
if (mixedUp.length > 0) fail(`with one language per name, ${mixedUp.slice(0, 5).map((n) => n.name).join(', ')} mixed languages.`)
// The first page is still about what was typed: the search widens after it, not instead.
const first = shown.names.slice(0, plain.count)
for (const [word, answers] of [['music', ['music']], ['piano', ['harp', 'lute']], ['learn', ['learning', 'learner', 'apprentice']]] as const) {
  if (!first.some((n) => n.roots.some((u) => u.root.concepts.some((c) => (answers as readonly string[]).includes(c))))) {
    fail(`the first page for "${WIDE}" has no name on "${word}".`)
  }
}

// A search is asked for hundreds at once, which is how the page asks. The batch is the
// pages a person would have turned, nine at a time — nothing is lost or reshuffled by
// asking for them together — and the next batch repeats none of it.
const BATCH = 250
const batch = await service.generate({ query: WIDE, refinements: { ...plain, count: BATCH } })
const together = new Set(batch.names.map((n) => n.name))
if (batch.names.length !== BATCH || together.size !== BATCH) fail(`a batch of ${BATCH} for "${WIDE}" came back as ${batch.names.length} names, ${together.size} of them different.`)
const turned = shown.names.slice(0, Math.floor(BATCH / plain.count) * plain.count)
const lost = turned.filter((n) => !together.has(n.name))
if (lost.length > 0) fail(`a batch of ${BATCH} is missing ${lost.length} of the names the same pages give nine at a time: ${lost.slice(0, 5).map((n) => n.name).join(', ')}.`)
const after = await service.generate({ query: WIDE, refinements: { ...plain, count: BATCH }, exclude: batch.names.map((n) => n.name) })
if (after.names.length !== BATCH || after.names.some((n) => together.has(n.name))) fail(`the second batch of ${BATCH} for "${WIDE}" came back short or repeated the first.`)

// And a search that does run out says so. Honey is one word with two neighbours.
const SPARSE = 'honey'
let last: GenerationResult = await service.generate({ query: SPARSE, refinements: plain })
const seen = new Set(last.names.map((n) => n.name))
for (let presses = 0; last.names.length > 0; presses += 1) {
  if (presses === 200) {
    fail(`"${SPARSE}" never ran out.`)
    break
  }
  last = await service.generate({ query: SPARSE, refinements: plain, exclude: [...seen] })
  if (last.names.some((n) => seen.has(n.name))) fail('"More names" repeated a name.')
  last.names.forEach((n) => seen.add(n.name))
}
if (last.names.length === 0 && !/every name this search makes/.test(last.notice ?? '')) fail(`out of names, the page says: ${last.notice}`)

console.log(failures === 0 ? '\nAll read, all answered.' : `\n${failures} problem(s).`)
process.exit(failures === 0 ? 0 : 1)
