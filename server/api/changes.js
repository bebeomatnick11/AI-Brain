'use strict';

function createChangesAPI(options = {}) {
  const changeManager =
    options.changeManager;

  if (!changeManager) {
    throw new Error(
      'ChangeManager required'
    );
  }

  return async function changesAPI(
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
        '/api/changes'
    ) {
      return send(
        res,
        200,
        changeManager.list()
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
  createChangesAPI;
