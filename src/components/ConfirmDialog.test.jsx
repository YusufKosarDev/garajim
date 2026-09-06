import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ConfirmDialog from './ConfirmDialog'

describe('ConfirmDialog', () => {
  const ac = (props = {}) =>
    render(
      <ConfirmDialog
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Araç silinsin mi?"
        message="Bu işlem geri alınamaz."
        {...props}
      />
    )

  it('diyaloğun erişilebilir adı vardır (önceden hiç yoktu)', () => {
    ac()
    // Ekran okuyucu için ad: başlık metni. Eskiden Modal'a title geçilmediği
    // ve h3 bağlanmadığı için diyalog yalnızca "dialog" diye duyuruluyordu.
    expect(screen.getByRole('dialog', { name: 'Araç silinsin mi?' })).toBeInTheDocument()
  })

  it('mesaj aria-describedby ile bağlanır', () => {
    ac()
    const dialog = screen.getByRole('dialog', { name: 'Araç silinsin mi?' })
    const describedBy = dialog.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(document.getElementById(describedBy)).toHaveTextContent('Bu işlem geri alınamaz.')
  })

  it('mesaj yoksa aria-describedby verilmez', () => {
    ac({ message: undefined })
    expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-describedby')
  })

  it('onayla ve iptal butonları çalışır', () => {
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    ac({ onConfirm, onClose, confirmText: 'Evet, sil', cancelText: 'Vazgeç' })

    fireEvent.click(screen.getByRole('button', { name: 'Vazgeç' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Evet, sil' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('iki diyalog aynı anda açıkken başlık idleri çakışmaz', () => {
    render(
      <>
        <ConfirmDialog isOpen onClose={vi.fn()} onConfirm={vi.fn()} title="Birinci" />
        <ConfirmDialog isOpen onClose={vi.fn()} onConfirm={vi.fn()} title="İkinci" />
      </>
    )
    // Sabit "modal-title" id'si kullanılsaydı DOM'da aynı id iki kez olur ve
    // her iki diyalog da aynı adı alırdı.
    expect(screen.getByRole('dialog', { name: 'Birinci' })).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'İkinci' })).toBeInTheDocument()
  })
})
