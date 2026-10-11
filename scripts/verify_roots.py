#!/usr/bin/env python3
"""
Second-source verification of the Archis root database.

    data-src/fetch.sh                                  # once — the second sources, ~720 MB
    data-src/venv/bin/python scripts/verify_roots.py   # table + data-src/cache/verification.jsonl

    from verify_roots import Verifier
    verifier = Verifier(SRC)            # SRC = data-src; loads the cached indexes
    verifier.check(root)                # root = one object of cache/roots.selected.jsonl
    # -> {'status': 'verified' | 'conflict' | 'unconfirmed', 'by': 'lsj' | ... | None, 'note': str}

A root is VERIFIED when a dictionary other than the one it was taken from has the same
headword, in the same language, with a meaning that agrees with ours. It is a CONFLICT
when that dictionary has the headword and nothing in its entry agrees. Everything else is
UNCONFIRMED: the headword is not in any second source, the language has none, or the
match was too weak to count either way (the note says which).

Nothing here touches the network and nothing is random: the same root and the same
source files always give the same answer.


The second sources
──────────────────
All are free, need no account, and are fetched by data-src/fetch.sh into data-src/second/.
None of their text is shipped: they are read on the build machine to check our roots and
that is all, which is the only reason the two restricted ones (PTS, SEDRA) are usable.

  greek       lsj               Liddell-Scott-Jones, Greek-English Lexicon (1940), Perseus
                                TEI. github.com/PerseusDL/lexica  — CC BY-SA 3.0 US. 270 MB.
              strongs-greek     Strong's Greek dictionary (1890), openscriptures/strongs.
                                Public domain. 1.2 MB.
  latin       whitaker          Whitaker's WORDS, DICTLINE.GEN. github.com/mk270/whitakers-words
                                — free for any use (Whitaker's own license). 6 MB.
              lewis-short       Lewis & Short, A Latin Dictionary (1879), Perseus TEI.
                                github.com/PerseusDL/lexica — CC BY-SA 3.0 US. 77 MB.
  sanskrit    monier-williams   Monier-Williams Sanskrit-English Dictionary (1899), Cologne
                                Digital Sanskrit Dictionaries, mwxml.zip.
                                sanskrit-lexicon.uni-koeln.de — CC BY-SA 3.0. 12 MB.
  pali        ncped             New Concise Pali-English Dictionary, SuttaCentral sc-data.
                                github.com/suttacentral/sc-data — CC0. 3 MB.
              pts               Pali Text Society Pali-English Dictionary (1921-25), same
                                repository — CC BY-NC 3.0: NON-COMMERCIAL, checking only. 17 MB.
  oldenglish  bosworth-toller   Bosworth & Toller, An Anglo-Saxon Dictionary (1898, 1921),
                                Germanic Lexicon Project. germanic-lexicon-project.org
                                — public domain. 31 MB.
  oldnorse    zoega             Zoëga, Concise Dictionary of Old Icelandic (1910).
                                github.com/stscoundrel/old-icelandic-zoega — text public
                                domain, JSON MIT. 4 MB.
              cleasby-vigfusson Cleasby & Vigfusson, Icelandic-English Dictionary (1874).
                                github.com/stscoundrel/cleasby-vigfusson-dictionary — text
                                public domain, JSON MIT. 11 MB.
  gothic      wright            The glossary of Wright's Grammar of the Gothic Language
                                (1910), Germanic Lexicon Project — public domain. 0.5 MB.
  hebrew      bdb               Brown-Driver-Briggs (1906) in the OpenScriptures outline
  aramaic                       edition, with its index to Strong's numbers.
                                github.com/openscriptures/HebrewLexicon — CC BY 4.0. 5 MB.
              wiktionary-he     The kaikki.org Hebrew extract already in data-src.
              strongs-aramaic   The Aramaic entries of Strong's Hebrew (already in data-src),
                                for the Aramaic roots that came from Wiktionary.
              wiktionary-arc    The kaikki.org Aramaic / Classical Syriac extracts already in
                                data-src, for the Aramaic roots that came from Strong's.
              sedra             SEDRA 3, G. A. Kiraz's Syriac lexical database, as packaged
                                in npm sedrajs. "Personal and academic purposes", no
                                redistribution for profit: checking only. 2 MB.
  sumerian    epsd2             electronic Pennsylvania Sumerian Dictionary 2, ORACC JSON.
                                oracc.museum.upenn.edu/epsd2 — CC0. 213 MB zipped.
  akkadian    oracc-saao        The Akkadian glossary of State Archives of Assyria Online,
                                ORACC JSON. oracc.museum.upenn.edu/saao — CC0. 66 MB zipped.
  egyptian    aed-tla           The lemma list of the Thesaurus Linguae Aegyptiae in its
                                2018 "AED" release. github.com/simondschweitzer/aed-tei
                                — CC BY-SA 4.0. 18 MB.
  pie pgmc    descendants       No independent dictionary of a reconstruction exists. The
  pcelt                         raw kaikki entry is read instead: verified when it lists
                                attested descendants in two or more daughter languages.

  hittite, oldpersian, geez, oldirish — no free machine-readable second source was found
  (eDIL, the Chicago Hittite Dictionary, Kent and Leslau are not downloadable; Dillmann's
  Ge'ez lexicon is, but it glosses in Latin). Every root in them is "unconfirmed".
  Tolkien's languages (source eldamo:*) are skipped on purpose: unconfirmed, by=None.


Matching a headword
───────────────────
Exact string equality after a normalization that is fixed per language. No edit distance,
no stemming, no "close enough".

  greek       polytonic NFC; macron and breve dropped; accents and breathings KEPT. LSJ's
              Beta Code keys are transcribed to Unicode; homograph numbers dropped.
  latin       lower case; macrons, breves, hyphens and homograph numbers dropped; j=i, v=u.
              Whitaker lists stems, so its headword is rebuilt from stem + declension /
              conjugation code (a wrong rebuild misses, it cannot mis-verify).
  sanskrit    our Devanagari headword transliterated to SLP1 (MW's key); accents dropped;
              anusvara before a stop = the class nasal. Wiktionary cites verbs in the
              third person (tyájati) and MW by root, so those are not looked up at all.
  pali        NFC lower case; ṃ = ṁ.
  oldenglish  lower case; length marks, dots and hyphens dropped; ð = þ. If that misses,
              a LOOSE second try folds the early and late West Saxon spellings together
              (ie = y = i, io = eo, k = c).
  oldnorse    lower case; hyphens dropped; ǫ and ø = ö, ǿ = œ (the two dictionaries print
              them so). Acute accents KEPT — vin and vín are different words.
  gothic      our romanization; all diacritics and hyphens dropped (Wright marks aí/aú).
  hebrew      1. by Strong's number, through the OpenScriptures index, to the BDB entry;
              2. else the pointed form (cantillation and meteg dropped);
              3. else the consonantal skeleton — a LOOSE match (see below).
  aramaic     consonantal skeleton with Syriac letters mapped one-to-one onto Hebrew ones,
              and, for nouns, with the emphatic-state final alef dropped or added. Always
              LOOSE, except Strong's number → BDB.
  sumerian    the indexed sign reading (gug₂) against ePSD2's written forms; else the
              reading without its index against ePSD2's citation form. g̃/ĝ = ŋ, ḫ = h.
  akkadian    mimation dropped (šarrum = šarru): ORACC cites the later form without it.
  egyptian    Wiktionary and the TLA transliterate alike once the TLA's dots and hyphens
              are dropped and i̯ = j, u̯ = w, ḳ = q.

A LOOSE match is one where the spelling cannot tell homographs apart (unpointed Hebrew,
unvocalized Syriac, Aramaic across dialects). It may verify a root but never condemns
one: a disagreement there is reported as unconfirmed, because the other dictionary may
simply be describing a different word written with the same consonants.


Agreeing on a meaning
─────────────────────
Both sides are reduced to English content lemmas (lower case, British → American,
WordNet's `morphy`, a stop list of function and glossing words). Ours are the root's
`keys` — the words it is filed under — and theirs are the LEAD of the other entry: its
first few senses (per source, see `LEAD` below), because long entries quote enough English
to agree with anything.

  key      a lemma of one of our keys is in their lead (two words of theirs may be one
           of ours: "spear-head", "bed time")
  phrase   a whole alternative of our gloss is a whole alternative of theirs
           ("to go up" = "go up"), or is one of their words ("door post" = "doorposts")
  syn      a WordNet synonym of keys[0] is in their lead, or keys[0] is a synonym of one
           of their words
  hyper    a direct hypernym of keys[0] is in their lead ("crimson" → "red")
  hypo     keys[0] is the direct hypernym of one of their words ("box" ← "chest")
  deriv    a derivationally related word of keys[0] is ("innovate" → "innovation",
           "astral" → "star")
  similar  both are adjectives of one WordNet cluster ("rapid" and "swift" under "fast")
                                                             — all of the above → verified
  gloss    only some other content word of our gloss is shared            → unconfirmed
  deep     one of the above holds only beyond their lead                  → unconfirmed
  none     nothing above holds anywhere in their entry                    → conflict

WordNet is consulted for keys[0] only, in the root's part of speech: its first sense, and
the next two if WordNet's tagged corpus has the word in that sense at all.

A conflict is withheld — the root is left unconfirmed — when the other dictionary's entry
cannot be compared: it has no English gloss ("id.", "= foreg.", a German-only TLA lemma),
every entry with that spelling is another part of speech (our noun, their verb), or the
dictionary covers one corpus only (Strong's Greek and SEDRA the New Testament, the
Hebrew Wiktionary mostly the modern language).

Known weaknesses:
  · English homonyms. Our "bear" the animal agrees with their "to bear"; the lemma is the
    same string. Nothing here knows which sense a dictionary meant.
  · A WordNet neighbor can be a stretch, which is why the note always names the tier and
    the word that agreed. Set VERIFYING to ('key', 'phrase') for the strictest reading.
  · Near-synonyms WordNet does not link ("famine" / "hunger", "cane" / "reed", "fame" /
    "praise") come out as CONFLICT. So does a root whose gloss took a secondary sense
    ("beef" for the Akkadian word for an ox). A conflict is a root to look at, not
    a root that is wrong; about half are wording, half are real.
  · Old dictionaries gloss in Latin as well as English (Bosworth-Toller, Cleasby); an
    entry glossed only in Latin cannot agree.
  · Different citation conventions (assimilated prefixes in Latin, doubled consonants in
    Old English, ga- compounds in Gothic) are not bridged: unconfirmed.
  · The second sources have holes of their own. The Perseus file of LSJ lacks some
    ordinary entries (ἐκδοχή, ἀπόκρισις, βοηθός); Wright's glossary is 2,400 words; the
    ORACC glossary is the vocabulary of one archive. "Headword not in …" is weak evidence.
  · Wiktionary's editors used several of these same dictionaries. "Independent" here
    means a different publication, not an uncorrelated one.
"""

from __future__ import annotations

import collections
import functools
import html.entities
import json
import re
import tarfile
import time
import unicodedata
import zipfile
from pathlib import Path

import nltk

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'data-src'

# Bump when a parser or a normalization changes: every cached index is rebuilt.
VERSION = 14

wn = None  # WordNet, loaded by Verifier.__init__ from <src>/nltk_data


def load_wordnet(src_dir: Path):
    global wn
    if wn is not None:
        return
    nltk.data.path.insert(0, str(src_dir / 'nltk_data'))
    from nltk.corpus import wordnet
    wordnet.ensure_loaded()
    wn = wordnet


# ── English: what two glosses have in common ───────────────────────────────────────────

STOP = set('''
a an the of to in on at by for from with without into onto upon over under and or but not
no nor as than that this these those it its he she they them his her their one ones any
some all each every other another such same own very more most less least much many few
be is are was were been being am have has had do does did done make makes made get got
become became go goes come came put take took give let cause use used using thing things
something someone somebody anything kind kinds sort sorts type act state manner way esp
especially usually often sometimes also only merely properly literally figuratively lit
fig generally specifically certain various particular etc cf see viz ie eg sc opp
which who whom whose what where when while there here then thus so if up out off away
down back about above after again against along among around before behind below beneath
beside between beyond during except near since through toward towards until within
person persons man men anyone oneself self said called name named word term sense
form forms part parts place time times
m f n adj adv v vb verb noun masc fem neut pl sg sing plur dat acc gen nom abl inf perf
pres pass trans intr intrans subst prep conj pron num indecl comp sup id ib ibid col wr vl
cl pf aor impv subj pot fut gr ifc ind mfn mf nt cp cpd pp ppr ger caus med add adds
abs constr freq prob perh orig dim dimin pers impers refl rel interj neg poet metaph
small little large great big good bad full furnish provide pertain belong relate consist
contain resemble like send bring set keep hold turn call show find say together apart
'''.split())
# The part of the stop list that can never be a meaning: grammar, not vocabulary.
FUNCTION = set('''
a an the of to in on at by for from with without into onto upon over under and or but not
no nor as than that this these those it its he she they them his her their one ones any
some all each every other another such same own very more most less least much many few
is are was were been being am has had does did done esp especially usually often sometimes
also only merely properly literally figuratively lit fig generally specifically certain
various particular etc cf viz ie eg sc opp which who whom whose what where when while
there here then thus so if up out off away down about above after again against along
among around before behind below beneath beside between beyond during except near since
through toward towards until within anyone oneself something someone somebody anything
m f n adj adv v vb verb noun masc fem neut pl sg sing plur dat acc gen nom abl inf perf
pres pass trans intr intrans subst prep conj pron num indecl comp sup id ib ibid col wr vl
cl pf aor impv subj pot fut gr ifc ind mfn mf nt cp cpd pp ppr ger caus med add adds
abs constr freq prob perh orig dim dimin pers impers refl rel interj neg poet metaph
'''.split())
# Words that are meanings in their own right though they are also scaffolding: a gloss
# alternative made of nothing else ("to make", "man", "great") is still a whole meaning.
LIGHT = set('''
be have do make get become go come put take give let cause use thing kind sort type act
state manner way person man self name word form part place time small little large great
big good bad full furnish provide pertain belong relate consist contain resemble like send
bring set keep hold turn call show find say see
'''.split())
# "man", "person", "place", "time", "part", "name", "word" are in nearly every dictionary
# entry as scaffolding ("a man who…", "the place where…"). They may not carry an agreement
# on their own — unless they are the very thing a root is filed under, and then only when
# the other dictionary's gloss is little more than the word itself.

BRITISH = dict(pair.split('>') for pair in '''
grey>gray plough>plow mould>mold axe>ax judgement>judgment defence>defense offence>offense
pretence>pretense practise>practice jewellery>jewelry traveller>traveler storey>story
gaol>jail waggon>wagon shew>show shewn>shown connexion>connection centre>center
theatre>theater metre>meter fibre>fiber sabre>saber sombre>somber lustre>luster
sepulchre>sepulcher spectre>specter sceptre>scepter meagre>meager calibre>caliber
skilful>skillful wilful>willful fulfil>fulfill cosy>cozy artefact>artifact draught>draft
moustache>mustache sceptic>skeptic woollen>woolen marvellous>marvelous counsellor>counselor
enquiry>inquiry mediaeval>medieval aluminium>aluminum pedlar>peddler chastize>chastise
cheque>check kerb>curb tyre>tire ageing>aging manoeuvre>maneuver saviour>savior
'''.split())
BRITISH_ENDINGS = (('isation', 'ization'), ('ising', 'izing'), ('ised', 'ized'), ('iser', 'izer'),
                   ('ise', 'ize'), ('yse', 'yze'), ('ours', 'ors'), ('oured', 'ored'),
                   ('ouring', 'oring'), ('our', 'or'), ('lled', 'led'), ('lling', 'ling'),
                   ('ller', 'ler'))

WORD = re.compile(r'[a-z]+')
HTML_ENTITIES = html.entities.html5


def american(token: str) -> str:
    """
    "colour" → "color", "realise" → "realize" — only when the respelling is itself a word
    WordNet knows. The doubled-l rule would turn "filled" into "filed", so it is kept for
    words WordNet cannot otherwise read ("travelled").
    """
    token = BRITISH.get(token, token)
    if len(token) < 5:
        return token
    known = wn.morphy(token) is not None
    for old, new in BRITISH_ENDINGS:
        if token.endswith(old) and not (known and old.startswith('ll')):
            respelled = token[: -len(old)] + new
            if wn.morphy(respelled):
                return respelled
    return token


@functools.lru_cache(maxsize=None)
def bases(token: str) -> frozenset:
    """A gloss word and the dictionary forms behind it: "wolves" → wolves, wolf."""
    token = american(token)
    out = {token}
    for pos in ('n', 'v', 'a', 'r'):
        base = wn.morphy(token, pos)
        if base and '_' not in base:
            out.add(BRITISH.get(base, base))
    return frozenset(out)


def _tokens(text: str) -> list[str]:
    return WORD.findall(text.lower().replace('æ', 'ae').replace('œ', 'oe'))


def _compounds(text: str) -> set:
    """
    "spear-head", "bed time", "Cave-men": one dictionary's two words are another's one.
    A hyphenated pair is always tried; a spaced pair only when neither half is a function
    word, or "is land" would read as "island".
    """
    out = set()
    parts = re.findall(r'[a-z]+|[^a-z]+', text.lower())
    for k in range(len(parts) - 2):
        a, sep, b = parts[k], parts[k + 1], parts[k + 2]
        if not a.isalpha() or not b.isalpha() or sep not in ('-', ' '):
            continue
        if sep == ' ' and (a in STOP or b in STOP or len(a) < 3 or len(b) < 3):
            continue
        if wn.morphy(a + b):
            out |= bases(a + b)
    return out


@functools.lru_cache(maxsize=200_000)
def lemmas(text: str, keep_stop: bool = False) -> frozenset:
    out = set()
    for token in _tokens(text):
        if len(token) < 2 or (token in STOP and not keep_stop):
            continue
        found = bases(token)
        if keep_stop or not found & STOP:  # "belonging" is as empty as "belong"
            out |= found
    out |= _compounds(text)
    return frozenset(out)


def _phrase(piece: str) -> tuple:
    """A gloss alternative as a bare word sequence: "to go up" and "go up" are the same."""
    words = [american(w) for w in _tokens(piece)]
    while words and words[0] in ('to', 'a', 'an', 'the', 'be', 'i', 'ii', 'iii', 'iv', 'v', 'vi'):
        words = words[1:]
    return tuple(words)


@functools.lru_cache(maxsize=200_000)
def phrases(text: str) -> frozenset:
    """The alternatives of a gloss. "of" alone — from "of, pertaining to clergy" — is not one."""
    out = set()
    for piece in re.split(r'[;,|:()\[\]]|\bor\b', text):
        words = _phrase(piece)
        if any(w not in STOP or w in LIGHT for w in words):
            out.add(words)
    return frozenset(out)


WN_POS = {'n': ('n',), 'v': ('v',), 'a': ('a', 's'), 'r': ('r',)}


def _senses(word: str, pos: str, limit: int = 3):
    """
    The first sense of a word in a part of speech, and the next two only if WordNet's
    tagged corpus ever saw the word used that way — "dog" the frump and Hugo "Wolf" are
    senses nobody means.
    """
    kinds = WN_POS.get(pos, ('n', 'v', 'a', 's'))
    picked = []
    for synset in wn.synsets(word):
        mine = [l for l in synset.lemmas() if l.name().lower() == word]
        if synset.pos() not in kinds or not mine or synset.instance_hypernyms():
            continue
        if not picked or mine[0].count() >= 1:
            picked.append(synset)
        if len(picked) >= limit:
            break
    return picked


def _names(synsets) -> set:
    return {l.name().lower() for s in synsets for l in s.lemmas()}


@functools.lru_cache(maxsize=None)
def near(word: str, pos: str) -> dict:
    """
    What WordNet puts beside a key, from its leading senses in its own part of speech:
    synonyms, direct hypernyms, derivationally related words ("innovate" → "innovation",
    "astral" → "star"), and for an adjective the other members of its cluster ("rapid"
    and "swift" both hang off "fast"). Names are kept as WordNet gives them — "building"
    above "house" must not become "build" and agree with a verb.
    """
    senses = _senses(word, pos)
    # The build's part of speech is a guess for bare roots, and "midway" the noun is a
    # fairground: the first sense in each other part of speech is read as well.
    for other in ('n', 'v', 'a', 'r'):
        if other != pos:
            senses += [s for s in _senses(word, other, 1) if s not in senses]
    syn = _names(senses)
    hyper, deriv, similar = set(), set(), set()
    for sense in senses:
        hyper |= _names(sense.hypernyms())
        for lemma in sense.lemmas():
            if lemma.name().lower() == word:
                deriv |= {d.name().lower() for d in lemma.derivationally_related_forms() + lemma.pertainyms()}
        if sense.pos() == 's':
            heads = sense.similar_tos()
            similar |= _names(heads) | _names([x for h in heads for x in h.similar_tos()])
        elif sense.pos() == 'a':
            similar |= _names(sense.similar_tos())

    def clean(names: set, taken: set) -> frozenset:
        tidy = {n.replace('_', ' ') if '_' in n else american(n) for n in names}
        return frozenset(tidy - STOP - taken - {word})

    syn = clean(syn, set())
    hyper = clean(hyper, set(syn))
    deriv = clean(deriv, syn | hyper)
    similar = clean(similar, syn | hyper | deriv)
    return {'syn': syn, 'hyper': hyper, 'deriv': deriv, 'similar': similar}


@functools.lru_cache(maxsize=None)
def around(word: str, pos: str) -> tuple:
    """Synonyms and direct hypernyms of one of THEIR words, in OUR part of speech."""
    senses = _senses(word, pos, 2) if pos in WN_POS else []
    return (frozenset(_names(senses)), frozenset(_names([h for s in senses for h in s.hypernyms()])))


# Which kinds of agreement make a root "verified". 'gloss' — only some other content
# word of our gloss is shared — does not: it is reported as unconfirmed, with the word.
VERIFYING = ('key', 'phrase', 'syn', 'hyper', 'hypo', 'deriv', 'similar')


def agree(root_keys: tuple, root_gloss: str, pos: str, text: str):
    """
    How our reading of a root agrees with one stretch of another dictionary's entry:
    (tier, the word that agreed), or None.
    """
    theirs_all = lemmas(text, True)
    if not theirs_all:
        return None
    theirs = theirs_all - STOP
    for key in root_keys:
        mine = lemmas(key, True)
        if mine & STOP:
            # A scaffolding word ("man", "time") agrees only with a gloss that is little
            # more than the word itself.
            for piece in re.split(r'[;,|:()]', text):
                words = lemmas(piece, True)
                if words & mine and len(lemmas(piece)) <= 1 and len(_tokens(piece)) <= 3:
                    return 'key', sorted(words & mine)[0]
            continue
        hit = mine & theirs_all
        if hit:
            return 'key', sorted(hit)[0]
    # One of our gloss alternatives is one of theirs, word for word: "go up" = "to go up".
    ours = phrases(root_gloss)
    hit = ours & phrases(text)
    if hit:
        return 'phrase', ' '.join(sorted(hit)[0])
    # ... or is one of their words written as two: "door post" = "doorposts".
    for alt in sorted(ours):
        if len(alt) == 2 and len(alt[0]) >= 3 and len(alt[1]) >= 3 and bases(alt[0] + alt[1]) & theirs:
            return 'phrase', alt[0] + alt[1]

    key0 = root_keys[0]
    beside = near(key0, pos)
    spaced = ' ' + ' '.join(_tokens(text)) + ' '
    for tier in ('syn', 'hyper'):
        hit = beside[tier] & theirs
        if hit:
            return tier, sorted(hit)[0]
        for name in sorted(beside[tier]):
            if ' ' in name and f' {name} ' in spaced:
                return tier, name
        if tier == 'syn':
            for word in sorted(theirs):
                if key0 in around(word, pos)[0]:
                    return 'syn', word
    for word in sorted(theirs):
        if key0 in around(word, pos)[1]:
            return 'hypo', word
    for tier in ('deriv', 'similar'):
        hit = beside[tier] & theirs
        if hit:
            return tier, sorted(hit)[0]
    hit = lemmas(root_gloss) & theirs
    if hit:
        return 'gloss', sorted(hit)[0]
    # Last, and only ever enough to hold back a conflict: a scaffolding word in common
    # ("back" in "back, backbone" and "shoulder; back").
    hit = (lemmas(root_gloss, True) & theirs_all) - FUNCTION
    if hit:
        return 'gloss', sorted(hit)[0]
    return None


def comparable(text: str) -> bool:
    """False for an entry that says nothing in English: "id.", "See √", a German gloss."""
    if not text:
        return False
    return any(len(t) >= 3 and t not in STOP and wn.morphy(t) and not bases(t) & STOP for t in _tokens(text))


# ── spelling: one fixed normalization per language ─────────────────────────────────────

def strip_marks(text: str) -> str:
    return unicodedata.normalize('NFC', ''.join(
        c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn'))


def norm_greek(text: str) -> str:
    text = unicodedata.normalize('NFD', text.lower())
    text = text.replace('̄', '').replace('̆', '')
    text = unicodedata.normalize('NFC', text).replace('ς', 'σ')
    return re.sub(r'[\s\-*0-9]', '', text)


BETA = dict(zip('abgdezhqiklmncoprstufxyw', 'αβγδεζηθικλμνξοπρστυφχψω'))
BETA['v'] = 'ϝ'
BETA_MARK = {')': '̓', '(': '̔', '/': '́', '\\': '̀', '=': '͂',
             '+': '̈', '|': 'ͅ'}


def beta_to_greek(code: str) -> str:
    out, held, capital = [], [], False
    for ch in code.lower():
        if ch == '*':
            capital = True  # the marks of a capital are written before its letter
        elif ch in BETA_MARK:
            (held if capital else out).append(BETA_MARK[ch])
        elif ch in BETA:
            out.append(BETA[ch])
            out += held
            held, capital = [], False
    return unicodedata.normalize('NFC', ''.join(out))


def norm_latin(text: str) -> str:
    text = strip_marks(text.lower()).replace('æ', 'ae').replace('œ', 'oe')
    return re.sub(r'[^a-z]', '', text).replace('j', 'i').replace('v', 'u')


DEVA_VOWEL = dict(zip('अआइईउऊऋॠऌॡएऐओऔ', 'aAiIuUfFxXeEoO'))
DEVA_SIGN = dict(zip('ािीुूृॄॢॣेैोौ', 'AiIuUfFxXeEoO'))
DEVA_CONS = dict(zip('कखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसहळ', 'kKgGNcCjJYwWqQRtTdDnpPbBmyrlvSzshL'))
DEVA_OTHER = {'ं': 'M', 'ः': 'H', 'ँ': '~', 'ऽ': "'"}
SLP_NASAL = {**dict.fromkeys('kKgG', 'N'), **dict.fromkeys('cCjJ', 'Y'), **dict.fromkeys('wWqQ', 'R'),
             **dict.fromkeys('tTdD', 'n'), **dict.fromkeys('pPbB', 'm')}
IAST = [('ai', 'E'), ('au', 'O'), ('kh', 'K'), ('gh', 'G'), ('ch', 'C'), ('jh', 'J'), ('ṭh', 'W'),
        ('ḍh', 'Q'), ('th', 'T'), ('dh', 'D'), ('ph', 'P'), ('bh', 'B'), ('ā', 'A'), ('ī', 'I'),
        ('ū', 'U'), ('ṛ', 'f'), ('ṝ', 'F'), ('ḷ', 'x'), ('ḹ', 'X'), ('ṃ', 'M'), ('ṁ', 'M'),
        ('ḥ', 'H'), ('ṅ', 'N'), ('ñ', 'Y'), ('ṭ', 'w'), ('ḍ', 'q'), ('ṇ', 'R'), ('ś', 'S'), ('ṣ', 'z')]


def slp_nasals(slp: str) -> str:
    return re.sub(r'M(?=([kKgGcCjJwWqQtTdDpPbB]))', lambda m: SLP_NASAL[m.group(1)], slp)


def deva_to_slp(text: str) -> str:
    out = []
    bare = False  # a consonant is waiting for its inherent "a"
    for ch in unicodedata.normalize('NFC', text):
        if ch in DEVA_CONS:
            if bare:
                out.append('a')
            out.append(DEVA_CONS[ch])
            bare = True
        elif ch in DEVA_SIGN:
            out.append(DEVA_SIGN[ch])
            bare = False
        elif ch == '्':
            bare = False
        else:
            if bare:
                out.append('a')
            bare = False
            if ch in DEVA_VOWEL:
                out.append(DEVA_VOWEL[ch])
            elif ch in DEVA_OTHER:
                out.append(DEVA_OTHER[ch])
    if bare:
        out.append('a')
    return slp_nasals(''.join(out))


def iast_to_slp(text: str) -> str:
    text = unicodedata.normalize('NFD', text.lower())
    text = unicodedata.normalize('NFC', text.replace('́', '').replace('̀', ''))
    for src, dst in IAST:
        text = text.replace(src, dst)
    return slp_nasals(re.sub(r'[^a-zA-Z\']', '', text))


def norm_pali(text: str) -> str:
    return re.sub(r'[\s\-]', '', unicodedata.normalize('NFC', text.lower()).replace('ṃ', 'ṁ'))


def norm_old_english(text: str) -> str:
    text = strip_marks(text.lower()).replace('ð', 'þ').replace('ƿ', 'w')
    return re.sub(r'[^a-zþæœ]', '', text)


def fold_old_english(text: str) -> str:
    """
    Wiktionary spells Old English in the early West Saxon way (hīeran, ġiefan) and
    Bosworth-Toller mostly in the late one (hýran, gifan). Folding ie, y and i together,
    io onto eo and k onto c bridges the two — and cannot tell hyd from hid, so a match
    made only this way is LOOSE.
    """
    text = norm_old_english(text).replace('ie', 'i').replace('y', 'i').replace('io', 'eo')
    return text.replace('k', 'c')


def norm_old_norse(text: str) -> str:
    text = unicodedata.normalize('NFC', text.lower())
    for src, dst in (('ǫ́', 'á'), ('ǫ', 'ö'), ('ǿ', 'œ'), ('ø', 'ö'), ('ę', 'e')):
        text = text.replace(unicodedata.normalize('NFC', src), dst)
    return re.sub(r'[\s\-.,]', '', text)


def norm_gothic(text: str) -> str:
    return re.sub(r'[^a-zþƕ]', '', strip_marks(text.lower()))


def norm_akkadian(text: str) -> str:
    text = unicodedata.normalize('NFC', text.lower())
    text = re.sub(r'[\s\-]', '', text)
    return text[:-1] if re.search(r'[uû]m$', text) else text


def norm_egyptian(text: str) -> str:
    text = unicodedata.normalize('NFC', text.lower())
    for src, dst in (('i̯', 'j'), ('u̯', 'w'), ('ḳ', 'q'), ('ı͗', 'j'), ('ꞽ', 'j'), ('ï', 'j')):
        text = text.replace(unicodedata.normalize('NFC', src), dst)
    return re.sub(r'[\s.\-=()]', '', text)


def norm_sumerian_form(text: str) -> str:
    """A sign reading with its index kept: gug₂. ASCII digits become subscripts."""
    text = unicodedata.normalize('NFD', text.lower())
    text = text.replace('g̃', 'ŋ').replace('ĝ', 'ŋ').replace('ḫ', 'h')
    text = unicodedata.normalize('NFC', text).translate(str.maketrans('0123456789', '₀₁₂₃₄₅₆₇₈₉'))
    return text.strip()


def norm_sumerian(text: str) -> str:
    return re.sub(r'[₀-₉ₓ\s\-]', '', norm_sumerian_form(text))


SYRIAC_TO_HEBREW = dict(zip('ܐܒܓܕܗܘܙܚܛܝܟܠܡܢܣܥܦܨܩܪܫܬ', 'אבגדהוזחטיכלמנסעפצקרשת'))
SEDRA_TO_HEBREW = dict(zip('ABGDHOZKY;CLMNSEI/XRWT', 'אבגדהוזחטיכלמנסעפצקרשת'))
HEBREW_FINALS = str.maketrans('ךםןףץ', 'כמנפצ')


def skeleton(text: str) -> str:
    """Consonants only, in Hebrew letters, whatever Semitic script the word came in."""
    text = ''.join(SYRIAC_TO_HEBREW.get(c, c) for c in text).translate(HEBREW_FINALS)
    return ''.join(c for c in text if 'א' <= c <= 'ת')


def pointed(text: str) -> str:
    """Hebrew letters with their vowel points; accents, meteg and maqaf dropped."""
    text = unicodedata.normalize('NFD', text)
    keep = [c for c in text if 'א' <= c <= 'ת' or 'ְ' <= c <= 'ּ' or c in 'ׇׁׂ']
    return unicodedata.normalize('NFC', ''.join(keep))


# ── reading the second sources ─────────────────────────────────────────────────────────
#
# Every reader yields (key, lead, more, pos): the normalized headword, the leading senses
# of the entry as plain English, the rest of its English, and its part of speech — 'n',
# 'v', 'a', or '' when the source does not say. An entry that exists but has no English
# to compare is yielded with an empty lead: it cannot verify a root, and its presence
# keeps a homograph beside it from being called a conflict.

LEAD = {
    'lsj': 'the first 20 <tr> translations',
    'strongs-greek': 'the whole entry (definition + KJV renderings)',
    'whitaker': 'the whole entry',
    'lewis-short': 'the first 15 italic / <tr> translations',
    'monier-williams': 'the first 5 records of each homonym, parentheses removed',
    'ncped': 'the whole entry',
    'pts': 'the first 350 characters after the etymology',
    'bosworth-toller': 'everything before the first citation (":--"), else the first 300 characters',
    'zoega': 'the first 3 definition lines of each numbered homonym',
    'cleasby-vigfusson': 'the first 300 characters after ":—"',
    'wright': 'the whole entry',
    'bdb': 'the index gloss and the first 8 <def>s',
    'wiktionary-he': 'the first 4 senses',
    'wiktionary-arc': 'the first 4 senses',
    'strongs-aramaic': 'the whole entry',
    'sedra': 'the whole entry',
    'epsd2': 'guide word and all senses',
    'oracc-saao': 'guide word and all senses',
    'aed-tla': 'the English translation',
}
MORE_CAP = 4000

TAG = re.compile(r'<[^>]+>')


def plain(text: str) -> str:
    return re.sub(r'\s+', ' ', TAG.sub(' ', text)).strip()


def read_lsj(second: Path):
    entry = re.compile(r'<entryFree\b[^>]*?\bkey="([^"]*)"[^>]*>(.*?)</entryFree>', re.S)
    tr = re.compile(r'<tr\b[^>]*>(.*?)</tr>', re.S)
    for path in sorted((second / 'lsj').glob('grc.lsj.perseus-eng*.xml'),
                       key=lambda p: int(re.search(r'eng(\d+)', p.name).group(1))):
        text = path.read_text(encoding='utf8')
        for match in entry.finditer(text):
            key = norm_greek(beta_to_greek(match.group(1)))
            if not key:
                continue
            body = match.group(2)
            glosses = [g for g in (plain(t) for t in tr.findall(body)) if g]
            pos = 'n' if '<gen' in body[:600] else ''
            yield key, '; '.join(glosses[:20]), '; '.join(glosses[20:]), pos


def read_strongs_greek(second: Path):
    text = (second / 'strongs-greek.js').read_text(encoding='utf8')
    start = text.index('{', text.index('var strongsGreekDictionary'))
    data = json.loads(text[start: text.rindex('}') + 1])
    for entry in data.values():
        lemma = entry.get('lemma') or ''
        meaning = '; '.join(x for x in (entry.get('strongs_def', ''), entry.get('kjv_def', '')) if x)
        if lemma and meaning.strip():
            yield norm_greek(lemma), plain(meaning), '', ''


NOUN_ENDING = {(1, 1): 'a', (1, 6): 'e', (1, 7): 'es', (1, 8): 'as', (2, 1): 'us', (2, 2): 'um',
               (2, 3): '', (2, 5): 'us', (2, 6): 'os', (2, 7): 'os', (2, 8): 'on', (2, 9): 'us',
               (4, 1): 'us', (4, 2): 'u', (4, 3): 'us', (5, 1): 'es'}
ADJ_ENDING = {(1, 1): 'us', (1, 2): '', (1, 3): 'us', (1, 4): '', (1, 5): 'us', (3, 1): '',
              (3, 2): 'is', (3, 3): ''}
VERB_ENDING = {1: 'o', 2: 'eo', 3: 'o'}


def whitaker_headword(stem: str, pos: str, fields: list) -> str | None:
    """The dictionary form WORDS would print for a DICTLINE entry, for the regular types."""
    try:
        decl, var = int(fields[0]), int(fields[1])
    except (ValueError, IndexError):
        return None
    if pos == 'N':
        if decl == 3 or decl == 9:
            return stem
        if (decl, var) == (2, 4):
            return stem + ('um' if fields[2:3] == ['N'] else 'us')
        ending = NOUN_ENDING.get((decl, var))
        return None if ending is None else stem + ending
    if pos == 'ADJ':
        if decl == 9:
            return stem
        ending = ADJ_ENDING.get((decl, var))
        return None if ending is None else stem + ending
    if pos == 'V':
        if decl not in VERB_ENDING or 'IMPERS' in fields:
            return None
        ending = VERB_ENDING[decl]
        if 'DEP' in fields:
            ending = ending[:-1] + 'or'
        return stem + ending
    return None


def read_whitaker(second: Path):
    line_re = re.compile(r'^(\S+)\s+(.*?)\s+[A-Z] [A-Z] [A-Z] [A-Z] [A-Z] (.*)$')
    kinds = {'N': 'n', 'V': 'v', 'ADJ': 'a'}
    for line in (second / 'whitaker-DICTLINE.GEN').read_text(encoding='latin-1').splitlines():
        stem = line[:19].strip()
        match = line_re.match(line[76:])
        if not stem or not match or stem == 'zzz':
            continue
        head = whitaker_headword(stem, match.group(1), match.group(2).split())
        meaning = re.sub(r'\[[^\]]*\]', ' ', match.group(3))
        if head and meaning.strip():
            yield norm_latin(head), plain(meaning.replace('/', ', ')), '', kinds.get(match.group(1), '')


def read_lewis_short(second: Path):
    text = (second / 'lewis-short.xml').read_text(encoding='utf8')
    entry = re.compile(r'<entryFree\b[^>]*?\bkey="([^"]*)"[^>]*>(.*?)</entryFree>', re.S)
    gloss = re.compile(r'<hi rend="ital">(.*?)</hi>|<tr\b[^>]*>(.*?)</tr>', re.S)
    orth = re.compile(r'<orth\b[^>]*>(.*?)</orth>', re.S)
    part = re.compile(r'<pos>(.*?)</pos>', re.S)
    for match in entry.finditer(text):
        if match.group(1)[:1].isupper():
            continue
        body = match.group(2)
        glosses = [g for g in (plain(a or b) for a, b in gloss.findall(body)) if g]
        head = body[:500]
        said = part.search(head)
        pos = ''
        if said and said.group(1).strip().startswith('v'):
            pos = 'v'
        elif said and 'adj' in said.group(1):
            pos = 'a'
        elif '<gen>' in head:
            pos = 'n'
        keys = {norm_latin(match.group(1))}
        first = orth.search(body)
        if first:
            keys.add(norm_latin(plain(first.group(1))))
        for key in sorted(keys):
            if len(key) >= 2:
                yield key, '; '.join(glosses[:15]), '; '.join(glosses[15:]), pos


def read_monier_williams(second: Path):
    record = re.compile(r'^<(H[1-4])([A-E]?)><h><key1>(.*?)</key1>.*?<body>(.*?)</body>')
    drop = re.compile(r'<(s|ls|lex|hom|gk|etym|lang|info)\b[^>]*>.*?</\1>|<info[^>]*/>')
    lex = re.compile(r'<lex\b[^>]*>(.*?)</lex>')
    groups: dict = collections.defaultdict(list)
    with zipfile.ZipFile(second / 'mwxml.zip') as archive:
        with archive.open('xml/mw.xml') as handle:
            for raw in handle:
                match = record.match(raw.decode('utf8'))
                if not match:
                    continue
                _level, sub, key, body = match.groups()
                if sub == 'E':
                    continue  # "cf. Gk. …; Lat. …" — cognates, not meanings
                gender = lex.search(body)
                gender = plain(gender.group(1)) if gender else ''
                body = re.sub(r'<s1\b[^>]*>(.*?)</s1>', r'\1', body)
                text = plain(drop.sub(' ', body)).replace('&amp;c.', ' ').replace('&amp;', '&')
                # Parentheses hold conjugation, derivation and citation — "( pf. …; aor. …)"
                # runs to hundreds of characters before a verb's meaning is reached.
                for _ in range(3):
                    text = re.sub(r'\([^()]*\)|\[[^\[\]]*\]', ' ', text)
                text = re.sub(r'\s+', ' ', re.sub(r'\s+([,;.)])', r'\1', text)).strip(' ,;.')
                key = slp_nasals(re.sub(r'[^a-zA-Z\']', '', key))
                if not sub or not groups[key]:
                    pos = ''
                    if re.match(r'm?f?n?\.$', gender) and gender not in ('', '.'):
                        pos = 'a' if gender.startswith('mf') else 'n'
                    elif re.match(r'cl\. ?\d', text):
                        pos = 'v'
                    groups[key].append([pos])
                if text:
                    groups[key][-1].append(text[:300])
    for key, homonyms in groups.items():
        for pos, *records in homonyms:
            yield key, '; '.join(records[:5]), '; '.join(records[5:]), pos
            # "dánta, = dat": the meaning is given under another headword.
            if records and re.match(r'^(=|id\b|see\b|w\.r\. for)', records[0], re.I):
                yield key, '', '', pos


def read_ncped(second: Path):
    for entry in json.loads((second / 'pli2en_ncped.json').read_text(encoding='utf8')):
        meaning = entry.get('definition')
        if isinstance(meaning, list):
            meaning = '; '.join(str(m) for m in meaning)
        grammar = str(entry.get('grammar') or '')
        pos = ('n' if re.search(r'masculine|feminine|neuter', grammar) and 'adjective' not in grammar
               else 'a' if 'adjective' in grammar else 'v' if re.search(r'\b(pr|aor|fut)\b|singular', grammar) else '')
        if entry.get('entry') and meaning:
            yield norm_pali(entry['entry']), plain(meaning), '', pos


def read_pts(second: Path):
    for entry in json.loads((second / 'pli2en_pts.json').read_text(encoding='utf8')):
        text = entry.get('text') or ''
        # One <dd> per homonym; its bracketed etymology says nothing about meaning.
        for block in re.split(r'<dd\b', text)[1:]:
            block = re.sub(r"<a class='ref'.*?</a>", ' ', block, flags=re.S)
            block = plain(block[block.find('>') + 1:])
            block = re.sub(r'\[[^\]]{0,600}\]', ' ', block, count=1)
            block = re.sub(r'\s+', ' ', block).strip()
            if entry.get('word') and block:
                yield norm_pali(entry['word']), block[:350], block[350:], ''


ENTITY_BASE = {'thorn': 'þ', 'eth': 'ð', 'aelig': 'æ', 'oelig': 'œ', 'hw': 'ƕ', 'yogh': 'g', 'dash': '-',
               'thron': 'þ', 'aleig': 'æ', 'ealig': 'æ', 'alig': 'æ', 'oactute': 'o', 'oacite': 'o',
               'iactute': 'i'}
ENTITY_WHOLE = {'d-bar': 'ð', 'thorn-bar': 'þ', 'THORN-bar': 'Þ', 'z-tail': 'z'}


def entity(match: re.Match) -> str:
    """
    The Germanic Lexicon Project writes its own entities: &aelig-acute; &o-long; &d-bar;.
    Only the base letter survives — every normalization here drops length and accent.
    """
    name = match.group(1)
    if name in ENTITY_WHOLE:
        return ENTITY_WHOLE[name]
    if name + ';' in HTML_ENTITIES:
        return HTML_ENTITIES[name + ';']
    base, _, modifier = name.partition('-')
    if modifier == 'rune':
        return ''
    lower = base.lower()
    if lower in ENTITY_BASE:
        letter = ENTITY_BASE[lower]
        return letter.upper() if base[:1].isupper() else letter
    if base + ';' in HTML_ENTITIES:
        return HTML_ENTITIES[base + ';']
    return base if len(base) == 1 else ''


def unescape(text: str) -> str:
    return re.sub(r'&([A-Za-z][A-Za-z0-9\-]*);', entity, text)


def read_bosworth_toller(second: Path):
    head = re.compile(r'^<B>(.*?)</B>')
    italic = re.compile(r'<I>(.*?)</I>')
    sense = re.compile(r'<B>\s*\(?(?:[IVX]+|\d+|[a-z])\)?\.?\s*</B>\s*(?:\([^)]{0,80}\)\s*)?<I>(.*?)</I>')
    refer = re.compile(r'\bv\.\s+([a-zþðæœ][a-zþðæœ\-]+)')
    rows: list = []
    by_key: dict = collections.defaultdict(list)
    with (second / 'oe_bosworthtoller.txt').open(encoding='utf8', errors='replace') as handle:
        for line in handle:
            if not line.startswith('<B>'):
                continue
            line = unescape(line)
            match = head.match(line)
            if not match:
                continue
            body = line[match.end():]
            # Everything after ":--" is citation: Old English, its Latin source, a translation.
            cut = re.search(r':\s?--', body)
            first = body[:cut.start()] if cut else body[:300]
            rest = body[cut.start():] if cut else body[300:]
            # Senses II, III … are defined further down, each before its own citations:
            # "<B>II.</B> <I>old</I> :--".
            later = [plain(g) for g in sense.findall(rest)][:10]
            lead = '; '.join(x for x in [plain(first)] + later if x)
            # The 1921 Supplement repeats a headword only to add citations to it.
            if re.match(r'^[\s.,;IVX]*\badd\b', lead, re.I):
                continue
            grammar = lead[:40]
            pos = ('n' if re.search(r'\b[mfn]\.', grammar) else 'a' if 'adj.' in grammar
                   else 'v' if re.search(r'\bp\.|\bv\.', grammar) else '')
            more = '; '.join(g for g in (plain(x) for x in italic.findall(rest)) if g)[:MORE_CAP]
            # "cynn … v. cyn." — a variant spelling sends the reader to the main entry.
            targets = [norm_old_english(t) for t in refer.findall(strip_marks(plain(body[:400]).lower()))]
            for word in re.split(r'[,;]|\bor\b', TAG.sub(' ', match.group(1))):
                key = norm_old_english(word)
                if len(key) >= 2 and not word.strip().startswith('-'):
                    rows.append((key, lead, more, pos, targets))
                    by_key[key].append((lead, more, pos))
    for key, lead, more, pos, targets in rows:
        yield key, lead, more, pos
        yield 'l:' + fold_old_english(key), lead, more, pos
        for target in targets:
            for other in by_key.get(target, ())[:4]:
                if target != key:
                    yield key, *other
                    yield 'l:' + fold_old_english(key), *other


NORSE_POS = re.compile(r'^(?:[IVX]+\)\s*)?(?:\([^)]*\),?\s*)?(m|f|n|a|adj|v|pp)\.')


def read_zoega(second: Path):
    for entry in json.loads((second / 'zoega.json').read_text(encoding='utf8')):
        lines = [plain(d) for d in entry.get('definitions') or []]
        if not entry.get('word') or not lines:
            continue
        # "I) (-ða, -t), v. to accompany … II) f. guidance …" — two words under one head.
        homonyms: list = []
        for line in lines:
            if re.match(r'^[IVX]+\)\s', line) or not homonyms:
                homonyms.append([])
            homonyms[-1].append(line)
        for part in homonyms:
            said = NORSE_POS.match(part[0])
            pos = {'m': 'n', 'f': 'n', 'n': 'n', 'a': 'a', 'adj': 'a', 'v': 'v', 'pp': 'a'}.get(said.group(1), '') if said else ''
            yield norm_old_norse(entry['word']), ' '.join(part[:3])[:500], ' '.join(part[3:])[:MORE_CAP], pos


def read_cleasby_vigfusson(second: Path):
    for entry in json.loads((second / 'cleasby-vigfusson.json').read_text(encoding='utf8')):
        lines = [plain(d) for d in entry.get('definitions') or []]
        if not entry.get('word') or not lines:
            continue
        text = ' '.join(lines)
        said = re.match(r'^(?:[a-zA-Z()]+,\s*)?(m|f|n|adj)\.', text)
        pos = {'m': 'n', 'f': 'n', 'n': 'n', 'adj': 'a'}.get(said.group(1), '') if said else ''
        cut = text.find(':—')
        body = text[cut + 2:] if 0 <= cut < 600 else text
        yield norm_old_norse(entry['word']), body[:300], body[300:MORE_CAP], pos


def read_wright(second: Path):
    text = (second / 'goth_wright_glossary.xml').read_text(encoding='utf8')
    table = {name: ''.join(chr(int(code, 16)) for code in re.findall(r'&#x([0-9A-Fa-f]+);', value))
             for name, value in re.findall(r'<!ENTITY\s+(\S+)\s+"([^"]*)">', text)}
    resolve = lambda s: re.sub(r'&([A-Za-z][A-Za-z0-9\-]*);', lambda m: table.get(m.group(1)) or entity(m), s)
    for block in re.findall(r'<entry>(.*?)</entry>', text, re.S):
        head = re.search(r'<headword>(.*?)</headword>', block, re.S)
        meaning = ' '.join(re.findall(r'<def-text>(.*?)</def-text>', block, re.S))
        said = re.search(r'<pos>(.*?)</pos>', block, re.S)
        if not head or not meaning.strip():
            continue
        word = resolve(plain(head.group(1))).strip(' ,;.')
        word = word.lstrip('*')  # a form Wright infers (*skulan) is still his headword
        if ' ' in word:
            continue
        kind = plain(said.group(1)) if said else ''
        pos = ('v' if re.match(r'[sw]v\.|pret', kind) else 'n' if re.match(r'[sw]?[mfn]\.', kind)
               else 'a' if kind.startswith('aj') else '')
        yield norm_gothic(word), plain(resolve(meaning)), '', pos


def read_bdb(second: Path):
    """
    Keyed three ways: 'H<number>' / 'A<number>' by Strong's number, 'p:<lang>:<pointed
    form>', and 'c:<lang>:<consonants>'.
    """
    bdb = (second / 'BrownDriverBriggs.xml').read_text(encoding='utf8')
    defs: dict = {}
    for eid, body in re.findall(r'<entry id="([^"]+)"[^>]*>(.*?)</entry>', bdb, re.S):
        defs[eid] = [plain(d) for d in re.findall(r'<def>(.*?)</def>', body, re.S)]
    index = (second / 'LexicalIndex.xml').read_text(encoding='utf8')
    for lang, part in re.findall(r'<part xml:lang="(\w+)">(.*?)</part>', index, re.S):
        for body in re.findall(r'<entry\b[^>]*>(.*?)</entry>', part, re.S):
            word = re.search(r'<w\b[^>]*>(.*?)</w>', body, re.S)
            gloss = re.search(r'<def>(.*?)</def>', body, re.S)
            xref = re.search(r'<xref\b([^>]*)/>', body)
            said = re.search(r'<pos>(.*?)</pos>', body)
            if not word or (said and said.group(1).startswith('Np')):
                continue
            attrs = dict(re.findall(r'(\w+)="([^"]*)"', xref.group(1))) if xref else {}
            glosses = ([plain(gloss.group(1))] if gloss else []) + defs.get(attrs.get('bdb', ''), [])
            glosses = list(dict.fromkeys(g for g in glosses if g))
            if not glosses:
                continue
            lead, more = '; '.join(glosses[:9]), '; '.join(glosses[9:])
            pos = {'N': 'n', 'V': 'v', 'A': 'a'}.get(said.group(1)[:1], '') if said else ''
            form = plain(word.group(1))
            if attrs.get('strong'):
                yield ('A' if lang == 'arc' else 'H') + attrs['strong'], lead, more, pos
            if skeleton(form):
                yield f'p:{lang}:{pointed(form)}', lead, more, pos
                yield f'c:{lang}:{skeleton(form)}', lead, more, pos


FORM_OF = {'form-of', 'alt-of', 'misspelling', 'abbreviation'}
KAIKKI_POS = {'noun': 'n', 'verb': 'v', 'adj': 'a'}


def kaikki_senses(entry: dict, limit: int = 4) -> list:
    out = []
    for sense in entry.get('senses') or []:
        if 'form_of' in sense or 'alt_of' in sense or FORM_OF & set(sense.get('tags') or []):
            continue
        if sense.get('glosses'):
            out.append(sense['glosses'][0])
    return out[:limit]


def read_wiktionary_hebrew(src: Path):
    with (src / 'Hebrew.jsonl').open(encoding='utf8') as handle:
        for line in handle:
            entry = json.loads(line)
            if entry.get('pos') not in ('noun', 'verb', 'adj', 'adv', 'root', 'num', 'pron', 'prep'):
                continue
            senses = kaikki_senses(entry)
            if not senses:
                continue
            text = '; '.join(senses)
            canonical = [f['form'] for f in entry.get('forms') or [] if 'canonical' in (f.get('tags') or [])]
            keys = {f'c:{skeleton(entry["word"])}'}
            for form in canonical[:1]:
                keys.add(f'p:{pointed(form)}')
                keys.add(f'c:{skeleton(form)}')
            for key in sorted(keys):
                if len(key) > 2:
                    yield key, text, '', KAIKKI_POS.get(entry['pos'], '')


def read_wiktionary_aramaic(src: Path):
    for name in ('Aramaic', 'ClassicalSyriac'):
        with (src / f'{name}.jsonl').open(encoding='utf8') as handle:
            for line in handle:
                entry = json.loads(line)
                if entry.get('pos') not in ('noun', 'verb', 'adj', 'adv', 'root', 'num'):
                    continue
                senses = kaikki_senses(entry)
                key = skeleton(entry['word'])
                if senses and key:
                    yield key, '; '.join(senses), '', KAIKKI_POS.get(entry['pos'], '')


def read_strongs_aramaic(src: Path):
    text = (src / 'strongs-hebrew.js').read_text(encoding='utf8')
    start = text.index('{', text.index('var strongsHebrewDictionary'))
    data = json.loads(text[start: text.rindex('}') + 1])
    for entry in data.values():
        meaning = entry.get('strongs_def') or ''
        if '(Aramaic)' not in (entry.get('derivation') or '') + meaning:
            continue
        key = skeleton(entry.get('lemma') or '')
        meaning = '; '.join(x for x in (meaning.replace('(Aramaic)', ''), entry.get('kjv_def', '')) if x)
        if key and meaning.strip():
            yield key, plain(meaning), '', ''


def read_sedra(second: Path):
    with tarfile.open(second / 'sedrajs-1.2.9.tgz') as archive:
        member = lambda name: archive.extractfile(f'package/sedra/{name}').read().decode('latin-1')
        lexemes = {}
        for line in member('LEXEMES.TXT').splitlines():
            parts = line.split(',')
            if len(parts) >= 3:
                lexemes[parts[0]] = ''.join(SEDRA_TO_HEBREW.get(c, '') for c in parts[2].strip('"'))
        meanings: dict = collections.defaultdict(list)
        row = re.compile(r'^[^,]+,([^,]+),"([^"]*)","([^"]*)","([^"]*)","([^"]*)"')
        for line in member('ENGLISH.TXT').splitlines():
            match = row.match(line)
            if match and match.group(1) in lexemes:
                lexeme, meaning, before, after, _comment = match.groups()
                meanings[lexemes[lexeme]].append(' '.join(x for x in (before, meaning, after) if x))
    for key, glosses in meanings.items():
        if key:
            yield key, '; '.join(dict.fromkeys(glosses)), '', ''


def read_oracc(archive_path: Path, member: str):
    """
    ORACC glossaries are pretty-printed JSON too large to load (1.9 GB for ePSD2, almost
    all of it attestation lists), so the few lines that matter are picked out as they pass.
    Yields {cf: citation form, gw: guide word, pos, mng: senses, forms: written forms}.
    """
    wanted = re.compile(rb'^\s*"(?:headword|cf|gw|pos|mng|n|type)": "')
    field = re.compile(r'^(\s*)"(headword|cf|gw|pos|mng|n|type)": "(.*)",?\s*$')
    entry = None
    with zipfile.ZipFile(archive_path) as archive:
        with archive.open(member) as handle:
            for raw in handle:
                if not wanted.match(raw):
                    continue
                match = field.match(raw.decode('utf8'))
                if not match:
                    continue
                indent, name, value = len(match.group(1)), match.group(2), match.group(3)
                try:
                    value = json.loads(f'"{value}"')
                except ValueError:
                    continue
                if name == 'headword' and indent == 6:
                    if entry:
                        yield entry
                    entry = {'cf': '', 'gw': '', 'pos': '', 'mng': [], 'forms': [], 'kind': ''}
                elif entry is None:
                    continue
                elif indent == 6 and name in ('cf', 'gw', 'pos'):
                    entry[name] = value
                elif name == 'type':
                    entry['kind'] = value
                elif name == 'mng' and entry['kind'] == 'sense':
                    entry['mng'].append(value)
                elif name == 'n' and entry['kind'] == 'form':
                    entry['forms'].append(value)
    if entry:
        yield entry


def oracc_pos(tag: str) -> str:
    return 'n' if tag == 'N' else 'v' if tag.startswith('V') else 'a' if tag == 'AJ' else ''


def read_epsd2(second: Path):
    for entry in read_oracc(second / 'oracc-epsd2.zip', 'epsd2/gloss-sux.json'):
        meaning = '; '.join(dict.fromkeys([entry['gw']] + entry['mng']))
        if not entry['cf'] or not meaning.strip('; ') or ' ' in entry['cf']:
            continue
        pos = oracc_pos(entry['pos'])
        yield 'c:' + norm_sumerian(entry['cf']), meaning, '', pos
        for form in entry['forms']:
            if re.fullmatch(r'[^\s\-{}().\\/|+×&%@~<>\[\]#!?*]+', form):
                yield 'f:' + norm_sumerian_form(form), meaning, '', pos


def read_oracc_saao(second: Path):
    for entry in read_oracc(second / 'oracc-saao.zip', 'saao/gloss-akk.json'):
        meaning = '; '.join(dict.fromkeys([entry['gw']] + entry['mng']))
        if entry['cf'] and meaning.strip('; ') and ' ' not in entry['cf']:
            yield norm_akkadian(entry['cf']), meaning, '', oracc_pos(entry['pos'])


def read_aed(second: Path):
    text = (second / 'aed-dictionary.xml').read_text(encoding='utf8')
    english = re.compile(r'<cit type="translation" xml:lang="en">\s*<quote>(.*?)</quote>', re.S)
    for block in re.findall(r'<entry\b[^>]*>(.*?)</entry>', text, re.S):
        orth = re.search(r'<orth>(.*?)</orth>', block, re.S)
        kind = re.search(r'<term>(.*?)</term>', block, re.S)
        if not orth or orth.group(1)[:1].isupper():
            continue
        kind = kind.group(1) if kind else ''
        if kind.startswith(('entity_name', 'root')):
            continue
        pos = 'n' if kind.startswith('substantive') else 'v' if kind.startswith('verb') else 'a' if kind.startswith('adjective') else ''
        glosses = [g.replace('&amp;', '&') for g in (plain(g) for g in english.findall(block)) if g]
        # A lemma with only a German gloss is still yielded, with nothing to compare.
        yield norm_egyptian(plain(orth.group(1))), '; '.join(glosses), '', pos


def read_descendants(src: Path, name: str):
    """
    A reconstruction is only as good as the words it was reconstructed from. For each
    entry of a proto-language dump: the daughter languages that actually attest a
    descendant — not other reconstructions, not loans into other languages, and each
    line of descent counted once (Old English → Middle English → English is one witness).
    Yields (word, part of speech, first glosses, [language names]).
    """
    def attested(nodes, found):
        for node in nodes or []:
            tags = set(node.get('tags') or []) | set(node.get('raw_tags') or [])
            if any('borrow' in t for t in tags):
                continue
            word = node.get('word') or ''
            code = node.get('lang_code') or ''
            lang = node.get('lang') or ''
            real = (word and not word.startswith('*') and not code.endswith('-pro')
                    and not lang.startswith('Proto-') and lang != 'unknown')
            if real:
                found[code] = lang
            else:
                attested(node.get('descendants'), found)

    with (src / f'{name}.jsonl').open(encoding='utf8') as handle:
        for line in handle:
            entry = json.loads(line)
            found: dict = {}
            attested(entry.get('descendants'), found)
            yield entry['word'], entry.get('pos') or '', '; '.join(kaikki_senses(entry, 3)), sorted(found.values())


# name → (reader, the raw files it depends on relative to data-src, reader is given second/)
SOURCES = {
    'lsj': (read_lsj, ['second/lsj'], True),
    'strongs-greek': (read_strongs_greek, ['second/strongs-greek.js'], True),
    'whitaker': (read_whitaker, ['second/whitaker-DICTLINE.GEN'], True),
    'lewis-short': (read_lewis_short, ['second/lewis-short.xml'], True),
    'monier-williams': (read_monier_williams, ['second/mwxml.zip'], True),
    'ncped': (read_ncped, ['second/pli2en_ncped.json'], True),
    'pts': (read_pts, ['second/pli2en_pts.json'], True),
    'bosworth-toller': (read_bosworth_toller, ['second/oe_bosworthtoller.txt'], True),
    'zoega': (read_zoega, ['second/zoega.json'], True),
    'cleasby-vigfusson': (read_cleasby_vigfusson, ['second/cleasby-vigfusson.json'], True),
    'wright': (read_wright, ['second/goth_wright_glossary.xml'], True),
    'bdb': (read_bdb, ['second/BrownDriverBriggs.xml', 'second/LexicalIndex.xml'], True),
    'wiktionary-he': (read_wiktionary_hebrew, ['Hebrew.jsonl'], False),
    'wiktionary-arc': (read_wiktionary_aramaic, ['Aramaic.jsonl', 'ClassicalSyriac.jsonl'], False),
    'strongs-aramaic': (read_strongs_aramaic, ['strongs-hebrew.js'], False),
    'sedra': (read_sedra, ['second/sedrajs-1.2.9.tgz'], True),
    'epsd2': (read_epsd2, ['second/oracc-epsd2.zip'], True),
    'oracc-saao': (read_oracc_saao, ['second/oracc-saao.zip'], True),
    'aed-tla': (read_aed, ['second/aed-dictionary.xml'], True),
}
PROTO = {'pie': 'ProtoIndoEuropean', 'pgmc': 'ProtoGermanic', 'pcelt': 'ProtoCeltic'}

# Which dictionaries may speak for a language, in the order they are asked.
BY_LANGUAGE = {
    'greek': ('lsj', 'strongs-greek'),
    'latin': ('whitaker', 'lewis-short'),
    'sanskrit': ('monier-williams',),
    'pali': ('ncped', 'pts'),
    'oldenglish': ('bosworth-toller',),
    'oldnorse': ('zoega', 'cleasby-vigfusson'),
    'gothic': ('wright',),
    'hebrew': ('bdb', 'wiktionary-he'),
    'aramaic': ('bdb', 'sedra', 'strongs-aramaic', 'wiktionary-arc'),
    'sumerian': ('epsd2',),
    'akkadian': ('oracc-saao',),
    'egyptian': ('aed-tla',),
}
NO_SOURCE = ('hittite', 'oldpersian', 'geez', 'oldirish')
# Dictionaries of one corpus or one period. What they say a word means there is not all
# it means, so they may confirm a root and may not contradict one.
NARROW = {
    'strongs-greek': 'glosses New Testament usage only',
    'wiktionary-he': 'is mostly a dictionary of modern Hebrew',
    'sedra': 'covers the Syriac New Testament only',
}
ROOT_POS = {'noun': 'n', 'verb': 'v', 'adj': 'a'}
POS_NAME = {'n': 'noun', 'v': 'verb', 'a': 'adjective'}


def stamp(src: Path, files: list) -> list:
    out = []
    for name in files:
        path = src / name
        if path.is_dir():
            parts = sorted(path.iterdir())
            out.append([name, len(parts), sum(p.stat().st_size for p in parts)])
        elif path.exists():
            out.append([name, path.stat().st_size, int(path.stat().st_mtime)])
        else:
            out.append([name, None, None])
    return out


class Verifier:
    def __init__(self, src_dir: Path = SRC, verbose: bool = False):
        self.src = Path(src_dir)
        self.cache = self.src / 'cache' / 'verify'
        self.cache.mkdir(parents=True, exist_ok=True)
        self.verbose = verbose
        load_wordnet(self.src)
        self.index: dict = {}
        self.missing: list = []
        for name in SOURCES:
            self.index[name] = self._load(name)
        self.proto = {lang: self._load_proto(lang, dump) for lang, dump in PROTO.items()}

    # ── caches ──

    def _fresh(self, path: Path, files: list):
        """The cached index, unless a raw file has changed since it was built."""
        if not path.exists():
            return None
        try:
            data = json.loads(path.read_text(encoding='utf8'))
        except (ValueError, OSError):
            return None
        if data.get('version') != VERSION:
            return None
        now = stamp(self.src, files)
        # A raw file that has been cleared away since does not invalidate its index.
        if any(entry[1] is not None for entry in now) and data.get('stamp') != now:
            return None
        return data['index']

    def _store(self, path: Path, files: list, index):
        payload = {'version': VERSION, 'stamp': stamp(self.src, files), 'index': index}
        tmp = path.with_suffix('.tmp')
        tmp.write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')), encoding='utf8')
        tmp.replace(path)

    def _load(self, name: str) -> dict:
        reader, files, in_second = SOURCES[name]
        path = self.cache / f'{name}.json'
        index = self._fresh(path, files)
        if index is not None:
            return index
        if any(not (self.src / f).exists() for f in files):
            self.missing.append(name)
            if self.verbose:
                print(f'  {name:18} raw source missing — run data-src/fetch.sh', flush=True)
            return {}
        started = time.time()
        built: dict = collections.defaultdict(list)
        for key, lead, more, pos in reader(self.src / 'second' if in_second else self.src):
            row = [lead, more[:MORE_CAP], pos]
            if row not in built[key]:
                built[key].append(row)
        self._store(path, files, built)
        if self.verbose:
            print(f'  {name:18} parsed {len(built):7} headwords in {time.time() - started:5.1f}s', flush=True)
        return dict(built)

    def _load_proto(self, lang: str, dump: str) -> dict:
        files = [f'{dump}.jsonl']
        path = self.cache / f'descendants-{lang}.json'
        index = self._fresh(path, files)
        if index is not None:
            return index
        if not (self.src / files[0]).exists():
            self.missing.append(f'descendants-{lang}')
            return {}
        built: dict = collections.defaultdict(list)
        for word, pos, gloss, langs in read_descendants(self.src, dump):
            built[unicodedata.normalize('NFC', word)].append([pos, gloss, langs])
        self._store(path, files, built)
        return dict(built)

    # ── the check ──

    def check(self, root: dict) -> dict:
        source = root.get('source') or ''
        lang = root.get('lang') or ''
        if source.startswith('eldamo:'):
            return _result('unconfirmed', None, 'invented language — checked from Eldamo citations instead')
        if lang in PROTO:
            return self._check_proto(root)
        if lang in NO_SOURCE or lang not in BY_LANGUAGE:
            return _result('unconfirmed', None, f'no second source for {lang}')
        keys = tuple(root.get('keys') or ())
        if not keys:
            return _result('unconfirmed', None, 'root has no keys')
        gloss = root.get('gloss') or ''
        pos = root.get('pos') or 'n'
        # What the source itself called the word; the build's own `pos` is a guess for
        # bare roots and for Strong's, so only this is trusted for telling homographs apart.
        sure_pos = ROOT_POS.get(root.get('entry_pos') or '', '')

        skipped = self._skip(root)
        if skipped:
            return _result('unconfirmed', None, skipped)

        # weak: something speaks for the root, or the entry cannot be compared at all.
        # aside: a disagreement that proves nothing (a homograph, a one-corpus glossary).
        weak, conflict, aside = None, None, None
        for name, strength, entries in self._candidates(root):
            said = [e for e in entries if comparable(e[0])]
            best = None
            for lead, _more, _pos in said:
                hit = agree(keys, gloss, pos, lead)
                if hit and hit[0] in VERIFYING:
                    best = hit
                    break
            if best:
                return _result('verified', name, f"{best[0]} '{best[1]}'"
                               + (' (loose headword match)' if strength == 'loose' else ''))
            if not said:
                weak = weak or f'{name} has the headword but no English gloss to compare'
                continue
            # Not in the leading senses. Anywhere else in the entry?
            deep = None
            for lead, more, _pos in said:
                hit = agree(keys, gloss, pos, lead)
                if hit:
                    deep = f"only a gloss word in common ('{hit[1]}') with {name}: {_clip(lead)}"
                    break
                hit = agree(keys, gloss, pos, more) if more else None
                if hit:
                    deep = f"{hit[0]} '{hit[1]}' only beyond the leading senses of {name}: {_clip(lead)}"
                    break
            shown = _clip(' | '.join(e[0] for e in said[:3]))
            same_pos = [e for e in said if not sure_pos or not e[2] or e[2] == sure_pos
                        or {e[2], sure_pos} == {'n', 'a'}]
            if deep:
                weak = weak or deep
            elif strength == 'loose':
                aside = aside or (f'{name} has a word with these consonants and another meaning '
                                  f'(may be a homograph): {shown}')
            elif name in NARROW:
                aside = aside or f'{name} {NARROW[name]} and gives another meaning: {shown}'
            elif len(said) < len(entries):
                weak = weak or f'{name} has a homograph with no English gloss; the others: {shown}'
            elif not same_pos:
                weak = weak or (f'{name} has only a {POS_NAME.get(said[0][2], "word")} spelled so, '
                                f'ours is a {POS_NAME[sure_pos]}: {shown}')
            else:
                conflict = conflict or (name, f'{name}: {_clip(" | ".join(e[0] for e in same_pos[:3]))}')
        if weak:
            return _result('unconfirmed', None, 'weak — ' + weak)
        if conflict:
            return _result('conflict', conflict[0], conflict[1])
        if aside:
            return _result('unconfirmed', None, 'weak — ' + aside)
        names = [n for n in self._sources_for(root) if n not in self.missing]
        if not names:
            return _result('unconfirmed', None, f'second source for {lang} not downloaded')
        return _result('unconfirmed', None, 'headword not in ' + ', '.join(names))

    def _skip(self, root: dict) -> str | None:
        """A root no second source could hold, however right it is."""
        if root['lang'] == 'sanskrit' and root.get('entry_pos') == 'verb' \
                and re.search(r'(ति|ते)$', root.get('native') or ''):
            return 'finite verb form — Monier-Williams cites verbs by root'
        return None

    def _sources_for(self, root: dict) -> tuple:
        lang, source = root['lang'], root.get('source') or ''
        if lang == 'aramaic':
            if source.startswith('strongs:'):
                return ('bdb', 'wiktionary-arc', 'sedra')
            if source == 'wiktionary:ClassicalSyriac':
                return ('sedra', 'strongs-aramaic', 'bdb')
            return ('strongs-aramaic', 'bdb', 'sedra')
        if lang == 'hebrew' and not source.startswith('strongs:'):
            return ('bdb',)  # Wiktionary cannot confirm a root that came from Wiktionary
        return BY_LANGUAGE[lang]

    def _candidates(self, root: dict):
        """(source name, 'exact' | 'loose', entries) for every source that has the headword."""
        lang, source = root['lang'], root.get('source') or ''
        native = root.get('native') or ''
        roman = root.get('roman') or ''
        form = root.get('form') or ''
        noun = (root.get('entry_pos') or root.get('pos') or '') in ('noun', 'n', 'adj', 'a')
        number = source[len('strongs:H'):] if source.startswith('strongs:H') else ''
        for name in self._sources_for(root):
            index = self.index.get(name) or {}
            hits: list = []
            if lang == 'greek':
                hits.append(('exact', index.get(norm_greek(native))))
            elif lang == 'latin':
                hits.append(('exact', index.get(norm_latin(native))))
            elif lang == 'sanskrit':
                key = deva_to_slp(native) if re.search(r'[ऀ-ॿ]', native) else iast_to_slp(roman or form)
                hits.append(('exact', index.get(key)))
            elif lang == 'pali':
                latin = not re.search(r'[ऀ-෿က-႟]', native)
                hits.append(('exact', index.get(norm_pali(native if latin else roman or form))))
            elif lang == 'oldenglish':
                hits.append(('exact', index.get(norm_old_english(native))))
                hits.append(('loose', index.get('l:' + fold_old_english(native))))
            elif lang == 'oldnorse':
                hits.append(('exact', index.get(norm_old_norse(native))))
            elif lang == 'gothic':
                hits.append(('exact', index.get(norm_gothic(roman or form))))
            elif lang == 'akkadian':
                hits.append(('exact', index.get(norm_akkadian(native))))
            elif lang == 'egyptian':
                hits.append(('exact', index.get(norm_egyptian(native))))
            elif lang == 'sumerian':
                reading = (roman or form).strip()
                if ' ' not in reading:
                    hits.append(('exact', index.get('f:' + norm_sumerian_form(reading))))
                    hits.append(('exact', index.get('c:' + norm_sumerian(reading))))
            elif lang == 'hebrew':
                if name == 'bdb':
                    hits.append(('exact', index.get('H' + number) if number else None))
                    hits.append(('exact', index.get(f'p:heb:{pointed(native)}')))
                    hits.append(('loose', index.get(f'c:heb:{skeleton(native)}')))
                else:
                    hits.append(('exact', index.get(f'p:{pointed(native)}')))
                    hits.append(('loose', index.get(f'c:{skeleton(native)}')))
            elif lang == 'aramaic':
                bare = skeleton(native)
                short = bare[:-1] if noun and bare.endswith('א') and len(bare) > 2 else None
                if name == 'bdb':
                    hits.append(('exact', index.get('A' + number) if number else None))
                    hits.append(('loose', index.get(f'c:arc:{bare}')))
                    hits.append(('loose', index.get(f'c:arc:{short}') if short else None))
                else:
                    hits.append(('loose', index.get(bare)))
                    hits.append(('loose', index.get(short) if short else None))
                    # Biblical Aramaic cites the absolute state, the later dialects the emphatic.
                    hits.append(('loose', index.get(bare + 'א') if noun and number else None))
            for strength, entries in hits:
                if entries:
                    yield name, strength, entries
                    break

    def _check_proto(self, root: dict) -> dict:
        entries = self.proto[root['lang']].get(unicodedata.normalize('NFC', root.get('native') or ''))
        if not entries:
            return _result('unconfirmed', None, 'reconstruction not found in the raw dump')
        keys = tuple(root.get('keys') or ())
        same = [e for e in entries if not root.get('entry_pos') or e[0] == root['entry_pos']] or entries
        if len(same) > 1 and keys:
            # Homonymous reconstructions: the one our gloss was read from.
            mine = [e for e in same if lemmas(keys[0], True) & lemmas(e[1], True)]
            same = mine or same
        langs = min((e[2] for e in same), key=len)
        if len(langs) >= 2:
            shown = ', '.join(langs[:6]) + (f' +{len(langs) - 6}' if len(langs) > 6 else '')
            return _result('verified', 'descendants', f'{len(langs)} attested daughter languages: {shown}')
        if langs:
            return _result('unconfirmed', None, f'attested in one daughter language only: {langs[0]}')
        return _result('unconfirmed', None, 'no attested descendants listed in the entry')


def _clip(text: str, limit: int = 150) -> str:
    text = re.sub(r'\s+', ' ', text).strip()
    return text if len(text) <= limit else text[: limit - 1].rstrip() + '…'


def _result(status: str, by: str | None, note: str) -> dict:
    return {'status': status, 'by': by, 'note': note}


# ── command line ───────────────────────────────────────────────────────────────────────

def main() -> None:
    started = time.time()
    print('loading second sources (the first run parses them; later runs read the cache)', flush=True)
    verifier = Verifier(SRC, verbose=True)
    print(f'Verifier ready in {time.time() - started:.1f}s'
          + (f'; missing: {", ".join(verifier.missing)}' if verifier.missing else ''), flush=True)

    roots_path = SRC / 'cache' / 'roots.selected.jsonl'
    out_path = SRC / 'cache' / 'verification.jsonl'
    tally: dict = collections.defaultdict(collections.Counter)
    by: dict = collections.defaultdict(collections.Counter)
    started = time.time()
    count = 0
    with roots_path.open(encoding='utf8') as handle, out_path.open('w', encoding='utf8') as out:
        for line in handle:
            root = json.loads(line)
            result = verifier.check(root)
            count += 1
            tally[root['lang']][result['status']] += 1
            if result['status'] == 'verified':
                by[root['lang']][result['by']] += 1
            out.write(json.dumps({
                'lang': root['lang'], 'native': root.get('native', ''), 'form': root.get('form', ''),
                'gloss': root.get('gloss', ''), 'status': result['status'], 'by': result['by'],
                'note': result['note'],
            }, ensure_ascii=False) + '\n')
    checked = time.time() - started

    print(f'\n{"language":12} {"total":>6} {"verified":>11} {"conflict":>9} {"unconf.":>8}   verified by')
    total = collections.Counter()
    for lang in sorted(tally, key=lambda l: -sum(tally[l].values())):
        t = tally[lang]
        n = sum(t.values())
        total.update(t)
        who = ', '.join(f'{name} {c}' for name, c in by[lang].most_common())
        print(f'{lang:12} {n:6} {t["verified"]:6} {100 * t["verified"] / n:3.0f}% {t["conflict"]:9} '
              f'{t["unconfirmed"]:8}   {who}')
    n = sum(total.values())
    print(f'{"all":12} {n:6} {total["verified"]:6} {100 * total["verified"] / max(n, 1):3.0f}% '
          f'{total["conflict"]:9} {total["unconfirmed"]:8}')
    print(f'\n{count} roots checked in {checked:.1f}s → {out_path.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
