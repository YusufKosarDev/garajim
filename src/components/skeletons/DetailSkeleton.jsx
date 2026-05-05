import SkeletonBase from './SkeletonBase'

export default function DetailSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Geri butonu */}
      <SkeletonBase className="h-5 w-32" />

      {/* Başlık kartı */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-start gap-4 mb-5">
          <SkeletonBase className="w-20 h-20 rounded-xl" />
          <div className="flex-1 space-y-2">
            <SkeletonBase className="h-6 w-48" />
            <SkeletonBase className="h-4 w-32" />
            <SkeletonBase className="h-4 w-40" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-5 border-t border-slate-800">
          {[1, 2, 3, 4].map(i => (
            <SkeletonBase key={i} className="h-16" />
          ))}
        </div>
      </div>

      {/* Önemli tarihler */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
        <SkeletonBase className="h-5 w-40 mb-2" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <SkeletonBase key={i} className="h-16" />
          ))}
        </div>
      </div>

      {/* Bakım/Yakıt tab */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
        <SkeletonBase className="h-10 w-full mb-3" />
        {[1, 2, 3].map(i => (
          <SkeletonBase key={i} className="h-14" />
        ))}
      </div>
    </div>
  )
}