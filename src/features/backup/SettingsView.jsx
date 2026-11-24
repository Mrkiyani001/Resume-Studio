import { useState, useEffect } from 'react'
import {
  Settings,
  Moon,
  Sun,
  Laptop,
  HardDrive,
  Download,
  Upload,
  AlertTriangle,
  ShieldCheck,
  FileArchive,
  FileJson,
  RefreshCw,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Badge } from '../../components/ui/Badge.jsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx'
import { useThemeContext } from '../../app/themeContext.js'
import { useToast } from '../../hooks/useToast.js'
import { db } from '../../database/db.js'
import { INITIAL_VARIANTS } from '../../database/seeds/initialVariants.js'
import { exportJsonBackup, exportCompleteZipBackup } from './backupService.js'
import { RestoreModal } from './RestoreModal.jsx'

export function SettingsView() {
  const { theme, setTheme } = useThemeContext()
  const { showToast } = useToast()

  const [storageEstimate, setStorageEstimate] = useState(null)
  const [isPersisted, setIsPersisted] = useState(false)
  const [isExportingJson, setIsExportingJson] = useState(false)
  const [isExportingZip, setIsExportingZip] = useState(false)
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false)
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  // Load storage usage and persistence
  const checkStorage = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.storage) {
        if (navigator.storage.estimate) {
          const estimate = await navigator.storage.estimate()
          setStorageEstimate(estimate)
        }
        if (navigator.storage.persisted) {
          const persisted = await navigator.storage.persisted()
          setIsPersisted(persisted)
        }
      }
    } catch {
      // Ignore estimation errors in restricted sandboxes
    }
  }

  useEffect(() => {
    let isMounted = true
    async function loadInitialStorage() {
      try {
        if (typeof navigator !== 'undefined' && navigator.storage) {
          if (navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate()
            if (isMounted) setStorageEstimate(estimate)
          }
          if (navigator.storage.persisted) {
            const persisted = await navigator.storage.persisted()
            if (isMounted) setIsPersisted(persisted)
          }
        }
      } catch {
        // Ignore
      }
    }
    loadInitialStorage()
    return () => {
      isMounted = false
    }
  }, [])

  const handleRequestPersistence = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
        const granted = await navigator.storage.persist()
        setIsPersisted(granted)
        if (granted) {
          showToast('Persistent local storage granted by browser.', 'success')
        } else {
          showToast('Browser retained default storage policy.', 'info')
        }
      }
    } catch (err) {
      showToast(err.message || 'Could not request persistence', 'error')
    }
  }

  const handleExportJson = async () => {
    setIsExportingJson(true)
    try {
      await exportJsonBackup(db)
      showToast('JSON backup exported successfully.', 'success')
    } catch (err) {
      showToast(err.message || 'Failed to export JSON backup', 'error')
    } finally {
      setIsExportingJson(false)
    }
  }

  const handleExportZip = async () => {
    setIsExportingZip(true)
    try {
      await exportCompleteZipBackup(db)
      showToast('Complete ZIP backup with all PDF Blobs exported.', 'success')
    } catch (err) {
      showToast(err.message || 'Failed to export ZIP backup', 'error')
    } finally {
      setIsExportingZip(false)
    }
  }

  const handleResetDatabase = async () => {
    setIsResetting(true)
    try {
      await db.transaction('rw', [db.variants, db.applications, db.archivedPdfs, db.settings], async () => {
        await db.variants.clear()
        await db.applications.clear()
        await db.archivedPdfs.clear()
        await db.settings.clear()
        await db.variants.bulkAdd(INITIAL_VARIANTS)
      })
      showToast('Database reset to defaults with initial variants seeded.', 'success')
      setIsResetConfirmOpen(false)
      checkStorage()
    } catch (err) {
      showToast(err.message || 'Failed to reset database', 'error')
    } finally {
      setIsResetting(false)
    }
  }

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 KB'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Settings className="h-6 w-6 text-slate-700 dark:text-slate-300" />
          Backup & Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Local-first data management, appearance preferences, storage persistence, and full backups.
        </p>
      </div>

      {/* Theme Preference */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance Theme</CardTitle>
          <CardDescription>
            Choose your preferred color theme or follow your device system preference.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant={theme === 'light' ? 'primary' : 'outline'}
              leftIcon={Sun}
              onClick={() => setTheme('light')}
            >
              Light
            </Button>
            <Button
              variant={theme === 'dark' ? 'primary' : 'outline'}
              leftIcon={Moon}
              onClick={() => setTheme('dark')}
            >
              Dark
            </Button>
            <Button
              variant={theme === 'system' ? 'primary' : 'outline'}
              leftIcon={Laptop}
              onClick={() => setTheme('system')}
            >
              System
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Storage & Persistence */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              <CardTitle>Local Storage & Persistence</CardTitle>
            </div>
            <Badge variant={isPersisted ? 'success' : 'neutral'}>
              {isPersisted ? 'Persistent' : 'Best-Effort'}
            </Badge>
          </div>
          <CardDescription>
            Resume Studio stores 100% of your data locally in your browser&apos;s IndexedDB. No external servers or telemetry.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs sm:text-sm">
            <div>
              <span className="text-slate-500 dark:text-slate-400">IndexedDB Usage:</span>{' '}
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {storageEstimate?.usage ? formatBytes(storageEstimate.usage) : 'Calculating...'}
              </span>
              {storageEstimate?.quota ? (
                <span className="text-slate-400 text-xs ml-1">
                  (of {formatBytes(storageEstimate.quota)} browser quota)
                </span>
              ) : null}
            </div>
            <Button variant="ghost" size="sm" leftIcon={RefreshCw} onClick={checkStorage}>
              Refresh
            </Button>
          </div>

          {!isPersisted && (
            <div className="flex items-center justify-between p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Storage is currently best-effort. Under heavy disk pressure, your browser may evict storage.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                leftIcon={ShieldCheck}
                onClick={handleRequestPersistence}
                className="shrink-0 ml-3"
              >
                Request Persistence
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backup & Export Services */}
      <Card>
        <CardHeader>
          <CardTitle>Data Backup & Archive Export</CardTitle>
          <CardDescription>
            Export and save your resume variants, tailored applications, and generated PDF binaries.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <FileJson className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    JSON Backup (Data Only)
                  </h4>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Lightweight export containing all resume variants, application records, and revision metadata.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                leftIcon={Download}
                loading={isExportingJson}
                onClick={handleExportJson}
                className="w-full"
              >
                Export JSON
              </Button>
            </div>

            <div className="p-4 rounded-lg border border-primary-200 dark:border-primary-900/40 bg-primary-50/30 dark:bg-primary-950/20 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <FileArchive className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Complete ZIP Backup (Data + PDFs)
                  </h4>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Full standalone archive bundling JSON metadata plus every archived PDF binary Blob.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                leftIcon={Download}
                loading={isExportingZip}
                onClick={handleExportZip}
                className="w-full"
              >
                Export Complete ZIP
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Restore Backup */}
      <Card>
        <CardHeader>
          <CardTitle>Restore from Backup</CardTitle>
          <CardDescription>
            Restore your library from a previously exported `.json` or `.zip` backup file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Supports both <strong>Merge (Safe)</strong> to add incoming items alongside existing ones and <strong>Replace All</strong> to restore an exact snapshot.
          </p>
          <Button
            variant="outline"
            leftIcon={Upload}
            onClick={() => setIsRestoreModalOpen(true)}
          >
            Restore Backup File
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone: Reset Database */}
      <Card className="border-red-200 dark:border-red-950/60 bg-red-50/20 dark:bg-red-950/10">
        <CardHeader>
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
            <CardTitle>Danger Zone: Reset Database</CardTitle>
          </div>
          <CardDescription>
            Erase all local applications, customized variants, and archived PDF binaries. Default master variants will be re-seeded.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setIsResetConfirmOpen(true)}
          >
            Reset Database to Defaults
          </Button>
        </CardContent>
      </Card>

      {/* Restore Modal */}
      <RestoreModal
        isOpen={isRestoreModalOpen}
        onClose={() => setIsRestoreModalOpen(false)}
        onRestoreSuccess={() => {
          checkStorage()
        }}
      />

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        title="Reset Entire Database?"
        message="This action cannot be undone. All custom applications, variants, and archived PDF Blobs will be permanently deleted. Initial template variants will be re-seeded."
        confirmText="Yes, Reset Database"
        confirmVariant="danger"
        isLoading={isResetting}
        onConfirm={handleResetDatabase}
        onCancel={() => setIsResetConfirmOpen(false)}
      />
    </div>
  )
}
