import { useId } from 'react'

/**
 * Ortak form alanı: label + input + hata mesajı.
 *
 * Önceden bu üçlü 5 formda elle tekrarlanıyordu (aynı input className bloğu
 * 23 kez, aynı label sınıfı 24 kez). FuelForm içinde dosya-lokal bir `Field`
 * bileşeni zaten vardı; buraya taşındı ve etiket stili diğer formlarla
 * eşitlenebilsin diye `labelStyle` ile varyantlandı.
 */
export default function FormField({
  label,
  error,
  hint,
  required = false,
  labelStyle = 'uppercase', // 'uppercase' (4 form) | 'plain' (FuelForm)
  as = 'input',
  children,
  ...props
}) {
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
  const alanProps = {
    id,
    className: controlClass,
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': error ? errorId : undefined,
  }

  const Control = as
  const control = typeof children === 'function'
    ? children(alanProps)
    : (children ?? <Control {...alanProps} {...props} />)

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
