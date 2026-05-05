import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatDate } from './dateHelpers'
import { getTotalFuelCost, getAverageConsumption } from './fuelHelpers'

// Roboto fontlarını base64 olarak import et (Vite ?url özelliği)
import RobotoRegular from '../fonts/Roboto-Regular.ttf?url'
import RobotoBold from '../fonts/Roboto-Bold.ttf?url'

// Font dosyasını fetch edip base64'e çevir
const loadFont = async (fontUrl) => {
  const response = await fetch(fontUrl)
  const buffer = await response.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// Font yükleme cache'i (her PDF için tekrar tekrar yükleme yapmasın)
let fontCache = null

const ensureFontsLoaded = async () => {
  if (fontCache) return fontCache

  const [regular, bold] = await Promise.all([
    loadFont(RobotoRegular),
    loadFont(RobotoBold),
  ])

  fontCache = { regular, bold }
  return fontCache
}

// PDF'e Türkçe destekli fontları ekle
const setupFonts = (doc, fonts) => {
  // Regular
  doc.addFileToVFS('Roboto-Regular.ttf', fonts.regular)
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')

  // Bold
  doc.addFileToVFS('Roboto-Bold.ttf', fonts.bold)
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold')

  // Default font olarak Roboto'yu set et
  doc.setFont('Roboto', 'normal')
}

export const generateVehicleReport = async (vehicle, maintenanceRecords, fuelRecords = []) => {
  // Fontları yükle
  const fonts = await ensureFontsLoaded()

  const doc = new jsPDF()
  setupFonts(doc, fonts)

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15

  // Başlık
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(30, 41, 59)
  doc.text('GARAJIM', margin, 20)

  doc.setFont('Roboto', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139)
  doc.text('Araç Takip Asistanı', margin, 26)

  // Sağ üst köşede tarih
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  const reportDate = formatDate(new Date().toISOString())
  doc.text(`Rapor Tarihi: ${reportDate}`, pageWidth - margin, 20, { align: 'right' })

  // Çizgi
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.5)
  doc.line(margin, 32, pageWidth - margin, 32)

  // Araç bilgisi başlığı
  doc.setFont('Roboto', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(30, 41, 59)
  doc.text(`${vehicle.brand} ${vehicle.model}`, margin, 42)

  doc.setFont('Roboto', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(71, 85, 105)
  doc.text(`${vehicle.plate} • ${vehicle.year} • ${vehicle.fuelType}`, margin, 49)

  // Araç detay tablosu
  const vehicleInfo = [
    ['Plaka', vehicle.plate || '-'],
    ['Marka / Model', `${vehicle.brand} ${vehicle.model}`],
    ['Yıl', String(vehicle.year || '-')],
    ['Yakıt Tipi', vehicle.fuelType || '-'],
    ['Güncel KM', vehicle.currentKm ? `${Number(vehicle.currentKm).toLocaleString('tr-TR')} km` : '-'],
    ['Muayene Tarihi', formatDate(vehicle.inspectionDate)],
    ['MTV Tarihi', formatDate(vehicle.mtvDate)],
    ['Trafik Sigortası', formatDate(vehicle.insuranceDate)],
    ['Kasko Tarihi', formatDate(vehicle.kaskoDate)],
  ]

  autoTable(doc, {
    startY: 55,
    head: [['Bilgi', 'Değer']],
    body: vehicleInfo,
    theme: 'striped',
    styles: {
      font: 'Roboto',
      fontSize: 10,
      cellPadding: 3,
    },
    headStyles: {
      font: 'Roboto',
      fontStyle: 'bold',
      fillColor: [59, 130, 246],
      textColor: 255,
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: margin, right: margin },
  })

  let currentY = doc.lastAutoTable.finalY + 10

  // ============= ÖZET =============
  const totalMaintenanceCost = maintenanceRecords.reduce((sum, r) => sum + (r.cost || 0), 0)
  const totalFuelCost = getTotalFuelCost(fuelRecords)
  const totalCost = totalMaintenanceCost + totalFuelCost
  const avgConsumption = getAverageConsumption(fuelRecords)

  doc.setFont('Roboto', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(30, 41, 59)
  doc.text('ÖZET', margin, currentY)

  currentY += 6

  const summaryData = [
    ['Toplam Bakım Kaydı', `${maintenanceRecords.length} adet`],
    ['Toplam Yakıt Kaydı', `${fuelRecords.length} adet`],
    ['Toplam Bakım Harcaması', `${totalMaintenanceCost.toLocaleString('tr-TR')} ₺`],
    ['Toplam Yakıt Harcaması', `${totalFuelCost.toLocaleString('tr-TR')} ₺`],
    ['GENEL TOPLAM', `${totalCost.toLocaleString('tr-TR')} ₺`],
  ]

  if (avgConsumption) {
    summaryData.splice(4, 0, ['Ortalama Tüketim', `${avgConsumption.toFixed(1)} L/100km`])
  }

  autoTable(doc, {
    startY: currentY,
    body: summaryData,
    theme: 'plain',
    styles: {
      font: 'Roboto',
      fontSize: 10,
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 80, fontStyle: 'normal' },
      1: { fontStyle: 'bold', halign: 'right' },
    },
    didParseCell: (data) => {
      // Son satır (genel toplam) vurgu
      if (data.row.index === summaryData.length - 1) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = [219, 234, 254]
        data.cell.styles.textColor = [30, 64, 175]
      }
    },
    margin: { left: margin, right: margin },
  })

  currentY = doc.lastAutoTable.finalY + 10

  // ============= BAKIM KAYITLARI =============
  if (maintenanceRecords.length > 0) {
    if (currentY > pageHeight - 60) {
      doc.addPage()
      currentY = 20
    }

    doc.setFont('Roboto', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(30, 41, 59)
    doc.text('BAKIM KAYITLARI', margin, currentY)

    currentY += 6

    const sortedMaintenance = [...maintenanceRecords].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    )

    const maintenanceData = sortedMaintenance.map(r => [
      formatDate(r.date),
      r.type || '-',
      r.km ? `${Number(r.km).toLocaleString('tr-TR')}` : '-',
      r.cost ? `${r.cost.toLocaleString('tr-TR')} ₺` : '-',
      r.notes || '-',
    ])

    autoTable(doc, {
      startY: currentY,
      head: [['Tarih', 'Bakım Türü', 'KM', 'Maliyet', 'Notlar']],
      body: maintenanceData,
      theme: 'striped',
      styles: {
        font: 'Roboto',
        fontSize: 9,
        cellPadding: 2,
      },
      headStyles: {
        font: 'Roboto',
        fontStyle: 'bold',
        fillColor: [59, 130, 246],
        textColor: 255,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 40 },
        2: { cellWidth: 25, halign: 'right' },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 'auto' },
      },
      margin: { left: margin, right: margin },
    })

    currentY = doc.lastAutoTable.finalY + 10
  }

  // ============= YAKIT KAYITLARI =============
  if (fuelRecords.length > 0) {
    if (currentY > pageHeight - 60) {
      doc.addPage()
      currentY = 20
    }

    doc.setFont('Roboto', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(30, 41, 59)
    doc.text('YAKIT KAYITLARI', margin, currentY)

    currentY += 6

    const sortedFuel = [...fuelRecords].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    )

    const fuelData = sortedFuel.map(r => [
      formatDate(r.date),
      r.km ? `${Number(r.km).toLocaleString('tr-TR')}` : '-',
      `${r.liters} L`,
      r.pricePerLiter ? `${r.pricePerLiter.toFixed(2)} ₺` : '-',
      `${r.totalCost.toLocaleString('tr-TR')} ₺`,
      r.station || '-',
    ])

    autoTable(doc, {
      startY: currentY,
      head: [['Tarih', 'KM', 'Litre', '₺/L', 'Toplam', 'İstasyon']],
      body: fuelData,
      theme: 'striped',
      styles: {
        font: 'Roboto',
        fontSize: 9,
        cellPadding: 2,
      },
      headStyles: {
        font: 'Roboto',
        fontStyle: 'bold',
        fillColor: [34, 197, 94],
        textColor: 255,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 22, halign: 'right' },
        2: { cellWidth: 18, halign: 'right' },
        3: { cellWidth: 20, halign: 'right' },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 'auto' },
      },
      margin: { left: margin, right: margin },
    })
  }

  // Footer (her sayfanın altına)
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('Roboto', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.text(
      `Sayfa ${i} / ${pageCount} • Garajım — Araç Takip Asistanı`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    )
  }

  // PDF'i indir
  const fileName = `${vehicle.brand}_${vehicle.model}_${vehicle.plate}_rapor.pdf`
    .replace(/\s+/g, '_')
  doc.save(fileName)
}