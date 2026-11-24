import { Plus, Trash2, ArrowUp, ArrowDown, Copy } from 'lucide-react'
import { Button } from '../ui/Button.jsx'
import { createEmptyBullet } from '../../models/resumeSchema.js'
import { useListReorder } from '../../hooks/useListReorder.js'

/**
 * Reusable Individual Bullet Points Editor.
 *
 * CRITICAL SPECIFICATION RULE:
 * Every bullet point MUST be its own separate editable input with add, edit,
 * duplicate, delete, and reorder controls. NEVER combine bullets into a single multiline textarea.
 *
 * Mobile Responsiveness:
 * Uses a responsive stacked structure on mobile viewports (< 640px) so the textarea
 * occupies full available width without being crushed by the action buttons.
 *
 * @param {Object} props
 * @param {Array<{ id: string, text: string }>} props.bullets
 * @param {Function} props.onChange (updatedBullets) => void
 */
export function BulletListInput({ bullets = [], onChange }) {
  const {
    items,
    add,
    update,
    remove,
    duplicate,
    moveUp,
    moveDown,
  } = useListReorder(bullets, onChange)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Key Responsibilities & Achievements ({items.length})
        </label>
        <Button
          variant="outline"
          size="sm"
          leftIcon={Plus}
          onClick={() => add(createEmptyBullet())}
        >
          Add Bullet
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="py-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
          <p className="text-xs text-slate-400 mb-2">No bullets added yet.</p>
          <Button
            variant="outline"
            size="sm"
            leftIcon={Plus}
            onClick={() => add(createEmptyBullet())}
          >
            Add First Bullet Point
          </Button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((bullet, idx) => (
            <div
              key={bullet.id || idx}
              className="flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-2 p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs group focus-within:border-blue-500 transition-colors"
            >
              {/* Text Input Row */}
              <div className="flex items-start gap-2 min-w-0 flex-1 w-full">
                {/* Bullet Marker */}
                <div className="pt-2 px-1 text-slate-400 dark:text-slate-500 select-none font-bold text-xs shrink-0">
                  •
                </div>

                {/* Bullet Text Input */}
                <div className="flex-1 min-w-0">
                  <textarea
                    rows={2}
                    placeholder="Describe an action, outcome, or technical deliverable..."
                    value={bullet.text || ''}
                    onChange={(e) => update(idx, { text: e.target.value })}
                    className="w-full text-xs sm:text-sm bg-transparent border-0 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none resize-y min-h-[44px] py-1.5 px-1"
                  />
                </div>
              </div>

              {/* Action Controls: bottom row on mobile, right on desktop */}
              <div className="flex items-center justify-end gap-0.5 shrink-0 pt-1 sm:pt-1 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/60 w-full sm:w-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  title="Move bullet up"
                  disabled={idx === 0}
                  onClick={() => moveUp(idx)}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  title="Move bullet down"
                  disabled={idx === items.length - 1}
                  onClick={() => moveDown(idx)}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  title="Duplicate bullet"
                  onClick={() => duplicate(idx)}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-600 dark:text-red-400"
                  title="Delete bullet"
                  onClick={() => remove(idx)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
