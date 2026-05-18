import { useEffect } from 'react'
import { useStore } from '../store'

export function Toast() {
  const { toast, clearToast } = useStore()

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(clearToast, 4000)
    return () => clearTimeout(t)
  }, [toast, clearToast])

  if (!toast) return null

  const bg   = toast.type === 'error' ? 'bg-red-950 border-red-700'   : 'bg-green-950 border-green-700'
  const text = toast.type === 'error' ? 'text-red-300'                 : 'text-green-300'

  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border ${bg} shadow-xl`}>
      <span className={`text-sm ${text}`}>{toast.message}</span>
      <button onClick={clearToast} className="text-slate-400 hover:text-slate-200 text-lg leading-none">×</button>
    </div>
  )
}
