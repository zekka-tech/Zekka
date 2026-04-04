/**
 * User Repository Unit Tests
 */

const mockPool = {
  query: jest.fn()
};

jest.mock('../../../src/config/database', () => ({
  pool: mockPool
}));

const UserRepository = require('../../../src/repositories/user.repository');

describe('UserRepository', () => {
  let repo;

  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress schema init queries
    mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 });
    repo = new UserRepository(mockPool);
  });

  describe('findByEmail()', () => {
    it('returns null when user not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 });
      const result = await repo.findByEmail('notfound@example.com');
      expect(result).toBeNull();
    });

    it('returns domain user when found', async () => {
      const row = {
        user_id: 'u-1',
        email: 'user@example.com',
        name: 'Test',
        password_hash: '$2b$10$hash',
        is_active: true,
        created_at: new Date()
      };
      mockPool.query.mockResolvedValue({ rows: [row], rowCount: 1 });

      const result = await repo.findByEmail('user@example.com');
      expect(result).not.toBeNull();
      expect(result.email).toBe('user@example.com');
    });

    it('lowercases and trims the email before querying', async () => {
      mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 });
      await repo.findByEmail('  USER@EXAMPLE.COM  ');
      const call = mockPool.query.mock.calls[mockPool.query.mock.calls.length - 1];
      expect(call[1][0]).toBe('user@example.com');
    });
  });

  describe('create()', () => {
    it('inserts user and returns domain object', async () => {
      const row = {
        user_id: 'u-2',
        email: 'new@example.com',
        name: 'New User',
        password_hash: '$2b$10$somehash',
        is_active: true,
        created_at: new Date()
      };
      mockPool.query.mockResolvedValue({ rows: [row], rowCount: 1 });

      const result = await repo.create({
        email: 'new@example.com',
        passwordHash: '$2b$10$somehash',
        name: 'New User'
      });

      expect(result).toBeDefined();
      expect(result.email).toBe('new@example.com');
    });

    it('throws ConflictError on duplicate key (pg error 23505)', async () => {
      const pgConflict = new Error('duplicate key');
      pgConflict.code = '23505';
      mockPool.query.mockRejectedValue(pgConflict);

      await expect(
        repo.create({ email: 'dup@example.com', passwordHash: 'hash', name: 'Dup' })
      ).rejects.toThrow();
    });
  });

  describe('findById()', () => {
    it('throws when user not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 });
      await expect(repo.findById('nonexistent-id')).rejects.toThrow();
    });

    it('returns domain user when found by user_id', async () => {
      const row = {
        user_id: 'u-3',
        email: 'found@example.com',
        name: 'Found',
        password_hash: '$2b$10$hash',
        is_active: true,
        created_at: new Date()
      };
      mockPool.query.mockResolvedValue({ rows: [row], rowCount: 1 });

      const result = await repo.findById('u-3');
      expect(result.userId).toBe('u-3');
    });
  });

  describe('toDomainUser()', () => {
    it('returns null for null input', () => {
      expect(repo.toDomainUser(null)).toBeNull();
    });

    it('maps row fields to domain object correctly', () => {
      const row = {
        user_id: 'u-4',
        email: 'test@example.com',
        name: 'Map Test',
        password_hash: 'hash',
        is_active: true,
        failed_login_attempts: 2,
        created_at: new Date()
      };
      const user = repo.toDomainUser(row);
      expect(user.email).toBe('test@example.com');
      expect(user.failed_login_attempts).toBe(2);
    });
  });
});
