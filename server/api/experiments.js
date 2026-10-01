'use strict';

function createExperimentRoutes(options = {}) {
  const lab =
    options.lab;

  if (!lab) {
    throw new Error(
      'Experiment Lab is required'
    );
  }

  return async function experimentsAPI(
    req,
    res
  ) {
    try {
      const url =
        new URL(
          req.url,
          'http://localhost'
        );

      const pathname =
        url.pathname;

      if (
        req.method === 'POST' &&
        pathname ===
          '/api/experiments'
      ) {
        const body =
          await readJSON(req);

        const result =
          lab.createExperiment(body);

        return send(
          res,
          201,
          result
        );
      }

      const match =
        pathname.match(
          /^\/api\/experiments\/([^/]+)(?:\/(.*))?$/
        );

      if (!match) {
        return false;
      }

      const id =
        decodeURIComponent(match[1]);

      const action =
        match[2] || '';

      if (
        req.method === 'POST' &&
        action === 'run'
      ) {
        const result =
          await lab.run(id);

        return send(
          res,
          200,
          result
        );
      }

      if (
        req.method === 'POST' &&
        action === 'approve'
      ) {
        const body =
          await readJSON(req);

        const result =
          lab.approve(
            id,
            body.actor || {}
          );

        return send(
          res,
          200,
          result
        );
      }

      if (
        req.method === 'POST' &&
        action === 'reject'
      ) {
        const body =
          await readJSON(req);

        const result =
          lab.reject(
            id,
            body.actor || {},
            body.reason
          );

        return send(
          res,
          200,
          result
        );
      }

      if (
        req.method === 'POST' &&
        action === 'rollback'
      ) {
        const result =
          lab.rollback(id);

        return send(
          res,
          200,
          result
        );
      }

      if (
        req.method === 'GET' &&
        action === 'history'
      ) {
        return send(
          res,
          200,
          lab.getHistory(id)
        );
      }

      return send(
        res,
        404,
        {
          error:
            'Experiment endpoint not found'
        }
      );
    } catch (error) {
      return send(
        res,
        500,
        {
          error: error.message
        }
      );
    }
  };
}

function readJSON(req) {
  return new Promise(
    (resolve, reject) => {
      let data = '';

      req.on(
        'data',
        chunk => {
          data += chunk;

          if (
            data.length >
            1024 * 1024
          ) {
            reject(
              new Error(
                'Request too large'
              )
            );
          }
        }
      );

      req.on(
        'end',
        () => {
          if (!data) {
            resolve({});
            return;
          }

          try {
            resolve(
              JSON.parse(data)
            );
          } catch {
            reject(
              new Error(
                'Invalid JSON'
              )
            );
          }
        }
      );

      req.on(
        'error',
        reject
      );
    }
  );
}

function send(
  res,
  status,
  data
) {
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
  createExperimentRoutes;
