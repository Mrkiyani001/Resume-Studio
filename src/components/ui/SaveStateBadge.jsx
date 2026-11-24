import { CheckCircle2, Loader2, WifiOff, AlertCircle } from 'lucide-react'
import { cn } from '../../lib/utils.js'

/**
 * Visual Save State Indicator for the Resume Editor Sticky Header.
 * 
 * Strict Specification Rule:
 * Never show "Saved" before Dexie IndexedDB commit succeeds.
 * 
 * States: 'saving' | 'saved' | 'offline' | 'error' | 'idle'
 */
export function SaveStateBadge({ state = 'idle', className }) {
  if (state === 'idle') {
    return null
  }

  const configs = {
    saving: {
      label: 'Saving...',
      icon: Loader2,
      spin: true,
      className:
        'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900',
    },
    saved: {
      label: 'Saved',
      icon: CheckCircle2,
      spin: false,
      className:
        'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900',
    },
    offline: {
      label: 'Offline (Local)',
      icon: WifiOff,
      spin: false,
      className:
        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900',
    },
    error: {
      label: 'Save failed',
      icon: AlertCircle,
      spin: false,
      className:
        'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-900',
    },
    'save-failed': {
      label: 'Save failed',
      icon: AlertCircle,
      spin: false,
      className:
        'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-900',
    },
  }

  const current = configs[state] || configs.saved
  const IconComponent = current.icon

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border select-none transition-all duration-200 whitespace-nowrap shrink-0',
        current.className,
        className
      )}
    >
      <IconComponent
        className={cn('h-3.5 w-3.5 shrink-0', current.spin && 'animate-spin')}
        aria-hidden="true"
      />
      <span>{current.label}</span>
    </div>
  )
}
