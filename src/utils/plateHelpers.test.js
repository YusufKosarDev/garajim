import { describe, it, expect } from 'vitest'
import { formatPlate, isValidPlate, platesMatch } from './plateHelpers'

describe('formatPlate', () => {
  it('boşluksuz girdiyi standart formata çevirir', () => {
    expect(formatPlate('34ABC1234')).toBe('34 ABC 1234')
    expect(formatPlate('06A123')).toBe('06 A 123')
  })

  it('küçük harfi büyütür', () => {
    expect(formatPlate('34abc1234')).toBe('34 ABC 1234')
  })

  it('Türkçe harfleri İngilizce karşılığına çevirir', () => {
    expect(formatPlate('34ŞGÜ12')).toBe('34 SGU 12')
    expect(formatPlate('34İÖÇ12')).toBe('34 IOC 12')
  })

  it('araya serpiştirilmiş noktalama ve boşlukları temizler', () => {
    expect(formatPlate('34-ABC-1234')).toBe('34 ABC 1234')
    expect(formatPlate('  34  ABC  1234  ')).toBe('34 ABC 1234')
  })

  it('yarım yazımda o ana kadarki kısmı verir (kullanıcı yazarken)', () => {
    expect(formatPlate('3')).toBe('3')
    expect(formatPlate('34')).toBe('34')
    expect(formatPlate('34A')).toBe('34 A')
    expect(formatPlate('34AB')).toBe('34 AB')
  })

  it('harf kısmını 3 ile sınırlar', () => {
    // 4. harf harf olarak kabul edilmez; rakam olmadığı için de düşer
    expect(formatPlate('34ABCD12')).toBe('34 ABC 12')
  })

  it('rakam kısmını 4 ile sınırlar', () => {
    expect(formatPlate('34ABC123456')).toBe('34 ABC 1234')
  })

  it('boş girdide boş string döner', () => {
    expect(formatPlate('')).toBe('')
    expect(formatPlate(null)).toBe('')
    expect(formatPlate('!!!')).toBe('')
  })
})

describe('isValidPlate', () => {
  it('geçerli TR plaka biçimlerini kabul eder', () => {
    expect(isValidPlate('34 A 1234')).toBe(true)
    expect(isValidPlate('06 AB 123')).toBe(true)
    expect(isValidPlate('35 ABC 12')).toBe(true)
    expect(isValidPlate('34 ABC 1234')).toBe(true)
  })

  it('biçimsiz plakaları reddeder', () => {
    expect(isValidPlate('34ABC1234')).toBe(false) // boşluk yok
    expect(isValidPlate('3 A 1234')).toBe(false)  // il kodu tek hane
    expect(isValidPlate('34 ABCD 1234')).toBe(false) // 4 harf
    expect(isValidPlate('34 A 1')).toBe(false)    // tek rakam
    expect(isValidPlate('34 a 1234')).toBe(false) // küçük harf
    expect(isValidPlate('')).toBe(false)
    expect(isValidPlate(null)).toBe(false)
  })

  it('formatPlate çıktısı isValidPlate tarafından kabul edilir', () => {
    for (const raw of ['34abc1234', '06A123', '35 ab 12']) {
      expect(isValidPlate(formatPlate(raw))).toBe(true)
    }
  })
})

describe('platesMatch', () => {
  it('boşluk ve harf büyüklüğünü yok sayar', () => {
    expect(platesMatch('34 ABC 1234', '34abc1234')).toBe(true)
    expect(platesMatch('34ABC1234', '34 ABC 1234')).toBe(true)
  })

  it('farklı plakaları eşleştirmez', () => {
    expect(platesMatch('34 ABC 1234', '34 ABC 1235')).toBe(false)
  })

  it('taraflardan biri boşsa false', () => {
    expect(platesMatch('', '34 ABC 1234')).toBe(false)
    expect(platesMatch('34 ABC 1234', null)).toBe(false)
  })
})
