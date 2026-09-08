import { describe, it, expect } from 'vitest'
import { fuzzyMatch, multiFieldSearch } from './fuzzySearch'

describe('fuzzyMatch', () => {
  it('tam alt dize eşleşmesini bulur', () => {
    expect(fuzzyMatch('Yağ Değişimi', 'yağ').match).toBe(true)
  })

  it('baştan eşleşmeye daha yüksek skor verir', () => {
    const bastan = fuzzyMatch('Yağ Değişimi', 'yag')
    const ortadan = fuzzyMatch('Motor Yağı', 'yag')
    expect(bastan.score).toBeGreaterThan(ortadan.score)
  })

  it('Türkçe karakterleri normalize eder (ı/ğ/ü/ş/ö/ç)', () => {
    expect(fuzzyMatch('Yağ Değişimi', 'degisimi').match).toBe(true)
    expect(fuzzyMatch('Şanzıman', 'sanziman').match).toBe(true)
    expect(fuzzyMatch('Fren Hidroliği', 'hidroligi').match).toBe(true)
  })

  it('harfleri sırayla içeren kısaltmayı eşleştirir', () => {
    expect(fuzzyMatch('Değişimi', 'dgsm').match).toBe(true)
  })

  it('sırası bozuk harfleri eşleştirmez', () => {
    expect(fuzzyMatch('Yağ', 'ğay').match).toBe(false)
  })

  it('hiç eşleşmeyen sorguda match false döner', () => {
    expect(fuzzyMatch('Yağ Değişimi', 'xyz').match).toBe(false)
    expect(fuzzyMatch('Yağ Değişimi', 'xyz').score).toBe(0)
  })

  it('boş sorgu her şeyle eşleşir', () => {
    expect(fuzzyMatch('herhangi', '').match).toBe(true)
  })

  it('boş metin eşleşmez', () => {
    expect(fuzzyMatch('', 'yağ').match).toBe(false)
  })

  it('büyük/küçük harfe duyarsızdır', () => {
    expect(fuzzyMatch('YAĞ DEĞİŞİMİ', 'yag').match).toBe(true)
  })
})

describe('multiFieldSearch', () => {
  const vehicle = { plate: '34 ABC 1234', brand: 'BMW', model: '320i', notes: 'kırmızı' }
  const fields = ['plate', 'brand', 'model', 'notes']

  it('herhangi bir alanda eşleşme bulur', () => {
    expect(multiFieldSearch(vehicle, 'bmw', fields).match).toBe(true)
    expect(multiFieldSearch(vehicle, '320', fields).match).toBe(true)
    expect(multiFieldSearch(vehicle, 'kirmizi', fields).match).toBe(true)
  })

  it('en yüksek skoru döndürür', () => {
    const result = multiFieldSearch(vehicle, 'bmw', fields)
    expect(result.score).toBeGreaterThan(0)
  })

  it('hiçbir alan eşleşmezse match false', () => {
    expect(multiFieldSearch(vehicle, 'mercedes', fields).match).toBe(false)
  })

  it('eksik alanlarda çökmez', () => {
    expect(multiFieldSearch({ brand: 'BMW' }, 'bmw', fields).match).toBe(true)
    expect(multiFieldSearch({ brand: null }, 'bmw', fields).match).toBe(false)
  })

  it('boş sorguda match true döner', () => {
    expect(multiFieldSearch(vehicle, '', fields).match).toBe(true)
  })
})
