export const testConversations: ({
    id: string;
    project_id: string;
    title: string;
    status: string;
    metadata: {
        model: string;
    };
    created_at: string;
    updated_at: string;
} | {
    id: string;
    project_id: string;
    title: string;
    status: string;
    metadata: {
        model?: undefined;
    };
    created_at: string;
    updated_at: string;
})[];
export const testMessages: {
    id: string;
    conversation_id: string;
    role: string;
    content: string;
    model: string;
    tokens: {
        input: number;
        output: number;
    };
    cost: number;
    created_at: string;
}[];
/**
 * Create a random conversation
 */
export function createRandomConversation(overrides?: {}): {
    id: string;
    project_id: string;
    title: string;
    status: string;
    metadata: {};
    created_at: string;
    updated_at: string;
};
/**
 * Create conversation data
 */
export function createConversationData(overrides?: {}): {
    title: string;
    metadata: {
        model: string;
    };
};
/**
 * Create a random message
 */
export function createRandomMessage(overrides?: {}): {
    id: string;
    conversation_id: string;
    role: string;
    content: string;
    model: string;
    tokens: {
        input: number;
        output: number;
    };
    cost: number;
    created_at: string;
};
/**
 * Create message data
 */
export function createMessageData(overrides?: {}): {
    content: string;
    role: string;
    model: string;
};
export declare let firstConversation: {
    id: string;
    project_id: string;
    title: string;
    status: string;
    metadata: {
        model: string;
    };
    created_at: string;
    updated_at: string;
} | {
    id: string;
    project_id: string;
    title: string;
    status: string;
    metadata: {
        model?: undefined;
    };
    created_at: string;
    updated_at: string;
} | undefined;
export declare let secondConversation: {
    id: string;
    project_id: string;
    title: string;
    status: string;
    metadata: {
        model: string;
    };
    created_at: string;
    updated_at: string;
} | {
    id: string;
    project_id: string;
    title: string;
    status: string;
    metadata: {
        model?: undefined;
    };
    created_at: string;
    updated_at: string;
} | undefined;
export declare let archivedConversation: {
    id: string;
    project_id: string;
    title: string;
    status: string;
    metadata: {
        model: string;
    };
    created_at: string;
    updated_at: string;
} | {
    id: string;
    project_id: string;
    title: string;
    status: string;
    metadata: {
        model?: undefined;
    };
    created_at: string;
    updated_at: string;
} | undefined;
//# sourceMappingURL=conversation.fixtures.d.ts.map