# Zekka UI - Technical Specification Document

**Project:** Zekka Framework - Browser-Based User Interface
**Prepared by:** Claude (Senior Software Project Manager)
**Date:** January 21, 2026
**Version:** 1.0
**Status:** Approved for Implementation

---

## Executive Summary

This document specifies the technical architecture and implementation details for the Zekka Framework's browser-based user interface. The UI will blend best-in-class patterns from Google AI Studio, NotebookLM, Genspark AI, and modern AI interface design principles.

### Key Decisions Made

✅ **Frontend Framework:** React 18+ with TypeScript
✅ **Development Priority:** Browser UI first, CLI in Phase 2
✅ **Core Features:** Agent Dashboard + AI Chat + Three-Panel Workspace
✅ **Timeline:** 12 weeks (5 phases)
✅ **Design System:** Material Design 3 principles with Tailwind CSS

---

## 1. Architecture Overview

### 1.1 Technology Stack

```yaml
Frontend:
  Framework: React 18.2+
  Language: TypeScript 5.0+ (strict mode)
  Build Tool: Vite 5.0+
  Package Manager: npm

UI Framework:
  Component Library: Radix UI (headless, accessible)
  Styling: Tailwind CSS 3.4+
  Icons: Lucide React
  Animations: Framer Motion

State Management:
  Global State: Zustand 4.5+
  Server State: TanStack Query (React Query) v5
  Form State: React Hook Form + Zod validation

Real-Time Communication:
  WebSocket Client: Socket.IO Client 4.6+
  HTTP Client: Axios 1.6+

Code Display:
  Syntax Highlighting: Prism React Renderer
  Code Blocks: React Syntax Highlighter

Testing:
  Unit/Integration: Vitest + React Testing Library
  E2E: Playwright
  Coverage Target: 80%+

Development Tools:
  Linting: ESLint + @typescript-eslint
  Formatting: Prettier
  Git Hooks: Husky + lint-staged
  Type Checking: TypeScript Compiler
```

### 1.2 Project Structure

```
frontend/
├── public/
│   ├── favicon.ico
│   ├── manifest.json           # PWA manifest
│   └── sw.js                   # Service worker
├── src/
│   ├── components/             # React components
│   │   ├── ui/                 # Base UI components (Radix + Tailwind)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   └── ...
│   │   ├── layout/             # Layout components
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── MainPanel.tsx
│   │   │   ├── RightPanel.tsx
│   │   │   └── ThreeColumnLayout.tsx
│   │   ├── chat/               # AI chat components
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── MessageList.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── StreamingMessage.tsx
│   │   │   ├── CodeBlock.tsx
│   │   │   ├── InlineCitation.tsx
│   │   │   └── InputArea.tsx
│   │   ├── agents/             # Agent dashboard components
│   │   │   ├── AgentDashboard.tsx
│   │   │   ├── AgentCard.tsx
│   │   │   ├── AgentActivityTimeline.tsx
│   │   │   ├── AgentOrchestration.tsx
│   │   │   └── AgentMetrics.tsx
│   │   ├── projects/           # Project management
│   │   │   ├── ProjectList.tsx
│   │   │   ├── ProjectDetail.tsx
│   │   │   ├── CreateProject.tsx
│   │   │   └── ProjectSettings.tsx
│   │   ├── auth/               # Authentication
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   ├── MFASetup.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   └── shared/             # Shared components
│   │       ├── LoadingSkeleton.tsx
│   │       ├── ErrorBoundary.tsx
│   │       ├── Toast.tsx
│   │       └── ProgressIndicator.tsx
│   ├── pages/                  # Page components (routes)
│   │   ├── Dashboard.tsx
│   │   ├── Chat.tsx
│   │   ├── Agents.tsx
│   │   ├── Projects.tsx
│   │   ├── Settings.tsx
│   │   └── Login.tsx
│   ├── hooks/                  # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useWebSocket.ts
│   │   ├── useAgentActivity.ts
│   │   ├── useTheme.ts
│   │   └── useKeyboardShortcuts.ts
│   ├── store/                  # Zustand stores
│   │   ├── authStore.ts
│   │   ├── themeStore.ts
│   │   ├── chatStore.ts
│   │   └── agentStore.ts
│   ├── services/               # API and service layer
│   │   ├── api.ts              # Axios instance
│   │   ├── authService.ts
│   │   ├── projectService.ts
│   │   ├── chatService.ts
│   │   ├── agentService.ts
│   │   └── websocket.ts        # WebSocket service
│   ├── types/                  # TypeScript type definitions
│   │   ├── api.types.ts
│   │   ├── chat.types.ts
│   │   ├── agent.types.ts
│   │   └── project.types.ts
│   ├── styles/                 # Global styles and theme
│   │   ├── globals.css         # Tailwind directives
│   │   ├── themes.css          # Theme variables
│   │   └── animations.css      # Custom animations
│   ├── lib/                    # Utility functions
│   │   ├── cn.ts               # Class name utility
│   │   ├── formatters.ts
│   │   └── validators.ts
│   ├── config/                 # Configuration files
│   │   ├── constants.ts
│   │   └── routes.ts
│   ├── App.tsx                 # Root component
│   ├── main.tsx                # Entry point
│   └── vite-env.d.ts           # Vite type definitions
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.development
├── .env.production
├── .eslintrc.cjs
├── .prettierrc
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

---

## 2. Design System

### 2.1 Color Palette (Material Design 3 Inspired)

```css
/* Light Mode */
--background: 0 0% 100%;           /* #FFFFFF */
--foreground: 222.2 84% 4.9%;      /* #202124 */
--card: 0 0% 98%;                  /* #F8F9FA */
--card-foreground: 222.2 84% 4.9%; /* #202124 */
--popover: 0 0% 100%;              /* #FFFFFF */
--popover-foreground: 222.2 84% 4.9%;
--primary: 217 91% 60%;            /* #1A73E8 Google Blue */
--primary-foreground: 210 40% 98%;
--secondary: 210 40% 96.1%;
--secondary-foreground: 222.2 47.4% 11.2%;
--muted: 210 40% 96.1%;
--muted-foreground: 215.4 16.3% 46.9%;
--accent: 210 40% 96.1%;
--accent-foreground: 222.2 47.4% 11.2%;
--destructive: 0 84.2% 60.2%;     /* #D93025 */
--destructive-foreground: 210 40% 98%;
--success: 142 71% 45%;            /* #1E8E3E */
--warning: 38 92% 50%;             /* #F9AB00 */
--border: 214.3 31.8% 91.4%;
--input: 214.3 31.8% 91.4%;
--ring: 217 91% 60%;

/* Dark Mode */
--background: 0 0% 0%;             /* #000000 */
--foreground: 210 40% 98%;         /* #E8EAED */
--card: 222.2 84% 4.9%;            /* #202124 */
--card-foreground: 210 40% 98%;
--popover: 222.2 84% 4.9%;
--popover-foreground: 210 40% 98%;
--primary: 217.2 91.2% 70%;        /* #8AB4F8 Light Blue */
--primary-foreground: 222.2 47.4% 11.2%;
--secondary: 217.2 32.6% 17.5%;
--secondary-foreground: 210 40% 98%;
--muted: 217.2 32.6% 17.5%;
--muted-foreground: 215 20.2% 65.1%;
--accent: 217.2 32.6% 17.5%;
--accent-foreground: 210 40% 98%;
--destructive: 0 62.8% 70%;        /* #F28B82 */
--destructive-foreground: 210 40% 98%;
--success: 142 71% 65%;            /* #81C995 */
--warning: 38 92% 70%;             /* #FDD663 */
--border: 217.2 32.6% 17.5%;
--input: 217.2 32.6% 17.5%;
--ring: 217.2 91.2% 70%;
```

### 2.2 Typography Scale

```typescript
// Font Families
const fonts = {
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
};

// Type Scale (Material Design 3)
const typography = {
  displayLarge: { size: '57px', lineHeight: '64px', weight: 400 },
  displayMedium: { size: '45px', lineHeight: '52px', weight: 400 },
  displaySmall: { size: '36px', lineHeight: '44px', weight: 400 },

  headlineLarge: { size: '32px', lineHeight: '40px', weight: 400 },
  headlineMedium: { size: '28px', lineHeight: '36px', weight: 400 },
  headlineSmall: { size: '24px', lineHeight: '32px', weight: 400 },

  titleLarge: { size: '22px', lineHeight: '28px', weight: 500 },
  titleMedium: { size: '16px', lineHeight: '24px', weight: 500 },
  titleSmall: { size: '14px', lineHeight: '20px', weight: 500 },

  bodyLarge: { size: '16px', lineHeight: '24px', weight: 400 },
  bodyMedium: { size: '14px', lineHeight: '20px', weight: 400 },
  bodySmall: { size: '12px', lineHeight: '16px', weight: 400 },

  labelLarge: { size: '14px', lineHeight: '20px', weight: 500 },
  labelMedium: { size: '12px', lineHeight: '16px', weight: 500 },
  labelSmall: { size: '11px', lineHeight: '16px', weight: 500 },
};
```

### 2.3 Spacing System (8px Grid)

```javascript
const spacing = {
  0: '0px',
  1: '4px',    // 0.25rem
  2: '8px',    // 0.5rem
  3: '12px',   // 0.75rem
  4: '16px',   // 1rem
  5: '20px',   // 1.25rem
  6: '24px',   // 1.5rem
  8: '32px',   // 2rem
  10: '40px',  // 2.5rem
  12: '48px',  // 3rem
  16: '64px',  // 4rem
  20: '80px',  // 5rem
  24: '96px',  // 6rem
};
```

### 2.4 Border Radius & Shadows

```css
/* Border Radius */
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
--radius-full: 9999px;

/* Shadows (Material Design 3) */
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
```

---

## 3. Core Features Specification

### 3.1 Three-Panel Workspace Layout

#### Layout Structure
```
┌────────────────────────────────────────────────────────────┐
│  Header (60px height)                                      │
│  [Logo] [Project Name] [Model Selector] [Budget] [User]  │
├──────────┬─────────────────────┬──────────────────────────┤
│ Sources  │   Main Chat Area    │   Agent Dashboard        │
│ Panel    │                     │   (Right Panel)          │
│ (280px)  │   (Flexible)        │   (360px)                │
│          │                     │                          │
│ • Files  │ Conversation        │ Active Agents:           │
│ • Docs   │ with AI             │ • Pydantic AI ⚙️         │
│ • APIs   │                     │ • Astron Agent ⚙️        │
│ • Context│ Streaming           │ • AutoAgent ⚙️           │
│          │ Responses           │                          │
│ [+Add]   │                     │ Token Usage: $2.14/$50   │
│          │ Code Blocks         │                          │
│          │ with Actions        │ Task Progress:           │
│          │                     │ [████████░░] 80%         │
│          │                     │                          │
└──────────┴─────────────────────┴──────────────────────────┘
```

#### Responsive Behavior
- **Desktop (>1280px):** All three panels visible
- **Laptop (1024-1280px):** Left panel collapsible, right panel overlay
- **Tablet (768-1024px):** Single panel + tabs, others as overlays
- **Mobile (<768px):** Full-screen single panel, bottom navigation

#### Panel Features
- Resizable via drag handles
- Collapsible with keyboard shortcuts
- State persists across sessions (localStorage)
- Smooth animation transitions (300ms ease-out)

### 3.2 AI Chat with Code Streaming

#### Message Types
```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    model?: string;
    tokenUsage?: { input: number; output: number };
    citations?: Citation[];
    codeBlocks?: CodeBlock[];
  };
  status: 'sending' | 'streaming' | 'complete' | 'error';
}

interface Citation {
  id: string;
  filePath: string;
  lineNumber?: number;
  snippet?: string;
}

interface CodeBlock {
  id: string;
  language: string;
  code: string;
  filename?: string;
  diff?: boolean;
}
```

#### Streaming Implementation
```typescript
// WebSocket event for streaming
socket.on('chat:stream', (chunk: StreamChunk) => {
  // Append chunk to current message
  appendToMessage(chunk.messageId, chunk.content);

  // Update UI in real-time (60fps throttled)
  requestAnimationFrame(() => renderMessage());
});

// Handle complete message
socket.on('chat:complete', (message: Message) => {
  finalizeMessage(message);
  showCitations(message.metadata?.citations);
});
```

#### Code Block Actions
- **Copy:** Copy code to clipboard with feedback toast
- **Apply:** Send code to backend to apply changes
- **Modify:** Open inline editor to make changes before applying
- **Explain:** Ask AI to explain the code
- **Test:** Generate and run tests for the code

#### Inline Citations
```tsx
<MessageBubble>
  <p>I've created a login component with email/password fields.</p>
  <CitationPills>
    <Citation file="src/components/Auth/AuthContext.tsx" line={42} />
    <Citation file="src/styles/theme.ts" line={15} />
  </CitationPills>
  <CodeBlock language="tsx" actions={['copy', 'apply', 'modify']}>
    {codeContent}
  </CodeBlock>
</MessageBubble>
```

### 3.3 Real-Time Agent Activity Dashboard

#### Agent Status Types
```typescript
interface AgentStatus {
  id: string;
  name: string;
  type: 'strategic' | 'implementation' | 'specialized' | 'support';
  status: 'idle' | 'active' | 'processing' | 'waiting' | 'error';
  currentTask?: Task;
  progress?: number;
  tokenUsage?: { input: number; output: number; cost: number };
  lastActivity?: Date;
}

interface Task {
  id: string;
  description: string;
  stage: string; // 1-10
  priority: 'low' | 'medium' | 'high' | 'critical';
  startedAt: Date;
  estimatedCompletion?: Date;
}
```

#### Dashboard Layout
```tsx
<AgentDashboard>
  <DashboardHeader>
    <h2>Agent Orchestration</h2>
    <MetricsSummary>
      <Stat label="Active" value={activeCount} />
      <Stat label="Token Usage" value={`$${totalCost}`} />
      <Stat label="Success Rate" value={`${successRate}%`} />
    </MetricsSummary>
  </DashboardHeader>

  <AgentGrid>
    {agents.map(agent => (
      <AgentCard key={agent.id} agent={agent}>
        <AgentIcon type={agent.type} status={agent.status} />
        <AgentName>{agent.name}</AgentName>
        <AgentStatus status={agent.status} />
        {agent.currentTask && (
          <TaskInfo task={agent.currentTask}>
            <TaskDescription>{agent.currentTask.description}</TaskDescription>
            <ProgressBar value={agent.progress} />
          </TaskInfo>
        )}
        <TokenUsage usage={agent.tokenUsage} />
      </AgentCard>
    ))}
  </AgentGrid>

  <ActivityTimeline>
    {activities.map(activity => (
      <TimelineItem key={activity.id} activity={activity} />
    ))}
  </ActivityTimeline>
</AgentDashboard>
```

#### Real-Time Updates
```typescript
// WebSocket events for agent activity
socket.on('agent:status', (data: AgentStatus) => {
  updateAgentStore(data);
});

socket.on('agent:task:start', (data: { agentId: string; task: Task }) => {
  addTaskToAgent(data.agentId, data.task);
});

socket.on('agent:task:progress', (data: { taskId: string; progress: number }) => {
  updateTaskProgress(data.taskId, data.progress);
});

socket.on('agent:task:complete', (data: { taskId: string; result: any }) => {
  completeTask(data.taskId, data.result);
  showSuccessToast(`Task ${data.taskId} completed`);
});
```

#### Visual Indicators
- **Pulsing dot:** Active/processing status
- **Spinning icon:** Loading/waiting state
- **Progress bars:** Task completion percentage
- **Color coding:**
  - Blue: Active
  - Gray: Idle
  - Yellow: Waiting
  - Green: Success
  - Red: Error

---

## 4. API Integration

### 4.1 REST API Endpoints

#### Authentication
```typescript
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
GET  /api/auth/me
POST /api/auth/mfa/setup
POST /api/auth/mfa/verify
```

#### Projects
```typescript
GET    /api/projects              // List all projects
POST   /api/projects              // Create new project
GET    /api/projects/:id          // Get project details
PUT    /api/projects/:id          // Update project
DELETE /api/projects/:id          // Delete project
POST   /api/projects/:id/execute  // Execute project workflow
```

#### Chat/Conversations
```typescript
GET  /api/conversations           // List conversations
POST /api/conversations           // Create conversation
GET  /api/conversations/:id       // Get conversation
POST /api/conversations/:id/messages  // Send message
GET  /api/conversations/:id/messages  // Get messages
```

#### Agents
```typescript
GET /api/agents                   // List all agents
GET /api/agents/:id               // Get agent details
GET /api/agents/:id/status        // Get agent status
GET /api/agents/:id/activity      // Get agent activity history
```

#### Metrics & Costs
```typescript
GET /api/metrics                  // System metrics
GET /api/costs                    // Token usage and costs
GET /api/costs/breakdown          // Cost breakdown by agent/model
```

### 4.2 WebSocket Events

#### Connection
```typescript
// Client → Server
socket.emit('authenticate', { token: jwtToken });

// Server → Client
socket.on('authenticated', (data: { userId: string; sessionId: string }));
socket.on('error', (error: { code: string; message: string }));
```

#### Chat Events
```typescript
// Client → Server
socket.emit('chat:message', { conversationId: string; content: string });

// Server → Client
socket.on('chat:stream', (chunk: { messageId: string; content: string }));
socket.on('chat:complete', (message: Message));
socket.on('chat:error', (error: { messageId: string; error: string }));
```

#### Agent Events
```typescript
// Server → Client
socket.on('agent:status', (status: AgentStatus));
socket.on('agent:task:start', (data: { agentId: string; task: Task }));
socket.on('agent:task:progress', (data: { taskId: string; progress: number }));
socket.on('agent:task:complete', (data: { taskId: string; result: any }));
socket.on('agent:error', (data: { agentId: string; error: string }));
```

#### Project Events
```typescript
// Server → Client
socket.on('project:update', (project: Project));
socket.on('project:stage:complete', (data: { projectId: string; stage: number }));
```

#### System Events
```typescript
// Server → Client
socket.on('metrics:update', (metrics: SystemMetrics));
socket.on('alert', (alert: { type: string; message: string; severity: string }));
```

---

## 5. State Management

### 5.1 Zustand Stores

#### Auth Store
```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  isLoading: true,

  login: async (credentials) => {
    const { user, token } = await authService.login(credentials);
    localStorage.setItem('token', token);
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  refreshToken: async () => {
    const { token } = await authService.refresh();
    localStorage.setItem('token', token);
    set({ token });
  },
}));
```

#### Theme Store
```typescript
interface ThemeState {
  mode: 'light' | 'dark' | 'system';
  effectiveTheme: 'light' | 'dark';
  setMode: (mode: 'light' | 'dark' | 'system') => void;
}

const useThemeStore = create<ThemeState>((set) => ({
  mode: (localStorage.getItem('theme') as any) || 'system',
  effectiveTheme: 'light',

  setMode: (mode) => {
    localStorage.setItem('theme', mode);

    // Determine effective theme
    const effectiveTheme = mode === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      : mode;

    // Update DOM
    document.documentElement.classList.toggle('dark', effectiveTheme === 'dark');

    set({ mode, effectiveTheme });
  },
}));
```

#### Agent Store
```typescript
interface AgentState {
  agents: Record<string, AgentStatus>;
  activities: Activity[];
  updateAgent: (agentId: string, status: AgentStatus) => void;
  addActivity: (activity: Activity) => void;
}

const useAgentStore = create<AgentState>((set) => ({
  agents: {},
  activities: [],

  updateAgent: (agentId, status) => {
    set((state) => ({
      agents: { ...state.agents, [agentId]: status },
    }));
  },

  addActivity: (activity) => {
    set((state) => ({
      activities: [activity, ...state.activities].slice(0, 100), // Keep last 100
    }));
  },
}));
```

### 5.2 TanStack Query (React Query)

```typescript
// Fetch projects with caching
const useProjects = () => {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => projectService.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Fetch project details
const useProject = (projectId: string) => {
  return useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => projectService.getById(projectId),
    enabled: !!projectId,
  });
};

// Mutation for creating project
const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (project: CreateProjectInput) => projectService.create(project),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create project: ${error.message}`);
    },
  });
};
```

---

## 6. Routing Structure

```typescript
const routes = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'chat', element: <Chat /> },
      { path: 'chat/:conversationId', element: <Chat /> },
      { path: 'agents', element: <Agents /> },
      { path: 'projects', element: <Projects /> },
      { path: 'projects/:id', element: <ProjectDetail /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      { path: 'mfa', element: <MFAVerify /> },
    ],
  },
  { path: '*', element: <NotFound /> },
];
```

---

## 7. Performance Optimization

### 7.1 Code Splitting

```typescript
// Lazy load heavy components
const Chat = lazy(() => import('./pages/Chat'));
const Agents = lazy(() => import('./pages/Agents'));
const Projects = lazy(() => import('./pages/Projects'));

// Use Suspense with loading fallback
<Suspense fallback={<LoadingSkeleton />}>
  <Outlet />
</Suspense>
```

### 7.2 Virtual Scrolling

```typescript
// For large lists (message history, agent activities)
import { useVirtualizer } from '@tanstack/react-virtual';

const MessageList = ({ messages }: { messages: Message[] }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Estimated message height
    overscan: 5, // Render 5 items above/below viewport
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <MessageBubble
            key={virtualItem.key}
            message={messages[virtualItem.index]}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          />
        ))}
      </div>
    </div>
  );
};
```

### 7.3 Debouncing & Throttling

```typescript
// Debounce search input
const debouncedSearch = useMemo(
  () => debounce((query: string) => {
    searchProjects(query);
  }, 300),
  []
);

// Throttle scroll events
const throttledScroll = useMemo(
  () => throttle(() => {
    checkInfiniteScroll();
  }, 100),
  []
);
```

### 7.4 Memoization

```typescript
// Memoize expensive computations
const sortedAgents = useMemo(() => {
  return agents.sort((a, b) => {
    // Complex sorting logic
  });
}, [agents]);

// Memoize callbacks to prevent re-renders
const handleAgentClick = useCallback((agentId: string) => {
  showAgentDetails(agentId);
}, []);
```

---

## 8. Accessibility

### 8.1 Keyboard Navigation

```typescript
const keyboardShortcuts = {
  'Cmd/Ctrl + K': 'Open command palette',
  'Cmd/Ctrl + /': 'Toggle sidebar',
  'Cmd/Ctrl + B': 'Toggle file explorer',
  'Cmd/Ctrl + N': 'New conversation',
  'Cmd/Ctrl + Shift + N': 'New project',
  'Esc': 'Close modal/panel',
  'Tab': 'Navigate forward',
  'Shift + Tab': 'Navigate backward',
};

// Custom hook for keyboard shortcuts
const useKeyboardShortcuts = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      if (isCtrlOrCmd && e.key === 'k') {
        e.preventDefault();
        openCommandPalette();
      }
      // ... other shortcuts
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
};
```

### 8.2 ARIA Labels & Semantic HTML

```tsx
<nav aria-label="Main navigation">
  <button
    aria-expanded={sidebarOpen}
    aria-controls="sidebar"
    onClick={toggleSidebar}
  >
    Toggle Sidebar
  </button>
</nav>

<div role="region" aria-live="polite" aria-atomic="true">
  {isProcessing && <p>AI is processing your request...</p>}
</div>

<button aria-label="Copy code to clipboard">
  <CopyIcon />
</button>
```

### 8.3 Focus Management

```css
/* Visible focus indicators */
*:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
  border-radius: var(--radius-md);
}

.button:focus-visible {
  outline: 2px solid hsl(var(--primary));
  box-shadow: 0 0 0 4px hsla(var(--primary), 0.1);
}
```

---

## 9. Testing Strategy

### 9.1 Unit Tests (Vitest)

```typescript
// Example: Button component test
describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('calls onClick handler when clicked', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### 9.2 Integration Tests

```typescript
// Example: Chat flow integration test
describe('Chat Integration', () => {
  it('sends message and receives streaming response', async () => {
    const { user } = setupTest();

    render(<Chat />);

    // Type message
    const input = screen.getByPlaceholderText('Type your message...');
    await user.type(input, 'Create a login component');

    // Send message
    await user.click(screen.getByRole('button', { name: /send/i }));

    // Verify message appears
    expect(await screen.findByText('Create a login component')).toBeInTheDocument();

    // Verify streaming response appears
    expect(await screen.findByText(/I'll create a login component/i)).toBeInTheDocument();
  });
});
```

### 9.3 E2E Tests (Playwright)

```typescript
// Example: Full user flow
test('user can create project and start chat', async ({ page }) => {
  // Login
  await page.goto('/auth/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  // Wait for dashboard
  await page.waitForURL('/dashboard');

  // Create new project
  await page.click('button:has-text("New Project")');
  await page.fill('input[name="name"]', 'Test Project');
  await page.fill('textarea[name="description"]', 'Test Description');
  await page.click('button:has-text("Create")');

  // Verify project created
  await expect(page.locator('text=Test Project')).toBeVisible();

  // Start chat
  await page.click('a[href="/chat"]');
  await page.fill('textarea[placeholder*="Type your message"]', 'Hello AI');
  await page.keyboard.press('Enter');

  // Verify response
  await expect(page.locator('text=Hello AI')).toBeVisible();
});
```

---

## 10. Security Considerations

### 10.1 Authentication

```typescript
// JWT token storage and refresh
class AuthService {
  private refreshTokenTimeout?: NodeJS.Timeout;

  async login(credentials: LoginCredentials) {
    const { token, refreshToken, expiresIn } = await api.post('/auth/login', credentials);

    // Store tokens
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);

    // Schedule token refresh
    this.scheduleTokenRefresh(expiresIn);

    return { token };
  }

  private scheduleTokenRefresh(expiresIn: number) {
    // Refresh 5 minutes before expiry
    const timeout = (expiresIn * 1000) - (5 * 60 * 1000);

    this.refreshTokenTimeout = setTimeout(async () => {
      await this.refreshToken();
    }, timeout);
  }

  async refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    const { token, expiresIn } = await api.post('/auth/refresh', { refreshToken });

    localStorage.setItem('token', token);
    this.scheduleTokenRefresh(expiresIn);
  }
}
```

### 10.2 XSS Prevention

```typescript
// Sanitize user input before rendering
import DOMPurify from 'dompurify';

const SafeHTML = ({ html }: { html: string }) => {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'code', 'pre'],
    ALLOWED_ATTR: ['href'],
  });

  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
};
```

### 10.3 CSRF Protection

```typescript
// Include CSRF token in API requests
axios.interceptors.request.use((config) => {
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }

  return config;
});
```

### 10.4 Content Security Policy

```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' ws://localhost:3000 wss://api.zekka.app;
  img-src 'self' data: https:;
">
```

---

## 11. Deployment

### 11.1 Build Configuration

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          state: ['zustand', '@tanstack/react-query'],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  },
});
```

### 11.2 Environment Variables

```bash
# .env.development
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
VITE_ENV=development

# .env.production
VITE_API_URL=https://api.zekka.app
VITE_WS_URL=wss://api.zekka.app
VITE_ENV=production
```

### 11.3 Nginx Configuration

```nginx
server {
    listen 80;
    server_name zekka.app;

    root /var/www/zekka/dist;
    index index.html;

    # Serve static files
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /socket.io {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 12. Implementation Timeline (12 Weeks)

### Phase 1: Foundation (Weeks 1-2)
- Set up React + TypeScript + Vite project
- Configure Tailwind CSS + Radix UI
- Implement design system tokens
- Create base layout components
- Implement theme switching

### Phase 2: Core Features (Weeks 3-5)
- Build three-panel workspace layout
- Implement AI chat interface with streaming
- Create agent activity dashboard
- Integrate WebSocket communication
- Build authentication UI

### Phase 3: Advanced Features (Weeks 6-8)
- Implement code syntax highlighting
- Create inline citation system
- Build project management interface
- Add token usage tracking UI
- Implement responsive design

### Phase 4: Polish & Integration (Weeks 9-10)
- Add keyboard shortcuts
- Implement accessibility features
- Build notification system
- Add PWA features
- Performance optimization

### Phase 5: Testing & Deployment (Weeks 11-12)
- Write comprehensive tests
- Security audit
- User acceptance testing
- Documentation
- Production deployment

---

## 13. Success Metrics

### 13.1 Performance Targets
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3.5s
- Lighthouse Score: > 90
- Bundle Size: < 500KB (gzipped)

### 13.2 Quality Targets
- Test Coverage: > 80%
- Accessibility Score: 100% (WCAG 2.1 AA)
- Zero critical security vulnerabilities
- Code Quality: > 7.0/10 (SonarQube)

### 13.3 User Experience Targets
- Chat response latency: < 500ms to first token
- WebSocket reconnection: < 2s
- 60fps animations on all interactions
- Mobile responsive on all screens

---

## 14. Next Steps

1. **Get approval for this specification**
2. **Assign AI agents to implementation tasks:**
   - **Softgen AI:** Phase 1 foundation setup
   - **Bolt.diy:** Design system implementation
   - **AugmentCode:** Chat interface development
   - **Warp.dev:** Agent dashboard development
   - **Windsurf:** Integration and polish
3. **Begin Phase 1 implementation**
4. **Set up monitoring and feedback loops**

---

**Document Status:** ✅ Ready for Implementation
**Approved by:** Pending
**Next Review:** After Phase 1 completion
