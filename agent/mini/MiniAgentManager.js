const MiniAgent =
  require("./MiniAgent");


class MiniAgentManager {

  constructor(options = {}) {

    this.options =
      options;

    this.maxConcurrent =
      options.maxConcurrent ??
      4;

    this.running =
      new Map();

    this.queue =
      [];

    this.completed =
      new Map();

    this.agent =
      options.agent ||
      new MiniAgent(options);
  }


  async run(input = {}) {

    if (
      this.running.size <
      this.maxConcurrent
    ) {

      return await this.start(
        input
      );
    }


    return await new Promise(
      (resolve, reject) => {

        this.queue.push({
          input,
          resolve,
          reject
        });
      }
    );
  }


  async start(input) {

    const id =
      input.id ||
      `mini-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;


    this.running.set(
      id,
      {
        startedAt:
          Date.now(),

        input
      }
    );


    try {

      const result =
        await this.agent.run({
          ...input,
          id
        });


      this.completed.set(
        id,
        result
      );


      return result;

    } finally {

      this.running.delete(
        id
      );

      this.processQueue();
    }
  }


  processQueue() {

    while (
      this.queue.length > 0 &&
      this.running.size <
        this.maxConcurrent
    ) {

      const item =
        this.queue.shift();


      this.start(
        item.input
      )
        .then(item.resolve)
        .catch(item.reject);
    }
  }


  getStatus() {

    return {
      running:
        this.running.size,

      queued:
        this.queue.length,

      completed:
        this.completed.size,

      maxConcurrent:
        this.maxConcurrent
    };
  }


  get(id) {

    if (
      this.running.has(id)
    ) {
      return {
        status:
          "running",

        ...this.running.get(id)
      };
    }


    return (
      this.completed.get(id) ||
      null
    );
  }
}


module.exports =
  MiniAgentManager;
