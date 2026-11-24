import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils.js'

/**
 * Reusable, accessible, mobile-first Button primitive.
 * Enforces a minimum 44px touch target on mobile viewports.
 */
export const Button = forwardRef(function Button(
  {
    children,
    className,
    variant = 'primary',
    size = 'md',
    type = 'button',
    disabled = false,
    loading = false,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    ...props
  },
  ref
) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-colors select-none rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]'

  const variantStyles = {
    primary:
      'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 shadow-sm',
    secondary:
      'bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
    outline:
      'border border-slate-300 bg-transparent text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800',
    ghost:
      'bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
    danger:
      'bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 shadow-sm',
    link:
      'bg-transparent text-blue-600 hover:underline p-0 h-auto dark:text-blue-400',
  }

  const sizeStyles = {
    sm: 'h-9 px-3 text-xs min-h-[36px]',
    md: 'min-h-[44px] px-4 py-2.5 text-sm',
    lg: 'min-h-[48px] px-6 py-3 text-base',
    icon: 'h-11 w-11 min-h-[44px] min-w-[44px] p-2.5',
  }

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />
      ) : LeftIcon ? (
        <LeftIcon className="h-4 w-4 mr-2 shrink-0" aria-hidden="true" />
      ) : null}
      <span>{children}</span>
      {!loading && RightIcon && (
        <RightIcon className="h-4 w-4 ml-2 shrink-0" aria-hidden="true" />
      )}
    </button>
  )
})
