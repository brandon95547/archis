/**
 * The landing furniture: the four-column strip and the worked examples below it.
 *
 * Both are shown only BEFORE a search. Once names are on screen they are what the page is
 * for, and marketing under them would push the thing the user asked for off the fold.
 *
 * The icons are drawn here rather than added to public/icons.svg because that file is the
 * social set the footer pulls from — these four exist for one strip on one screen and have
 * no second caller.
 */

import type { ReactElement } from 'react'

type Feature = { icon: ReactElement; title: string; body: string }

// 1.6 stroke on a 24 box, matching the Lucide icons the app already uses at this size.
const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const FEATURES: Feature[] = [
  {
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" {...stroke}>
        <path d="M12 6.8C10.5 5.4 8.5 4.8 4.5 4.8v12.6c4 0 6 .6 7.5 2 1.5-1.4 3.5-2 7.5-2V4.8c-4 0-6 .6-7.5 2z" />
        <path d="M12 6.8v13.6" />
      </svg>
    ),
    title: 'Reads ancient sources',
    body: 'Archis searches across old languages and texts to find meaningful roots.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" {...stroke}>
        <circle cx="12" cy="5.5" r="2.2" />
        <circle cx="5.5" cy="17" r="2.2" />
        <circle cx="18.5" cy="17" r="2.2" />
        <path d="M10.6 7.4 7.1 15M13.4 7.4 16.9 15M7.7 17h8.6" />
      </svg>
    ),
    title: 'Blends real roots',
    body: 'It combines historical roots into original names that have never existed.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" {...stroke}>
        <path d="M12 2.8c.9 5 3.3 7.4 8.3 8.3-5 .9-7.4 3.3-8.3 8.3-.9-5-3.3-7.4-8.3-8.3 5-.9 7.4-3.3 8.3-8.3z" />
      </svg>
    ),
    title: 'Shows the meaning',
    body: 'Every name includes its roots, languages, and what it represents.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" {...stroke}>
        <path d="M12 3.4 21 8l-9 4.6L3 8z" />
        <path d="M3 12.4 12 17l9-4.6M3 16.6 12 21.2l9-4.6" />
      </svg>
    ),
    title: 'Built for creators',
    body: 'Perfect for worlds, characters, projects, and unique ideas.',
  },
]

type Example = {
  name: string
  image: string
  alt: string
  concepts: string[]
  roots: string
  meaning: string
  languages: string
}

// Worked examples, shown as a sample of the real thing rather than generated live: the
// engine runs in the browser and coining three names on load would compete with the very
// first search for the main thread.
const EXAMPLES: Example[] = [
  {
    name: 'Vaelthar',
    image: '/images/archis-example-ruins.webp',
    alt: 'A colonnaded temple in ruins on a headland at sunset.',
    concepts: ['truth', 'light', 'order'],
    roots: 'vael (Latin: truth) + thār (Old Norse: order)',
    meaning: 'One who reveals ordered truth.',
    languages: 'Latin, Old Norse',
  },
  {
    name: 'Zorimath',
    image: '/images/archis-example-middle.webp',
    alt: 'Sunrise over a range of snow-capped mountains above a still lake.',
    concepts: ['wisdom', 'memory', 'origin'],
    roots: 'zor (Akkadian: to see) + im (Sumerian: mother) + ath (Greek: source)',
    meaning: 'The source of deep remembrance.',
    languages: 'Akkadian, Sumerian, Greek',
  },
  {
    name: 'Neravion',
    image: '/images/archis-example-right.webp',
    alt: 'A dark stone hall with a shaft of light falling at the far end.',
    concepts: ['hidden knowledge', 'discovery', 'transformation'],
    roots: 'ner (Hebrew: light) + av (Proto-Indo-European: force) + ion (Greek: motion)',
    meaning: 'The power to uncover and move beyond.',
    languages: 'Hebrew, PIE, Greek',
  },
]

export function FeatureStrip() {
  return (
    <section id="how-it-works" className="border-t border-ink-900 pt-12 sm:pt-14">
      <ul className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
        {FEATURES.map((f) => (
          <li key={f.title} className="text-center lg:text-left">
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-full border border-brass-600/40 text-brass-300 lg:mx-0">
              {f.icon}
            </span>
            <h3 className="mt-4 font-serif text-[17px] font-medium text-ink-50">{f.title}</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-400">{f.body}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function WorkedExamples() {
  return (
    <section id="examples" className="mt-16 border-t border-ink-900 pt-12 sm:mt-20 sm:pt-14">
      <h2 className="text-center font-serif text-[26px] font-medium text-ink-50 sm:text-[30px]">
        See how it works
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-[15px] leading-relaxed text-ink-400">
        Each name shows the original roots, languages, and meaning behind it.
      </p>

      <ul className="mt-9 grid gap-5 md:grid-cols-3">
        {EXAMPLES.map((e) => (
          <li
            key={e.name}
            className="overflow-hidden rounded-xl border border-ink-800 bg-ink-900/60"
          >
            {/* Decorative: the name below carries the meaning, and a screen reader that
                stops on every one of these reads three landscapes before a single root. */}
            <img
              src={e.image}
              alt={e.alt}
              width={1672}
              height={941}
              loading="lazy"
              decoding="async"
              className="h-28 w-full object-cover"
            />
            <div className="p-5">
              <h3 className="font-serif text-[19px] font-medium text-ink-50">{e.name}</h3>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {e.concepts.map((c) => (
                  <li
                    key={c}
                    className="rounded-full border border-ink-800 bg-ink-850 px-2 py-0.5 text-[12px] text-ink-300"
                  >
                    {c}
                  </li>
                ))}
              </ul>
              <dl className="mt-4 space-y-1.5 text-[13px] leading-relaxed">
                <div>
                  <dt className="inline font-medium text-ink-200">Roots: </dt>
                  <dd className="inline text-ink-400">{e.roots}</dd>
                </div>
                <div>
                  <dt className="inline font-medium text-ink-200">Meaning: </dt>
                  <dd className="inline text-ink-400">{e.meaning}</dd>
                </div>
                <div>
                  <dt className="inline font-medium text-ink-200">Languages: </dt>
                  <dd className="inline text-ink-400">{e.languages}</dd>
                </div>
              </dl>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
