import { useState, useMemo } from 'react'
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  XCircle,
  RotateCcw,
  Target,
  Check,
} from 'lucide-react'
import { Modal } from '../../components/ui/Modal.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Badge } from '../../components/ui/Badge.jsx'
import { Textarea } from '../../components/ui/Textarea.jsx'
import { parseBulkChanges } from './parser.js'
import { matchBulkChanges, getAllCandidateTargets } from './matcher.js'
import { applyBulkChanges } from './applier.js'
import { MATCH_STATUS } from '../../models/bulkChangeSchema.js'
import { OFFICIAL_BULK_CHANGE_FIXTURE } from '../../test/fixtures/bulkChangesFixture.js'

/**
 * Mobile-First Interactive Bulk Changes Review Modal.
 *
 * Provides:
 * 1. Input step: paste raw Old: / New: change blocks with format helpers.
 * 2. Review step: status badges (Matched, Needs review, Ambiguous, Unmatched, Invalid),
 *    old vs new visual diffs, individual accept/reject, "Accept All Safely Matched",
 *    and a Manual Target Picker dropdown for unresolved/ambiguous items.
 * 3. Deterministic application onto resumeData with immutable deep copy.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Object} props.resumeData Current resume data
 * @param {Function} props.onApplyChanges Callback receiving (updatedResumeData, count)
 */
export function BulkChangeModal({
  isOpen,
  onClose,
  resumeData,
  onApplyChanges,
}) {
  const [step, setStep] = useState('input') // 'input' | 'review'
  const [rawText, setRawText] = useState('')
  const [changes, setChanges] = useState([])

  // All selectable targets across the current resume for the manual picker
  const allCandidateTargets = useMemo(() => {
    return getAllCandidateTargets(resumeData)
  }, [resumeData])

  // Count summary
  const stats = useMemo(() => {
    const total = changes.length
    const matched = changes.filter((c) => c.status === MATCH_STATUS.MATCHED).length
    const needsReview = changes.filter((c) => c.status === MATCH_STATUS.NEEDS_REVIEW).length
    const ambiguous = changes.filter((c) => c.status === MATCH_STATUS.AMBIGUOUS).length
    const unmatched = changes.filter((c) => c.status === MATCH_STATUS.UNMATCHED).length
    const invalid = changes.filter((c) => c.status === MATCH_STATUS.INVALID).length
    const acceptedCount = changes.filter((c) => c.accepted && c.status !== MATCH_STATUS.INVALID).length

    return { total, matched, needsReview, ambiguous, unmatched, invalid, acceptedCount }
  }, [changes])

  function handleParse() {
    if (!rawText.trim()) return
    const parsed = parseBulkChanges(rawText)
    const matched = matchBulkChanges(parsed, resumeData)
    setChanges(matched)
    setStep('review')
  }

  function handlePasteExample() {
    setRawText(OFFICIAL_BULK_CHANGE_FIXTURE)
  }

  function toggleAccept(changeId) {
    setChanges((prev) =>
      prev.map((c) => {
        if (c.id === changeId) {
          if (c.status === MATCH_STATUS.INVALID) return c
          return { ...c, accepted: !c.accepted }
        }
        return c
      })
    )
  }

  function handleAcceptAllSafelyMatched() {
    setChanges((prev) =>
      prev.map((c) => ({
        ...c,
        accepted: c.status === MATCH_STATUS.MATCHED,
      }))
    )
  }

  function handleRejectAll() {
    setChanges((prev) =>
      prev.map((c) => ({
        ...c,
        accepted: false,
      }))
    )
  }

  function handleManualTargetSelect(changeId, targetIndexStr) {
    if (targetIndexStr === '') return
    const targetIdx = parseInt(targetIndexStr, 10)
    const selected = allCandidateTargets[targetIdx]
    if (!selected) return

    setChanges((prev) =>
      prev.map((c) => {
        if (c.id === changeId) {
          return {
            ...c,
            selectedTarget: selected,
            status: MATCH_STATUS.MATCHED,
            statusReason: `Manually assigned target: ${selected.previewLabel}`,
            accepted: true,
          }
        }
        return c
      })
    )
  }

  function handleApply() {
    const updated = applyBulkChanges(resumeData, changes)
    onApplyChanges?.(updated, stats.acceptedCount)
    onClose?.()
  }

  function renderStatusBadge(status) {
    switch (status) {
      case MATCH_STATUS.MATCHED:
        return (
          <Badge variant="success" className="gap-1 text-[11px]">
            <CheckCircle2 className="h-3 w-3" />
            Matched
          </Badge>
        )
      case MATCH_STATUS.NEEDS_REVIEW:
        return (
          <Badge variant="warning" className="gap-1 text-[11px]">
            <AlertTriangle className="h-3 w-3" />
            Needs review
          </Badge>
        )
      case MATCH_STATUS.AMBIGUOUS:
        return (
          <Badge variant="secondary" className="gap-1 text-[11px] bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
            <HelpCircle className="h-3 w-3" />
            Ambiguous
          </Badge>
        )
      case MATCH_STATUS.INVALID:
        return (
          <Badge variant="destructive" className="gap-1 text-[11px]">
            <XCircle className="h-3 w-3" />
            Invalid
          </Badge>
        )
      case MATCH_STATUS.UNMATCHED:
      default:
        return (
          <Badge variant="outline" className="gap-1 text-[11px]">
            <HelpCircle className="h-3 w-3" />
            Unmatched
          </Badge>
        )
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title="Bulk Changes Engine"
      description="Deterministic parser for structured Old: / New: resume updates"
      footer={
        step === 'input' ? (
          <>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={Sparkles}
              disabled={!rawText.trim()}
              onClick={handleParse}
            >
              Parse Changes
            </Button>
          </>
        ) : (
          <div className="w-full flex items-center justify-between gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              leftIcon={RotateCcw}
              onClick={() => setStep('input')}
            >
              Back to Input
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={Check}
                disabled={stats.acceptedCount === 0}
                onClick={handleApply}
              >
                Apply {stats.acceptedCount} Accepted {stats.acceptedCount === 1 ? 'Change' : 'Changes'}
              </Button>
            </div>
          </div>
        )
      }
    >
      {step === 'input' ? (
        /* STEP 1: INPUT MODE */
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 space-y-2">
            <p className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              Supported Paste Format:
            </p>
            <p className="font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-pre leading-relaxed bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-800">
              {`[SECTION_NAME: Optional Company/Role/Category]
Old: Original exact or approximate resume text
New: Replacement text for this bullet or field`}
            </p>
            <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Supports Summary, Work Experience, Skills, Education & Additional Sections.
              </span>
              <Button
                type="button"
                variant="secondary"
                size="xs"
                onClick={handlePasteExample}
              >
                Paste Part 8.1 Example
              </Button>
            </div>
          </div>

          <Textarea
            label="Raw Change Blocks"
            placeholder="Paste your Old: / New: resume updates here..."
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={12}
            className="font-mono text-xs"
          />

          {rawText.trim() && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setRawText('')}
                className="text-slate-400 hover:text-slate-600"
              >
                Clear input
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* STEP 2: REVIEW MODE */
        <div className="space-y-5">
          {/* Status Breakdown Pill Strip */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {stats.total} Changes:
              </span>
              {stats.matched > 0 && (
                <Badge variant="success" className="text-[10px]">
                  {stats.matched} Matched
                </Badge>
              )}
              {stats.needsReview > 0 && (
                <Badge variant="warning" className="text-[10px]">
                  {stats.needsReview} Needs review
                </Badge>
              )}
              {stats.ambiguous > 0 && (
                <Badge variant="secondary" className="text-[10px] bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                  {stats.ambiguous} Ambiguous
                </Badge>
              )}
              {stats.unmatched > 0 && (
                <Badge variant="outline" className="text-[10px]">
                  {stats.unmatched} Unmatched
                </Badge>
              )}
              {stats.invalid > 0 && (
                <Badge variant="destructive" className="text-[10px]">
                  {stats.invalid} Invalid
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="outline"
                size="xs"
                onClick={handleAcceptAllSafelyMatched}
              >
                Accept All Safely Matched
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={handleRejectAll}
              >
                Reject All
              </Button>
            </div>
          </div>

          {/* List of Change Diff Cards */}
          <div className="space-y-3.5 max-h-[50vh] overflow-y-auto pr-1">
            {changes.map((change, idx) => {
              const isInvalid = change.status === MATCH_STATUS.INVALID
              const needsManualTarget =
                change.status === MATCH_STATUS.UNMATCHED ||
                change.status === MATCH_STATUS.AMBIGUOUS ||
                change.status === MATCH_STATUS.NEEDS_REVIEW

              return (
                <div
                  key={change.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    change.accepted
                      ? 'border-blue-300 bg-blue-50/20 dark:border-blue-900/60 dark:bg-blue-950/10'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800/60 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                        #{idx + 1} [{change.section}
                        {change.targetContext?.employer
                          ? `: ${change.targetContext.employer}`
                          : ''}
                        ]
                      </span>
                      {renderStatusBadge(change.status)}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant={change.accepted ? 'primary' : 'outline'}
                        size="xs"
                        disabled={isInvalid}
                        onClick={() => toggleAccept(change.id)}
                        className="gap-1 min-w-[76px]"
                      >
                        {change.accepted ? (
                          <>
                            <Check className="h-3 w-3" />
                            Accepted
                          </>
                        ) : (
                          'Accept'
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Status Reason Explanation */}
                  {change.statusReason && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 italic">
                      {change.statusReason}
                    </p>
                  )}

                  {/* Visual Diff View */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2.5">
                    {/* Old Text */}
                    <div className="p-2.5 rounded-lg bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-900 dark:text-rose-200 space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-rose-700 dark:text-rose-400">
                        Old / Target
                      </span>
                      <p className="text-xs leading-relaxed font-sans line-through opacity-85 select-text">
                        {change.oldText || '(Empty target)'}
                      </p>
                    </div>

                    {/* New Text */}
                    <div className="p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200 space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-400">
                        New / Replacement
                      </span>
                      <p className="text-xs leading-relaxed font-sans font-medium select-text">
                        {change.newText || '(Empty replacement)'}
                      </p>
                    </div>
                  </div>

                  {/* Manual Target Picker Dropdown for Unresolved/Ambiguous/Review Items */}
                  {!isInvalid && (
                    <div className="pt-3 flex items-center gap-2 flex-wrap text-xs">
                      <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1 shrink-0">
                        <Target className="h-3.5 w-3.5 text-blue-500" />
                        Target:
                      </label>
                      <select
                        aria-label={`Target for change #${idx + 1}`}
                        value={
                          change.selectedTarget
                            ? allCandidateTargets.findIndex(
                                (t) =>
                                  (t.bulletId && t.bulletId === change.selectedTarget.bulletId) ||
                                  (t.categoryId && t.categoryId === change.selectedTarget.categoryId) ||
                                  (t.field && t.field === change.selectedTarget.field)
                              )
                            : ''
                        }
                        onChange={(e) => handleManualTargetSelect(change.id, e.target.value)}
                        className={`text-xs rounded-lg border bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 py-1.5 px-2.5 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 flex-1 min-w-[200px] ${
                          needsManualTarget
                            ? 'border-amber-300 dark:border-amber-700 bg-amber-50/30'
                            : 'border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        <option value="">
                          {change.suggestedTarget
                            ? `Suggested: ${change.suggestedTarget.previewLabel}`
                            : '-- Choose Target Manually --'}
                        </option>
                        {allCandidateTargets.map((cand, candIdx) => (
                          <option key={`${cand.section}-${candIdx}`} value={candIdx}>
                            [{cand.section}] {cand.previewLabel}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Modal>
  )
}
