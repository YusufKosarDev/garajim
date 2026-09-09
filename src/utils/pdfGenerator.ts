import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import i18n from '../i18n'
import { formatDate } from './dateHelpers'
import { getTotalFuelCost, getAverageConsumption } from './fuelHelpers'
import type { Vehicle, MaintenanceRecord, FuelRecord } from '../types'

/** jspdf-autotable jsPDF örneğine lastAutoTable ekliyor ama tipini bildirmiyor */
type AutoTableliPDF = jsPDF & { lastAutoTable?: { finalY: number } }

// Roboto fontlarını base64 olarak import et (Vite ?url özelliği)
import RobotoRegular from '../fonts/Roboto-Regular.ttf?url'
import RobotoBold from '../fonts/Roboto-Bold.ttf?url'

// Font dosyasını fetch edip base64'e çevir
const loadFont = async (fontUrl: string): Promise<string> => {
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
interface FontCache { regular: string; bold: string }
let fontCache: FontCache | null = null

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
const setupFonts = (doc: jsPDF, fonts: FontCache) => {
  // Regular
  doc.addFileToVFS('Roboto-Regular.ttf', fonts.regular)
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')

  // Bold
  doc.addFileToVFS('Roboto-Bold.ttf', fonts.bold)
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold')

  // Default font olarak Roboto'yu set et
  doc.setFont('Roboto', 'normal')
}

/**
 * PDF rapor üreticisi.
 *
 * İMZA DEĞİŞMEDİ: çeviri, `t`'yi parametre olarak geçirmek yerine i18n
 * singleton'ından okunuyor — projede notificationManager, formSchemas ve
 * tireHelpers'ın izlediği desen. Tek çağrı yeri VehicleDetail'de dinamik
 * import ile duruyor, o dosyada bir değişiklik gerekmedi.
 *
 * ÇEVRİLMEYENLER — kasıtlı:
 *   • `₺` ve `toLocaleString('tr-TR')`: tutarlar Türk Lirası cinsinden ve sayı
 *     gruplaması para birimine ait bir özellik. Arayüz İngilizce olsa da rapor
 *     ₺ göstermeye devam etmeli.
 *   • `vehicle.fuelType` ve `r.type`: bunlar VERİTABANI DEĞERLERİ, etiket değil
 *     (bkz. i18n.test.ts'teki sözleşme). Çevrilirse kayıt eşleşmesi bozulur.
 *   • 'GARAJIM': ürün adı.
 */
export const generateVehicleReport = async (
  vehicle: Vehicle,
  maintenanceRecords: MaintenanceRecord[],
  fuelRecords: FuelRecord[] = []
) => {
  const t = i18n.t.bind(i18n)

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
  doc.text(t('pdfReport.alt_baslik'), margin, 26)

  // Sağ üst köşede tarih
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  const reportDate = formatDate(new Date().toISOString())
  doc.text(t('pdfReport.rapor_tarihi', { date: reportDate }), pageWidth - margin, 20, { align: 'right' })

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
    [t('pdfReport.row.plaka'), vehicle.plate || '-'],
    [t('pdfReport.row.marka_model'), `${vehicle.brand} ${vehicle.model}`],
    [t('pdfReport.row.yil'), String(vehicle.year || '-')],
    [t('pdfReport.row.yakit_tipi'), vehicle.fuelType || '-'],
    [t('pdfReport.row.guncel_km'), vehicle.currentKm ? `${Number(vehicle.currentKm).toLocaleString('tr-TR')} km` : '-'],
    [t('pdfReport.row.muayene_tarihi'), formatDate(vehicle.inspectionDate)],
    [t('pdfReport.row.mtv_tarihi'), formatDate(vehicle.mtvDate)],
    [t('pdfReport.row.trafik_sigortasi'), formatDate(vehicle.insuranceDate)],
    [t('pdfReport.row.kasko_tarihi'), formatDate(vehicle.kaskoDate)],
  ]

  autoTable(doc, {
    startY: 55,
    head: [[t('pdfReport.head.bilgi'), t('pdfReport.head.deger')]],
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

  let currentY = ((doc as AutoTableliPDF).lastAutoTable?.finalY ?? 0) + 10

  // ============= ÖZET =============
  const totalMaintenanceCost = maintenanceRecords.reduce((sum, r) => sum + (r.cost || 0), 0)
  const totalFuelCost = getTotalFuelCost(fuelRecords)
  const totalCost = totalMaintenanceCost + totalFuelCost
  const avgConsumption = getAverageConsumption(fuelRecords)

  doc.setFont('Roboto', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(30, 41, 59)
  doc.text(t('pdfReport.ozet'), margin, currentY)

  currentY += 6

  const summaryData = [
    [t('pdfReport.row.toplam_bakim_kaydi'), t('pdfReport.adet', { count: maintenanceRecords.length })],
    [t('pdfReport.row.toplam_yakit_kaydi'), t('pdfReport.adet', { count: fuelRecords.length })],
    [t('pdfReport.row.toplam_bakim_harcamasi'), `${totalMaintenanceCost.toLocaleString('tr-TR')} ₺`],
    [t('pdfReport.row.toplam_yakit_harcamasi'), `${totalFuelCost.toLocaleString('tr-TR')} ₺`],
    [t('pdfReport.row.genel_toplam'), `${totalCost.toLocaleString('tr-TR')} ₺`],
  ]

  if (avgConsumption) {
    summaryData.splice(4, 0, [t('pdfReport.row.ortalama_tuketim'), `${avgConsumption.toFixed(1)} L/100km`])
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

  currentY = ((doc as AutoTableliPDF).lastAutoTable?.finalY ?? 0) + 10

  // ============= BAKIM KAYITLARI =============
  if (maintenanceRecords.length > 0) {
    if (currentY > pageHeight - 60) {
      doc.addPage()
      currentY = 20
    }

    doc.setFont('Roboto', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(30, 41, 59)
    doc.text(t('pdfReport.bakim_kayitlari'), margin, currentY)

    currentY += 6

    const sortedMaintenance = [...maintenanceRecords].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
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
      head: [[t('pdfReport.head.tarih'), t('pdfReport.head.bakim_turu'), t('pdfReport.head.km'), t('pdfReport.head.maliyet'), t('pdfReport.head.notlar')]],
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

    currentY = ((doc as AutoTableliPDF).lastAutoTable?.finalY ?? 0) + 10
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
    doc.text(t('pdfReport.yakit_kayitlari'), margin, currentY)

    currentY += 6

    const sortedFuel = [...fuelRecords].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
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
      head: [[t('pdfReport.head.tarih'), t('pdfReport.head.km'), t('pdfReport.head.litre'), '₺/L', t('pdfReport.head.toplam'), t('pdfReport.head.istasyon')]],
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
  // jsPDF tip tanımı internal.getNumberOfPages()'i bildirmiyor
  const pageCount = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('Roboto', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.text(
      t('pdfReport.footer', { page: i, total: pageCount }),
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    )
  }

  // PDF'i indir
  const fileName = `${vehicle.brand}_${vehicle.model}_${vehicle.plate}_${t('pdfReport.dosya_adi_eki')}.pdf`
    .replace(/\s+/g, '_')
  doc.save(fileName)
}