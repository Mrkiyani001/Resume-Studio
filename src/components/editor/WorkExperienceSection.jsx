import { Briefcase, Plus } from 'lucide-react'
import { CollapsibleSection } from './CollapsibleSection.jsx'
import { Button } from '../ui/Button.jsx'
import { ExperienceItem } from './ExperienceItem.jsx'
import { createEmptyWorkExperience } from '../../models/resumeSchema.js'
import { useListReorder } from '../../hooks/useListReorder.js'

/**
 * Work Experience Section.
 * Manages the list of professional positions with reordering, duplication, and deletion.
 *
 * @param {Object} props
 * @param {Array<Object>} props.workExperiences
 * @param {Function} props.onChange (updatedExperiences) => void
 */
export function WorkExperienceSection({ workExperiences = [], onChange }) {
  const {
    items,
    add,
    update,
    remove,
    duplicate,
    moveUp,
    moveDown,
  } = useListReorder(workExperiences, onChange)

  return (
    <CollapsibleSection
      id="section-work-experience"
      title="Work Experience"
      icon={Briefcase}
      defaultOpen={true}
      badge={
        <span className="text-[11px] font-medium text-slate-400">
          {items.length} {items.length === 1 ? 'role' : 'roles'}
        </span>
      }
      action={
        <Button
          variant="outline"
          size="sm"
          leftIcon={Plus}
          onClick={() => add(createEmptyWorkExperience())}
        >
          Add Role
        </Button>
      }
    >
      {items.length === 0 ? (
        <div className="py-10 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
          <p className="text-xs text-slate-400">No work experiences added yet.</p>
          <Button
            variant="primary"
            size="sm"
            leftIcon={Plus}
            onClick={() => add(createEmptyWorkExperience())}
          >
            Add First Work Experience
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((exp, idx) => (
            <ExperienceItem
              key={exp.id || idx}
              experience={exp}
              index={idx}
              total={items.length}
              onUpdate={(updates) => update(idx, updates)}
              onDuplicate={() => duplicate(idx)}
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
