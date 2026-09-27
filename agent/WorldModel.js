'use strict';

class WorldModel {

  constructor() {

    this.worlds =
      new Map();
  }


  createDefault(
    brainId
  ) {

    return {
      brainId,

      game: null,

      player: null,

      players: [],

      location: null,

      nearbyObjects: [],

      activeTasks: [],

      activeSkills: [],

      capabilities: [],

      lastObservation: null,

      spatial: {

        coordinateSystem:
          'right-handed',

        camera: null,

        objects: [],

        lights: [],

        relations: [],

        constraints: [],

        lighting: [],

        lastAnalysis: null
      },

      temporal: {

        frame: 0,

        time: 0,

        deltaTime: 0,

        previousState: null
      },

      updatedAt:
        Date.now()
    };
  }


  get(
    brainId
  ) {

    if (
      !this.worlds.has(
        brainId
      )
    ) {

      this.worlds.set(
        brainId,
        this.createDefault(
          brainId
        )
      );
    }


    return this.worlds.get(
      brainId
    );
  }


  update(
    brainId,
    patch = {}
  ) {

    const world =
      this.get(
        brainId
      );


    if (
      patch.spatial
    ) {

      world.spatial = {
        ...world.spatial,
        ...patch.spatial
      };
    }


    if (
      patch.temporal
    ) {

      world.temporal = {
        ...world.temporal,
        ...patch.temporal
      };
    }


    Object.keys(
      patch
    ).forEach(
      key => {

        if (
          key !== 'spatial' &&
          key !== 'temporal'
        ) {

          world[key] =
            patch[key];
        }
      }
    );


    world.updatedAt =
      Date.now();


    return world;
  }


  updateSpatial(
    brainId,
    spatialPatch = {}
  ) {

    const world =
      this.get(
        brainId
      );


    world.spatial = {
      ...world.spatial,
      ...spatialPatch
    };


    world.updatedAt =
      Date.now();


    return world;
  }


  updateTemporal(
    brainId,
    temporalPatch = {}
  ) {

    const world =
      this.get(
        brainId
      );


    world.temporal = {
      ...world.temporal,
      ...temporalPatch
    };


    world.updatedAt =
      Date.now();


    return world;
  }


  observe(
    brainId
  ) {

    return this.get(
      brainId
    );
  }


  remove(
    brainId
  ) {

    this.worlds.delete(
      brainId
    );
  }
}


module.exports =
  WorldModel;
