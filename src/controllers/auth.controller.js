const { AuthService } = require("../services/auth.service");
const Joi = require("joi");

const loginSchema = Joi.object({
  email: Joi.string().email({ minDomainSegments: 2 }).max(254).required(),
  password: Joi.string().max(4096).required(),
});

const registerSchema = Joi.object({
  email: Joi.string().email({ minDomainSegments: 2 }).max(254).required(),
  password: Joi.string().max(4096).required(),
  name: Joi.string().trim().min(2).max(100).required(),
});

class AuthController {
  constructor(authService = new AuthService()) {
    this.authService = authService;
    this.register = this.register.bind(this);
    this.login = this.login.bind(this);
    this.me = this.me.bind(this);
    this.logout = this.logout.bind(this);
    this.changePassword = this.changePassword.bind(this);
    this.forgotPassword = this.forgotPassword.bind(this);
    this.resetPassword = this.resetPassword.bind(this);
    this.verifyEmail = this.verifyEmail.bind(this);
    this.resendVerificationEmail = this.resendVerificationEmail.bind(this);
    this.refreshToken = this.refreshToken.bind(this);
  }

  async register(req, res, next) {
    try {
      const { error, value } = registerSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        return res.status(400).json({
          error: error.details.map((detail) => detail.message).join("; "),
        });
      }

      const result = await this.authService.register({
        email: value.email,
        password: value.password,
        name: value.name,
        metadata: {
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        },
      });

      return res.status(201).json(result);
    } catch (error) {
      return next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { error, value } = loginSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        return res.status(400).json({
          error: error.details.map((detail) => detail.message).join("; "),
        });
      }

      const result = await this.authService.login(value.email, value.password, {
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      return res.json(result);
    } catch (error) {
      return next(error);
    }
  }

  async me(req, res, next) {
    try {
      const user = await this.authService.getUserById(req.user.userId);
      return res.json({ user });
    } catch (error) {
      return next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const authHeader = req.headers.authorization || "";
      const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : null;

      if (!token) {
        return res.status(400).json({ error: "Missing bearer token" });
      }

      const result = await this.authService.logout(
        req.user.userId,
        token,
        req.body?.refreshToken || null,
      );
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  }

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          error: "currentPassword and newPassword are required",
        });
      }

      const result = await this.authService.changePassword(
        req.user.userId,
        currentPassword,
        newPassword,
      );

      return res.json(result);
    } catch (error) {
      return next(error);
    }
  }

  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const result = await this.authService.requestPasswordReset(email);
      return res.json({ message: result.message });
    } catch (error) {
      return next(error);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          error: "token and newPassword are required",
        });
      }

      const result = await this.authService.resetPassword(token, newPassword);
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  }

  async verifyEmail(req, res, next) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ error: "token is required" });
      }

      const result = await this.authService.verifyEmail(token);
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  }

  async resendVerificationEmail(req, res, next) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const result = await this.authService.resendVerificationEmail(email);
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: "refreshToken is required" });
      }

      const result = await this.authService.refreshAccessToken(refreshToken, {
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new AuthController();
module.exports.AuthController = AuthController;
