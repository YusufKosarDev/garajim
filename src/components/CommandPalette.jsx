import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Car, Wrench, Droplet, LayoutDashboard, Calendar, BarChart3, Settings, Plus, Download, FileDown, Clock, ArrowRight, Command, X } from 'lucide-react'
import { useVehicles } from '../context/VehicleContext'
import { multiFieldSearch } from '../utils/fuzzySearch'
import { formatDateShort } from '../utils/dateHelpers'

const RECENT_SEARCHES_KEY = 'garajim_recent_searches'
const MAX_RECENT = 5

export default function CommandPalette({ isOpen, onClose, onNewVehicle, onNewMaintenance, onNewFuel }) {
  const navigate = useNavigate()
  const { vehicles, maintenanceRecords, fuelRecords } = useVehicles()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [recentSearches, setRecentSearches] = useState([])
  const inputRef = useRef(null)
  const listRef = useRef(null)

  // Son aramaları yükle
  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
      if (stored) {
        try {
          setRecentSearches(JSON.parse(stored))
        } catch {
          setRecentSearches([])
        }
      }
      // Açılınca focus + sıfırla
      setTimeout(() => inputRef.current?.focus(), 100)
      setQuery('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Sayfa linkleri
  const pages = useMemo(() => [
    { id: 'page-dashboard', type: 'page', icon: LayoutDashboard, title: 'Dashboard', subtitle: 'Ana sayfa', action: () => navigate('/'), keywords: 'dashboard anasayfa ana' },
    { id: 'page-vehicles', type: 'page', icon: Car, title: 'Araçlarım', subtitle: 'Araç listesi', action: () => navigate('/vehicles'), keywords: 'araç araclar liste' },
    { id: 'page-calendar', type: 'page', icon: Calendar, title: 'Takvim', subtitle: 'Tüm tarihler ve olaylar', action: () => navigate('/calendar'), keywords: 'takvim tarih olay' },
    { id: 'page-stats', type: 'page', icon: BarChart3, title: 'İstatistikler', subtitle: 'Grafikler ve analiz', action: () => navigate('/statistics'), keywords: 'istatistik grafik analiz rapor' },
    { id: 'page-settings', type: 'page', icon: Settings, title: 'Ayarlar', subtitle: 'Uygulama ayarları', action: () => navigate('/settings'), keywords: 'ayar settings tercih' },
  ], [navigate])

  // Eylemler
  const actions = useMemo(() => [
    { id: 'action-new-vehicle', type: 'action', icon: Plus, title: 'Yeni Araç Ekle', subtitle: 'Araç kaydı oluştur', action: () => { onNewVehicle?.(); navigate('/vehicles') }, keywords: 'yeni araç ekle ekleme' },
    { id: 'action-new-maintenance', type: 'action', icon: Wrench, title: 'Yeni Bakım Ekle', subtitle: 'Bakım kaydı oluştur', action: () => onNewMaintenance?.(), keywords: 'yeni bakım ekle' },
    { id: 'action-new-fuel', type: 'action', icon: Droplet, title: 'Yeni Yakıt Ekle', subtitle: 'Yakıt kaydı oluştur', action: () => onNewFuel?.(), keywords: 'yeni yakıt ekle depo' },
    { id: 'action-backup', type: 'action', icon: Download, title: 'Verileri İndir', subtitle: 'Yedek dosyası oluştur', action: () => navigate('/settings'), keywords: 'yedek indir backup export' },
  ], [navigate, onNewVehicle, onNewMaintenance, onNewFuel])

  // Aranabilir araçlar
  const vehicleItems = useMemo(() =>
    vehicles.map(v => ({
      id: `vehicle-${v.id}`,
      type: 'vehicle',
      icon: Car,
      title: `${v.brand} ${v.model}`,
      subtitle: `${v.plate} • ${v.year} • ${v.fuelType}`,
      action: () => navigate(`/vehicles/${v.id}`),
      data: v,
      keywords: `${v.plate} ${v.brand} ${v.model} ${v.year} ${v.fuelType}`,
    })),
    [vehicles, navigate]
  )

  // Aranabilir bakım kayıtları (son 50)
  const maintenanceItems = useMemo(() => {
    const sorted = [...maintenanceRecords]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 50)

    return sorted.map(r => {
      const vehicle = vehicles.find(v => v.id === r.vehicleId)
      if (!vehicle) return null
      return {
        id: `maintenance-${r.id}`,
        type: 'maintenance',
        icon: Wrench,
        title: r.type,
        subtitle: `${vehicle.brand} ${vehicle.model} • ${formatDateShort(r.date)} • ${Number(r.km).toLocaleString('tr-TR')} km`,
        action: () => navigate(`/vehicles/${vehicle.id}`),
        data: r,
        keywords: `${r.type} ${vehicle.brand} ${vehicle.model} ${vehicle.plate} ${r.notes || ''} bakım`,
      }
    }).filter(Boolean)
  }, [maintenanceRecords, vehicles, navigate])

  // Aranabilir yakıt kayıtları (son 50)
  const fuelItems = useMemo(() => {
    const sorted = [...fuelRecords]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 50)

    return sorted.map(r => {
      const vehicle = vehicles.find(v => v.id === r.vehicleId)
      if (!vehicle) return null
      return {
        id: `fuel-${r.id}`,
        type: 'fuel',
        icon: Droplet,
        title: `${r.liters} L yakıt${r.station ? ` — ${r.station}` : ''}`,
        subtitle: `${vehicle.brand} ${vehicle.model} • ${formatDateShort(r.date)} • ${r.totalCost.toLocaleString('tr-TR')} ₺`,
        action: () => navigate(`/vehicles/${vehicle.id}`),
        data: r,
        keywords: `${vehicle.brand} ${vehicle.model} ${vehicle.plate} ${r.station || ''} yakıt benzin`,
      }
    }).filter(Boolean)
  }, [fuelRecords, vehicles, navigate])

  // Tüm aranabilir öğeler
  const allItems = useMemo(() => [
    ...pages,
    ...actions,
    ...vehicleItems,
    ...maintenanceItems,
    ...fuelItems,
  ], [pages, actions, vehicleItems, maintenanceItems, fuelItems])

  // Filtreleme ve skor bazlı sıralama
  const filteredItems = useMemo(() => {
    if (!query.trim()) {
      // Query yoksa: recent + default items
      const recentItems = recentSearches
        .map(id => allItems.find(item => item.id === id))
        .filter(Boolean)
      const defaultItems = [...pages, ...actions.slice(0, 3)]

      // Recent'ta olmayanları ekle
      const uniqueDefaults = defaultItems.filter(
        item => !recentItems.find(r => r.id === item.id)
      )

      return [
        ...recentItems.map(item => ({ ...item, section: 'recent' })),
        ...uniqueDefaults.map(item => ({ ...item, section: 'default' })),
      ]
    }

    const results = allItems
      .map(item => {
        const searchFields = ['title', 'subtitle', 'keywords']
        const result = multiFieldSearch(item, query, searchFields)
        return { ...item, _score: result.score, _match: result.match }
      })
      .filter(item => item._match)
      .sort((a, b) => b._score - a._score)
      .slice(0, 20)

    return results
  }, [query, allItems, recentSearches, pages, actions])

  // Gruplara böl (sadece query varsa kategori başlığı göster)
  const groupedItems = useMemo(() => {
    if (!query.trim()) {
      const recents = filteredItems.filter(i => i.section === 'recent')
      const defaults = filteredItems.filter(i => i.section === 'default')
      return [
        ...(recents.length > 0 ? [{ label: 'Son Aramalar', items: recents }] : []),
        { label: 'Hızlı Erişim', items: defaults },
      ]
    }

    const groups = {
      page: { label: 'Sayfalar', items: [] },
      action: { label: 'Eylemler', items: [] },
      vehicle: { label: 'Araçlar', items: [] },
      maintenance: { label: 'Bakım Kayıtları', items: [] },
      fuel: { label: 'Yakıt Kayıtları', items: [] },
    }
    filteredItems.forEach(item => {
      if (groups[item.type]) {
        groups[item.type].items.push(item)
      }
    })
    return Object.values(groups).filter(g => g.items.length > 0)
  }, [filteredItems, query])

  // Düz sıra (keyboard navigasyonu için)
  const flatItems = useMemo(() =>
    groupedItems.flatMap(g => g.items),
    [groupedItems]
  )

  // Query değişince seçimi sıfırla
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Seçili öğe değişince scroll into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`)
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [selectedIndex])

  // Son aramaya ekle
  const addToRecent = (itemId) => {
    const updated = [itemId, ...recentSearches.filter(id => id !== itemId)].slice(0, MAX_RECENT)
    setRecentSearches(updated)
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
  }

  // Öğeyi seç ve eylem tetikle
  const handleSelect = (item) => {
    if (!item) return
    addToRecent(item.id)
    item.action()
    onClose()
  }

  // Klavye navigasyonu
  useEffect(() => {
    if (!isOpen) return

    const handleKey = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(i => Math.min(flatItems.length - 1, i + 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(i => Math.max(0, i - 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        handleSelect(flatItems[selectedIndex])
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, flatItems, selectedIndex])

  // Tür başına renk ve emoji
  const typeConfig = {
    page: { color: 'text-blue-400', label: 'Sayfa' },
    action: { color: 'text-green-400', label: 'Eylem' },
    vehicle: { color: 'text-purple-400', label: 'Araç' },
    maintenance: { color: 'text-orange-400', label: 'Bakım' },
    fuel: { color: 'text-cyan-400', label: 'Yakıt' },
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[10vh] px-4 z-[100]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Arama kutusu */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Araç, bakım, sayfa veya eylem ara..."
                className="flex-1 bg-transparent outline-none text-white placeholder-slate-500 text-base"
                autoComplete="off"
              />
              <div className="hidden sm:flex items-center gap-1 text-[10px] text-slate-500">
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono">ESC</kbd>
                <span>kapat</span>
              </div>
            </div>

            {/* Sonuç listesi */}
            <div ref={listRef} className="max-h-[60vh] overflow-y-auto">
              {flatItems.length === 0 ? (
                <div className="py-12 text-center">
                  <Search className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm text-slate-400">
                    <strong className="text-slate-300">"{query}"</strong> için sonuç bulunamadı
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Başka bir kelimeyle dene
                  </p>
                </div>
              ) : (
                <div className="py-2">
                  {groupedItems.map((group, gIdx) => {
                    // Grup içindeki her itemin global index'ini bul
                    let globalIndex = 0
                    for (let i = 0; i < gIdx; i++) {
                      globalIndex += groupedItems[i].items.length
                    }

                    return (
                      <div key={group.label}>
                        <div className="px-4 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                          {group.label === 'Son Aramalar' && <Clock className="w-3 h-3" />}
                          {group.label}
                        </div>
                        {group.items.map((item, iIdx) => {
                          const index = globalIndex + iIdx
                          const isSelected = index === selectedIndex
                          const Icon = item.icon
                          const config = typeConfig[item.type] || typeConfig.page

                          return (
                            <button
                              key={item.id}
                              data-index={index}
                              onClick={() => handleSelect(item)}
                              onMouseEnter={() => setSelectedIndex(index)}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${
                                isSelected ? 'bg-blue-600/20' : 'hover:bg-slate-800/50'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-lg bg-slate-800/50 flex items-center justify-center shrink-0 ${config.color}`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold truncate">{item.title}</div>
                                {item.subtitle && (
                                  <div className="text-xs text-slate-400 truncate">{item.subtitle}</div>
                                )}
                              </div>
                              {isSelected && (
                                <ArrowRight className="w-4 h-4 text-blue-400 shrink-0" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Alt çubuk */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/50 border-t border-slate-800 text-[10px] text-slate-500">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono">↑↓</kbd>
                  gezin
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono">↵</kbd>
                  seç
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Command className="w-3 h-3" />
                <span>Garajım Arama</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}