import { type ReactNode } from 'react'
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
