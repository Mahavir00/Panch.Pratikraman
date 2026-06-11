import { lazy, Suspense, useEffect } from 'react'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { LanguageProvider, LibraryProvider, ThemeProvider } from './state/AppState'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { Spinner } from './components/States'

const HomePage = lazy(() => import('./pages/HomePage'))
const PratikramanPage = lazy(() => import('./pages/PratikramanPage'))
const SutraPage = lazy(() => import('./pages/SutraPage'))
const GlossaryPage = lazy(() => import('./pages/GlossaryPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const StylePage = lazy(() => import('./pages/StylePage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

/** Scroll to top on route change, or to the hash target if present. */
function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1))
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
    }
    window.scrollTo({ top: 0 })
  }, [pathname, hash])
  return null
}

export function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <LibraryProvider>
          <HashRouter>
            <ScrollManager />
            <a
              href="#main"
              className="skip-link"
              onClick={(e) => {
                e.preventDefault()
                const el = document.getElementById('main')
                if (el) {
                  el.setAttribute('tabindex', '-1')
                  el.focus()
                  el.scrollIntoView()
                }
              }}
            >
              Skip to content
            </a>
            <div className="flex min-h-screen flex-col">
              <Header />
              <main id="main" className="flex-1">
                <Suspense fallback={<Spinner />}>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/p/:pratikramanId" element={<PratikramanPage />} />
                    <Route path="/s/:sutraId" element={<SutraPage />} />
                    <Route path="/glossary" element={<GlossaryPage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/style" element={<StylePage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </Suspense>
              </main>
              <Footer />
            </div>
          </HashRouter>
        </LibraryProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
