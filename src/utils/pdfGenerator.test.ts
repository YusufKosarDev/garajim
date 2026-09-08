import { describe, it, expect } from 'vitest'

/**
 * PDF üreticisi ARTIK DİNAMİK import ediliyor (bkz. VehicleDetail.jsx).
 *
 * Bu test PDF çıktısını sınamıyor — jsPDF'in jsdom'da ürettiği belgeyi
 * doğrulamak kırılgan olurdu. Sınadığı şey daha dar ama tam da riskli olan
 * yer: modülün dinamik import edildiğinde HÂLÂ ÇÖZÜLDÜĞÜ ve beklenen dışa
 * aktarımı verdiği. Statik import kaldırıldığı için artık başka hiçbir test
 * bu dosyaya dokunmuyor; bozuk bir import zinciri ancak kullanıcı butona
 * bastığında ortaya çıkardı.
 */
describe('pdfGenerator — dinamik import', () => {
  it('modül çözülür ve generateVehicleReport dışa aktarılır', async () => {
    const modul = await import('./pdfGenerator')
    expect(typeof modul.generateVehicleReport).toBe('function')
  })
})
