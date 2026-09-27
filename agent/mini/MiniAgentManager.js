'use strict';

function shouldUseMiniAgent(
  intent,
  context = {}
) {
  const complex =
    context.complexity === 'high';

  const steps =
    context.estimatedSteps || 1;

  if (complex) {
    return false;
  }

  if (steps > 4) {
    return false;
  }

  return [
    'search',
    'workspace',
    'memory',
    'simple_analysis',
    'simple_tool'
  ].includes(intent);
}

class MiniAgentManager {

  constructor(options = {}) {

    this.MiniAgent =
      options.MiniAgent;

    this.capabilityRouter =
      options.capabilityRouter;

    this.maxConcurrent =
      options.maxConcurrent || 4;

    this.active =
      0;

    this.queue =
      [];
  }

  shouldUseMiniAgent(
    intent,
    context = {}
  ) {
    return shouldUseMiniAgent(
      intent,
      context
    );
  }

  async run(options = {}) {

    const {
      goal,
      userId,
      sessionId,
      context = {}
    } = options;

    const intent =
      context.intent ||
      'simple_tool';

    if (
      !this.shouldUseMiniAgent(
        intent,
        context
      )
    ) {
      return {
        success: false,
        skipped: true,
        reason:
          'Mini Agent not suitable for this task'
      };
    }

    return await this.enqueue({
      goal,
      userId,
      sessionId,
      context
    });
  }

  async enqueue(task) {

    if (
      this.active <
      this.maxConcurrent
    ) {
      return await this.execute(task);
    }

    return await new Promise(
      (resolve, reject) => {

        this.queue.push({
          task,
          resolve,
          reject
        });
      }
    );
  }

  async execute(task) {

    this.active++;

    try {

      const agent =
        new this.MiniAgent({
          capabilityRouter:
            this.capabilityRouter,

          maxSteps:
            task.context.maxSteps || 6,

          maxRetries:
            task.context.maxRetries || 2,

          timeoutMs:
            task.context.timeoutMs || 15000
        });

      return await agent.run({
        goal:
          task.goal,

        userId:
          task.userId,

        sessionId:
          task.sessionId,

        context:
          task.context
      });

    } finally {

      this.active--;

      this.processQueue();
    }
  }

  async processQueue() {

    if (!this.queue.length) {
      return;
    }

    if (
      this.active >=
      this.maxConcurrent
    ) {
      return;
    }

    const item =
      this.queue.shift();

    try {

      const result =
        await this.execute(
          item.task
        );

      item.resolve(result);

    } catch (error) {

      item.reject(error);
    }
  }
}

module.exports = {
  MiniAgentManager,
  shouldUseMiniAgent
};
