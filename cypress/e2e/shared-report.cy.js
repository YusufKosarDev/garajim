/// <reference types="cypress" />

import LZString from 'lz-string'

/**
 * `/share/:encodedData` — kimlik doğrulaması olmayan TEK rota.
 *
 * Hiç E2E testi yoktu, oysa herkese açık ve içeriği tamamen URL'den geliyor.
 * Buradaki testler iki şeyi birlikte tutuyor: gerçek bir yük raporu render
 * ediyor VE uydurma/bozuk bir yük kullanıcıya anlamlı bir hata gösteriyor
 * (beyaz ekran ya da patlamış bir bileşen değil).
 */

const paketle = (obj) => LZString.compressToEncodedURIComponent(JSON.stringify(obj))

const gecerliYuk = {
  version: 1,
  sharedAt: '2026-06-15T10:00:00.000Z',
  vehicle: {
    plate: '34 TEST 34', brand: 'Volvo', model: 'V60', year: 2019,
    fuelType: 'Dizel', currentKm: 120000,
    inspectionDate: '2026-09-01', mtvDate: '2026-07-31',
    insuranceDate: '2026-10-01', kaskoDate: '2026-11-01', notes: '',
  },
  maintenance: [
    { id: 'm1', type: 'Yağ Değişimi', date: '2026-04-01', km: 118000, cost: 4200, notes: '' },
  ],
  fuel: [
    { id: 'f1', date: '2026-05-01', km: 119000, liters: 50, pricePerLiter: 43.1, totalCost: 2155, fullTank: true, station: 'Opet' },
  ],
}

describe('Paylaşılan rapor (herkese açık rota)', () => {
  it('geçerli link raporu gösterir — giriş yapmadan', () => {
    cy.visit(`/share/${paketle(gecerliYuk)}`)
    cy.contains('Volvo', { timeout: 15000 }).should('be.visible')
    cy.contains('34 TEST 34').should('be.visible')
    // Giriş ekranına yönlendirilmemeli
    cy.location('pathname').should('include', '/share/')
    cy.assertNoRawI18nKeys('Paylaşılan rapor')
  })

  it('bozuk link anlamlı hata gösterir', () => {
    cy.visit('/share/bu-gecerli-bir-payload-degil')
    cy.contains(/bulunamadı|bozuk|geçersiz/i, { timeout: 15000 }).should('be.visible')
  })

  it('YANLIŞ TİPTE alanlar patlatmaz, hata ekranı gösterir', () => {
    // fuel bir dizi değil — eskiden doğrulama olmadığı için bileşende
    // fuel.map(...) patlıyordu ve kullanıcı boş bir ekran görüyordu.
    cy.visit(`/share/${paketle({ ...gecerliYuk, fuel: 'hop' })}`)
    cy.contains(/bulunamadı|bozuk|geçersiz/i, { timeout: 15000 }).should('be.visible')
  })

  it('desteklenmeyen versiyon hata gösterir', () => {
    cy.visit(`/share/${paketle({ ...gecerliYuk, version: 99 })}`)
    cy.contains(/bulunamadı|bozuk|geçersiz/i, { timeout: 15000 }).should('be.visible')
  })
})
