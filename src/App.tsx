import { useCallback, useMemo, useRef, useState } from 'react'
import { Bookmark, Plus } from 'lucide-react'
import type { GeneratedName, GenerationResult, Refinements } from './types'
import { createNameService } from './services'
import { languageName } from './data/languages'
import { useFavorites } from './hooks/useFavorites'
import { useCopy } from './hooks/useCopy'
import { SearchBar } from './components/SearchBar'
import { RefinementBar } from './components/RefinementBar'
import { NameCard } from './components/NameCard'
import { NameDetail } from './components/NameDetail'
import { Introduction, Loading, NoResults, Notice } from './components/states'
import { FeatureStrip, WorkedExamples } from './components/landing'

const DEFAULT_REFINEMENTS: Refinements = {
  length: 'medium',
  sound: 'balanced',
  era: 'balanced',
  count: 9,
}

export default function App() {
  // Built once. The service is a dependency, not state — swapping engines is a config
  // change, and nothing in here should be able to reach for a different one mid-session.
  const service = useMemo(() => createNameService(), [])

  const [query, setQuery] = useState('')
  const [refinements, setRefinements] = useState<Refinements>(DEFAULT_REFINEMENTS)
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<GeneratedName | null>(null)
  const [showKept, setShowKept] = useState(false)

  const { favorites, isFavorite, toggle } = useFavorites()
  const { copy, copied } = useCopy()

  /**
   * The last query that was actually run. Refinements re-search against THIS, not against
   * whatever is in the box — someone half-way through typing a new idea who nudges the
   * length slider should get the same search back at a different length, not a search for
   * their unfinished text.
   */
  const searched = useRef('')

  /**
   * Every request goes through here, and only the newest one is allowed to land.
   *
   * Without the token, changing two refinements quickly races: both requests are in
   * flight, and whichever the network returns last wins regardless of which the user asked
   * for second. It is a local service today, so the race is theoretical — and it will stop
   * being theoretical the moment this points at DeepSeek.
   */
  const latest = useRef(0)

  const run = useCallback(
    async (nextQuery: string, nextRefinements: Refinements, exclude: string[] = []) => {
      const text = nextQuery.trim()
      if (!text) return

      const token = latest.current + 1
      latest.current = token
      searched.current = text
      setBusy(true)
      setError(null)

      try {
        const next = await service.generate({ query: text, refinements: nextRefinements, exclude })
        if (latest.current !== token) return
        setResult(
          exclude.length > 0 && result
            ? { ...next, names: [...result.names, ...next.names] }
            : next,
        )
      } catch (cause) {
        if (latest.current !== token) return
        setError(cause instanceof Error ? cause.message : 'The name service could not be reached.')
      } finally {
        if (latest.current === token) setBusy(false)
      }
    },
    [service, result],
  )

  const search = useCallback(
    (override?: string) => {
      setShowKept(false)
      void run(override ?? query, refinements)
    },
    [query, refinements, run],
  )

  const changeRefinements = useCallback(
    (next: Refinements) => {
      setRefinements(next)
      // Re-search immediately. A refinement that needs a second click to take effect is a
      // form field pretending to be a control.
      if (searched.current) void run(searched.current, next)
    },
    [run],
  )

  const more = useCallback(() => {
    if (!result || !searched.current) return
    void run(searched.current, refinements, result.names.map((n) => n.name))
  }, [refinements, result, run])

  const hasSearched = Boolean(result) || busy

  return (
    <div className="min-h-screen">
      {/* ── hero band ─────────────────────────────────────────────────────
          The photograph runs behind the masthead as well as the search, so the two
          share a container. `isolate` keeps the negative z-indexes from escaping it
          into the rest of the page. */}
      <div className="relative isolate overflow-hidden border-b border-ink-900">
        <img
          src="/images/archis-full-hero-background.webp"
          alt=""
          width={2048}
          height={768}
          fetchPriority="high"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
        />
        {/* The veil. The page's OWN background rather than black, so the hero darkens
            toward the colour everything below it already is.
            
            It is a left-weighted GRADIENT and never lighter than the 40% asked for. Flat
            40% measured 3.02:1 under the sub-headline — the photograph averages
            rgb(99,104,104) there, which is far too bright to read 15px type on. The text
            all sits on the left, the statue that earns the photograph is on the right, and
            a gradient serves both: 85% where the words are, 40% over the statue. */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink-950/85 via-ink-950/60 to-ink-950/40" />

      {/* ── masthead ────────────────────────────────────────────────────── */}
      <header>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <div className="flex items-baseline gap-3">
            <span className="font-serif text-[19px] font-medium tracking-tight text-ink-50">
              Archis
            </span>
            <span className="hidden text-[12px] text-ink-500 sm:inline">
              a Phansora product
            </span>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <nav aria-label="Sections" className="hidden items-center gap-1 sm:flex">
              {[
                ['How it works', '#how-it-works'],
                ['Examples', '#examples'],
                ['About', '#about'],
              ].map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  className="rounded-lg px-3 py-2 text-sm text-ink-300 transition-colors hover:text-ink-50"
                >
                  {label}
                </a>
              ))}
            </nav>

          <button
            type="button"
            onClick={() => setShowKept((value) => !value)}
            aria-pressed={showKept}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
              showKept
                ? 'border-brass-600 bg-brass-500/10 text-brass-300'
                : 'border-ink-800 text-ink-300 hover:border-ink-600 hover:text-ink-100'
            }`}
          >
            <Bookmark
              className="h-4 w-4"
              fill={showKept ? 'currentColor' : 'none'}
              aria-hidden="true"
            />
            Kept
            {favorites.length > 0 && (
              <span className="font-mono text-[11px] text-ink-400">{favorites.length}</span>
            )}
          </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        {/* ── the search ────────────────────────────────────────────────── */}
        <section className="pb-16 pt-10 sm:pb-20 sm:pt-14">
          <h1 className="max-w-2xl font-serif text-[34px] leading-[1.15] font-medium text-ink-50 sm:text-[44px]">
            New names, built <span className="text-brass-300">from ancient roots</span>
          </h1>
          {/* ink-200, not the ink-400 this paragraph uses elsewhere: that step is the
              floor against the page's near-black background, and this one sits on a
              photograph. */}
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-200">
            Enter the ideas a name should carry. Archis finds the roots that hold them
            across the old languages and blends those roots into words that have never
            been said.
          </p>

          <div className="mt-9">
            <SearchBar
              value={query}
              onChange={setQuery}
              onSubmit={search}
              busy={busy}
              showExamples={!hasSearched}
            />
          </div>

          {hasSearched && (
            <div className="mt-8 border-t border-ink-800/80 pt-7">
              <RefinementBar value={refinements} onChange={changeRefinements} disabled={busy} />
            </div>
          )}
        </section>
      </div>
      </div>

      <main className="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
        {/* ── results ───────────────────────────────────────────────────── */}
        <section className="mt-12" aria-busy={busy}>
          {showKept ? (
            favorites.length === 0 ? (
              <div className="py-16 text-center">
                <Bookmark className="mx-auto h-6 w-6 text-ink-500" aria-hidden="true" />
                <h2 className="mt-5 font-serif text-xl font-medium text-ink-100">
                  Nothing kept yet
                </h2>
                <p className="mt-3 text-[15px] text-ink-400">
                  The bookmark on any name keeps it here.
                </p>
              </div>
            ) : (
              <Grid
                names={favorites}
                isFavorite={isFavorite}
                copied={copied}
                onOpen={setOpen}
                onCopy={copy}
                onFavorite={toggle}
              />
            )
          ) : error ? (
            <div className="surface mx-auto max-w-lg p-6 text-center">
              <p className="text-[15px] text-ink-100">The names could not be generated.</p>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-400">{error}</p>
              <button
                type="button"
                onClick={() => search(searched.current)}
                className="mt-5 rounded-lg border border-ink-700 px-4 py-2 text-sm text-ink-200 transition-colors hover:border-ink-500 hover:text-ink-50"
              >
                Try again
              </button>
            </div>
          ) : busy && !result ? (
            <Loading count={refinements.count} />
          ) : !result ? (
            <Introduction />
          ) : result.names.length === 0 ? (
            <NoResults notice={result.notice} />
          ) : (
            <>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <p className="text-[13px] text-ink-400">
                  <span className="text-ink-300">{result.names.length}</span> names from{' '}
                  <span className="text-ink-300">{result.languages.length}</span> traditions
                  {result.languages.length > 0 && (
                    <span className="hidden sm:inline">
                      {' '}— {result.languages.map(languageName).join(', ')}
                    </span>
                  )}
                </p>
                {result.notice && (
                  <Notice tone={result.guessed ? 'attention' : 'quiet'}>{result.notice}</Notice>
                )}
              </div>

              <Grid
                names={result.names}
                isFavorite={isFavorite}
                copied={copied}
                onOpen={setOpen}
                onCopy={copy}
                onFavorite={toggle}
              />

              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={more}
                  disabled={busy}
                  className="flex items-center gap-2 rounded-lg border border-ink-800 px-5 py-2.5 text-sm text-ink-300 transition-colors hover:border-ink-600 hover:text-ink-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {busy ? 'Working' : 'More names'}
                </button>
              </div>
            </>
          )}
        </section>

        {/* ── the landing strip ─────────────────────────────────────────────
            Before a search only. Once names are on screen they are what the page
            is for, and this under them would push the thing the reader asked for
            off the fold. Hidden behind the Kept list for the same reason. */}
        {!hasSearched && !showKept && (
          <div className="mt-16 sm:mt-20">
            <FeatureStrip />
            <WorkedExamples />
          </div>
        )}
      </main>

      {/* ── the standing statement ──────────────────────────────────────── */}
      <footer className="border-t border-ink-900">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
          <p className="max-w-2xl text-[13px] leading-relaxed text-ink-400">
            <span className="text-ink-300">Every name here is newly coined.</span> Archis
            builds them by blending roots from real languages, but the names themselves have
            never been words in those languages and are not presented as historical. The
            roots, their languages and their meanings are shown on each name so you can see
            exactly what it was made from — and check it before you use it.
          </p>
        </div>
      </footer>

      {open && (
        <NameDetail
          name={open}
          favorite={isFavorite(open)}
          copied={copied === open.name}
          onClose={() => setOpen(null)}
          onCopy={copy}
          onFavorite={() => toggle(open)}
        />
      )}
    </div>
  )
}

interface GridProps {
  names: GeneratedName[]
  isFavorite: (name: GeneratedName) => boolean
  copied: string | null
  onOpen: (name: GeneratedName) => void
  onCopy: (text: string) => void
  onFavorite: (name: GeneratedName) => void
}

function Grid({ names, isFavorite, copied, onOpen, onCopy, onFavorite }: GridProps) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {names.map((name, index) => (
        <NameCard
          key={name.id}
          name={name}
          index={index}
          favorite={isFavorite(name)}
          copied={copied === name.name}
          onOpen={() => onOpen(name)}
          onCopy={() => onCopy(name.name)}
          onFavorite={() => onFavorite(name)}
        />
      ))}
    </ul>
  )
}
