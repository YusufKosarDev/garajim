import { AlertTriangle } from 'lucide-react'
import Modal from './Modal'

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Onayla',
  cancelText = 'İptal',
  variant = 'danger', // 'danger' | 'warning'
}) {
  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  const variantConfig = {
    danger: {
      iconBg: 'bg-red-500/20',
      iconColor: 'text-red-400',
      buttonBg: 'bg-red-600 hover:bg-red-700',
    },
    warning: {
      iconBg: 'bg-yellow-500/20',
      iconColor: 'text-yellow-400',
      buttonBg: 'bg-yellow-600 hover:bg-yellow-700',
    },
  }

  const config = variantConfig[variant] || variantConfig.danger

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="p-5">
        <div className="flex items-start gap-4 mb-5">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${config.iconBg}`}>
            <AlertTriangle className={`w-6 h-6 ${config.iconColor}`} />
          </div>
          <div className="flex-1 pt-1">
            <h3 className="text-lg font-bold mb-2">{title}</h3>
            {message && <p className="text-sm text-slate-400 leading-relaxed">{message}</p>}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-800 hover:bg-slate-700 py-2.5 rounded-lg transition font-semibold"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 py-2.5 rounded-lg transition font-semibold text-white ${config.buttonBg}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  )
}