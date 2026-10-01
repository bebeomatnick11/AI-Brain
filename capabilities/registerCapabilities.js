'use strict';

function registerCapabilities({
  capabilityRegistry,
  miniAgentManager = null,
  imageTool = null,
  videoTool = null,
  spatialTool = null
}) {

  if (!capabilityRegistry) {
    throw new Error(
      'registerCapabilities: capabilityRegistry is required'
    );
  }

  // ============================================================
  // MINI AGENT
  // ============================================================

  if (
    miniAgentManager &&
    typeof miniAgentManager.run === 'function'
  ) {
    capabilityRegistry.register({

      name: 'mini_agent',

      description:
        'Run a bounded Mini Agent worker.',

      enabled: true,

      available: true,

      backend: 'internal',

      metadata: {
        category: 'agent',
        maxSteps: 6,
        maxRetries: 2
      },

      execute: async payload => {

        return await miniAgentManager.run({

          goal:
            payload.goal,

          userId:
            payload.userId,

          sessionId:
            payload.sessionId,

          context:
            payload.context
        });

      }

    });
  }

  // ============================================================
  // IMAGE
  // ============================================================

  if (
    imageTool &&
    typeof imageTool.execute === 'function'
  ) {
    capabilityRegistry.register({

      name: 'image.generate',

      description:
        'Generate an image from a prompt.',

      enabled: true,

      available: true,

      backend: 'image-provider',

      metadata: {
        category: 'generation',
        output: 'image'
      },

      execute:
        imageTool.execute.bind(imageTool)

    });
  }

  // ============================================================
  // VIDEO
  // ============================================================

  if (
    videoTool &&
    typeof videoTool.execute === 'function'
  ) {
    capabilityRegistry.register({

      name: 'video.generate',

      description:
        'Generate a video from a prompt.',

      enabled: true,

      available: true,

      backend: 'video-provider',

      metadata: {
        category: 'generation',
        output: 'video'
      },

      execute:
        videoTool.execute.bind(videoTool)

    });
  }

  // ============================================================
  // SPATIAL
  // ============================================================

  if (
    spatialTool &&
    typeof spatialTool.execute === 'function'
  ) {
    capabilityRegistry.register({

      name: 'spatial.analyze',

      description:
        'Analyze spatial relationships, geometry and scene consistency.',

      enabled: true,

      available: true,

      backend: 'spatial-engine',

      metadata: {
        category: 'spatial',
        output: 'analysis'
      },

      execute:
        spatialTool.execute.bind(spatialTool)

    });
  }

  return capabilityRegistry;
}

module.exports =
  registerCapabilities;
