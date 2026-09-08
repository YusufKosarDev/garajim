import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ReceiptScanner from './ReceiptScanner'

// OCR taklit ediliyor — burada sınanan Tesseract'ın doğruluğu değil, bileşenin
// ONAY SÖZLEŞMESİ: kullanıcı basmadan hiçbir alan forma yazılmamalı.
const readTextFromReceipt = vi.fn()
vi.mock('../lib/ocr', () => ({
  readTextFromReceipt: (...a) => readTextFromReceipt(...a),
  closeOcrWorker: vi.fn(),
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

const scan = async () => {
  fireEvent.click(screen.getByRole('button', { name: /fişten bilgileri oku/i }))
  await waitFor(() => expect(screen.getByText(/fişte bulunanlar/i)).toBeInTheDocument())
}

beforeEach(() => {
  vi.clearAllMocks()
  readTextFromReceipt.mockResolvedValue({ text: FIS, confidence: 90 })
})

describe('ReceiptScanner', () => {
  it('fotoğraf yokken hiç görünmez', () => {
    const { container } = render(<ReceiptScanner photo={null} onApply={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('taramadan önce onUygula çağrılmaz', async () => {
    const onApply = vi.fn()
    render(<ReceiptScanner photo={FOTO} onApply={onApply} />)
    await scan()
    // Öneriler ekranda ama form HÂLÂ dokunulmamış olmalı
    expect(onApply).not.toHaveBeenCalled()
  })

  it('kullanıcı onaylayınca seçili alanları gönderir', async () => {
    const onApply = vi.fn()
    render(<ReceiptScanner photo={FOTO} onApply={onApply} />)
    await scan()

    fireEvent.click(screen.getByRole('button', { name: /alanları doldur/i }))
    expect(onApply).toHaveBeenCalledWith({ amount: 1860, date: '2026-01-20', km: 128450 })
  })

  it('işareti kaldırılan alan gönderilmez', async () => {
    const onApply = vi.fn()
    render(<ReceiptScanner photo={FOTO} onApply={onApply} />)
    await scan()

    // KM en riskli alan; kullanıcı onu istemiyorsa gitmemeli
    const kmCheckbox = screen.getByText('128.450').closest('label').querySelector('input')
    fireEvent.click(kmCheckbox)
    fireEvent.click(screen.getByRole('button', { name: /alanları doldur/i }))

    expect(onApply).toHaveBeenCalledWith({ amount: 1860, date: '2026-01-20' })
  })

  it('hiçbir alan seçili değilken uygulamayı reddeder', async () => {
    const onApply = vi.fn()
    render(<ReceiptScanner photo={FOTO} onApply={onApply} />)
    await scan()

    document.querySelectorAll('input[type="checkbox"]').forEach(k => fireEvent.click(k))
    fireEvent.click(screen.getByRole('button', { name: /alanları doldur/i }))

    expect(onApply).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalled()
  })

  it('vazgeçince öneriler kaybolur ve form etkilenmez', async () => {
    const onApply = vi.fn()
    render(<ReceiptScanner photo={FOTO} onApply={onApply} />)
    await scan()

    fireEvent.click(screen.getByRole('button', { name: /vazgeç/i }))
    await waitFor(() => expect(screen.queryByText(/fişte bulunanlar/i)).not.toBeInTheDocument())
    expect(onApply).not.toHaveBeenCalled()
  })

  it('fotoğraf değişince eski öneriler gösterilmez', async () => {
    const { rerender } = render(<ReceiptScanner photo={FOTO} onApply={vi.fn()} />)
    await scan()

    // Başka bir fişin fotoğrafı: önceki fişin tutarı ekranda kalmamalı
    rerender(<ReceiptScanner photo="data:image/jpeg;base64,BBBB" onApply={vi.fn()} />)
    expect(screen.queryByText(/fişte bulunanlar/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /fişten bilgileri oku/i })).toBeInTheDocument()
  })

  it('okunamayan fişte alan önermez', async () => {
    readTextFromReceipt.mockResolvedValue({ text: 'TESEKKUR EDERIZ', confidence: 80 })
    render(<ReceiptScanner photo={FOTO} onApply={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /fişten bilgileri oku/i }))
    await waitFor(() => expect(screen.getByText(/okunamadı/i)).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /alanları doldur/i })).not.toBeInTheDocument()
  })

  it('düşük güvende kullanıcıyı uyarır', async () => {
    readTextFromReceipt.mockResolvedValue({ text: FIS, confidence: 35 })
    render(<ReceiptScanner photo={FOTO} onApply={vi.fn()} />)
    await scan()
    expect(screen.getByText(/net okunamadı/i)).toBeInTheDocument()
  })

  it('OCR patlarsa hata gösterir, öneri uydurmaz', async () => {
    readTextFromReceipt.mockRejectedValue(new Error('ağ yok'))
    const onApply = vi.fn()
    render(<ReceiptScanner photo={FOTO} onApply={onApply} />)

    fireEvent.click(screen.getByRole('button', { name: /fişten bilgileri oku/i }))
    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(screen.queryByText(/fişte bulunanlar/i)).not.toBeInTheDocument()
    expect(onApply).not.toHaveBeenCalled()
  })
})
