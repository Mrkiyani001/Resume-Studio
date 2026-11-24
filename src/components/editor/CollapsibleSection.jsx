import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils.js'

/**
 * Reusable, mobile-first collapsible section primitive for the Resume Editor.
 * Enforces zero horizontal overflow and minimum 44px touch target on mobile viewports.
 *
 * @param {Object} props
 * @param {string} props.id Unique section identifier for accessibility
 * @param {string} props.title Section heading
 * @param {any} [props.icon] Optional Lucide icon component
 * @param {React.ReactNode} [props.badge] Optional badge or counter chip
 * @param {React.ReactNode} [props.action] Optional right-aligned header action
 * @param {boolean} [props.defaultOpen=true] Whether section begins expanded
 * @param {React.ReactNode} props.children Content inside collapsible container
 * @param {string} [props.className] Additional styles
 */
export function CollapsibleSection({
  id,
  title,
  icon: Icon,
  badge,
  action,
  defaultOpen = true,
  children,
  className,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const contentId = `${id}-content`

  return (
    <section
      id={id}
      className={cn(
        'w-full rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs overflow-hidden transition-all',
        className
      )}
    >
      {/* Header Bar — Responsive 2-row on mobile when action is present, single row on desktop */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 p-3 sm:px-6 sm:py-4 bg-slate-50/50 dark:bg-slate-900/50 select-none">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-controls={contentId}
          className="w-full sm:flex-1 flex items-center justify-between gap-2.5 min-h-[44px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg group min-w-0"
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            {Icon && (
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
              </div>
            )}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                {title}
              </h3>
              {badge && <div className="shrink-0">{badge}</div>}
            </div>
          </div>

          <div className="h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors shrink-0">
            <ChevronDown
              className={cn(
                'h-5 w-5 transition-transform duration-200',
                isOpen && 'rotate-180'
              )}
              aria-hidden="true"
            />
          </div>
        </button>

        {action && (
          <div className="flex items-center justify-end sm:justify-start shrink-0 pl-10.5 sm:pl-0 pt-0.5 sm:pt-0">
            {action}
          </div>
        )}
      </div>

      {/* Collapsible Body */}
      {isOpen && (
        <div
          id={contentId}
          className="px-3.5 sm:px-6 py-4 sm:py-5 border-t border-slate-100 dark:border-slate-800/80 space-y-4 sm:space-y-5"
        >
          {children}
        </div>
      )}
    </section>
  )
}
