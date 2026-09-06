import { describe, it, expect } from 'vitest'
import { parseTurkishNumber, parseFisMetni } from './receiptParser'

const BUGUN = new Date(2026, 2, 15) // 15 Mart 2026

describe('parseTurkishNumber', () => {
  it('Türk biçimini okur: binlik nokta, ondalık virgül', () => {
    expect(parseTurkishNumber('1.234,56')).toBe(1234.56)
    expect(parseTurkishNumber('12.500,00')).toBe(12500)
    expect(parseTurkishNumber('1.234.567,89')).toBe(1234567.89)
  })

  it('yalnızca virgül varsa ondalık sayar', () => {
    expect(parseTurkishNumber('850,50')).toBe(850.5)
    expect(parseTurkishNumber('12,5')).toBe(12.5)
  })

  it('nokta + 3 basamak binliktir, ondalık değil', () => {
    // Fişte "1.500" bin beş yüz demektir; 1,5 diye okunursa tutar 1000 kat yanlış olur
    expect(parseTurkishNumber('1.500')).toBe(1500)
    expect(parseTurkishNumber('2.000')).toBe(2000)
  })

  it('nokta + 2 basamak ondalıktır (bazı yazarkasalar böyle basar)', () => {
    expect(parseTurkishNumber('850.50')).toBe(850.5)
  })

  it('ayırıcısız sayıyı olduğu gibi alır', () => {
    expect(parseTurkishNumber('1500')).toBe(1500)
    expect(parseTurkishNumber('0')).toBe(0)
  })

  it('OCR karışıklığını sayı bağlamında düzeltir (O->0, l->1, S->5)', () => {
    expect(parseTurkishNumber('l.5OO,OO')).toBe(1500)
    expect(parseTurkishNumber('85O')).toBe(850)
  })

  it('harf ağırlıklı metni sayı sanmaz', () => {
    // "TOPLAM" içindeki O'lar 0'a çevrilip 0 üretilmemeli
    expect(parseTurkishNumber('TOPLAM')).toBeNull()
    expect(parseTurkishNumber('OSOS')).toBeNull()
    expect(parseTurkishNumber('')).toBeNull()
    expect(parseTurkishNumber('abc')).toBeNull()
  })

  it('anlamsız ayırıcı kuyruğunu reddeder', () => {
    expect(parseTurkishNumber('1,2345')).toBeNull()
  })
})

describe('parseFisMetni — tutar', () => {
  it('GENEL TOPLAM ARA TOPLAM ve KDV yerine seçilir', () => {
    const fis = `
PETROL OFISI A.S.
ARA TOPLAM        1.250,00
KDV %20             250,00
GENEL TOPLAM      1.500,00
`
    expect(parseFisMetni(fis, BUGUN).tutar?.deger).toBe(1500)
  })

  it('GENEL TOPLAM yoksa TOPLAM kullanılır', () => {
    const fis = 'ORTA SERVIS\nTOPLAM   2.750,00\nNAKIT   3.000,00'
    expect(parseFisMetni(fis, BUGUN).tutar?.deger).toBe(2750)
  })

  it('yalnızca ARA TOPLAM ve KDV varsa tutar önermez', () => {
    // Yanlış tutar önermektense hiç önermemek: kullanıcı zaten elle yazacaktı
    const fis = 'ARA TOPLAM  1.250,00\nKDV %20  250,00'
    expect(parseFisMetni(fis, BUGUN).tutar).toBeNull()
  })

  it('PARA ÜSTÜ satırını tutar sanmaz', () => {
    const fis = 'TOPLAM  480,00\nALINAN  500,00\nPARA USTU  20,00'
    expect(parseFisMetni(fis, BUGUN).tutar?.deger).toBe(480)
  })

  it('sütun OCR\'da alt satıra kayan tutarı yakalar', () => {
    const fis = 'GENEL TOPLAM\n1.850,00\nTESEKKURLER'
    expect(parseFisMetni(fis, BUGUN).tutar?.deger).toBe(1850)
  })

  it('ÖDENECEK yazan fişte Türkçe karakter OCR kaybını tolere eder', () => {
    expect(parseFisMetni('ODENECEK TUTAR  920,00', BUGUN).tutar?.deger).toBe(920)
    expect(parseFisMetni('ÖDENECEK TUTAR  920,00', BUGUN).tutar?.deger).toBe(920)
  })

  it('kaynak satırı öneriyle birlikte döner', () => {
    const sonuc = parseFisMetni('GENEL TOPLAM      1.500,00', BUGUN)
    expect(sonuc.tutar?.kaynak).toBe('GENEL TOPLAM      1.500,00')
  })
})

describe('parseFisMetni — tarih', () => {
  it('GG/AA/YYYY okur (12/03 = 12 Mart, 3 Aralık değil)', () => {
    expect(parseFisMetni('TARIH: 12/03/2025', BUGUN).tarih?.deger).toBe('2025-03-12')
  })

  it('nokta ve tire ayırıcılarını da kabul eder', () => {
    expect(parseFisMetni('TARIH 05.11.2025', BUGUN).tarih?.deger).toBe('2025-11-05')
    expect(parseFisMetni('TARIH 05-11-2025', BUGUN).tarih?.deger).toBe('2025-11-05')
  })

  it('iki haneli yılı 2000\'li yıllara tamamlar', () => {
    expect(parseFisMetni('TARIH: 01/02/25', BUGUN).tarih?.deger).toBe('2025-02-01')
  })

  it('gelecek tarihi reddeder', () => {
    // Fiş gelecekten gelemez; bu bir OCR hatasıdır
    expect(parseFisMetni('TARIH: 01/01/2027', BUGUN).tarih).toBeNull()
  })

  it('var olmayan tarihi reddeder (31 Şubat)', () => {
    expect(parseFisMetni('TARIH: 31/02/2025', BUGUN).tarih).toBeNull()
  })

  it('TARİH etiketli satırı etiketsizden önce seçer', () => {
    const fis = 'SON KULLANMA 01/01/2020\nTARIH: 10/10/2025'
    expect(parseFisMetni(fis, BUGUN).tarih?.deger).toBe('2025-10-10')
  })

  it('tarih yoksa null döner', () => {
    expect(parseFisMetni('GENEL TOPLAM 500,00', BUGUN).tarih).toBeNull()
  })
})

describe('parseFisMetni — km', () => {
  it('etiketli kilometreyi okur', () => {
    expect(parseFisMetni('KM: 145.000', BUGUN).km?.deger).toBe(145000)
    expect(parseFisMetni('KILOMETRE 87500', BUGUN).km?.deger).toBe(87500)
  })

  it('etiketsiz sayıyı km sanmaz', () => {
    // Bir fiş baştan aşağı sayı doludur; yanlış km, aracın kaydını bozar
    expect(parseFisMetni('FIS NO 0042\nGENEL TOPLAM 1.500,00', BUGUN).km).toBeNull()
  })

  it('ondalıklı eşleşmeyi km saymaz (o bir fiyattır)', () => {
    expect(parseFisMetni('KM BASI 12,50', BUGUN).km).toBeNull()
  })

  it('imkansız büyüklükteki km\'yi reddeder', () => {
    expect(parseFisMetni('KM: 9.999.999', BUGUN).km).toBeNull()
  })
})

describe('parseFisMetni — bütün fiş', () => {
  it('gerçekçi bir servis fişinden üç alanı da çıkarır', () => {
    const fis = `
      OTO SERVIS LTD STI
      VD: KADIKOY  VKN: 1234567890
      TARIH: 20/01/2026    SAAT: 14:32
      FIS NO: 000341
      PLAKA: 34 ABC 123    KM: 128.450
      ------------------------------
      YAG DEGISIMI              1.200,00
      YAG FILTRESI                350,00
      ------------------------------
      ARA TOPLAM                1.550,00
      KDV %20                     310,00
      GENEL TOPLAM              1.860,00
    `
    const s = parseFisMetni(fis, BUGUN)
    expect(s.tutar?.deger).toBe(1860)
    expect(s.tarih?.deger).toBe('2026-01-20')
    expect(s.km?.deger).toBe(128450)
  })

  it('boş veya anlamsız girdide hiçbir şey önermez', () => {
    expect(parseFisMetni('', BUGUN)).toEqual({ tutar: null, tarih: null, km: null })
    expect(parseFisMetni('   \n  \n ', BUGUN)).toEqual({ tutar: null, tarih: null, km: null })
    const bozuk = parseFisMetni('~~~ ### @@@ ???', BUGUN)
    expect(bozuk).toEqual({ tutar: null, tarih: null, km: null })
  })
})
