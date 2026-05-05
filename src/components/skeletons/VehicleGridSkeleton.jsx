import VehicleCardSkeleton from './VehicleCardSkeleton'

export default function VehicleGridSkeleton() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <div className="h-8 w-32 bg-slate-800/60 rounded-lg animate-pulse" />
          <div className="h-4 w-24 bg-slate-800/60 rounded-lg animate-pulse" />
        </div>
        <div className="h-10 w-28 bg-slate-800/60 rounded-lg animate-pulse" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <VehicleCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}