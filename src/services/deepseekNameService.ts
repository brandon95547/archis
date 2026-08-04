import type { GenerationRequest, GenerationResult, NameService } from '../types'

/**
 * The DeepSeek-backed name service.
 *
 * It talks to OUR backend, not to DeepSeek. That is not indirection for its own sake: an
 * API key in a Vite env var is compiled into the bundle and served to every visitor, so
 * there is no version of "call DeepSeek from the browser" that is not publishing the key.
 * The endpoint below is a route you own, holding the key server-side and calling
 * https://api.deepseek.com/chat/completions on the client's behalf.
 *
 * The prompt lives here rather than on the server on purpose — it is a description of the
 * product's rules, and it belongs next to the local engine that implements the same ones.
 * Send it with the request; the server's job is auth, the key, and rate limiting.
 */

const ENDPOINT = import.meta.env.VITE_ARCHIS_API ?? '/api/names'

/**
 * What the model is being asked for, in the same terms the local engine enforces in code.
 * Kept explicit rather than terse: every line here is a rule the local scorer already
 * applies, and the two must not drift.
 */
export const SYSTEM_PROMPT = `You coin new names by blending roots from ancient languages.

Every name you return must be NEWLY COINED. Never return a real attested word, a modern
brand, or vocabulary from any invented language (Quenya, Sindarin, Adûnaic, Klingon,
Dothraki and the like). You may take the SOUND of such languages; never their words,
characters or places.

Build each name from two roots drawn from as wide a range as the meaning allows: Ancient
Greek, Latin, Sanskrit, Pali, Ancient Egyptian, Sumerian, Akkadian, Avestan, Old Persian,
Biblical Hebrew, Aramaic, Phoenician, Classical Chinese, Ge'ez, Proto-Indo-European,
Proto-Semitic. Do not lean on Greek and Latin for every name.

Blend, do not concatenate. Trim roots to the part that carries them, spend one vowel where
two would collide, open clusters that cannot be said, and keep a traceable line back to
both meanings.

Prefer: two to four syllables, soft vowels, clear rhythm, easy to say, easy to spell,
brandable.

Reject: harsh consonant clusters, anything that looks like a misspelling, repetitive
endings such as -ora and -ara, anything close to a major brand, anything with an unwanted
association.

Return ONLY JSON matching the GenerationResult shape you were given. No prose.`

export class DeepSeekNameService implements NameService {
  readonly id = 'deepseek'

  private readonly endpoint: string

  constructor(endpoint: string = ENDPOINT) {
    this.endpoint = endpoint
  }

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...request, system: SYSTEM_PROMPT }),
    })

    if (!response.ok) {
      // Thrown, not swallowed into an empty result: "no names" and "the request failed"
      // are different things and the UI says different things about them.
      const detail = await response.text().catch(() => '')
      throw new Error(`Name service failed (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`)
    }

    const data = (await response.json()) as GenerationResult
    if (!Array.isArray(data?.names)) {
      throw new Error('Name service returned something that is not a result.')
    }
    return data
  }
}
