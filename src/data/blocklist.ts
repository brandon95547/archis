/**
 * Names Archis must not hand back.
 *
 * Three separate problems, kept separate because the right response differs:
 *   · brands — a coined name that reads as an existing company is useless to whoever
 *     asked for it, however good it sounds.
 *   · invented-language vocabulary — the brief allows borrowing the *sound* of constructed
 *     languages and forbids borrowing their words. This is the guard on that line.
 *   · unfortunate readings — words that mean something else entirely once you say them.
 *
 * Matching is on a normalised form (lowercase, accents stripped) and, for brands, on edit
 * distance too, since "Gooble" is as much of a problem as "Google".
 */

/** Well-known names a coinage should not be mistaken for. */
export const BRANDS = [
  'google', 'amazon', 'apple', 'meta', 'nvidia', 'oracle', 'adobe', 'cisco', 'intel',
  'netflix', 'spotify', 'stripe', 'shopify', 'figma', 'canva', 'notion', 'slack', 'zoom',
  'tesla', 'nike', 'adidas', 'pepsi', 'nestle', 'siemens', 'bosch', 'philips', 'samsung',
  'huawei', 'xiaomi', 'sony', 'toyota', 'honda', 'mazda', 'lexus', 'audi', 'volvo',
  'verizon', 'vodafone', 'novartis', 'pfizer', 'roche', 'bayer', 'sanofi', 'astra',
  'accenture', 'deloitte', 'infosys', 'wipro', 'salesforce', 'workday', 'datadog',
  'anthropic', 'openai', 'deepmind', 'mistral', 'cohere', 'databricks', 'snowflake',
  'chronos', 'aurora', 'lumen', 'axiom', 'kaiser', 'aveva', 'altera', 'aramco',
]

/**
 * Vocabulary from constructed languages. Archis may take the shape of these languages —
 * open vowels, liquid consonants, soft codas — and may not take their words. Anything
 * that lands on this list is a copy, not a coinage, and is dropped outright.
 */
export const INVENTED_VOCABULARY = [
  // Quenya / Sindarin and the like
  'elen', 'elena', 'eleni', 'silmaril', 'palantir', 'mellon', 'mithril', 'namarie',
  'anor', 'ithil', 'galad', 'galadh', 'lothlorien', 'valinor', 'numenor', 'gondor',
  'arda', 'aman', 'eru', 'ainu', 'ainur', 'valar', 'maiar', 'quenya', 'sindarin',
  'adunaic', 'khuzdul', 'telerin', 'noldor', 'vanyar', 'edain', 'dunedain', 'earendil',
  'luthien', 'beren', 'feanor', 'melian', 'elessar', 'anduril', 'narsil', 'hithlum',
  'menel', 'aiya', 'elentari', 'tinuviel', 'lorien', 'nimloth', 'telperion',
  // other well-known invented tongues
  'dothraki', 'valyrian', 'khaleesi', 'kalima', 'klingon', 'qapla', 'navi', 'eywa',
  'naboo', 'jedi', 'sith', 'ewok', 'wookiee', 'tardis', 'gallifrey', 'dalek',
  'esperanto', 'saluton', 'lapsi', 'newspeak',
]

/**
 * Substrings that make a name unusable regardless of how it was built. Deliberately short
 * and boring: this catches the accidents, not everything a name could ever suggest in
 * every language. Whoever adopts a name still has to look at it.
 */
export const UNFORTUNATE_SUBSTRINGS = [
  'anus', 'arse', 'ass', 'butt', 'crap', 'cunt', 'damn', 'dick', 'dumb', 'fart', 'fuck',
  'hell', 'kill', 'piss', 'poop', 'porn', 'rape', 'shit', 'slut', 'suck', 'turd', 'twat',
  'vom', 'wank', 'nazi', 'isis', 'covid', 'ebola', 'toxic', 'fatal', 'dead', 'die',
  'sin', 'evil', 'hate', 'war', 'gore', 'pus',
]

/**
 * Endings the brief calls out, plus the rest of the family. Not banned — an ending is not
 * a crime — but heavily penalised, and capped so a batch cannot fill up with them. Left
 * unchecked, blending gravitates here: every open vowel wants to land on -a.
 */
export const OVERUSED_ENDINGS = [
  'ora', 'ara', 'era', 'ira', 'ura', 'oria', 'aria', 'eria', 'alia', 'ella', 'esta',
  'ify', 'ly', 'io', 'eo', 'ium', 'eum',
]

const normalise = (value: string) =>
  value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Levenshtein, iterative, single row. Small strings only — names, never text. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j += 1) {
      const carried = prev[j]
      prev[j] = Math.min(
        prev[j] + 1,
        prev[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
      diagonal = carried
    }
  }
  return prev[b.length]
}

export interface BlockResult {
  blocked: boolean
  reason?: string
}

/**
 * The one gate every candidate passes through. Returns a reason rather than a boolean so
 * a rejection can be explained — during development in the console, and to whoever reads
 * this code next wondering why a perfectly nice name never appeared.
 */
export function screen(name: string): BlockResult {
  const value = normalise(name)

  for (const bad of UNFORTUNATE_SUBSTRINGS) {
    if (value.includes(bad)) return { blocked: true, reason: `contains "${bad}"` }
  }

  for (const word of INVENTED_VOCABULARY) {
    // Whole-name match or a long shared span: a coinage that happens to contain "ar" is
    // fine, one that IS "arda" with a letter on the end is not.
    if (value === word) return { blocked: true, reason: `matches invented vocabulary "${word}"` }
    if (word.length >= 5 && value.includes(word)) {
      return { blocked: true, reason: `contains invented vocabulary "${word}"` }
    }
  }

  for (const brand of BRANDS) {
    if (value === brand) return { blocked: true, reason: `is the brand "${brand}"` }
    // Scaled to length: two edits apart is too close for a short name, and unremarkable
    // for a long one.
    const allowed = brand.length <= 5 ? 1 : 2
    if (Math.abs(value.length - brand.length) <= allowed && editDistance(value, brand) <= allowed) {
      return { blocked: true, reason: `too close to the brand "${brand}"` }
    }
  }

  return { blocked: false }
}
