import { useTheme } from '../hooks/useTheme.js'
import { ThemeContext } from './themeContext.js'
import { ToastProvider } from '../components/ui/Toast.jsx'

export function ThemeProvider({ children }) {
  const themeProps = useTheme()
  return (
    <ThemeContext.Provider value={themeProps}>
      {children}
    </ThemeContext.Provider>
  )
}

export function AppProviders({ children }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </ThemeProvider>
  )
}
