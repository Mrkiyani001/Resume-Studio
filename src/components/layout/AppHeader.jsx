import { Sun, Moon, Laptop, FileText } from 'lucide-react'
import { useThemeContext } from '../../app/themeContext.js'

export function AppHeader({ onNavigate }) {
  const { theme, setTheme } = useThemeContext()

  function cycleTheme() {
    if (theme === 'system') setTheme('light')
    else if (theme === 'light') setTheme('dark')
    else setTheme('system')
  }

  const themeIcon =
    theme === 'dark' ? (
      <Moon className="h-4 w-4 text-blue-400" />
    ) : theme === 'light' ? (
      <Sun className="h-4 w-4 text-amber-500" />
    ) : (
      <Laptop className="h-4 w-4 text-slate-400" />
    )

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80 transition-colors">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6 max-w-7xl mx-auto">
        {/* Brand */}
        <button
          type="button"
          onClick={() => onNavigate?.('my-resumes')}
          className="flex items-center gap-2.5 text-left focus:outline-none group select-none min-h-[44px]"
        >
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm group-hover:bg-blue-700 transition-colors">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              Resume Studio
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.2 bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 rounded">
                PWA
              </span>
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-none hidden sm:block">
              Local-first resume variant manager
            </p>
          </div>
        </button>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {/* Quick theme cycle button */}
          <button
            type="button"
            onClick={cycleTheme}
            title={`Theme: ${theme} (click to cycle)`}
            aria-label={`Current theme is ${theme}. Click to switch theme.`}
            className="h-11 w-11 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {themeIcon}
          </button>
        </div>
      </div>
    </header>
  )
}
