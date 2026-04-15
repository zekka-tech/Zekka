const CSRF_PUBLIC_EXEMPT_PATHS = new Set([
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/refresh-token",
  "/auth/reset-password",
  "/auth/verify-email",
  "/auth/resend-verification",
  "/v1/auth/login",
  "/v1/auth/register",
  "/v1/auth/forgot-password",
  "/v1/auth/refresh-token",
  "/v1/auth/reset-password",
  "/v1/auth/verify-email",
  "/v1/auth/resend-verification",
  "/csrf-token",
]);

function shouldSkipCsrfValidation(req) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return true;
  }

  return CSRF_PUBLIC_EXEMPT_PATHS.has(req.path);
}

function createCsrfRouteGuard(csrfValidator) {
  return function csrfRouteGuard(req, res, next) {
    if (shouldSkipCsrfValidation(req)) {
      return next();
    }

    return csrfValidator(req, res, next);
  };
}

module.exports = {
  CSRF_PUBLIC_EXEMPT_PATHS,
  shouldSkipCsrfValidation,
  createCsrfRouteGuard,
};
