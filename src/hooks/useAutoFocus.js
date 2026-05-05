import { useEffect, useRef } from 'react'

/**
 * Modal veya herhangi bir koşullu render'da bir input'a otomatik focus verir.
 * Modal animasyonunun bitmesi için küçük bir gecikme ile çalışır.
 *
 * Kullanım:
 *   const inputRef = useAutoFocus(isOpen)
 *   <input ref={inputRef} ... />
 */
export const useAutoFocus = (shouldFocus, delay = 150) => {
  const ref = useRef(null)

  useEffect(() => {
    if (shouldFocus && ref.current) {
      const timer = setTimeout(() => {
        ref.current?.focus()
        // Eğer input'ta zaten değer varsa, imleci sona götür
        if (ref.current?.setSelectionRange && ref.current?.value) {
          const len = ref.current.value.length
          ref.current.setSelectionRange(len, len)
        }
      }, delay)
      return () => clearTimeout(timer)
    }
  }, [shouldFocus, delay])

  return ref
}