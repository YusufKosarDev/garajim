import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

export default function Pagination({ currentPage, totalItems, itemsPerPage, onPageChange }) {
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  // Sayfa gerekmeyecek kadar az kayıt varsa render etme
  if (totalPages <= 1) return null

  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  // Gösterilecek sayfa numaralarını hesapla (akıllı gösterim)
  // Örn: [1, ..., 4, 5, 6, ..., 20] veya [1, 2, 3, 4, 5] gibi
  const getPageNumbers = () => {
    const pages = []
    const maxVisible = 5  // En fazla bu kadar sayfa numarası göster

    if (totalPages <= maxVisible + 2) {
      // Az sayfa var, hepsini göster
      for (let i = 1; i <= totalPages; i++) pages.push(i)
      return pages
    }

    // Çok sayfa var, "..." ile kısalt
    pages.push(1)

    let start = Math.max(2, currentPage - 1)
    let end = Math.min(totalPages - 1, currentPage + 1)

    // Kenar durumları
    if (currentPage <= 3) {
      start = 2
      end = 4
    } else if (currentPage >= totalPages - 2) {
      start = totalPages - 3
      end = totalPages - 1
    }

    if (start > 2) pages.push('...')
    for (let i = start; i <= end; i++) pages.push(i)
    if (end < totalPages - 1) pages.push('...')

    pages.push(totalPages)
    return pages
  }

  const goToPage = (page) => {
    if (page < 1 || page > totalPages || page === currentPage) return
    onPageChange(page)
  }

  const pageNumbers = getPageNumbers()

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 mt-4 pt-4 border-t border-slate-800">
      <div className="text-xs text-slate-400">
        <span className="font-semibold text-slate-300">{startItem}-{endItem}</span> / toplam{' '}
        <span className="font-semibold text-slate-300">{totalItems}</span> kayıt
      </div>

      <div className="flex items-center gap-1">
        {/* İlk sayfa */}
        <button
          onClick={() => goToPage(1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          title="İlk sayfa"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Önceki sayfa */}
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          title="Önceki sayfa"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Sayfa numaraları */}
        <div className="flex items-center gap-0.5 mx-1">
          {pageNumbers.map((page, i) => {
            if (page === '...') {
              return (
                <span key={`dots-${i}`} className="px-2 text-slate-500 text-sm">
                  ...
                </span>
              )
            }

            const isActive = page === currentPage
            return (
              <button
                key={page}
                onClick={() => goToPage(page)}
                className={`min-w-[32px] h-8 rounded-lg text-sm font-semibold transition ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {page}
              </button>
            )
          })}
        </div>

        {/* Sonraki sayfa */}
        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          title="Sonraki sayfa"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Son sayfa */}
        <button
          onClick={() => goToPage(totalPages)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          title="Son sayfa"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}