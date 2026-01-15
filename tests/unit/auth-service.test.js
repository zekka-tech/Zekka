/**
 * Comprehensive Unit Tests for Authentication Service
 * Tests all MFA, password management, and session functionality
 * 
 * @group unit
 */

const AuthService = require('../../src/services/auth-service');
const PasswordService = require('../../src/services/password-service');
const { faker } = require('@faker-js/faker');

describe('AuthService - Unit Tests', () => {
  let authService;
  let mockPool;
  let mockRedis;
  
  beforeEach(() => {
    // Mock database pool
    mockPool = {
      query: jest.fn(),
      connect: jest.fn()
    };
    
    // Mock Redis client
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn()
    };
    
    authService = new AuthService(mockPool, mockRedis);
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Registration', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: faker.internet.email(),
        username: faker.internet.userName(),
        password: 'Test123!@#'
      };
      
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // Check existing
      mockPool.query.mockResolvedValueOnce({ 
        rows: [{ id: '123', ...userData, password_hash: 'hashed' }],
        rowCount: 1
      }); // Insert user
      
      const result = await authService.register(userData);
      
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(userData.email);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });
    
    it('should reject registration with weak password', async () => {
      const userData = {
        email: faker.internet.email(),
        username: faker.internet.userName(),
        password: 'weak'
      };
      
      await expect(authService.register(userData))
        .rejects
        .toThrow(/password/i);
    });
    
    it('should reject duplicate email registration', async () => {
      const userData = {
        email: faker.internet.email(),
        username: faker.internet.userName(),
        password: 'Test123!@#'
      };
      
      mockPool.query.mockResolvedValueOnce({ 
        rows: [{ id: '123' }],
        rowCount: 1
      }); // Existing user found
      
      await expect(authService.register(userData))
        .rejects
        .toThrow(/already exists/i);
    });
  });
  
  describe('Authentication', () => {
    it('should authenticate user with correct credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'Test123!@#'
      };
      
      const hashedPassword = await require('bcrypt').hash(credentials.password, 10);
      
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: '123',
          email: credentials.email,
          password_hash: hashedPassword,
          role: 'user',
          mfa_enabled: false
        }],
        rowCount: 1
      });
      
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 }); // Update last login
      
      const result = await authService.authenticate(credentials);
      
      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.user.email).toBe(credentials.email);
    });
    
    it('should reject authentication with incorrect password', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'WrongPassword123!'
      };
      
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: '123',
          email: credentials.email,
          password_hash: await require('bcrypt').hash('CorrectPassword123!', 10),
          failed_login_attempts: 0
        }],
        rowCount: 1
      });
      
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 }); // Increment failed attempts
      
      await expect(authService.authenticate(credentials))
        .rejects
        .toThrow(/invalid/i);
    });
    
    it('should lock account after max failed login attempts', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'WrongPassword123!'
      };
      
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: '123',
          email: credentials.email,
          password_hash: await require('bcrypt').hash('CorrectPassword123!', 10),
          failed_login_attempts: 4 // One more attempt will lock
        }],
        rowCount: 1
      });
      
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 }); // Lock account
      
      await expect(authService.authenticate(credentials))
        .rejects
        .toThrow(/account locked/i);
    });
  });
  
  describe('Multi-Factor Authentication (MFA)', () => {
    it('should setup MFA for user', async () => {
      const userId = '123';
      
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 }); // Update MFA secret
      
      const result = await authService.setupMFA(userId);
      
      expect(result.secret).toBeDefined();
      expect(result.qr_code).toBeDefined();
      expect(result.backup_codes).toHaveLength(10);
      expect(mockPool.query).toHaveBeenCalled();
    });
    
    it('should verify MFA token correctly', async () => {
      const userId = '123';
      const secret = 'JBSWY3DPEHPK3PXP';
      const speakeasy = require('speakeasy');
      
      const token = speakeasy.totp({
        secret,
        encoding: 'base32'
      });
      
      mockPool.query.mockResolvedValueOnce({
        rows: [{ mfa_secret: secret, mfa_enabled: true }],
        rowCount: 1
      });
      
      const result = await authService.verifyMFA(userId, token);
      
      expect(result.valid).toBe(true);
    });
    
    it('should reject invalid MFA token', async () => {
      const userId = '123';
      const secret = 'JBSWY3DPEHPK3PXP';
      
      mockPool.query.mockResolvedValueOnce({
        rows: [{ mfa_secret: secret, mfa_enabled: true }],
        rowCount: 1
      });
      
      const result = await authService.verifyMFA(userId, '000000');
      
      expect(result.valid).toBe(false);
    });
    
    it('should disable MFA for user', async () => {
      const userId = '123';
      
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 }); // Disable MFA
      
      const result = await authService.disableMFA(userId);
      
      expect(result.success).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('mfa_enabled = false'),
        expect.any(Array)
      );
    });
  });
  
  describe('Session Management', () => {
    it('should create session for user', async () => {
      const userId = '123';
      const sessionData = {
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0'
      };
      
      mockRedis.set.mockResolvedValueOnce('OK');
      
      const sessionId = await authService.createSession(userId, sessionData);
      
      expect(sessionId).toBeDefined();
      expect(mockRedis.set).toHaveBeenCalled();
    });
    
    it('should validate active session', async () => {
      const sessionId = 'session-123';
      const sessionData = JSON.stringify({
        user_id: '123',
        created_at: Date.now()
      });
      
      mockRedis.get.mockResolvedValueOnce(sessionData);
      
      const result = await authService.validateSession(sessionId);
      
      expect(result.valid).toBe(true);
      expect(result.user_id).toBe('123');
    });
    
    it('should invalidate expired session', async () => {
      const sessionId = 'session-123';
      const sessionData = JSON.stringify({
        user_id: '123',
        created_at: Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
      });
      
      mockRedis.get.mockResolvedValueOnce(sessionData);
      mockRedis.del.mockResolvedValueOnce(1);
      
      const result = await authService.validateSession(sessionId);
      
      expect(result.valid).toBe(false);
      expect(mockRedis.del).toHaveBeenCalled();
    });
    
    it('should destroy session', async () => {
      const sessionId = 'session-123';
      
      mockRedis.del.mockResolvedValueOnce(1);
      
      const result = await authService.destroySession(sessionId);
      
      expect(result.success).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith(expect.stringContaining(sessionId));
    });
  });
  
  describe('Password Management', () => {
    it('should change password successfully', async () => {
      const userId = '123';
      const oldPassword = 'OldPassword123!';
      const newPassword = 'NewPassword123!';
      const hashedOldPassword = await require('bcrypt').hash(oldPassword, 10);
      
      mockPool.query.mockResolvedValueOnce({
        rows: [{ password_hash: hashedOldPassword }],
        rowCount: 1
      }); // Get current password
      
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 }); // Update password
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 }); // Add to history
      
      const result = await authService.changePassword(userId, oldPassword, newPassword);
      
      expect(result.success).toBe(true);
      expect(mockPool.query).toHaveBeenCalledTimes(3);
    });
    
    it('should reject password change with incorrect old password', async () => {
      const userId = '123';
      const oldPassword = 'WrongPassword123!';
      const newPassword = 'NewPassword123!';
      const hashedOldPassword = await require('bcrypt').hash('CorrectPassword123!', 10);
      
      mockPool.query.mockResolvedValueOnce({
        rows: [{ password_hash: hashedOldPassword }],
        rowCount: 1
      });
      
      await expect(authService.changePassword(userId, oldPassword, newPassword))
        .rejects
        .toThrow(/incorrect/i);
    });
  });
  
  describe('Token Management', () => {
    it('should generate valid JWT token', () => {
      const payload = {
        id: '123',
        email: 'test@example.com',
        role: 'user'
      };
      
      const token = authService.generateToken(payload);
      
      expect(token).toBeDefined();
      expect(token).toBeValidJWT();
    });
    
    it('should verify valid JWT token', () => {
      const payload = {
        id: '123',
        email: 'test@example.com',
        role: 'user'
      };
      
      const token = authService.generateToken(payload);
      const decoded = authService.verifyToken(token);
      
      expect(decoded.id).toBe(payload.id);
      expect(decoded.email).toBe(payload.email);
    });
    
    it('should reject expired JWT token', () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { id: '123' },
        process.env.JWT_SECRET,
        { expiresIn: '0s' }
      );
      
      expect(() => authService.verifyToken(token))
        .toThrow(/expired/i);
    });
    
    it('should reject invalid JWT token', () => {
      const invalidToken = 'invalid.jwt.token';
      
      expect(() => authService.verifyToken(invalidToken))
        .toThrow();
    });
  });
});
