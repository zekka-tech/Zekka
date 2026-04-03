# Zekka UI - Implementation Roadmap & Agent Assignment Plan

**Project:** Zekka Framework - Browser UI Implementation
**Duration:** 12 Weeks (5 Phases)
**Prepared by:** Claude (Senior Software Project Manager)
**Date:** January 21, 2026

---

## Executive Summary

This roadmap outlines the complete implementation plan for the Zekka UI, with specific task assignments to AI agents coordinated through the orchestrator. Each phase includes deliverables, acceptance criteria, and responsible agents.

**Key Features to Implement:**
- ✅ Three-panel workspace (NotebookLM-style)
- ✅ Real-time agent activity dashboard (Genspark-style)
- ✅ AI chat with code streaming (Google AI Studio-style)

**Technology Stack:**
- React 18+ with TypeScript
- Vite build tool
- Tailwind CSS + Radix UI
- Zustand + TanStack Query
- Socket.IO for WebSocket

---

## Implementation Phases Overview

| Phase | Duration | Focus | Agent Lead |
|-------|----------|-------|------------|
| **Phase 1** | Weeks 1-2 | Foundation & Setup | Softgen AI + Bolt.diy |
| **Phase 2** | Weeks 3-5 | Core Features | AugmentCode + Warp.dev |
| **Phase 3** | Weeks 6-8 | Advanced Features | Windsurf + Qoder.com |
| **Phase 4** | Weeks 9-10 | Polish & Integration | Qode.ai + AutoAgent |
| **Phase 5** | Weeks 11-12 | Testing & Deployment | CodeRabbit + Pydantic AI |

**Estimated Cost:** ~$122.50 (Gemini Pro + Claude Sonnet 4.5 mix)
**Budget Status:** Well under $150 limit ✅

---

## Phase 1: Foundation (Weeks 1-2)

### 📋 Objectives
Set up the development environment, project structure, and design system foundation.

### 🤖 Agent Assignments

#### **Task 1.1: Initialize React + TypeScript + Vite Project**
**Agent:** Softgen AI (First-phase development)
**Model:** Gemini Pro ($0.125/1M in, $0.375/1M out)
**Duration:** 2 days
**Priority:** CRITICAL

**Tasks:**
```bash
1. Create Vite React TypeScript project
2. Configure ESLint + Prettier
3. Set up project structure (components/, pages/, hooks/, etc.)
4. Install dependencies (React Router, Zustand, TanStack Query, Axios, Socket.IO Client)
5. Configure tsconfig.json with strict mode
6. Set up Vitest for testing
7. Create .env files for development and production
```

**Deliverables:**
- `/frontend` directory with complete project structure
- `package.json` with all dependencies
- `vite.config.ts` configured
- `tsconfig.json` with strict TypeScript
- Dev server running on `localhost:5173`

**Acceptance Criteria:**
- [ ] `npm run dev` starts without errors
- [ ] TypeScript strict mode enabled
- [ ] Hot Module Replacement working
- [ ] Test framework configured

**Command to Execute:**
```bash
cd /home/zimele-dubazana/Zekka
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install react-router-dom zustand @tanstack/react-query axios socket.io-client
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm run dev
```

---

#### **Task 1.2: Configure Tailwind CSS + Radix UI**
**Agent:** Bolt.diy (First-phase development)
**Model:** Gemini Pro
**Duration:** 1 day
**Priority:** CRITICAL

**Tasks:**
```bash
1. Install and configure Tailwind CSS
2. Install Radix UI primitives
3. Create base UI components (Button, Card, Dialog, Input)
4. Set up cn() utility for class merging
5. Configure PostCSS
```

**Packages:**
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu \
  @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-toast \
  @radix-ui/react-tooltip lucide-react clsx tailwind-merge
```

**Deliverables:**
- `tailwind.config.js` with custom theme
- `src/components/ui/` with base components
- `src/lib/cn.ts` utility function
- `src/styles/globals.css` with Tailwind directives

**Acceptance Criteria:**
- [ ] Tailwind CSS processing correctly
- [ ] Base UI components render
- [ ] Custom theme tokens work
- [ ] cn() utility functional

---

#### **Task 1.3: Implement Design System Tokens**
**Agent:** Bolt.diy
**Model:** Gemini Pro
**Duration:** 2 days
**Priority:** HIGH

**Tasks:**
```css
1. Define color variables (light/dark mode) in HSL format
2. Implement typography scale (Material Design 3)
3. Set up spacing tokens (8px grid)
4. Create border radius and shadow tokens
5. Configure CSS variables in src/styles/themes.css
```

**Files to Create:**
- `src/styles/themes.css` - Theme variables
- `src/styles/globals.css` - Global styles
- `src/styles/animations.css` - Animation utilities

**Color Tokens:**
```css
:root {
  --background: 0 0% 100%;        /* White */
  --foreground: 222.2 84% 4.9%;   /* Near black */
  --primary: 217 91% 60%;         /* Google Blue */
  --success: 142 71% 45%;         /* Green */
  --warning: 38 92% 50%;          /* Amber */
  --error: 0 84.2% 60.2%;         /* Red */
}

.dark {
  --background: 0 0% 0%;          /* True black */
  --foreground: 210 40% 98%;      /* Off-white */
  --primary: 217.2 91.2% 70%;     /* Light blue */
  /* ... */
}
```

**Acceptance Criteria:**
- [ ] Light/dark mode tokens defined
- [ ] Typography scale matches Material Design 3
- [ ] Spacing follows 8px grid
- [ ] Border radius and shadows configured

---

#### **Task 1.4: Create Base Layout Components**
**Agent:** Softgen AI
**Model:** Gemini Pro
**Duration:** 3 days
**Priority:** HIGH

**Components to Build:**
```typescript
src/components/layout/
├── RootLayout.tsx        // Root layout with header and outlet
├── Sidebar.tsx           // Left sidebar (collapsible)
├── Header.tsx            // Top header (logo, search, user menu)
├── MainPanel.tsx         // Center main content area
├── RightPanel.tsx        // Right panel (agent dashboard)
└── ThreeColumnLayout.tsx // Three-panel workspace
```

**Layout Structure:**
```tsx
<RootLayout>
  <Header>
    <Logo />
    <ProjectSelector />
    <ModelSelector />
    <BudgetWidget />
    <ThemeToggle />
    <UserMenu />
  </Header>

  <ThreeColumnLayout>
    <Sidebar collapsible width={280}>
      <ProjectList />
      <FileTree />
      <ConversationHistory />
    </Sidebar>

    <MainPanel flexible>
      <Outlet /> {/* React Router */}
    </MainPanel>

    <RightPanel collapsible width={360}>
      <AgentDashboard />
      <TokenUsage />
    </RightPanel>
  </ThreeColumnLayout>
</RootLayout>
```

**Acceptance Criteria:**
- [ ] Layout responsive on 1280px+
- [ ] Panels resizable via drag
- [ ] Sidebar/right panel collapsible
- [ ] State persists in localStorage
- [ ] Smooth animations (300ms)

---

#### **Task 1.5: Implement Theme Switching**
**Agent:** Bolt.diy
**Model:** Gemini Pro
**Duration:** 1 day
**Priority:** MEDIUM

**Tasks:**
```typescript
1. Create theme store (Zustand)
2. Build ThemeToggle component
3. Detect system theme preference
4. Persist theme in localStorage
5. Prevent flash of unstyled content (FOUC)
```

**Implementation:**
```typescript
// src/store/themeStore.ts
interface ThemeState {
  mode: 'light' | 'dark' | 'system';
  effectiveTheme: 'light' | 'dark';
  setMode: (mode: 'light' | 'dark' | 'system') => void;
}

// src/components/ui/ThemeToggle.tsx
<DropdownMenu>
  <DropdownMenuTrigger>
    <Button variant="ghost" size="icon">
      <SunIcon className="rotate-0 scale-100 dark:-rotate-90 dark:scale-0" />
      <MoonIcon className="absolute rotate-90 scale-0 dark:rotate-0 dark:scale-100" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={() => setMode('light')}>Light</DropdownMenuItem>
    <DropdownMenuItem onClick={() => setMode('dark')}>Dark</DropdownMenuItem>
    <DropdownMenuItem onClick={() => setMode('system')}>System</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Acceptance Criteria:**
- [ ] Theme toggle in header
- [ ] Smooth transition (300ms)
- [ ] System theme detection
- [ ] Persists across sessions
- [ ] No FOUC

---

### ✅ Phase 1 Deliverables
- ✅ React + TypeScript + Vite project configured
- ✅ Tailwind CSS + Radix UI integrated
- ✅ Design system tokens implemented
- ✅ Base layout components functional
- ✅ Theme switching works

### 🎯 Phase 1 Quality Gates
- [ ] `npm run dev` starts without errors
- [ ] `npm run build` produces optimized bundle
- [ ] `npm run lint` passes
- [ ] Light/dark mode works
- [ ] Layout responsive on desktop

---

## Phase 2: Core Features (Weeks 3-5)

### 📋 Objectives
Implement three-panel workspace, AI chat with streaming, and real-time agent dashboard.

### 🤖 Agent Assignments

#### **Task 2.1: Build Three-Panel Workspace**
**Agent:** AugmentCode (Second-phase development)
**Model:** Gemini Pro
**Duration:** 3 days
**Priority:** CRITICAL

**Features:**
- Resizable panels with drag handles
- Panel collapse/expand
- Responsive behavior (desktop → mobile)
- State persistence

**Implementation:**
```tsx
<ThreeColumnLayout>
  <SourcesPanel width={280} collapsible>
    <Tabs>
      <TabsList>
        <TabsTrigger value="files">Files</TabsTrigger>
        <TabsTrigger value="docs">Docs</TabsTrigger>
        <TabsTrigger value="context">Context</TabsTrigger>
      </TabsList>
      <TabsContent value="files"><FileTree /></TabsContent>
      <TabsContent value="docs"><DocsList /></TabsContent>
      <TabsContent value="context"><ContextView /></TabsContent>
    </Tabs>
  </SourcesPanel>

  <MainChatPanel flexible>
    <ChatHeader />
    <MessageList />
    <InputArea />
  </MainChatPanel>

  <AgentPanel width={360} collapsible>
    <AgentList />
    <ActivityTimeline />
    <TokenUsage />
  </AgentPanel>
</ThreeColumnLayout>
```

**Acceptance Criteria:**
- [ ] All three panels visible (>1280px)
- [ ] Drag to resize panels
- [ ] Panels collapse smoothly
- [ ] Responsive on tablet/mobile
- [ ] State persists

---

#### **Task 2.2: Implement AI Chat with Streaming**
**Agent:** AugmentCode
**Model:** Claude Sonnet 4.5 (complex logic)
**Duration:** 5 days
**Priority:** CRITICAL

**Components:**
```typescript
src/components/chat/
├── ChatInterface.tsx         // Main container
├── MessageList.tsx           // Virtualized list
├── MessageBubble.tsx         // Message bubble
├── StreamingMessage.tsx      // Real-time streaming
├── CodeBlock.tsx             // Syntax highlighted code
├── InlineCitation.tsx        // Citation pills
├── ActionButtons.tsx         // Copy, Apply, Modify
└── InputArea.tsx             // Message input
```

**WebSocket Integration:**
```typescript
// src/services/websocket.ts
socket.on('chat:stream', (chunk: StreamChunk) => {
  appendToMessage(chunk.messageId, chunk.content);
});

socket.on('chat:complete', (message: Message) => {
  finalizeMessage(message);
  showCitations(message.metadata?.citations);
});
```

**Features:**
- Real-time streaming (character-by-character)
- Syntax highlighting (Prism)
- Copy/Apply/Modify buttons
- Inline citations
- Virtual scrolling for performance

**Acceptance Criteria:**
- [ ] Messages stream in real-time
- [ ] Code blocks have syntax highlighting
- [ ] Copy button works
- [ ] Citations clickable
- [ ] Virtual scrolling for 100+ messages

---

#### **Task 2.3: Create Agent Activity Dashboard**
**Agent:** Warp.dev (Second-phase development)
**Model:** Gemini Pro
**Duration:** 4 days
**Priority:** HIGH

**Components:**
```typescript
src/components/agents/
├── AgentDashboard.tsx        // Main container
├── AgentCard.tsx             // Agent status card
├── AgentActivityTimeline.tsx // Activity timeline
├── AgentOrchestration.tsx    // Orchestration flow
├── AgentMetrics.tsx          // Token usage/costs
└── AgentStatusBadge.tsx      // Status indicator
```

**Agent Card:**
```tsx
<AgentCard agent={agent}>
  <AgentIcon type={agent.type} status={agent.status} />
  <AgentName>{agent.name}</AgentName>
  <StatusBadge status={agent.status}>
    {agent.status === 'active' && <PulsingDot />}
    {agent.status}
  </StatusBadge>

  {agent.currentTask && (
    <TaskInfo>
      <p>{agent.currentTask.description}</p>
      <ProgressBar value={agent.progress} />
    </TaskInfo>
  )}

  <TokenUsage>
    Input: {agent.tokenUsage.input} | Output: {agent.tokenUsage.output}
    Cost: ${agent.tokenUsage.cost.toFixed(4)}
  </TokenUsage>
</AgentCard>
```

**WebSocket Events:**
```typescript
socket.on('agent:status', updateAgentStatus);
socket.on('agent:task:start', addTask);
socket.on('agent:task:progress', updateProgress);
socket.on('agent:task:complete', completeTask);
```

**Acceptance Criteria:**
- [ ] All agents displayed in grid
- [ ] Real-time status updates
- [ ] Progress bars animate
- [ ] Token usage updates live
- [ ] Timeline shows last 100 events

---

#### **Task 2.4: Integrate WebSocket Communication**
**Agent:** Warp.dev
**Model:** Gemini Pro
**Duration:** 2 days
**Priority:** CRITICAL

**Implementation:**
```typescript
// src/services/websocket.ts
class WebSocketService {
  private socket: Socket;

  connect(token: string) {
    this.socket = io(import.meta.env.VITE_WS_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.socket.on('chat:stream', handleChatStream);
    this.socket.on('agent:status', handleAgentStatus);
    this.socket.on('metrics:update', handleMetrics);
  }

  sendMessage(conversationId: string, content: string) {
    this.socket.emit('chat:message', { conversationId, content });
  }
}
```

**Acceptance Criteria:**
- [ ] Connects on login
- [ ] Auto-reconnects on disconnect
- [ ] All events typed
- [ ] Connection status visible
- [ ] Disconnects on logout

---

#### **Task 2.5: Implement Authentication UI**
**Agent:** AugmentCode
**Model:** Gemini Pro
**Duration:** 3 days
**Priority:** HIGH

**Components:**
```typescript
src/components/auth/
├── LoginForm.tsx         // Email/password login
├── RegisterForm.tsx      // User registration
├── MFASetup.tsx          // MFA setup with QR
├── MFAVerify.tsx         // MFA verification
└── ProtectedRoute.tsx    // Route guard
```

**Auth Flow:**
```tsx
// Login
<LoginForm>
  <Input type="email" name="email" required />
  <Input type="password" name="password" required />
  <Button type="submit">Login</Button>
  <Link to="/auth/register">Create account</Link>
</LoginForm>

// Protected Route
<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>
```

**Acceptance Criteria:**
- [ ] Login validates email
- [ ] Password show/hide toggle
- [ ] JWT stored securely
- [ ] Auto-redirect on login
- [ ] MFA setup shows QR
- [ ] Protected routes work

---

### ✅ Phase 2 Deliverables
- ✅ Three-panel workspace functional
- ✅ AI chat with streaming
- ✅ Real-time agent dashboard
- ✅ WebSocket integrated
- ✅ Authentication complete

### 🎯 Phase 2 Quality Gates
- [ ] Chat streams without lag
- [ ] Agent dashboard updates live
- [ ] WebSocket reconnects automatically
- [ ] Auth flow secure
- [ ] All features work on 1280px+

---

## Phase 3-5: Remaining Implementation

*(Continuing with same structure for Phases 3-5, covering:*
- *Phase 3: Syntax highlighting, citations, project management, responsive design*
- *Phase 4: Keyboard shortcuts, accessibility, notifications, PWA, performance*
- *Phase 5: Testing, security audit, UAT, documentation, deployment)*

---

## 🎯 Immediate Next Steps

### Week 1 Actions:
```bash
# 1. Get approval for this roadmap
# 2. Initialize orchestrator with Phase 1 tasks
npm start

# 3. Assign Softgen AI to Task 1.1
# 4. Assign Bolt.diy to Task 1.2
# 5. Monitor progress
docker-compose logs -f app
```

### Agent Coordination:
- **Orchestrator (Gemini Pro):** Assigns tasks, monitors progress
- **Redis Context Bus:** Agents communicate and lock files
- **Arbitrator (Claude Sonnet 4.5):** Resolves conflicts
- **Senior PM (Claude):** Final review and approval

---

## 💰 Budget Tracking

**Estimated Costs:**
- Gemini Pro: ~$17.50 (majority of tasks)
- Claude Sonnet 4.5: ~$105 (complex tasks)
- **Total: ~$122.50** ✅ Well under budget

---

**Status:** ✅ Ready for Implementation
**Next Review:** Phase 1 completion (Week 2)
**Approval Required:** Yes
