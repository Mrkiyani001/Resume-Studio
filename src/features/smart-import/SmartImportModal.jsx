import { useState, useRef } from 'react'
import {
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Plus,
  Briefcase,
  GraduationCap,
  RotateCcw,
} from 'lucide-react'
import { Modal } from '../../components/ui/Modal.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Input } from '../../components/ui/Input.jsx'
import { Badge } from '../../components/ui/Badge.jsx'
import { parseImportFile } from './importParser.js'
import { createVariant } from '../../database/variantRepository.js'
import { useToast } from '../../hooks/useToast.js'

/**
 * Mobile-First Smart Import Modal.
 *
 * Requirements:
 * - Supports .docx (via Mammoth) and selectable-text .pdf (via pdfjs-dist)
 * - Detects scanned PDFs without OCR hallucination
 * - Displays extracted resume fields in a clean review screen
 * - Unassigned Content Tray guarantees zero silent data loss
 * - Saves as a new independent master variant via variantRepository
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Function} props.onImportSuccess Callback receiving the created master variant
 */
export function SmartImportModal({ isOpen, onClose, onImportSuccess }) {
  const [step, setStep] = useState('upload') // 'upload' | 'review'
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [importedData, setImportedData] = useState(null)
  const [unassignedList, setUnassignedList] = useState([])
  const [variantName, setVariantName] = useState('')
  const fileInputRef = useRef(null)
  const toast = useToast()

  function handleReset() {
    setStep('upload')
    setIsProcessing(false)
    setError(null)
    setImportedData(null)
    setUnassignedList([])
    setVariantName('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleFileProcess(file) {
    if (!file) return
    try {
      setIsProcessing(true)
      setError(null)

      const result = await parseImportFile(file)
      setImportedData(result.resumeData)
      setUnassignedList(result.unassignedContent || [])

      const candidateName = result.resumeData.personalInfo?.fullName
      const defaultName = candidateName
        ? `${candidateName} (Imported)`
        : `Imported Resume ${new Date().toLocaleDateString()}`

      setVariantName(defaultName)
      setStep('review')
    } catch (err) {
      console.error('Import processing error:', err)
      setError(err.message || 'Failed to parse resume document.')
    } finally {
      setIsProcessing(false)
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (file) handleFileProcess(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileProcess(file)
  }

  async function handleSaveVariant() {
    if (!importedData) return
    const finalName = variantName.trim() || 'Imported Resume'

    try {
      setIsProcessing(true)
      const newVariant = await createVariant({
        name: finalName,
        resumeData: importedData,
      })
      toast.success(`Created master resume variant "${finalName}"!`)
      onImportSuccess?.(newVariant)
      onClose?.()
      handleReset()
    } catch (err) {
      toast.error(err.message || 'Failed to save imported variant.')
    } finally {
      setIsProcessing(false)
    }
  }

  function handleAppendUnassignedToSummary() {
    if (unassignedList.length === 0 || !importedData) return
    const textToAppend = unassignedList.join('\n\n')
    setImportedData((prev) => ({
      ...prev,
      summary: prev.summary ? `${prev.summary}\n\n${textToAppend}` : textToAppend,
    }))
    setUnassignedList([])
    toast.success('Appended unassigned content to summary!')
  }

  function handleCopyUnassigned() {
    const text = unassignedList.join('\n\n')
    navigator.clipboard?.writeText(text)
    toast.success('Copied unassigned content to clipboard!')
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose?.()
        handleReset()
      }}
      size="xl"
      title="Smart Resume Import"
      description="Import existing .docx or digital .pdf resumes directly into independent master variants."
      footer={
        step === 'upload' ? (
          <div className="flex items-center justify-end w-full">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <Button
              variant="outline"
              size="sm"
              leftIcon={RotateCcw}
              onClick={handleReset}
              disabled={isProcessing}
              className="w-full sm:w-auto"
            >
              Choose Different File
            </Button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button variant="ghost" size="sm" onClick={onClose} disabled={isProcessing} className="flex-1 sm:flex-initial">
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={CheckCircle2}
                loading={isProcessing}
                onClick={handleSaveVariant}
                className="flex-1 sm:flex-initial whitespace-nowrap"
              >
                Save as Master Variant
              </Button>
            </div>
          </div>
        )
      }
    >
      {step === 'upload' ? (
        /* STEP 1: UPLOAD SCREEN */
        <div className="space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
              isProcessing
                ? 'border-blue-400 bg-blue-50/30 dark:bg-blue-950/20 animate-pulse'
                : 'border-slate-300 dark:border-slate-700 hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.pdf,.txt,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="h-14 w-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
              <Upload className="h-7 w-7" />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {isProcessing ? 'Analyzing and classifying document...' : 'Click or drag resume file here'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Supports .docx (recommended for hyperlinks & formatting), text-based .pdf, and .txt
              </p>
            </div>

            <Badge variant="secondary" className="text-[11px] mt-1">
              Zero OCR • 100% Local • Zero Data Sent to Servers
            </Badge>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Import Notice</p>
                <p>{error}</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* STEP 2: REVIEW & SAVE SCREEN */
        <div className="space-y-5">
          <Input
            label="Master Resume Variant Name *"
            placeholder="e.g. Product Design (Imported)"
            value={variantName}
            onChange={(e) => setVariantName(e.target.value)}
            helperText="Every imported resume creates an independent master record with zero shared references."
            required
          />

          {/* Extracted Fields Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-blue-500" />
                Personal Info
              </span>
              <p className="text-slate-900 dark:text-slate-100 font-medium truncate">
                {importedData?.personalInfo?.fullName || 'Candidate'}
              </p>
              <p className="text-slate-500 dark:text-slate-400 truncate">
                {importedData?.personalInfo?.headline || 'Headline'}
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] truncate">
                {[
                  importedData?.personalInfo?.email,
                  importedData?.personalInfo?.phone,
                  importedData?.personalInfo?.location,
                ]
                  .filter(Boolean)
                  .join(' • ')}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-emerald-500" />
                Experience & Skills
              </span>
              <p className="text-slate-800 dark:text-slate-200">
                {importedData?.workExperiences?.length || 0} Work Experience Roles
              </p>
              <p className="text-slate-800 dark:text-slate-200">
                {importedData?.skills?.length || 0} Skill Categories
              </p>
              <p className="text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <GraduationCap className="h-3 w-3 text-purple-500" />
                {importedData?.education?.length || 0} Education Credentials
              </p>
            </div>
          </div>

          {/* Unassigned Content Tray (Zero Silent Data Loss) */}
          {unassignedList.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 space-y-2.5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                    Unassigned Content ({unassignedList.length} items)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    leftIcon={Copy}
                    onClick={handleCopyUnassigned}
                    className="flex-1 sm:flex-initial"
                  >
                    Copy
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="xs"
                    leftIcon={Plus}
                    onClick={handleAppendUnassignedToSummary}
                    className="flex-1 sm:flex-initial whitespace-nowrap"
                  >
                    Append to Summary
                  </Button>
                </div>
              </div>

              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                These paragraphs did not match standard section formats. They are preserved here so zero information is lost:
              </p>

              <div className="max-h-32 overflow-y-auto space-y-1 pr-1 font-mono text-[11px] text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border border-amber-200/80 dark:border-amber-900/60">
                {unassignedList.map((item, idx) => (
                  <p key={idx} className="pb-1 border-b border-slate-100 dark:border-slate-800 last:border-0">
                    {item}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
