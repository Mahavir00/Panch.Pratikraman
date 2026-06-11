import { DandaDivider } from './Motifs'
import { RichText } from './RichText'
import { useLang } from '../state/AppState'

export function Spinner({ label }: { label?: string }) {
  const { t } = useLang()
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-muted" role="status">
      <svg viewBox="0 0 50 50" className="h-10 w-10 animate-spin text-saffron" aria-hidden="true">
        <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="5" />
        <path d="M25 5a20 20 0 0 1 20 20" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      </svg>
      <span className="text-sm">{label ?? t('common.loading')}</span>
    </div>
  )
}

export function ErrorState({ title, detail }: { title?: string; detail?: string }) {
  const { t } = useLang()
  return (
    <div className="container-page py-20">
      <div className="mx-auto max-w-reading card p-8 text-center">
        <DandaDivider className="mb-6" />
        <h2 className="text-2xl">{title ?? t('error.title')}</h2>
        {detail && <p className="mt-3 text-muted">{detail}</p>}
        <p className="mt-4 text-sm text-muted">
          <RichText text={t('error.resync')} />
        </p>
      </div>
    </div>
  )
}

export function EmptyHint({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line bg-surface-2 p-4 text-sm text-muted">{children}</p>
}
