const { AuthService } = require('../services/auth.service');

class AuthController {
  constructor(authService = new AuthService()) {
    this.authService = authService;
  }

  register = async (req, res, next) => {
    try {
      const { email, password, name } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const result = await this.authService.register({
        email,
        password,
        name,
        metadata: {
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      });

      return res.status(201).json(result);
    } catch (error) {
      return next(error);
    }
  };

  login = async (req, res, next) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Missing credentials' });
      }

      const result = await this.authService.login(email, password, {
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      return res.json(result);
    } catch (error) {
      return next(error);
    }
  };

  me = async (req, res, next) => {
    try {
      const user = await this.authService.getUserById(req.user.userId);
      return res.json({ user });
    } catch (error) {
      return next(error);
    }
  };

  logout = async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;

      if (!token) {
        return res.status(400).json({ error: 'Missing bearer token' });
      }

      const result = await this.authService.logout(req.user.userId, token);
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  };

  changePassword = async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          error: 'currentPassword and newPassword are required'
        });
      }

      const result = await this.authService.changePassword(
        req.user.userId,
        currentPassword,
        newPassword
      );

      return res.json(result);
    } catch (error) {
      return next(error);
    }
  };

  forgotPassword = async (req, res, next) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const result = await this.authService.requestPasswordReset(email);
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = new AuthController();
module.exports.AuthController = AuthController;
