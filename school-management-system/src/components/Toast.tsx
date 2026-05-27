import { useEffect, useRef, useState } from 'react'
import { CheckCircle, WifiOff, AlertTriangle, Info, X, RefreshCw } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'sync'

export interface ToastItem {
  id:      string
  type:    ToastType
  title:   string
  message?: string
  duration?: number
}

// ── Global store (no Zustand needed — simple module-level state) ──────────────
let listeners: ((toasts: ToastItem[]) => void)[] = []
let toastList: ToastItem[] = []

function notify() {
  listeners.forEach(fn => fn([...toastList]))
}

export const toast = {
  show(type: ToastType, title: string, message?: string, duration = 4000) {
    const id = Math.random().toString(36).slice(2)
    toastList = [...toastList, { id, type, title, message, duration }]
    notify()
    if (duration > 0) setTimeout(() => toast.dismiss(id), duration)
    return id
  },
  success(title: string, message?: string, duration = 4000) {
    return this.show('success', title, message, duration)
  },
  error(title: string, message?: string, duration = 5000) {
    return this.show('error', title, message, duration)
  },
  warning(title: string, message?: string, duration = 5000) {
    return this.show('warning', title, message, duration)
  },
  info(title: string, message?: string, duration = 4000) {
    return this.show('info', title, message, duration)
  },
  sync(title: string, message?: string) {
    return this.show('sync', title, message, 3500)
  },
  dismiss(id: string) {
    toastList = toastList.filter(t => t.id !== id)
    notify()
  },
}

// ── Individual toast card ─────────────────────────────────────────────────────
const CFG: Record<ToastType, { bg: string; border: string; icon: React.ReactNode; textColor: string }> = {
  success: {
    bg: 'bg-white', border: 'border-emerald-200',
    icon: <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />,
    textColor: 'text-emerald-700',
  },
  error: {
    bg: 'bg-white', border: 'border-red-200',
    icon: <WifiOff size={16} className="text-red-500 flex-shrink-0" />,
    textColor: 'text-red-700',
  },
  warning: {
    bg: 'bg-white', border: 'border-amber-200',
    icon: <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />,
    textColor: 'text-amber-700',
  },
  info: {
    bg: 'bg-white', border: 'border-blue-200',
    icon: <Info size={16} className="text-blue-500 flex-shrink-0" />,
    textColor: 'text-blue-700',
  },
  sync: {
    bg: 'bg-white', border: 'border-indigo-200',
    icon: <RefreshCw size={15} className="text-indigo-500 flex-shrink-0 animate-spin" style={{ animationDuration: '1.5s' }} />,
    textColor: 'text-indigo-700',
  },
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false)
  const cfg = CFG[item.type]

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg shadow-black/5 w-72 transition-all duration-300 ${cfg.bg} ${cfg.border} ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}
      style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
    >
      <span className="mt-0.5">{cfg.icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${cfg.textColor}`}>{item.title}</p>
        {item.message && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.message}</p>}
      </div>
      <button onClick={onDismiss} className="p-0.5 text-slate-300 hover:text-slate-500 flex-shrink-0 mt-0.5">
        <X size={13} />
      </button>
    </div>
  )
}

// ── Toast container — mount once in App.tsx ───────────────────────────────────
export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    listeners.push(setToasts)
    return () => { listeners = listeners.filter(fn => fn !== setToasts) }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-16 right-4 z-[999] flex flex-col gap-2 no-print pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <ToastCard item={t} onDismiss={() => toast.dismiss(t.id)} />
        </div>
      ))}
    </div>
  )
}
