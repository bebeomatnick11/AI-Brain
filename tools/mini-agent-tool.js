class MiniAgentTool {

  constructor(options = {}) {

    this.manager =
      options.manager;
  }


  name() {
    return "mini_agent";
  }


  description() {
    return (
      "Run a small bounded worker agent " +
      "for simple or focused tasks."
    );
  }


  async execute(input = {}) {

    if (
      !this.manager
    ) {
      throw new Error(
        "MiniAgentManager unavailable"
      );
    }


    if (
      !input.goal
    ) {
      return {
        success: false,
        error:
          "goal is required"
      };
    }


    return await this.manager.run({
      goal:
        input.goal,

      userId:
        input.userId,

      sessionId:
        input.sessionId,

      context:
        input.context,

      maxSteps:
        input.maxSteps
    });
  }
}


module.exports =
  MiniAgentTool;
