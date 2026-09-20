'use strict';

function registerAgentAPI(
  app,
  agentLoop,
  authMiddleware
) {

  app.post(
    '/api/agent/run',
    authMiddleware,

    async (
      req,
      res
    ) => {

      try {

        const body =
          req.body || {};


        const result =
          await agentLoop.run({

            requestId:
              body.requestId,

            brainId:
              body.brainId,

            playerId:
              body.playerId,

            message:
              body.message,

            observation:
              body.observation
          });


        res.json(
          result
        );

      } catch (error) {

        res.status(500).json({
          success: false,

          error:
            error.message
        });
      }
    }
  );
}


module.exports =
  registerAgentAPI;
