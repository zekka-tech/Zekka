import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn } from '@/lib/cn'
import { XIcon } from 'lucide-react'

const createProjectSchema = z.object({
  name: z
    .string()
    .min(3, 'Project name must be at least 3 characters')
    .max(50, 'Project name must not exceed 50 characters'),
  description: z
    .string()
    .max(500, 'Description must not exceed 500 characters')
    .optional(),
  isPublic: z.boolean(),
  allowComments: z.boolean(),
  notificationsEnabled: z.boolean()
})

type CreateProjectFormValues = z.infer<typeof createProjectSchema>

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: { name: string; description?: string; settings?: Record<string, boolean> }) => void
  isLoading?: boolean
}

export const CreateProjectDialog = ({
  open,
  onOpenChange,
  onSubmit,
  isLoading
}: CreateProjectDialogProps) => {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors }
  } = useForm<CreateProjectFormValues>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: '',
      description: '',
      isPublic: false,
      allowComments: true,
      notificationsEnabled: true
    }
  })

  const nameValue = watch('name', '')
  const descriptionValue = watch('description', '')

  const onFormSubmit = (values: CreateProjectFormValues) => {
    onSubmit({
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
      settings: {
        isPublic: values.isPublic,
        allowComments: values.allowComments,
        notificationsEnabled: values.notificationsEnabled
      }
    })
    reset()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className={cn(
        "bg-card rounded-lg border border-border",
        "w-full max-w-md shadow-lg"
      )}>
        {/* Header */}
        <div className={cn("flex items-center justify-between p-6", "border-b border-border")}>
          <div>
            <h2 className="text-xl font-semibold">Create Project</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Start a new AI agent orchestration project
            </p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 hover:bg-muted rounded transition-colors"
            aria-label="Close dialog"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onFormSubmit)} className="p-6 space-y-4" noValidate>
          {/* Project Name */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Project Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Customer Support AI"
              disabled={isLoading}
              aria-invalid={!!errors.name}
              {...register('name')}
              className={cn(
                "w-full px-3 py-2 rounded-lg border",
                "bg-background text-foreground placeholder:text-muted-foreground",
                "outline-none transition-colors",
                errors.name
                  ? 'border-destructive focus:border-destructive'
                  : 'border-border focus:border-primary'
              )}
            />
            {errors.name ? (
              <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">{nameValue.length}/50 characters</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium mb-2 block">Description</label>
            <textarea
              placeholder="Describe your project and its goals..."
              rows={4}
              disabled={isLoading}
              aria-invalid={!!errors.description}
              {...register('description')}
              className={cn(
                "w-full px-3 py-2 rounded-lg border",
                "bg-background text-foreground resize-none placeholder:text-muted-foreground",
                "outline-none transition-colors",
                errors.description
                  ? 'border-destructive focus:border-destructive'
                  : 'border-border focus:border-primary'
              )}
            />
            {errors.description ? (
              <p className="text-xs text-destructive mt-1">{errors.description.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">{(descriptionValue ?? '').length}/500 characters</p>
            )}
          </div>

          {/* Settings */}
          <div className="space-y-3">
            {([
              ['isPublic', 'Make project public'],
              ['allowComments', 'Allow team comments'],
              ['notificationsEnabled', 'Enable notifications']
            ] as const).map(([field, label]) => (
              <div key={field} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id={field}
                  disabled={isLoading}
                  {...register(field)}
                  className="w-4 h-4 rounded border-border"
                />
                <label htmlFor={field} className="text-sm font-medium cursor-pointer">{label}</label>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className={cn(
                "flex-1 px-4 py-2 rounded-lg font-medium",
                "bg-muted hover:bg-muted/80 transition-colors text-foreground"
              )}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
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
