jest.mock('../../../src/repositories/user.repository', () => jest.fn());
jest.mock('../../../src/services/gdpr-compliance.service', () => jest.fn());

const { AuthorizationError } = require('../../../src/utils/errors');
const { UsersController } = require('../../../src/controllers/users.controller');

describe('UsersController', () => {
  let controller;
  let mockUserRepository;
  let mockGdprService;
  let req;
  let res;
  let next;

  beforeEach(() => {
    mockUserRepository = {
      findById: jest.fn(),
      update: jest.fn()
    };
    mockGdprService = {
      exportUserData: jest.fn(),
      exportPortableData: jest.fn(),
      deleteUserData: jest.fn()
    };
    controller = new UsersController(mockUserRepository, mockGdprService);
    req = {
      params: { userId: 'user-1' },
      user: { userId: 'user-1' },
      body: {},
      query: {}
    };
    res = {
      json: jest.fn()
    };
    next = jest.fn();
  });

  it('returns the authenticated user profile without sensitive fields', async () => {
    mockUserRepository.findById.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      password: 'secret',
      reset_token: 'reset-token',
      verification_token: 'verification-token',
      name: 'User One'
    });

    await controller.getUser(req, res, next);

    expect(mockUserRepository.findById).toHaveBeenCalledWith('user-1');
    expect(res.json).toHaveBeenCalledWith({
      user: {
        id: 'user-1',
        email: 'user@example.com',
        name: 'User One'
      }
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects access to another user record', async () => {
    req.params.userId = 'user-2';

    await controller.getUser(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AuthorizationError));
    expect(mockUserRepository.findById).not.toHaveBeenCalled();
  });

  it('exports portable GDPR data for self-service requests', async () => {
    req.query.format = 'portable';
    mockGdprService.exportPortableData.mockResolvedValue({
      format: 'JSON-LD',
      user: { id: 'user-1' }
    });

    await controller.exportUserData(req, res, next);

    expect(mockGdprService.exportPortableData).toHaveBeenCalledWith('user-1');
    expect(res.json).toHaveBeenCalledWith({
      data: {
        format: 'JSON-LD',
        user: { id: 'user-1' }
      }
    });
  });

  it('passes deletion requests through with the authenticated requester id', async () => {
    req.body.reason = 'gdpr_request';
    mockGdprService.deleteUserData.mockResolvedValue({
      success: true
    });

    await controller.deleteUserData(req, res, next);

    expect(mockGdprService.deleteUserData).toHaveBeenCalledWith(
      'user-1',
      'gdpr_request',
      'user-1'
    );
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });
});
