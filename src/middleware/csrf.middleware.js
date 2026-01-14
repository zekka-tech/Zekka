/**
 * CSRF Protection Middleware
 * 
 * SECURITY FIX: Phase 1 - CSRF token protection
 * Note: CSURF is deprecated, implementing custom CSRF protection
 */

const crypto = require('crypto');

class CSRFProtection {
  constructor() {
    this.tokens = new Map(); // In production, use Redis
    this.tokenExpiry = 3600000; // 1 hour
    this.cleanupInterval = null;
  }
  
  /**
   * Initialize CSRF protection
   */
  initialize() {
    // Cleanup expired tokens every 10 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredTokens();
    }, 600000);
    
    console.log('✅ CSRF protection initialized');
  }
  
  /**
   * Generate CSRF token
   */
  generateToken() {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + this.tokenExpiry;
    
    this.tokens.set(token, {
      createdAt: Date.now(),
      expiresAt,
      used: false
    });
    
    return token;
  }
  
  /**
   * Validate CSRF token
   */
  validateToken(token) {
    if (!token) {
      return false;
    }
    
    const tokenData = this.tokens.get(token);
    
    if (!tokenData) {
      return false;
    }
    
    // Check if expired
    if (Date.now() > tokenData.expiresAt) {
      this.tokens.delete(token);
      return false;
    }
    
    // Mark as used (optional: delete after use for one-time tokens)
    tokenData.used = true;
    
    return true;
  }
  
  /**
   * Cleanup expired tokens
   */
  cleanupExpiredTokens() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [token, data] of this.tokens.entries()) {
      if (now > data.expiresAt) {
        this.tokens.delete(token);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired CSRF tokens`);
    }
  }
  
  /**
   * Get CSRF token endpoint
   */
  getTokenEndpoint() {
    return (req, res) => {
      const token = this.generateToken();
      res.json({ csrfToken: token });
    };
  }
  
  /**
   * CSRF middleware - validates token on state-changing operations
   */
  middleware() {
    return (req, res, next) => {
      // Skip for safe methods
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
      }
      
      // Skip for health check and metrics
      if (req.path === '/health' || req.path === '/metrics') {
        return next();
      }
      
      // Get token from header or body
      const token = req.headers['x-csrf-token'] || 
                   req.headers['csrf-token'] ||
                   req.body._csrf ||
                   req.query._csrf;
      
      if (!this.validateToken(token)) {
        return res.status(403).json({
          error: 'Invalid or missing CSRF token',
          message: 'Please obtain a valid CSRF token from /api/csrf-token'
        });
      }
      
      next();
    };
  }
  
  /**
   * Cleanup on shutdown
   */
  cleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.tokens.clear();
  }
}

// Create singleton instance
const csrfProtection = new CSRFProtection();

module.exports = csrfProtection;
