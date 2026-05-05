import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import NotificationButton from './NotificationButton'

export default function MobileTopBar({ onOpenCommandPalette }) {
  return (
    <div className="md:hidden sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          <img
            src="/logo.svg"
            alt="Garajım"
            className="w-7 h-7 group-hover:scale-105 transition-transform"
          />
          <div className="text-base font-bold text-white leading-none">Garajım</div>
        </Link>

        {/* Sağ taraf: Arama + Bildirim */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenCommandPalette}
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white transition border border-slate-700"
            title="Ara"
            aria-label="Ara"
          >
            <Search className="w-4 h-4" />
          </button>

          <NotificationButton />
        </div>
      </div>
    </div>
  )
}