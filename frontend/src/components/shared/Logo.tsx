import { Zap } from 'lucide-react'
import { cn } from '@/lib/cn'

export const Logo = () => {
  return (
    <div className={cn(
      "w-8 h-8 rounded-lg",
      "bg-gradient-to-br from-primary to-primary/80",
      "flex items-center justify-center",
      "text-white font-bold text-sm"
    )}>
      <Zap className="w-5 h-5" />
    </div>
  )
}
