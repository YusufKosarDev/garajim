import { useState, useEffect, useMemo } from 'react'
import { MapPin, Fuel, Wrench, CircleDot, Loader2, Navigation, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { usePageTitle } from '../hooks/usePageTitle'
import PageTransition from '../components/PageTransition'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function makeColoredIcon(color) {
  const html = '<div style="background-color:' + color + ';width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>'
  return L.divIcon({
    className: 'custom-marker',
    html: html,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  })
}

const userIcon = L.divIcon({
  className: 'user-marker',
  html: '<div style="background-color:#3b82f6;width:20px;height:20px;border-radius:50%;border:4px solid white;box-shadow:0 0 0 3px #3b82f6,0 4px 8px rgba(0,0,0,0.3);"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

const ICONS = {
  fuel: makeColoredIcon('#22c55e'),
  service: makeColoredIcon('#f97316'),
  tire: makeColoredIcon('#a855f7'),
}

const CATEGORIES = {
  fuel: {
    label: 'Yakıt İstasyonu',
    icon: Fuel,
    bgClass: 'bg-green-500/10 border-green-500/30',
    textClass: 'text-green-400',
  },
  service: {
    label: 'Oto Servis',
    icon: Wrench,
    bgClass: 'bg-orange-500/10 border-orange-500/30',
    textClass: 'text-orange-400',
  },
  tire: {
    label: 'Lastikçi',
    icon: CircleDot,
    bgClass: 'bg-purple-500/10 border-purple-500/30',
    textClass: 'text-purple-400',
  },
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

async function fetchNearbyPOIs(lat, lon, radiusKm) {
  const radius = Math.round(radiusKm * 1000)
  const query = '[out:json][timeout:25];(node["amenity"="fuel"](around:' + radius + ',' + lat + ',' + lon + ');node["shop"="car_repair"](around:' + radius + ',' + lat + ',' + lon + ');node["shop"="tyres"](around:' + radius + ',' + lat + ',' + lon + '););out body;'

  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'data=' + encodeURIComponent(query),
  })

  if (!response.ok) {
    throw new Error('Harita servisi cevap vermiyor')
  }

  const data = await response.json()

  return (data.elements || []).map(function (el) {
    let category = 'service'
    if (el.tags && el.tags.amenity === 'fuel') category = 'fuel'
    else if (el.tags && el.tags.shop === 'tyres') category = 'tire'

    return {
      id: el.id,
      lat: el.lat,
      lon: el.lon,
      name: (el.tags && (el.tags.name || el.tags.brand || el.tags.operator)) || 'İsim yok',
      category: category,
      address: (el.tags && (el.tags['addr:street'] || el.tags['addr:city'])) || '',
      phone: (el.tags && (el.tags.phone || el.tags['contact:phone'])) || '',
    }
  })
}

function MapRecenter(props) {
  const map = useMap()
  useEffect(function () {
    if (props.center) {
      map.setView(props.center, map.getZoom())
    }
  }, [props.center, map])
  return null
}

export default function SearchNearby() {
  usePageTitle('Yakındaki Servisler')

  const [userLocation, setUserLocation] = useState(null)
  const [pois, setPois] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [permission, setPermission] = useState('idle')
  const [radius, setRadius] = useState(5)
  const [selectedCategory, setSelectedCategory] = useState('all')

  const requestLocation = function () {
    if (!navigator.geolocation) {
      setError('Tarayıcın konum servisini desteklemiyor')
      setPermission('denied')
      return
    }

    setPermission('requesting')
    setError('')

    navigator.geolocation.getCurrentPosition(
      function (position) {
        const loc = [position.coords.latitude, position.coords.longitude]
        setUserLocation(loc)
        setPermission('granted')
      },
      function (err) {
        console.error('Location error:', err)
        setPermission('denied')
        if (err.code === err.PERMISSION_DENIED) {
          setError('Konum izni reddedildi.')
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setError('Konum belirlenemedi.')
        } else {
          setError('Konum alınamadı: ' + err.message)
        }
      },
      { timeout: 10000, enableHighAccuracy: false }
    )
  }

  useEffect(function () {
    if (!userLocation) return

    async function loadPOIs() {
      setLoading(true)
      setError('')
      try {
        const data = await fetchNearbyPOIs(userLocation[0], userLocation[1], radius)
        setPois(data)
      } catch (err) {
        console.error('POI fetch error:', err)
        setError(err.message || 'Veri alınamadı')
      } finally {
        setLoading(false)
      }
    }

    loadPOIs()
  }, [userLocation, radius])

  const sortedPois = useMemo(function () {
    if (!userLocation) return []

    return pois
      .map(function (poi) {
        return Object.assign({}, poi, {
          distance: getDistance(userLocation[0], userLocation[1], poi.lat, poi.lon),
        })
      })
      .filter(function (poi) {
        return selectedCategory === 'all' || poi.category === selectedCategory
      })
      .sort(function (a, b) {
        return a.distance - b.distance
      })
  }, [pois, userLocation, selectedCategory])

  const categoryCounts = useMemo(function () {
    const counts = { all: pois.length, fuel: 0, service: 0, tire: 0 }
    for (let i = 0; i < pois.length; i++) {
      const poi = pois[i]
      counts[poi.category] = (counts[poi.category] || 0) + 1
    }
    return counts
  }, [pois])

  if (permission === 'idle') {
    return (
      <PageTransition>
        <div className="p-6 max-w-2xl mx-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/20 rounded-2xl mb-4">
              <MapPin className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Yakındaki Servisler</h1>
            <p className="text-slate-400 mb-6">
              Bulunduğun konuma yakın yakıt istasyonları, oto servisler ve lastikçileri haritada gör.
            </p>
            <div className="bg-slate-800/50 rounded-lg p-4 mb-6 text-left">
              <p className="text-xs text-slate-300 mb-2 font-semibold">Konum kullanılır:</p>
              <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                <li>Konum bilgin sadece tarayıcında çalışır</li>
                <li>Sunucumuza gönderilmez</li>
                <li>OpenStreetMap'ten yakın servisleri buluruz</li>
              </ul>
            </div>
            <button
              onClick={requestLocation}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition shadow-lg shadow-blue-600/30 flex items-center gap-2 mx-auto"
            >
              <Navigation className="w-5 h-5" />
              Konumumu Kullan
            </button>
          </div>
        </div>
      </PageTransition>
    )
  }

  if (permission === 'denied') {
    return (
      <PageTransition>
        <div className="p-6 max-w-2xl mx-auto">
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600/20 rounded-2xl mb-4">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Konum İzni Gerekli</h1>
            <p className="text-slate-400 mb-6">{error}</p>
            <button
              onClick={requestLocation}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-5 h-5" />
              Tekrar Dene
            </button>
          </div>
        </div>
      </PageTransition>
    )
  }

  const headerSubtitle = permission === 'requesting' ? 'Konum alınıyor...' : (radius + ' km içindeki ' + pois.length + ' sonuç')

  return (
    <PageTransition>
      <div className="p-4 md:p-6">
        <div className="mb-4">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <MapPin className="w-6 h-6 text-blue-400" />
            Yakındaki Servisler
          </h1>
          <p className="text-slate-400 text-sm mt-1">{headerSubtitle}</p>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={function () { setSelectedCategory('all') }}
            className={selectedCategory === 'all' ? 'px-3 py-1.5 rounded-lg text-xs font-semibold transition bg-blue-600 text-white' : 'px-3 py-1.5 rounded-lg text-xs font-semibold transition bg-slate-800 text-slate-300 hover:bg-slate-700'}
          >
            Tümü ({categoryCounts.all})
          </button>

          {Object.keys(CATEGORIES).map(function (key) {
            const meta = CATEGORIES[key]
            const Icon = meta.icon
            const isActive = selectedCategory === key
            const btnClass = isActive
              ? 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border ' + meta.bgClass + ' ' + meta.textClass
              : 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition bg-slate-800 text-slate-300 hover:bg-slate-700'

            return (
              <button
                key={key}
                onClick={function () { setSelectedCategory(key) }}
                className={btnClass}
              >
                <Icon className="w-3.5 h-3.5" />
                {meta.label} ({categoryCounts[key] || 0})
              </button>
            )
          })}

          <div className="ml-auto flex items-center gap-2">
            <label className="text-xs text-slate-400">Yarıçap:</label>
            <select
              value={radius}
              onChange={function (e) { setRadius(Number(e.target.value)) }}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value={2}>2 km</option>
              <option value={5}>5 km</option>
              <option value={10}>10 km</option>
              <option value={20}>20 km</option>
            </select>
            <button
              onClick={requestLocation}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
              title="Konumu yenile"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-300" />
            </button>
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
            <p className="text-sm text-slate-300">Yakındaki servisler aranıyor...</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2 space-y-2 max-h-[60vh] lg:max-h-[600px] overflow-y-auto pr-1">
            {sortedPois.length === 0 && !loading && (
              <div className="text-center py-8 text-slate-500 text-sm">
                Bu yarıçapta sonuç bulunamadı. Yarıçapı arttırmayı dene.
              </div>
            )}

            {sortedPois.map(function (poi) {
              const meta = CATEGORIES[poi.category]
              const Icon = meta.icon
              const directionsUrl = 'https://www.google.com/maps/dir/?api=1&destination=' + poi.lat + ',' + poi.lon
              const cardClass = 'p-3 rounded-lg border ' + meta.bgClass + ' hover:opacity-90 transition'
              const iconBoxClass = 'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border ' + meta.bgClass + ' ' + meta.textClass
              const labelClass = 'text-xs ' + meta.textClass + ' mb-1'
              const distanceText = meta.label + ' · ' + poi.distance.toFixed(1) + ' km'

              return (
                <div key={poi.id} className={cardClass}>
                  <div className="flex items-start gap-3">
                    <div className={iconBoxClass}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm text-white truncate mb-0.5">
                        {poi.name}
                      </div>
                      <div className={labelClass}>{distanceText}</div>
                      {poi.address && (
                        <div className="text-xs text-slate-400 truncate">{poi.address}</div>
                      )}
                      {poi.phone && (
                        <div className="text-xs text-slate-400">{poi.phone}</div>
                      )}
                      <a
                        href={directionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-2 transition"
                      >
                        <Navigation className="w-3 h-3" />
                        Yol Tarifi Al
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div
            className="lg:col-span-3 rounded-xl overflow-hidden border border-slate-800"
            style={{ height: '60vh', minHeight: '400px', maxHeight: '600px' }}
          >
            {userLocation && (
              <MapContainer
                center={userLocation}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='© OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapRecenter center={userLocation} />

                <Marker position={userLocation} icon={userIcon}>
                  <Popup>Buradasın</Popup>
                </Marker>

                {sortedPois.map(function (poi) {
                  const meta = CATEGORIES[poi.category]
                  const directionsUrl = 'https://www.google.com/maps/dir/?api=1&destination=' + poi.lat + ',' + poi.lon
                  const popupTitleStyle = { fontWeight: 'bold', marginBottom: '4px' }
                  const popupMetaStyle = { fontSize: '11px', color: '#666', marginBottom: '6px' }
                  const popupAddrStyle = { fontSize: '11px', marginBottom: '6px' }
                  const popupLinkStyle = { fontSize: '11px', color: '#3b82f6', textDecoration: 'underline' }
                  const popupContainerStyle = { minWidth: '180px' }
                  const popupMetaText = meta.label + ' · ' + poi.distance.toFixed(1) + ' km'

                  return (
                    <Marker
                      key={poi.id}
                      position={[poi.lat, poi.lon]}
                      icon={ICONS[poi.category]}
                    >
                      <Popup>
                        <div style={popupContainerStyle}>
                          <div style={popupTitleStyle}>{poi.name}</div>
                          <div style={popupMetaStyle}>{popupMetaText}</div>
                          {poi.address && (
                            <div style={popupAddrStyle}>{poi.address}</div>
                          )}
                          <a
                            href={directionsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={popupLinkStyle}
                          >
                            Yol Tarifi Al
                          </a>
                        </div>
                      </Popup>
                    </Marker>
                  )
                })}
              </MapContainer>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  )
}