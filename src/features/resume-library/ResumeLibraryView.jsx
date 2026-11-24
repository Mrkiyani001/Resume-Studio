import { useState, useEffect, useCallback } from 'react'
import {
  FolderGit2,
  Plus,
  Copy,
  Edit2,
  Trash2,
  ArrowRight,
  Clock,
  Briefcase,
  Upload,
} from 'lucide-react'
import {
  getAllVariants,
  duplicateVariant,
  deleteVariant,
} from '../../database/variantRepository.js'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Badge } from '../../components/ui/Badge.jsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx'
import { NewVariantModal } from './NewVariantModal.jsx'
import { RenameVariantModal } from './RenameVariantModal.jsx'
import { SmartImportModal } from '../smart-import/SmartImportModal.jsx'
import { useToast } from '../../hooks/useToast.js'
import { formatRelativeTime } from '../../lib/dateUtils.js'

export function ResumeLibraryView({ onOpenVariant, onCreateApplication }) {
  const [variants, setVariants] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [renamingVariant, setRenamingVariant] = useState(null)
  const [deletingVariant, setDeletingVariant] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const toast = useToast()

  const refreshVariants = useCallback(async () => {
    try {
      const data = await getAllVariants()
      setVariants(data)
    } catch {
      toast.error('Failed to load resume variants from local storage.')
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    let isMounted = true
    getAllVariants()
      .then((data) => {
        if (isMounted) {
          setVariants(data)
          setIsLoading(false)
        }
      })
      .catch(() => {
        if (isMounted) {
          toast.error('Failed to load resume variants from local storage.')
          setIsLoading(false)
        }
      })
    return () => {
      isMounted = false
    }
  }, [toast])

  async function handleDuplicate(variant) {
    try {
      const copy = await duplicateVariant(variant.id)
      toast.success(`Duplicated variant as "${copy.name}"`)
      await refreshVariants()
    } catch (err) {
      toast.error(err.message || 'Failed to duplicate variant.')
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingVariant) return
    try {
      setIsDeleting(true)
      await deleteVariant(deletingVariant.id)
      toast.success(`Deleted variant "${deletingVariant.name}"`)
      setDeletingVariant(null)
      await refreshVariants()
    } catch (err) {
      toast.error(err.message || 'Failed to delete variant.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            My Resumes
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Master resume variants. Opening a variant always opens its master copy.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            leftIcon={Upload}
            onClick={() => setIsImportModalOpen(true)}
          >
            Smart Import
          </Button>
          <Button
            variant="primary"
            leftIcon={Plus}
            onClick={() => setIsNewModalOpen(true)}
          >
            New Resume
          </Button>
        </div>
      </div>

      {/* Variant Cards Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-slate-400 animate-pulse">
          Loading master variants...
        </div>
      ) : variants.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="text-center py-12">
            <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
              <FolderGit2 className="h-6 w-6" />
            </div>
            <CardTitle>No Master Resumes Found</CardTitle>
            <CardDescription>
              Create your first master resume variant to start generating tailored job applications.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button
              variant="primary"
              leftIcon={Plus}
              onClick={() => setIsNewModalOpen(true)}
            >
              Create Master Resume
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {variants.map((variant) => {
            const headline =
              variant.resumeData?.personalInfo?.headline || 'No headline set'
            const expCount =
              variant.resumeData?.workExperiences?.length || 0
            const skillsCount =
              variant.resumeData?.skills?.reduce(
                (sum, cat) => sum + (cat.skills?.length || 0),
                0
              ) || 0

            return (
              <Card
                key={variant.id}
                className="flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all group"
              >
                <CardHeader className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base sm:text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {variant.name}
                    </CardTitle>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      Master
                    </Badge>
                  </div>
                  <CardDescription className="text-xs font-medium text-slate-600 dark:text-slate-300 line-clamp-1">
                    {headline}
                  </CardDescription>

                  {/* Metadata Chips */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-3 w-3" />
                      {expCount} {expCount === 1 ? 'role' : 'roles'}
                    </span>
                    <span>•</span>
                    <span>{skillsCount} skills</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatRelativeTime(variant.updatedAt)}
                    </span>
                  </div>
                </CardHeader>

                <CardFooter className="flex items-center justify-between gap-2 pt-3">
                  {/* Secondary management buttons */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Rename master variant"
                      onClick={() => setRenamingVariant(variant)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Duplicate master variant"
                      onClick={() => handleDuplicate(variant)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600 dark:text-red-400"
                      title="Delete master variant"
                      onClick={() => setDeletingVariant(variant)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Primary actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenVariant?.(variant.id)}
                    >
                      Open Master
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      rightIcon={ArrowRight}
                      onClick={() => onCreateApplication?.(variant.id)}
                    >
                      Apply
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modals */}
      <NewVariantModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onCreated={refreshVariants}
      />

      {renamingVariant && (
        <RenameVariantModal
          key={renamingVariant.id}
          isOpen={true}
          variant={renamingVariant}
          onClose={() => setRenamingVariant(null)}
          onRenamed={refreshVariants}
        />
      )}

      <ConfirmDialog
        isOpen={Boolean(deletingVariant)}
        title={`Delete "${deletingVariant?.name}"?`}
        description="Are you sure you want to delete this master variant? Existing applications created from this variant will remain completely safe and untouched."
        confirmText="Delete Variant"
        cancelText="Cancel"
        variant="danger"
        loading={isDeleting}
        onClose={() => setDeletingVariant(null)}
        onConfirm={handleDeleteConfirm}
      />

      <SmartImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={async (newVariant) => {
          await refreshVariants()
          onOpenVariant?.(newVariant.id)
        }}
      />
    </div>
  )
}
