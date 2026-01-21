import { type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { ChevronDown } from 'lucide-react'

export interface SelectOption<T> {
  value: T
  label: string
  description?: string
}

export interface SettingSelectProps<T extends string | number> {
  label: string
  description?: string
  value: T
  options: SelectOption<T>[]
  onChange: (value: T) => void
  disabled?: boolean
  children?: ReactNode
}

export const SettingSelect = <T extends string | number>({
  label,
  description,
  value,
  options,
  onChange,
  disabled = false,
  children,
}: SettingSelectProps<T>) => {
  return (
    <div className="py-4">
      <label className="text-sm font-medium text-foreground block mb-2">
        {label}
      </label>
      {description && (
        <p className="text-xs text-muted-foreground mb-3">{description}</p>
      )}

      <div className="relative">
        <select
          value={value}
          onChange={(e) => {
            const selectedOption = options.find(
              (opt) => String(opt.value) === e.target.value
            )
            if (selectedOption) {
              onChange(selectedOption.value)
            }
          }}
          disabled={disabled}
          className={cn(
            'w-full appearance-none px-3 py-2 rounded-md border border-border',
            'bg-background text-foreground text-sm',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
            'transition-colors',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {options.map((option) => (
            <option key={String(option.value)} value={String(option.value)}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      </div>

      {children && <div className="mt-2">{children}</div>}
    </div>
  )
}
