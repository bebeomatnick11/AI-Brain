'use strict';

function registerCapabilityAPI(
  app,
  capabilityRouter,
  authMiddleware
) {

  app.get(
    '/api/capabilities',
    authMiddleware,

    (
      req,
      res
    ) => {

      res.json({
        success: true,

        capabilities:
          capabilityRouter.list()
      });
    }
  );
}


module.exports =
  registerCapabilityAPI;
