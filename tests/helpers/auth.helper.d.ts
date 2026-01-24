/**
 * Generate test JWT token
 */
export function generateToken(payload?: {}, options?: {}): never;
/**
 * Generate expired token
 */
export function generateExpiredToken(payload?: {}): never;
/**
 * Generate invalid token
 */
export function generateInvalidToken(): string;
/**
 * Decode token without verification
 */
export function decodeToken(token: any): string | jwt.JwtPayload | null;
/**
 * Verify token
 */
export function verifyToken(token: any, secret?: string | undefined): (jwt.Jwt & jwt.JwtPayload & void) | null;
/**
 * Generate auth header
 */
export function generateAuthHeader(token?: null): {
    authorization: string;
};
/**
 * Generate basic auth credentials
 */
export function generateBasicAuth(username?: string, password?: string): {
    authorization: string;
};
/**
 * Create mock authenticated user
 */
export function createAuthUser(overrides?: {}): {
    userId: string;
    email: string;
    name: string;
    role: string;
};
/**
 * Create mock admin user
 */
export function createAdminUser(overrides?: {}): {
    userId: string;
    email: string;
    name: string;
    role: string;
};
/**
 * Create mock request with auth
 */
export function createAuthRequest(user?: null, overrides?: {}): {
    user: {
        userId: string;
        email: string;
        name: string;
        role: string;
    };
    headers: any;
    body: {};
    params: {};
    query: {};
};
/**
 * Create mock session data
 */
export function createSessionData(userId?: null, overrides?: {}): {
    userId: string;
    token: never;
    createdAt: string;
    expiresAt: string;
    metadata: {};
};
/**
 * Hash password (for testing)
 */
export function hashPassword(password: any): Promise<string>;
/**
 * Compare password
 */
export function comparePassword(password: any, hash: any): Promise<boolean>;
/**
 * Generate refresh token
 */
export function generateRefreshToken(payload?: {}): never;
/**
 * Generate password reset token
 */
export function generateResetToken(userId: any): never;
/**
 * Generate email verification token
 */
export function generateVerificationToken(email: any): never;
/**
 * Mock authentication middleware
 */
export function mockAuthMiddleware(user?: null): (req: any, res: any, next: any) => void;
/**
 * Mock admin middleware
 */
export function mockAdminMiddleware(user?: null): (req: any, res: any, next: any) => void;
import jwt = require("jsonwebtoken");
//# sourceMappingURL=auth.helper.d.ts.map