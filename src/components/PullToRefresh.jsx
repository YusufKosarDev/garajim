import { RefreshCw, ArrowDown } from 'lucide-react'
import { usePullToRefresh } from '../hooks/usePullToRefresh'

export default function PullToRefresh({ children, onRefresh, enabled = true }) {
  const { pullDistance, isPulling, isRefreshing, threshold, handlers } = usePullToRefresh({
    onRefresh,
    enabled,
  })

  const progress = Math.min(pullDistance / threshold, 1)
  const isReady = pullDistance >= threshold

  return (
    <div className="relative" {...handlers}>
      {/* Pull indicator */}
      {(isPulling || isRefreshing) && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center pointer-events-none z-10"
          style={{
            height: `${pullDistance}px`,
            transition: isPulling ? 'none' : 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <div className="flex flex-col items-center justify-center gap-1.5">
            {isRefreshing ? (
              <>
                <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
                <span className="text-[10px] text-slate-400 font-semibold">Yenileniyor...</span>
              </>
            ) : (
              <>
                <ArrowDown
                  className={`w-6 h-6 transition-all ${
                    isReady ? 'text-blue-400 rotate-180' : 'text-slate-500'
                  }`}
                  style={{
                    transform: `rotate(${isReady ? 180 : progress * 180}deg)`,
                  }}
                />
                <span className={`text-[10px] font-semibold transition ${
                  isReady ? 'text-blue-400' : 'text-slate-500'
                }`}>
                  {isReady ? 'Bırak yenilensin' : 'Yenilemek için çek'}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* İçerik (yukarı doğru itilir) */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {children}
      </div>
    </div>
  )
}