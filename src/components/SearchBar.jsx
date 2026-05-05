import { Search, X } from 'lucide-react'

export default function SearchBar({ value, onChange, placeholder = 'Ara...' }) {
  return (
    <div className="relative flex-1 min-w-[200px]">
      <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-9 py-2 text-sm focus:outline-none focus:border-blue-500 transition"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition"
          title="Temizle"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}