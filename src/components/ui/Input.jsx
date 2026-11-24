import { forwardRef, useId } from 'react'
import { cn } from '../../lib/utils.js'

/**
 * Accessible Input field with label, error text, and helper description.
 */
export const Input = forwardRef(function Input(
  {
    label,
    error,
    helperText,
    id,
    name,
    type = 'text',
    className,
    disabled = false,
    required = false,
    ...props
  },
  ref
) {
  const generatedId = useId()
  const inputId = id || generatedId
  const errorId = `${inputId}-error`
  const helperId = `${inputId}-helper`

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </span>
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        name={name}
        type={type}
        disabled={disabled}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        className={cn(
          'w-full min-h-[44px] rounded-lg border px-3.5 py-2.5 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed',
          error
            ? 'border-red-500 focus-visible:ring-red-500'
            : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600',
          className
        )}
        {...props}
      />
      {error ? (
        <p id={errorId} className="text-xs text-red-600 dark:text-red-400 font-medium">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-xs text-slate-500 dark:text-slate-400">
          {helperText}
        </p>
      ) : null}
    </div>
  )
})
