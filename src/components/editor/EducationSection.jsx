import { useState } from 'react'
import { GraduationCap, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import { CollapsibleSection } from './CollapsibleSection.jsx'
import { Button } from '../ui/Button.jsx'
import { Input } from '../ui/Input.jsx'
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx'
import { createEmptyEducation } from '../../models/resumeSchema.js'
import { useListReorder } from '../../hooks/useListReorder.js'

/**
 * Education Entry Item with responsive mobile header.
 */
function EducationItem({
  item,
  index,
  total,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}) {
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)
  const title = item.degree || 'Degree / Program'

  return (
    <div className="p-3.5 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-4 shadow-2xs">
      {/* Header — Stacked 2-row on mobile, single row on desktop */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 sm:pb-0 border-b sm:border-b-0 border-slate-200/60 dark:border-slate-800">
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate min-w-0 flex-1">
          {title}
        </h4>
        <div className="flex items-center justify-end gap-1 shrink-0 w-full sm:w-auto">
          <Button
            variant="ghost"
            size="sm"
            title="Move education up"
            disabled={index === 0}
            onClick={onMoveUp}
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title="Move education down"
            disabled={index === total - 1}
            onClick={onMoveDown}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-600 dark:text-red-400"
            title="Delete education"
            onClick={() => setIsConfirmDeleteOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Input
          label="Degree / Certificate"
          placeholder="e.g. Bachelor of Science in Computer Science"
          value={item.degree || ''}
          onChange={(e) => onUpdate({ degree: e.target.value })}
          required
        />
        <Input
          label="Institution / University"
          placeholder="e.g. Virtual University of Pakistan"
          value={item.institution || ''}
          onChange={(e) => onUpdate({ institution: e.target.value })}
          required
        />
        <Input
          label="Start Year / Date"
          placeholder="e.g. 2022"
          value={item.startDate || ''}
          onChange={(e) => onUpdate({ startDate: e.target.value })}
        />
        <Input
          label="End Year / Date"
          placeholder="e.g. 2026 (or Expected)"
          value={item.endDate || ''}
          onChange={(e) => onUpdate({ endDate: e.target.value })}
        />
        <div className="sm:col-span-2">
          <Input
            label="Additional Notes / Honors (Optional)"
            placeholder="e.g. Dean's Honor Roll, Major in Human-Computer Interaction"
            value={item.description || ''}
            onChange={(e) => onUpdate({ description: e.target.value })}
          />
        </div>
      </div>

      <ConfirmDialog
        isOpen={isConfirmDeleteOpen}
        title={`Delete Education "${title}"?`}
        description="Are you sure you want to remove this education credential?"
        confirmText="Delete Education"
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

/**
 * Education Section.
 * Manages degree/certificate credentials with reordering and deletion.
 *
 * @param {Object} props
 * @param {Array<Object>} props.education
 * @param {Function} props.onChange (updatedEducation) => void
 */
export function EducationSection({ education = [], onChange }) {
  const {
    items,
    add,
    update,
    remove,
    moveUp,
    moveDown,
  } = useListReorder(education, onChange)

  return (
    <CollapsibleSection
      id="section-education"
      title="Education & Credentials"
      icon={GraduationCap}
      defaultOpen={true}
      badge={
        <span className="text-[11px] font-medium text-slate-400">
          {items.length} {items.length === 1 ? 'credential' : 'credentials'}
        </span>
      }
      action={
        <Button
          variant="outline"
          size="sm"
          leftIcon={Plus}
          onClick={() => add(createEmptyEducation())}
        >
          Add Education
        </Button>
      }
    >
      {items.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
          <p className="text-xs text-slate-400">No education credentials added yet.</p>
          <Button
            variant="primary"
            size="sm"
            leftIcon={Plus}
            onClick={() => add(createEmptyEducation())}
          >
            Add First Education Credential
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item, idx) => (
            <EducationItem
              key={item.id || idx}
              item={item}
              index={idx}
              total={items.length}
              onUpdate={(updates) => update(idx, updates)}
              onDelete={() => remove(idx)}
              onMoveUp={() => moveUp(idx)}
              onMoveDown={() => moveDown(idx)}
            />
          ))}
        </div>
      )}
    </CollapsibleSection>
  )
}
