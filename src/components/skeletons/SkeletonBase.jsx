export default function SkeletonBase({ className = '', children }) {
  return (
    <div className={`animate-pulse bg-slate-800/60 rounded-lg ${className}`}>
      {children}
    </div>
  )
}