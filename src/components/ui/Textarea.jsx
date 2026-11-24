import { forwardRef, useId } from 'react'
import { cn } from '../../lib/utils.js'

/**
 * Accessible Multiline Textarea with label, error text, and helper description.
 */
export const Textarea = forwardRef(function Textarea(
  {
    label,
    error,
    helperText,
    id,
    name,
    rows = 4,
    className,
    disabled = false,
    required = false,
    ...props
  },
  ref
) {
  const generatedId = useId()
  const textareaId = id || generatedId
  const errorId = `${textareaId}-error`
  const helperId = `${textareaId}-helper`

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={textareaId}
          className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </span>
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        name={name}
        rows={rows}
        disabled={disabled}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        className={cn(
          'w-full min-h-[80px] rounded-lg border px-3.5 py-2.5 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed resize-y',
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
