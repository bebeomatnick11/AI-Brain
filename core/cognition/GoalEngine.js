'use strict';

class GoalEngine {
  constructor() {
    this.goals = [];
    this.sequence = 0;
  }

  create(
    description,
    options = {}
  ) {
    const goal = {
      id:
        `goal-${++this.sequence}`,

      description:
        String(description || ''),

      type:
        options.type || 'general',

      priority:
        Number(
          options.priority || 0.5
        ),

      status: 'active',

      createdAt: Date.now(),

      metadata:
        options.metadata || {}
    };

    this.goals.push(goal);

    return goal;
  }

  inferFromContext(context = {}) {
    const intent =
      context.intent?.type;

    const mapping = {
      code:
        'produce or modify code',

      debug:
        'identify and resolve the problem',

      research:
        'obtain relevant information',

      memory:
        'manage or retrieve remembered information',

      analysis:
        'understand the subject',

      comparison:
        'compare the requested subjects',

      creation:
        'create the requested result',

      chat:
        'respond appropriately'
    };

    const description =
      mapping[intent] ||
      'respond to the current request';

    return this.create(
      description,
      {
        type:
          intent || 'general',
        priority:
          0.7
      }
    );
  }

  complete(id, result = null) {
    const goal =
      this.goals.find(
        x => x.id === id
      );

    if (!goal) {
      return false;
    }

    goal.status = 'completed';
    goal.completedAt =
      Date.now();
    goal.result = result;

    return true;
  }

  fail(id, error) {
    const goal =
      this.goals.find(
        x => x.id === id
      );

    if (!goal) {
      return false;
    }

    goal.status = 'failed';
    goal.error =
      String(error || 'Unknown error');

    return true;
  }

  active() {
    return this.goals
      .filter(
        x => x.status === 'active'
      )
      .sort(
        (a, b) =>
          b.priority - a.priority
      );
  }

  clearCompleted() {
    this.goals =
      this.goals.filter(
        x =>
          x.status !== 'completed'
      );
  }
}

module.exports =
  GoalEngine;
