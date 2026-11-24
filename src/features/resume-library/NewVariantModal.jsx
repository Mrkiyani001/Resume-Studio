import { useState } from 'react'
import { Modal } from '../../components/ui/Modal.jsx'
import { Button } from '../../components/ui/Button.jsx'
import { Input } from '../../components/ui/Input.jsx'
import { createVariant } from '../../database/variantRepository.js'
import { useToast } from '../../hooks/useToast.js'

export function NewVariantModal({ isOpen, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const toast = useToast()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Variant name is required.')
      return
    }

    try {
      setIsSubmitting(true)
      setError('')
      const created = await createVariant({ name: name.trim() })
      toast.success(`Created variant "${created.name}"`)
      setName('')
      onCreated?.(created)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to create resume variant.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleClose() {
    setName('')
    setError('')
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Master Resume"
      description="Start a new master resume variant with clean, structured sections."
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={isSubmitting}>
            Create Resume
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Variant Name"
          placeholder="e.g. Senior Frontend Engineer"
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
