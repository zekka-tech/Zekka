/**
 * Assertion Test Helper
 * Custom assertions and validation helpers for tests
 */
/**
 * Assert object has required properties
 */
export function assertHasProperties(obj: any, properties: any): void;
/**
 * Assert object matches schema
 */
export function assertMatchesSchema(obj: any, schema: any): void;
/**
 * Assert valid UUID
 */
export function assertValidUUID(value: any): void;
/**
 * Assert valid email
 */
export function assertValidEmail(value: any): void;
/**
 * Assert valid JWT
 */
export function assertValidJWT(value: any): void;
/**
 * Assert valid ISO date string
 */
export function assertValidISODate(value: any): void;
/**
 * Assert date is recent (within last N seconds)
 */
export function assertRecentDate(value: any, secondsAgo?: number): void;
/**
 * Assert array length
 */
export function assertArrayLength(arr: any, length: any): void;
/**
 * Assert array contains item matching
 */
export function assertArrayContains(arr: any, matcher: any): void;
/**
 * Assert pagination response
 */
export function assertPaginationResponse(response: any, expectedPage: any, expectedLimit: any): void;
/**
 * Assert error object structure
 */
export function assertErrorObject(error: any, expectedMessage?: null, expectedCode?: null): void;
/**
 * Assert timestamp order
 */
export function assertTimestampOrder(items: any, field?: string, order?: string): void;
/**
 * Assert numeric range
 */
export function assertInRange(value: any, min: any, max: any): void;
/**
 * Assert object is subset of another
 */
export function assertIsSubset(subset: any, superset: any): void;
/**
 * Assert array is sorted
 */
export function assertArraySorted(arr: any, key?: null, order?: string): void;
/**
 * Assert no sensitive data in response
 */
export function assertNoSensitiveData(obj: any): void;
/**
 * Assert cost calculation
 */
export function assertCostCalculation(tokens: any, model: any, expectedCost: any): void;
/**
 * Assert analytics metrics
 */
export function assertAnalyticsMetrics(metrics: any): void;
/**
 * Assert rate limit headers
 */
export function assertRateLimitHeaders(headers: any): void;
//# sourceMappingURL=assertion.helper.d.ts.map