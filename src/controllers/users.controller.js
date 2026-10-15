const UserRepository = require('../repositories/user.repository');
const GDPRComplianceService = require('../services/gdpr-compliance.service');
const { AuthorizationError } = require('../utils/errors');
const { sanitizeUser } = require('../utils/sanitize-user');

class UsersController {
  constructor(userRepository = null, gdprService = null) {
    this.userRepository = userRepository;
    this.gdprService = gdprService;
    this.getUser = this.getUser.bind(this);
    this.updateUser = this.updateUser.bind(this);
    this.exportUserData = this.exportUserData.bind(this);
    this.deleteUserData = this.deleteUserData.bind(this);
  }

  getUserRepository() {
    if (!this.userRepository) {
      this.userRepository = new UserRepository();
    }

    return this.userRepository;
  }

  getGdprService() {
    if (!this.gdprService) {
      this.gdprService = new GDPRComplianceService();
    }

    return this.gdprService;
  }

  assertSelfAccess(requestedUserId, authenticatedUserId) {
    if (requestedUserId !== authenticatedUserId) {
      throw new AuthorizationError('You can only access your own user record');
    }
  }

  sanitizeUser(user) {
    return sanitizeUser(user);
  }

  async getUser(req, res) {
    this.assertSelfAccess(req.params.userId, req.user.userId);
    const user = await this.getUserRepository().findById(req.params.userId);
    res.json({ user: this.sanitizeUser(user) });
  }

  async updateUser(req, res) {
    this.assertSelfAccess(req.params.userId, req.user.userId);
    const user = await this.getUserRepository().update(req.params.userId, req.body);
    res.json({ user: this.sanitizeUser(user) });
  }

  async exportUserData(req, res) {
    this.assertSelfAccess(req.params.userId, req.user.userId);
    const format = req.query.format === 'portable' ? 'portable' : 'json';
    const gdprService = this.getGdprService();
    const data = format === 'portable'
      ? await gdprService.exportPortableData(req.params.userId)
      : await gdprService.exportUserData(req.params.userId, 'json');
    res.json({ data });
  }

  async deleteUserData(req, res) {
    this.assertSelfAccess(req.params.userId, req.user.userId);
    const reason = req.body.reason || 'user_requested_erasure';
    const result = await this.getGdprService().deleteUserData(
      req.params.userId,
      reason,
      req.user.userId
    );
    res.json(result);
  }
}

module.exports = new UsersController();
module.exports.UsersController = UsersController;
