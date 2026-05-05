export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="text-center py-16 px-6 bg-slate-900/50 rounded-xl border border-dashed border-slate-700">
      {Icon && (
        <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Icon className="w-8 h-8 text-slate-500" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      {description && (
        <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">{description}</p>
      )}
      {action}
    </div>
  )
}