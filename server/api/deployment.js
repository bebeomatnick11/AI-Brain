'use strict';

function createDeploymentAPI(options = {}) {
  const deploymentManager =
    options.deploymentManager;

  if (!deploymentManager) {
    throw new Error(
      'DeploymentManager required'
    );
  }

  return async function deploymentAPI(
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
        '/api/deployments'
    ) {
      return send(
        res,
        200,
        deploymentManager.list()
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
  createDeploymentAPI;
