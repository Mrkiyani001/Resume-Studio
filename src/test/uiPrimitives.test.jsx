import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Textarea } from '../components/ui/Textarea.jsx'
import { ToggleSwitch } from '../components/ui/ToggleSwitch.jsx'
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx'
import { SaveStateBadge } from '../components/ui/SaveStateBadge.jsx'

describe('Reusable UI Primitives', () => {
  describe('Button', () => {
    it('renders with text and handles click events', () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>Click Me</Button>)

      const btn = screen.getByRole('button', { name: /click me/i })
      expect(btn).toBeInTheDocument()
      fireEvent.click(btn)
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('disables button when loading or disabled prop is set', () => {
      const handleClick = vi.fn()
      const { rerender } = render(
        <Button disabled onClick={handleClick}>
          Disabled Button
        </Button>
      )
      const btn = screen.getByRole('button', { name: /disabled button/i })
      expect(btn).toBeDisabled()
      fireEvent.click(btn)
      expect(handleClick).not.toHaveBeenCalled()

      rerender(
        <Button loading onClick={handleClick}>
          Loading Button
        </Button>
      )
      expect(screen.getByRole('button')).toBeDisabled()
    })
  })

  describe('Input & Textarea', () => {
    it('renders label, input, and displays error messages with aria-invalid', () => {
      render(
        <Input
          label="Company Name"
          placeholder="Enter company..."
          error="Company name is required"
        />
      )

      expect(screen.getByLabelText(/company name/i)).toBeInTheDocument()
      const input = screen.getByPlaceholderText(/enter company.../i)
      expect(input).toHaveAttribute('aria-invalid', 'true')
      expect(screen.getByText(/company name is required/i)).toBeInTheDocument()
    })

    it('renders textarea with custom rows and helper text', () => {
      render(
        <Textarea
          label="Professional Summary"
          helperText="Write 2-3 sentences highlighting experience"
        />
      )

      expect(screen.getByLabelText(/professional summary/i)).toBeInTheDocument()
      expect(screen.getByText(/write 2-3 sentences/i)).toBeInTheDocument()
    })
  })

  describe('ToggleSwitch', () => {
    it('toggles checked state and triggers onChange', () => {
      function ControlledSwitch() {
        const [checked, setChecked] = useState(false)
        return (
          <ToggleSwitch
            label="LinkedIn Visibility"
            checked={checked}
            onChange={setChecked}
          />
        )
      }

      render(<ControlledSwitch />)
      const switchBtn = screen.getByRole('switch')
      expect(switchBtn).toHaveAttribute('aria-checked', 'false')

      fireEvent.click(switchBtn)
      expect(switchBtn).toHaveAttribute('aria-checked', 'true')

      fireEvent.click(switchBtn)
      expect(switchBtn).toHaveAttribute('aria-checked', 'false')
    })
  })

  describe('ConfirmDialog', () => {
    it('renders dialog and handles confirm / cancel actions', () => {
      const handleConfirm = vi.fn()
      const handleClose = vi.fn()

      render(
        <ConfirmDialog
          isOpen={true}
          title="Delete Variant?"
          description="This action cannot be undone."
          confirmText="Yes, Delete"
          cancelText="Cancel"
          onConfirm={handleConfirm}
          onClose={handleClose}
        />
      )

      expect(screen.getByText('Delete Variant?')).toBeInTheDocument()
      expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument()

      const confirmBtn = screen.getByRole('button', { name: /yes, delete/i })
      fireEvent.click(confirmBtn)
      expect(handleConfirm).toHaveBeenCalledTimes(1)

      const cancelBtn = screen.getByRole('button', { name: /cancel/i })
      fireEvent.click(cancelBtn)
      expect(handleClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('SaveStateBadge', () => {
    it('renders all required status states correctly', () => {
      const { rerender } = render(<SaveStateBadge state="saving" />)
      expect(screen.getByText('Saving...')).toBeInTheDocument()

      rerender(<SaveStateBadge state="saved" />)
      expect(screen.getByText('Saved')).toBeInTheDocument()

      rerender(<SaveStateBadge state="offline" />)
      expect(screen.getByText('Offline (Local)')).toBeInTheDocument()

      rerender(<SaveStateBadge state="error" />)
      expect(screen.getByText('Save failed')).toBeInTheDocument()

      rerender(<SaveStateBadge state="idle" />)
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })
  })
})
