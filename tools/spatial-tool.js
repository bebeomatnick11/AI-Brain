'use strict';

module.exports = function createSpatialTool(
  spatialReasoner,
  scenePlanner,
  spatialVerifier
) {

  return {

    name:
      'spatial.analyze',

    description:
      'Analyze 3D spatial relationships, lighting, camera and shadows.',

    permissions: [
      'world.read'
    ],

    schema: {
      type:
        'object',

      properties: {
        scene: {
          type:
            'object'
        }
      },

      required: [
        'scene'
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


      const analysis =
        spatialReasoner.analyzeScene(
          scene
        );


      return {
        success:
          true,

        tool:
          'spatial.analyze',

        scene,

        analysis
      };
    }
  };
};
