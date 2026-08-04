import { Search, X } from 'lucide-react'
import { useEffect, useRef, type FormEvent } from 'react'

const EXAMPLES = [
  'truth, wisdom, hidden knowledge',
  'memory, time, origin',
  'light, discovery, consciousness',
  'creation, transformation, order',
]

interface Props {
  value: string
  onChange: (value: string) => void
  /**
   * Runs the search. Takes an optional query because the example chips have to search the
   * text they show, and setState is not applied by the time the click handler returns —
   * calling onSubmit() there would search whatever was in the box a moment ago.
   */
  onSubmit: (query?: string) => void
  busy: boolean
  showExamples: boolean
}

/**
 * The one input the product is built around.
 *
 * Deliberately a real <form>: Enter submits without a keydown handler, and the browser
 * gives the field its own history and clear affordances. The examples are buttons that
 * search immediately rather than filling the field and waiting — someone clicking
 * "truth, wisdom, hidden knowledge" wants to see what happens, not to press Enter next.
 */
export function SearchBar({ value, onChange, onSubmit, busy, showExamples }: Props) {
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // "/" focuses the field, the way search-first tools do — but never while the user is
    // already typing somewhere, which would eat the character.
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)
      if (event.key === '/' && !typing) {
        event.preventDefault()
        input.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (value.trim()) onSubmit()
  }

  return (
    <div>
      <form onSubmit={submit} role="search">
        <label htmlFor="archis-search" className="sr-only">
          Concepts to build names from
        </label>
        <div className="group relative">
          <Search
            className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400 transition-colors group-focus-within:text-brass-400"
            aria-hidden="true"
          />
          <input
            id="archis-search"
            ref={input}
            type="search"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="truth, wisdom, hidden knowledge"
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-xl border border-ink-800 bg-ink-900 py-4 pl-14 pr-32 text-base text-ink-100 placeholder:text-ink-400 transition-colors hover:border-ink-700 focus:border-brass-500 focus:outline-none sm:py-5 sm:text-lg [&::-webkit-search-cancel-button]:appearance-none"
          />
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('')
                input.current?.focus()
              }}
              className="icon-btn absolute right-24 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-100"
              aria-label="Clear"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <button
            type="submit"
            disabled={busy || !value.trim()}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg bg-brass-500 px-4 py-2.5 text-sm font-medium text-ink-950 transition-colors hover:bg-brass-400 disabled:cursor-not-allowed disabled:bg-ink-800 disabled:text-ink-500"
          >
            {busy ? 'Working' : 'Coin'}
          </button>
        </div>
      </form>

      {showExamples && (
        <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-2">
          <span className="label mr-1">Try</span>
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => {
                onChange(example)
                onSubmit(example)
              }}
              className="rounded-full border border-ink-800 px-3 py-1.5 text-sm text-ink-300 transition-colors hover:border-ink-600 hover:text-ink-100"
            >
              {example}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
