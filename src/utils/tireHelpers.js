// Pozisyon etiketleri
export const TIRE_POSITIONS = [
  { code: 'FL', label: 'Ön Sol', short: 'Ö-S' },
  { code: 'FR', label: 'Ön Sağ', short: 'Ö-Sa' },
  { code: 'RL', label: 'Arka Sol', short: 'A-S' },
  { code: 'RR', label: 'Arka Sağ', short: 'A-Sa' },
  { code: 'S', label: 'Stepney', short: 'Stp' },
]

// Sezon bilgileri
export const SEASONS = {
  summer: { label: 'Yazlık', icon: '☀️', color: 'yellow' },
  winter: { label: 'Kışlık', icon: '❄️', color: 'cyan' },
  'all-season': { label: '4 Mevsim', icon: '🌤️', color: 'purple' },
}

// DOT kodundan lastik yaşını hesapla
// DOT format: "HHWW" — 2 hafta + 2 yıl (örn "3523" = 35. hafta 2023)
export const calculateTireAge = (dotCode) => {
  if (!dotCode || dotCode.length !== 4) return null
  const week = parseInt(dotCode.substring(0, 2), 10)
  const yearShort = parseInt(dotCode.substring(2, 4), 10)

  if (isNaN(week) || isNaN(yearShort) || week < 1 || week > 53) return null

  // 2 haneli yıl → 4 haneli (00-30 arası 2000, 31-99 arası 1900)
  const year = yearShort <= 30 ? 2000 + yearShort : 1900 + yearShort
  const manufactureDate = new Date(year, 0, 1 + (week - 1) * 7)

  const now = new Date()
  const ageMs = now - manufactureDate
  const ageYears = ageMs / (1000 * 60 * 60 * 24 * 365.25)

  return {
    year,
    week,
    manufactureDate,
    ageYears: Math.round(ageYears * 10) / 10,
  }
}

// Lastik durumunu değerlendir
export const evaluateTire = (tire) => {
  const warnings = []

  // Diş derinliği
  const depth = Number(tire.treadDepth) || 0
  if (depth > 0) {
    if (depth < 1.6) {
      warnings.push({ level: 'critical', message: `Minimum yasal sınırın altında (${depth}mm)` })
    } else if (depth < 3) {
      warnings.push({ level: 'danger', message: `Kış için yetersiz (${depth}mm)` })
    } else if (depth < 4) {
      warnings.push({ level: 'warning', message: `Yakında değişmeli (${depth}mm)` })
    }
  }

  // Yaş
  const ageInfo = calculateTireAge(tire.dot)
  if (ageInfo) {
    if (ageInfo.ageYears >= 10) {
      warnings.push({ level: 'critical', message: `${ageInfo.ageYears} yaşında — değişmeli` })
    } else if (ageInfo.ageYears >= 6) {
      warnings.push({ level: 'warning', message: `${ageInfo.ageYears} yaşında — kontrol et` })
    }
  }

  const hasCritical = warnings.some(w => w.level === 'critical')
  const hasDanger = warnings.some(w => w.level === 'danger')
  const hasWarning = warnings.some(w => w.level === 'warning')

  return {
    status: hasCritical ? 'critical' : hasDanger ? 'danger' : hasWarning ? 'warning' : 'ok',
    warnings,
    age: ageInfo,
  }
}

// Set genelinde en kötü lastik durumu
export const evaluateTireSet = (tireSet) => {
  if (!tireSet || !tireSet.tires) return { status: 'ok', issueCount: 0 }

  const evaluations = tireSet.tires.map(evaluateTire)
  const criticalCount = evaluations.filter(e => e.status === 'critical').length
  const dangerCount = evaluations.filter(e => e.status === 'danger').length
  const warningCount = evaluations.filter(e => e.status === 'warning').length

  let status = 'ok'
  if (criticalCount > 0) status = 'critical'
  else if (dangerCount > 0) status = 'danger'
  else if (warningCount > 0) status = 'warning'

  return {
    status,
    issueCount: criticalCount + dangerCount + warningCount,
    criticalCount,
    dangerCount,
    warningCount,
  }
}

// Mevsim değişim uyarısı — Türkiye'deki tarihler
export const getSeasonChangeSuggestion = (currentSeason) => {
  const now = new Date()
  const month = now.getMonth() // 0-11
  const day = now.getDate()

  // 15 Ekim - 1 Aralık: Kışa geçiş dönemi
  if (month === 9 && day >= 15) {
    if (currentSeason === 'summer') {
      return {
        type: 'recommend',
        target: 'winter',
        message: 'Kış yaklaşıyor — kış lastiklerini hazırla',
        urgent: false,
      }
    }
  }

  // 1 Kasım - 15 Aralık: Kış lastiği önerilen dönem
  if ((month === 10) || (month === 11 && day <= 15)) {
    if (currentSeason === 'summer') {
      return {
        type: 'warning',
        target: 'winter',
        message: 'Kış lastiği takılmalı — zaman daralıyor',
        urgent: true,
      }
    }
  }

  // 15 Mart - 1 Mayıs: Yaza geçiş dönemi
  if (month === 2 && day >= 15) {
    if (currentSeason === 'winter') {
      return {
        type: 'recommend',
        target: 'summer',
        message: 'Havalar ısınıyor — yazlık lastik zamanı yaklaşıyor',
        urgent: false,
      }
    }
  }

  // 1 Nisan - 1 Mayıs: Yazlığa geç
  if ((month === 3) || (month === 4 && day <= 1)) {
    if (currentSeason === 'winter') {
      return {
        type: 'warning',
        target: 'summer',
        message: 'Yazlığa geçmek için ideal zaman',
        urgent: false,
      }
    }
  }

  return null
}

// Aktif seti bul — en son set değişimine göre
export const getActiveTireSet = (tireSets, tireChanges) => {
  if (!tireSets || tireSets.length === 0) return null

  // En son yapılan değişim
  const latestChange = [...tireChanges]
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0]

  if (latestChange) {
    // Son değişimden sonra hangi sete geçilmiş
    return tireSets.find(ts => ts.season === latestChange.toSeason) || tireSets[0]
  }

  // Hiç değişim yoksa ilk seti göster
  return tireSets[0]
}

// Set diş derinliği ortalaması
export const getAverageTreadDepth = (tireSet) => {
  if (!tireSet || !tireSet.tires) return null
  const depths = tireSet.tires
    .map(t => Number(t.treadDepth) || 0)
    .filter(d => d > 0)
  if (depths.length === 0) return null
  return depths.reduce((a, b) => a + b, 0) / depths.length
}