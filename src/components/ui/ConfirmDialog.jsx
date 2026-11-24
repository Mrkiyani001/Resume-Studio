import { Modal } from './Modal.jsx'
import { Button } from './Button.jsx'
import { AlertTriangle, Info } from 'lucide-react'

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            size="md"
            loading={loading}
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3.5 py-1">
        <div
          className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center ${
            variant === 'danger'
              ? 'bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400'
              : 'bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
          }`}
        >
          {variant === 'danger' ? (
            <AlertTriangle className="h-5 w-5" />
          ) : (
            <Info className="h-5 w-5" />
          )}
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </h4>
          {description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
    </Modal>
  )
}
