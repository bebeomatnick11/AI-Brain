const MiniState =
  require("./MiniState");

const MiniPlanner =
  require("./MiniPlanner");

const MiniVerifier =
  require("./MiniVerifier");

const MiniRetry =
  require("./MiniRetry");

const MiniMemory =
  require("./MiniMemory");

const {
  createMiniPolicy,
  isCapabilityAllowed
} = require("./MiniPolicies");


class MiniAgent {

  constructor(options = {}) {

    this.capabilityRouter =
      options.capabilityRouter || null;

    this.capabilityRegistry =
      options.capabilityRegistry || null;

    this.intentEngine =
      options.intentEngine || null;

    this.memory =
      new MiniMemory({
        memory:
          options.memory
      });

    this.planner =
      options.planner ||
      new MiniPlanner({
        intentEngine:
          this.intentEngine,

        capabilityRegistry:
          this.capabilityRegistry,

        capabilityRouter:
          this.capabilityRouter
      });

    this.verifier =
      options.verifier ||
      new MiniVerifier({
        verificationTool:
          options.verificationTool
      });

    this.retry =
      new MiniRetry({
        maxRetries:
          options.maxRetries ?? 2
      });

    this.policy =
      createMiniPolicy(
        options.policy
      );
  }


  async run(input = {}) {

    const state =
      new MiniState({
        id:
          input.id,

        userId:
          input.userId,

        sessionId:
          input.sessionId,

        goal:
          input.goal,

        maxSteps:
          input.maxSteps ||
          this.policy.maxSteps
      });


    state.status =
      "running";


    try {

      const plan =
        await this.planner.plan({
          goal:
            input.goal,

          context:
            input.context
        });


      if (!plan.success) {

        state.finish("failed");

        return {
          success: false,
          state: state.toJSON(),
          error:
            plan.reason
        };
      }


      state.plan =
        plan.steps;


      while (
        state.canContinue()
      ) {

        const action =
          state.plan[
            state.step
          ];


        if (!action) {
          break;
        }


        state.currentAction =
          action;


        state.addHistory({
          type: "action_started",
          action
        });


        if (
          !isCapabilityAllowed(
            action.capability,
            this.policy
          )
        ) {

          state.addError({
            message:
              `Capability not allowed: ${action.capability}`
          });

          state.finish("failed");

          break;
        }


        let result;

        try {

          result =
            await this.execute(
              action,
              input,
              state
            );

        } catch (error) {

          state.addError(error);

          if (
            this.retry.shouldRetry(
              state
            )
          ) {

            this.retry.next(
              state
            );

            await this.retry.wait(
              state.retries
            );

            continue;
          }

          state.finish("failed");

          break;
        }


        state.addResult({
          action,
          result
        });


        if (
          this.policy
            .requireVerification
        ) {

          const verification =
            await this.verifier.verify({
              goal:
                input.goal,

              action,

              result
            });


          state.addHistory({
            type:
              "verification",
            verification
          });


          if (
            !verification.verified
          ) {

            if (
              this.retry.shouldRetry(
                state
              )
            ) {

              this.retry.next(
                state
              );

              await this.retry.wait(
                state.retries
              );

              continue;
            }

            state.finish(
              "failed"
            );

            break;
          }
        }


        state.nextStep();
      }


      if (
        !state.isFinished()
      ) {

        if (
          state.step >=
          state.plan.length
        ) {
          state.finish(
            "completed"
          );
        } else {
          state.finish(
            "failed"
          );
        }
      }


      return {
        success:
          state.status ===
          "completed",

        state:
          state.toJSON(),

        result:
          state.results[
            state.results.length - 1
          ]?.result || null
      };

    } catch (error) {

      state.addError(error);

      state.finish("failed");

      return {
        success: false,
        state:
          state.toJSON(),
        error:
          error.message
      };
    }
  }


  async execute(
    action,
    input,
    state
  ) {

    if (
      !this.capabilityRouter
    ) {
      throw new Error(
        "CapabilityRouter unavailable"
      );
    }


    const payload = {
      goal:
        input.goal,

      action,

      userId:
        input.userId,

      sessionId:
        input.sessionId,

      context:
        input.context,

      state:
        state.toJSON()
    };


    if (
      typeof this.capabilityRouter.execute ===
      "function"
    ) {

      return await this.capabilityRouter.execute(
        action.capability,
        payload
      );
    }


    if (
      typeof this.capabilityRouter.route ===
      "function"
    ) {

      return await this.capabilityRouter.route(
        action.capability,
        payload
      );
    }


    throw new Error(
      "CapabilityRouter has no execute/route method"
    );
  }
}


module.exports =
  MiniAgent;
