import { Component } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

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
    // Hatayı console'a logla (production'da Sentry gibi servislere gönderilebilir)
    console.error('🔥 ErrorBoundary yakaladı:', error)
    console.error('📍 Component stack:', errorInfo.componentStack)

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
                  <h1 className="text-2xl font-bold mb-2">Bir şeyler ters gitti 😟</h1>
                  <p className="text-slate-300">
                    Uygulamada beklenmedik bir hata oluştu. Endişelenme — verilerin güvende.
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
                    💡 <strong>Ne yapabilirsin?</strong>
                  </p>
                  <ul className="text-sm text-slate-400 mt-2 space-y-1 list-disc list-inside">
                    <li>"Yeniden Dene" butonuna tıkla</li>
                    <li>Sayfayı yenile (F5)</li>
                    <li>Problem devam ederse, ayarlardan veri yedeği alıp tarayıcı önbelleğini temizle</li>
                  </ul>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={this.handleReset}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 py-2.5 rounded-lg transition font-semibold"
                >
                  <RefreshCw className="w-4 h-4" />
                  Yeniden Dene
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 py-2.5 rounded-lg transition font-semibold"
                >
                  <Home className="w-4 h-4" />
                  Ana Sayfa
                </button>
                <button
                  onClick={this.handleReload}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 py-2.5 rounded-lg transition font-semibold"
                >
                  <RefreshCw className="w-4 h-4" />
                  Yenile
                </button>
              </div>

              <p className="text-xs text-slate-500 text-center mt-6">
                Hata devam ediyorsa geri bildirim için tarayıcı konsolundaki hatayı kaydedin
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