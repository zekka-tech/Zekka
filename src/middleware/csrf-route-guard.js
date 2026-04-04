const CSRF_PUBLIC_EXEMPT_PATHS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/csrf-token'
]);

function shouldSkipCsrfValidation(req) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
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
  createCsrfRouteGuard
};
