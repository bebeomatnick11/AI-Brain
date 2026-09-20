'use strict';

class Planner {

  constructor(
    capabilityRegistry
  ) {

    this.capabilityRegistry =
      capabilityRegistry;
  }


  async createPlan(
    context = {}
  ) {

    const intent =
      context.intent?.type ||
      'chat';


    const message =
      String(
        context.message || ''
      );


    const actions = [];


    switch (intent) {

      case 'research':

        actions.push({
          type: 'web.search',
          query: message
        });

        break;


      case 'memory':

        actions.push({
          type: 'memory.retrieve',
          query: message
        });

        break;


      case 'code':

        actions.push({
          type: 'workspace.inspect',
          query: message
        });

        break;


      case 'debug':

        actions.push({
          type: 'workspace.inspect',
          query: message
        });

        actions.push({
          type: 'verification.analyze',
          query: message
        });

        break;


      case 'analyze':

        actions.push({
          type: 'knowledge.search',
          query: message
        });

        break;


      case 'build':

        actions.push({
          type: 'workspace.inspect',
          query: message
        });

        break;


      default:

        break;
    }


    return {

      goal:
        message,

      intent,

      actions,

      requiresLLM:
        intent === 'chat' ||
        intent === 'code' ||
        intent === 'build' ||
        intent === 'analyze'
    };
  }
}


module.exports =
  Planner;
