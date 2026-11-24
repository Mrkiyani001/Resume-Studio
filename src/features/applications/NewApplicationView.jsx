import { useState, useEffect } from 'react'
import { PlusCircle, ArrowRight, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react'
import { getAllVariants } from '../../database/variantRepository.js'
import { createApplication } from '../../database/applicationRepository.js'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Input } from '../../components/ui/Input.jsx'
import { useToast } from '../../hooks/useToast.js'

export function NewApplicationView({ preselectedVariantId, onOpenApplication, onNavigate }) {
  const [variants, setVariants] = useState([])
  const [selectedVariantId, setSelectedVariantId] = useState(preselectedVariantId || '')
  const [companyName, setCompanyName] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const toast = useToast()

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        const list = await getAllVariants()
        setVariants(list)

        // Select preselected variant, or default to the first variant
        const initialVariant =
          list.find((v) => v.id === preselectedVariantId) || list[0]

        if (initialVariant) {
          setSelectedVariantId(initialVariant.id)
          setJobTitle(initialVariant.resumeData?.personalInfo?.headline || '')
        }
      } catch {
        toast.error('Failed to load master variants.')
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [preselectedVariantId, toast])

  function handleVariantChange(newVariantId) {
    setSelectedVariantId(newVariantId)
    const matched = variants.find((v) => v.id === newVariantId)
    if (matched) {
      // Auto-populate Job Title to matched variant's headline
      setJobTitle(matched.resumeData?.personalInfo?.headline || '')
    }
    if (errors.variant) {
      setErrors((prev) => ({ ...prev, variant: '' }))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const newErrors = {}

    if (!selectedVariantId) {
      newErrors.variant = 'Please select a master resume variant.'
    }
    if (!companyName.trim()) {
      newErrors.companyName = 'Company name is required for internal archiving.'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    const selectedVariant = variants.find((v) => v.id === selectedVariantId)
    if (!selectedVariant) {
      setErrors({ variant: 'Selected master variant not found.' })
      return
    }

    try {
      setIsSubmitting(true)
      const app = await createApplication(selectedVariant, {
        companyName: companyName.trim(),
        jobTitle: jobTitle.trim(),
      })

      toast.success(`Created application for ${app.companyName}`)
      onOpenApplication?.(app.id)
    } catch (err) {
      toast.error(err.message || 'Failed to create application.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="py-20 text-center text-xs text-slate-400 animate-pulse">
        Loading variants for new application...
      </div>
    )
  }

  if (variants.length === 0) {
    return (
      <Card className="max-w-md mx-auto text-center py-10">
        <CardHeader>
          <div className="h-12 w-12 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="h-6 w-6" />
          </div>
          <CardTitle>No Master Resumes Found</CardTitle>
          <CardDescription>
            You need at least one master resume variant before creating an application.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="primary" onClick={() => onNavigate?.('my-resumes')}>
            Go to My Resumes
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Create New Application
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Deep-copies your master resume into an isolated, tailored application.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} noValidate>
          <CardHeader>
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Application Setup
              </span>
            </div>
            <CardTitle>Target Role & Company Details</CardTitle>
            <CardDescription>
              Edits to this application will never alter your master resume.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* 1. Master Variant Selection */}
            <div className="space-y-1.5">
              <label
                htmlFor="master-variant-select"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between"
              >
                <span>
                  Base Master Variant <span className="text-red-500">*</span>
                </span>
              </label>
              <select
                id="master-variant-select"
                value={selectedVariantId}
                onChange={(e) => handleVariantChange(e.target.value)}
                className="w-full min-h-[44px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.resumeData?.personalInfo?.headline || 'Untitled'})
                  </option>
                ))}
              </select>
              {errors.variant && (
                <p className="text-xs text-red-500 font-medium">{errors.variant}</p>
              )}
            </div>

            {/* 2. Target Company Name */}
            <Input
              label="Company Name"
              placeholder="e.g. Stripe, Linear, Notion"
              value={companyName}
              onChange={(e) => {
                setCompanyName(e.target.value)
                if (errors.companyName) setErrors((prev) => ({ ...prev, companyName: '' }))
              }}
              error={errors.companyName}
              helperText="Required internal metadata ONLY. Will NEVER appear on the generated PDF or filename."
              required
            />

            {/* 3. Job Title */}
            <Input
              label="Job Title / Headline"
              placeholder="e.g. Senior Product Designer"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              helperText="Auto-populates the visible professional headline beneath your name in this tailored copy."
            />

            {/* Privacy notice */}
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-slate-500 dark:text-slate-400">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed">
                <strong className="text-slate-700 dark:text-slate-200">Zero cloud sync:</strong> All application data and subsequent PDF exports are saved locally in your browser.
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              onClick={() => onNavigate?.('my-resumes')}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              leftIcon={PlusCircle}
              rightIcon={ArrowRight}
              className="w-full sm:w-auto text-xs sm:text-sm whitespace-nowrap"
            >
              Create Application & Open Editor
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
