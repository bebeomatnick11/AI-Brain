'use strict';

/**
 * Astra Brain Agent Loop
 *
 * Không chứa API key.
 * Không phụ thuộc provider cụ thể.
 */

class AgentLoop {

  constructor(options = {}) {

    this.intentEngine =
      options.intentEngine;

    this.planner =
      options.planner;

    this.worldModel =
      options.worldModel;

    this.actionSystem =
      options.actionSystem;

    this.observationEngine =
      options.observationEngine;

    this.memory =
      options.memory;

    this.capabilityRouter =
      options.capabilityRouter;

    this.providerRouter =
      options.providerRouter;

    this.verifier =
      options.verifier;

    this.selfState =
      options.selfState;

    this.maxSteps =
      Number(options.maxSteps || 8);
  }


  async run(input = {}) {

    const startedAt =
      Date.now();

    const state = {
      id:
        input.requestId ||
        `run-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,

      brainId:
        input.brainId || null,

      playerId:
        input.playerId || null,

      message:
        String(input.message || ''),

      observation:
        null,

      intent:
        null,

      memories:
        [],

      plan:
        null,

      actions:
        [],

      results:
        [],

      verification:
        null,

      response:
        null,

      errors:
        [],

      startedAt
    };


    try {

      // ======================================================
      // 1. OBSERVE
      // ======================================================

      if (
        this.observationEngine &&
        typeof this.observationEngine.observe === 'function'
      ) {

        state.observation =
          await this.observationEngine.observe(
            input,
            state
          );
      }


      // ======================================================
      // 2. INTENT
      // ======================================================

      if (
        this.intentEngine &&
        typeof this.intentEngine.detect === 'function'
      ) {

        state.intent =
          await this.intentEngine.detect(
            state.message,
            state
          );

      } else {

        state.intent = {
          type: 'chat',
          confidence: 0.2
        };
      }


      // ======================================================
      // 3. MEMORY RETRIEVAL
      // ======================================================

      if (
        this.memory &&
        typeof this.memory.retrieve === 'function'
      ) {

        try {

          state.memories =
            await this.memory.retrieve(
              state.message,
              {
                brainId:
                  state.brainId,

                playerId:
                  state.playerId,

                limit:
                  12
              }
            ) || [];

        } catch (error) {

          state.errors.push({
            stage: 'memory',
            message: error.message
          });
        }
      }


      // ======================================================
      // 4. PLAN
      // ======================================================

      if (
        this.planner &&
        typeof this.planner.createPlan === 'function'
      ) {

        state.plan =
          await this.planner.createPlan({
            message:
              state.message,

            intent:
              state.intent,

            observation:
              state.observation,

            memories:
              state.memories,

            brainId:
              state.brainId
          });
      }


      // ======================================================
      // 5. EXECUTE PLAN
      // ======================================================

      const actions =
        Array.isArray(state.plan?.actions)
          ? state.plan.actions
          : [];


      const limitedActions =
        actions.slice(
          0,
          this.maxSteps
        );


      for (
        const action
        of limitedActions
      ) {

        try {

          const result =
            await this.executeAction(
              action,
              state
            );

          state.actions.push(
            action
          );

          state.results.push(
            result
          );

        } catch (error) {

          state.errors.push({
            stage: 'action',
            action,
            message: error.message
          });

          state.results.push({
            success: false,
            error: error.message
          });
        }
      }


      // ======================================================
      // 6. VERIFY
      // ======================================================

      if (
        this.verifier &&
        typeof this.verifier.verify === 'function'
      ) {

        state.verification =
          await this.verifier.verify(
            state
          );
      }


      // ======================================================
      // 7. FINAL RESPONSE
      // ======================================================

      state.response =
        await this.generateResponse(
          state
        );


      // ======================================================
      // 8. LEARNING / SELF STATE
      // ======================================================

      if (
        this.selfState &&
        typeof this.selfState.record === 'function'
      ) {

        await this.selfState.record({
          state,
          duration:
            Date.now() - startedAt
        });
      }


      return {
        success: true,

        requestId:
          state.id,

        response:
          state.response,

        intent:
          state.intent,

        plan:
          state.plan,

        actions:
          state.actions,

        results:
          state.results,

        verification:
          state.verification,

        errors:
          state.errors,

        duration:
          Date.now() - startedAt
      };

    } catch (error) {

      return {
        success: false,

        requestId:
          state.id,

        response:
          'Astra gặp lỗi khi xử lý yêu cầu.',

        error:
          error.message,

        state
      };
    }
  }


  async executeAction(
    action,
    state
  ) {

    if (!action) {
      throw new Error(
        'Empty agent action'
      );
    }


    const type =
      String(
        action.type ||
        action.name ||
        ''
      );


    // Capability-based execution
    if (
      this.capabilityRouter &&
      typeof this.capabilityRouter.execute === 'function'
    ) {

      return await this.capabilityRouter.execute(
        type,
        action,
        state
      );
    }


    if (
      this.actionSystem &&
      typeof this.actionSystem.execute === 'function'
    ) {

      return await this.actionSystem.execute(
        action,
        state
      );
    }


    return {
      success: false,

      skipped: true,

      reason:
        `No executor for action: ${type}`
    };
  }


  async generateResponse(state) {

    if (
      this.providerRouter &&
      typeof this.providerRouter.generate === 'function'
    ) {

      return await this.providerRouter.generate({
        message:
          state.message,

        intent:
          state.intent,

        memories:
          state.memories,

        observation:
          state.observation,

        plan:
          state.plan,

        results:
          state.results,

        verification:
          state.verification
      });
    }


    // Không giả vờ gọi AI nếu không có provider.
    if (
      state.results.length > 0
    ) {

      return JSON.stringify(
        state.results,
        null,
        2
      );
    }


    return (
      'Astra đã nhận yêu cầu nhưng hiện chưa có AI provider hoạt động.'
    );
  }
}


module.exports =
  AgentLoop;
