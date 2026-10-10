# Archis

New names, built from ancient roots. A Phansora product.

You type the ideas a name should carry — `wolf, winter, loyal` — and Archis finds the roots
that mean those things across the old languages and blends them into words that have
never been said. Click a name and it shows exactly what it was made from.

**Every name is newly coined.** The roots are real dictionary entries; the names are not.
Nothing here is presented as a historical word, and the detail panel says so on every
name. Roots from Tolkien's invented languages are in the database too, and are always
labeled as invented, never as ancient.

## Running it

```bash
npm install
npm run dev
```

Nothing to configure. The name engine runs in the browser, and the root database is
already in the repository (`src/data/generated/`), so a build needs nothing but Node.

```bash
npx jiti scripts/battery.ts        # ~90 everyday searches through the real engine
npx jiti scripts/battery.ts wolf   # the names for one query, with their roots
```

The battery exits non-zero if any of its queries goes unread, or if one root keeps
answering unrelated queries. Run it after touching the reader, the scorer or the database.

## How a name is made

Four stages, one file each.

**1. Read the query** — `src/data/concepts.ts`
Every typed word is tried three ways, in this order:

1. *The word itself.* The database files each root under the plain English words of its
   gloss, so `wolf` finds lýkos, lupus, vṛ́ka and úlfr directly. About ten thousand
   meanings have roots.
2. *The hand-written vocabulary* — for words where what to reach for is a judgment.
   `software` has no ancient root; craft and tool do. Phrases are matched before single
   words, so `hidden knowledge` reads as concealment, not as two tags pulling apart.
3. *The thesaurus* in the database: what a word is a kind of, and what means the same.

A word that none of the three can read is reported on the page and contributes nothing.
**It is never answered with something else.** An earlier version fell back to a fixed set
of ideas — truth, knowledge, origin, light, memory — whenever it did not know a word, and
it knew about three hundred. `wolf`, `coffee shop` and `love` all returned the same nine
names about knowing, which from the outside is a search box that ignores you.

A query too thin to blend — one word, or two that mean much the same — widens along the
thesaurus at a lower weight, so the thing actually asked for still leads.

Two things about the house concepts (the `CONCEPTS` list) are worth knowing before adding
to the vocabulary. They read like ordinary English and are not: `order` is cosmic law —
ṛta, ma'at, dharma, dào — and `foundation` is entangled with truth, because five of the
hand-written roots carrying it (ʾemet, kittu, *ʾ-m-n, kun) are truth roots in traditions
where what is firm and what is true are one word.

**2. Gather roots** — `src/data/lexicon.ts` and `src/data/generated/`
Two sources, searched together:

- **The lexicon**: ~185 hand-written roots for the ideas Archis was first built around,
  each tagged and weighed by hand.
- **The database**: ~48,000 roots across 27 languages, generated from dictionaries by
  `scripts/build_roots.py` (see *The root database* below).

Each root carries two forms. `form` is the citation shape — how the tradition actually
writes it, diacritics and all — and it is what the detail panel shows. `stem` is what the
engine may cut up: plain ASCII, no laryngeals. Reconstructed roots cannot be blended in
their cited shape at all; `*ǵneh₃-` has to be `gno` before anything can be built from it.

The pool is capped at three roots per language and six per family (four for the invented
languages together). Greek and Latin have the deepest coverage for almost any meaning, so
an unbounded best-match pass returns a Greek-and-Latin page every time — the caps force
the pool wide before the scorer sees it. Within a language the picks are spread across
the ideas asked for, so `wolf, night` gets a wolf and a night from each, not two nights.

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

## Invented languages

The database includes roots from Tolkien's languages — Primitive Elvish, Quenya,
Sindarin, Telerin, Adûnaic, Khuzdul, Black Speech and Westron — taken from
[Eldamo](https://eldamo.org). Three rules keep that honest:

- **Tolkien's own words only.** Eldamo also records fan coinages and forms Tolkien struck
  out; the build drops both.
- **Always labeled.** These languages have the provenance `constructed`, and the detail
  panel badges every such root *Invented language*. They are never listed as ancient.
- **Roots, not words.** A name may be built from an Elvish root; it may not *be* an
  existing Elvish word, name or place. `src/data/blocklist.ts` drops any output that
  lands on one.

Separately, the lexicon has a handful of **euphonic endings** — `-iel`, `-ael`, `-eth`,
`-yr` — syllable shapes that carry no meaning at all. They may only close a name, never
lead one, and never meet each other, so a name is never built from sound alone. The
detail panel labels them *Sound only*.

## The root database

`src/data/generated/` is written by `scripts/build_roots.py` and committed, so deploying
needs none of what follows. To rebuild it:

```bash
data-src/fetch.sh                                   # once — about 2.5 GB of dumps
python3 -m venv data-src/venv
data-src/venv/bin/pip install nltk wordfreq
data-src/venv/bin/python scripts/build_roots.py     # --refresh after a new fetch
```

**Sources and licenses.** These are shown on the page (About → Sources) because the
licenses require it:

| source | what it gives | license |
|---|---|---|
| [Wiktionary](https://en.wiktionary.org), via the [kaikki.org](https://kaikki.org) extracts | the ancient and reconstructed languages | CC BY-SA 4.0 |
| Strong's Hebrew dictionary ([openscriptures/strongs](https://github.com/openscriptures/strongs)) | Biblical Hebrew and Biblical Aramaic | public domain |
| [Eldamo](https://eldamo.org), Paul Strack | Tolkien's languages | CC BY 4.0 |
| [WordNet](https://wordnet.princeton.edu), Princeton University | the English thesaurus | WordNet license |

CC BY-SA is share-alike: the generated database in `src/data/generated/` is a derivative
of Wiktionary and stays under CC BY-SA 4.0 whatever the rest of the code is licensed as.

**What gets in.** A dictionary entry becomes a root only when its leading sense comes
down to a plain English word people actually type (that word is how a query finds it),
its stem can be said, and its meaning is one a name can stand on. Modern coinages in old
languages are dropped — Wiktionary has a Sanskrit word for coffee — as are obscenities,
and any word whose first sense is one. Each language keeps at most two roots per meaning.

**How it is stored.** One file would be a megabyte to download before the first name. The
database is cut into 512 shards by a hash of the English word, each shard its own
fingerprinted file, and a search fetches only the few that hold the words it used.

**What is not in it.** Avestan, Phoenician and Proto-Semitic have no machine-readable
dump at the source used, so those three still have only their hand-written roots.
Classical Chinese likewise. The generated entries have not been proofread one by one:
the gloss and citation form on each are the dictionary's, and the detail panel shows both
so a name can be checked before it is used.

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
