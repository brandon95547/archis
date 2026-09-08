# Archis

New names, built from ancient roots. A Phansora product.

You type the ideas a name should carry — `truth, wisdom, hidden knowledge` — and Archis
reads those concepts, gathers the strongest roots for them across the old languages, and
blends the roots into words that have never been said. Click a name and it shows exactly
what it was made from.

**Every name is newly coined.** The roots are real; the names are not. Nothing here is
presented as a historical word, and the detail panel says so on every name.

## Running it

```bash
npm install
npm run dev
```

Nothing to configure. The name engine runs in the browser.

## How a name is made

Four stages, one file each.

**1. Read the query** — `src/data/concepts.ts`
A vocabulary, not a parser. Phrases are matched before single words so `hidden knowledge`
reads as concealment rather than as two tags pulling apart. A query too thin to blend
widens along the strongest concept links; a query that matches nothing falls back to the
concepts Archis is built around rather than refusing — and says so in the accent colour,
because a fallback presented as a reading looks exactly like being ignored.

Two things about the tag names are worth knowing before adding to it. They read like
ordinary English and are not: `order` is cosmic law — ṛta, ma'at, dharma, dào — and
`foundation` is entangled with truth, because five of the roots carrying it (ʾemet, kittu,
*ʾ-m-n, kun) are truth roots in traditions where what is firm and what is true are one
word. Sending a making word like `model` to either of those answers a question about
building with names about truth.

**2. Gather roots** — `src/data/lexicon.ts`
~185 roots across Ancient Greek, Latin, Sanskrit, Pali, Ancient Egyptian, Sumerian,
Akkadian, Avestan, Old Persian, Biblical Hebrew, Aramaic, Phoenician, Classical Chinese,
Ge'ez, Proto-Indo-European and Proto-Semitic.

Each root carries two forms. `form` is the citation shape — how the tradition actually
writes it, diacritics and all — and it is what the detail panel shows. `stem` is what the
engine may cut up: plain ASCII, no laryngeals. Reconstructed roots cannot be blended in
their cited shape at all; `*ǵneh₃-` has to be `gno` before anything can be built from it.

The pool is capped at four roots per language. Greek and Latin have the deepest coverage
for almost any concept, so an unbounded best-match pass returns a Greek-and-Latin page
every time — the cap forces the pool wide before the scorer sees it.

**3. Blend** — `src/lib/blend.ts` and `src/lib/phonology.ts`
Never concatenate. Every join trims a root back to the part that carries it, spends one
vowel where two would collide, or opens a cluster that cannot be said:

| at the seam | what happens |
|---|---|
| same vowel twice | spent once — `soph` + `ia` |
| two different vowels | kept if English reads them as one sound, else the first gives way |
| two consonants | joined if the mouth already makes that pair, else a linking vowel opens it, harmonised to the vowel before |
| vowel then consonant | nothing to negotiate |

Syllabification is by maximal onset against a table of onsets an English reader starts a
syllable with. Everything works on romanised letters rather than IPA, deliberately: the
output is a name someone has to look at and say, so the spelling is the thing being judged.

**4. Judge** — `src/lib/score.ts`
Rejection and ranking are separate. A hard rule written as a heavy penalty is eventually
outweighed by something else and ships the name anyway.

How well a root answers the query is depth *and* breadth: the best-matching concept leads,
and each further concept the root also answers takes a share of the room left above it, so
the figure approaches 1 without ever reaching it on breadth alone. Depth alone was the
original rule, and it quietly filled the pool with whatever the lexicon weighed highest —
*lógos*, a root about words, arriving ahead of *sýnthesis* on a query about synthesis
because it happened to also carry `order`.

Rejected outright: brand lookalikes (edit distance, scaled to length), vocabulary from
invented languages, unfortunate substrings, one syllable or more than four, crowded
consonants, too few or too many vowels, three vowels in a row, a leading root that does not
answer the query, and two roots that mean the same thing — "light joined to light" is a
stutter, not a meaning.

Ranked on: meaning strength, requested length, flow, requested sound and era, how the name
lands (a final vowel or sonorant beats a chopped stop), and a penalty for the endings the
brief calls out — `-ora`, `-ara` and their family.

Then `diversify` walks the ranked list and takes a name only if it differs from what is
already taken: a different ending, a different opening, a different pair of roots. Without
it the same two roots return a dozen near-identical blends and crowd out everything else.

## Constructed languages

The brief allows phonetic inspiration from Quenya, Sindarin, Adûnaic and the like, and
forbids copying their vocabulary. Archis takes that line literally.

There are no words from any invented language in the lexicon. What exists is a handful of
**euphonic endings** — `-iel`, `-ael`, `-eth`, `-yr` — syllable shapes admired for how they
fall on the ear, carrying no meaning at all. They may only close a name, never lead one,
and never meet each other, so a name is never built from sound alone. The detail panel
labels them *Sound only*. `src/data/blocklist.ts` drops any output that lands on real
invented-language vocabulary anyway.

## The service seam

The UI only ever sees `NameService`:

```ts
interface NameService {
  readonly id: string
  generate(request: GenerationRequest): Promise<GenerationResult>
}
```

`LocalNameService` is the default and the reference implementation — a remote engine has to
produce the same shapes, and this is what those shapes look like filled in.

`DeepSeekNameService` posts to **your** backend, not to DeepSeek. A key in a `VITE_`
variable is compiled into the bundle and served to every visitor, so there is no version of
"call DeepSeek from the browser" that is not publishing the key. The route holds
`DEEPSEEK_API_KEY` server-side and forwards to `api.deepseek.com/chat/completions`. The
prompt lives in `src/services/deepseekNameService.ts`, next to the local engine that
enforces the same rules in code, so the two cannot drift.

Switch with `VITE_ARCHIS_ENGINE=deepseek`. Nothing else changes.

## Stack

React 19 · TypeScript · Vite · Tailwind v4 · lucide-react. No state library, no router, no
component framework — the app is one screen and a modal.
