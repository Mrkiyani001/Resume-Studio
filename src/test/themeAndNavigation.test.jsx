import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AppProviders } from '../app/providers.jsx'
import { useThemeContext } from '../app/themeContext.js'
import Root from '../App.jsx'
import { db } from '../database/db.js'

function ThemeTestComponent() {
  const { theme, setTheme, resolvedTheme } = useThemeContext()
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <span data-testid="resolved-theme">{resolvedTheme}</span>
      <button type="button" onClick={() => setTheme('dark')}>
        Set Dark
      </button>
      <button type="button" onClick={() => setTheme('light')}>
        Set Light
      </button>
    </div>
  )
}

describe('Theme Management & Navigation Frame', () => {
  beforeEach(async () => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    await db.variants.clear()
    await db.applications.clear()
    await db.archivedPdfs.clear()
  })

  it('manages theme states and updates document classList', () => {
    render(
      <AppProviders>
        <ThemeTestComponent />
      </AppProviders>
    )

    const darkBtn = screen.getByRole('button', { name: /set dark/i })
    fireEvent.click(darkBtn)

    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark')
    expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('resume_studio_theme')).toBe('dark')

    const lightBtn = screen.getByRole('button', { name: /set light/i })
    fireEvent.click(lightBtn)

    expect(screen.getByTestId('current-theme')).toHaveTextContent('light')
    expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('resume_studio_theme')).toBe('light')
  })

  it('initializes application and navigates seamlessly across all 4 destinations', async () => {
    render(<Root />)

    // Wait for initialization to complete and My Resumes view to appear
    const myResumesHeading = await screen.findByRole('heading', {
      name: /my resumes/i,
    })
    expect(myResumesHeading).toBeInTheDocument()

    // 1. Navigate to Applications (via Desktop sidebar or Mobile nav)
    const appsButtons = screen.getAllByRole('button', { name: /applications/i })
    fireEvent.click(appsButtons[0])

    expect(
      await screen.findByRole('heading', { level: 1, name: /^applications archive$/i })
    ).toBeInTheDocument()

    // 2. Navigate to New Application
    const newAppButtons = screen.getAllByRole('button', { name: /new app/i })
    fireEvent.click(newAppButtons[0])

    expect(
      await screen.findByRole('heading', { level: 1, name: /^create new application$/i })
    ).toBeInTheDocument()

    // 3. Navigate to Settings
    const settingsButtons = screen.getAllByRole('button', { name: /settings/i })
    fireEvent.click(settingsButtons[0])

    expect(
      await screen.findByRole('heading', { level: 1, name: /^backup & settings$/i })
    ).toBeInTheDocument()

    // 4. Return to My Resumes
    const resumesButtons = screen.getAllByRole('button', { name: /my resumes/i })
    fireEvent.click(resumesButtons[0])

    expect(
      await screen.findByRole('heading', { level: 1, name: /^my resumes$/i })
    ).toBeInTheDocument()
  })
})
