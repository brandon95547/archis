import type { LanguageInfo } from '../types'

/**
 * The traditions Archis draws from, and how much each one is claiming.
 *
 * `provenance` is not decoration — the detail panel shows it, because "this root is
 * written on a stele" and "this root is a scholarly reconstruction" are different
 * statements and a name built from them should not pretend otherwise.
 */
export const LANGUAGES: Record<string, LanguageInfo> = {
  greek: { id: 'greek', name: 'Ancient Greek', era: 'c. 800 BCE – 300 CE', provenance: 'attested' },
  latin: { id: 'latin', name: 'Latin', era: 'c. 700 BCE – 600 CE', provenance: 'attested' },
  sanskrit: { id: 'sanskrit', name: 'Sanskrit', era: 'c. 1500 BCE onward', provenance: 'attested' },
  pali: { id: 'pali', name: 'Pali', era: 'c. 300 BCE onward', provenance: 'attested' },
  egyptian: { id: 'egyptian', name: 'Ancient Egyptian', era: 'c. 3000 BCE – 400 CE', provenance: 'attested' },
  sumerian: { id: 'sumerian', name: 'Sumerian', era: 'c. 3100 – 1800 BCE', provenance: 'attested' },
  akkadian: { id: 'akkadian', name: 'Akkadian', era: 'c. 2500 – 100 BCE', provenance: 'attested' },
  avestan: { id: 'avestan', name: 'Avestan', era: 'c. 1200 – 400 BCE', provenance: 'attested' },
  oldpersian: { id: 'oldpersian', name: 'Old Persian', era: 'c. 600 – 300 BCE', provenance: 'attested' },
  hebrew: { id: 'hebrew', name: 'Biblical Hebrew', era: 'c. 1000 – 200 BCE', provenance: 'attested' },
  aramaic: { id: 'aramaic', name: 'Aramaic', era: 'c. 900 BCE – 700 CE', provenance: 'attested' },
  phoenician: { id: 'phoenician', name: 'Phoenician', era: 'c. 1200 – 300 BCE', provenance: 'attested' },
  chinese: { id: 'chinese', name: 'Classical Chinese', era: 'c. 500 BCE – 200 CE', provenance: 'attested' },
  geez: { id: 'geez', name: "Ge'ez", era: 'c. 300 CE onward', provenance: 'attested' },
  pie: {
    id: 'pie',
    name: 'Proto-Indo-European',
    era: 'reconstructed, c. 4500 – 2500 BCE',
    provenance: 'reconstructed',
  },
  psem: {
    id: 'psem',
    name: 'Proto-Semitic',
    era: 'reconstructed, c. 4000 – 3000 BCE',
    provenance: 'reconstructed',
  },
  /**
   * Sound, not vocabulary. See the note on RootProvenance: these entries are syllable
   * shapes admired for how they fall on the ear, carrying no meaning and never a word,
   * name or place from any invented language. They can only ever close a name whose
   * meaning came from somewhere real.
   */
  euphonic: {
    id: 'euphonic',
    name: 'Euphonic ending',
    era: 'sound only — carries no meaning',
    provenance: 'phonetic',
  },
}

export const languageName = (id: string) => LANGUAGES[id]?.name ?? id
