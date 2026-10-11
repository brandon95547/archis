/**
 * About, and the foot of the page.
 *
 * A SECTION rather than a route. Archis is one screen with no router, and adding one so
 * three paragraphs can have their own URL would be the largest dependency in the app. The
 * nav already scrolls to #how-it-works and #examples; #about was the one anchor pointing
 * at nothing, and this is what it points at.
 *
 * Every number below is read off the lexicon and the database's own tally rather than
 * written down, because a figure in prose is a figure that goes stale the first time
 * someone adds a root.
 */

import { LEXICON } from '../data/lexicon'
import { LANGUAGES as LANGUAGE_INFO, languageName } from '../data/languages'
import { STATS } from '../data/generated/stats'

// "Euphonic ending" is a join category, not a language, so it is not counted or listed as
// one — the difference matters on a page whose subject is which languages are in here.
const CODES = [...new Set([...LEXICON.map((r) => r.language), ...Object.keys(STATS.languages)])]
  .filter((code) => code !== 'euphonic')

const named = (codes: string[]) =>
  codes.map((code) => languageName(code)).sort((a, b) => a.localeCompare(b))

// Listed apart from the ancient ones, for the same reason the detail panel badges them.
const invented = (code: string) => LANGUAGE_INFO[code]?.provenance === 'constructed'
const LANGUAGES = named(CODES.filter((code) => !invented(code)))
const INVENTED = named(CODES.filter(invented))

const count = (n: number) => n.toLocaleString('en-US')
const ROOT_COUNT = count(STATS.roots)
const MEANING_COUNT = count(STATS.meanings)
const VERIFIED = count(STATS.verified)
const UNCONFIRMED = count(STATS.unconfirmed)
const FLAGGED = count(STATS.flagged)

export function About() {
  return (
    <section id="about" className="mt-16 border-t border-ink-900 pt-12 sm:mt-20 sm:pt-14">
      <h2 className="font-serif text-2xl font-medium text-ink-50 sm:text-[30px]">About Archis</h2>

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-14">
        <div className="space-y-4 text-base leading-relaxed text-ink-300">
          <p>
            Archis coins names. You say what a name should carry — an idea, a quality, a
            thing — and it finds the words for those ideas across the old languages, then
            forms a new word from them the way their own language forms words: Greek on a
            linking -o-, Old English stem to stem, Sindarin by softening a consonant.
          </p>
          <p>
            <span className="text-ink-100">Every name here is newly coined.</span> The roots
            are real; the names are not. Nothing Archis produces is presented as a
            historical word, and each name shows the roots it was built from, the languages
            they came from and what they mean — so you can check it before you use it.
          </p>
          <p>
            Most of the roots are ancient. Some come from the languages J. R. R. Tolkien
            invented, and a name made from those is marked as an invented-language name
            wherever it appears — it is never passed off as an old one, and an invented
            root is never joined to an ancient one.
          </p>
          <p>
            It runs in your browser. There is no account and your search is never sent
            anywhere: the engine reads it on this page and fetches only the parts of the
            root database it needs, from this site. Names you keep are stored in this
            browser only.
          </p>
        </div>

        <dl className="space-y-5">
          <div>
            <dt className="label">The lexicon</dt>
            <dd className="mt-1.5 text-base leading-relaxed text-ink-300">
              {ROOT_COUNT} root entries across {LANGUAGES.length + INVENTED.length}{' '}
              languages, filed under {MEANING_COUNT} meanings, each with its own gloss.
            </dd>
          </div>
          <div>
            <dt className="label">How far it has been checked</dt>
            <dd className="mt-1.5 text-base leading-relaxed text-ink-300">
              {VERIFIED} entries are confirmed by a second, independent dictionary — or,
              for Tolkien’s languages, by a citation to his own writing. {UNCONFIRMED}{' '}
              stand on one source. {FLAGGED} are flagged as doubtful; they stay in the
              database and are never used to build a name.
            </dd>
          </div>
          <div>
            <dt className="label">The languages</dt>
            <dd className="mt-1.5 text-base leading-relaxed text-ink-300">
              {LANGUAGES.join(' · ')}
            </dd>
          </div>
          <div>
            <dt className="label">Invented languages</dt>
            <dd className="mt-1.5 text-base leading-relaxed text-ink-300">
              {INVENTED.join(' · ')}
            </dd>
          </div>
          <div>
            <dt className="label">Sources</dt>
            <dd className="mt-1.5 text-base leading-relaxed text-ink-300">
              Root entries are drawn from{' '}
              <Source href="https://en.wiktionary.org">Wiktionary</Source> (CC BY-SA 4.0),
              Strong’s Hebrew dictionary (public domain) and{' '}
              <Source href="https://eldamo.org">Eldamo</Source> by Paul Strack (CC BY 4.0).
              English word relations are from{' '}
              <Source href="https://wordnet.princeton.edu">WordNet</Source>, Princeton
              University. Entries are cross-checked against Liddell–Scott–Jones, Lewis &
              Short, Monier-Williams, Bosworth–Toller, Cleasby–Vigfusson, Brown–Driver–Briggs
              and the other dictionaries named on each root; none of their text is included
              here.
            </dd>
          </div>
        </dl>
      </div>
    </section>
  )
}

/** A link out to a source. Same treatment as the Phansora link in the footer. */
function Source({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="text-brass-300 underline decoration-brass-300/40 underline-offset-4 transition-colors hover:text-brass-200 hover:decoration-brass-200"
    >
      {children}
    </a>
  )
}

export function Footer() {
  return (
    <footer className="mt-20 border-t border-ink-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-9 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="text-base text-ink-300">
          <span className="font-serif text-ink-100">Archis</span> — a{' '}
          {/* Back to the suite this belongs to. New tab and rel=noopener: it leaves the
              site, which is the same rule the product cards on skylanex.com follow. */}
          <a
            href="https://www.phansora.com"
            target="_blank"
            rel="noopener"
            className="text-brass-300 underline decoration-brass-300/40 underline-offset-4 transition-colors hover:text-brass-200 hover:decoration-brass-200"
          >
            Phansora
          </a>{' '}
          product
        </p>

        <p className="text-base text-ink-300">
          © {new Date().getFullYear()} Phansora
        </p>
      </div>
    </footer>
  )
}
