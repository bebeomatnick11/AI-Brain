'use strict';

class CapabilityRouter {

  constructor(
    registry
  ) {

    this.registry =
      registry;
  }


  async execute(
    name,
    payload,
    state
  ) {

    return await this.registry.execute(
      name,
      payload,
      state
    );
  }


  list() {

    return this.registry.list();
  }


  has(
    name
  ) {

    return this.registry.has(
      name
    );
  }
}


module.exports =
  CapabilityRouter;
