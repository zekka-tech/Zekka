import { ThreeColumnLayout } from '@/components/layout/ThreeColumnLayout'
import { SourcesPanel } from '@/components/layout/SourcesPanel'
import { ChatPanel } from '@/components/layout/ChatPanel'
import { AgentPanel } from '@/components/layout/AgentPanel'

export const Dashboard = () => {
  return (
    <ThreeColumnLayout
      leftPanel={{
        id: 'sources',
        children: <SourcesPanel />,
        defaultWidth: 280,
        collapsible: true,
      }}
      centerPanel={{
        id: 'chat',
        children: <ChatPanel />,
        defaultWidth: 600,
      }}
      rightPanel={{
        id: 'agents',
        children: <AgentPanel />,
        defaultWidth: 360,
        collapsible: true,
      }}
    />
  )
}
