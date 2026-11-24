import { useId } from 'react'
import { cn } from '../../lib/utils.js'

/**
 * Accessible Toggle Switch primitive.
 * Guarantees a minimum 44px touch target for mobile-first usage.
 */
export function ToggleSwitch({
  id,
  checked = false,
  onChange,
  label,
  description,
  disabled = false,
  className,
}) {
  const generatedId = useId()
  const switchId = id || generatedId

  function handleToggle() {
    if (!disabled && onChange) {
      onChange(!checked)
    }
  }

  return (
    <div className={cn('flex items-center justify-between gap-3 min-h-[44px] select-none', className)}>
      {(label || description) && (
        <label htmlFor={switchId} className="flex flex-col cursor-pointer flex-1">
          {label && (
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {label}
            </span>
          )}
          {description && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {description}
            </span>
          )}
        </label>
      )}

      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={handleToggle}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          checked
            ? 'bg-blue-600 dark:bg-blue-500'
            : 'bg-slate-300 dark:bg-slate-700'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  )
}
