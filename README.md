# Archis

New names, built from ancient roots. A Phansora product.

You type the ideas a name should carry — `wolf, night` — and Archis finds the words for
them across the old languages and forms a new word from them **the way their own language
forms words**: Greek *lyk-o-nyx*, Latin *lup-i-nox*, Old Norse *nátt-úlf*, Sindarin
*draug-fuin*. Click a name and it shows the roots, what each means, and the rule that
joined them.

**Every name is newly coined.** The roots are real dictionary entries; the names are not.
Nothing is presented as a historical word, every name is checked against the headwords of
every source, and the panel says exactly what was and was not checked. Roots from Tolkien's
invented languages are in the database too: always labeled as invented, never joined to
an ancient root.

## Running it

```bash
npm install
npm run dev
```

Nothing to configure. The name engine runs in the browser, and the root database is
already in the repository (`src/data/generated/`), so a build needs nothing but Node.

```bash
npx jiti scripts/battery.ts               # ~90 everyday searches through the real engine
npx jiti scripts/battery.ts --mix         # the same, with cross-language blending on
npx jiti scripts/battery.ts "wolf, night" # the names for one query, with their roots
```

The battery exits non-zero if a query goes unread or comes back with no names, if one root
keeps answering unrelated queries, or if a worked example on the landing page is no longer
what the engine returns. Run it after touching the reader, the engine or the database.

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
ṛta, ma'at, dharma, dào — and `foundation` is entangled with truth, because two of the
hand-written roots carrying it (ʾemet, kittu) are truth roots in traditions where what is
firm and what is true are one word.

**2. Form the name** — `src/lib/formation.ts` *(the default)*
Two roots from **one** language, joined by that language's own rule; or one root with one
of that language's own name endings. Nothing is cut for sound and nothing is borrowed
across languages.

| language | how it joins two words | a real word made the same way |
|---|---|---|
| Ancient Greek | stem + **-o-** + word; the -o- drops before a vowel | *phil-ó-sophos* |
| Latin | stem + **-i-** + word | *agr-i-cola* |
| Sanskrit, Pali | stem + stem; vowels that meet merge (a + u → o) | *sūrya + udaya → sūryodaya* |
| Old English, Old Norse | bare stem straight onto the word | *Wulf-stān*, *Ás-garðr* |
| Gothic, Proto-Germanic | stem + **-a-** + word | *figgr-a-gulþ* |
| Proto-Celtic | stem + **-o-** + word | Gaulish *Dumn-o-rīx* |
| Old Persian | stem + **-a-** + word | *Arta-xšaça* |
| Hebrew | first noun in the construct state ("X of") | *bêt-leḥem* |
| Akkadian | construct state + genitive | *šar māti* |
| Sumerian | owner second, marked with -a(k) | *lugal kalam-ma* |
| Egyptian | one noun directly after another | *nb tꜣwy* |
| Ge'ez | first noun takes -a | *nəguśa nagaśt* |
| Quenya | stem + word; consonants assimilate (n + s → ss) | *elen + sar → Elessar* |
| Sindarin | second word's first consonant softens (c → g) | *mor + coth → Morgoth* |
| Khuzdul, Adûnaic, Black Speech | describing word first | *Kheled-zâram*, *Nazg-ûl* |

Single-root names use the language's own name elements — Greek *-ídēs* "son of", Latin
*-ānus* "of", Old English *-ing* "descendant of", Quenya *-ndil* "friend of", Sumerian
*En-* "lord of", Aramaic *Bar-* "son of" — each with the example it is modelled on.

The rules that keep this honest:

- **A language with no rule here forms no names.** Old Irish compounds lose vowels by
  rules this code does not model; Proto-Indo-European and Primitive Elvish roots cannot
  be said as cited. They stay in the database and are used only in blends.
- **A join the rule does not cover returns nothing.** Quenya allows only certain
  consonant clusters; a compound that would produce another is not Quenya and is dropped.
- **Nouns and adjectives only.** A verb needs its own derivation before it can sit in a
  compound — Latin *victor* is built on *vict-*, not *vincere* — and that is not guessed.
- **Each root is used in the form the rule calls for.** The database stores, beside the
  citation form, the *combining stem* (Greek *nykt-*, Latin *noct-*, Hebrew construct
  *bêt*) and the *whole word* (*nyx*, *nox*, *bayit*). The panel shows which went in.
- **The reading is literal.** "Night-wolf", "King of the land", "Son of the wolf" — the
  glosses of the parts in the order the grammar puts them, and nothing added.

**3. Or blend** — `src/lib/blend.ts` *(only with Languages → Mixed)*
The original engine: two roots from two different languages, cut and fused by sound. No
language ever made a word this way, so it is something the user asks for. Every join
trims a root back to the part that carries it, spends one vowel where two would collide,
or opens a cluster that cannot be said. An invented-language root is never blended with
an ancient one. The pool is capped at three roots per language and six per family, which
is what stops Greek and Latin from answering every query between them.

**4. Judge** — `src/lib/score.ts` and `src/services/localNameService.ts`
Rejection and ranking are separate. A hard rule written as a heavy penalty is eventually
outweighed by something else and ships the name anyway.

Rejected outright, in either mode: a root flagged in the audit; a name that is already a
headword in any source (see *Names that already exist*); brand lookalikes; unfortunate
substrings; fewer than two syllables or more than four; crowded consonants; too few or too
many vowels; two roots that mean the same thing; and anything scoring under a fixed floor.
**A weak name is left out rather than shown** — a search can come back with four names
instead of nine, and the page says so.

Ranked on: how directly the roots answer what was asked, whether a second dictionary
confirms them, requested length, sound and era, and how the name lands. The page is then
spread across languages — two names from any one language before a third — with the
invented languages last, together.

## Invented languages

The database includes roots from Tolkien's languages — Primitive Elvish, Quenya,
Sindarin, Telerin, Adûnaic, Khuzdul, Black Speech and Westron — taken from
[Eldamo](https://eldamo.org). Three rules keep that honest:

- **Tolkien's own words only.** Eldamo also records fan coinages and forms Tolkien struck
  out; the build drops both.
- **Always labeled.** These languages have the provenance `constructed`, and the detail
  panel badges every such root *Invented language*. They are never listed as ancient.
- **Roots, not words.** A name may be built from an Elvish root; it may not *be* an
  existing Elvish word, name or place. Every form Eldamo records — Tolkien's names of
  people and places included — is on the list a coined name is checked against.
- **Never mixed with a real language.** An Elvish name is built from Elvish roots by
  Elvish rules. Even with blending on, an invented root is not fused to an ancient one.
- **Tolkien's rules.** Quenya's cluster limits and assimilations, Sindarin's soft
  mutation of a compound's second element, and the name endings he used (-ndil, -ion,
  -iel, -wen) are what `src/lib/formation.ts` applies. Primitive Elvish roots are not
  turned into Quenya or Sindarin words: that takes sound laws this code does not have.

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

**Checked against, not shipped.** `scripts/verify_roots.py` confirms entries against a
second dictionary per language — Liddell–Scott–Jones and Strong's for Greek, Lewis & Short
and Whitaker's Words for Latin, Monier-Williams for Sanskrit, the PTS and New Concise
dictionaries for Pali, Bosworth–Toller for Old English, Zoëga and Cleasby–Vigfusson for
Old Norse, Wright's glossary for Gothic, Brown–Driver–Briggs for Hebrew, SEDRA for Syriac,
ePSD2 for Sumerian, the ORACC glossaries for Akkadian and the Thesaurus Linguae Aegyptiae
for Egyptian. Their URLs and licenses are in that file's header. None of their text is in
the app or the repository; two of them (PTS, SEDRA) are licensed for non-commercial use,
which reading them on the build machine to check a headword is and shipping them would
not be. Old Irish, Ge'ez, Hittite and Old Persian have no second source and are all
*unconfirmed*; the reconstructed languages are checked against their own attested
descendants.

**What gets in.** A dictionary entry becomes a root only when one of its first two senses
comes down to a plain English word people actually type (that word is how a query finds
it), its stem can be said, and its meaning is one a name can stand on. Each sense is its
own entry with its own gloss, so a name built on a word's second sense says the second
sense. Modern coinages in old languages are dropped — Wiktionary has a Sanskrit word for
coffee — as are obscenities and any word whose leading sense is one. Each language keeps
at most two roots per meaning, the better-attested first.

**The audit.** Every entry carries one of three marks, shown in the detail panel:

- *verified* — a second, independent source has the same word with an agreeing meaning
  (`scripts/verify_roots.py` lists the second sources); for Tolkien's languages, Eldamo
  cites the page he wrote it on.
- *unconfirmed* — one source, nothing against it, nothing to check it against.
- *flagged* — the source itself hedges the meaning, or marks the word rare or uncertain,
  or the meaning is only the word's third sense, or a second source has the word and its
  meaning could not be matched to ours, or (Tolkien) the form is an editor's
  reconstruction or has no citation. Flagged entries stay in the database, are never used
  to build a name, and are listed with the reason in `audit/flagged-roots.tsv`.

A flag is a reason to look, not a verdict. The second-source match is by shared words and
synonyms, so "shrill" against "loud-sounding" is flagged alongside real errors; the list
is there so a person can clear the first kind and fix the second.

The build prints the tally per language, and the About section shows the totals.

**Names that already exist.** A compound built by a language's own rules is sometimes a
word that language already had — *lyk-ánthrōpos*, *Mor-dor*. `src/data/generated/attested.bin`
is a Bloom filter over every headword in every source (about 150,000, Tolkien's names of
people and places included), and a name found in it is dropped. It knows headwords only:
an inflected form, or a word no source here records, is not caught, and the detail panel
says so instead of claiming a name has never been used.

**How it is stored.** One file would be a megabyte to download before the first name. The
database is cut into 512 shards by a hash of the English word, each shard its own
fingerprinted file, and a search fetches only the few that hold the words it used.

**What is not in it.** Avestan, Phoenician and Proto-Semitic have no machine-readable
dump at the source used, so those three still have only their hand-written roots, which
are used in blends only. Classical Chinese likewise. No fictional language other than
Tolkien's is included: each needs an openly licensed lexicon first.

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
