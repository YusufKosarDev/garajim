import { useId } from 'react'
import type { ReactNode } from 'react'

/**
 * Ortak form alanı: label + input + hata mesajı.
 *
 * Önceden bu üçlü 5 formda elle tekrarlanıyordu (aynı input className bloğu
 * 23 kez, aynı label sınıfı 24 kez). FuelForm içinde dosya-lokal bir `Field`
 * bileşeni zaten vardı; buraya taşındı ve etiket stili diğer formlarla
 * eşitlenebilsin diye `labelStyle` ile varyantlandı.
 */
/** Kontrole geçirilen ortak nitelikler — render-prop bunları alır */
export interface FieldControlProps {
  id: string
  className: string
  'aria-invalid'?: 'true'
  'aria-describedby'?: string
}

interface FormFieldProps {
  label?: ReactNode
  error?: ReactNode
  hint?: ReactNode
  required?: boolean
  /** 'uppercase' (4 form) | 'plain' (FuelForm) */
  labelStyle?: 'uppercase' | 'plain'
  /** Varsayılan kontrol elemanı; children verilmediğinde kullanılır */
  as?: 'input' | 'select' | 'textarea'
  /**
   * Düz JSX ya da render-prop. Render-prop biçimi, özel kontrollerin
   * (select, uploader) label bağlantısını ve aria niteliklerini almasını sağlar.
   */
  children?: ReactNode | ((fieldProps: FieldControlProps) => ReactNode)
  /** Varsayılan kontrole geçirilen diğer nitelikler (type, placeholder, ...) */
  [key: string]: unknown
}

export default function FormField({
  label,
  error,
  hint,
  required = false,
  labelStyle = 'uppercase', // 'uppercase' (4 form) | 'plain' (FuelForm)
  as = 'input',
  children,
  ...props
}: FormFieldProps) {
  const id = useId()
  const errorId = `${id}-hata`

  const labelClass = labelStyle === 'plain'
    ? 'block text-sm text-slate-300 mb-1'
    : 'block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1'

  const controlClass = `w-full bg-slate-800 border rounded-lg px-3 py-2 text-sm focus:outline-none transition ${
    error ? 'border-red-500' : 'border-slate-700 focus:border-blue-500'
  }`

  // Ortak alan özellikleri: özel kontroller (select, uploader) bunları
  // children render-prop'u üzerinden alır; böylece label bağlantısı ve
  // aria nitelikleri tek yerde kalır.
  const fieldProps: FieldControlProps = {
    id,
    className: controlClass,
    'aria-invalid': error ? ('true' as const) : undefined,
    'aria-describedby': error ? errorId : undefined,
  }

  const Control = as
  const control = typeof children === 'function'
    ? children(fieldProps)
    : (children ?? <Control {...fieldProps} {...props} />)

  return (
    <div>
      {label && (
        <label htmlFor={id} className={labelClass}>
          {label}{required && ' *'}
        </label>
      )}
      {control}
      {hint && !error && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
      {error && (
        <p id={errorId} className="text-xs text-red-400 mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
