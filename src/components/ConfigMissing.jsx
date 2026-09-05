import { AlertTriangle, Terminal } from 'lucide-react'

/**
 * .env yokken gösterilir. Eskiden bu durumda uygulama modül yüklenirken
 * throw ediyor ve beyaz ekran veriyordu.
 */
export default function ConfigMissing() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-slate-900 border border-yellow-500/30 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-14 h-14 bg-yellow-500/20 rounded-2xl flex items-center justify-center shrink-0">
            <AlertTriangle className="w-7 h-7 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-2">Yapılandırma eksik</h1>
            <p className="text-slate-300">
              Uygulama Supabase'e bağlanamıyor çünkü ortam değişkenleri tanımlı değil.
            </p>
          </div>
        </div>

        <p className="text-sm text-slate-400 mb-2">
          Proje kökünde bir <code className="text-blue-300">.env</code> dosyası oluştur:
        </p>
        <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 mb-6 overflow-x-auto text-xs font-mono text-slate-300">
{`VITE_SUPABASE_URL=https://<proje-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>`}
        </pre>

        <p className="text-sm text-slate-400 flex items-center gap-2">
          <Terminal className="w-4 h-4 shrink-0" />
          Değerleri Supabase Dashboard → Settings → API sayfasından alabilirsin.
          Örnek için <code className="text-blue-300">.env.example</code> dosyasına bak.
        </p>
      </div>
    </div>
  )
}
