export const testProjects: ({
    id: string;
    name: string;
    description: string;
    owner_id: string;
    status: string;
    settings: {
        theme: string;
        notifications: boolean;
    };
    created_at: string;
    updated_at: string;
} | {
    id: string;
    name: string;
    description: string;
    owner_id: string;
    status: string;
    settings: {
        theme?: undefined;
        notifications?: undefined;
    };
    created_at: string;
    updated_at: string;
})[];
/**
 * Project members
 */
export const testProjectMembers: {
    project_id: string;
    user_id: string;
    role: string;
    added_at: string;
}[];
/**
 * Create a random project
 */
export function createRandomProject(overrides?: {}): {
    id: string;
    name: string;
    description: string;
    owner_id: string;
    status: string;
    settings: {};
    created_at: string;
    updated_at: string;
};
/**
 * Create project creation data
 */
export function createProjectData(overrides?: {}): {
    name: string;
    description: string;
    settings: {
        theme: string;
    };
};
/**
 * Create project member data
 */
export function createProjectMember(overrides?: {}): {
    user_id: string;
    role: string;
};
export declare let alphaProject: {
    id: string;
    name: string;
    description: string;
    owner_id: string;
    status: string;
    settings: {
        theme: string;
        notifications: boolean;
    };
    created_at: string;
    updated_at: string;
} | {
    id: string;
    name: string;
    description: string;
    owner_id: string;
    status: string;
    settings: {
        theme?: undefined;
        notifications?: undefined;
    };
    created_at: string;
    updated_at: string;
} | undefined;
export declare let betaProject: {
    id: string;
    name: string;
    description: string;
    owner_id: string;
    status: string;
    settings: {
        theme: string;
        notifications: boolean;
    };
    created_at: string;
    updated_at: string;
} | {
    id: string;
    name: string;
    description: string;
    owner_id: string;
    status: string;
    settings: {
        theme?: undefined;
        notifications?: undefined;
    };
    created_at: string;
    updated_at: string;
} | undefined;
export declare let gammaProject: {
    id: string;
    name: string;
    description: string;
    owner_id: string;
    status: string;
    settings: {
        theme: string;
        notifications: boolean;
    };
    created_at: string;
    updated_at: string;
} | {
    id: string;
    name: string;
    description: string;
    owner_id: string;
    status: string;
    settings: {
        theme?: undefined;
        notifications?: undefined;
    };
    created_at: string;
    updated_at: string;
} | undefined;
export declare let archivedProject: {
    id: string;
    name: string;
    description: string;
    owner_id: string;
    status: string;
    settings: {
        theme: string;
        notifications: boolean;
    };
    created_at: string;
    updated_at: string;
} | {
    id: string;
    name: string;
    description: string;
    owner_id: string;
    status: string;
    settings: {
        theme?: undefined;
        notifications?: undefined;
    };
    created_at: string;
    updated_at: string;
} | undefined;
//# sourceMappingURL=project.fixtures.d.ts.map