import { useState } from 'react'
import {
  ChevronDown,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Briefcase,
  MapPin,
  Calendar,
} from 'lucide-react'
import { Input } from '../ui/Input.jsx'
import { Button } from '../ui/Button.jsx'
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx'
import { BulletListInput } from './BulletListInput.jsx'
import { cn } from '../../lib/utils.js'

/**
 * Individual Work Experience Entry Card.
 * Expandable card with role metadata and individual bullet point controls.
 *
 * @param {Object} props
 * @param {Object} props.experience
 * @param {number} props.index
 * @param {number} props.total
 * @param {Function} props.onUpdate (updates) => void
 * @param {Function} props.onDuplicate () => void
 * @param {Function} props.onDelete () => void
 * @param {Function} props.onMoveUp () => void
 * @param {Function} props.onMoveDown () => void
 */
export function ExperienceItem({
  experience,
  index,
  total,
  onUpdate,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
}) {
  const [isOpen, setIsOpen] = useState(true)
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)

  const roleTitle = experience.jobTitle || 'Untitled Position'
  const company = experience.employer || 'Company'
  const dateRange =
    experience.startDate || experience.endDate
      ? `${experience.startDate || ''} — ${experience.endDate || 'Present'}`
      : 'Dates not set'

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 overflow-hidden transition-all shadow-2xs">
      {/* Header Summary */}
      <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 bg-slate-100/50 dark:bg-slate-800/40 select-none">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex-1 flex items-center gap-3 min-h-[44px] -my-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg group min-w-0"
        >
          <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 flex items-center justify-center shrink-0">
            <Briefcase className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {roleTitle}
            </h4>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                {company}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {dateRange}
              </span>
              {experience.location && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 truncate">
                    <MapPin className="h-3 w-3" />
                    {experience.location}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="h-8 w-8 flex items-center justify-center text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 shrink-0">
            <ChevronDown
              className={cn('h-4 w-4 transition-transform duration-200', isOpen && 'rotate-180')}
            />
          </div>
        </button>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            title="Move role up"
            disabled={index === 0}
            onClick={onMoveUp}
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title="Move role down"
            disabled={index === total - 1}
            onClick={onMoveDown}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title="Duplicate role"
            onClick={onDuplicate}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-600 dark:text-red-400"
            title="Delete role"
            onClick={() => setIsConfirmDeleteOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Expandable Form Body */}
      {isOpen && (
        <div className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-slate-800 space-y-4 bg-white dark:bg-slate-900">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Job Title"
              placeholder="e.g. Lead Product Designer"
              value={experience.jobTitle || ''}
              onChange={(e) => onUpdate({ jobTitle: e.target.value })}
              required
            />
            <Input
              label="Company / Employer"
              placeholder="e.g. Linear"
              value={experience.employer || ''}
              onChange={(e) => onUpdate({ employer: e.target.value })}
              required
            />
            <Input
              label="Start Date"
              placeholder="e.g. Oct 2024"
              value={experience.startDate || ''}
              onChange={(e) => onUpdate({ startDate: e.target.value })}
            />
            <Input
              label="End Date"
              placeholder="e.g. Present (or Oct 2026)"
              value={experience.endDate || ''}
              onChange={(e) => onUpdate({ endDate: e.target.value })}
            />
            <div className="sm:col-span-2">
              <Input
                label="Location (Optional)"
                placeholder="e.g. San Francisco, CA (or Remote)"
                value={experience.location || ''}
                onChange={(e) => onUpdate({ location: e.target.value })}
              />
            </div>
          </div>

          {/* Individual Bullet Points Section */}
          <div className="pt-2">
            <BulletListInput
              bullets={experience.bullets || []}
              onChange={(newBullets) => onUpdate({ bullets: newBullets })}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isConfirmDeleteOpen}
        title={`Delete "${roleTitle}"?`}
        description="Are you sure you want to delete this work experience entry and all its bullet points?"
        confirmText="Delete Role"
        cancelText="Cancel"
        variant="danger"
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={() => {
          setIsConfirmDeleteOpen(false)
          onDelete()
        }}
      />
    </div>
  )
}
