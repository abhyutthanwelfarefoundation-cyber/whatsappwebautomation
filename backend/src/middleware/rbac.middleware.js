const ApiError = require('../utils/ApiError');

/**
 * Usage: router.get('/orders', authenticate, requirePermission('orders.view'), handler)
 * Admins with 'settings.manage' style wildcard aren't assumed - every role,
 * including Admin, gets its permissions explicitly from RolePermissions
 * (seeded with all permissions for Admin). This keeps the check uniform
 * and avoids hardcoded role-name special-casing scattered through routes.
 */
function requirePermission(...requiredPermissions) {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }

    const userPermissions = req.user.permissions || [];
    const hasAll = requiredPermissions.every((p) => userPermissions.includes(p));

    if (!hasAll) {
      return next(
        ApiError.forbidden(
          `Missing required permission(s): ${requiredPermissions.join(', ')}`
        )
      );
    }

    next();
  };
}

module.exports = { requirePermission };
