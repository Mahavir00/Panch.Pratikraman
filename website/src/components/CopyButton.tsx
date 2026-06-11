import { useEffect, useRef, useState } from 'react'
import { copyText } from '../utils'
import { useLang } from '../state/AppState'

export function CopyButton({
  text,
  label,
  className = '',
  title,
}: {
  text: string
  label?: string
  className?: string
  title?: string
}) {
  const { t } = useLang()
  const [done, setDone] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  return (
    <button
      type="button"
      className={`btn px-2.5 py-1 text-xs ${className}`}
      title={title || t('common.copyTitle')}
      onClick={async () => {
        if (await copyText(text)) {
          setDone(true)
          window.clearTimeout(timer.current)
          timer.current = window.setTimeout(() => setDone(false), 1600)
        }
      }}
    >
      {done ? (
        <>
          <CheckIcon /> {t('common.copied')}
        </>
      ) : (
        <>
          <ClipIcon /> {label ?? t('common.copy')}
        </>
      )}
    </button>
  )
}

function ClipIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-jgreen" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}
