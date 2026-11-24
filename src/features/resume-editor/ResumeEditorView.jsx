import { useState, useEffect, useCallback } from 'react'
import {
  ArrowLeft,
  Sparkles,
  Eye,
  Download,
  Briefcase,
  RotateCcw,
} from 'lucide-react'
import { getVariantById, updateVariant } from '../../database/variantRepository.js'
import {
  getApplicationById,
  updateApplication,
  rollbackApplicationBatch,
} from '../../database/applicationRepository.js'
import { exportResumePdf, generatePdfBlob } from '../pdf-export/exportPipeline.js'
import { sanitizeFilename } from '../../lib/sanitizers.js'
import { cloneResumeData } from '../../models/resumeSchema.js'
import { useDebouncedSave } from '../../hooks/useDebouncedSave.js'
import { useToast } from '../../hooks/useToast.js'
import { Button } from '../../components/ui/Button.jsx'
import { Badge } from '../../components/ui/Badge.jsx'
import { SaveStateBadge } from '../../components/ui/SaveStateBadge.jsx'
import { PersonalInfoSection } from '../../components/editor/PersonalInfoSection.jsx'
import { SummarySection } from '../../components/editor/SummarySection.jsx'
import { WorkExperienceSection } from '../../components/editor/WorkExperienceSection.jsx'
import { SkillsSection } from '../../components/editor/SkillsSection.jsx'
import { EducationSection } from '../../components/editor/EducationSection.jsx'
import { AdditionalSection } from '../../components/editor/AdditionalSection.jsx'
import { BulkChangeModal } from '../bulk-changes/BulkChangeModal.jsx'
import { PdfViewerModal } from '../../components/preview/PdfViewerModal.jsx'

/**
 * Modular Mobile-First Resume Editor View.
 *
 * Requirements:
 * - Single source of truth: strictly decoupled resumeData
 * - Auto-saves via useDebouncedSave (Dexie transaction resolution required before showing "Saved")
 * - Flushes changes cleanly on back navigation or unmount
 * - Sticky top header with Back, Title, Company badge (for applications), and SaveStateBadge
 * - Floating bottom action bar (FABs) for Bulk Changes, Preview, and PDF Download
 * - 360px-friendly responsive layout with zero horizontal overflow
 *
 * @param {Object} props
 * @param {{ type: 'variant' | 'application', id: string }} props.target
 * @param {Function} props.onBack
 * @param {Function} [props.onOpenBulkParser]
 * @param {Function} [props.onOpenPreview]
 * @param {Function} [props.onDownloadPdf]
 */
export function ResumeEditorView({
  target,
  onBack,
  onOpenBulkParser,
  onOpenPreview,
  onDownloadPdf,
}) {
  const [record, setRecord] = useState(null)
  const [resumeData, setResumeData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [previewBlob, setPreviewBlob] = useState(null)
  const [previewFilename, setPreviewFilename] = useState('Resume.pdf')
  const [canUndoBatch, setCanUndoBatch] = useState(false)
  const toast = useToast()

  // 1. Fetch Target Record on Mount or Target Change
  useEffect(() => {
    let isMounted = true
    async function loadTarget() {
      if (!target?.id || !target?.type) return
      try {
        setIsLoading(true)
        let loaded = null
        if (target.type === 'variant') {
          loaded = await getVariantById(target.id)
        } else if (target.type === 'application') {
          loaded = await getApplicationById(target.id)
        }

        if (isMounted) {
          if (loaded) {
            setRecord(loaded)
            setResumeData(cloneResumeData(loaded.resumeData, false))
            setCanUndoBatch(
              target.type === 'application' &&
                Array.isArray(loaded.revisions) &&
                loaded.revisions.length > 0
            )
          } else {
            toast.error('The requested resume target could not be loaded.')
          }
        }
      } catch (err) {
        if (isMounted) {
          toast.error(err.message || 'Failed to load editor session.')
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadTarget()
    return () => {
      isMounted = false
    }
  }, [target, toast])

  // 2. Pure Dexie Persistence Handler
  const handleSave = useCallback(
    async (latestResumeData) => {
      if (!target?.id || !latestResumeData) return

      if (target.type === 'variant') {
        await updateVariant(target.id, { resumeData: latestResumeData })
      } else if (target.type === 'application') {
        await updateApplication(target.id, { resumeData: latestResumeData })
      }
    },
    [target]
  )

  // 3. Debounced Auto-Save Hook
  const { saveState, flush } = useDebouncedSave({
    data: resumeData,
    onSave: handleSave,
    delay: 600,
    enabled: Boolean(record && resumeData),
  })

  // 4. Safe Back Navigation (Flush pending changes first)
  async function handleBackClick() {
    await flush()
    onBack?.()
  }

  // 5. Section Update Helpers
  function handleSectionChange(sectionKey, updatedValue) {
    setResumeData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        [sectionKey]: updatedValue,
      }
    })
  }

  // 6. Bulk Changes Handlers
  function handleBulkChangesClick() {
    if (onOpenBulkParser) {
      onOpenBulkParser(resumeData)
    } else {
      setIsBulkModalOpen(true)
    }
  }

  async function handleApplyBulkChanges(updatedResumeData, acceptedCount) {
    if (!target?.id || !updatedResumeData) return
    try {
      await flush()
      if (target.type === 'application') {
        const updated = await updateApplication(
          target.id,
          { resumeData: updatedResumeData },
          {
            createSnapshot: true,
            snapshotReason: `Bulk change applied (${acceptedCount} changes)`,
          }
        )
        setRecord(updated)
        setResumeData(cloneResumeData(updated.resumeData, false))
        setCanUndoBatch(true)
        toast.success(`Applied ${acceptedCount} bulk changes! Snapshot saved for instant Undo.`)
      } else if (target.type === 'variant') {
        const updated = await updateVariant(target.id, { resumeData: updatedResumeData })
        setRecord(updated)
        setResumeData(cloneResumeData(updated.resumeData, false))
        toast.success(`Applied ${acceptedCount} bulk changes to master variant!`)
      }
    } catch (err) {
      toast.error(err.message || 'Failed to apply bulk changes.')
    }
  }

  async function handleUndoLastBatch() {
    if (target?.type !== 'application' || !target?.id) return
    try {
      await flush()
      const rolledBack = await rollbackApplicationBatch(target.id)
      setRecord(rolledBack)
      setResumeData(cloneResumeData(rolledBack.resumeData, false))
      setCanUndoBatch(
        Array.isArray(rolledBack.revisions) && rolledBack.revisions.length > 0
      )
      toast.success('Batch reverted! Previous snapshot successfully restored.')
    } catch (err) {
      toast.error(err.message || 'Failed to rollback batch.')
    }
  }

  async function handlePreviewClick() {
    if (onOpenPreview) {
      onOpenPreview(resumeData)
      return
    }
    if (!resumeData) return
    try {
      await flush()
      const blob = await generatePdfBlob(resumeData)
      const fullName = resumeData.personalInfo?.fullName || 'Candidate'
      const jobTitle =
        target.type === 'application'
          ? record?.jobTitle || resumeData.personalInfo?.headline || 'Professional'
          : resumeData.personalInfo?.headline || record?.name || 'Professional'
      const filename = sanitizeFilename(fullName, jobTitle)
      setPreviewBlob(blob)
      setPreviewFilename(filename)
      setIsPreviewOpen(true)
    } catch (err) {
      toast.error(err.message || 'Failed to generate PDF preview.')
    }
  }

  async function handleDownloadClick() {
    if (onDownloadPdf) {
      onDownloadPdf(resumeData)
      return
    }
    if (!resumeData || !record) return
    try {
      setIsExporting(true)
      await flush()
      const result = await exportResumePdf({ target, resumeData, record })
      if (target.type === 'application') {
        const refreshed = await getApplicationById(target.id)
        if (refreshed) setRecord(refreshed)
      }
      toast.success(`Exported ${result.filename} successfully!`)
    } catch (err) {
      toast.error(err.message || 'Failed to export PDF.')
    } finally {
      setIsExporting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="py-24 text-center text-xs text-slate-400 animate-pulse">
        Loading modular editor session...
      </div>
    )
  }

  if (!record || !resumeData) {
    return (
      <div className="py-16 text-center space-y-4">
        <p className="text-sm text-slate-500">Resume target not found.</p>
        <Button variant="outline" onClick={onBack}>
          Return to Navigation
        </Button>
      </div>
    )
  }

  const isVariant = target.type === 'variant'
  const title = isVariant ? record.name : record.jobTitle || 'Tailored Application'
  const companyName = !isVariant ? record.companyName : null

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-32 sm:pb-36 min-w-0">
      {/* Sticky Top Editor Header */}
      <div className="sticky top-0 sm:top-14 z-20 -mx-4 sm:-mx-6 md:-mx-8 px-3.5 sm:px-6 md:px-8 py-2.5 sm:py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 sm:gap-3 shadow-2xs">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={ArrowLeft}
            onClick={handleBackClick}
            className="shrink-0 -ml-1 sm:ml-0"
          >
            Back
          </Button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h2 className="text-xs sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate max-w-[140px] sm:max-w-none">
                {title}
              </h2>
              {isVariant ? (
                <Badge variant="blue" className="shrink-0 text-[10px]">
                  Master Variant
                </Badge>
              ) : (
                <div className="flex items-center gap-1 shrink-0">
                  <Badge variant="success" className="gap-1 text-[10px]">
                    <Briefcase className="h-3 w-3" />
                    <span className="truncate max-w-[90px] sm:max-w-none">{companyName}</span>
                  </Badge>
                  <Badge variant="outline" className="text-[10px] hidden sm:inline-flex">
                    Tailored Copy
                  </Badge>
                </div>
              )}
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate hidden xs:block sm:block">
              {isVariant
                ? 'Master Resume Variant (Always independent, never auto-mutated)'
                : `Tailored Application for ${companyName} (Isolated copy)`}
            </p>
          </div>
        </div>

        {/* Header Actions & Live Save State Badge */}
        <div className="shrink-0 flex items-center gap-1.5 sm:gap-2">
          {target.type === 'application' && canUndoBatch && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={RotateCcw}
              onClick={handleUndoLastBatch}
              className="text-xs shrink-0 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 px-2 sm:px-3"
            >
              <span className="hidden sm:inline">Undo Last Batch</span>
              <span className="sm:hidden">Undo</span>
            </Button>
          )}
          <SaveStateBadge state={saveState} />
        </div>
      </div>

      {/* Editor Form Sections */}
      <div className="space-y-4 sm:space-y-5">
        {/* 1. Personal Information */}
        <PersonalInfoSection
          personalInfo={resumeData.personalInfo || {}}
          onChange={(val) => handleSectionChange('personalInfo', val)}
        />

        {/* 2. Professional Summary */}
        <SummarySection
          summary={resumeData.summary || ''}
          onChange={(val) => handleSectionChange('summary', val)}
        />

        {/* 3. Work Experience */}
        <WorkExperienceSection
          workExperiences={resumeData.workExperiences || []}
          onChange={(val) => handleSectionChange('workExperiences', val)}
        />

        {/* 4. Skills & Categorization */}
        <SkillsSection
          skills={resumeData.skills || []}
          onChange={(val) => handleSectionChange('skills', val)}
        />

        {/* 5. Education */}
        <EducationSection
          education={resumeData.education || []}
          onChange={(val) => handleSectionChange('education', val)}
        />

        {/* 6. Additional Sections */}
        <AdditionalSection
          additionalSections={resumeData.additionalSections || []}
          onChange={(val) => handleSectionChange('additionalSections', val)}
        />
      </div>

      {/* Floating Bottom Action Bar (FABs) — Responsive 360px Android layout */}
      <div className="fixed bottom-3 sm:bottom-4 inset-x-2 sm:inset-x-4 max-w-lg mx-auto z-30 p-1.5 sm:p-2 rounded-2xl bg-slate-900/95 dark:bg-slate-800/95 text-white backdrop-blur-md shadow-2xl border border-slate-700/60 flex items-center justify-between gap-1.5 sm:gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 text-slate-200 hover:text-white hover:bg-white/10 text-[11px] sm:text-xs px-2 sm:px-3 py-1.5 whitespace-nowrap min-w-0 justify-center"
          leftIcon={Sparkles}
          onClick={handleBulkChangesClick}
        >
          Bulk Changes
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 text-slate-200 hover:text-white hover:bg-white/10 text-[11px] sm:text-xs px-2 sm:px-3 py-1.5 whitespace-nowrap min-w-0 justify-center"
          leftIcon={Eye}
          onClick={handlePreviewClick}
        >
          Preview
        </Button>
        <Button
          variant="primary"
          size="sm"
          className="flex-1 text-[11px] sm:text-xs px-2 sm:px-3 py-1.5 whitespace-nowrap min-w-0 shadow-xs justify-center"
          leftIcon={Download}
          loading={isExporting}
          onClick={handleDownloadClick}
        >
          Download PDF
        </Button>
      </div>

      {/* Phase 5: Interactive Bulk Changes Review Modal */}
      <BulkChangeModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        resumeData={resumeData}
        onApplyChanges={handleApplyBulkChanges}
      />

      {/* Phase 6: In-App PDF Preview Modal */}
      <PdfViewerModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        pdfBlob={previewBlob}
        filename={previewFilename}
      />
    </div>
  )
}
