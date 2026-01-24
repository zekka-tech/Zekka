export class DatabaseHelper {
    pool: any;
    client: any;
    /**
     * Initialize test database connection
     */
    initialize(): Promise<boolean>;
    /**
     * Begin transaction for test isolation
     */
    beginTransaction(): Promise<void>;
    /**
     * Rollback transaction after test
     */
    rollbackTransaction(): Promise<void>;
    /**
     * Commit transaction (rarely used in tests)
     */
    commitTransaction(): Promise<void>;
    /**
     * Clean up all test data
     */
    cleanup(): Promise<void>;
    /**
     * Seed test data
     */
    seed(table: any, data: any): Promise<void>;
    /**
     * Insert a single row
     */
    insertRow(table: any, row: any): Promise<any>;
    /**
     * Query helper
     */
    query(text: any, params?: any[]): Promise<any>;
    /**
     * Close database connection
     */
    close(): Promise<void>;
    /**
     * Create mock database pool
     */
    createMockPool(): {
        query: jest.Mock<any, any, any>;
        connect: jest.Mock<any, any, any>;
        end: jest.Mock<any, any, any>;
    };
    /**
     * Create mock query result
     */
    mockQueryResult(rows?: any[], command?: string): {
        rows: any[];
        rowCount: number;
        command: string;
        fields: never[];
        oid: null;
    };
    /**
     * Mock successful insert
     */
    mockInsert(data: any): {
        rows: any[];
        rowCount: number;
        command: string;
        fields: never[];
        oid: null;
    };
    /**
     * Mock successful update
     */
    mockUpdate(data: any): {
        rows: any[];
        rowCount: number;
        command: string;
        fields: never[];
        oid: null;
    };
    /**
     * Mock successful delete
     */
    mockDelete(count?: number): {
        rows: any[];
        rowCount: number;
        command: string;
        fields: never[];
        oid: null;
    };
    /**
     * Mock database error
     */
    mockError(message?: string, code?: string): Error;
}
export const dbHelper: DatabaseHelper;
/**
 * Create mock query result
 */
export declare function mockDbResponse(rows?: any[], command?: string): {
    rows: any[];
    rowCount: number;
    command: string;
    fields: never[];
    oid: null;
};
/**
 * Mock successful insert
 */
export declare function mockInsert(data: any): {
    rows: any[];
    rowCount: number;
    command: string;
    fields: never[];
    oid: null;
};
/**
 * Mock successful update
 */
export declare function mockUpdate(data: any): {
    rows: any[];
    rowCount: number;
    command: string;
    fields: never[];
    oid: null;
};
/**
 * Mock successful delete
 */
export declare function mockDelete(count?: number): {
    rows: any[];
    rowCount: number;
    command: string;
    fields: never[];
    oid: null;
};
/**
 * Mock database error
 */
export declare function mockDbError(message?: string, code?: string): Error;
//# sourceMappingURL=database.helper.d.ts.map