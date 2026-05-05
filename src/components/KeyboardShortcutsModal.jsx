import { Keyboard } from 'lucide-react'
import Modal from './Modal'

const shortcutGroups = [
  {
    title: 'Arama',
    shortcuts: [
      { keys: ['Ctrl', 'K'], altKeys: ['⌘', 'K'], description: 'Global arama (her şey)' },
      { keys: ['/'], description: 'Sayfa araması' },
    ],
  },
  {
    title: 'Navigasyon',
    shortcuts: [
      { keys: ['G', 'D'], description: 'Dashboard' },
      { keys: ['G', 'V'], description: 'Araçlarım' },
      { keys: ['G', 'C'], description: 'Takvim' },
      { keys: ['G', 'S'], description: 'İstatistikler' },
      { keys: ['G', ','], description: 'Ayarlar' },
    ],
  },
  {
    title: 'Hızlı Ekleme',
    shortcuts: [
      { keys: ['N', 'V'], description: 'Yeni araç' },
      { keys: ['N', 'M'], description: 'Yeni bakım (araç detayında)' },
      { keys: ['N', 'F'], description: 'Yeni yakıt (araç detayında)' },
    ],
  },
  {
    title: 'Genel',
    shortcuts: [
      { keys: ['?'], description: 'Bu kısayol rehberini aç' },
      { keys: ['Esc'], description: 'Modal / dialog kapat' },
      { keys: ['Tab'], description: 'Sonraki alana geç (modal içinde döner)' },
    ],
  },
]

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  // Mac tespiti
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Klavye Kısayolları" maxWidth="max-w-2xl">
      <div className="p-5">
        <div className="flex items-center gap-3 mb-5 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <Keyboard className="w-5 h-5 text-blue-400 shrink-0" />
          <p className="text-sm text-slate-300">
            İki tuşlu kısayollar için ilk tuşa bas, sonra <strong>1 saniye içinde</strong> ikinci tuşa bas. <strong>Ctrl+K</strong> input içinde bile çalışır.
          </p>
        </div>

        <div className="space-y-5">
          {shortcutGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                {group.title}
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
                            {j > 0 && !shortcut.altKeys && <span className="text-xs text-slate-500 mx-0.5">sonra</span>}
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
          💡 İpucu: Input içindeyken kısayollar çalışmaz (Ctrl+K hariç), rahat yaz.
        </div>
      </div>
    </Modal>
  )
}