import { cn } from '../../lib/utils.js'

export function Badge({ children, variant = 'default', className, ...props }) {
  const variantStyles = {
    default:
      'border-transparent bg-slate-900 text-slate-50 dark:bg-slate-50 dark:text-slate-900',
    secondary:
      'border-transparent bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100',
    outline:
      'border border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300',
    success:
      'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
    warning:
      'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
    destructive:
      'border-transparent bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300',
    blue:
      'border-transparent bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
  }

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors select-none',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
