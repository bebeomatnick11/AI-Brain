'use strict';

module.exports = function createImageTool(
  imageProviderRouter,
  scenePlanner
) {

  return {

    name:
      'image.generate',

    description:
      'Generate an image using a spatially planned scene.',

    permissions: [
      'generation.image'
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
        await imageProviderRouter.generate({

          prompt:
            String(
              input.prompt || ''
            ),

          scene,

          options:
            input.options || {}
        });


      return {
        success:
          result.success !== false,

        tool:
          'image.generate',

        type:
          'image',

        scene,

        ...result
      };
    }
  };
};
