import { useState, useEffect } from 'react'
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { seedInitialVariantsIfEmpty } from '../database/variantRepository.js'
import { AppHeader } from '../components/layout/AppHeader.jsx'
import { BottomNav } from '../components/layout/BottomNav.jsx'
import { DesktopSidebar } from '../components/layout/DesktopSidebar.jsx'
import { ResumeLibraryView } from '../features/resume-library/ResumeLibraryView.jsx'
import { ApplicationsView } from '../features/applications/ApplicationsView.jsx'
import { NewApplicationView } from '../features/applications/NewApplicationView.jsx'
import { SettingsView } from '../features/backup/SettingsView.jsx'
import { ResumeEditorView } from '../features/resume-editor/ResumeEditorView.jsx'
import { Button } from '../components/ui/Button.jsx'

export function App() {
  const [activeTab, setActiveTab] = useState('my-resumes')
  const [isInitializing, setIsInitializing] = useState(true)
  const [initError, setInitError] = useState(null)

  // Editor Target Session: null | { type: 'variant' | 'application', id: string }
  const [editorTarget, setEditorTarget] = useState(null)
  // Preselected variant for New Application creation
  const [preselectedVariantId, setPreselectedVariantId] = useState('')

  useEffect(() => {
    let isMounted = true
    seedInitialVariantsIfEmpty()
      .then(() => {
        if (isMounted) setIsInitializing(false)
      })
      .catch((err) => {
        if (isMounted) {
          setInitError(err.message || 'Failed to initialize local IndexedDB storage.')
          setIsInitializing(false)
        }
      })
    return () => {
      isMounted = false
    }
  }, [])

  function handleRetry() {
    setIsInitializing(true)
    setInitError(null)
    seedInitialVariantsIfEmpty()
      .then(() => setIsInitializing(false))
      .catch((err) => {
        setInitError(err.message || 'Failed to initialize local IndexedDB storage.')
        setIsInitializing(false)
      })
  }

  function handleOpenVariant(variantId) {
    setEditorTarget({ type: 'variant', id: variantId })
  }

  function handleCreateApplicationFromVariant(variantId) {
    setPreselectedVariantId(variantId)
    setEditorTarget(null)
    setActiveTab('new-application')
  }

  function handleOpenApplication(applicationId) {
    setEditorTarget({ type: 'application', id: applicationId })
  }

  function handleBackFromEditor() {
    setEditorTarget(null)
  }

  function handleNavigate(tabId) {
    setEditorTarget(null)
    setActiveTab(tabId)
  }

  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6">
        <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white mb-4 shadow-md animate-pulse">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <h2 className="text-base font-semibold">Initializing Resume Studio</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Setting up local IndexedDB database & variants...
        </p>
      </div>
    )
  }

  if (initError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6 text-center max-w-md mx-auto">
        <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold">Database Storage Error</h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 mb-6 leading-relaxed">
          {initError}. Please verify your browser allows local storage or IndexedDB.
        </p>
        <Button variant="primary" leftIcon={RefreshCw} onClick={handleRetry}>
          Retry Initialization
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-x-hidden transition-colors flex flex-col">
      {/* Desktop Sidebar (hidden when in active editor session) */}
      {!editorTarget && (
        <DesktopSidebar activeTab={activeTab} onNavigate={handleNavigate} />
      )}

      {/* Main Column */}
      <div className={`flex-1 flex flex-col ${editorTarget ? 'w-full' : 'md:pl-64'} min-w-0`}>
        {!editorTarget && <AppHeader onNavigate={handleNavigate} />}

        {/* View Container */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-6 pb-24 md:pb-10 min-w-0">
          {editorTarget ? (
            <ResumeEditorView
              target={editorTarget}
              onBack={handleBackFromEditor}
            />
          ) : (
            <>
              {activeTab === 'my-resumes' && (
                <ResumeLibraryView
                  onOpenVariant={handleOpenVariant}
                  onCreateApplication={handleCreateApplicationFromVariant}
                />
              )}
              {activeTab === 'applications' && (
                <ApplicationsView
                  onOpenApplication={handleOpenApplication}
                  onNavigate={handleNavigate}
                />
              )}
              {activeTab === 'new-application' && (
                <NewApplicationView
                  preselectedVariantId={preselectedVariantId}
                  onOpenApplication={handleOpenApplication}
                  onNavigate={handleNavigate}
                />
              )}
              {activeTab === 'settings' && (
                <SettingsView onNavigate={handleNavigate} />
              )}
            </>
          )}
        </main>

        {/* Mobile Sticky Bottom Navigation (hidden when in active editor session) */}
        {!editorTarget && (
          <BottomNav activeTab={activeTab} onNavigate={handleNavigate} />
        )}
      </div>
    </div>
  )
}

export default App
