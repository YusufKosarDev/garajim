import { useEffect } from 'react'

export const usePageTitle = (title) => {
  useEffect(() => {
    const previousTitle = document.title
    document.title = title ? `${title} — Garajım` : 'Garajım — Araç Takip Asistanı'

    return () => {
      document.title = previousTitle
    }
  }, [title])
}