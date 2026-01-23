import { useState } from 'react'
import { cn } from '@/lib/cn'
import { XIcon } from 'lucide-react'

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: { name: string; description?: string; settings?: any }) => void
  isLoading?: boolean
}

export const CreateProjectDialog = ({
  open,
  onOpenChange,
  onSubmit,
  isLoading
}: CreateProjectDialogProps) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: false,
    allowComments: true,
    notificationsEnabled: true
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required'
    } else if (formData.name.length < 3) {
      newErrors.name = 'Project name must be at least 3 characters'
    } else if (formData.name.length > 50) {
      newErrors.name = 'Project name must not exceed 50 characters'
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must not exceed 500 characters'
    }

    return newErrors
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const newErrors = validateForm()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onSubmit({
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      settings: {
        isPublic: formData.isPublic,
        allowComments: formData.allowComments,
        notificationsEnabled: formData.notificationsEnabled
      }
    })

    // Reset form
    setFormData({
      name: '',
      description: '',
      isPublic: false,
      allowComments: true,
      notificationsEnabled: true
    })
    setErrors({})
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className={cn(
        "bg-card rounded-lg border border-border",
        "w-full max-w-md",
        "shadow-lg"
      )}>
        {/* Header */}
        <div className={cn(
          "flex items-center justify-between p-6",
          "border-b border-border"
        )}>
          <div>
            <h2 className="text-xl font-semibold">Create Project</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Start a new AI agent orchestration project
            </p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Project Name */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Project Name
              <span className="text-destructive ml-1">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value })
                if (errors.name) setErrors({ ...errors, name: '' })
              }}
              placeholder="e.g., Customer Support AI"
              className={cn(
                "w-full px-3 py-2 rounded-lg border",
                "bg-background text-foreground",
                "placeholder:text-muted-foreground",
                "outline-none transition-colors",
                errors.name
                  ? 'border-destructive focus:border-destructive'
                  : 'border-border focus:border-primary'
              )}
            />
            {errors.name && (
              <p className="text-xs text-destructive mt-1">{errors.name}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {formData.name.length}/50 characters
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => {
                setFormData({ ...formData, description: e.target.value })
                if (errors.description) setErrors({ ...errors, description: '' })
              }}
              placeholder="Describe your project and its goals..."
              rows={4}
              className={cn(
                "w-full px-3 py-2 rounded-lg border",
                "bg-background text-foreground resize-none",
                "placeholder:text-muted-foreground",
                "outline-none transition-colors",
                errors.description
                  ? 'border-destructive focus:border-destructive'
                  : 'border-border focus:border-primary'
              )}
            />
            {errors.description && (
              <p className="text-xs text-destructive mt-1">{errors.description}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {formData.description.length}/500 characters
            </p>
          </div>

          {/* Settings */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isPublic"
                checked={formData.isPublic}
                onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                className="w-4 h-4 rounded border-border"
              />
              <label htmlFor="isPublic" className="text-sm font-medium cursor-pointer">
                Make project public
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="allowComments"
                checked={formData.allowComments}
                onChange={(e) => setFormData({ ...formData, allowComments: e.target.checked })}
                className="w-4 h-4 rounded border-border"
              />
              <label htmlFor="allowComments" className="text-sm font-medium cursor-pointer">
                Allow team comments
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="notificationsEnabled"
                checked={formData.notificationsEnabled}
                onChange={(e) => setFormData({ ...formData, notificationsEnabled: e.target.checked })}
                className="w-4 h-4 rounded border-border"
              />
              <label htmlFor="notificationsEnabled" className="text-sm font-medium cursor-pointer">
                Enable notifications
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className={cn(
                "flex-1 px-4 py-2 rounded-lg font-medium",
                "bg-muted hover:bg-muted/80 transition-colors",
                "text-foreground"
              )}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.name.trim()}
              className={cn(
                "flex-1 px-4 py-2 rounded-lg font-medium",
                "bg-primary text-primary-foreground",
                "hover:bg-primary/90 transition-colors",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isLoading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
