import { AlertTriangle, Terminal } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/**
 * .env yokken gösterilir. Eskiden bu durumda uygulama modül yüklenirken
 * throw ediyor ve beyaz ekran veriyordu.
 */
export default function ConfigMissing() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-slate-900 border border-yellow-500/30 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-14 h-14 bg-yellow-500/20 rounded-2xl flex items-center justify-center shrink-0">
            <AlertTriangle className="w-7 h-7 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-2">{t('configMissing.yapilandirma_eksik')}</h1>
            <p className="text-slate-300">
              {t('configMissing.uygulama_supabase_e_baglanamiyor_cunku_ortam')}
            </p>
          </div>
        </div>

        <p className="text-sm text-slate-400 mb-2">
          {t('configMissing.proje_kokunde_bir')} <code className="text-blue-300">{t('configMissing.env')}</code> {t('configMissing.dosyasi_olustur')}
        </p>
        <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 mb-6 overflow-x-auto text-xs font-mono text-slate-300">
{`VITE_SUPABASE_URL=https://<proje-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>`}
        </pre>

        <p className="text-sm text-slate-400 flex items-center gap-2">
          <Terminal className="w-4 h-4 shrink-0" />
          {t('configMissing.degerleri_supabase_dashboard_settings_api_sayfas')} <code className="text-blue-300">{t('configMissing.env_example')}</code> {t('configMissing.dosyasina_bak')}
        </p>
      </div>
    </div>
  )
}
