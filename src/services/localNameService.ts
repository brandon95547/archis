import type {
  GeneratedName, GenerationRequest, GenerationResult, NameService, Refinements, Root,
} from '../types'
import { Attested, type AttestedLoader } from '../data/attested'
import { interpret, type Interpretation } from '../data/concepts'
import { LANGUAGES } from '../data/languages'
import { LEXICON } from '../data/lexicon'
import { RootDatabase, type ShardLoader } from '../data/roots'
import { blendRoots, spellingVariants, type Blend } from '../lib/blend'
import { FORMING, compounds, derivations, sound, usable, type Formed } from '../lib/formation'
import { diversify, judge, judgeFormed, leastServed, meaningStrength } from '../lib/score'
import { traditions } from '../lib/traditions'
import { pronounce, syllableCount, titleCase } from '../lib/phonology'
import { fullMeaning, shortInterpretation } from '../lib/meaning'

/**
 * The name engine that runs in the browser.
 *
 * Two ways of making a name, and the difference is the product:
 *
 *   · FORMED (the default). Two roots from one language joined by that language's own
 *     rule, or one root with one of its language's name endings. See lib/formation.ts.
 *     The name means what its parts say and is shaped the way that language shapes words.
 *
 *   · BLENDED (only when `refinements.mix` is on). Two roots from two different languages
 *     cut and fused by sound. No language ever made a word that way, so it is something a
 *     person asks for — and an invented language is never blended with a real one.
 *
 * The words of a search are equals, and each is its own source. A name answers any one of
 * them, or joins two; nothing requires a name — or a language — to cover them all, and
 * a name is not ranked higher for carrying more of them. What the search is owed is a
 * page shared out between its words, which `spread` and `diversify` see to.
 *
 * Either way a name has to clear the same bars before it is shown: its roots are not
 * flagged in the audit, it can be said, and it is not already a word in any source the
 * database was built from. Fewer good names is the intended result of a strict search;
 * the page says how many cleared rather than padding the grid.
 *
 * Deterministic for a given query and refinement, with one exception: `exclude`. Asking
 * for more names has to give you different ones, and the only honest way to do that is to
 * remember what was already shown.
 */
export class LocalNameService implements NameService {
  readonly id = 'local'

  private readonly db: RootDatabase
  private readonly attested: Attested

  /** How a shard of the root database, and the list of existing words, are fetched. */
  constructor(loadShard: ShardLoader, loadAttested: AttestedLoader) {
    this.db = new RootDatabase(loadShard)
    this.attested = new Attested(loadAttested)
  }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    const { query, refinements, exclude = [] } = request
    const read = await interpret(query, this.db)
    const { concepts, weights, unmatched, recast, keywords } = read
    // "More names": the search already has a page on screen, and this is the next one.
    const more = exclude.length > 0

    // Nothing was read. There is no honest set of names for that: the old fallback built
    // them from Archis's own favorite ideas, and every unread query came back about truth.
    if (weights.size === 0) {
      return {
        names: [],
        concepts,
        languages: [],
        notice: `Archis could not read ${quote(unmatched) || 'that'}. Say what the name should mean in plain words — wolf, river, courage, gold.`,
      }
    }

    const excluded = new Set(exclude.map((n) => n.toLowerCase()))

    // A name that already exists is not a coinage. Checked last because it needs the
    // list, and only what is about to be ranked is worth checking.
    const unattested = async (ranked: Scored[]) => {
      const fresh: Scored[] = []
      for (const candidate of ranked) {
        if (!(await this.attested.has(candidate.name))) fresh.push(candidate)
      }
      return fresh
    }

    let fresh = await unattested(refinements.mix
      ? blended(read, refinements, excluded)
      : formed(read, refinements, excluded, FIRM))
    // A search no language can answer firmly — one rare word, say — is tried again with
    // the word's kin let in. Only then: the kin are what was not asked for.
    if (!refinements.mix && fresh.length < 3) {
      fresh = await unattested(formed(read, refinements, excluded, LOOSE))
    }

    const chosen = refinements.mix ? diversify(fresh, refinements.count) : spread(fresh, refinements.count)
    const names = chosen.map((entry) => entry.build())
    const languages = traditions(names)

    if (names.length === 0) {
      // Running out is not failing. The page already has every name this search makes,
      // and saying "nothing could be made" under thirty of them would be false.
      if (more) {
        return { names, concepts, languages, notice: 'That is every name this search makes. Change a word, or one of the settings above, for others.' }
      }
      const tried = (keywords.length > 0 ? keywords.map((k) => k.text) : concepts).slice(0, 4).join(', ')
      return {
        names,
        concepts,
        languages,
        // Each language is tried on its own, with whichever of the words it has. So what
        // failed here is the forming, not the coverage, and the notice must not suggest
        // that one language was expected to hold every word.
        notice: refinements.mix
          ? `Roots were found for ${tried}, but no blend of them was good enough to show. Another word for the same idea usually helps.`
          : `Roots were found for ${tried}, but none of them formed a name good enough to show. Try another word for the same idea, or set Languages to Mixed.`,
      }
    }

    // A word that was read and then appears in no name at all has to be owned up to: the
    // rest of the page would otherwise look like an answer to the whole search.
    const offered = new Set(fresh.flatMap((entry) => entry.keys))
    const verbs = new Set(recast.map(({ word }) => word))
    // A verb with no noun to stand for it is reported below, in its own words.
    const dropped = new Set(recast.filter(({ as }) => as.length === 0).map(({ word }) => word))
    const silent = keywords.filter((k, index) => !offered.has(index) && !dropped.has(k.text)).map((k) => k.text)
    const stoodIn = keywords.filter((k) => k.readAs.length > 0 && !verbs.has(k.text) && !silent.includes(k.text))

    return {
      names,
      concepts,
      languages,
      // Both things can be true at once, and the reading is the more important of them.
      notice: [
        unmatched.length > 0
          ? `Read as ${concepts.slice(0, 4).join(', ')}. Archis could not read ${quote(unmatched)}.`
          : null,
        // A verb cannot sit in a name as it is. Say what it was taken as, or that it
        // could not be taken as anything.
        ...recast.map(({ word, as }) => as.length > 0
          ? `"${word}" is a verb, and a name is built on nouns and adjectives, so it was read as ${as.join(', ')}.`
          : `"${word}" is a verb with no noun of its own here, so it was left out — a noun for the same idea will work.`),
        // No old language has a word for a piano. Say what was reached for instead, so
        // the harp in the panel is not a surprise.
        stoodIn.length > 0
          ? stoodIn.length === 1
            ? `None of these languages has a word for "${stoodIn[0].text}", so it was read as ${stoodIn[0].readAs.join(', ')}.`
            : `None of these languages has a word for ${stoodIn.slice(0, 3).map((k) => `"${k.text}"`).join(' or ')}: ${stoodIn.slice(0, 3).map((k) => `"${k.text}" was read as ${k.readAs.join(', ')}`).join('; ')}.`
          : null,
        silent.length > 0 && keywords.length > 1 && !more
          ? `No name here draws on ${quote(silent)}: nothing found for ${silent.length === 1 ? 'it' : 'them'} would form one.`
          : null,
        names.length < refinements.count
          ? more
            ? `${names.length} more, and that is the last of them for this search.`
            : `${names.length} ${names.length === 1 ? 'name' : 'names'} cleared the bar for this search — a weak name is left out rather than shown.`
          : null,
      ]
        .filter(Boolean)
        .join(' ') || undefined,
    }
  }
}

/** The words we could not place, quoted, at most three of them. */
function quote(words: string[]): string {
  return words.slice(0, 3).map((word) => `"${word}"`).join(', ')
}

interface Scored {
  name: string
  headId: string
  tailId: string
  score: number
  language?: string
  /** What the name says, so a page is not nine names that all say the same thing. */
  reading?: string
  /** Which of the typed words it answers, as indexes into the search's keywords. */
  keys: number[]
  /** The meanings its roots carry, so one meaning of a word does not take the whole page. */
  ideas?: string[]
  /**
   * How the name was made, so a page is not nine of one kind: "compound" for two roots
   * joined, otherwise the ending it was given — "Of the", "Son of the", "Little".
   */
  pattern?: string
  build: () => GeneratedName
}

/** What a root is answering: the asked-for meaning it carries most strongly. */
const answers = (root: Root, weights: Map<string, number>) =>
  root.concepts.reduce(
    (best, c) => ((weights.get(c) ?? 0) > (weights.get(best) ?? 0) ? c : best),
    root.concepts[0],
  )

/** A meaning counts as asked for when the query named it, not when it was widened to. */
const ASKED = 0.95

/** Below this a formed name is a technically valid word nobody would choose. */
const FLOOR = 52

/**
 * What answering the search is worth, at most, on top of how the name sounds. It is the
 * AVERAGE of the roots' strengths that is scaled, not their sum: a name on one root that
 * means exactly what was typed is as relevant as a compound of two, and ranking by the
 * sum is what used to put every thirteen-letter compound above every good short name.
 */
const RELEVANCE = 20

/** Two of the typed words in one sayable word is the richer name — by this much. */
const JOINED = 3

/**
 * How well a root must answer before a name is built on it. A root filed under an idea
 * only loosely — the head noun of a longer gloss, a distant relative from the thesaurus —
 * is fine as a search result and too thin to be half of a name's meaning.
 */
const FIRM = 0.5
const LOOSE = 0.3

// ── formed: one language, its own rules ────────────────────────────────────────────────

const PER_MEANING = 2
const PER_LANGUAGE_FORMED = 8
const COMPOUND = 'compound'

function formed(
  read: Interpretation,
  refinements: Refinements,
  excluded: Set<string>,
  firm: number,
): Scored[] {
  const { roots, weights, kinless, origin, sources } = read
  const byLanguage = new Map<string, Pick[]>()
  for (const root of roots) {
    if (!FORMING.has(root.language) || !usable(root)) continue
    const strength = meaningStrength(root, weights)
    if (strength < firm) continue
    const answer = answers(root, weights)
    const list = byLanguage.get(root.language) ?? []
    list.push({ root, strength, answer, keys: sources.get(answer) ?? [] })
    byLanguage.set(root.language, list)
  }

  // How many typed words have anything to build on. With two, a compound joins one idea
  // from each rather than two readings of the same word; with one, it may join the word
  // to its own wider kin. This is about what makes a compound worth having — it is not a
  // requirement that a name carry more than one of the words.
  const typed = new Set(
    [...byLanguage.values()].flat().map((entry) => origin.get(entry.answer)?.word).filter((w) => w !== undefined),
  ).size

  const out: Scored[] = []
  const seen = new Set<string>()

  const offer = (made: Formed, from: Pick[]) => {
    if (seen.has(made.name) || excluded.has(made.name)) return
    seen.add(made.name)
    // How it sounds: whether it can be said, how it sits, whether it will be remembered.
    const verdict = judgeFormed(made.name, refinements)
    if (verdict.rejected) return

    let score = verdict.score
    // How well it answers. One root or two, this is the same size of thing.
    score += (from.reduce((sum, pick) => sum + pick.strength, 0) / from.length) * RELEVANCE
    const keys = [...new Set(from.flatMap((pick) => pick.keys))]
    if (from.length === 2 && from[0].keys.some((a) => from[1].keys.some((b) => a !== b))) score += JOINED
    // A root a second dictionary confirms is worth more than one that stands alone.
    if (made.roots.every((u) => u.root.status === 'verified')) score += 2

    if (score < FLOOR) return
    out.push({
      name: made.name,
      headId: made.roots[0].root.id,
      tailId: made.roots[1]?.root.id ?? made.roots[0].root.id,
      score,
      language: made.language,
      reading: made.reading,
      keys,
      ideas: from.map((pick) => pick.answer),
      pattern: made.kind === 'compound' ? COMPOUND : (/^.*?\bthe\b/.exec(made.reading)?.[0] ?? made.reading.split(' ')[0]),
      build: () => fromFormed(made, score),
    })
  }

  for (const list of byLanguage.values()) {
    const picks = fairPicks(list)

    for (let i = 0; i < picks.length; i += 1) {
      for (let j = i + 1; j < picks.length; j += 1) {
        const a = picks[i]
        const b = picks[j]
        // Two roots that say the same thing make a name that says it twice.
        if (a.answer === b.answer) continue
        if (a.root.concepts.some((c) => b.root.concepts.includes(c))) continue
        // "Maker" and "creation" both came from the word "generate". Joined, they answer
        // that one word twice and the rest of the search not at all.
        const from = [origin.get(a.answer), origin.get(b.answer)]
        if (from[0] && from[1] && from[0].word === from[1].word && (typed > 1 || from[0].tier === from[1].tier)) continue
        const meanings = new Map([[a.root, a.answer], [b.root, b.answer]])
        for (const made of compounds(a.root, b.root, meanings)) offer(made, [a, b])
      }
    }
    for (const pick of picks) {
      if (firm === FIRM && (weights.get(pick.answer) ?? 0) < ASKED) continue
      for (const made of derivations(pick.root, pick.answer, !kinless.has(pick.answer))) offer(made, [pick])
    }
  }

  return out.sort((a, b) => b.score - a.score || (a.name < b.name ? -1 : 1))
}

interface Pick {
  root: Root
  strength: number
  /** The asked-for meaning the root carries most strongly. */
  answer: string
  /** The typed words that meaning answers. */
  keys: number[]
}

/**
 * The roots one language builds on for this search: the typed words take turns.
 *
 * Taking the strongest eight outright let whichever word had the most strong roots in a
 * language take most of its places: Latin has a dozen good words for teaching, and a
 * search that also asked for music got what was left over. Each word in turn sends its
 * best remaining root, two at most for any one meaning, until the language has enough or
 * has nothing left. A language that has roots for only one of the words sends those, and
 * that is a full answer from it.
 *
 * Deterministic: the same query always picks the same roots.
 */
function fairPicks(list: Pick[]): Pick[] {
  const stronger = (a: Pick, b: Pick) => b.strength - a.strength || (a.root.id < b.root.id ? -1 : 1)
  const remaining = [...list].sort(stronger)
  const turns = [...new Set(remaining.flatMap((pick) => (pick.keys.length > 0 ? pick.keys : [-1])))]
  const taken = new Map<string, number>()
  const picks: Pick[] = []
  const open = (pick: Pick, turn: number) =>
    (turn === -1 ? pick.keys.length === 0 : pick.keys.includes(turn)) && (taken.get(pick.answer) ?? 0) < PER_MEANING

  for (let going = true; going && picks.length < PER_LANGUAGE_FORMED;) {
    going = false
    // Within a round the word with the strongest root left goes first — not the word
    // that was typed first, which would make the order of a search matter at the cut.
    const round = turns
      .map((turn) => ({ turn, lead: remaining.find((pick) => open(pick, turn)) }))
      .filter((entry): entry is { turn: number; lead: Pick } => entry.lead !== undefined)
      .sort((a, b) => stronger(a.lead, b.lead))
    for (const { turn } of round) {
      if (picks.length >= PER_LANGUAGE_FORMED) break
      const index = remaining.findIndex((pick) => open(pick, turn))
      if (index < 0) continue
      const [pick] = remaining.splice(index, 1)
      picks.push(pick)
      taken.set(pick.answer, (taken.get(pick.answer) ?? 0) + 1)
      going = true
    }
  }
  return picks
}

/**
 * A page of formed names: the best, shared between the words that were typed and drawn
 * from as many languages as can supply one.
 *
 * Left to the score alone the page fills with whichever language has the shortest words
 * and whichever typed word has the most roots — "piano, music, education, teach" came
 * back as seven names about teaching and none about a piano. So the page is built one
 * name at a time, and two things decide each one.
 *
 * Whose turn it is. The words take turns, and whichever the page has heard least from
 * picks next. A word with nothing left simply stops taking turns; it holds no one else
 * up, and nothing requires a name or a language to answer more than one word. A word's
 * first name is its best whatever that scored — four words typed is four things asked
 * for — and after that it passes its turn rather than reach far below what the others
 * still have to offer.
 *
 * Which name. Its score, less what the page already has too much of: the same language,
 * the same root, the same meaning, the same ending, the same reading. These are prices
 * and not limits, so a search only two languages can answer still fills, and a much
 * better name is never left out to make room for a different one.
 *
 * The page is then read best-first, with the invented languages last, together, so they
 * are never mistaken for the old ones.
 */
function spread(ranked: Scored[], count: number): Scored[] {
  const chosen = new Set<Scored>()
  const perLanguage = new Map<string, number>()
  const rootUse = new Map<string, number>()
  const perReading = new Map<string, number>()
  const perKey = new Map<number, number>()
  const perIdea = new Map<string, number>()
  const perPattern = new Map<string, number>()
  const made = { joined: 0, single: 0 }
  const had = <K>(map: Map<K, number>, key: K) => map.get(key) ?? 0
  const bump = <K>(map: Map<K, number>, key: K) => map.set(key, had(map, key) + 1)
  const joined = (c: Scored) => c.pattern === COMPOUND

  // Two roots joined run longer than one root with an ending, and score lower for it
  // across the board. Both are answers, so the joined names are lifted toward the single
  // ones — but by a bounded amount: enough for a good compound to stand beside a good
  // single-root name, never enough to carry a clumsy one onto the page.
  const top = (kind: boolean) => ranked.find((c) => joined(c) === kind)?.score ?? 0
  const lift = Math.max(0, Math.min(LIFT, top(false) - top(true)))

  const worth = (c: Scored) => {
    let value = c.score + (joined(c) ? lift : 0)
    value -= had(perLanguage, c.language ?? '') * PRICE.language
    value -= (had(rootUse, c.headId) + (c.tailId !== c.headId ? had(rootUse, c.tailId) : 0)) * PRICE.root
    value -= had(perReading, c.reading ?? c.name) * PRICE.reading
    // One more of the same kind, and for a single root one more with the same ending.
    value -= (joined(c) ? made.joined : made.single) * PRICE.kind
    if (!joined(c)) value -= had(perPattern, c.pattern ?? '') * PRICE.ending
    value -= (c.ideas ?? []).reduce((sum, idea) => sum + had(perIdea, idea), 0) * PRICE.idea
    return value
  }

  const words = [...new Set(ranked.flatMap((c) => c.keys))]
  // A tie between two names is settled the same way everywhere here: the better score,
  // then the alphabet. Never by which word was typed first — the order of a search is
  // not a ranking of its words, and "music, piano" must come back as "piano, music" does.
  const before = (a: Scored, b: Scored) => {
    const [x, y] = [worth(a), worth(b)]
    return x > y || (x === y && (a.score > b.score || (a.score === b.score && a.name < b.name)))
  }
  const bestOf = (pool: Scored[]) =>
    pool.reduce<Scored | undefined>((best, c) => (!best || before(c, best) ? c : best), undefined)
  while (chosen.size < count) {
    const left = ranked.filter((c) => !chosen.has(c))
    if (left.length === 0) break
    // What each word would take if it were its turn; `left` is best-first, so its head
    // is the best any of them still has.
    const offers = words
      .map((word) => ({ word, best: bestOf(left.filter((c) => c.keys.includes(word))) }))
      .filter((offer): offer is { word: number; best: Scored } =>
        offer.best !== undefined && (had(perKey, offer.word) === 0 || offer.best.score >= left[0].score - REACH))
      // Whoever the page has heard least from goes first.
      .sort((a, b) => had(perKey, a.word) - had(perKey, b.word) || (before(a.best, b.best) ? -1 : 1))
    const pick = offers[0]?.best ?? bestOf(left)!
    chosen.add(pick)
    // A name that joins two of the words is counted for both of them.
    pick.keys.forEach((key) => bump(perKey, key))
    pick.ideas?.forEach((idea) => bump(perIdea, idea))
    bump(perPattern, pick.pattern ?? '')
    made[joined(pick) ? 'joined' : 'single'] += 1
    bump(perLanguage, pick.language ?? '')
    bump(perReading, pick.reading ?? pick.name)
    bump(rootUse, pick.headId)
    if (pick.tailId !== pick.headId) bump(rootUse, pick.tailId)
  }

  const page = [...chosen].sort((a, b) => b.score - a.score || (a.name < b.name ? -1 : 1))
  const invented = (entry: Scored) => LANGUAGES[entry.language ?? '']?.provenance === 'constructed'
  return [...page.filter((c) => !invented(c)), ...page.filter(invented)]
}

/** The most a joined name is lifted toward the single-root ones when a page is chosen. */
const LIFT = 10

/** How far below the best name left a word may reach for its second name and later ones. */
const REACH = 25

/** What one more of the same costs a name, in points of score, when a page is chosen. */
const PRICE = { language: 7, root: 12, reading: 8, ending: 3, kind: 2, idea: 3 }

function fromFormed(made: Formed, score: number): GeneratedName {
  return {
    id: `${made.roots.map((u) => u.root.id).join('__')}__${made.name}`,
    name: titleCase(made.name),
    pronunciation: pronounce(made.name),
    interpretation: made.reading,
    meaning: `${made.reading}. ${made.roots.length === 2
      ? `Formed in ${LANGUAGES[made.language]?.name ?? made.language} from two of its own words`
      : `Formed in ${LANGUAGES[made.language]?.name ?? made.language} from one of its own words`}, the way that language forms them.`,
    blendNote: made.note,
    derivation: made.derivation,
    roots: made.roots,
    language: made.language,
    syllables: syllableCount(made.name),
    variants: [],
    score: Math.round(score),
  }
}

// ── blended: two languages, by sound, on request ───────────────────────────────────────

const PER_LANGUAGE = 3
const PER_FAMILY = 6

function blended(
  read: Interpretation,
  refinements: Refinements,
  excluded: Set<string>,
): Scored[] {
  const { roots, weights, sources } = read
  const keysOf = (root: Root) =>
    root.language === 'euphonic' || meaningStrength(root, weights) <= 0 ? [] : sources.get(answers(root, weights)) ?? []
  // The dictionary's copy of a root is the checked one; the hand-written lexicon fills in
  // only where the database has nothing with that stem. Flagged roots and verbs stay out.
  const have = new Set(roots.map((root) => `${root.language}:${root.stem}`))
  const candidates = [
    ...roots.filter((root) => sound(root) && root.pos !== 'v' && !root.gloss.startsWith('to ')),
    ...LEXICON.filter((root) => root.language !== 'euphonic' && !have.has(`${root.language}:${root.stem}`)),
  ]
  const pool = gatherRoots(candidates, weights, sources)
  const invented = (root: Root) => LANGUAGES[root.language]?.provenance === 'constructed'

  const scored: Scored[] = []
  for (const head of pool) {
    for (const tail of pool) {
      if (head.id === tail.id) continue
      // A euphonic ending has no meaning of its own, so it may only ever close a name —
      // never lead one, and never meet another of its kind. See the note in the lexicon.
      if (head.language === 'euphonic') continue
      // An invented language and a real one are never fused into one word.
      if (tail.language !== 'euphonic' && invented(head) !== invented(tail)) continue

      for (const blend of blendRoots(head, tail)) {
        if (excluded.has(blend.name)) continue
        const verdict = judge(blend, refinements, weights)
        if (verdict.rejected) continue
        const score = verdict.score + languageSpread(head, tail)
        if (score < FLOOR) continue
        scored.push({
          name: blend.name,
          headId: head.id,
          tailId: tail.id,
          score,
          keys: [...new Set([...keysOf(head), ...keysOf(tail)])],
          build: () => fromBlend(blend, score),
        })
      }
    }
  }
  return scored.sort((a, b) => b.score - a.score)
}

/**
 * The roots worth blending for this query.
 *
 * Capped per language and per family on purpose. Greek and Latin have the deepest
 * coverage for almost any meaning, so an unbounded "best matches" pass returns a Greek
 * and Latin page every time. The caps force the pool wide before the scorer ever sees it.
 *
 * Within a language the picks are spread across what was asked for. Ask for "wolf, night"
 * and a language with two strong words for night must still send its wolf: taking the top
 * three by strength alone would fill the pool with whichever idea has the weightier roots
 * and leave nothing unlike to blend it with.
 */
function gatherRoots(candidates: Root[], weights: Map<string, number>, sources: Map<string, number[]>): Root[] {
  const byLanguage = new Map<string, { root: Root; strength: number }[]>()
  for (const root of candidates) {
    const strength = meaningStrength(root, weights)
    if (strength <= 0) continue
    const list = byLanguage.get(root.language) ?? []
    list.push({ root, strength })
    byLanguage.set(root.language, list)
  }

  const picked: { root: Root; strength: number }[] = []
  for (const list of byLanguage.values()) {
    const used = new Map<string, number>()
    // And across the words that were typed: a language's second pick should be for a
    // different word than its first, when it has one.
    const heard = new Map<number, number>()
    for (let n = 0; n < PER_LANGUAGE && list.length > 0; n += 1) {
      let bestIndex = 0
      let bestValue = -Infinity
      list.forEach((entry, i) => {
        const answer = answers(entry.root, weights)
        const key = leastServed(sources.get(answer), heard)
        const value = entry.strength - 0.2 * (used.get(answer) ?? 0) - (key === undefined ? 0 : 0.15 * (heard.get(key) ?? 0))
        // Ties go to the earlier id, so the same query always builds the same pool.
        if (value > bestValue || (value === bestValue && entry.root.id < list[bestIndex].root.id)) {
          bestValue = value
          bestIndex = i
        }
      })
      const [entry] = list.splice(bestIndex, 1)
      picked.push(entry)
      const answer = answers(entry.root, weights)
      used.set(answer, (used.get(answer) ?? 0) + 1)
      const key = leastServed(sources.get(answer), heard)
      if (key !== undefined) heard.set(key, (heard.get(key) ?? 0) + 1)
    }
  }

  picked.sort((a, b) => b.strength - a.strength || (a.root.id < b.root.id ? -1 : 1))
  const perFamily = new Map<string, number>()
  const pool: Root[] = []
  for (const { root } of picked) {
    const family = LANGUAGES[root.language]?.family ?? root.language
    if ((perFamily.get(family) ?? 0) >= PER_FAMILY) continue
    perFamily.set(family, (perFamily.get(family) ?? 0) + 1)
    pool.push(root)
  }

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

function fromBlend(blend: Blend, score: number): GeneratedName {
  const head = blend.head.root
  const tail = blend.tail.root
  return {
    id: `${head.id}__${tail.id}__${blend.name}`,
    name: titleCase(blend.name),
    pronunciation: pronounce(blend.name),
    interpretation: shortInterpretation(head, tail, blend.name),
    meaning: fullMeaning(head, tail, blend.name),
    blendNote: blend.note,
    derivation: blend.derivation,
    roots: [blend.head, blend.tail],
    syllables: syllableCount(blend.name),
    variants: spellingVariants(blend.name).map(titleCase),
    score: Math.round(score),
  }
}
