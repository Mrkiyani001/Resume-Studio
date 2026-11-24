import { NAVIGATION_DESTINATIONS } from './navConstants.js'
import { cn } from '../../lib/utils.js'

export function BottomNav({ activeTab, onNavigate }) {
  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 transition-colors select-none"
    >
      <div className="grid grid-cols-4 h-16 items-center px-1 max-w-md mx-auto">
        {NAVIGATION_DESTINATIONS.map((dest) => {
          const Icon = dest.icon
          const isActive = activeTab === dest.id

          return (
            <button
              key={dest.id}
              type="button"
              onClick={() => onNavigate(dest.id)}
              className={cn(
                'flex flex-col items-center justify-center min-h-[44px] h-full w-full py-1 gap-1 transition-colors relative group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg',
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 transition-transform duration-150',
                  isActive ? 'scale-110' : 'group-hover:scale-105'
                )}
                aria-hidden="true"
              />
              <span className="text-[10px] leading-tight tracking-tight">
                {dest.label}
              </span>
              {isActive && (
                <span className="absolute top-1.5 h-1 w-6 rounded-full bg-blue-600 dark:bg-blue-400" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
