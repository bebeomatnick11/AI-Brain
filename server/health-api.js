'use strict';

function registerHealthAPI(
  app,
  capabilityRouter,
  providerRouter
) {

  app.get(
    '/api/brain/health',

    (
      req,
      res
    ) => {

      res.json({

        success:
          true,

        status:
          'online',

        timestamp:
          Date.now(),

        providers:
          providerRouter.list(),

        capabilities:
          capabilityRouter.list()
      });
    }
  );
}


module.exports =
  registerHealthAPI;
