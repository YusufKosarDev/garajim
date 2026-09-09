import { Keyboard } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Modal from './Modal'

const shortcutGroups = [
  {
    title: 'keyboardShortcutsModal.arama',
    shortcuts: [
      { keys: ['Ctrl', 'K'], altKeys: ['⌘', 'K'], description: 'keyboardShortcutsModal.desc.global_arama' },
      { keys: ['/'], description: 'keyboardShortcutsModal.desc.sayfa_aramasi' },
    ],
  },
  {
    title: 'keyboardShortcutsModal.navigasyon',
    shortcuts: [
      { keys: ['G', 'D'], description: 'keyboardShortcutsModal.desc.dashboard' },
      { keys: ['G', 'V'], description: 'keyboardShortcutsModal.desc.araclarim' },
      { keys: ['G', 'C'], description: 'keyboardShortcutsModal.desc.takvim' },
      { keys: ['G', 'S'], description: 'keyboardShortcutsModal.desc.istatistikler' },
      { keys: ['G', ','], description: 'keyboardShortcutsModal.desc.ayarlar' },
    ],
  },
  {
    title: 'keyboardShortcutsModal.hizli_ekleme',
    shortcuts: [
      { keys: ['N', 'V'], description: 'keyboardShortcutsModal.desc.yeni_arac' },
      { keys: ['N', 'M'], description: 'keyboardShortcutsModal.desc.yeni_bakim' },
      { keys: ['N', 'F'], description: 'keyboardShortcutsModal.desc.yeni_yakit' },
    ],
  },
  {
    title: 'keyboardShortcutsModal.genel',
    shortcuts: [
      { keys: ['?'], description: 'keyboardShortcutsModal.desc.kisayol_rehberi' },
      { keys: ['Esc'], description: 'keyboardShortcutsModal.desc.modal_kapat' },
      { keys: ['Tab'], description: 'keyboardShortcutsModal.desc.sonraki_alan' },
    ],
  },
]

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  const { t } = useTranslation()

  // Mac tespiti
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('keyboardShortcutsModal.klavye_kisayollari')} maxWidth="max-w-2xl">
      <div className="p-5">
        <div className="flex items-center gap-3 mb-5 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <Keyboard className="w-5 h-5 text-blue-400 shrink-0" />
          <p className="text-sm text-slate-300">
            {t('keyboardShortcutsModal.iki_tuslu_kisayollar_icin_ilk_tusa')} <strong>{t('keyboardShortcutsModal.1_saniye_icinde')}</strong> {t('keyboardShortcutsModal.ikinci_tusa_bas')} <strong>{t('keyboardShortcutsModal.ctrl_k')}</strong> {t('keyboardShortcutsModal.input_icinde_bile_calisir')}
          </p>
        </div>

        <div className="space-y-5">
          {shortcutGroups.map((group) => (
            <div key={t(group.title)}>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                {t(group.title)}
              </h3>
              <div className="space-y-1">
                {group.shortcuts.map((shortcut, i) => {
                  const displayKeys = isMac && shortcut.altKeys ? shortcut.altKeys : shortcut.keys
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2.5 hover:bg-slate-800/50 rounded-lg transition"
                    >
                      <span className="text-sm text-slate-300">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {displayKeys.map((key, j) => (
                          <span key={j} className="flex items-center gap-1">
                            {j > 0 && !shortcut.altKeys && <span className="text-xs text-slate-500 mx-0.5">{t('keyboardShortcutsModal.sonra')}</span>}
                            {j > 0 && shortcut.altKeys && <span className="text-xs text-slate-500 mx-0.5">+</span>}
                            <kbd className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 bg-slate-800 border border-slate-700 rounded text-xs font-mono font-semibold text-slate-200 shadow-sm">
                              {key}
                            </kbd>
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-5 border-t border-slate-800 text-xs text-slate-500 text-center">
          {t('keyboardShortcutsModal.ipucu_input_icindeyken_kisayollar_calismaz_ctrl')}
        </div>
      </div>
    </Modal>
  )
}