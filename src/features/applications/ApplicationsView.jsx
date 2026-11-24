import { useState, useEffect, useCallback } from 'react'
import {
  Briefcase,
  Search,
  Filter,
  Copy,
  Trash2,
  ArrowRight,
  Clock,
  Plus,
  CheckCircle2,
  Eye,
  Download,
} from 'lucide-react'
import {
  getAllApplications,
  duplicateApplication,
  deleteApplication,
} from '../../database/applicationRepository.js'
import { getAllVariants } from '../../database/variantRepository.js'
import { getArchivedPdfsByApplicationId } from '../../database/archiveRepository.js'
import { downloadBlob } from '../pdf-export/exportPipeline.js'
import { PdfViewerModal } from '../../components/preview/PdfViewerModal.jsx'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Badge } from '../../components/ui/Badge.jsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx'
import { useToast } from '../../hooks/useToast.js'
import { formatDate, formatRelativeTime } from '../../lib/dateUtils.js'

export function ApplicationsView({ onOpenApplication, onNavigate }) {
  const [applications, setApplications] = useState([])
  const [variants, setVariants] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedVariantFilter, setSelectedVariantFilter] = useState('all')
  const [sortBy, setSortBy] = useState('updatedAt-desc')
  const [isLoading, setIsLoading] = useState(true)
  const [deletingApp, setDeletingApp] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [viewingPdf, setViewingPdf] = useState(null)
  const toast = useToast()

  const refreshData = useCallback(async () => {
    try {
      const [appList, variantList] = await Promise.all([
        getAllApplications(),
        getAllVariants(),
      ])
      setApplications(appList)
      setVariants(variantList)
    } catch {
      toast.error('Failed to load applications.')
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    let isMounted = true
    Promise.all([getAllApplications(), getAllVariants()])
      .then(([appList, variantList]) => {
        if (isMounted) {
          setApplications(appList)
          setVariants(variantList)
          setIsLoading(false)
        }
      })
      .catch(() => {
        if (isMounted) {
          toast.error('Failed to load applications.')
          setIsLoading(false)
        }
      })
    return () => {
      isMounted = false
    }
  }, [toast])

  async function handleDuplicate(app) {
    try {
      const dup = await duplicateApplication(app.id)
      toast.success(`Duplicated application for "${dup.companyName}"`)
      await refreshData()
    } catch (err) {
      toast.error(err.message || 'Failed to duplicate application.')
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingApp) return
    try {
      setIsDeleting(true)
      await deleteApplication(deletingApp.id)
      toast.success(`Deleted application for "${deletingApp.companyName}"`)
      setDeletingApp(null)
      await refreshData()
    } catch (err) {
      toast.error(err.message || 'Failed to delete application.')
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleViewArchivedPdf(app) {
    try {
      const archives = await getArchivedPdfsByApplicationId(app.id)
      if (!archives || archives.length === 0) {
        toast.info('No archived PDFs found for this application.')
        return
      }
      const latest = archives[0]
      setViewingPdf({
        isOpen: true,
        pdfBlob: latest.pdfBlob,
        filename: latest.filename,
      })
    } catch (err) {
      toast.error(err.message || 'Failed to retrieve archived PDF.')
    }
  }

  async function handleDownloadArchivedPdf(app) {
    try {
      const archives = await getArchivedPdfsByApplicationId(app.id)
      if (!archives || archives.length === 0) {
        toast.info('No archived PDFs found for this application.')
        return
      }
      const latest = archives[0]
      downloadBlob(latest.pdfBlob, latest.filename)
      toast.success(`Downloaded archived ${latest.filename}`)
    } catch (err) {
      toast.error(err.message || 'Failed to download archived PDF.')
    }
  }

  // Filter & Search Logic
  const filteredApplications = applications
    .filter((app) => {
      // 1. Variant Filter
      if (selectedVariantFilter !== 'all' && app.variantId !== selectedVariantFilter) {
        return false
      }
      // 2. Search Query (matches companyName, jobTitle, or variantName)
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase()
        const matchCompany = (app.companyName || '').toLowerCase().includes(q)
        const matchTitle = (app.jobTitle || '').toLowerCase().includes(q)
        const matchVariant = (app.variantName || '').toLowerCase().includes(q)
        return matchCompany || matchTitle || matchVariant
      }
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'updatedAt-desc') {
        return new Date(b.updatedAt) - new Date(a.updatedAt)
      }
      if (sortBy === 'updatedAt-asc') {
        return new Date(a.updatedAt) - new Date(b.updatedAt)
      }
      if (sortBy === 'createdAt-desc') {
        return new Date(b.createdAt) - new Date(a.createdAt)
      }
      if (sortBy === 'company-asc') {
        return (a.companyName || '').localeCompare(b.companyName || '')
      }
      return 0
    })

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Applications Archive
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Archived tailored applications and editable snapshots.
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={Plus}
          onClick={() => onNavigate?.('new-application')}
        >
          New Application
        </Button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Live Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="search"
            placeholder="Search by company, job title, or variant..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-[44px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Variant Filter Dropdown */}
        <div className="flex items-center gap-2">
          <div className="relative shrink-0">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <select
              aria-label="Filter by resume variant"
              value={selectedVariantFilter}
              onChange={(e) => setSelectedVariantFilter(e.target.value)}
              className="min-h-[44px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-8 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Variants ({applications.length})</option>
              {variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Dropdown */}
          <select
            aria-label="Sort applications"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="min-h-[44px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="updatedAt-desc">Recently Modified</option>
            <option value="createdAt-desc">Recently Created</option>
            <option value="updatedAt-asc">Oldest Modified</option>
            <option value="company-asc">Company (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Applications List */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-slate-400 animate-pulse">
          Loading applications archive...
        </div>
      ) : filteredApplications.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="text-center py-12">
            <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 flex items-center justify-center mx-auto mb-3">
              <Briefcase className="h-6 w-6" />
            </div>
            <CardTitle>
              {applications.length === 0
                ? 'No Applications Created Yet'
                : 'No Matching Applications'}
            </CardTitle>
            <CardDescription>
              {applications.length === 0
                ? 'Create a new tailored application from any master variant to start tracking.'
                : 'Try adjusting your search query or variant filter.'}
            </CardDescription>
          </CardHeader>
          {applications.length === 0 && (
            <CardContent className="text-center">
              <Button
                variant="primary"
                leftIcon={Plus}
                onClick={() => onNavigate?.('new-application')}
              >
                Create First Application
              </Button>
            </CardContent>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredApplications.map((app) => {
            const hasExported = (app.exportCount || 0) > 0

            return (
              <Card
                key={app.id}
                className="flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all group"
              >
                <CardHeader className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base sm:text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {app.companyName}
                    </CardTitle>

                    {/* Export status badge */}
                    {hasExported ? (
                      <Badge variant="success" className="gap-1 shrink-0 text-[10px]">
                        <CheckCircle2 className="h-3 w-3" />
                        Exported ({app.exportCount})
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        Draft
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 line-clamp-1">
                    {app.jobTitle || 'No Title'}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    <Badge variant="secondary" className="text-[10px] py-0 px-2">
                      {app.variantName || 'Variant'}
                    </Badge>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatRelativeTime(app.updatedAt)}
                    </span>
                    <span>•</span>
                    <span>Created {formatDate(app.createdAt)}</span>
                  </div>
                </CardHeader>

                <CardFooter className="flex items-center justify-between gap-2 pt-3 flex-wrap">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Duplicate application"
                      onClick={() => handleDuplicate(app)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600 dark:text-red-400"
                      title="Delete application"
                      onClick={() => setDeletingApp(app)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    {hasExported && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={Eye}
                          className="text-xs"
                          onClick={() => handleViewArchivedPdf(app)}
                          title="View stored PDF Blob"
                        >
                          View PDF
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadArchivedPdf(app)}
                          title="Download stored PDF Blob"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    rightIcon={ArrowRight}
                    onClick={() => onOpenApplication?.(app.id)}
                  >
                    Edit Copy
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingApp)}
        title={`Delete Application for "${deletingApp?.companyName}"?`}
        description="Are you sure you want to delete this tailored application? The master resume variant will remain safe."
        confirmText="Delete Application"
        cancelText="Cancel"
        variant="danger"
        loading={isDeleting}
        onClose={() => setDeletingApp(null)}
        onConfirm={handleDeleteConfirm}
      />

      {/* Archived PDF Viewer Modal */}
      {viewingPdf && (
        <PdfViewerModal
          isOpen={viewingPdf.isOpen}
          onClose={() => setViewingPdf(null)}
          pdfBlob={viewingPdf.pdfBlob}
          filename={viewingPdf.filename}
          isArchived={true}
        />
      )}
    </div>
  )
}
