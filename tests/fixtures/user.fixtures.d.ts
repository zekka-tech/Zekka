export const testUsers: ({
    id: string;
    email: string;
    name: string;
    password: string;
    role: string;
    status: string;
    email_verified: boolean;
    created_at: string;
    updated_at: string;
    locked_until?: undefined;
    failed_login_attempts?: undefined;
    password_expires_at?: undefined;
} | {
    id: string;
    email: string;
    name: string;
    password: string;
    role: string;
    status: string;
    locked_until: string;
    failed_login_attempts: number;
    email_verified: boolean;
    created_at: string;
    updated_at: string;
    password_expires_at?: undefined;
} | {
    id: string;
    email: string;
    name: string;
    password: string;
    role: string;
    status: string;
    password_expires_at: string;
    email_verified: boolean;
    created_at: string;
    updated_at: string;
    locked_until?: undefined;
    failed_login_attempts?: undefined;
})[];
/**
 * Create a dynamic user with faker
 */
export function createRandomUser(overrides?: {}): {
    id: string;
    email: string;
    name: string;
    password: string;
    role: string;
    status: string;
    email_verified: boolean;
    created_at: string;
    updated_at: string;
};
/**
 * Create user registration data
 */
export function createUserRegistration(overrides?: {}): {
    email: string;
    password: string;
    name: string;
};
/**
 * Create user login credentials
 */
export function createUserCredentials(overrides?: {}): {
    email: string;
    password: string;
};
export declare let adminUser: {
    id: string;
    email: string;
    name: string;
    password: string;
    role: string;
    status: string;
    email_verified: boolean;
    created_at: string;
    updated_at: string;
    locked_until?: undefined;
    failed_login_attempts?: undefined;
    password_expires_at?: undefined;
} | {
    id: string;
    email: string;
    name: string;
    password: string;
    role: string;
    status: string;
    locked_until: string;
    failed_login_attempts: number;
    email_verified: boolean;
    created_at: string;
    updated_at: string;
    password_expires_at?: undefined;
} | {
    id: string;
    email: string;
    name: string;
    password: string;
    role: string;
    status: string;
    password_expires_at: string;
    email_verified: boolean;
    created_at: string;
    updated_at: string;
    locked_until?: undefined;
    failed_login_attempts?: undefined;
} | undefined;
export declare let regularUser: {
    id: string;
    email: string;
    name: string;
    password: string;
    role: string;
    status: string;
    email_verified: boolean;
    created_at: string;
    updated_at: string;
    locked_until?: undefined;
    failed_login_attempts?: undefined;
    password_expires_at?: undefined;
} | {
    id: string;
    email: string;
    name: string;
    password: string;
    role: string;
    status: string;
    locked_until: string;
    failed_login_attempts: number;
    email_verified: boolean;
    created_at: string;
    updated_at: string;
    password_expires_at?: undefined;
} | {
    id: string;
    email: string;
    name: string;
    password: string;
    role: string;
    status: string;
    password_expires_at: string;
    email_verified: boolean;
    created_at: string;
    updated_at: string;
    locked_until?: undefined;
    failed_login_attempts?: undefined;
} | undefined;
export declare let secondUser: {
    id: string;
    email: string;
    name: string;
    password: string;
    role: string;
    status: string;
    email_verified: boolean;
    created_at: string;
    updated_at: string;
    locked_until?: undefined;
    failed_login_attempts?: undefined;
    password_expires_at?: undefined;
} | {
    id: string;
    email: string;
    name: string;
    password: string;
    role: string;
    status: string;
    locked_until: string;
    failed_login_attempts: number;
    email_verified: boolean;
    created_at: string;
    updated_at: string;
    password_expires_at?: undefined;
} | {
    id: string;
    email: string;
    name: string;
    password: string;
    role: string;
    status: string;
    password_expires_at: string;
    email_verified: boolean;
    created_at: string;
    updated_at: string;
    locked_until?: undefined;
    failed_login_attempts?: undefined;
} | undefined;
export declare let lockedUser: {
    id: string;
    email: string;
    name: string;
    password: string;
    role: string;
    status: string;
    email_verified: boolean;
    created_at: string;
    updated_at: string;
    locked_until?: undefined;
    failed_login_attempts?: undefined;
    password_expires_at?: undefined;
} | {
    id: string;
    email: string;
    name: string;
    password: string;
    role: string;
    status: string;
    locked_until: string;
    failed_login_attempts: number;
    email_verified: boolean;
    created_at: string;
    updated_at: string;
    password_expires_at?: undefined;
} | {
    id: string;
    email: string;
    name: string;
    password: string;
    role: string;
    status: string;
    password_expires_at: string;
    email_verified: boolean;
    created_at: string;
    updated_at: string;
    locked_until?: undefined;
    failed_login_attempts?: undefined;
} | undefined;
export declare let expiredPasswordUser: {
    id: string;
    email: string;
    name: string;
    password: string;
    role: string;
    status: string;
    email_verified: boolean;
    created_at: string;
    updated_at: string;
    locked_until?: undefined;
    failed_login_attempts?: undefined;
    password_expires_at?: undefined;
} | {
    id: string;
    email: string;
    name: string;
    password: string;
    role: string;
    status: string;
    locked_until: string;
    failed_login_attempts: number;
    email_verified: boolean;
    created_at: string;
    updated_at: string;
    password_expires_at?: undefined;
} | {
    id: string;
    email: string;
    name: string;
    password: string;
    role: string;
    status: string;
    password_expires_at: string;
    email_verified: boolean;
    created_at: string;
    updated_at: string;
    locked_until?: undefined;
    failed_login_attempts?: undefined;
} | undefined;
//# sourceMappingURL=user.fixtures.d.ts.map