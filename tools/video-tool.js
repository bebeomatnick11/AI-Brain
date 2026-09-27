'use strict';

module.exports = function createVideoTool(
  videoProviderRouter,
  scenePlanner
) {

  return {

    name:
      'video.generate',

    description:
      'Generate a video using a spatially planned scene.',

    permissions: [
      'generation.video'
    ],

    schema: {
      type:
        'object',

      properties: {

        prompt: {
          type:
            'string'
        },

        scene: {
          type:
            'object'
        },

        duration: {
          type:
            'number'
        },

        options: {
          type:
            'object'
        }
      },

      required: [
        'prompt'
      ]
    },


    async execute(
      input = {},
      context = {}
    ) {

      const scene =
        scenePlanner.createScene(
          input.scene || {}
        );


      const result =
        await videoProviderRouter.generate({

          prompt:
            String(
              input.prompt || ''
            ),

          scene,

          duration:
            Number(
              input.duration || 5
            ),

          options:
            input.options || {}
        });


      return {
        success:
          result.success !== false,

        tool:
          'video.generate',

        type:
          'video',

        scene,

        ...result
      };
    }
  };
};
