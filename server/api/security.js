'use strict';

function createSecurityAPI(options = {}) {
  const audit =
    options.audit;

  const permissionEngine =
    options.permissionEngine;

  const securityGate =
    options.securityGate;

  if (
    !audit ||
    !permissionEngine ||
    !securityGate
  ) {
    throw new Error(
      'Security API dependencies missing'
    );
  }

  return async function securityAPI(
    req,
    res
  ) {
    const url =
      new URL(
        req.url,
        'http://localhost'
      );

    if (
      req.method === 'GET' &&
      url.pathname ===
        '/api/security/audit'
    ) {
      return send(
        res,
        200,
        audit.list()
      );
    }

    if (
      req.method === 'GET' &&
      url.pathname ===
        '/api/security/permissions'
    ) {
      const role =
        url.searchParams.get(
          'role'
        );

      return send(
        res,
        200,
        {
          role,
          permissions:
            permissionEngine.getPermissions(
              role
            )
        }
      );
    }

    return false;
  };
}

function send(
  res,
  status,
  data
) {
  res.statusCode =
    status;

  res.setHeader(
    'Content-Type',
    'application/json'
  );

  res.end(
    JSON.stringify(data)
  );

  return true;
}

module.exports =
  createSecurityAPI;
