import { useState } from 'react'
import { Modal } from '../../components/ui/Modal.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Input } from '../../components/ui/Input.jsx'
import { renameVariant } from '../../database/variantRepository.js'
import { useToast } from '../../hooks/useToast.js'

export function RenameVariantModal({ isOpen, onClose, variant, onRenamed }) {
  const [name, setName] = useState(variant?.name || '')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const toast = useToast()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Variant name cannot be empty.')
      return
    }

    try {
      setIsSubmitting(true)
      setError('')
      const updated = await renameVariant(variant.id, name.trim())
      toast.success(`Renamed variant to "${updated.name}"`)
      onRenamed?.(updated)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to rename variant.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Rename Master Resume"
      description="Update the name of this master variant."
      size="sm"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="flex-1 sm:flex-initial">
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={isSubmitting} className="flex-1 sm:flex-initial">
            Save Changes
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Variant Name"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (error) setError('')
          }}
          error={error}
          required
          autoFocus
        />
      </form>
    </Modal>
  )
}
