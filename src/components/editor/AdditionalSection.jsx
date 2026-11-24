import { useState } from 'react'
import { FolderPlus, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import { CollapsibleSection } from './CollapsibleSection.jsx'
import { Button } from '../ui/Button.jsx'
import { Input } from '../ui/Input.jsx'
import { Textarea } from '../ui/Textarea.jsx'
import { ToggleSwitch } from '../ui/ToggleSwitch.jsx'
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx'
import { createEmptyCustomSection, generateId } from '../../models/resumeSchema.js'
import { useListReorder } from '../../hooks/useListReorder.js'

/**
 * Single Entry Item within a Custom Section with responsive mobile header.
 */
function CustomSectionEntry({
  item,
  index,
  total,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}) {
  return (
    <div className="p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 shadow-2xs">
      {/* Entry Header — Stacked 2-row on mobile, single row on desktop */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1.5 sm:pb-0 border-b sm:border-b-0 border-slate-100 dark:border-slate-800">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate min-w-0 flex-1">
          {item.title || `Entry #${index + 1}`}
        </span>
        <div className="flex items-center justify-end gap-1 shrink-0 w-full sm:w-auto">
          <Button
            variant="ghost"
            size="sm"
            title="Move entry up"
            disabled={index === 0}
            onClick={onMoveUp}
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title="Move entry down"
            disabled={index === total - 1}
            onClick={onMoveDown}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-600 dark:text-red-400"
            title="Delete entry"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Item Title"
          placeholder="e.g. Design Systems Toolkit (or Project Name)"
          value={item.title || ''}
          onChange={(e) => onUpdate({ title: e.target.value })}
        />
        <Input
          label="Subtitle / Context (Optional)"
          placeholder="e.g. Lead Contributor / GitHub"
          value={item.subtitle || ''}
          onChange={(e) => onUpdate({ subtitle: e.target.value })}
        />
        <div className="sm:col-span-2">
          <Input
            label="Date / Period (Optional)"
            placeholder="e.g. 2025"
            value={item.date || ''}
            onChange={(e) => onUpdate({ date: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <Textarea
            label="Description / Deliverables"
            placeholder="Details, key outcomes, metrics, or technologies used..."
            value={item.text || ''}
            onChange={(e) => onUpdate({ text: e.target.value })}
            rows={2}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Custom Section Card with nested item reordering and responsive header.
 */
function CustomSectionCard({
  section,
  index,
  total,
  onUpdateSection,
  onDeleteSection,
  onMoveUpSection,
  onMoveDownSection,
}) {
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)
  const isVisible = section.isVisible !== false

  const {
    items: entries,
    add: addEntry,
    update: updateEntry,
    remove: removeEntry,
    moveUp: moveUpEntry,
    moveDown: moveDownEntry,
  } = useListReorder(section.items || [], (nextEntries) => {
    onUpdateSection({ items: nextEntries })
  })

  return (
    <div
      className={`p-3.5 sm:p-5 rounded-xl border ${
        isVisible
          ? 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40'
          : 'border-dashed border-slate-300 dark:border-slate-700 bg-slate-100/40 dark:bg-slate-900/20 opacity-80'
      } space-y-4 shadow-2xs transition-all`}
    >
      {/* Custom Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <Input
            placeholder="Section Title (e.g. Projects, Certifications, Publications)"
            value={section.title || ''}
            onChange={(e) => onUpdateSection({ title: e.target.value })}
            className="font-bold text-sm"
          />
        </div>

        {/* Section Visibility & Ordering */}
        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 dark:border-slate-700/60">
          <ToggleSwitch
            id={`toggle-section-visible-${index}`}
            label={isVisible ? 'Visible' : 'Hidden'}
            checked={isVisible}
            onChange={(val) => onUpdateSection({ isVisible: val })}
          />
          <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-700 pl-2">
            <Button
              variant="ghost"
              size="sm"
              title="Move section up"
              disabled={index === 0}
              onClick={onMoveUpSection}
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="Move section down"
              disabled={index === total - 1}
              onClick={onMoveDownSection}
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-600 dark:text-red-400"
              title="Delete section"
              onClick={() => setIsConfirmDeleteOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Entries List */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Section Items ({entries.length})
          </label>
          <Button
            variant="outline"
            size="sm"
            leftIcon={Plus}
            onClick={() =>
              addEntry({
                id: generateId(),
                title: '',
                subtitle: '',
                date: '',
                text: '',
              })
            }
          >
            Add Item
          </Button>
        </div>

        {entries.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2">
            No entries in this section yet. Click &quot;Add Item&quot; to begin.
          </p>
        ) : (
          <div className="space-y-2.5">
            {entries.map((item, eIdx) => (
              <CustomSectionEntry
                key={item.id || eIdx}
                item={item}
                index={eIdx}
                total={entries.length}
                onUpdate={(updates) => updateEntry(eIdx, updates)}
                onDelete={() => removeEntry(eIdx)}
                onMoveUp={() => moveUpEntry(eIdx)}
                onMoveDown={() => moveDownEntry(eIdx)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isConfirmDeleteOpen}
        title={`Delete Section "${section.title || 'Untitled'}"?`}
        description="Are you sure you want to remove this entire custom section and all its entries?"
        confirmText="Delete Section"
        cancelText="Cancel"
        variant="danger"
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={() => {
          setIsConfirmDeleteOpen(false)
          onDeleteSection()
        }}
      />
    </div>
  )
}

/**
 * Additional / Custom Sections Manager.
 * Allows adding dynamic sections (e.g. Certifications, Projects, Publications, Languages)
 * with independent visibility, item reordering, and deletion.
 *
 * @param {Object} props
 * @param {Array<Object>} props.additionalSections
 * @param {Function} props.onChange (updatedSections) => void
 */
export function AdditionalSection({ additionalSections = [], onChange }) {
  const {
    items,
    add,
    update,
    remove,
    moveUp,
    moveDown,
  } = useListReorder(additionalSections, onChange)

  return (
    <CollapsibleSection
      id="section-additional"
      title="Additional & Custom Sections"
      icon={FolderPlus}
      defaultOpen={false}
      badge={
        <span className="text-[11px] font-medium text-slate-400">
          {items.length} {items.length === 1 ? 'section' : 'sections'}
        </span>
      }
      action={
        <Button
          variant="outline"
          size="sm"
          leftIcon={Plus}
          onClick={() => add(createEmptyCustomSection())}
        >
          Add Section
        </Button>
      }
    >
      {items.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
          <p className="text-xs text-slate-400">
            No additional sections added. You can add Certifications, Projects, Awards, or Languages.
          </p>
          <Button
            variant="primary"
            size="sm"
            leftIcon={Plus}
            onClick={() => add(createEmptyCustomSection())}
          >
            Add Custom Section
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((sec, idx) => (
            <CustomSectionCard
              key={sec.id || idx}
              section={sec}
              index={idx}
              total={items.length}
              onUpdateSection={(updates) => update(idx, updates)}
              onDeleteSection={() => remove(idx)}
              onMoveUpSection={() => moveUp(idx)}
              onMoveDownSection={() => moveDown(idx)}
            />
          ))}
        </div>
      )}
    </CollapsibleSection>
  )
}
