import { useState } from 'react'
import { Wrench, Plus, Trash2, ArrowUp, ArrowDown, Copy } from 'lucide-react'
import { CollapsibleSection } from './CollapsibleSection.jsx'
import { Button } from '../ui/Button.jsx'
import { Input } from '../ui/Input.jsx'
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx'
import { createEmptySkillCategory, generateId } from '../../models/resumeSchema.js'
import { useListReorder } from '../../hooks/useListReorder.js'

/**
 * Individual Category Card with skill list management.
 */
function SkillCategoryItem({
  category,
  index,
  total,
  onUpdateCategory,
  onDuplicateCategory,
  onDeleteCategory,
  onMoveUpCategory,
  onMoveDownCategory,
}) {
  const [newSkillText, setNewSkillText] = useState('')
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)

  const {
    items: skills,
    add: addSkill,
    update: updateSkill,
    remove: removeSkill,
    moveUp: moveUpSkill,
    moveDown: moveDownSkill,
  } = useListReorder(category.skills || [], (nextSkills) => {
    onUpdateCategory({ skills: nextSkills })
  })

  function handleQuickAddSkill(e) {
    e?.preventDefault()
    if (!newSkillText.trim()) return

    // Allow comma-separated bulk entry or single skill
    const names = newSkillText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    if (names.length === 1) {
      addSkill({ id: generateId(), name: names[0] })
    } else {
      const added = names.map((name) => ({ id: generateId(), name }))
      onUpdateCategory({ skills: [...skills, ...added] })
    }
    setNewSkillText('')
  }

  return (
    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3.5 shadow-2xs">
      {/* Category Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex-1 min-w-0">
          <Input
            placeholder="Category Name (e.g. Product & UX, Tools)"
            value={category.categoryName || ''}
            onChange={(e) => onUpdateCategory({ categoryName: e.target.value })}
            className="font-bold text-sm"
          />
        </div>

        {/* Category Actions */}
        <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
          <Button
            variant="ghost"
            size="sm"
            title="Move category up"
            disabled={index === 0}
            onClick={onMoveUpCategory}
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title="Move category down"
            disabled={index === total - 1}
            onClick={onMoveDownCategory}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title="Duplicate category"
            onClick={onDuplicateCategory}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-600 dark:text-red-400"
            title="Delete category"
            onClick={() => setIsConfirmDeleteOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Skills List */}
      <div className="space-y-2">
        {skills.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-1">No skills in this category.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {skills.map((skill, sIdx) => (
              <div
                key={skill.id || sIdx}
                className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xs"
              >
                <input
                  type="text"
                  value={skill.name || ''}
                  onChange={(e) => updateSkill(sIdx, { name: e.target.value })}
                  placeholder="Skill name"
                  className="text-xs bg-transparent border-0 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none min-w-[70px] max-w-[140px]"
                />
                <button
                  type="button"
                  title="Move skill up"
                  disabled={sIdx === 0}
                  onClick={() => moveUpSkill(sIdx)}
                  className="h-6 w-6 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  title="Move skill down"
                  disabled={sIdx === skills.length - 1}
                  onClick={() => moveDownSkill(sIdx)}
                  className="h-6 w-6 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowDown className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  title="Remove skill"
                  onClick={() => removeSkill(sIdx)}
                  className="h-6 w-6 flex items-center justify-center text-red-400 hover:text-red-600 dark:hover:text-red-300"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Quick Add Skill Form */}
        <form onSubmit={handleQuickAddSkill} className="flex items-center gap-2 pt-2">
          <input
            type="text"
            placeholder="Add skill (or comma-separated e.g. Figma, Framer)..."
            value={newSkillText}
            onChange={(e) => setNewSkillText(e.target.value)}
            className="flex-1 min-h-[38px] rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button type="submit" variant="secondary" size="sm" leftIcon={Plus}>
            Add
          </Button>
        </form>
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isConfirmDeleteOpen}
        title={`Delete Category "${category.categoryName || 'Untitled'}"?`}
        description="Are you sure you want to remove this skill category and all its skills?"
        confirmText="Delete Category"
        cancelText="Cancel"
        variant="danger"
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={() => {
          setIsConfirmDeleteOpen(false)
          onDeleteCategory()
        }}
      />
    </div>
  )
}

/**
 * Skills & Categorization Section.
 * Manages categorized skills.
 *
 * @param {Object} props
 * @param {Array<Object>} props.skills
 * @param {Function} props.onChange (updatedSkills) => void
 */
export function SkillsSection({ skills = [], onChange }) {
  const {
    items: categories,
    add: addCategory,
    update: updateCategory,
    remove: removeCategory,
    duplicate: duplicateCategory,
    moveUp: moveUpCategory,
    moveDown: moveDownCategory,
  } = useListReorder(skills, onChange)

  const totalSkills = categories.reduce(
    (sum, cat) => sum + (cat.skills?.length || 0),
    0
  )

  return (
    <CollapsibleSection
      id="section-skills"
      title="Skills & Categorization"
      icon={Wrench}
      defaultOpen={true}
      badge={
        <span className="text-[11px] font-medium text-slate-400">
          {categories.length} {categories.length === 1 ? 'category' : 'categories'} • {totalSkills} skills
        </span>
      }
      action={
        <Button
          variant="outline"
          size="sm"
          leftIcon={Plus}
          onClick={() => addCategory(createEmptySkillCategory({ categoryName: 'New Category' }))}
        >
          Add Category
        </Button>
      }
    >
      {categories.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
          <p className="text-xs text-slate-400">No skill categories defined.</p>
          <Button
            variant="primary"
            size="sm"
            leftIcon={Plus}
            onClick={() => addCategory(createEmptySkillCategory({ categoryName: 'Core Skills' }))}
          >
            Add First Category
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((cat, idx) => (
            <SkillCategoryItem
              key={cat.id || idx}
              category={cat}
              index={idx}
              total={categories.length}
              onUpdateCategory={(updates) => updateCategory(idx, updates)}
              onDuplicateCategory={() => duplicateCategory(idx)}
              onDeleteCategory={() => removeCategory(idx)}
              onMoveUpCategory={() => moveUpCategory(idx)}
              onMoveDownCategory={() => moveDownCategory(idx)}
            />
          ))}
        </div>
      )}
    </CollapsibleSection>
  )
}
