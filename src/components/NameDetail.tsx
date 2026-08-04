import { Bookmark, Check, Copy, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { GeneratedName } from '../types'
import { LANGUAGES } from '../data/languages'

interface Props {
  name: GeneratedName
  favorite: boolean
  copied: boolean
  onClose: () => void
  onCopy: (text: string) => void
  onFavorite: () => void
}

/**
 * Where a name explains itself.
 *
 * Everything the card left out: the two roots with their language, era and meaning, what
 * the join actually did to them, the full reading, and the spellings the name could
 * equally have had. This is the half of the product that makes a coined name usable —
 * without it there is no way to tell a considered blend from a random one.
 *
 * A real modal: focus moves in on open and returns on close, Escape closes, Tab is
 * trapped, and the page behind it cannot scroll.
 */
export function NameDetail({ name, favorite, copied, onClose, onCopy, onFavorite }: Props) {
  const panel = useRef<HTMLDivElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    returnFocus.current = document.activeElement as HTMLElement
    // Focus the panel itself rather than the first control: a dialog that opens with the
    // close button focused reads as "press this", and the first thing here to read is the
    // name, not a way out.
    panel.current?.focus()

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panel.current) return

      // Trap. Without this, Tab walks out of the dialog into the page behind it, which is
      // still there and still interactive to a screen reader.
      const focusable = panel.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      if (event.shiftKey && (active === first || active === panel.current)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      returnFocus.current?.focus()
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Scrim. Click-outside-to-close is a pointer convenience that duplicates the × and
          the Escape key, so it is hidden from assistive tech rather than announced as a
          second Close control the size of the screen. */}
      <button
        type="button"
        onClick={onClose}
        tabIndex={-1}
        aria-hidden="true"
        className="fixed inset-0 bg-ink-950/85 backdrop-blur-[2px]"
      />

      <div className="relative flex min-h-full items-start justify-center p-4 sm:p-8">
        <div
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-labelledby="archis-detail-name"
          tabIndex={-1}
          className="surface rise w-full max-w-2xl overflow-hidden focus:outline-none"
        >
          {/* ── heading ─────────────────────────────────────────────────── */}
          <header className="flex items-start gap-4 border-b border-ink-800 p-6 sm:p-8">
            <div className="min-w-0 flex-1">
              <h2
                id="archis-detail-name"
                className="font-serif text-[40px] leading-none font-medium text-ink-50 sm:text-[52px]"
              >
                {name.name}
              </h2>
              <p className="mt-3 font-mono text-sm tracking-wide text-brass-400">
                {name.pronunciation}
              </p>
              <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-ink-200">
                {name.meaning}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={onFavorite}
                aria-pressed={favorite}
                className={`icon-btn ${
                  favorite ? 'text-brass-400 hover:text-brass-300' : 'text-ink-400 hover:text-ink-100'
                }`}
              >
                <Bookmark
                  className="h-[18px] w-[18px]"
                  fill={favorite ? 'currentColor' : 'none'}
                  aria-hidden="true"
                />
                <span className="sr-only">{favorite ? 'Remove from kept names' : 'Keep this name'}</span>
              </button>
              <button
                type="button"
                onClick={() => onCopy(name.name)}
                className="icon-btn text-ink-400 hover:text-ink-100"
              >
                {copied ? (
                  <Check className="h-[18px] w-[18px] text-brass-400" aria-hidden="true" />
                ) : (
                  <Copy className="h-[18px] w-[18px]" aria-hidden="true" />
                )}
                <span className="sr-only">Copy {name.name}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="icon-btn text-ink-400 hover:text-ink-100"
              >
                <X className="h-[18px] w-[18px]" aria-hidden="true" />
                <span className="sr-only">Close</span>
              </button>
            </div>
          </header>

          {/* ── the roots ───────────────────────────────────────────────── */}
          <section className="border-b border-ink-800 p-6 sm:p-8">
            <h3 className="label mb-4">Built from</h3>
            <ol className="space-y-3">
              {name.roots.map((usage) => {
                const language = LANGUAGES[usage.root.language]
                return (
                  <li
                    key={`${usage.position}-${usage.root.id}`}
                    className="rounded-lg border border-ink-800 bg-ink-850 p-4"
                  >
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="font-serif text-xl text-ink-50">{usage.root.form}</span>
                      <span className="text-[13px] text-ink-400">{language?.name}</span>
                      {language?.provenance !== 'attested' && (
                        <span className="rounded border border-ink-700 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-ink-400">
                          {language?.provenance === 'reconstructed' ? 'Reconstructed' : 'Sound only'}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-[14px] leading-relaxed text-ink-200">
                      {usage.root.gloss}
                    </p>
                    <p className="mt-2 font-mono text-[11px] text-ink-400">
                      {language?.era} · gave{' '}
                      <span className="text-brass-400">{usage.contribution}</span> to the{' '}
                      {usage.position === 'head' ? 'front' : 'end'} of the name
                    </p>
                  </li>
                )
              })}
            </ol>
          </section>

          {/* ── how it was joined ───────────────────────────────────────── */}
          <section className="border-b border-ink-800 p-6 sm:p-8">
            <h3 className="label mb-3">How they were blended</h3>
            <p className="text-[15px] leading-relaxed text-ink-200">{name.blendNote}</p>
            <p className="mt-3 font-mono text-[13px] text-ink-400">
              {name.roots[0].contribution}
              <span className="mx-2 text-ink-600">+</span>
              {name.roots[1].contribution}
              <span className="mx-2 text-ink-600">→</span>
              <span className="text-brass-400">{name.name.toLowerCase()}</span>
            </p>
          </section>

          {/* ── variants ────────────────────────────────────────────────── */}
          {name.variants.length > 0 && (
            <section className="border-b border-ink-800 p-6 sm:p-8">
              <h3 className="label mb-3">Close spellings</h3>
              <div className="flex flex-wrap gap-2">
                {name.variants.map((variant) => (
                  <button
                    key={variant}
                    type="button"
                    onClick={() => onCopy(variant)}
                    className="rounded-md border border-ink-800 px-3 py-1.5 font-serif text-[15px] text-ink-200 transition-colors hover:border-ink-600 hover:text-ink-50"
                    title={`Copy ${variant}`}
                  >
                    {variant}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-ink-400">
                These roots reach English through transliteration, and transliteration was
                never settled — the same letter is one scholar's k and another's c.
              </p>
            </section>
          )}

          {/* ── the standing disclaimer ─────────────────────────────────── */}
          <footer className="bg-ink-850 p-6 sm:px-8">
            <p className="text-[13px] leading-relaxed text-ink-400">
              <span className="text-ink-200">{name.name} is a new word.</span> It was coined
              here by blending the roots above and has never been a word in any of their
              languages. The roots are real; the name is not a historical one.
            </p>
          </footer>
        </div>
      </div>
    </div>
  )
}
