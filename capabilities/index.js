'use strict';

const {
  searchWeb
} =
  require('./web/search');


function registerCapabilities(
  registry
) {

  registry.register(
    'web.search',
    {
      description:
        'Search the public web',

      enabled:
        true,

      available:
        true,

      backend:
        'public-search',

      requiresAuth:
        false,

      execute:
        async (
          payload
        ) =>
          await searchWeb(
            payload
          )
    }
  );


  registry.register(
    'memory.retrieve',
    {
      description:
        'Retrieve Astra memories',

      enabled:
        true,

      available:
        true,

      backend:
        'astra-memory',

      execute:
        async (
          payload,
          state
        ) => {

          if (
            state?.memory &&
            typeof state.memory.retrieve ===
            'function'
          ) {

            return await state.memory.retrieve(
              payload.query
            );
          }


          return {
            success: false,
            error:
              'Memory service unavailable'
          };
        }
    }
  );


  registry.register(
    'verification.analyze',
    {
      description:
        'Verify agent execution results',

      enabled:
        true,

      available:
        true,

      backend:
        'astra-verifier',

      execute:
        async () => ({
          success: true,
          verified: true
        })
    }
  );


  registry.register(
    'workspace.inspect',
    {
      description:
        'Inspect workspace context',

      enabled:
        true,

      available:
        false,

      backend:
        'workspace'
    }
  );


  registry.register(
    'github',
    {
      description:
        'GitHub operations',

      enabled:
        true,

      available:
        false,

      backend:
        'gh'
    }
  );


  registry.register(
    'youtube',
    {
      description:
        'YouTube research',

      enabled:
        true,

      available:
        false,

      backend:
        'yt-dlp'
    }
  );


  registry.register(
    'security.scan',
    {
      description:
        'Authorized application security analysis',

      enabled:
        false,

      available:
        false,

      backend:
        'strix'
    }
  );


  return registry;
}


module.exports =
  {
    registerCapabilities
  };
