import { Compass, Info, TriangleAlert } from 'lucide-react'

/**
 * The three things the grid shows when it is not showing names: waiting, nothing found,
 * and never asked. Kept together because they are one decision — the results area is
 * always in exactly one of these states, and splitting them across files hides that.
 */

/**
 * Skeletons in the shape of the cards that will replace them, so the page does not jump
 * when they do. A spinner would be less work and would tell you nothing about what is
 * coming.
 */
export function Loading({ count }: { count: number }) {
  return (
    <ul
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="surface p-5">
          <div className="h-7 w-2/5 rounded bg-ink-800" />
          <div className="mt-3 h-3 w-1/3 rounded bg-ink-850" />
          <div className="mt-4 h-3 w-4/5 rounded bg-ink-850" />
          <div className="mt-6 h-6 w-16 rounded bg-ink-850" />
        </li>
      ))}
    </ul>
  )
}

/** The first screen. Says what the thing does, then gets out of the way. */
export function Introduction() {
  return (
    <div className="mx-auto max-w-2xl py-16 text-center sm:py-24">
      <Compass className="mx-auto h-7 w-7 text-ink-500" aria-hidden="true" />
      <h2 className="mt-6 font-serif text-2xl font-medium text-ink-100">
        Say what a name should mean
      </h2>
      <p className="mt-4 text-[15px] leading-relaxed text-ink-400">
        Archis reads your concepts, gathers the strongest roots for them across the ancient
        languages, and blends those roots into names that have never existed. Every name
        shows its sources.
      </p>
    </div>
  )
}

export function NoResults({ notice }: { notice?: string }) {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <TriangleAlert className="mx-auto h-6 w-6 text-ink-500" aria-hidden="true" />
      <h2 className="mt-5 font-serif text-xl font-medium text-ink-100">
        Nothing cleared the filters
      </h2>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-400">
        {notice
          ?? 'Try broader ideas — single abstract concepts like truth, memory or origin give the lexicon the most to work with.'}
      </p>
    </div>
  )
}

/** A quiet line above the grid, for a reading worth showing back or a partial result. */
export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2.5 text-[13px] leading-relaxed text-ink-400">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-500" aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}
