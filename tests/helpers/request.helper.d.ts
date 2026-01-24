/**
 * Create Express app wrapper for testing
 */
export function createTestApp(app: any): {
    get: (url: any) => request.SuperTestStatic.Test;
    post: (url: any) => request.SuperTestStatic.Test;
    put: (url: any) => request.SuperTestStatic.Test;
    patch: (url: any) => request.SuperTestStatic.Test;
    delete: (url: any) => request.SuperTestStatic.Test;
};
/**
 * Make authenticated request
 */
export function makeAuthRequest(app: any, method: any, url: any, token?: null): any;
/**
 * Create mock request object
 */
export function createMockRequest(overrides?: {}): {
    body: {};
    params: {};
    query: {};
    headers: {};
    cookies: {};
    user: null;
    ip: string;
    method: string;
    url: string;
    protocol: string;
    get: jest.Mock<any, [header: any], any>;
};
/**
 * Create mock response object
 */
export function createMockResponse(): {
    statusCode: number;
    status: jest.Mock<any, any, any>;
    json: jest.Mock<any, any, any>;
    send: jest.Mock<any, any, any>;
    set: jest.Mock<any, any, any>;
    cookie: jest.Mock<any, any, any>;
    clearCookie: jest.Mock<any, any, any>;
    redirect: jest.Mock<any, any, any>;
    sendStatus: jest.Mock<any, any, any>;
    setHeader: jest.Mock<any, any, any>;
    end: jest.Mock<any, any, any>;
};
/**
 * Create mock next function
 */
export function createMockNext(): jest.Mock<any, any, any>;
/**
 * Wait for response
 */
export function waitForResponse(promise: any, timeout?: number): Promise<any>;
/**
 * Assert response status
 */
export function assertStatus(response: any, expectedStatus: any): void;
/**
 * Assert response body contains
 */
export function assertBodyContains(response: any, expected: any): void;
/**
 * Assert error response
 */
export function assertErrorResponse(response: any, status: any, message?: null): void;
/**
 * Assert success response
 */
export function assertSuccessResponse(response: any, status?: number): void;
/**
 * Create pagination query
 */
export function createPaginationQuery(page?: number, limit?: number, sort?: string, order?: string): {
    page: string;
    limit: string;
    sort: string;
    order: string;
};
/**
 * Create filter query
 */
export function createFilterQuery(filters?: {}): {};
/**
 * Mock multipart form data
 */
export function createMultipartData(fields?: {}, files?: any[]): {
    fields: {};
    files: any[];
};
/**
 * Simulate file upload
 */
export function createMockFile(filename?: string, mimetype?: string, size?: number): {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    buffer: Buffer<ArrayBuffer>;
    path: string;
};
/**
 * Test middleware chain
 */
export function testMiddlewareChain(middlewares: any, req: any, res: any): Promise<{
    req: any;
    res: any;
    next: jest.Mock<any, any, any>;
}>;
/**
 * Extract cookies from response
 */
export function extractCookies(response: any): {};
//# sourceMappingURL=request.helper.d.ts.map