'use strict';

/**
 * Wraps an async Express route handler to forward any rejection to next().
 * Eliminates repetitive try/catch boilerplate in every route.
 *
 * @param {Function} fn - async (req, res, next) => void
 * @returns {Function} Express middleware
 *
 * @example
 * router.get('/resource', asyncHandler(async (req, res) => {
 *   const data = await service.getData(req.user.userId);
 *   res.json(data);
 * }));
 */
function asyncHandler(fn) {
  return function asyncRouteWrapper(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
