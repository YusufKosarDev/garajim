import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import TireDisplay from './TireDisplay'
import TireChangeHistory from './TireChangeHistory'

/**
 * Bu dosyanın asıl işi bir HATA SINIFINI çitlemek: sabit tabloda çeviri
 * anahtarı duruyor ama tüketici onu `t()` ile sarmıyor.
 *
 * `TIRE_POSITIONS` ve `SEASONS` (utils/tireHelpers.ts) `label` alanında
 * 'tire.position.on_sol' gibi ANAHTARLAR tutuyor. Bu bileşenler onları bir süre
 * boyunca doğrudan bastı, yani kullanıcı ekranda düz "tire.position.on_sol"
 * gördü — hem Türkçe hem İngilizce modda. Cypress'teki ham anahtar taraması
 * bunu yakalayamıyor çünkü demo hesapta lastik seti yok: bileşenler hiç
 * render edilmiyor. O yüzden kontrol buraya, veriyi kendimizin verdiği
 * bir bileşen testine taşındı.
 */

const RAW_KEY = /\b[a-z][a-zA-Z]+\.[a-z][a-z0-9_]{4,}\b/

const expectNoRawKey = (container) => {
  const match = container.textContent.match(RAW_KEY)
  expect(match, `ekranda ham çeviri anahtarı görünüyor: "${match?.[0]}"`).toBeNull()
}

describe('TireDisplay — pozisyon etiketi', () => {
  const tire = { position: 'FL', dot: '3523', treadDepth: 7 }

  it('pozisyonu çevirir, anahtarı basmaz', () => {
    const { container } = render(<TireDisplay tire={tire} />)
    expect(screen.getByText('Ön Sol')).toBeInTheDocument()
    expectNoRawKey(container)
  })

  it('bilinmeyen pozisyonda ham kodu gösterir, patlamaz', () => {
    // TIRE_POSITIONS'ta olmayan bir kod: t() çağrılmamalı, kod olduğu gibi görünmeli
    const { container } = render(<TireDisplay tire={{ ...tire, position: 'XX' }} />)
    expect(screen.getByText('XX')).toBeInTheDocument()
    expectNoRawKey(container)
  })

  it('dört pozisyonun hepsi çevrilmiş görünür', () => {
    const beklenen = { FL: 'Ön Sol', FR: 'Ön Sağ', RL: 'Arka Sol', RR: 'Arka Sağ', S: 'Stepney' }
    for (const [code, label] of Object.entries(beklenen)) {
      const { container, unmount } = render(<TireDisplay tire={{ ...tire, position: code }} />)
      expect(screen.getByText(label)).toBeInTheDocument()
      expectNoRawKey(container)
      unmount()
    }
  })
})

describe('TireChangeHistory — sezon etiketleri', () => {
  const changes = [
    { id: 'c1', date: '2026-04-10', fromSeason: 'winter', toSeason: 'summer', km: 82000, cost: 250 },
  ]

  it('sezon adlarını çevirir, anahtarı basmaz', () => {
    const { container } = render(<TireChangeHistory tireChanges={changes} onDelete={vi.fn()} />)
    expect(screen.getByText(/Kışlık/)).toBeInTheDocument()
    expect(screen.getByText(/Yazlık/)).toBeInTheDocument()
    expectNoRawKey(container)
  })

  it('sezon ikonlarının tooltip metni de çevrilmiştir', () => {
    // title= niteliği ham anahtar tutuyordu; ekranda görünmediği için
    // metin taraması bunu yakalamaz, o yüzden ayrıca sınanıyor.
    render(<TireChangeHistory tireChanges={changes} onDelete={vi.fn()} />)
    expect(screen.getByTitle('Kışlık')).toBeInTheDocument()
    expect(screen.getByTitle('Yazlık')).toBeInTheDocument()
  })

  it('kayıt yoksa boş durum gösterir', () => {
    const { container } = render(<TireChangeHistory tireChanges={[]} onDelete={vi.fn()} />)
    expect(screen.getByText('Henüz mevsim değişimi yok')).toBeInTheDocument()
    expectNoRawKey(container)
  })
})
