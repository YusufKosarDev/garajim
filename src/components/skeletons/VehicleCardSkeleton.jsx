import SkeletonBase from './SkeletonBase'

export default function VehicleCardSkeleton() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      {/* Fotoğraf alanı */}
      <SkeletonBase className="h-40 rounded-none" />

      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 space-y-2">
            <SkeletonBase className="h-5 w-32" />
            <SkeletonBase className="h-3 w-24" />
          </div>
          <div className="flex gap-1">
            <SkeletonBase className="w-8 h-8" />
            <SkeletonBase className="w-8 h-8" />
          </div>
        </div>

        <div className="flex gap-4 mb-4">
          <SkeletonBase className="h-3 w-16" />
          <SkeletonBase className="h-3 w-20" />
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <SkeletonBase className="h-12" />
          <SkeletonBase className="h-12" />
          <SkeletonBase className="h-12" />
          <SkeletonBase className="h-12" />
        </div>

        <SkeletonBase className="h-9" />
      </div>
    </div>
  )
}