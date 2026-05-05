import { useRef, useState } from 'react'
import { Camera, X, ImagePlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { fileToCompressedBase64 } from '../utils/imageHelpers'

export default function ImageUploader({ value, onChange }) {
  const fileInputRef = useRef(null)
  const [loading, setLoading] = useState(false)

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    try {
      const base64 = await fileToCompressedBase64(file)
      onChange(base64)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemove = (e) => {
    e.stopPropagation()
    onChange('')
  }

  return (
    <div>
      <label className="block text-sm text-slate-300 mb-2">Araç Fotoğrafı (opsiyonel)</label>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {value ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="relative group cursor-pointer rounded-lg overflow-hidden border border-slate-700 hover:border-blue-500 transition"
        >
          <img src={value} alt="Araç" className="w-full h-48 object-cover" />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3">
            <span className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-lg text-sm">
              <Camera className="w-4 h-4" />
              Değiştir
            </span>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full transition shadow-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="w-full h-32 border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-lg flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-blue-400 transition"
        >
          {loading ? (
            <>
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Yükleniyor...</span>
            </>
          ) : (
            <>
              <ImagePlus className="w-8 h-8" />
              <span className="text-sm">Fotoğraf yüklemek için tıkla</span>
              <span className="text-xs text-slate-500">PNG, JPG (maks. 10MB)</span>
            </>
          )}
        </button>
      )}
    </div>
  )
}