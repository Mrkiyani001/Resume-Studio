import { FileText } from 'lucide-react'
import { CollapsibleSection } from './CollapsibleSection.jsx'
import { Textarea } from '../ui/Textarea.jsx'

/**
 * Professional Summary Section.
 * Multiline textarea with character and word counters.
 *
 * @param {Object} props
 * @param {string} props.summary
 * @param {Function} props.onChange (newSummary) => void
 */
export function SummarySection({ summary = '', onChange }) {
  const charCount = summary.length
  const wordCount = summary.trim() ? summary.trim().split(/\s+/).length : 0

  return (
    <CollapsibleSection
      id="section-summary"
      title="Professional Summary"
      icon={FileText}
      defaultOpen={true}
      badge={
        <span className="text-[11px] font-medium text-slate-400">
          {wordCount} {wordCount === 1 ? 'word' : 'words'}
        </span>
      }
    >
      <div className="space-y-2">
        <Textarea
          id="resume-summary-textarea"
          label="Executive Summary"
          placeholder="Brief 2-4 sentence summary of your core strengths, domain expertise, and career focus..."
          value={summary}
          onChange={(e) => onChange(e.target.value)}
          rows={5}
          helperText="Keep this concise and targeted. Focus on scope of responsibility, technical strengths, and measurable impact."
        />
        <div className="flex justify-end text-[11px] text-slate-400">
          <span>{charCount} characters</span>
        </div>
      </div>
    </CollapsibleSection>
  )
}
