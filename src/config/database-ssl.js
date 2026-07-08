/**
 * Shared PostgreSQL SSL configuration
 *
 * Secure by default: in production TLS is enabled with full certificate
 * verification. Managed providers whose CA is not in the system trust store
 * should supply it via DATABASE_SSL_CA (inline PEM or file path).
 * DATABASE_SSL_REJECT_UNAUTHORIZED=false remains available as an explicit,
 * logged escape hatch for providers with self-signed chains.
 *
 * Environment variables:
 * - DATABASE_SSL: 'true' | 'false' — force-enable/disable TLS (overrides default)
 * - DATABASE_SSL_REJECT_UNAUTHORIZED: 'false' to skip certificate verification
 * - DATABASE_SSL_CA: PEM string or path to a CA certificate file
 */

const fs = require('fs');
const logger = require('../utils/logger');

function resolveCa(caValue) {
  if (!caValue) {
    return undefined;
  }

  if (caValue.includes('-----BEGIN')) {
    return caValue;
  }

  return fs.readFileSync(caValue, 'utf8');
}

/**
 * Build the `ssl` option for a pg Pool.
 *
 * @param {Object} [options]
 * @param {boolean} [options.defaultEnabled] - Whether TLS is on when
 *   DATABASE_SSL is unset. Defaults to true in production.
 * @returns {false|Object} Value for the pg `ssl` pool option
 */
function getDatabaseSsl(options = {}) {
  const { defaultEnabled = process.env.NODE_ENV === 'production' } = options;

  const sslEnv = (process.env.DATABASE_SSL || '').toLowerCase();
  const enabled = sslEnv === 'true' || (sslEnv !== 'false' && defaultEnabled);

  if (!enabled) {
    return false;
  }

  const rejectUnauthorized = (process.env.DATABASE_SSL_REJECT_UNAUTHORIZED || 'true').toLowerCase() !== 'false';

  if (!rejectUnauthorized) {
    logger.warn(
      '⚠️  DATABASE_SSL_REJECT_UNAUTHORIZED=false — TLS certificate verification is DISABLED for PostgreSQL connections'
    );
  }

  const ssl = { rejectUnauthorized };
  const ca = resolveCa(process.env.DATABASE_SSL_CA);
  if (ca) {
    ssl.ca = ca;
  }

  return ssl;
}

module.exports = { getDatabaseSsl };
