'use strict';

class WorldModel {

  constructor() {

    this.worlds =
      new Map();
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
        {
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

          updatedAt:
            Date.now()
        }
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
      this.get(brainId);


    Object.assign(
      world,
      patch
    );


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
