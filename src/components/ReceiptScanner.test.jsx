import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ReceiptScanner from './ReceiptScanner'

// OCR taklit ediliyor — burada sınanan Tesseract'ın doğruluğu değil, bileşenin
// ONAY SÖZLEŞMESİ: kullanıcı basmadan hiçbir alan forma yazılmamalı.
const fistenMetinOku = vi.fn()
vi.mock('../lib/ocr', () => ({
  fistenMetinOku: (...a) => fistenMetinOku(...a),
  ocrKapat: vi.fn(),
}))

const toastError = vi.fn()
const toastSuccess = vi.fn()
const toastFn = vi.fn()
vi.mock('react-hot-toast', () => ({
  default: Object.assign((...a) => toastFn(...a), {
    error: (...a) => toastError(...a),
    success: (...a) => toastSuccess(...a),
  }),
}))

vi.mock('../lib/errorTracking', () => ({ captureError: vi.fn() }))

const FIS = `
OTO SERVIS
TARIH: 20/01/2026
KM: 128.450
GENEL TOPLAM  1.860,00
`

const FOTO = 'data:image/jpeg;base64,AAAA'

const tara = async () => {
  fireEvent.click(screen.getByRole('button', { name: /fişten bilgileri oku/i }))
  await waitFor(() => expect(screen.getByText(/fişte bulunanlar/i)).toBeInTheDocument())
}

beforeEach(() => {
  vi.clearAllMocks()
  fistenMetinOku.mockResolvedValue({ metin: FIS, guven: 90 })
})

describe('ReceiptScanner', () => {
  it('fotoğraf yokken hiç görünmez', () => {
    const { container } = render(<ReceiptScanner photo={null} onUygula={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('taramadan önce onUygula çağrılmaz', async () => {
    const onUygula = vi.fn()
    render(<ReceiptScanner photo={FOTO} onUygula={onUygula} />)
    await tara()
    // Öneriler ekranda ama form HÂLÂ dokunulmamış olmalı
    expect(onUygula).not.toHaveBeenCalled()
  })

  it('kullanıcı onaylayınca seçili alanları gönderir', async () => {
    const onUygula = vi.fn()
    render(<ReceiptScanner photo={FOTO} onUygula={onUygula} />)
    await tara()

    fireEvent.click(screen.getByRole('button', { name: /alanları doldur/i }))
    expect(onUygula).toHaveBeenCalledWith({ tutar: 1860, tarih: '2026-01-20', km: 128450 })
  })

  it('işareti kaldırılan alan gönderilmez', async () => {
    const onUygula = vi.fn()
    render(<ReceiptScanner photo={FOTO} onUygula={onUygula} />)
    await tara()

    // KM en riskli alan; kullanıcı onu istemiyorsa gitmemeli
    const kmKutusu = screen.getByText('128.450').closest('label').querySelector('input')
    fireEvent.click(kmKutusu)
    fireEvent.click(screen.getByRole('button', { name: /alanları doldur/i }))

    expect(onUygula).toHaveBeenCalledWith({ tutar: 1860, tarih: '2026-01-20' })
  })

  it('hiçbir alan seçili değilken uygulamayı reddeder', async () => {
    const onUygula = vi.fn()
    render(<ReceiptScanner photo={FOTO} onUygula={onUygula} />)
    await tara()

    document.querySelectorAll('input[type="checkbox"]').forEach(k => fireEvent.click(k))
    fireEvent.click(screen.getByRole('button', { name: /alanları doldur/i }))

    expect(onUygula).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalled()
  })

  it('vazgeçince öneriler kaybolur ve form etkilenmez', async () => {
    const onUygula = vi.fn()
    render(<ReceiptScanner photo={FOTO} onUygula={onUygula} />)
    await tara()

    fireEvent.click(screen.getByRole('button', { name: /vazgeç/i }))
    await waitFor(() => expect(screen.queryByText(/fişte bulunanlar/i)).not.toBeInTheDocument())
    expect(onUygula).not.toHaveBeenCalled()
  })

  it('fotoğraf değişince eski öneriler gösterilmez', async () => {
    const { rerender } = render(<ReceiptScanner photo={FOTO} onUygula={vi.fn()} />)
    await tara()

    // Başka bir fişin fotoğrafı: önceki fişin tutarı ekranda kalmamalı
    rerender(<ReceiptScanner photo="data:image/jpeg;base64,BBBB" onUygula={vi.fn()} />)
    expect(screen.queryByText(/fişte bulunanlar/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /fişten bilgileri oku/i })).toBeInTheDocument()
  })

  it('okunamayan fişte alan önermez', async () => {
    fistenMetinOku.mockResolvedValue({ metin: 'TESEKKUR EDERIZ', guven: 80 })
    render(<ReceiptScanner photo={FOTO} onUygula={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /fişten bilgileri oku/i }))
    await waitFor(() => expect(screen.getByText(/okunamadı/i)).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /alanları doldur/i })).not.toBeInTheDocument()
  })

  it('düşük güvende kullanıcıyı uyarır', async () => {
    fistenMetinOku.mockResolvedValue({ metin: FIS, guven: 35 })
    render(<ReceiptScanner photo={FOTO} onUygula={vi.fn()} />)
    await tara()
    expect(screen.getByText(/net okunamadı/i)).toBeInTheDocument()
  })

  it('OCR patlarsa hata gösterir, öneri uydurmaz', async () => {
    fistenMetinOku.mockRejectedValue(new Error('ağ yok'))
    const onUygula = vi.fn()
    render(<ReceiptScanner photo={FOTO} onUygula={onUygula} />)

    fireEvent.click(screen.getByRole('button', { name: /fişten bilgileri oku/i }))
    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(screen.queryByText(/fişte bulunanlar/i)).not.toBeInTheDocument()
    expect(onUygula).not.toHaveBeenCalled()
  })
})
