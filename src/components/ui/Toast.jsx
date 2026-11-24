import { useState, useCallback } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { ToastContext } from './ToastContext.js'
import { cn } from '../../lib/utils.js'

let toastIdCounter = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    ({ type = 'info', message, duration = 3500 }) => {
      const id = ++toastIdCounter
      const newToast = { id, type, message }

      setToasts((prev) => [...prev, newToast])

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id)
        }, duration)
      }
      return id
    },
    [removeToast]
  )

  const toast = {
    success: (msg, dur) => addToast({ type: 'success', message: msg, duration: dur }),
    error: (msg, dur) => addToast({ type: 'error', message: msg, duration: dur }),
    info: (msg, dur) => addToast({ type: 'info', message: msg, duration: dur }),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast Notification Container */}
      <div
        aria-live="assertive"
        className="fixed bottom-20 sm:bottom-6 right-4 left-4 sm:left-auto sm:w-96 z-50 flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            className={cn(
              'pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-xl border shadow-lg backdrop-blur-md transition-all duration-200 animate-in slide-in-from-bottom-3',
              t.type === 'success' &&
                'bg-emerald-50/95 text-emerald-900 border-emerald-200 dark:bg-emerald-950/90 dark:text-emerald-100 dark:border-emerald-800',
              t.type === 'error' &&
                'bg-red-50/95 text-red-900 border-red-200 dark:bg-red-950/90 dark:text-red-100 dark:border-red-800',
              t.type === 'info' &&
                'bg-slate-900/95 text-white border-slate-700 dark:bg-slate-800/95 dark:text-slate-100 dark:border-slate-600'
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {t.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
              {t.type === 'error' && <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />}
              {t.type === 'info' && <Info className="h-4 w-4 text-blue-400 shrink-0" />}
              <span className="text-xs font-medium truncate">{t.message}</span>
            </div>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="h-7 w-7 min-h-[28px] min-w-[28px] flex items-center justify-center rounded-md opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
