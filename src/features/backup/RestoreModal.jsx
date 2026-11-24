import { useState, useRef } from 'react'
import {
  Upload,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  FileArchive,
} from 'lucide-react'
import { Modal } from '../../components/ui/Modal.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Badge } from '../../components/ui/Badge.jsx'
import { validateAndInspectBackup, executeRestore } from './restoreService.js'
import { useToast } from '../../hooks/useToast.js'
import { formatDateTime } from '../../lib/dateUtils.js'

/**
 * Validated Restore Modal with Conflict Detection and Preview.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Function} props.onRestoreComplete Callback after successful restore
 */
export function RestoreModal({ isOpen, onClose, onRestoreComplete }) {
  const [step, setStep] = useState('select') // 'select' | 'preview'
  const [inspection, setInspection] = useState(null)
  const [strategy, setStrategy] = useState('replace') // 'replace' | 'merge'
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)
  const toast = useToast()

  function handleReset() {
    setStep('select')
    setInspection(null)
    setStrategy('replace')
    setIsProcessing(false)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleFile(file) {
    if (!file) return
    try {
      setIsProcessing(true)
      setError(null)
      const result = await validateAndInspectBackup(file)
      setInspection(result)
      setStep('preview')
    } catch (err) {
      setError(err.message || 'Failed to inspect backup file.')
    } finally {
      setIsProcessing(false)
    }
  }

  async function handleConfirmRestore() {
    if (!inspection) return
    try {
      setIsProcessing(true)
      const result = await executeRestore({
        backupInspection: inspection,
        strategy,
      })
      toast.success(
        `Restored ${result.restoredVariants} variants, ${result.restoredApplications} applications, and ${result.restoredPdfs} PDF archives!`
      )
      onRestoreComplete?.(result)
      onClose?.()
      handleReset()
    } catch (err) {
      toast.error(err.message || 'Failed to execute restore.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose?.()
        handleReset()
      }}
      size="lg"
      title="Restore Data Backup"
      description="Restore master resumes, applications, and archived PDF Blobs from JSON or complete ZIP backups."
      footer={
        step === 'select' ? (
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        ) : (
          <div className="w-full flex items-center justify-between gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              leftIcon={RotateCcw}
              onClick={handleReset}
              disabled={isProcessing}
            >
              Choose Different Backup
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button
                variant={strategy === 'replace' ? 'danger' : 'primary'}
                size="sm"
                leftIcon={CheckCircle2}
                loading={isProcessing}
                onClick={handleConfirmRestore}
              >
                Confirm Restore ({strategy === 'replace' ? 'Replace All' : 'Merge'})
              </Button>
            </div>
          </div>
        )
      }
    >
      {step === 'select' ? (
        <div className="space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
              isProcessing
                ? 'border-blue-400 bg-blue-50/30 animate-pulse'
                : 'border-slate-300 dark:border-slate-700 hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.zip,application/json,application/zip"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
              }}
            />

            <div className="h-14 w-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
              <Upload className="h-7 w-7" />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {isProcessing ? 'Validating backup file...' : 'Click to select backup file (.json or .zip)'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Supports lightweight .json backups or complete .zip bundles with all binary PDF Blobs
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-xs flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Validation Error</p>
                <p>{error}</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* STEP 2: PREVIEW & CONFIRMATION */
        <div className="space-y-5">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <FileArchive className="h-4 w-4 text-blue-500" />
                Backup Content Preview
              </span>
              <Badge variant={inspection?.type === 'zip' ? 'blue' : 'secondary'} className="text-[10px]">
                {inspection?.type === 'zip' ? 'Complete ZIP Bundle' : 'JSON Backup'}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {inspection?.preview?.variantsCount || 0}
                </p>
                <p className="text-[11px] text-slate-500">Variants</p>
              </div>
              <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {inspection?.preview?.applicationsCount || 0}
                </p>
                <p className="text-[11px] text-slate-500">Applications</p>
              </div>
              <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {inspection?.preview?.archivedPdfsCount || 0}
                </p>
                <p className="text-[11px] text-slate-500">PDF Blobs</p>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Exported on: {formatDateTime(inspection?.preview?.exportedAt)}
            </p>
          </div>

          {/* Strategy Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Restore Strategy
            </label>
            <div className="space-y-2">
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <input
                  type="radio"
                  name="restoreStrategy"
                  value="replace"
                  checked={strategy === 'replace'}
                  onChange={() => setStrategy('replace')}
                  className="mt-0.5"
                />
                <div className="text-xs">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    Replace All Existing Data (Recommended)
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    Clears current database and restores this exact snapshot cleanly.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <input
                  type="radio"
                  name="restoreStrategy"
                  value="merge"
                  checked={strategy === 'merge'}
                  onChange={() => setStrategy('merge')}
                  className="mt-0.5"
                />
                <div className="text-xs">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    Merge / Keep Existing
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    Keeps existing records and inserts non-conflicting backup records.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
