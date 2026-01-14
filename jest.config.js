/**
 * Comprehensive Testing Framework Configuration
 * 
 * Provides Jest configuration for unit, integration, and E2E tests
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Root directory
  rootDir: '.',
  
  // Test match patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.test.ts',
    '**/__tests__/**/*.test.js',
    '**/__tests__/**/*.test.ts'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{js,ts}',
    '!src/**/*.spec.{js,ts}',
    '!src/types/**',
    '!**/node_modules/**',
    '!**/dist/**'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Module paths
  modulePaths: ['<rootDir>/src'],
  
  // Module name mapper (for path aliases)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@middleware/(.*)$': '<rootDir>/src/middleware/$1',
    '^@repositories/(.*)$': '<rootDir>/src/repositories/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1'
  },
  
  // Transform files
  transform: {
    '^.+\\.ts$': 'ts-jest',
    '^.+\\.js$': 'babel-jest'
  },
  
  // Test timeout
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Projects for different test types
  projects: [
    {
      displayName: 'unit',
      testMatch: ['**/tests/unit/**/*.test.{js,ts}'],
      testEnvironment: 'node'
    },
    {
      displayName: 'integration',
      testMatch: ['**/tests/integration/**/*.test.{js,ts}'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.js']
    },
    {
      displayName: 'e2e',
      testMatch: ['**/tests/e2e/**/*.test.{js,ts}'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/e2e/setup.js']
    }
  ]
};
