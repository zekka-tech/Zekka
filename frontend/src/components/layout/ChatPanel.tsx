import { cn } from '@/lib/cn'

export const ChatPanel = () => {
  return (
    <div className={cn(
      "flex flex-col h-full",
      "p-4"
    )}>
      <h2 className="text-lg font-semibold mb-4">Chat</h2>
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground text-center">
          Chat interface will go here
        </p>
      </div>
    </div>
  )
}
