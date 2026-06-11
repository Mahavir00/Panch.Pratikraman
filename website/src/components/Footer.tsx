import { Link } from 'react-router-dom'
import { DandaDivider, LotusMark } from './Motifs'
import { useAsync } from '../state/useAsync'
import { loadIndex } from '../data'
import { asset } from '../config'
import { useLang } from '../state/AppState'

export function Footer() {
  const { data: index } = useAsync(() => loadIndex(), [])
  const { lang, t } = useLang()
  const pdf = index?.pdfs?.[0]
  return (
    <footer className="no-print mt-20 border-t border-line bg-surface">
      <div className="container-page py-12">
        <DandaDivider className="mb-10" />
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <LotusMark className="h-8 w-8 text-maroon" />
              <span className="font-serif text-lg font-semibold">Pañca Pratikramaṇa</span>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
              {t('footer.tagline')}
            </p>
          </div>

          <div>
            <h3 className="label-eyebrow mb-3">{t('footer.explore')}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link className="link" to="/">{t('footer.link.intro')}</Link></li>
              <li><Link className="link" to="/p/devasi">{t('footer.link.five')}</Link></li>
              <li><Link className="link" to="/glossary">{t('nav.glossary')}</Link></li>
              <li><Link className="link" to="/about">{t('footer.link.about')}</Link></li>
              <li><Link className="link" to="/style">{t('footer.link.design')}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="label-eyebrow mb-3">{t('footer.provenance')}</h3>
            <p className="text-sm leading-relaxed text-muted">
              {lang === 'english' ? index?.sourceBook || t('footer.sourceFallback') : t('footer.sourceFallback')}
            </p>
            {pdf && (
              <a className="btn mt-4 text-xs" href={asset(`data/${pdf}`)} download>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t('footer.downloadPdf')}
              </a>
            )}
          </div>
        </div>

        <p className="mt-10 border-t border-line pt-6 text-xs text-muted">
          {t('footer.bottom.pre')}
          <Link className="link" to="/about">{t('footer.bottom.linkLabel')}</Link>.
        </p>
      </div>
    </footer>
  )
}
