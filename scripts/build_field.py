#!/usr/bin/env python3
"""
The field of a word: what it is associated with, beyond what means the same.

    python scripts/build_field.py            # adds `a` to every shard in src/data/generated
    python scripts/build_field.py music wolf # prints the field of each word, writes nothing

scripts/build_roots.py gives every English word its roots (`r`) and a short thesaurus
(`t`): synonyms, and what the word is a kind of. That is enough to read a query and far
too little to explore from one. "Music" has twelve roots and one neighbour, musician —
so a search for it could only ever make a few dozen names, in the handful of languages
that happen to have a word glossed "music".

A person naming a music school is as well served by melody, harmony, song, tone and
rhythm, and the old languages have hundreds of roots for those. This script writes down,
for every word a search might use, the meanings it leads to:

  near   another word for it, a kind of it (music → melody, harmony), what it has or is
         part of (forest → tree), what it is built on (learn → learning) — and what the
         dictionaries themselves gloss together in two languages or more (ocean → sea)
  wider  one step out: what it is a kind of (silk → cloth), kinds of its kinds (music →
         composition → song), its siblings (wolf → fox, jackal), and the vocabulary of
         its subject (music → chord)

The reader (src/data/concepts.ts) follows these outward from each typed word, a ring at
a time and at a falling weight, so the names nearest what was typed are still ranked
first and the search no longer runs dry after forty.

Every entry points only at a meaning that has a root a name can be built on, in the part
of speech that is meant: "fleet:a" is fleet the adjective. Three things keep a link honest:

  · The sense it runs through is one the target word is really used in — "air" is a
    synonym of melody, and nobody who typed "music" meant the wind (`meant`).
  · The roots filed under the target are about that sense. WordNet has a cub as a
    greenhorn first; every root under "cub" is a lion's or a bear's. The roots' own
    glosses decide (`Field.carried`).
  · It is not one of dozens. A thing's kinds and its siblings are only company when
    there are few of them, unless it is alive: an oak and a pine are both trees, and a
    bakery and a shipyard are both workplaces.

The near links are stored grouped by the sense of the word they belong to, each group
with a few cue words that place that sense (`setting`). A search that reaches "string"
from a harp follows the group whose cues it already holds — fiddle, chord — and leaves
rope and twine alone. Each shard's entry is

    near links | wider links | cues of each group, ";" between groups | each near link's group

Run after build_roots.py: it reads the shards that script writes and adds to them, and
needs nothing else — no dictionary dumps, only WordNet. scripts/battery.ts fails if the
fields are missing.
"""
from __future__ import annotations

import collections
import functools
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_roots as br  # noqa: E402  (the English-side helpers, and WordNet, live there)

wn = br.wn
SHARD_DIR = br.OUT / 'shards'

NEAR_LIMIT = 10
WIDER_LIMIT = 12

# A field is only worth storing for a word someone might type, or one a field leads to.
MIN_ZIPF = 3.0
# The vocabulary of a subject is mostly jargon — "accelerando" is in the field of music.
MIN_DOMAIN_ZIPF = 3.3
# How deep in WordNet's tree a noun has to sit before its kinds are worth listing.
MIN_KIND_DEPTH = 4
# How much the roots under a word must agree on, in gloss words two of them share, before
# their silence about a sense counts as their being about something else.
MIN_AGREED = 4

# How much each kind of link is worth. NEAR and above is the word's own neighbourhood;
# the rest is one step out. The reader multiplies these into its weights as it goes, so
# what is two links from the query can never outrank what is one.
NEAR = 0.75
LINK = {
    'same': 1.0,        # another word for the same sense
    'kind': 0.9,        # a kind of it: music → melody
    'mates': 0.9,       # glossed together by the dictionaries of two languages or more
    'alike': 0.9,       # an adjective's near-synonyms
    'part': 0.85,       # what it has, or is part of: forest → tree
    'built': 0.85,      # built on the same word: learn → learning
    # What it is a kind of is a step OUT, so it is worth less than NEAR on purpose: the
    # reader takes it but does not go on from it. Bakery → shop is right, and shop's own
    # kinds — pharmacy, florist — are a bakery's siblings by the back door.
    'above': 0.7,
    'subject': 0.75,    # the subject it belongs to: chord → music
    'mate': 0.6,        # glossed together by one language, and in the same broad field
    'kind2': 0.6,       # a kind of a kind: music → composition → song
    'also': 0.6,        # "see also"
    'sibling': 0.55,    # another kind of the same thing: wolf → fox
    'jargon': 0.55,     # the vocabulary of the subject: music → chord
}

# The links that are a step out and not a step along: they hold only for a target whose
# roots are known to be about the sense that was meant. See Field.carried.
LOOSE = {'kind2', 'sibling', 'jargon', 'also'}

# How many of a kind there may be before its members stop being each other's company.
# Wolf, fox and jackal are the canines; a bakery and a shipyard are both workplaces.
MAX_SIBLINGS = 12
# How many kinds a thing may have and still be told by them — unless it is alive, which
# may have any number.
MAX_KINDS = 20
LIVING = {'noun.animal', 'noun.plant'}
# Where the kinds of a thing have least in common: what is made, what is done, what happens.
# Everything else is allowed twice as many.
LOOSE_KINDS = {'noun.artifact', 'noun.act', 'noun.event', 'noun.state', 'noun.process', 'noun.attribute'}
# How many words are kept to say which sense of a word a group of its links belongs to.
CUE_LIMIT = 8

# Too hollow to be an association, whichever way it was reached.
HOLLOW = br.STOP_KEYS | set('''
form manner kind type sort part parts piece member number set series use way ways means
time times place places side end top front back middle order level degree range size
shape name word term sense case example instance purpose result effect cause reason source
something someone anything thing things one two three first second
section division subdivision passage unit item element
'''.split())


# Words a gloss or a definition is held together with, which say nothing about its sense.
GLUE = frozenset('''
the and for with from that which are its one any some into not used especially etc such
other very more most being having made make who whose something someone person thing
'''.split())


def load_shards() -> list[dict]:
    return [json.loads((SHARD_DIR / f'{index}.json').read_text(encoding='utf8')) for index in range(br.SHARDS)]


def usable_meanings(shards: list[dict]) -> tuple[dict[str, set[str]], dict[str, int]]:
    """Which parts of speech each meaning has a buildable root in, and in how many languages."""
    pos_of: dict[str, set[str]] = collections.defaultdict(set)
    languages: dict[str, set[str]] = collections.defaultdict(set)
    for shard in shards:
        for meaning, rows in shard['r'].items():
            for row in rows:
                language, gloss, pos, status = row[0], row[3], row[5], row[9]
                # The same test the engine applies: a noun or adjective, not flagged.
                if pos in 'na' and status != 'f' and not gloss.startswith('to ') and row[7]:
                    pos_of[meaning].add(pos)
                    languages[meaning].add(language)
    return pos_of, {meaning: len(found) for meaning, found in languages.items()}


def gloss_mates(shards: list[dict]) -> dict[str, dict[str, int]]:
    """Meanings that share a root, and in how many languages they do."""
    roots: dict[tuple, list[str]] = {}
    for shard in shards:
        for rows in shard['r'].values():
            for row in rows:
                if row[9] != 'f':
                    roots[row[0], row[1], row[3]] = row[4].split(' ')
    together: dict[str, dict[str, set[str]]] = collections.defaultdict(lambda: collections.defaultdict(set))
    for (language, _, _), meanings in roots.items():
        for a in meanings:
            for b in meanings:
                if a != b:
                    together[a][b].add(language)
    return {a: {b: len(found) for b, found in mates.items()} for a, mates in together.items()}


def gloss_words(shards: list[dict]) -> dict[str, collections.Counter]:
    """What the roots filed under each meaning say besides the meaning itself."""
    said: dict[str, collections.Counter] = collections.defaultdict(collections.Counter)
    for shard in shards:
        for meaning, rows in shard['r'].items():
            for row in rows:
                if row[9] == 'f':
                    continue
                words = set(re.findall(r'[a-z]{3,}', row[3].lower())) | set(row[4].split(' '))
                said[meaning].update(words - GLUE - {meaning})
    return said


@functools.lru_cache(maxsize=None)
def signature(synset) -> frozenset:
    """The words that go with one sense of a word: its synonyms, its kind and the others of that kind, its kinds, its definition."""
    above = synset.hypernyms() + synset.instance_hypernyms()
    around = [synset] + above + synset.hyponyms() + [s for a in above for s in a.hyponyms()] \
        + synset.part_meronyms() + synset.part_holonyms() + synset.member_holonyms() \
        + synset.similar_tos() + synset.topic_domains()
    words = {l.name().lower() for s in around for l in s.lemmas() if '_' not in l.name()}
    for s in [synset] + above:
        words |= set(re.findall(r'[a-z]{3,}', s.definition().lower()))
    return frozenset(words - GLUE)


def setting(synset) -> list[str]:
    """
    The words that place one sense of a word: what it is called, what it is a kind and a
    part of, its subject, and then what its definition is made of — nearest first.
    """
    # WordNet hands back each of these in no fixed order, and the cues are cut to a few:
    # by name, or two builds of the same database keep different ones.
    named = lambda synsets: sorted(synsets, key=lambda s: s.name())
    above = named(synset.hypernyms()) + named(synset.instance_hypernyms())
    around = [synset] + above + named(synset.part_holonyms()) + named(synset.member_holonyms()) \
        + named(synset.substance_holonyms()) + named(synset.part_meronyms()) + named(synset.topic_domains()) \
        + named(synset.similar_tos()) + named(synset.attributes()) \
        + [s for a in above for s in named(a.hypernyms())]
    # "Stringed instrument" is two words that each say something.
    words = [part for s in around for l in s.lemmas() for part in l.name().lower().split('_')]
    words += re.findall(r'[a-z]{3,}', synset.definition().lower())
    return list(dict.fromkeys(words))


@functools.lru_cache(maxsize=None)
def senses_of(word: str, pos: str) -> tuple:
    tags = ('a', 's') if pos == 'a' else (pos,)
    return tuple(s for s in wn.synsets(word) if s.pos() in tags
                 and any(l.name().lower() == word for l in s.lemmas()))


def meant(word: str, synset) -> bool:
    """
    Whether this sense is one the word is really used in.

    "Honey" is a synonym of love and "strain" of melody, and both are true and useless:
    the roots filed under honey are about bees. A link is kept when the sense is the
    word's first, or its second and at least half as common as its first by WordNet's
    own counts — harmony is first of all agreement, and music a close second.
    """
    pos = 'a' if synset.pos() in ('a', 's') else synset.pos()
    senses = senses_of(word, pos)
    if synset not in senses:
        return False
    rank = senses.index(synset)
    if rank == 0:
        return True
    count = lambda s: next((l.count() for l in s.lemmas() if l.name().lower() == word), 0)
    top = max(count(s) for s in senses)
    return rank == 1 and (top == 0 or (count(synset) >= 1 and count(synset) * 2 >= top))


def nominals(verb: str) -> list[str]:
    """The nouns English builds on a verb: the act and the doer."""
    stems = [verb] + ([verb[:-1]] if verb.endswith('e') else []) + ([verb + verb[-1]] if re.search(r'[aeiou][bdgmnprt]$', verb) else [])
    return [stem + ending for stem in stems for ending in ('ing', 'er', 'or', 'ion', 'ation', 'ment', 'ance', 'ence')]


class Field:
    def __init__(self, pos_of: dict[str, set[str]], cover: dict[str, int], mates: dict[str, dict[str, int]],
                 said: dict[str, collections.Counter]):
        self.pos_of = pos_of
        self.cover = cover
        self.mates = mates
        self.said = said

    def carried(self, name: str, synset, sure: bool) -> bool:
        """
        Whether the roots filed under a word are about this sense of it.

        WordNet says a cub is first of all a greenhorn, so "learner" leads to "cub" — and
        every root filed under cub is a lion's or a bear's. Nerve is courage, and the
        roots filed under it are sinews. The roots' own glosses are the evidence of which
        sense the database holds. They are read by broad field and not by sense, because
        WordNet splits finer than a gloss can show: a flock of birds and a flock of sheep
        are two senses and one kind of thing.

        A link is dropped when the glosses say nothing for this field and speak for
        another, or agree among themselves on something else. A loose link — the jargon
        of a subject, a sibling — needs more: something said for it, or a word with only
        the one sense. Pacing is tempo in music, and its one root is a walk.
        """
        pos = 'a' if synset.pos() in ('a', 's') else synset.pos()
        senses = senses_of(name, pos)
        said = self.said.get(name, {})
        spoken: dict[str, int] = collections.defaultdict(int)
        for sense in senses:
            heard = sum(said.get(word, 0) for word in signature(sense) if word != name)
            spoken[sense.lexname()] = max(spoken[sense.lexname()], heard)
        if spoken[synset.lexname()] > 0:
            return True
        if max(spoken.values()) >= 2 or sum(count for count in said.values() if count >= 2) >= MIN_AGREED:
            return False
        return sure or len(senses) < 2

    def target(self, lemma, synset, generic_ok: bool, sure: bool) -> str | None:
        """A link to this lemma in this sense, if a name can be built on it."""
        name = lemma.name().lower()
        pos = 'a' if synset.pos() in ('a', 's') else synset.pos()
        if pos not in 'na' or not re.fullmatch(r'[a-z]+', name) or len(name) < 3:
            return None
        if name in HOLLOW or name in br.CRUDE or pos not in self.pos_of.get(name, ()):
            return None
        if not generic_ok and name in br.GENERIC_KEYS:
            return None
        if br.only_proper(name) or not meant(name, synset) or not self.carried(name, synset, sure):
            return None
        return f'{name}:{pos}'

    def cue(self, word: str, candidates) -> list[str]:
        """The few of these words that can say where a search is: real meanings, and not hollow ones."""
        kept = [c for c in dict.fromkeys(candidates)
                if c != word and c in self.pos_of and c not in HOLLOW and c not in GLUE
                and c not in br.GENERIC_KEYS and c not in br.CRUDE]
        return kept[:CUE_LIMIT]

    def of(self, word: str) -> tuple[list[str], list[str], list[list[str]], list[int]]:
        """
        The field of a word: its near links, its wider ones, and — for the near — which
        sense of the word each belongs to, with the words that place that sense.

        A word reached two links into a search was reached in ONE of its senses. String,
        reached from a harp, leads on to the fiddle and the chord, and not to rope and
        twine. The reader follows a group of links onward only when its cues, or the
        links themselves, tie back to where the search already is.
        """
        worth: dict[str, float] = {}
        # Which group each link belongs to: the index of the sense that gave it, or
        # DATABASE for what the dictionaries gloss together.
        via: dict[str, int] = {}
        senses = br.top_senses(word)
        DATABASE = len(senses)
        group = 0
        opposite = {a.name().lower() for s in senses for l in s.lemmas() for a in l.antonyms()}

        def keep(found: str, value: float, owner: int):
            if value > worth.get(found, 0):
                worth[found] = value
                via[found] = owner

        def add(synsets, link: str, floor: float = 0.0, nouns_only: bool = False):
            # Going up the tree, or sideways, lands on words that are above everything.
            generic_ok = link not in ('above', 'sibling', 'jargon', 'subject', 'also')
            for synset in synsets:
                if nouns_only and synset.pos() != 'n':
                    continue
                for lemma in synset.lemmas():
                    found = self.target(lemma, synset, generic_ok, link not in LOOSE)
                    if not found:
                        continue
                    name = found.split(':')[0]
                    if name == word or name in opposite or br.zipf(name) < floor:
                        continue
                    keep(found, LINK[link], group)

        for group, sense in enumerate(senses):
            pos = sense.pos()
            if pos == 'n':
                add([sense], 'same')
                # The kinds of a thing, when it is one thing. "Knowledge" sits so high in
                # the tree that its kinds are attitude, vocabulary and equivalence.
                # Nor of anything but a living thing that comes in dozens of kinds. An oak
                # and a pine are both trees; a machine's kinds are the calculator and the
                # digger, and a change's are acceleration and death.
                kinds = sense.hyponyms()
                sprawling = word in br.GENERIC_KEYS or (
                    sense.lexname() not in LIVING and len(kinds) > (MAX_KINDS if sense.lexname() in LOOSE_KINDS else 2 * MAX_KINDS))
                if sense.min_depth() >= MIN_KIND_DEPTH and not sprawling:
                    add(kinds, 'kind')
                    # And their kinds, through a kind that is a concept in its own right
                    # (music → composition → song), not a sense of some other word.
                    add([k for kind in kinds
                         if any(senses_of(l.name().lower(), 'n')[:1] == (kind,) and l.name().lower() not in HOLLOW
                                for l in kind.lemmas())
                         for k in kind.hyponyms()], 'kind2')
                add(sense.part_meronyms() + sense.substance_meronyms() + sense.member_meronyms(), 'part')
                add(sense.part_holonyms() + sense.substance_holonyms() + sense.member_holonyms(), 'part')
                add(sense.topic_domains(), 'subject')
                add(sense.in_topic_domains(), 'jargon', MIN_DOMAIN_ZIPF, nouns_only=True)
                add(sense.attributes(), 'part')
                for above in sense.hypernyms() + sense.instance_hypernyms():
                    if above.min_depth() < br.MIN_NOUN_DEPTH:
                        continue
                    add([above], 'above')
                    # Its siblings — for things, where a sibling is another of the kind
                    # (wolf, fox, jackal). Among feelings and qualities a sibling is as
                    # often the opposite: love sits beside hatred.
                    if sense.lexname() in br.CONCRETE and len(above.hyponyms()) <= MAX_SIBLINGS:
                        add(above.hyponyms(), 'sibling')
            elif pos in ('a', 's'):
                add([sense], 'same')
                add(sense.similar_tos(), 'alike')
                add(sense.attributes(), 'part')
                add(sense.also_sees(), 'also')
            for lemma in sense.lemmas():
                if lemma.name().lower() != word:
                    continue
                # The noun of a verb, the quality of an adjective: learn → learning, learner.
                # Not "creature" for "create": the animal is a different word by now.
                add([d.synset() for d in lemma.derivationally_related_forms()
                     if d.name().lower().startswith(word[:3])
                     and d.synset().lexname() not in ('noun.animal', 'noun.plant', 'noun.body', 'noun.Tops')], 'built')
                add([p.synset() for p in lemma.pertainyms()], 'built')
            if pos == 'v':
                # WordNet links learn to learner and not to learning. English says both.
                for noun in nominals(word):
                    first = senses_of(noun, 'n')[:1]
                    if first and 'n' in self.pos_of.get(noun, ()) and noun not in HOLLOW:
                        keep(f'{noun}:n', LINK['built'], group)

        # What the dictionaries gloss together. Two languages doing it is a real
        # association; one is as often a homonym — Hebrew tôr is "string" and "order" —
        # and is kept only when WordNet puts the two words in the same broad field.
        lexnames = {s.lexname() for s in senses}
        # Not for a verb: what shares a root with "create" is mostly other verbs, and the
        # nouns among them are what the verb happens to produce.
        verb_only = bool(senses) and all(s.pos() == 'v' for s in senses)
        for mate, support in ({} if verb_only else self.mates.get(word, {})).items():
            if mate in HOLLOW or mate in br.CRUDE or mate in opposite or not self.pos_of.get(mate):
                continue
            shared = any(s.lexname() in lexnames for p in 'na' for s in senses_of(mate, p)[:2])
            if support < 2 and not (shared and senses):
                continue
            # Untagged: the root that carries both is the evidence, whatever its part of speech.
            if not any(key.split(':')[0] == mate for key in worth):
                keep(mate, min(0.98, LINK['mates'] + 0.02 * (support - 2)) if support >= 2 else LINK['mate'], DATABASE)

        # "Inability" is filed under ability and is not an association of it.
        names = {key.split(':')[0] for key in worth}
        for key in list(worth):
            name = key.split(':')[0]
            if any(name == prefix + other for prefix in ('in', 'un', 'dis', 'non', 'im') for other in names | {word}):
                del worth[key]

        # Strongest link first; among equals, the meaning most languages have a root for,
        # so a ring of the search reaches as many of them as it can.
        rank = lambda key: (-worth[key], -self.cover.get(key.split(':')[0], 0), -br.zipf(key.split(':')[0]), key)
        near = sorted((k for k, value in worth.items() if value >= NEAR), key=rank)[:NEAR_LIMIT]
        wider = sorted((k for k, value in worth.items() if value < NEAR), key=rank)[:WIDER_LIMIT]

        # The groups the near links fall into, numbered as they first appear, and what
        # places each: a sense by its setting in WordNet, the database's by what its own
        # roots are glossed as.
        owners = list(dict.fromkeys(via[key] for key in near))
        said = self.said.get(word, {})
        # Ties by the alphabet: `said` was filled from sets, whose order changes run to run.
        cues = [self.cue(word, sorted((w for w, n in said.items() if n >= 2), key=lambda w: (-said[w], w))
                         if owner == DATABASE else setting(senses[owner]))
                for owner in owners]
        return near, wider, cues, [owners.index(via[key]) for key in near]


def main() -> None:
    shards = load_shards()
    pos_of, cover = usable_meanings(shards)
    field = Field(pos_of, cover, gloss_mates(shards), gloss_words(shards))

    asked = [arg for arg in sys.argv[1:] if not arg.startswith('-')]
    if asked:
        for word in asked:
            near, wider, cues, groups = field.of(word)
            print(word)
            for index, cue in enumerate(cues):
                print(f'  near  {" ".join(key for key, owner in zip(near, groups) if owner == index)}   ← {" ".join(cue)}')
            print(f'  wider {" ".join(wider)}')
        return

    # Every meaning that has roots, every word the thesaurus knows, and anything common
    # enough to be typed. Rare words with no roots are left to the thesaurus.
    words = set(cover)
    for shard in shards:
        words |= {word for word in shard['t'] if br.zipf(word) >= MIN_ZIPF}
    for shard in shards:
        shard['a'] = {}
    count = links = 0
    for word in sorted(words):
        if word in br.STOP_KEYS or word in br.CRUDE:
            continue
        near, wider, cues, groups = field.of(word)
        if near or wider:
            # near | wider | the cues of each group of near links | which group each is in
            shards[br.shard_of(word)]['a'][word] = '|'.join([
                ' '.join(near), ' '.join(wider), ';'.join(' '.join(cue) for cue in cues), ''.join(map(str, groups)),
            ]).rstrip('|')
            count += 1
            links += len(near) + len(wider)

    dump = lambda data: json.dumps(data, ensure_ascii=False, separators=(',', ':'), sort_keys=True)
    sizes = []
    for index, shard in enumerate(shards):
        text = dump(shard)
        sizes.append(len(text.encode('utf8')))
        (SHARD_DIR / f'{index}.json').write_text(text, encoding='utf8')
    print(f'{count} words have a field, {links} links ({links / max(count, 1):.1f} each)')
    print(f'{br.SHARDS} shards, {sum(sizes) / 1024:.0f} KB in all, largest {max(sizes) / 1024:.1f} KB')


if __name__ == '__main__':
    main()
