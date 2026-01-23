/**
 * Auth Service Unit Tests
 * Comprehensive tests for authentication service
 * Target: 15+ tests covering all auth functionality
 */

const { AuthService } = require('../../../src/services/auth.service');
const { AppError, ErrorCodes } = require('../../../src/utils/errors');
const { createRandomUser, createUserRegistration } = require('../../fixtures/user.fixtures');
const { createMockRepository } = global.testUtils;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

describe('AuthService', () => {
  let authService;
  let mockUserRepository;
  let mockConfig;
  let mockAuditLogger;
  let mockPasswordPolicy;
  let mockSessionManager;

  beforeEach(() => {
    // Create mock dependencies
    mockUserRepository = createMockRepository();
    mockConfig = {
      jwtSecret: process.env.JWT_SECRET
    };

    // Mock audit logger
    mockAuditLogger = {
      log: jest.fn().mockResolvedValue(true)
    };

    // Mock password policy
    mockPasswordPolicy = {
      validatePassword: jest.fn().mockReturnValue({
        isValid: true,
        strength: 'strong',
        errors: []
      })
    };

    // Mock session manager
    mockSessionManager = {
      createSession: jest.fn().mockResolvedValue(true),
      validateSession: jest.fn().mockResolvedValue(true),
      invalidateSession: jest.fn().mockResolvedValue(true),
      invalidateAllUserSessions: jest.fn().mockResolvedValue(true),
      getActiveSessionCount: jest.fn().mockResolvedValue(10)
    };

    // Create auth service instance
    authService = new AuthService(mockUserRepository, mockConfig);
    authService.auditLogger = mockAuditLogger;
    authService.passwordPolicy = mockPasswordPolicy;
    authService.sessionManager = mockSessionManager;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const userData = createUserRegistration();
      const mockUser = createRandomUser({
        email: userData.email,
        name: userData.name
      });

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(mockUser);

      const result = await authService.register(userData);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user.email).toBe(userData.email);
      expect(result.user).not.toHaveProperty('password');
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(userData.email);
      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(mockAuditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'user_registered'
        })
      );
    });

    it('should prevent duplicate email registration', async () => {
      const userData = createUserRegistration();
      const existingUser = createRandomUser({ email: userData.email });

      mockUserRepository.findByEmail.mockResolvedValue(existingUser);

      await expect(authService.register(userData)).rejects.toThrow(AppError);
      await expect(authService.register(userData)).rejects.toThrow('User with this email already exists');
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      await expect(authService.register({})).rejects.toThrow(AppError);
      await expect(authService.register({ email: 'test@test.com' })).rejects.toThrow(AppError);
      await expect(authService.register({ email: 'test@test.com', name: 'Test' })).rejects.toThrow(AppError);
    });

    it('should reject weak passwords', async () => {
      const userData = createUserRegistration({ password: '123' });

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockPasswordPolicy.validatePassword.mockReturnValue({
        isValid: false,
        errors: ['Password too short']
      });

      await expect(authService.register(userData)).rejects.toThrow(AppError);
      await expect(authService.register(userData)).rejects.toThrow('Password validation failed');
    });

    it('should hash password before storing', async () => {
      const userData = createUserRegistration();
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockImplementation(async (data) => {
        expect(data.password).not.toBe(userData.password);
        const isHashed = await bcrypt.compare(userData.password, data.password);
        expect(isHashed).toBe(true);
        return createRandomUser(data);
      });

      await authService.register(userData);
      expect(mockUserRepository.create).toHaveBeenCalled();
    });

    it('should create session on registration', async () => {
      const userData = createUserRegistration();
      const mockUser = createRandomUser();

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(mockUser);

      await authService.register(userData);

      expect(mockSessionManager.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id
        })
      );
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const email = 'test@test.com';
      const password = 'Test123!@#';
      const hashedPassword = await bcrypt.hash(password, 10);
      const mockUser = createRandomUser({ email, password: hashedPassword });

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockUserRepository.resetFailedLoginAttempts.mockResolvedValue(true);
      mockUserRepository.updateLastLogin.mockResolvedValue(true);

      const result = await authService.login(email, password);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user.email).toBe(email);
      expect(mockUserRepository.resetFailedLoginAttempts).toHaveBeenCalledWith(mockUser.id);
      expect(mockUserRepository.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
    });

    it('should reject login with invalid password', async () => {
      const email = 'test@test.com';
      const hashedPassword = await bcrypt.hash('correct', 10);
      const mockUser = createRandomUser({ email, password: hashedPassword });

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockUserRepository.recordFailedLoginAttempt.mockResolvedValue(true);

      await expect(authService.login(email, 'wrong')).rejects.toThrow(AppError);
      await expect(authService.login(email, 'wrong')).rejects.toThrow('Invalid email or password');
      expect(mockUserRepository.recordFailedLoginAttempt).toHaveBeenCalledWith(mockUser.id);
    });

    it('should reject login for non-existent user', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(authService.login('nonexistent@test.com', 'password')).rejects.toThrow(AppError);
      await expect(authService.login('nonexistent@test.com', 'password')).rejects.toThrow('Invalid email or password');
    });

    it('should prevent login for locked account', async () => {
      const email = 'locked@test.com';
      const lockUntil = new Date(Date.now() + 3600000).toISOString();
      const mockUser = createRandomUser({
        email,
        locked_until: lockUntil
      });

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(authService.login(email, 'password')).rejects.toThrow(AppError);
      await expect(authService.login(email, 'password')).rejects.toThrow('Account is temporarily locked');
    });

    it('should prevent login with expired password', async () => {
      const email = 'expired@test.com';
      const password = 'Test123!@#';
      const hashedPassword = await bcrypt.hash(password, 10);
      const mockUser = createRandomUser({
        email,
        password: hashedPassword,
        password_expires_at: new Date('2020-01-01').toISOString()
      });

      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(authService.login(email, password)).rejects.toThrow(AppError);
      await expect(authService.login(email, password)).rejects.toThrow('Password has expired');
    });
  });

  describe('logout', () => {
    it('should successfully logout user', async () => {
      const userId = 'test-user-id';
      const token = 'test-token';

      mockSessionManager.invalidateSession.mockResolvedValue(true);

      const result = await authService.logout(userId, token);

      expect(result).toHaveProperty('message', 'Logged out successfully');
      expect(mockSessionManager.invalidateSession).toHaveBeenCalledWith(userId, token);
      expect(mockAuditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'user_logged_out',
          userId
        })
      );
    });
  });

  describe('changePassword', () => {
    it('should successfully change password', async () => {
      const userId = 'test-user-id';
      const currentPassword = 'OldPass123!@#';
      const newPassword = 'NewPass123!@#';
      const hashedOldPassword = await bcrypt.hash(currentPassword, 10);
      const mockUser = createRandomUser({ id: userId, password: hashedOldPassword });

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.checkPasswordHistory.mockResolvedValue(false);
      mockUserRepository.updatePassword.mockResolvedValue(true);

      const result = await authService.changePassword(userId, currentPassword, newPassword);

      expect(result).toHaveProperty('message', 'Password changed successfully');
      expect(mockUserRepository.updatePassword).toHaveBeenCalled();
      expect(mockSessionManager.invalidateAllUserSessions).toHaveBeenCalledWith(userId);
    });

    it('should reject with incorrect current password', async () => {
      const userId = 'test-user-id';
      const currentPassword = 'OldPass123!@#';
      const hashedOldPassword = await bcrypt.hash(currentPassword, 10);
      const mockUser = createRandomUser({ id: userId, password: hashedOldPassword });

      mockUserRepository.findById.mockResolvedValue(mockUser);

      await expect(
        authService.changePassword(userId, 'WrongPassword', 'NewPass123!@#')
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should prevent password reuse', async () => {
      const userId = 'test-user-id';
      const currentPassword = 'OldPass123!@#';
      const newPassword = 'OldPass123!@#';
      const hashedOldPassword = await bcrypt.hash(currentPassword, 10);
      const mockUser = createRandomUser({ id: userId, password: hashedOldPassword });

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.checkPasswordHistory.mockResolvedValue(true);

      await expect(
        authService.changePassword(userId, currentPassword, newPassword)
      ).rejects.toThrow('Cannot reuse recent passwords');
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', async () => {
      const userId = 'test-user-id';
      const token = authService.generateAccessToken({ id: userId, email: 'test@test.com' });

      mockSessionManager.validateSession.mockResolvedValue(true);

      const decoded = await authService.verifyToken(token);

      expect(decoded).toHaveProperty('userId');
      expect(mockSessionManager.validateSession).toHaveBeenCalledWith(decoded.userId, token);
    });

    it('should reject expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: 'test-user-id' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' }
      );

      await expect(authService.verifyToken(expiredToken)).rejects.toThrow(AppError);
      await expect(authService.verifyToken(expiredToken)).rejects.toThrow('Invalid or expired token');
    });

    it('should reject invalid token', async () => {
      await expect(authService.verifyToken('invalid.token.here')).rejects.toThrow(AppError);
    });
  });
});
