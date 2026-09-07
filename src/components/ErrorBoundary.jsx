import { Component } from 'react'
import i18n from '../i18n'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { captureError } from '../lib/errorTracking'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error) {
    // Bir hata olduğunda state'i güncelle
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('🔥 ErrorBoundary yakaladı:', error)
    console.error('📍 Component stack:', errorInfo.componentStack)

    // Hata izleme açıksa (VITE_SENTRY_DSN) servise raporla
    captureError(error, { componentStack: errorInfo.componentStack })

    this.setState({ errorInfo })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    window.location.href = '/'
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV

      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
          <div className="max-w-xl w-full">
            <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-8 shadow-2xl">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 bg-red-500/20 rounded-2xl flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-7 h-7 text-red-400" />
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold mb-2">{i18n.t('errorBoundary.bir_seyler_ters_gitti')}</h1>
                  <p className="text-slate-300">
                    {i18n.t('errorBoundary.beklenmedik_hata_verilerin_guvende')}
                  </p>
                </div>
              </div>

              {/* Development modunda hata detayı */}
              {isDev && this.state.error && (
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 mb-6 overflow-auto max-h-60">
                  <div className="text-xs font-mono text-red-400 mb-2 font-semibold">
                    {this.state.error.toString()}
                  </div>
                  {this.state.errorInfo && (
                    <pre className="text-xs font-mono text-slate-500 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}

              {/* Production'da genel öneri */}
              {!isDev && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                  <p className="text-sm text-slate-300">
                    💡 <strong>{i18n.t('errorBoundary.ne_yapabilirsin')}</strong>
                  </p>
                  <ul className="text-sm text-slate-400 mt-2 space-y-1 list-disc list-inside">
                    <li>{i18n.t('errorBoundary.yeniden_dene_butonuna_tikla')}</li>
                    <li>{i18n.t('errorBoundary.sayfayi_yenile_f5')}</li>
                    <li>{i18n.t('errorBoundary.problem_devam_ederse_yedek_al')}</li>
                  </ul>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={this.handleReset}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 py-2.5 rounded-lg transition font-semibold"
                >
                  <RefreshCw className="w-4 h-4" />
                  {i18n.t('errorBoundary.yeniden_dene')}
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 py-2.5 rounded-lg transition font-semibold"
                >
                  <Home className="w-4 h-4" />
                  {i18n.t('errorBoundary.ana_sayfa')}
                </button>
                <button
                  onClick={this.handleReload}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 py-2.5 rounded-lg transition font-semibold"
                >
                  <RefreshCw className="w-4 h-4" />
                  {i18n.t('errorBoundary.yenile')}
                </button>
              </div>

              <p className="text-xs text-slate-500 text-center mt-6">
                {i18n.t('errorBoundary.hata_devam_ediyorsa_konsolu_kaydet')}
              </p>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary