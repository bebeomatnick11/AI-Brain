'use strict';

class ScenePlanner {

  constructor(
    spatialReasoner
  ) {

    this.spatialReasoner =
      spatialReasoner;
  }


  createScene(
    input = {}
  ) {

    const scene = {
      coordinateSystem:
        'right-handed',

      camera: {
        position:
          [0, 2, 8],

        lookAt:
          [0, 1, 0],

        fov:
          50
      },

      objects: [],

      lights: [],

      relations: [],

      constraints: []
    };


    if (
      input.camera
    ) {

      scene.camera = {
        ...scene.camera,
        ...input.camera
      };
    }


    if (
      Array.isArray(input.objects)
    ) {

      scene.objects =
        input.objects;
    }


    if (
      Array.isArray(input.lights)
    ) {

      scene.lights =
        input.lights;
    }


    const analysis =
      this.spatialReasoner.analyzeScene(
        scene
      );


    scene.relations =
      analysis.relations;


    scene.lighting =
      analysis.lighting;


    scene.constraints.push(
      {
        type:
          'lighting-shadow-consistency',

        rule:
          'shadows must extend away from light source'
      }
    );


    scene.constraints.push(
      {
        type:
          'camera-consistency',

        rule:
          'visible geometry must agree with camera position and orientation'
      }
    );


    return scene;
  }


  buildGenerationConstraints(
    scene
  ) {

    return {
      camera:
        scene.camera,

      lighting:
        scene.lighting,

      relations:
        scene.relations,

      constraints:
        scene.constraints
    };
  }
}


module.exports =
  ScenePlanner;
