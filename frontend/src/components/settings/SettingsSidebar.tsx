import { type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import {
  Settings as SettingsIcon,
  Palette,
  Bell,
  Lock,
  Code,
} from 'lucide-react'

export type SettingCategory = 'general' | 'appearance' | 'notifications' | 'privacy' | 'advanced'

export interface SettingsCategoryItem {
  id: SettingCategory
  label: string
  description: string
  icon: ReactNode
}

export const SETTINGS_CATEGORIES: SettingsCategoryItem[] = [
  {
    id: 'general',
    label: 'General',
    description: 'Basic application settings',
    icon: <SettingsIcon className="w-4 h-4" />,
  },
  {
    id: 'appearance',
    label: 'Appearance',
    description: 'Theme and visual preferences',
    icon: <Palette className="w-4 h-4" />,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    description: 'Alert and notification settings',
    icon: <Bell className="w-4 h-4" />,
  },
  {
    id: 'privacy',
    label: 'Privacy',
    description: 'Data and privacy settings',
    icon: <Lock className="w-4 h-4" />,
  },
  {
    id: 'advanced',
    label: 'Advanced',
    description: 'Advanced features and options',
    icon: <Code className="w-4 h-4" />,
  },
]

export interface SettingsSidebarProps {
  activeCategory: SettingCategory
  onCategoryChange: (category: SettingCategory) => void
}

export const SettingsSidebar = ({
  activeCategory,
  onCategoryChange,
}: SettingsSidebarProps) => {
  return (
    <div className="w-48 border-r border-border bg-background">
      <nav className="space-y-1 p-4">
        {SETTINGS_CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={cn(
              'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
              'flex items-center gap-3',
              activeCategory === category.id
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-foreground/70 hover:text-foreground hover:bg-muted'
            )}
            aria-current={activeCategory === category.id ? 'page' : undefined}
          >
            <span className="flex-shrink-0">{category.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{category.label}</div>
              <div className="text-xs text-muted-foreground truncate">
                {category.description}
              </div>
            </div>
          </button>
        ))}
      </nav>
    </div>
  )
}
