import SkeletonBase from './SkeletonBase'

export default function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Başlık */}
      <div className="space-y-2">
        <SkeletonBase className="h-8 w-40" />
        <SkeletonBase className="h-4 w-64" />
      </div>

      {/* Stat kartları */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <SkeletonBase key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      {/* Hızlı eylemler */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <SkeletonBase className="h-5 w-32 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <SkeletonBase key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>

      {/* İki sütun */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <SkeletonBase className="h-5 w-48 mb-2" />
          {[1, 2, 3].map(i => (
            <SkeletonBase key={i} className="h-14" />
          ))}
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <SkeletonBase className="h-5 w-48 mb-2" />
          <SkeletonBase className="h-56" />
        </div>
      </div>
    </div>
  )
}