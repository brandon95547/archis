import { Bookmark, Check, Copy } from 'lucide-react'
import type { GeneratedName } from '../types'

interface Props {
  name: GeneratedName
  index: number
  favorite: boolean
  copied: boolean
  onOpen: () => void
  onCopy: () => void
  onFavorite: () => void
}

/**
 * One name, at a glance.
 *
 * The card shows four things and stops: the name, how to say it, one line of meaning, and
 * the two actions. Roots, languages and derivation all live in the detail panel — putting
 * them here would turn a list you scan into a page you read, and the whole point of the
 * grid is to let someone find the two names worth opening.
 *
 * The card is a button, and the two actions are buttons inside it. Nested interactive
 * elements are invalid HTML, so the card's own hit area is an absolutely-positioned
 * overlay behind the actions instead — one tab stop for "open", then the two actions,
 * which is also the order someone reads them in.
 */
export function NameCard({
  name, index, favorite, copied, onOpen, onCopy, onFavorite,
}: Props) {
  return (
    <li
      className="surface surface-hover rise group relative flex flex-col p-5"
      style={{ animationDelay: `${Math.min(index * 40, 320)}ms` }}
    >
      {/* The card's hit area. Covers the card, sits under the action buttons. */}
      <button
        type="button"
        onClick={onOpen}
        className="absolute inset-0 z-0 rounded-[10px]"
        aria-label={`${name.name} — see the roots it was built from`}
      />

      <div className="pointer-events-none relative z-10">
        <h3 className="font-serif text-[27px] leading-tight font-medium text-ink-50">
          {name.name}
        </h3>
        <p className="mt-1.5 font-mono text-[12px] tracking-wide text-brass-400">
          {name.pronunciation}
        </p>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-300">
          {name.interpretation}
        </p>
      </div>

      <div className="relative z-10 mt-5 flex items-center gap-1 pt-1">
        <button
          type="button"
          onClick={onFavorite}
          aria-pressed={favorite}
          className={`icon-btn ${
            favorite
              ? 'text-brass-400 hover:text-brass-300'
              : 'text-ink-400 hover:text-ink-100'
          }`}
          title={favorite ? `Remove ${name.name} from kept names` : `Keep ${name.name}`}
        >
          <Bookmark
            className="h-[17px] w-[17px]"
            fill={favorite ? 'currentColor' : 'none'}
            aria-hidden="true"
          />
          <span className="sr-only">
            {favorite ? `Remove ${name.name} from kept names` : `Keep ${name.name}`}
          </span>
        </button>

        <button
          type="button"
          onClick={onCopy}
          className="icon-btn text-ink-400 hover:text-ink-100"
          title={`Copy ${name.name}`}
        >
          {copied ? (
            <Check className="h-[17px] w-[17px] text-brass-400" aria-hidden="true" />
          ) : (
            <Copy className="h-[17px] w-[17px]" aria-hidden="true" />
          )}
          <span className="sr-only">Copy {name.name}</span>
        </button>

        {/* Announced on copy. aria-live rather than a toast: it is one word of feedback
            and a toast would cover the grid to say it. */}
        <span className="sr-only" aria-live="polite">
          {copied ? `${name.name} copied` : ''}
        </span>

        <span className="ml-auto font-mono text-[11px] text-ink-400">
          {name.syllables} syl
        </span>
      </div>
    </li>
  )
}
