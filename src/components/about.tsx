/**
 * About, and the foot of the page.
 *
 * A SECTION rather than a route. Archis is one screen with no router, and adding one so
 * three paragraphs can have their own URL would be the largest dependency in the app. The
 * nav already scrolls to #how-it-works and #examples; #about was the one anchor pointing
 * at nothing, and this is what it points at.
 *
 * Every number below is read off the lexicon rather than written down, because a figure
 * in prose is a figure that goes stale the first time someone adds a root.
 */

import { LEXICON } from '../data/lexicon'
import { languageName } from '../data/languages'

// "Euphonic ending" is a join category, not a language, so it is not counted or listed as
// one — the difference matters on a page whose subject is which languages are in here.
const LANGUAGES = [...new Set(LEXICON.map((r) => r.language))]
  .map((code) => languageName(code))
  .filter((name) => name !== 'Euphonic ending')
  .sort((a, b) => a.localeCompare(b))

const ROOT_COUNT = LEXICON.length

export function About() {
  return (
    <section id="about" className="mt-16 border-t border-ink-900 pt-12 sm:mt-20 sm:pt-14">
      <h2 className="font-serif text-2xl font-medium text-ink-50 sm:text-[30px]">About Archis</h2>

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-14">
        <div className="space-y-4 text-base leading-relaxed text-ink-300">
          <p>
            Archis coins names. You say what a name should carry — an idea, a quality, a
            thing — and it finds the roots that hold those ideas across the old languages,
            then blends them into a word that has never been said.
          </p>
          <p>
            <span className="text-ink-100">Every name here is newly coined.</span> The roots
            are real; the names are not. Nothing Archis produces is presented as a
            historical word, and each name shows the roots it was built from, the languages
            they came from and what they mean — so you can check it before you use it.
          </p>
          <p>
            It runs entirely in your browser. There is no account, nothing is uploaded, and
            no request leaves the page: the lexicon and the engine are part of the app you
            have already downloaded. Names you keep are stored in this browser only.
          </p>
        </div>

        <dl className="space-y-5">
          <div>
            <dt className="label">The lexicon</dt>
            <dd className="mt-1.5 text-base leading-relaxed text-ink-300">
              {ROOT_COUNT} roots across {LANGUAGES.length} languages, each with its own
              gloss. No single language may contribute more than four roots to one name,
              which is what stops Greek and Latin — the deepest coverage here — from
              answering every query between them.
            </dd>
          </div>
          <div>
            <dt className="label">The languages</dt>
            <dd className="mt-1.5 text-base leading-relaxed text-ink-300">
              {LANGUAGES.join(' · ')}
            </dd>
          </div>
        </dl>
      </div>
    </section>
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
