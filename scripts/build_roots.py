#!/usr/bin/env python3
"""
Builds the generated half of the Archis lexicon: the root database and the English
thesaurus that reads a query onto it.

    data-src/fetch.sh                                   # once — about 2.5 GB of dumps
    python3 -m venv data-src/venv
    data-src/venv/bin/pip install nltk wordfreq
    data-src/venv/bin/python scripts/build_roots.py     # add --refresh after a new fetch

Writes src/data/generated/shards/*.json and stats.ts. They are committed, so a deploy
needs none of this — only someone changing the database does.

Where the data comes from, and what that obliges:
  · Wiktionary, through the kaikki.org extracts — CC BY-SA 4.0. The ancient languages.
  · Strong's Hebrew dictionary (openscriptures/strongs) — public domain. Biblical Hebrew
    and Biblical Aramaic, so nothing modern is passed off as biblical.
  · Eldamo (Paul Strack) — CC BY 4.0. Tolkien's languages, his own words only: fan-made
    neologisms and forms he rejected are dropped.
  · WordNet (Princeton) — the English side: what a query word means, and what is near it.

A root is kept only when its dictionary gloss comes down to a plain English word people
actually use. That word is the root's *key*, and the query reader matches on keys — so a
root is reachable exactly when someone could plausibly type what it means.
"""

from __future__ import annotations

import collections
import math
import functools
import json
import re
import sys
import unicodedata
import xml.etree.ElementTree as ET
from pathlib import Path

import nltk
from wordfreq import zipf_frequency

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'data-src'
CACHE = SRC / 'cache'
OUT = ROOT / 'src' / 'data' / 'generated'

nltk.data.path.insert(0, str(SRC / 'nltk_data'))
try:
    from nltk.corpus import wordnet as wn
    wn.ensure_loaded()
except LookupError:
    nltk.download('wordnet', download_dir=str(SRC / 'nltk_data'), quiet=True)
    from nltk.corpus import wordnet as wn
    wn.ensure_loaded()

REFRESH = '--refresh' in sys.argv


@functools.lru_cache(maxsize=None)
def zipf(word: str) -> float:
    return zipf_frequency(word, 'en')


# ── what counts as a meaning ───────────────────────────────────────────────────────────

# A key has to be a word someone would type. 2.8 on the Zipf scale is roughly the 37,000
# most frequent English words: "hearth" and "thunderbolt" are in, "aardwolf" is not.
MIN_KEY_ZIPF = 2.8

# Words that are in every dictionary gloss and mean nothing as the idea behind a name.
STOP_KEYS = set('''
be have do get go come put take let use make cause become thing one something someone
somebody anything anyone kind type sort lot bit act state manner very also not and or the
this that it he she they we you who what which there here then than such some any other
same own certain various particular especially etc esp usually often sometimes used using
term letter numeral case sense see cf like lit literally figuratively being having doing
going getting everything nothing none another either neither each every both few several
many much more most less least quite rather too so as at by for from in into of on onto
out over to under up with without off about above after again against along among around
before behind below beneath beside between beyond during except inside near since through
toward until upon within yes no ok well back down away things stuff item entity unit
'''.split())

# Meanings a name should not be built on. Any gloss carrying one of these is dropped
# whole — a root does not get to keep its polite second sense.
CRUDE = set('''
penis vagina vulva phallus testicle testicles scrotum anus buttock buttocks arse ass
excrement feces faeces dung shit turd urine urinate piss defecate fart semen sperm
copulate copulation fornicate fornication intercourse sex sexual masturbate prostitute
whore harlot slut brothel rape rapist pubic genitals genitalia genital clitoris erection
nipple vomit pus diarrhea diarrhoea menstruate menstruation menstrual incest pederast
sodomy sodomite homosexual lesbian eunuch castrate castration cuckold bastard concubine
catamite pimp lust lustful lewd obscene fuck cunt cock dick tit tits bitch nigger negro
leper leprosy scab mange lice louse maggot snot spit spittle saliva phlegm belch burp
slave enslave torture corpse carcass carrion suicide murder murderer kill killer
abortion miscarriage childbirth childbed afterbirth placenta ulcer tumor boil abscess
gangrene dysentery hernia hemorrhoid wart pimple scabies vermin constipation drunken
drunkard drunkenness
'''.split())

# Things no speaker of these languages had a word for. Wiktionary records the modern
# coinages too — a Sanskrit word for coffee, a Latin one for the telephone — and a root
# offered as ancient must not be one of them.
MODERN = set('''
coffee tea computer telephone phone television radio train car automobile airplane
aeroplane plane aircraft electricity electric electronic internet software hardware
interface camera photograph photography film movie cinema video rocket bomb gun pistol
rifle cannon bicycle bus taxi airport railway railroad tobacco potato tomato chocolate
cigarette cigar plastic petrol gasoline motor battery laser robot tram hotel passport
newspaper magazine football soccer tennis baseball basketball cricket golf digital
online email website telegraph telegram locomotive submarine helicopter missile nuclear
atomic oxygen hydrogen nitrogen vaccine antibiotic refrigerator fridge elevator lift
tractor truck lorry motorcycle jet parachute microscope telescope thermometer program
programme download upload database keyboard printer scanner satellite vitamin protein
calorie volt watt pixel byte sandwich pizza pasta sushi vodka whiskey whisky rum gin
cocktail soda jeans zipper velcro nylon polyester franc dollar euro yen pound cent penny
'''.split())

BAD_SENSE_TAGS = {
    'form-of', 'alt-of', 'abbreviation', 'vulgar', 'derogatory', 'offensive', 'slang',
    'misspelling', 'New-Latin', 'Medieval-Latin', 'Renaissance-Latin', 'Contemporary-Latin',
    'letter', 'initialism', 'acronym', 'euphemistic', 'slur', 'pejorative', 'humorous',
}

# Words whose other part of speech is a different word altogether. An adjective glossed
# "light" is as likely to mean "not heavy" as "bright", and light is the one idea this
# product cannot afford to get wrong; the bright ones are still found under "bright".
ONLY_AS = {'light': 'nv', 'fast': 'a', 'kind': 'a', 'mean': 'a', 'fine': 'a', 'well': 'n',
           'sound': 'nv', 'rest': 'nv', 'still': 'a', 'lead': 'v', 'spring': 'n'}

RUDE_TAGS = {'vulgar', 'derogatory', 'offensive', 'slur', 'pejorative'}

WN_POS = {'n': 'nva', 'v': 'vna', 'a': 'anv'}


@functools.lru_cache(maxsize=None)
def pos_share(word: str) -> dict[str, float]:
    """How a word's use divides between noun, verb and adjective, by WordNet's counts."""
    counts = collections.Counter()
    for synset in wn.synsets(word):
        pos = 'a' if synset.pos() in ('a', 's') else synset.pos()
        counts[pos] += sum(l.count() for l in synset.lemmas() if l.name().lower() == word)
    total = sum(counts.values())
    return {p: c / total for p, c in counts.items()} if total >= 5 else {}


CONCRETE = {'noun.animal', 'noun.plant', 'noun.object', 'noun.artifact', 'noun.food',
            'noun.substance', 'noun.body', 'noun.phenomenon', 'noun.person'}


@functools.lru_cache(maxsize=None)
def leading_lexname(word: str) -> dict[str, str | None]:
    """WordNet's broad field for the first noun and first verb sense of a word."""
    out: dict[str, str | None] = {'n': None, 'v': None}
    for pos in out:
        senses = [s for s in wn.synsets(word, pos) if any(l.name().lower() == word for l in s.lemmas())]
        if senses:
            out[pos] = senses[0].lexname()
    return out


@functools.lru_cache(maxsize=None)
def only_proper(word: str) -> bool:
    """True for "Syrian", "Roman" — words WordNet only ever writes with a capital."""
    names = [l.name() for s in wn.synsets(word) for l in s.lemmas() if l.name().lower() == word]
    return bool(names) and all(n[:1].isupper() for n in names)


def lemma_key(word: str, pos: str) -> str | None:
    """The dictionary headword behind an English gloss word, or None if it is no use."""
    word = word.strip("-'")
    if not re.fullmatch(r'[a-z]+', word) or len(word) < 2:
        return None
    for p in WN_POS[pos]:
        base = wn.morphy(word, p)
        if base and '_' not in base and re.fullmatch(r'[a-z]+', base):
            if base in STOP_KEYS or base in CRUDE or base in MODERN or zipf(base) < MIN_KEY_ZIPF:
                return None
            if only_proper(base):
                return None
            # "fast" the adjective is quick; "fast" the noun is going without food. When
            # one reading is nearly all of a word's use, a root glossed with the other is
            # not what anyone typing the word means.
            # A thing you can point at is exempt: "bear" is overwhelmingly a verb in running
            # text and overwhelmingly an animal in a request for a name.
            lead = leading_lexname(base)
            share = pos_share(base)
            if share and share.get(pos, 0) < 0.12 and not (pos == 'n' and lead['n'] in CONCRETE):
                return None
            if pos == 'v' and lead['n'] == 'noun.animal' and lead['v'] != 'verb.motion':
                return None
            if pos not in ONLY_AS.get(base, pos):
                return None
            return base
    return None


LEAD = re.compile(
    r'^(?:properly|probably|apparently|perhaps|generally|specifically|especially|literally|'
    r'figuratively|by extension|by implication|strictly|simply|merely|only|also|i\.e\.|e\.g\.|or|and)[,:]?\s+', re.I)
ARTICLE = re.compile(r'^(?:a|an|the|some|any|one\'s|to)\s+', re.I)
BE = re.compile(r'^(?:be|become|make|get|grow|cause to be|cause to)\s+', re.I)


# Wiktionary is written by both sides of the Atlantic, so "colour" and "color" are two
# different meanings to a reader that matches on words — and this site is American. Every
# gloss is respelled before anything reads it.
AMERICAN_EXPLICIT = dict(pair.split('>') for pair in '''
practise>practice practised>practiced practising>practicing mould>mold moulded>molded
moulding>molding moulder>molder grey>gray greyish>grayish plough>plow ploughed>plowed
ploughing>plowing ploughman>plowman judgement>judgment catalogue>catalog programme>program
licence>license labelled>labeled labelling>labeling travelled>traveled travelling>traveling
traveller>traveler cancelled>canceled jewellery>jewelry jewelled>jeweled marvellous>marvelous
woollen>woolen counsellor>counselor storey>story tyre>tire kerb>curb draught>draft
cheque>check moustache>mustache sceptre>scepter spectre>specter lustre>luster sombre>somber
sepulchre>sepulcher centre>center centred>centered theatre>theater metre>meter fibre>fiber
sabre>saber meagre>meager calibre>caliber skilful>skillful wilful>willful fulfil>fulfill
fulfilment>fulfillment instalment>installment enrol>enroll ageing>aging towards>toward
whilst>while amongst>among learnt>learned defence>defense offence>offense pretence>pretense
manoeuvre>maneuver pyjamas>pajamas sceptic>skeptic sceptical>skeptical aluminium>aluminum
artefact>artifact cosy>cozy gaol>jail enquiry>inquiry mediaeval>medieval foetus>fetus
quarrelled>quarreled quarrelling>quarreling levelled>leveled worshipped>worshiped
worshipper>worshiper kidnapped>kidnaped axe>ax saviour>savior
'''.split())
AMERICAN_RULES = [('isation', 'ization'), ('ising', 'izing'), ('ised', 'ized'), ('iser', 'izer'),
                  ('ise', 'ize'), ('yse', 'yze'), ('our', 'or'), ('lled', 'led'), ('lling', 'ling'),
                  ('ller', 'ler'), ('ae', 'e'), ('oe', 'e')]


@functools.lru_cache(maxsize=None)
def american_spellings() -> dict[str, str]:
    out = dict(AMERICAN_EXPLICIT)
    try:
        british = set(Path('/usr/share/dict/british-english').read_text(encoding='utf8').split())
        american = set(Path('/usr/share/dict/american-english').read_text(encoding='utf8').split())
    except FileNotFoundError:
        return out
    for word in british - american:
        # "snowshoed" is not a British "snowshed".
        if not re.fullmatch(r'[a-z]+', word) or word in out or word.endswith(('oed', 'oes')):
            continue
        for old, new in AMERICAN_RULES:
            respelled = word.replace(old, new)
            if respelled != word and respelled in american:
                out[word] = respelled
                break
        else:
            if word.endswith('re') and word[:-2] + 'er' in american:
                out[word] = word[:-2] + 'er'
    return out


def americanize(text: str) -> str:
    table = american_spellings()

    def fix(match: re.Match) -> str:
        word = match.group()
        new = table.get(word.lower())
        if not new:
            return word
        return new.capitalize() if word[:1].isupper() else new

    return re.sub(r'[A-Za-z]+', fix, text)


PREPOSED = re.compile(r'^(?:of|for|in|on|with|as|by|from|at|into|about|among)\b', re.I)
DOUBT = re.compile(r'\b(?:probably|perhaps|apparently|possibly|uncertain|unknown|doubtful|dubious)\b|\?', re.I)
NOTABLE_TAGS = {'rare', 'hapax', 'uncertain', 'poetic', 'archaic', 'obsolete', 'dialectal', 'Late-Latin',
                'Ecclesiastical', 'Koine', 'Byzantine', 'reconstruction', 'figuratively', 'dated',
                'nonstandard', 'neologism', 'historical', 'Epic', 'Vedic', 'Classical-Sanskrit'}

HEDGE = re.compile(
    r'\b(?:properly|probably|apparently|perhaps|strictly|literally|figuratively|generally|'
    r'specifically|especially|usually|concretely|abstractly|collectively|transitively|'
    r'intransitively|causatively|reflexively|by implication|by extension|by analogy)\b[,:]?\s*',
    re.I)


def clean_gloss(text: str) -> str:
    text = americanize(text)
    text = re.sub(r'\([^()]*\)', ' ', text)
    text = re.sub(r'\([^()]*\)', ' ', text)
    text = re.sub(r'\[[^\]]*\]', ' ', text)
    text = text.replace('i.e.', ';').replace('e.g.', ';').replace('×', ' ').replace('→', ',')
    # Strong's hedges nearly every entry — "properly, to twist" — and a hedge followed by
    # a comma would otherwise be read as the first of several meanings.
    text = HEDGE.sub('', text)
    text = re.sub(r'\s+', ' ', text).strip(' .;,:')
    return text


def read_gloss(senses: list[tuple[str, list[str]]], pos: str) -> list[dict]:
    """
    The readings of an entry — display gloss, keys, weight, and how each was arrived at.

    At most two, from the first three senses. Dictionaries list the core meaning first
    and the stretched ones after it, so a root reachable through its fifth sense would
    answer a query with something its own entry barely supports. But the first sense
    alone is too strict: Wiktionary opens basileús with "chief, master" and only then
    says "king". Each reading keeps its own gloss, so a name built on the second sense
    says the second sense.
    """
    for raw, _tags in senses[:3]:
        if any(word in CRUDE for word in re.findall(r'[a-z]+', raw.lower())):
            return []
    readings: list[dict] = []
    taken: set[str] = set()
    for index, (raw, tags) in enumerate(senses[:3]):
        if len(readings) == 2:
            break
        text = clean_gloss(raw)
        if not text or len(text) > 140:
            continue
        alts = [a.strip() for a in re.split(r'\s*[;,]\s*|\s+or\s+', text) if a.strip()]
        bared = []
        for alt in alts[:5]:
            bare = alt
            while LEAD.match(bare):
                bare = LEAD.sub('', bare, count=1)
            is_verb = bare.lower().startswith('to ') or pos == 'v'
            if bare.startswith('I ') and pos == 'v':
                bare = bare[2:]
            said = ARTICLE.sub('', ARTICLE.sub('', bare))
            bared.append((bare, said, is_verb))
        # Commas separate synonyms only when every piece is short. "a fast, light breed
        # of horse" is one description with a comma in it, and reading it as three
        # meanings files a horse under "fast".
        if any(len(said.split()) > 3 for _, said, _ in bared[:3]):
            continue
        keys: list[str] = []
        shown: list[str] = []
        rescued = False
        for bare, said, is_verb in bared:
            # "Of, for music, musical" and "floor, of a building" are one description
            # that a comma happens to run through. Whatever follows the preposition
            # is the rest of a phrase, not another meaning.
            if PREPOSED.match(said):
                break
            # A proper name is not a meaning: "the Mediterranean Sea" is not "sea".
            if not said or (said[:1].isupper() and len(bared) > 1) or re.search(r'\b[A-Z]', said[1:]):
                continue
            core = BE.sub('', said) if is_verb else said
            words = core.lower().split()
            key = None
            if len(words) == 1:
                key = lemma_key(words[0], 'v' if is_verb and core == said else pos)
            elif len(words) == 2 and not keys and pos != 'v' and not bare.lower().startswith('to '):
                # "wild boar", "great king": the head noun, at a discount.
                key = lemma_key(words[1], 'n')
                rescued = key is not None
            # A root is filed only under meanings its displayed gloss actually states: a
            # key taken from the fifth alternative would answer a search with a name
            # whose card says something else.
            label = ('to ' + said) if bare.lower().startswith('to ') else said
            if len(shown) >= 3 or len(', '.join(shown + [label])) > 46:
                break
            shown.append(label)
            if key and key not in keys:
                keys.append(key)
        keys = [key for key in keys if key not in taken]
        if not keys or not shown:
            continue
        taken.update(keys)
        weight = 0.9 if len(alts) == 1 else 0.85
        if readings:
            weight -= 0.07
        # "Drunken company" was filed under "company" on the strength of its head noun.
        # That is a loose match, and it should lose to any root that simply means company.
        if rescued:
            weight = min(weight, 0.6)
        gloss = ', '.join(shown)
        gloss = gloss[0].lower() + gloss[1:] if gloss[:2] != 'I ' else gloss
        readings.append({
            'gloss': gloss, 'keys': keys, 'weight': weight,
            # What the audit wants to know about this reading: which sense it came from,
            # whether the key is only the head of a two-word gloss, whether the source
            # itself hedged ("probably", "perhaps", a question mark), and its usage tags.
            'sense': index, 'rescued': rescued,
            'hedged': bool(DOUBT.search(raw)), 'tags': sorted(set(tags) & NOTABLE_TAGS),
        })
    return readings


# ── spelling a root so it can be said ──────────────────────────────────────────────────

def strip_marks(text: str) -> str:
    return ''.join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn')


def fold(text: str, table: dict[str, str] | None = None) -> str:
    """Lower-case, apply a language's own respellings, then strip to bare a–z."""
    text = unicodedata.normalize('NFC', text.lower())
    for src, dst in (table or {}).items():
        text = text.replace(src, dst)
    text = strip_marks(text)
    for src, dst in COMMON.items():
        text = text.replace(src, dst)
    return re.sub(r'[^a-z]', '', text)


COMMON = {
    'þ': 'th', 'ð': 'd', 'æ': 'ae', 'œ': 'oe', 'ø': 'o', 'ƕ': 'hw', 'ə': 'e', 'ǝ': 'e',
    'ʰ': 'h', 'ʷ': 'w', 'ŋ': 'ng', 'ß': 'ss', 'ɸ': 'f', 'θ': 'th', 'δ': 'dh', 'γ': 'gh',
    'ɣ': 'gh', 'χ': 'kh', 'β': 'b', 'ᵉ': 'e', 'ʸ': 'y', 'ı': 'i', 'ł': 'l', 'ƀ': 'b',
    'ǥ': 'g', 'ʒ': 'h', 'ƿ': 'w',
}

SEMITIC = {
    'š': 'sh', 'ṣ': 's', 'ṭ': 't', 'ḥ': 'h', 'ḫ': 'kh', 'ś': 's', 'ġ': 'gh', 'ḏ': 'dh',
    'ṯ': 'th', 'ḇ': 'v', 'ḡ': 'gh', 'ḵ': 'kh', 'p̄': 'ph', 'ẓ': 'z', 'ḍ': 'd', 'ž': 'zh',
    'č': 'ch', 'ǧ': 'j',
}
INDIC = {
    'ś': 'sh', 'ṣ': 'sh', 'ṛ': 'ri', 'ṝ': 'ri', 'ḷ': 'li', 'ṅ': 'n', 'ñ': 'n', 'ṇ': 'n',
    'ṭ': 't', 'ḍ': 'd', 'ḥ': '', 'ṃ': 'm', 'ṁ': 'm',
}
IRANIAN = {'x': 'kh', 'š': 'sh', 'θ': 'th', 'ç': 's', 'ž': 'zh', 'č': 'ch', 'ǰ': 'j', 'ʰ': ''}

VOWELS = 'aeiouy'
DIGRAPHS = ('kh', 'th', 'sh', 'ph', 'ch', 'dh', 'zh', 'gh', 'ts', 'qu')


def units(word: str) -> list[str]:
    out, i = [], 0
    while i < len(word):
        if word[i:i + 2] in DIGRAPHS:
            out.append(word[i:i + 2])
            i += 2
        else:
            out.append(word[i])
            i += 1
    return out


def valid_stem(stem: str) -> bool:
    """Something the blender can cut up: letters, a vowel, no wall of consonants."""
    if not re.fullmatch(r'[a-z]{2,9}', stem):
        return False
    parts = units(stem)
    if not any(p in VOWELS for p in parts):
        return False
    run = 0
    for p in parts:
        run = 0 if p in VOWELS else run + 1
        if run >= 4:
            return False
    if re.search(r'(.)\1\1', stem):
        return False
    return True


def strip_end(stem: str, endings: tuple[str, ...], floor: int = 2) -> str:
    for ending in endings:
        if stem.endswith(ending):
            rest = stem[: -len(ending)]
            if len(rest) >= floor and any(c in VOWELS for c in rest):
                return rest
    return stem


def stem_greek(roman: str) -> str:
    s = fold(roman)
    # Upsilon is "y" in the English tradition these roots reach us through — except in
    # the diphthongs, where it stays the "u" of "eu" and "au".
    s = re.sub(r'(?<![aeo])u', 'y', s)
    return strip_end(s, ('omai', 'eia', 'eus', 'eo', 'ao', 'oo', 'mai', 'os', 'on', 'es',
                         'is', 'ys', 'ia', 'e', 'a', 'o', 'mi'))


def form_greek(roman: str) -> str:
    text = unicodedata.normalize('NFD', roman.lower()).replace('̆', '')
    out, prev = [], ''
    for ch in text:
        if unicodedata.category(ch) == 'Mn':
            out.append(ch)
            continue
        out.append('y' if ch == 'u' and prev not in 'aeo' else ch)
        prev = ch
    return unicodedata.normalize('NFC', ''.join(out))


def stem_latin(word: str, pos: str, genitive: str | None) -> str:
    s = fold(word)
    if pos == 'v':
        return strip_end(s, ('eor', 'ior', 'or', 'eo', 'io', 'o'))
    if genitive and pos == 'n':
        g = fold(genitive)
        cut = strip_end(g, ('orum', 'arum', 'ium', 'ae', 'is', 'us', 'ei', 'i'))
        # A genitive that shares nothing with the headword is a table artefact.
        if cut != g and cut[:2] == s[:2]:
            return cut
    s = strip_end(s, ('us', 'um', 'is', 'es', 'a', 'e'))
    if s.endswith('ns'):
        s = s[:-1] + 't'
    return s


def stem_indic(roman: str, table=INDIC) -> str:
    text = unicodedata.normalize('NFC', roman.lower())
    for src, dst in table.items():
        text = text.replace(src, dst)
    text = strip_marks(text)
    text = text.replace('ch', '\0').replace('c', 'ch').replace('\0', 'ch')
    s = re.sub(r'[^a-z]', '', text)
    if len(s) >= 4 and s[-1] in 'aiu' and s[-2] not in VOWELS:
        s = s[:-1]
    return s


def stem_old_english(word: str, pos: str) -> str:
    s = fold(word, {'ċ': 'ch', 'ġ': 'g', 'ð': 'th', 'þ': 'th', 'æ': 'ae', 'ǣ': 'ae'})
    if pos == 'v':
        return strip_end(s, ('ian', 'an', 'on'))
    return strip_end(s, ('a', 'e', 'u'), 3)


def stem_old_norse(word: str, pos: str) -> str:
    s = fold(word, {'ð': 'd', 'þ': 'th', 'ǫ': 'o', 'ø': 'o'})
    if pos == 'v':
        return strip_end(s, ('ja', 'a'))
    s = strip_end(s, ('inn', 'ur', 'r', 'i', 'a'), 3)
    return re.sub(r'(.)\1$', r'\1', s)


def stem_gothic(roman: str, pos: str) -> str:
    s = fold(roman, {'þ': 'th', 'ƕ': 'hw'})
    if pos == 'v':
        return strip_end(s, ('jan', 'on', 'an'))
    return strip_end(s, ('us', 's', 'a', 'o'), 3)


def stem_proto_germanic(word: str, pos: str) -> str:
    s = fold(word, {'þ': 'th', 'ð': 'd'})
    if pos == 'v':
        return strip_end(s, ('jana', 'ona', 'ana', 'na'))
    return strip_end(s, ('az', 'iz', 'uz', 'a', 'o', 'i', 'u'), 3)


def stem_proto_celtic(word: str, pos: str) -> str:
    s = fold(word.replace('xs', 'x'))
    if pos == 'v':
        return strip_end(s, ('eti', 'ati', 'iti', 'ti', 'tor'))
    return strip_end(s, ('os', 'om', 'is', 'us', 'a', 's'), 3)


def stem_pie(word: str) -> str:
    """
    A reconstruction cannot be said as written, so it is said the way the daughters said
    it: each laryngeal colours the vowel beside it and goes, a syllabic resonant grows a
    vowel, and the palatal and labial marks fall away. *ǵneh₃- comes out "gno".
    """
    s = unicodedata.normalize('NFC', word).replace('H', 'h₁').lower()
    s = re.sub(r'\([^)]*\)', '', s)
    s = s.replace('*', '').strip('-')
    s = unicodedata.normalize('NFD', s).replace('́', '').replace('̀', '')
    s = unicodedata.normalize('NFC', s)
    for src, dst in (('l̥', 'ul'), ('r̥', 'ur'), ('m̥', 'em'), ('n̥', 'en'), ('ḱ', 'k'),
                     ('ǵʰ', 'gh'), ('ǵ', 'g'), ('gʷʰ', 'gw'), ('kʷ', 'kw'), ('gʷ', 'gw'),
                     ('bʰ', 'bh'), ('dʰ', 'dh'), ('gʰ', 'gh'), ('ē', 'e'), ('ō', 'o'),
                     ('ā', 'a'), ('ī', 'i'), ('ū', 'u')):
        s = s.replace(src, dst)
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    s = s.replace('h₂', '2').replace('h₃', '3').replace('h₁', '1')
    s = s.replace('e2', 'a').replace('e3', 'o').replace('e1', 'e')
    s = s.replace('2e', 'a').replace('3e', 'o').replace('1e', 'e')
    s = re.sub(r'([iuo])[123]', r'\1', s)
    s = re.sub(r'(?<=[^aeiou123])[123](?=[^aeiou123])', 'a', s)
    s = re.sub(r'[123]', '', s)
    s = re.sub(r'[^a-z]', '', s)
    if s.endswith('os'):
        s = s[:-1]
    elif s.endswith('om'):
        s = s[:-1]
    return s


def stem_egyptian(word: str) -> str:
    """
    Egyptian was written without vowels. This is the Egyptologists' own convention for
    saying it aloud — the weak consonants read as vowels and an "e" goes wherever two
    consonants would otherwise meet — and it is a convention, not a recovery.
    """
    s = unicodedata.normalize('NFC', word.lower()).replace('.', '').replace('-', '').replace('=', '')
    table = {'ꜣ': 'a', 'ꜥ': 'a', 'j': 'i', 'ï': 'i', 'y': 'y', 'ḥ': 'h', 'ḫ': 'K', 'ẖ': 'K', 'š': 'S',
             'ṯ': 'T', 'ḏ': 'D', 'z': 's', 'ś': 's', 'q': 'q', 'ḳ': 'q', 'i̯': 'i', 'u̯': 'u'}
    for src, dst in table.items():
        s = s.replace(src, dst)
    if not re.fullmatch(r'[a-zKSTD]+', s):
        return ''
    chars = list(s)
    for i, ch in enumerate(chars):
        if ch == 'w' and i > 0 and chars[i - 1] not in 'aiu':
            chars[i] = 'u'
    out: list[str] = []
    for i, ch in enumerate(chars):
        if out and ch not in 'aiu' and out[-1] not in 'aiue':
            pair = out[-1] + ch
            last = i == len(chars) - 1
            if not (last and pair in ('nK', 'nt', 'st')):
                out.append('e')
        out.append(ch)
    if not any(c in 'aiue' for c in out):
        out.append('e') if len(out) > 1 else out.insert(1, 'e')
    text = ''.join(out)
    return text.replace('K', 'kh').replace('S', 'sh').replace('T', 'tj').replace('D', 'dj')


def stem_hebrew(xlit: str) -> str:
    s = unicodedata.normalize('NFC', xlit.lower())
    for src, dst in (('ôw', 'o'), ('ûw', 'u'), ('îy', 'i'), ('êy', 'e'), ('ʼ', ''), ('ʻ', ''),
                     ('ᵉ', 'e'), ('ch', 'h'), ('th', 't'), ('tṭ', 't')):
        s = s.replace(src, dst)
    s = fold(s)
    s = re.sub(r'([^aeiou])\1', r'\1', s)
    if len(s) >= 5 and s.endswith('ah'):
        s = s[:-2]
    return s


def stem_semitic(roman: str, drop: tuple[str, ...] = ()) -> str:
    s = fold(roman, SEMITIC)
    return strip_end(s, drop, 3) if drop else s


def stem_akkadian(word: str, pos: str) -> str:
    s = fold(word, SEMITIC)
    return strip_end(s, ('um', 'u'), 3)


def stem_sumerian(roman: str) -> str:
    s = re.sub(r'[0-9₀-₉ₓ]', '', roman.lower())
    return fold(s, {'ĝ': 'g', 'š': 'sh', 'ḫ': 'kh', 'ř': 'r'})


def fold_greek(roman: str) -> str:
    return re.sub(r'(?<![aeo])u', 'y', fold(roman))


def fold_indic(roman: str) -> str:
    text = unicodedata.normalize('NFC', roman.lower())
    for src, dst in INDIC.items():
        text = text.replace(src, dst)
    text = strip_marks(text)
    text = text.replace('ch', '\0').replace('c', 'ch').replace('\0', 'ch')
    return re.sub(r'[^a-z]', '', text)


def fold_hebrew(xlit: str) -> str:
    s = unicodedata.normalize('NFC', xlit.lower())
    for src, dst in (('ôw', 'o'), ('ûw', 'u'), ('îy', 'i'), ('êy', 'e'), ('ʼ', ''), ('ʻ', ''),
                     ('ᵉ', 'e'), ('ch', 'h'), ('th', 't'), ('tṭ', 't')):
        s = s.replace(src, dst)
    return re.sub(r'([^aeiou])\1', r'\1', fold(s))


HEBREW_VOWEL = 'aeiouâêîôûᵉăĕŏ'


def hebrew_construct(xlit: str) -> str:
    """
    The construct state — the "X of" form a Hebrew noun takes in front of another — by
    the three regular changes: feminine -āh becomes -at, the diphthongs contract (bayit →
    bêt, māwet → môt), and a long a before the stress shortens to a murmur (dāvār →
    dəvar), except after a guttural. Irregular constructs are not known here.
    """
    s = unicodedata.normalize('NFC', xlit.lower())
    guttural = s[:1] in 'ʼʻh' or s[:2] == 'ch'
    if s.endswith('âh'):
        s = s[:-2] + 'ath'
    s = s.replace('ayi', 'êy')
    s = s.replace('âve', 'ôw')
    match = re.match(rf'^([^{HEBREW_VOWEL}]*)â([^{HEBREW_VOWEL}])(?=[{HEBREW_VOWEL}])', s)
    if match and not guttural:
        s = match.group(1) + 'ᵉ' + s[match.end(1) + 1:]
    return fold_hebrew(s)


def word_and_comb(lang: str, entry: dict, word: str, roman: str | None, pos: str, stem: str):
    """
    (final, combining): how the root is written as the LAST element of a compound, and
    as the FIRST. A language builds a compound out of a stem and a whole word — lyk-o-nyx
    is the stem of lýkos and the whole of nýx — and the blending stem above, which is cut
    for sound, is neither.
    """
    genitive = (entry.get('genitive') or [None])[0]
    gen_roman = (entry.get('gen_roman') or [None])[0]
    if lang == 'greek':
        final = fold_greek(roman)
        comb = stem
        if gen_roman:
            gen = fold_greek(gen_roman)
            # i- and u-stems keep their vowel in front of the link: physi-o-, ikhthy-o-.
            if gen.endswith('eos') and final.endswith(('is', 'ys')):
                comb = final[:-1]
            else:
                cut = strip_end(gen, ('eos', 'ous', 'os', 'ou', 'es', 'as'))
                if cut != gen and cut[:2] == final[:2]:
                    comb = cut
        return final, comb
    if lang == 'latin':
        final = fold(word)
        comb = stem
        if genitive and pos == 'a':
            gen = fold(genitive)
            cut = strip_end(gen, ('ae', 'is', 'i'))
            if cut != gen and cut[:2] == final[:2]:
                comb = cut
        return final, comb
    if lang in ('sanskrit', 'pali'):
        final = fold_indic(roman or word)
        return final, final
    if lang == 'oldenglish':
        return fold(word, {'ċ': 'ch', 'ġ': 'g', 'ð': 'th', 'þ': 'th', 'æ': 'ae', 'ǣ': 'ae'}), stem
    if lang == 'oldnorse':
        table = {'ð': 'd', 'þ': 'th', 'ǫ': 'o', 'ø': 'o'}
        final = fold(word, table)
        # akr is akr-s in the genitive: that r is part of the word, not its ending.
        if genitive and fold(genitive, table).startswith(final):
            return final, final
        return final, strip_end(final, ('inn', 'ur', 'r', 'i', 'a'), 3) if pos != 'v' else stem
    if lang == 'gothic':
        return fold(roman, {'þ': 'th', 'ƕ': 'hw'}), stem
    if lang == 'pgmc':
        return fold(word, {'þ': 'th', 'ð': 'd'}), stem
    if lang == 'pcelt':
        final = fold(word.replace('xs', 'x'))
        if final.endswith(('us', 'is')):
            return final, final[:-1]
        if genitive and not final.endswith(('os', 'om', 'a')):
            gen = fold(genitive)
            if gen.endswith('os') and gen[:2] == final[:2]:
                return final, gen[:-2]
        return final, stem
    if lang == 'akkadian':
        final = re.sub(r'm$', '', fold(word, SEMITIC))
        construct = (entry.get('construct') or [None])[0]
        return final, fold(construct, SEMITIC) if construct else ''
    if lang == 'aramaic':
        return fold(roman, SEMITIC), stem
    if lang == 'geez':
        return stem, stem
    return stem, stem


def stem_elvish(value: str) -> str:
    s = re.sub(r'[¹²³⁴⁵⁶⁷⁸⁹⁰]', '', value)
    s = re.sub(r'\([^)]*\)', '', s).strip('-')
    s = fold(s, {'ñ': 'ng', 'þ': 'th', 'ð': 'dh', 'ʒ': 'h', 'ƀ': 'v', 'ǝ': 'e', 'ë': 'e'})
    return s.replace('c', 'k').replace('kh', 'kh')


# ── reading the sources ────────────────────────────────────────────────────────────────

KAIKKI_POS = {'noun': 'n', 'verb': 'v', 'adj': 'a', 'root': 'n'}


def lemmas(name: str):
    """
    The entries of one kaikki dump that are words in their own right, cut down to the
    handful of fields used below. Cached, because the Latin dump alone is 1.2 GB and the
    stemming rules get rewritten far more often than the dump changes.
    """
    cache = CACHE / f'{name}.lemmas.jsonl'
    if cache.exists() and (CACHE / f'{name}.words.json').exists() and not REFRESH:
        with cache.open(encoding='utf8') as handle:
            for line in handle:
                yield json.loads(line)
        return

    CACHE.mkdir(exist_ok=True)
    kept = []
    words: list[list[str]] = []
    with (SRC / f'{name}.jsonl').open(encoding='utf8') as handle:
        for line in handle:
            entry = json.loads(line)
            # Every headword, whatever its part of speech, goes on the list of words that
            # already exist — a coined name must not turn out to be one of them.
            if entry.get('pos') not in ('character', 'symbol', 'romanization') and any(
                    'form_of' not in sense for sense in entry.get('senses', [])):
                romans = [f['form'] for f in entry.get('forms') or [] if 'romanization' in f.get('tags', [])]
                words.append([entry['word'], plain_roman(romans) or ''])
            if entry.get('pos') not in KAIKKI_POS:
                continue
            # A word whose leading sense is an obscenity does not get to be offered under
            # its polite second one: Latin cōleus is "courage" only the way "balls" is.
            # A later sense that is merely disparaging is a different matter — rēx is also
            # "tyrant" — and only that sense is passed over.
            leading = entry.get('senses', [])[:3]
            if leading and RUDE_TAGS & set(leading[0].get('tags') or []):
                continue
            if any({'vulgar', 'slur'} & set(sense.get('tags') or []) for sense in leading):
                continue
            senses = []
            for sense in entry.get('senses', []):
                tags = sense.get('tags') or []
                if 'form_of' in sense or 'alt_of' in sense or (BAD_SENSE_TAGS | RUDE_TAGS) & set(tags):
                    continue
                glosses = sense.get('glosses') or []
                if glosses:
                    senses.append([glosses[0], tags])
            if not senses:
                continue
            forms = entry.get('forms') or []
            roman = [f['form'] for f in forms if 'romanization' in f.get('tags', [])]
            canonical = [f['form'] for f in forms if 'canonical' in f.get('tags', [])]
            genitives = [f for f in forms
                         if 'genitive' in f.get('tags', []) and 'plural' not in f.get('tags', [])
                         and 'dual' not in f.get('tags', [])]
            genitive = [f['form'] for f in genitives]
            construct = [f['form'] for f in forms if 'construct' in f.get('tags', [])]
            kept.append({
                'word': entry['word'],
                'pos': entry['pos'],
                'roman': roman[:3],
                'canonical': canonical[:1],
                'genitive': genitive[:1],
                'gen_roman': [f['roman'] for f in genitives if f.get('roman')][:1],
                'construct': construct[:1],
                'senses': senses[:4],
                'rank': len(entry.get('descendants') or []) + len(entry.get('derived') or []),
            })
    with cache.open('w', encoding='utf8') as handle:
        for item in kept:
            handle.write(json.dumps(item, ensure_ascii=False) + '\n')
    (CACHE / f'{name}.words.json').write_text(json.dumps(words, ensure_ascii=False), encoding='utf8')
    yield from kept


def plain_roman(options: list[str]) -> str | None:
    """Of several romanisations, the one written as a word rather than sign by sign."""
    for option in options:
        if '-' not in option.strip('-') and not option.isupper() and ' ' not in option:
            return option
    return None


def from_kaikki(lang: str, name: str):
    for entry in lemmas(name):
        word = entry['word']
        pos = KAIKKI_POS[entry['pos']]
        is_root = entry['pos'] == 'root'
        roman = plain_roman(entry['roman'])
        if ' ' in word or (word[:1].isupper() and lang not in ('pie',)):
            continue

        if lang == 'greek':
            if not roman:
                continue
            form, stem = form_greek(roman), stem_greek(roman)
        elif lang == 'latin':
            canonical = (entry['canonical'] or [word])[0]
            if ' ' in canonical:
                continue
            form, stem = canonical, stem_latin(word, pos, (entry['genitive'] or [None])[0])
        elif lang in ('sanskrit', 'pali'):
            source = roman or (word if lang == 'pali' else None)
            if not source:
                continue
            form, stem = source, stem_indic(source)
        elif lang == 'oldenglish':
            form, stem = (entry['canonical'] or [word])[0], stem_old_english(word, pos)
        elif lang == 'oldnorse':
            form, stem = word, stem_old_norse(word, pos)
        elif lang == 'gothic':
            if not roman:
                continue
            form, stem = roman, stem_gothic(roman, pos)
        elif lang == 'pgmc':
            form, stem = f'*{word}', stem_proto_germanic(word, pos)
        elif lang == 'pcelt':
            form, stem = f'*{word}', stem_proto_celtic(word, pos)
        elif lang == 'pie':
            form, stem = f'*{word}', stem_pie(word)
        elif lang == 'oldirish':
            form, stem = word, fold(word)
        elif lang == 'akkadian':
            if not re.search(r'[a-zšṣṭḫ]', word.lower()):
                continue
            form, stem = word, stem_akkadian(word, pos)
        elif lang == 'sumerian':
            source = roman or next((r for r in entry['roman']), None)
            if not source:
                continue
            form, stem = source, stem_sumerian(source)
        elif lang == 'egyptian':
            if '-' in word or '.' in word:
                continue
            stem = stem_egyptian(word)
            form = f'{word} ({stem})'
        elif lang == 'hittite':
            if not roman:
                continue
            form, stem = roman, fold(roman.strip('-'), {'ḫ': 'h', 'š': 's'})
        elif lang == 'oldpersian':
            if not roman:
                continue
            form, stem = roman.replace('ʰ', ''), fold(roman, IRANIAN)
        elif lang == 'geez':
            if not roman:
                continue
            form, stem = roman, stem_semitic(roman)
        elif lang == 'aramaic':
            if not roman:
                continue
            form, stem = roman, stem_semitic(roman, ('a',))
        else:
            raise ValueError(lang)

        if not valid_stem(stem):
            continue
        for read in read_gloss([(g, t) for g, t in entry['senses']], pos):
            sense_pos = root_pos(read['gloss'], read['keys'][0]) if is_root else pos
            final, comb = word_and_comb(lang, entry, word, roman, sense_pos, stem)
            yield {
                **read, 'lang': lang, 'form': form, 'stem': stem, 'pos': sense_pos,
                'rank': entry['rank'] + (4 if is_root else 0),
                'source': f'wiktionary:{name}', 'native': word, 'roman': roman or '',
                'entry_pos': entry['pos'], 'final': final, 'comb': comb,
            }


def root_pos(gloss: str, key: str) -> str:
    """A bare root is glossed as whatever it means: "to shine", "wolf", "black"."""
    if gloss.startswith('to '):
        return 'v'
    share = pos_share(key)
    if share:
        return max(share, key=share.get) if max(share, key=share.get) in 'nva' else 'n'
    if wn.synsets(key, 'n'):
        return 'n'
    return 'v' if wn.synsets(key, 'v') else 'a'


NIQQUD = re.compile(r'[\u0591-\u05c7]')


def hebrew_skeleton(word: str) -> str:
    """A Hebrew word without its vowel points, which is how Wiktionary files it."""
    return NIQQUD.sub('', unicodedata.normalize('NFD', word))


def from_strongs():
    """
    Biblical Hebrew and Aramaic. Strong's decides what is biblical; it is not always the
    best witness to what a word plainly means — šālôm is defined as "safe, i.e. well,
    happy, friendly" and reaches "peace" in its last clause. Where Wiktionary has the same
    word and its plain gloss also stands in Strong's own definition or among the King
    James renderings, that gloss is added as a second reading. Two sources agreeing is
    also the definition of verified, and such a reading is marked so.
    """
    plain: dict[str, list] = collections.defaultdict(list)
    for entry in lemmas('Hebrew'):
        if entry['pos'] in ('noun', 'adj', 'verb'):
            plain[hebrew_skeleton(entry['word'])].append(entry)

    text = (SRC / 'strongs-hebrew.js').read_text(encoding='utf8')
    start = text.index('{', text.index('var strongsHebrewDictionary'))
    data = json.loads(text[start: text.rindex('}') + 1])
    for number, entry in data.items():
        xlit = entry.get('xlit', '')
        definition = entry.get('strongs_def', '')
        if not xlit or not definition or xlit[:1].isupper() or xlit.lstrip('ʼʻ')[:1].isupper():
            continue
        aramaic = '(Aramaic)' in entry.get('derivation', '') + definition
        definition = definition.replace('(Aramaic)', '')
        stem = stem_hebrew(xlit)
        if not valid_stem(stem):
            continue
        pos = 'v' if clean_gloss(definition).lower().startswith('to ') else 'n'
        readings = read_gloss([(clause, []) for clause in definition.split(';')[:3]], pos)

        # The plainer gloss, if two sources stand behind it.
        witness = (definition + ' ' + entry.get('kjv_def', '')).lower()
        have = {key for read in readings for key in read['keys']}
        if not aramaic:
            for other in plain.get(hebrew_skeleton(entry.get('lemma', '')), []):
                # mlk is both "king" and "to reign"; the noun's gloss is not the verb's.
                if (other['pos'] == 'verb') != (pos == 'v'):
                    continue
                for read in read_gloss([(g, t) for g, t in other['senses'][:1]], KAIKKI_POS[other['pos']]):
                    agreed = [k for k in read['keys'] if re.search(rf'\b{k}\b', witness) and k not in have]
                    if agreed:
                        have.update(agreed)
                        readings.append({**read, 'keys': agreed, 'gloss': ', '.join(agreed), 'sense': 0,
                                         'weight': 0.9, 'hedged': False, 'agrees': 'Wiktionary'})

        for read in readings:
            sense_pos = root_pos(read['gloss'], read['keys'][0])
            yield {
                **read, 'lang': 'aramaic' if aramaic else 'hebrew', 'form': xlit, 'stem': stem, 'pos': sense_pos,
                'rank': 2 if 'primitive' in entry.get('derivation', '') else 0,
                'source': f'strongs:{number}', 'native': entry.get('lemma', ''), 'roman': xlit,
                'entry_pos': sense_pos, 'final': fold_hebrew(xlit), 'comb': hebrew_construct(xlit),
            }


ELDAMO_LANGS = {
    'p': 'pelvish', 'mp': 'pelvish', 'q': 'quenya', 's': 'sindarin', 't': 'telerin',
    'ad': 'adunaic', 'kh': 'khuzdul', 'bs': 'blackspeech', 'wes': 'westron',
}
ELDAMO_POS = {'n': 'n', 'vb': 'v', 'adj': 'a', 'root': 'n'}


def from_eldamo():
    """
    Tolkien's own words only. Eldamo also records fan coinages ("!"), forms Tolkien struck
    out ("-", "|") and readings its editors doubt ("?", "‽"); none of those is his.
    """
    tree = ET.parse(SRC / 'eldamo-data.xml')
    for word in tree.getroot().iter('word'):
        lang = ELDAMO_LANGS.get(word.get('l') or '')
        speech = word.get('speech') or ''
        value = word.get('v') or ''
        gloss_raw = word.get('gloss') or ''
        if not lang or speech not in ELDAMO_POS or not gloss_raw:
            continue
        if set(word.get('mark') or '') & set('!-|?‽^'):
            continue
        # Middle-period words are superseded by the late forms; the roots are not —
        # the Etymologies is where most of them were ever written down.
        if word.get('l') == 'mp' and speech != 'root':
            continue
        if ' ' in value or value[:1].isupper() and speech != 'root':
            continue
        pos = ELDAMO_POS[speech]
        read = next(iter(read_gloss([(gloss_raw.replace('*', '').replace('?', ''), [])], pos)), None)
        stem = stem_elvish(value)
        if not read or not valid_stem(stem):
            continue
        is_root = speech == 'root'
        if is_root:
            pos = root_pos(read['gloss'], read['keys'][0])
        # Eldamo cites the page of Tolkien's writing each form is taken from. A form its
        # editors reconstructed themselves is starred, and a doubted gloss carries "?".
        read['hedged'] = read['hedged'] or '?' in gloss_raw or '*' in gloss_raw
        yield {
            **read, 'lang': lang,
            'form': ('√' if is_root else '') + re.sub(r'[¹²³⁴⁵⁶⁷⁸⁹⁰]', '', value),
            'stem': stem, 'pos': pos, 'rank': 4 if is_root else 0,
            'source': f"eldamo:{word.get('l')}", 'native': value, 'roman': '',
            'entry_pos': speech, 'page': word.get('page-id') or '',
            'cited': len(word.findall('ref')), 'mark': word.get('mark') or '',
            # Quenya nouns often compound on a longer stem than they are cited with:
            # oron "mountain" is oront- inside a word.
            'final': stem, 'comb': stem_elvish(word.get('stem') or '') or stem,
        }


SOURCES = [
    ('greek', 'AncientGreek'), ('latin', 'Latin'), ('sanskrit', 'Sanskrit'), ('pali', 'Pali'),
    ('egyptian', 'Egyptian'), ('sumerian', 'Sumerian'), ('akkadian', 'Akkadian'),
    ('oldpersian', 'OldPersian'), ('hittite', 'Hittite'), ('geez', 'Geez'),
    ('aramaic', 'Aramaic'), ('aramaic', 'ClassicalSyriac'), ('pie', 'ProtoIndoEuropean'),
    ('oldenglish', 'OldEnglish'), ('oldnorse', 'OldNorse'), ('gothic', 'Gothic'),
    ('pgmc', 'ProtoGermanic'), ('oldirish', 'OldIrish'), ('pcelt', 'ProtoCeltic'),
]

QUESTIONABLE_TAGS = {'rare', 'hapax', 'uncertain', 'nonstandard', 'neologism'}


def audit(c: dict, verifier) -> tuple[str, str, str]:
    """
    (status, by, why) for one root.

      verified    — a second, independent source has the same word with the same meaning;
                    for Tolkien's languages, Eldamo cites the page he wrote it on.
      flagged     — something about the entry is doubtful or could not be reconciled with
                    a second source, and `why` says what. Flagged roots stay in the
                    database and are never used to build a name.
      unconfirmed — one source, nothing wrong with it, nothing to check it against.
    """
    doubts = []
    if c['hedged']:
        doubts.append('the source itself hedges this meaning')
    if c['sense'] > 1:
        doubts.append('only the third sense of the word')
    if QUESTIONABLE_TAGS & set(c['tags']):
        doubts.append('marked ' + ', '.join(sorted(QUESTIONABLE_TAGS & set(c['tags']))) + ' by the source')

    if c['source'].startswith('eldamo:'):
        if '*' in c.get('mark', ''):
            doubts.append('a form reconstructed by Eldamo, not written by Tolkien')
        if c.get('cited', 0) == 0:
            doubts.append('no citation to Tolkien\'s writing')
        if doubts:
            return 'flagged', '', '; '.join(doubts)
        return 'verified', 'eldamo', ''

    if c.get('agrees') and not doubts:
        return 'verified', 'wiktionary-he', ''
    found = verifier.check(c) if verifier else {'status': 'unconfirmed', 'by': None, 'note': ''}
    if found['status'] == 'conflict':
        # Not proof of an error — "shrill" against "loud-sounding" trips this too — but a
        # meaning no second source could be matched to is not one to build a name on
        # until a person has looked.
        doubts.append(f"a second dictionary has the word, but its meaning could not be matched to ours ({found.get('note') or found.get('by')})")
    if doubts:
        return 'flagged', '', '; '.join(doubts)
    if found['status'] == 'verified':
        return 'verified', str(found.get('by') or ''), ''
    return 'unconfirmed', '', ''


def load_verifier():
    """scripts/verify_roots.py, if it and its second sources are there. Optional."""
    try:
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        from verify_roots import Verifier
        return Verifier(SRC)
    except Exception as error:  # noqa: BLE001 — a missing second source must not stop a build
        print(f'  (no second-source check: {error})')
        return None


# ── names that already exist ──────────────────────────────────────────────────────────

BLOOM_BITS_PER_WORD = 8
BLOOM_HASHES = 6


def fnv(text: str, seed: int) -> int:
    h = (0x811C9DC5 ^ seed) & 0xFFFFFFFF
    for byte in text.encode('utf8'):
        h = ((h ^ byte) * 0x01000193) & 0xFFFFFFFF
    return h


def attested_words() -> set[str]:
    """
    Every headword in every source, spelled the way a coined name would spell it.

    A compound built by a language's own rules will sometimes be a word that language
    already had — lyk-ánthrōpos, Mor-dor. Those are not coinages, and a name offered as
    new must not be one. Headwords only: an inflected form that happens to coincide is
    not caught, and the page says what was and was not checked.
    """
    out: set[str] = set()
    for lang, name in SOURCES:
        for word, roman in json.loads((CACHE / f'{name}.words.json').read_text(encoding='utf8')):
            try:
                final, _ = word_and_comb(lang, {}, word, roman or word, 'n', '')
            except Exception:  # noqa: BLE001 — a headword in an unexpected script is skipped
                continue
            if lang == 'egyptian':
                final = stem_egyptian(word)
            elif lang == 'sumerian':
                final = stem_sumerian(roman or '')
            elif lang in ('hittite', 'oldirish', 'pie', 'oldpersian', 'geez'):
                final = fold(roman or word, SEMITIC if lang == 'geez' else IRANIAN if lang == 'oldpersian' else None)
            if final:
                out.add(final)
    text = (SRC / 'strongs-hebrew.js').read_text(encoding='utf8')
    for entry in json.loads(text[text.index('{', text.index('var strongsHebrewDictionary')): text.rindex('}') + 1]).values():
        out.add(fold_hebrew(entry.get('xlit', '')))
    # Tolkien's words in every period, and his names of people and places above all.
    for word in ET.parse(SRC / 'eldamo-data.xml').getroot().iter('word'):
        if not set(word.get('mark') or '') & set('!'):
            out.add(stem_elvish(word.get('v') or ''))
            out.add(stem_elvish(word.get('v') or '').replace('k', 'c'))
    # And English itself. Old English hunta + -ing is formed exactly as the rule says and
    # comes out "hunting", which is a word, just not one of theirs.
    try:
        for word in Path('/usr/share/dict/american-english').read_text(encoding='utf8').split():
            if re.fullmatch(r'[a-z]+', word):
                out.add(word)
    except FileNotFoundError:
        print('  (no English word list at /usr/share/dict — English words are not filtered)')
    return {w for w in out if 4 <= len(w) <= 16}


def bloom(words: set[str]) -> bytes:
    """A Bloom filter. The reader in src/data/attested.ts tests the same seven bits."""
    size = max(8, len(words) * BLOOM_BITS_PER_WORD)
    size += -size % 8
    bits = bytearray(size // 8)
    for word in words:
        for seed in range(BLOOM_HASHES):
            bit = fnv(word, seed * 0x9E3779B1 & 0xFFFFFFFF) % size
            bits[bit >> 3] |= 1 << (bit & 7)
    return bytes(bits)


BLOODLESS = {'noun.act', 'noun.communication', 'noun.process', 'noun.relation', 'noun.quantity',
             'noun.motive', 'noun.shape', 'noun.possession', None}

SHARDS = 512


def shard_of(word: str) -> int:
    """FNV-1a, 32 bit. The reader in src/data/roots.ts computes the same number."""
    h = 0x811C9DC5
    for byte in word.encode('utf8'):
        h = ((h ^ byte) * 0x01000193) & 0xFFFFFFFF
    return h % SHARDS


# How many roots one language may hold for one meaning. Two is enough to give the blender
# a choice of sound; more and the big dictionaries bury the small ones.
PER_KEY = 2


def fame(c: dict) -> float:
    """
    How well known a word is, as a nudge to its weight: −0.05 to +0.14.

    Wiktionary lists the words derived from an entry and the words descended from it.
    Lýkos has seventy-two and a poetic rarity for "wolf" has none, and nothing else in
    the data says as plainly which of the two a Greek speaker would have reached for.
    Sources that record no such thing (Strong's, Eldamo) are left at nought.
    """
    if not c['source'].startswith('wiktionary:'):
        return 0.0
    return -0.05 if c['rank'] == 0 else min(math.log2(c['rank'] + 1), 7) * 0.02


def candidate_score(c: dict) -> float:
    length = len(c['stem'])
    shape = 2 if 3 <= length <= 6 else 1 if length in (2, 7) else 0
    return c['weight'] * 10 + shape + fame(c) * 40 - 0.3 * (len(c['keys']) - 1)


def curated_keys() -> set[str]:
    text = (ROOT / 'src' / 'data' / 'concepts.ts').read_text(encoding='utf8')
    block = text[text.index('export const CONCEPTS'): text.index('] as const')]
    return set(re.findall(r"'([a-z]+)'", block))


def select(candidates: list[dict]) -> list[dict]:
    # A root the hand-written lexicon also has is kept here all the same. The lexicon's
    # copy is cut for blending; this one carries the stem and word forms a real compound
    # needs, and it is the one that has been checked against a second dictionary.
    best: dict[tuple[str, str], list[dict]] = collections.defaultdict(list)
    seen: dict[tuple[str, str], set[str]] = collections.defaultdict(set)
    for c in sorted(candidates, key=candidate_score, reverse=True):
        # The same stem twice is one root listed under two spellings or two dictionaries
        # — unless the meanings share nothing, in which case they are homonyms.
        if seen[c['lang'], c['stem']] & set(c['keys']):
            continue
        slot = best[c['lang'], c['keys'][0]]
        if len(slot) < PER_KEY:
            slot.append(c)
            seen[c['lang'], c['stem']] |= set(c['keys'])
    chosen = [c for slot in best.values() for c in slot]
    chosen.sort(key=lambda c: (c['lang'], c['keys'][0], -candidate_score(c)))
    return chosen


# ── the English side ───────────────────────────────────────────────────────────────────

# Hypernyms this general connect everything to everything: "cognition" is above half the
# abstract nouns in the language, which is how a query used to end up at knowledge.
MIN_NOUN_DEPTH = 5
GENERIC_KEYS = STOP_KEYS | set('''
change move travel touch act make create creation thing object entity whole artifact
organism being matter substance group state condition quality attribute property action
activity event process person individual animal plant instrument device structure area
region location feeling emotion body material covering container implement cognition
knowledge content idea concept abstraction relation communication measure quantity
amount unit point line work happening occurrence situation trait characteristic
'''.split())

def top_senses(word: str):
    """The senses of a word someone naming something is likely to mean."""
    picked = []
    counts = {}
    for pos in ('n', 'v', 'a', 'r'):
        senses = [s for s in wn.synsets(word, pos) if any(l.name().lower() == word for l in s.lemmas())]
        for rank, synset in enumerate(senses[:2]):
            count = next(l.count() for l in synset.lemmas() if l.name().lower() == word)
            counts[synset] = (count, rank, pos)
    if not counts:
        return picked
    top = max(c for c, _, _ in counts.values())
    animal = leading_lexname(word)['n'] == 'noun.animal'
    for synset, (count, rank, pos) in counts.items():
        first = rank == 0
        # "crow" the verb is to boast. Someone naming a thing after a crow means the bird.
        if animal and (pos != 'n' or rank > 0) and synset.lexname() != 'verb.motion':
            continue
        # "Bear" is a verb in running text and an animal in a request for a name, so an
        # animal is always kept. But "a simple" is a medicinal herb, and nobody typing
        # "simple" means that: any other thing-noun has to be a real share of the word.
        thing = pos == 'n' and (synset.lexname() == 'noun.animal'
                                or (synset.lexname() in CONCRETE and (top < 5 or count * 10 >= top)))
        if first and (count * 10 >= top or thing):
            picked.append(synset)
        elif not first and count * 2 >= max(top, 1):
            picked.append(synset)
    return picked


@functools.lru_cache(maxsize=None)
def leading_senses(word: str) -> frozenset:
    out = set()
    for pos in ('n', 'v', 'a', 'r'):
        senses = [s for s in wn.synsets(word, pos) if any(l.name().lower() == word for l in s.lemmas())]
        out.update(senses[:2])
    return frozenset(out)


def names(synset) -> list[str]:
    """
    The words for a sense — but only those that mean it first.

    "Melody" shares a sense with "air" and "strain", which is true and useless: nobody
    typing "melody" means the wind. A neighbour is kept when this sense is one of the two
    it is best known for.
    """
    return [tagged(l.name().lower(), synset) for l in synset.lemmas()
            if '_' not in l.name() and synset in leading_senses(l.name().lower())]


def tagged(word: str, synset) -> str:
    """
    A neighbour and the part of speech it is a neighbour in: "fleet:a".

    "Fast" is near "fleet" the adjective. Without the tag the reader would also fetch
    fleet the noun, and a search for speed would come back with a navy.
    """
    return f"{word}:{'a' if synset.pos() in ('a', 's') else synset.pos()}"


def expand(word: str, keys: set[str], cover: dict[str, int]) -> list[list[str]]:
    near: dict[str, int] = {}

    def add(candidates, tier):
        for cand in candidates:
            plain = cand.split(':')[0]
            if plain != word and plain in keys and plain not in GENERIC_KEYS:
                near[cand] = min(near.get(cand, tier), tier)

    for synset in top_senses(word):
        add(names(synset), 0)
        for lemma in synset.lemmas():
            if lemma.name().lower() != word:
                continue
            add([tagged(d.name().lower(), d.synset()) for d in lemma.derivationally_related_forms()
                 if d.synset() in leading_senses(d.name().lower())], 1)
            add([tagged(p.name().lower(), p.synset()) for p in lemma.pertainyms()], 0)
        if synset.pos() in ('a', 's'):
            for similar in synset.similar_tos():
                add(names(similar), 1)
            for attribute in synset.attributes():
                add(names(attribute), 1)
            for also in synset.also_sees():
                add(names(also), 2)
        else:
            for hyper in synset.hypernyms() + synset.instance_hypernyms():
                if synset.pos() == 'n' and hyper.min_depth() < MIN_NOUN_DEPTH:
                    continue
                add(names(hyper), 1)
                for upper in hyper.hypernyms():
                    if synset.pos() == 'n' and upper.min_depth() < MIN_NOUN_DEPTH:
                        continue
                    add(names(upper), 2)
            for group in synset.verb_groups():
                add(names(group), 1)
            for holonym in synset.member_holonyms():
                add(names(holonym), 2)
    # A word with nothing above it can still be read downwards: "weapon" has no root of
    # its own in half these languages, and "sword" and "spear" do.
    if len(near) < 3 and word not in keys:
        for synset in top_senses(word)[:1]:
            for hypo in synset.hyponyms()[:12]:
                add(names(hypo), 2)

    tiers: list[list[str]] = [[], [], []]
    for cand, tier in near.items():
        tiers[tier].append(cand)
    limits = (5, 5, 4)
    return [sorted(tier, key=lambda k: -cover[k.split(':')[0]])[:limit] for tier, limit in zip(tiers, limits)]


def build_thesaurus(keys: set[str], cover: dict[str, int]) -> dict[str, str]:
    words = {l.lower() for l in wn.all_lemma_names() if re.fullmatch(r'[a-z]+', l.lower())}
    out: dict[str, str] = {}
    for word in sorted(words):
        if len(word) < 3 or word in STOP_KEYS or word in CRUDE:
            continue
        if zipf(word) < 2.6 and word not in keys:
            continue
        tiers = expand(word, keys, cover)
        if any(tiers):
            out[word] = '|'.join(' '.join(t) for t in tiers).rstrip('|')
    return out


def main() -> None:
    candidates: list[dict] = []
    for lang, name in SOURCES:
        got = list(from_kaikki(lang, name))
        print(f'{name:20} {len(got):6} candidates', flush=True)
        candidates += got
    for label, source in (('Strong\'s Hebrew', from_strongs), ('Eldamo', from_eldamo)):
        got = list(source())
        print(f'{label:20} {len(got):6} candidates', flush=True)
        candidates += got

    roots = select(candidates)
    with (CACHE / 'roots.selected.jsonl').open('w', encoding='utf8') as handle:
        for c in roots:
            handle.write(json.dumps(c, ensure_ascii=False) + '\n')

    verifier = load_verifier()
    tally: dict[str, collections.Counter] = collections.defaultdict(collections.Counter)
    flagged_rows = []
    for c in roots:
        c['status'], c['by'], c['why'] = audit(c, verifier)
        tally[c['lang']][c['status']] += 1
        if c['status'] == 'flagged':
            flagged_rows.append([c['lang'], c['form'], c['gloss'], c['source'], c['why']])

    cover: dict[str, int] = collections.Counter()
    for c in roots:
        for key in c['keys']:
            cover[key] += 1
    keys = set(cover) | curated_keys()
    for key in curated_keys():
        cover[key] += 8

    thesaurus = build_thesaurus(keys, cover)

    # One file would be a megabyte to download before the first name. Instead the database
    # is cut into shards by a hash of the English word, and a search fetches only the few
    # that hold the words it used. `r` is roots by meaning, `t` is the thesaurus.
    shards = [{'t': {}, 'r': {}} for _ in range(SHARDS)]
    for c in roots:
        # Among roots that mean the same thing, the one with the most descendants and the
        # most sayable stem should be the one a language sends: lýkos before a rare
        # poetic word for wolf that happens to sort first.
        length = len(c['stem'])
        weight = c['weight'] + fame(c) + (0.02 if 3 <= length <= 5 else -0.04 if length >= 8 else 0)
        # A loose match — the head noun of a longer gloss — must stay under the bar a name
        # is built on (FIRM in localNameService.ts), however well known the word is.
        if c['rescued']:
            weight = min(weight, 0.48)
        form = unicodedata.normalize('NFC', c['form'])
        final = c['final'] if valid_stem(c['final']) or len(c['final']) > 9 else ''
        # "Son of the wolf" is a name; "son of the delivery" is a form letter. Nouns that
        # name an act, a process or a relation take no kinship or diminutive ending.
        field = leading_lexname(c['keys'][0])['n']
        kin = 1 if c['pos'] == 'n' and field not in BLOODLESS else 0
        row = [c['lang'], form, c['stem'], c['gloss'], ' '.join(c['keys']), c['pos'], round(min(weight, 0.99), 2),
               final, '' if c['comb'] == final else c['comb'], c['status'][0], c['by'], kin]
        for key in c['keys']:
            shards[shard_of(key)]['r'].setdefault(key, []).append(row)
    for word, tiers in thesaurus.items():
        shards[shard_of(word)]['t'][word] = tiers

    dump = lambda data: json.dumps(data, ensure_ascii=False, separators=(',', ':'), sort_keys=True)
    out = OUT / 'shards'
    out.mkdir(parents=True, exist_ok=True)
    for old in out.glob('*.json'):
        old.unlink()
    sizes = []
    for index, shard in enumerate(shards):
        text = dump(shard)
        sizes.append(len(text.encode('utf8')))
        (out / f'{index}.json').write_text(text, encoding='utf8')

    words = attested_words()
    (OUT / 'attested.bin').write_bytes(bloom(words))

    # The flagged roots, for a person to read. They are in the shards too, marked.
    audit_dir = ROOT / 'audit'
    audit_dir.mkdir(exist_ok=True)
    with (audit_dir / 'flagged-roots.tsv').open('w', encoding='utf8') as handle:
        handle.write('language\tform\tgloss\tsource\twhy flagged\n')
        for row in sorted(flagged_rows):
            handle.write('\t'.join(str(cell).replace('\t', ' ') for cell in row) + '\n')

    by_lang = collections.Counter(c['lang'] for c in roots)
    status = collections.Counter(c['status'] for c in roots)
    stats = {'roots': len(roots), 'meanings': len(cover), 'words': len(thesaurus),
             'shards': SHARDS, 'attested': len(words),
             'verified': status['verified'], 'unconfirmed': status['unconfirmed'], 'flagged': status['flagged'],
             'languages': dict(sorted(by_lang.items())),
             'audit': {lang: dict(counts) for lang, counts in sorted(tally.items())}}
    (OUT / 'stats.ts').write_text(
        '// Written by scripts/build_roots.py — the tally of the generated root database.\n'
        f'export const STATS = {json.dumps(stats, indent=2)} as const\n', encoding='utf8')

    print(f'\n{len(roots)} roots, {len(cover)} meanings, {len(thesaurus)} thesaurus words')
    print(f"  {'':12} {'roots':>6} {'verified':>9} {'unconf.':>8} {'flagged':>8}")
    for lang, count in by_lang.most_common():
        t = tally[lang]
        print(f"  {lang:12} {count:6} {t['verified']:9} {t['unconfirmed']:8} {t['flagged']:8}")
    print(f"  {'all':12} {len(roots):6} {status['verified']:9} {status['unconfirmed']:8} {status['flagged']:8}")
    print(f'  {len(words)} existing words in the filter, {len(bloom(words)) / 1024:.0f} KB')
    print(f'  {SHARDS} shards, {sum(sizes) / 1024:.0f} KB in all, largest {max(sizes) / 1024:.1f} KB')


if __name__ == '__main__':
    main()
