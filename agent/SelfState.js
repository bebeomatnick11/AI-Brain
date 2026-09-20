'use strict';

class SelfState {

  constructor() {

    this.states =
      new Map();
  }


  get(
    brainId
  ) {

    if (
      !this.states.has(
        brainId
      )
    ) {

      this.states.set(
        brainId,
        {
          brainId,

          status: 'idle',

          currentTask: null,

          currentSkill: null,

          lastError: null,

          lastAction: null,

          totalActions: 0,

          totalErrors: 0,

          lastSeen:
            Date.now()
        }
      );
    }


    return this.states.get(
      brainId
    );
  }


  set(
    brainId,
    patch
  ) {

    const state =
      this.get(brainId);


    Object.assign(
      state,
      patch
    );


    state.lastSeen =
      Date.now();


    return state;
  }


  record(
    event = {}
  ) {

    const brainId =
      event.state?.brainId;


    if (!brainId) {
      return;
    }


    const state =
      this.get(
        brainId
      );


    state.totalActions +=
      event.state?.actions?.length || 0;


    state.totalErrors +=
      event.state?.errors?.length || 0;


    state.lastAction =
      event.state?.actions?.at(-1) ||
      null;


    state.lastError =
      event.state?.errors?.at(-1) ||
      null;


    state.status =
      'idle';


    state.lastSeen =
      Date.now();
  }
}


module.exports =
  SelfState;
