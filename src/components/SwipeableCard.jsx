import { useState, useEffect, useRef } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useSwipe } from '../hooks/useSwipe'
import { hapticLight, hapticStrong } from '../utils/hapticFeedback'

export default function SwipeableCard({
  children,
  onEdit,
  onDelete,
  enabled = true,
  editLabel = 'Düzenle',
  deleteLabel = 'Sil',
}) {
  const { translateX, isDragging, isOpen, handlers, close, maxSwipe } = useSwipe({
    enabled,
    onSwipeLeft: () => hapticLight(),
  })
  const cardRef = useRef(null)

  // Dışarıya tıklayınca kapat
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e) => {
      if (cardRef.current && !cardRef.current.contains(e.target)) {
        close()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isOpen, close])

  const handleEditClick = (e) => {
    e.stopPropagation()
    hapticLight()
    close()
    if (onEdit) onEdit()
  }

  const handleDeleteClick = (e) => {
    e.stopPropagation()
    hapticStrong()
    close()
    if (onDelete) onDelete()
  }

  // Aksiyon butonları arka planda
  const ActionButtons = () => (
    <div
      className="absolute right-0 top-0 bottom-0 flex items-stretch"
      style={{ width: `${maxSwipe}px` }}
    >
      <button
        type="button"
        onClick={handleEditClick}
        className="flex-1 flex flex-col items-center justify-center bg-blue-500 hover:bg-blue-600 text-white transition active:scale-95"
      >
        <Pencil className="w-4 h-4 mb-0.5" />
        <span className="text-[10px] font-semibold">{editLabel}</span>
      </button>
      <button
        type="button"
        onClick={handleDeleteClick}
        className="flex-1 flex flex-col items-center justify-center bg-red-500 hover:bg-red-600 text-white transition active:scale-95"
      >
        <Trash2 className="w-4 h-4 mb-0.5" />
        <span className="text-[10px] font-semibold">{deleteLabel}</span>
      </button>
    </div>
  )

  if (!enabled) {
    return <>{children}</>
  }

  return (
    <div ref={cardRef} className="relative overflow-hidden rounded-lg">
      <ActionButtons />

      <div
        {...handlers}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          touchAction: 'pan-y',
        }}
        className="relative bg-slate-900"
      >
        {children}
      </div>
    </div>
  )
}