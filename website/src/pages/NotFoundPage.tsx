import { Link } from 'react-router-dom'
import { DandaDivider } from '../components/Motifs'
import { useLang } from '../state/AppState'

export default function NotFoundPage() {
  const { t } = useLang()
  return (
    <div className="container-page py-24">
      <div className="mx-auto max-w-reading text-center">
        <DandaDivider className="mb-8" />
        <p className="label-eyebrow">{t('notFound.eyebrow')}</p>
        <h1 className="mt-2 text-4xl">{t('notFound.title')}</h1>
        <p className="mt-4 text-muted">{t('notFound.body')}</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/" className="btn btn-primary">{t('notFound.home')}</Link>
          <Link to="/p/devasi" className="btn">{t('notFound.browse')}</Link>
        </div>
      </div>
    </div>
  )
}
