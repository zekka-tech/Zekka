export const testAgents: ({
    id: string;
    name: string;
    type: string;
    status: string;
    tier: number;
    capabilities: string[];
    metadata: {
        model: string;
        specialty: string;
    };
    created_at: string;
} | {
    id: string;
    name: string;
    type: string;
    status: string;
    tier: number;
    capabilities: string[];
    metadata: {
        specialty: string;
        model?: undefined;
    };
    created_at: string;
} | {
    id: string;
    name: string;
    type: string;
    status: string;
    tier: number;
    capabilities: string[];
    metadata: {
        model?: undefined;
        specialty?: undefined;
    };
    created_at: string;
})[];
export const testAgentTasks: ({
    id: string;
    agent_id: string;
    project_id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    created_at: string;
    started_at: string;
    completed_at: string;
} | {
    id: string;
    agent_id: string;
    project_id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    created_at: string;
    started_at: string;
    completed_at: null;
} | {
    id: string;
    agent_id: string;
    project_id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    created_at: string;
    started_at: null;
    completed_at: null;
})[];
export const testAgentActivity: ({
    id: string;
    agent_id: string;
    action: string;
    task_id: string;
    details: {
        message: string;
        duration?: undefined;
    };
    timestamp: string;
} | {
    id: string;
    agent_id: string;
    action: string;
    task_id: string;
    details: {
        message: string;
        duration: number;
    };
    timestamp: string;
})[];
/**
 * Create a random agent
 */
export function createRandomAgent(overrides?: {}): {
    id: string;
    name: string;
    type: string;
    status: string;
    tier: number;
    capabilities: string[];
    metadata: {};
    created_at: string;
};
/**
 * Create agent task
 */
export function createAgentTask(overrides?: {}): {
    id: string;
    agent_id: string;
    project_id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    created_at: string;
    started_at: null;
    completed_at: null;
};
/**
 * Create agent activity log
 */
export function createAgentActivity(overrides?: {}): {
    id: string;
    agent_id: string;
    action: string;
    task_id: string;
    details: {};
    timestamp: string;
};
export declare let pydanticAgent: {
    id: string;
    name: string;
    type: string;
    status: string;
    tier: number;
    capabilities: string[];
    metadata: {
        model: string;
        specialty: string;
    };
    created_at: string;
} | {
    id: string;
    name: string;
    type: string;
    status: string;
    tier: number;
    capabilities: string[];
    metadata: {
        specialty: string;
        model?: undefined;
    };
    created_at: string;
} | {
    id: string;
    name: string;
    type: string;
    status: string;
    tier: number;
    capabilities: string[];
    metadata: {
        model?: undefined;
        specialty?: undefined;
    };
    created_at: string;
} | undefined;
export declare let astronAgent: {
    id: string;
    name: string;
    type: string;
    status: string;
    tier: number;
    capabilities: string[];
    metadata: {
        model: string;
        specialty: string;
    };
    created_at: string;
} | {
    id: string;
    name: string;
    type: string;
    status: string;
    tier: number;
    capabilities: string[];
    metadata: {
        specialty: string;
        model?: undefined;
    };
    created_at: string;
} | {
    id: string;
    name: string;
    type: string;
    status: string;
    tier: number;
    capabilities: string[];
    metadata: {
        model?: undefined;
        specialty?: undefined;
    };
    created_at: string;
} | undefined;
export declare let autoAgent: {
    id: string;
    name: string;
    type: string;
    status: string;
    tier: number;
    capabilities: string[];
    metadata: {
        model: string;
        specialty: string;
    };
    created_at: string;
} | {
    id: string;
    name: string;
    type: string;
    status: string;
    tier: number;
    capabilities: string[];
    metadata: {
        specialty: string;
        model?: undefined;
    };
    created_at: string;
} | {
    id: string;
    name: string;
    type: string;
    status: string;
    tier: number;
    capabilities: string[];
    metadata: {
        model?: undefined;
        specialty?: undefined;
    };
    created_at: string;
} | undefined;
export declare let codeRabbitAgent: {
    id: string;
    name: string;
    type: string;
    status: string;
    tier: number;
    capabilities: string[];
    metadata: {
        model: string;
        specialty: string;
    };
    created_at: string;
} | {
    id: string;
    name: string;
    type: string;
    status: string;
    tier: number;
    capabilities: string[];
    metadata: {
        specialty: string;
        model?: undefined;
    };
    created_at: string;
} | {
    id: string;
    name: string;
    type: string;
    status: string;
    tier: number;
    capabilities: string[];
    metadata: {
        model?: undefined;
        specialty?: undefined;
    };
    created_at: string;
} | undefined;
export declare let inactiveAgent: {
    id: string;
    name: string;
    type: string;
    status: string;
    tier: number;
    capabilities: string[];
    metadata: {
        model: string;
        specialty: string;
    };
    created_at: string;
} | {
    id: string;
    name: string;
    type: string;
    status: string;
    tier: number;
    capabilities: string[];
    metadata: {
        specialty: string;
        model?: undefined;
    };
    created_at: string;
} | {
    id: string;
    name: string;
    type: string;
    status: string;
    tier: number;
    capabilities: string[];
    metadata: {
        model?: undefined;
        specialty?: undefined;
    };
    created_at: string;
} | undefined;
//# sourceMappingURL=agent.fixtures.d.ts.map