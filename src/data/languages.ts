import type { LanguageInfo } from '../types'

/**
 * The traditions Archis draws from, and how much each one is claiming.
 *
 * `provenance` is not decoration — the detail panel shows it, because "this root is
 * written on a stele", "this root is a scholarly reconstruction" and "this root is from a
 * language a novelist invented" are different statements and a name built from them
 * should not pretend otherwise.
 */
const language = (
  id: string,
  name: string,
  era: string,
  family: string,
  provenance: LanguageInfo['provenance'] = 'attested',
): LanguageInfo => ({ id, name, era, family, provenance })

/** What every one of Tolkien's languages says under its name. */
const TOLKIEN = 'invented by J. R. R. Tolkien'

export const LANGUAGES: Record<string, LanguageInfo> = Object.fromEntries(
  [
    language('greek', 'Ancient Greek', 'c. 800 BCE – 300 CE', 'hellenic'),
    language('latin', 'Latin', 'c. 700 BCE – 600 CE', 'italic'),
    language('sanskrit', 'Sanskrit', 'c. 1500 BCE onward', 'indic'),
    language('pali', 'Pali', 'c. 300 BCE onward', 'indic'),
    language('egyptian', 'Ancient Egyptian', 'c. 3000 BCE – 400 CE', 'egyptian'),
    language('sumerian', 'Sumerian', 'c. 3100 – 1800 BCE', 'sumerian'),
    language('akkadian', 'Akkadian', 'c. 2500 – 100 BCE', 'semitic'),
    language('hittite', 'Hittite', 'c. 1650 – 1200 BCE', 'anatolian'),
    language('avestan', 'Avestan', 'c. 1200 – 400 BCE', 'iranian'),
    language('oldpersian', 'Old Persian', 'c. 600 – 300 BCE', 'iranian'),
    language('hebrew', 'Biblical Hebrew', 'c. 1000 – 200 BCE', 'semitic'),
    language('aramaic', 'Aramaic', 'c. 900 BCE – 700 CE', 'semitic'),
    language('phoenician', 'Phoenician', 'c. 1200 – 300 BCE', 'semitic'),
    language('chinese', 'Classical Chinese', 'c. 500 BCE – 200 CE', 'sinitic'),
    language('geez', "Ge'ez", 'c. 300 CE onward', 'semitic'),
    language('oldenglish', 'Old English', 'c. 650 – 1100 CE', 'germanic'),
    language('oldnorse', 'Old Norse', 'c. 700 – 1300 CE', 'germanic'),
    language('gothic', 'Gothic', 'c. 350 – 550 CE', 'germanic'),
    language('oldirish', 'Old Irish', 'c. 600 – 900 CE', 'celtic'),
    language('pie', 'Proto-Indo-European', 'reconstructed, c. 4500 – 2500 BCE', 'pie', 'reconstructed'),
    language('psem', 'Proto-Semitic', 'reconstructed, c. 4000 – 3000 BCE', 'semitic', 'reconstructed'),
    language('pgmc', 'Proto-Germanic', 'reconstructed, c. 500 BCE – 200 CE', 'germanic', 'reconstructed'),
    language('pcelt', 'Proto-Celtic', 'reconstructed, c. 1300 – 800 BCE', 'celtic', 'reconstructed'),
    /**
     * The invented languages. One family, deliberately: there are eight of them and they
     * share an author, and capped one by one they would outnumber every real tradition
     * in the pool.
     */
    language('pelvish', 'Primitive Elvish', TOLKIEN, 'tolkien', 'constructed'),
    language('quenya', 'Quenya', TOLKIEN, 'tolkien', 'constructed'),
    language('sindarin', 'Sindarin', TOLKIEN, 'tolkien', 'constructed'),
    language('telerin', 'Telerin', TOLKIEN, 'tolkien', 'constructed'),
    language('adunaic', 'Adûnaic', TOLKIEN, 'tolkien', 'constructed'),
    language('khuzdul', 'Khuzdul', TOLKIEN, 'tolkien', 'constructed'),
    language('blackspeech', 'Black Speech', TOLKIEN, 'tolkien', 'constructed'),
    language('westron', 'Westron', TOLKIEN, 'tolkien', 'constructed'),
    /**
     * Sound, not vocabulary. See the note on RootProvenance: these entries are syllable
     * shapes admired for how they fall on the ear, carrying no meaning and never a word
     * from any language, real or invented. They can only ever close a name whose meaning
     * came from somewhere else.
     */
    language('euphonic', 'Euphonic ending', 'sound only — carries no meaning', 'euphonic', 'phonetic'),
  ].map((info) => [info.id, info]),
)

export const languageName = (id: string) => LANGUAGES[id]?.name ?? id
