import { FileText, ShieldCheck } from 'lucide-react'
import { NAVIGATION_DESTINATIONS } from './navConstants.js'
import { cn } from '../../lib/utils.js'

export function DesktopSidebar({ activeTab, onNavigate }) {
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 transition-colors">
      {/* Brand Header */}
      <div className="flex items-center gap-3 h-16 px-6 border-b border-slate-100 dark:border-slate-800/80">
        <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <span className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Resume Studio
          </span>
          <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
            Local-First PWA
          </p>
        </div>
      </div>

      {/* Navigation Items */}
      <nav aria-label="Desktop Navigation" className="flex-1 px-3 py-6 space-y-1.5">
        {NAVIGATION_DESTINATIONS.map((dest) => {
          const Icon = dest.icon
          const isActive = activeTab === dest.id

          return (
            <button
              key={dest.id}
              type="button"
              onClick={() => onNavigate(dest.id)}
              className={cn(
                'flex items-center gap-3.5 w-full min-h-[44px] px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 shrink-0',
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-400 dark:text-slate-500'
                )}
                aria-hidden="true"
              />
              <span>{dest.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Privacy Guarantee Box */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800/80">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span className="text-xs font-semibold">100% Private & Offline</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
            All variants and PDFs are stored locally in IndexedDB. Zero external tracking.
          </p>
        </div>
      </div>
    </aside>
  )
}
