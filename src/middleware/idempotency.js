'use strict';

/**
 * Idempotency Key Middleware (H2)
 *
 * Deduplicates POST / PATCH / DELETE requests by storing the first response
 * under the caller-supplied `Idempotency-Key` header in Redis for 24 hours.
 * Subsequent requests with the same key receive the cached response.
 *
 * Usage: mount on any write route that needs deduplication.
 *
 *   const { idempotency } = require('../middleware/idempotency');
 *   router.post('/resource', idempotency(), handler);
 *
 * Spec compliance:
 *   - 400 if the key is present but empty or > 255 chars
 *   - 409 if a request with the same key is still in-flight
 *   - X-Idempotency-Replayed: true header on cache hits
 */

const redis = require('../config/redis');
const logger = require('../utils/logger');

const IDEMPOTENCY_PREFIX = 'idempotency:';
const IDEMPOTENCY_TTL_SECONDS = 86400; // 24 hours
const IN_FLIGHT_MARKER = '__in_flight__';
const IN_FLIGHT_TTL_SECONDS = 60; // max time for a single request to complete

/**
 * Returns Express middleware that enforces idempotency for write endpoints.
 * @returns {Function} Express middleware
 */
function idempotency() {
  return async function idempotencyMiddleware(req, res, next) {
    const key = req.headers['idempotency-key'];

    // Only apply to write methods
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
      return next();
    }

    // No key supplied — pass through (key is optional by default)
    if (!key) {
      return next();
    }

    // Validate key format
    if (typeof key !== 'string' || key.length === 0 || key.length > 255) {
      return res.status(400).json({
        error: 'Invalid Idempotency-Key',
        message: 'Idempotency-Key must be a non-empty string of at most 255 characters'
      });
    }

    const redisKey = `${IDEMPOTENCY_PREFIX}${key}`;

    try {
      const stored = await redis.get(redisKey);

      if (stored) {
        if (stored === IN_FLIGHT_MARKER) {
          // A request with this key is currently being processed
          return res.status(409).json({
            error: 'Conflict',
            message: 'A request with this idempotency key is already being processed'
          });
        }

        // Return the cached response
        const cached = JSON.parse(stored);
        res.setHeader('X-Idempotency-Replayed', 'true');
        return res.status(cached.status).json(cached.body);
      }

      // Mark as in-flight so concurrent duplicate requests get a 409
      await redis.setEx(redisKey, IN_FLIGHT_TTL_SECONDS, IN_FLIGHT_MARKER);

      // Intercept the response to cache it
      const originalJson = res.json.bind(res);
      res.json = function (body) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redis.setEx(
            redisKey,
            IDEMPOTENCY_TTL_SECONDS,
            JSON.stringify({ status: res.statusCode, body })
          ).catch((err) => {
            logger.warn('Failed to cache idempotency response', { key, error: err.message });
          });
        } else {
          // Remove in-flight marker so the client can retry after a failure
          redis.del(redisKey).catch(() => {});
        }

        return originalJson(body);
      };

      return next();
    } catch (err) {
      // Redis unavailable — degrade gracefully and let the request through
      logger.warn('Idempotency middleware: Redis error, skipping deduplication', {
        key,
        error: err.message
      });
      return next();
    }
  };
}

module.exports = { idempotency };
