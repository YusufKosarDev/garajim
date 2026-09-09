import { useTranslation } from 'react-i18next'
import { ArrowUpDown } from 'lucide-react'

export interface SortOption {
  value: string
  /** i18n anahtarı (bkz. aşağıdaki not) */
  label: string
}

interface SortDropdownProps {
  value: string
  onChange: (value: string) => void
  options: SortOption[]
}

export default function SortDropdown({ value, onChange, options }: SortDropdownProps) {
  // `opt.label` bir i18n anahtarı. Sözlükte olmayan bir değer gelirse i18next
  // metnin kendisini döndürür, yani düz metin geçen çağrılar da bozulmaz.
  const { t } = useTranslation()

  return (
    <div className="relative">
      <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-8 py-2 text-sm focus:outline-none focus:border-blue-500 transition cursor-pointer appearance-none"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{t(opt.label)}</option>
        ))}
      </select>
    </div>
  )
}