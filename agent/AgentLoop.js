'use strict';

/**
 * ============================================================
 * ASTRA BRAIN
 * Agent Loop
 * ============================================================
 *
 * Không chứa API key.
 * Không phụ thuộc provider cụ thể.
 *
 * Flow:
 *
 * Observe
 *    ↓
 * Intent
 *    ↓
 * Memory
 *    ↓
 * Plan
 *    ↓
 * Execute
 *    ↓
 * Verify
 *    ↓
 * Respond
 *    ↓
 * Learn / Self State
 *
 *
 * Capability registration:
 *
 * imageTool
 *    ↓
 * image.generate
 *    ↓
 * CapabilityRouter
 *
 * videoTool
 *    ↓
 * video.generate
 *
 * spatialTool
 *    ↓
 * spatial.analyze
 *
 * ============================================================
 */

class AgentLoop {

  constructor(options = {}) {

    // ========================================================
    // CORE SYSTEMS
    // ========================================================

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


    // ========================================================
    // CAPABILITY SYSTEM
    // ========================================================

    this.capabilityRouter =
      options.capabilityRouter;


    this.capabilityRegistry =
      options.capabilityRegistry ||
      null;


    // ========================================================
    // PROVIDERS
    // ========================================================

    this.providerRouter =
      options.providerRouter;


    // ========================================================
    // VERIFICATION / SELF STATE
    // ========================================================

    this.verifier =
      options.verifier;


    this.selfState =
      options.selfState;


    // ========================================================
    // OPTIONAL MEDIA / SPATIAL TOOLS
    // ========================================================

    this.imageTool =
      options.imageTool ||
      null;


    this.videoTool =
      options.videoTool ||
      null;


    this.spatialTool =
      options.spatialTool ||
      null;


    // ========================================================
    // LIMITS
    // ========================================================

    this.maxSteps =
      Number(
        options.maxSteps || 8
      );


    // ========================================================
    // REGISTER CAPABILITIES
    // ========================================================

    this.registerCapabilities();

  }


  /**
   * ==========================================================
   * registerCapabilities
   * ==========================================================
   *
   * Registers optional capabilities into CapabilityRegistry.
   *
   * Existing capabilities are not overwritten unless the
   * registry implementation itself allows it.
   *
   * ==========================================================
   */

  registerCapabilities() {

    const registry =
      this.capabilityRegistry;


    if (!registry) {
      return;
    }


    // ========================================================
    // IMAGE GENERATION
    // ========================================================

    if (
      this.imageTool &&
      typeof this.imageTool.execute ===
        'function'
    ) {

      this.registerCapability(
        registry,
        'image.generate',
        {

          description:
            'Generate spatially planned images.',

          enabled:
            true,

          available:
            true,

          backend:
            'image-provider',

          execute:
            this.imageTool.execute.bind(
              this.imageTool
            ),

          metadata: {

            category:
              'generation',

            output:
              'image'
          }
        }
      );
    }


    // ========================================================
    // VIDEO GENERATION
    // ========================================================

    if (
      this.videoTool &&
      typeof this.videoTool.execute ===
        'function'
    ) {

      this.registerCapability(
        registry,
        'video.generate',
        {

          description:
            'Generate videos from planned prompts.',

          enabled:
            true,

          available:
            true,

          backend:
            'video-provider',

          execute:
            this.videoTool.execute.bind(
              this.videoTool
            ),

          metadata: {

            category:
              'generation',

            output:
              'video'
          }
        }
      );
    }


    // ========================================================
    // SPATIAL ANALYSIS
    // ========================================================

    if (
      this.spatialTool &&
      typeof this.spatialTool.execute ===
        'function'
    ) {

      this.registerCapability(
        registry,
        'spatial.analyze',
        {

          description:
            'Analyze spatial scenes, geometry, lighting and camera information.',

          enabled:
            true,

          available:
            true,

          backend:
            'spatial-provider',

          execute:
            this.spatialTool.execute.bind(
              this.spatialTool
            ),

          metadata: {

            category:
              'analysis',

            output:
              'spatial-analysis'
          }
        }
      );
    }

  }


  /**
   * ==========================================================
   * registerCapability
   * ==========================================================
   *
   * Supports common CapabilityRegistry APIs.
   *
   * Preferred:
   *
   * registry.register(
   *   name,
   *   definition
   * )
   *
   * Also supports:
   *
   * registry.add(...)
   * registry.registerCapability(...)
   *
   * ==========================================================
   */

  registerCapability(
    registry,
    name,
    definition
  ) {

    try {

      if (
        typeof registry.register ===
        'function'
      ) {

        registry.register(
          name,
          definition
        );

        return true;
      }


      if (
        typeof registry.registerCapability ===
        'function'
      ) {

        registry.registerCapability(
          name,
          definition
        );

        return true;
      }


      if (
        typeof registry.add ===
        'function'
      ) {

        registry.add(
          name,
          definition
        );

        return true;
      }

    } catch (error) {

      /*
       * Registration failure must not crash the
       * entire AgentLoop.
       *
       * The capability will simply be unavailable.
       */

      return false;
    }


    return false;
  }


  /**
   * ==========================================================
   * run
   * ==========================================================
   */

  async run(
    input = {}
  ) {

    const startedAt =
      Date.now();


    const state = {

      id:
        input.requestId ||
        `run-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,

      brainId:
        input.brainId ||
        null,

      playerId:
        input.playerId ||
        null,

      message:
        String(
          input.message || ''
        ),

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
        typeof this.observationEngine.observe ===
          'function'
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
        typeof this.intentEngine.detect ===
          'function'
      ) {

        state.intent =
          await this.intentEngine.detect(
            state.message,
            state
          );

      } else {

        state.intent = {

          type:
            'chat',

          confidence:
            0.2

        };
      }


      // ======================================================
      // 3. MEMORY RETRIEVAL
      // ======================================================

      if (
        this.memory &&
        typeof this.memory.retrieve ===
          'function'
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

            stage:
              'memory',

            message:
              error.message

          });
        }
      }


      // ======================================================
      // 4. PLAN
      // ======================================================

      if (
        this.planner &&
        typeof this.planner.createPlan ===
          'function'
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
              state.brainId,

            capabilities:
              this.getAvailableCapabilities()

          });
      }


      // ======================================================
      // 5. EXECUTE PLAN
      // ======================================================

      const actions =
        Array.isArray(
          state.plan?.actions
        )
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

            stage:
              'action',

            action,

            message:
              error.message

          });


          state.results.push({

            success:
              false,

            error:
              error.message

          });
        }
      }


      // ======================================================
      // 6. VERIFY
      // ======================================================

      if (
        this.verifier &&
        typeof this.verifier.verify ===
          'function'
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
        typeof this.selfState.record ===
          'function'
      ) {

        await this.selfState.record({

          state,

          duration:
            Date.now() -
            startedAt

        });
      }


      // ======================================================
      // RETURN
      // ======================================================

      return {

        success:
          true,

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
          Date.now() -
          startedAt

      };

    } catch (error) {

      return {

        success:
          false,

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


  /**
   * ==========================================================
   * getAvailableCapabilities
   * ==========================================================
   */

  getAvailableCapabilities() {

    const registry =
      this.capabilityRegistry;


    if (!registry) {
      return [];
    }


    try {

      if (
        typeof registry.list ===
        'function'
      ) {

        const result =
          registry.list();

        if (
          Array.isArray(result)
        ) {

          return result;
        }
      }


      if (
        typeof registry.getAll ===
        'function'
      ) {

        const result =
          registry.getAll();

        if (
          Array.isArray(result)
        ) {

          return result;
        }
      }


      if (
        typeof registry.getCapabilities ===
        'function'
      ) {

        const result =
          registry.getCapabilities();

        if (
          Array.isArray(result)
        ) {

          return result;
        }
      }


      if (
        Array.isArray(
          registry.capabilities
        )
      ) {

        return registry.capabilities;
      }

    } catch (
      error
    ) {

      return [];
    }


    return [];
  }


  /**
   * ==========================================================
   * executeAction
   * ==========================================================
   */

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


    if (!type) {

      throw new Error(
        'Agent action has no type'
      );
    }


    // ========================================================
    // CAPABILITY ROUTER
    // ========================================================

    if (
      this.capabilityRouter &&
      typeof this.capabilityRouter.execute ===
        'function'
    ) {

      return await this.capabilityRouter.execute(
        type,
        action,
        state
      );
    }


    // ========================================================
    // ACTION SYSTEM FALLBACK
    // ========================================================

    if (
      this.actionSystem &&
      typeof this.actionSystem.execute ===
        'function'
    ) {

      return await this.actionSystem.execute(
        action,
        state
      );
    }


    // ========================================================
    // NO EXECUTOR
    // ========================================================

    return {

      success:
        false,

      skipped:
        true,

      reason:
        `No executor for action: ${type}`

    };
  }


  /**
   * ==========================================================
   * generateResponse
   * ==========================================================
   */

  async generateResponse(
    state
  ) {

    // ========================================================
    // PROVIDER ROUTER
    // ========================================================

    if (
      this.providerRouter &&
      typeof this.providerRouter.generate ===
        'function'
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


    // ========================================================
    // NO PROVIDER FALLBACK
    // ========================================================
    //
    // Không giả vờ gọi AI nếu không có provider.
    //
    // ========================================================

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


/**
 * ============================================================
 * EXPORT
 * ============================================================
 */

module.exports =
  AgentLoop;
