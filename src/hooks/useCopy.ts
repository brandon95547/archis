import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Copy to clipboard, with the "Copied" state that makes it believable.
 *
 * Two details that are easy to get wrong: the timer is cleared on unmount, because a card
 * can be copied and then closed inside the two seconds; and a failed copy is reported
 * rather than silently showing the success tick, since the clipboard API is refused
 * outright in plenty of contexts and a lie here is worse than a shrug.
 */
export function useCopy(resetAfter = 1800) {
  const [copied, setCopied] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  const copy = useCallback(
    async (text: string) => {
      if (timer.current) clearTimeout(timer.current)
      try {
        await navigator.clipboard.writeText(text)
        setCopied(text)
        setFailed(false)
      } catch {
        setCopied(null)
        setFailed(true)
      }
      timer.current = setTimeout(() => {
        setCopied(null)
        setFailed(false)
      }, resetAfter)
    },
    [resetAfter],
  )

  return { copy, copied, failed }
}
