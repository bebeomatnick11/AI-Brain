'use strict';

function createVersionsAPI(options = {}) {
  const versionManager =
    options.versionManager;

  if (!versionManager) {
    throw new Error(
      'VersionManager required'
    );
  }

  return async function versionsAPI(
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
        '/api/versions'
    ) {
      return send(
        res,
        200,
        versionManager.list()
      );
    }

    const match =
      url.pathname.match(
        /^\/api\/versions\/([^/]+)$/
      );

    if (
      req.method === 'GET' &&
      match
    ) {
      const version =
        versionManager.get(
          decodeURIComponent(
            match[1]
          )
        );

      if (!version) {
        return send(
          res,
          404,
          {
            error:
              'Version not found'
          }
        );
      }

      return send(
        res,
        200,
        version
      );
    }

    return false;
  };
}

function send(res, status, data) {
  res.statusCode = status;

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
  createVersionsAPI;
