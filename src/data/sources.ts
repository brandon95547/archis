/**
 * What a root was checked against, by the short code the build stores on it.
 *
 * These are the second sources — dictionaries other than the one a root was taken from.
 * None of their text is in the app; scripts/verify_roots.py reads them on the build
 * machine to confirm that a headword exists and means what the database says it means,
 * and records which one agreed. The detail panel names it, because "checked" without
 * saying against what is not a claim anyone can test.
 */
export const CHECKED_AGAINST: Record<string, string> = {
  lsj: 'Liddell–Scott–Jones, Greek–English Lexicon',
  'strongs-greek': 'Strong’s Greek dictionary',
  whitaker: 'Whitaker’s Words',
  'lewis-short': 'Lewis & Short, A Latin Dictionary',
  'monier-williams': 'Monier-Williams, Sanskrit–English Dictionary',
  ncped: 'the New Concise Pali–English Dictionary',
  pts: 'the Pali Text Society dictionary',
  'bosworth-toller': 'Bosworth–Toller, An Anglo-Saxon Dictionary',
  zoega: 'Zoëga, Concise Dictionary of Old Icelandic',
  'cleasby-vigfusson': 'Cleasby–Vigfusson, Icelandic–English Dictionary',
  wright: 'Wright’s Gothic glossary',
  bdb: 'Brown–Driver–Briggs',
  'wiktionary-he': 'Wiktionary, agreeing with Strong’s',
  'strongs-aramaic': 'Strong’s, agreeing with Wiktionary',
  'wiktionary-arc': 'Wiktionary, agreeing with Strong’s',
  sedra: 'the SEDRA Syriac database',
  epsd2: 'the Pennsylvania Sumerian Dictionary',
  'oracc-saao': 'the State Archives of Assyria glossary',
  'aed-tla': 'the Thesaurus Linguae Aegyptiae',
  descendants: 'the attested words descended from it',
  eldamo: 'Tolkien’s own texts, as cited by Eldamo',
}

/** The name to show for a code, or the code itself if the build knows a source this file does not. */
export const checkedAgainst = (code: string | undefined) =>
  code ? CHECKED_AGAINST[code] ?? code : 'a second source'
