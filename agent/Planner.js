'use strict';

/**
 * ============================================================
 * ASTRA BRAIN
 * Planner
 * ============================================================
 *
 * Purpose:
 * - Convert IntentEngine output into executable plans
 * - Use CapabilityRegistry when available
 * - Avoid hard-coded dependency on a single tool implementation
 * - Support capability-aware planning
 * - Keep backward compatibility with createPlan(context)
 *
 * Expected flow:
 *
 * IntentEngine
 *      ↓
 * Planner
 *      ↓
 * CapabilityRegistry
 *      ↓
 * CapabilityRouter
 *      ↓
 * AgentLoop
 *
 * ============================================================
 */

class Planner {

  constructor(capabilityRegistry = null) {

    this.capabilityRegistry =
      capabilityRegistry || null;

  }


  /**
   * ----------------------------------------------------------
   * createPlan
   * ----------------------------------------------------------
   *
   * Main planning entry.
   *
   * Supported context:
   *
   * {
   *   message,
   *   intent,
   *   route,
   *   skills,
   *   memory,
   *   state,
   *   capabilities,
   *   metadata
   * }
   *
   * ----------------------------------------------------------
   */

  async createPlan(context = {}) {

    const message =
      String(
        context.message || ''
      ).trim();


    const intent =
      this.normalizeIntent(
        context.intent ||
        context.route ||
        {}
      );


    const availableCapabilities =
      this.getCapabilities(
        context
      );


    const actions =
      this.buildActions({
        message,
        intent,
        context,
        availableCapabilities
      });


    const requiresLLM =
      this.shouldRequireLLM({
        intent,
        message,
        actions
      });


    const complexity =
      this.detectComplexity(
        message,
        intent
      );


    const plan = {

      id:
        this.createPlanId(),

      goal:
        message,

      intent:
        intent.type,

      intentData:
        intent,

      complexity,

      requiresLLM,

      actions,

      capabilities:
        availableCapabilities.map(
          capability =>
            this.getCapabilityName(
              capability
            )
        ),

      createdAt:
        Date.now()

    };


    return plan;
  }


  /**
   * ----------------------------------------------------------
   * normalizeIntent
   * ----------------------------------------------------------
   */

  normalizeIntent(intent = {}) {

    if (typeof intent === 'string') {

      return {
        type:
          intent.toLowerCase()
      };

    }


    const type =
      String(
        intent.type ||
        intent.name ||
        intent.intent ||
        'chat'
      )
      .toLowerCase();


    return {

      ...intent,

      type

    };
  }


  /**
   * ----------------------------------------------------------
   * getCapabilities
   * ----------------------------------------------------------
   *
   * Supports multiple CapabilityRegistry implementations.
   *
   * ----------------------------------------------------------
   */

  getCapabilities(context = {}) {

    if (
      Array.isArray(
        context.capabilities
      )
    ) {

      return context.capabilities;

    }


    const registry =
      this.capabilityRegistry;


    if (!registry) {

      return [];

    }


    try {

      if (
        typeof registry.list === 'function'
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
        typeof registry.getAll === 'function'
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
        typeof registry.getCapabilities === 'function'
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

    } catch (error) {

      return [];

    }


    return [];
  }


  /**
   * ----------------------------------------------------------
   * getCapabilityName
   * ----------------------------------------------------------
   */

  getCapabilityName(capability) {

    if (
      typeof capability === 'string'
    ) {

      return capability;

    }


    if (!capability) {

      return '';

    }


    return String(
      capability.name ||
      capability.id ||
      capability.type ||
      capability.capability ||
      ''
    );
  }


  /**
   * ----------------------------------------------------------
   * hasCapability
   * ----------------------------------------------------------
   */

  hasCapability(
    capabilities,
    names
  ) {

    if (
      !Array.isArray(
        capabilities
      )
    ) {

      return false;

    }


    const wanted =
      Array.isArray(names)
        ? names
        : [names];


    return capabilities.some(
      capability => {

        const name =
          this.getCapabilityName(
            capability
          ).toLowerCase();


        return wanted.some(
          target =>
            name ===
            String(
              target
            ).toLowerCase()
        );

      }
    );
  }


  /**
   * ----------------------------------------------------------
   * resolveCapability
   * ----------------------------------------------------------
   *
   * Finds the actual capability object.
   * ----------------------------------------------------------
   */

  resolveCapability(
    capabilities,
    names
  ) {

    if (
      !Array.isArray(
        capabilities
      )
    ) {

      return null;

    }


    const wanted =
      Array.isArray(names)
        ? names
        : [names];


    for (
      const capability
      of capabilities
    ) {

      const name =
        this.getCapabilityName(
          capability
        ).toLowerCase();


      const match =
        wanted.some(
          target =>
            name ===
            String(
              target
            ).toLowerCase()
        );


      if (match) {

        return capability;

      }

    }


    return null;
  }


  /**
   * ----------------------------------------------------------
   * buildActions
   * ----------------------------------------------------------
   */

  buildActions({
    message,
    intent,
    context,
    availableCapabilities
  }) {

    const actions = [];


    switch (
      intent.type
    ) {


      // ======================================================
      // RESEARCH
      // ======================================================

      case 'research':
      case 'web':
      case 'search': {

        if (
          this.hasCapability(
            availableCapabilities,
            [
              'web.search',
              'web',
              'research'
            ]
          )
        ) {

          actions.push(
            this.createAction(
              'web.search',
              {
                query:
                  message
              }
            )
          );

        } else {

          actions.push(
            this.createAction(
              'web.search',
              {
                query:
                  message
              },
              {
                optional:
                  true
              }
            )
          );

        }

        break;
      }


      // ======================================================
      // MEMORY
      // ======================================================

      case 'memory':
      case 'remember':
      case 'recall': {

        if (
          this.hasCapability(
            availableCapabilities,
            [
              'memory.retrieve',
              'memory',
              'memory.search'
            ]
          )
        ) {

          actions.push(
            this.createAction(
              'memory.retrieve',
              {
                query:
                  message
              }
            )
          );

        } else {

          actions.push(
            this.createAction(
              'memory.retrieve',
              {
                query:
                  message
              },
              {
                optional:
                  true
              }
            )
          );

        }

        break;
      }


      // ======================================================
      // CODE
      // ======================================================

      case 'code':
      case 'coding':
      case 'programming': {

        if (
          this.hasCapability(
            availableCapabilities,
            [
              'workspace.inspect',
              'workspace',
              'code'
            ]
          )
        ) {

          actions.push(
            this.createAction(
              'workspace.inspect',
              {
                query:
                  message
              }
            )
          );

        } else {

          actions.push(
            this.createAction(
              'workspace.inspect',
              {
                query:
                  message
              },
              {
                optional:
                  true
              }
            )
          );

        }


        actions.push(
          this.createAction(
            'code.generate',
            {
              query:
                message
            },
            {
              optional:
                true
            }
          )
        );


        break;
      }


      // ======================================================
      // DEBUG
      // ======================================================

      case 'debug':
      case 'diagnose':
      case 'troubleshoot': {

        actions.push(
          this.createAction(
            'workspace.inspect',
            {
              query:
                message
            },
            {
              optional:
                true
            }
          )
        );


        actions.push(
          this.createAction(
            'verification.analyze',
            {
              query:
                message
            },
            {
              optional:
                true
            }
          )
        );


        actions.push(
          this.createAction(
            'debug.analyze',
            {
              query:
                message
            },
            {
              optional:
                true
            }
          )
        );


        break;
      }


      // ======================================================
      // ANALYZE
      // ======================================================

      case 'analyze':
      case 'analysis': {

        actions.push(
          this.createAction(
            'knowledge.search',
            {
              query:
                message
            },
            {
              optional:
                true
            }
          )
        );


        actions.push(
          this.createAction(
            'verification.analyze',
            {
              query:
                message
            },
            {
              optional:
                true
            }
          )
        );


        break;
      }


      // ======================================================
      // BUILD
      // ======================================================

      case 'build':
      case 'create':
      case 'develop': {

        actions.push(
          this.createAction(
            'workspace.inspect',
            {
              query:
                message
            },
            {
              optional:
                true
            }
          )
        );


        actions.push(
          this.createAction(
            'code.generate',
            {
              query:
                message
            },
            {
              optional:
                true
            }
          )
        );


        break;
      }


      // ======================================================
      // NAVIGATE
      // ======================================================

      case 'navigate':
      case 'navigation': {

        actions.push(
          this.createAction(
            'game.navigate',
            {
              query:
                message
            },
            {
              optional:
                true
            }
          )
        );

        break;
      }


      // ======================================================
      // OBSERVE
      // ======================================================

      case 'observe':
      case 'observation': {

        actions.push(
          this.createAction(
            'game.observe',
            {
              query:
                message
            },
            {
              optional:
                true
            }
          )
        );

        break;
      }


      // ======================================================
      // CHAT
      // ======================================================

      case 'chat':
      case 'conversation':
      default: {

        actions.push(
          this.createAction(
            'llm.respond',
            {
              message
            },
            {
              optional:
                true
            }
          )
        );

        break;
      }

    }


    return this.deduplicateActions(
      actions
    );
  }


  /**
   * ----------------------------------------------------------
   * createAction
   * ----------------------------------------------------------
   */

  createAction(
    type,
    input = {},
    options = {}
  ) {

    return {

      id:
        this.createActionId(),

      type,

      input,

      optional:
        options.optional === true,

      status:
        'pending'

    };
  }


  /**
   * ----------------------------------------------------------
   * deduplicateActions
   * ----------------------------------------------------------
   */

  deduplicateActions(actions) {

    const seen =
      new Set();


    return actions.filter(
      action => {

        const key =
          `${action.type}:${JSON.stringify(action.input || {})}`;


        if (
          seen.has(key)
        ) {

          return false;

        }


        seen.add(key);

        return true;

      }
    );
  }


  /**
   * ----------------------------------------------------------
   * detectComplexity
   * ----------------------------------------------------------
   */

  detectComplexity(
    message,
    intent
  ) {

    const text =
      String(
        message || ''
      );


    let score =
      0;


    if (
      text.length > 300
    ) {

      score += 1;

    }


    if (
      text.length > 700
    ) {

      score += 1;

    }


    if (
      /\b(and|then|after|sau đó|tiếp theo|đồng thời|multiple|nhiều|rồi)\b/i
        .test(text)
    ) {

      score += 1;

    }


    if (
      intent.type === 'debug'
    ) {

      score += 1;

    }


    if (
      intent.type === 'build'
    ) {

      score += 1;

    }


    if (
      intent.type === 'research'
    ) {

      score += 1;

    }


    if (
      score >= 3
    ) {

      return 'high';

    }


    if (
      score >= 1
    ) {

      return 'medium';

    }


    return 'low';
  }


  /**
   * ----------------------------------------------------------
   * shouldRequireLLM
   * ----------------------------------------------------------
   */

  shouldRequireLLM({
    intent,
    message,
    actions
  }) {

    if (
      !message
    ) {

      return false;

    }


    if (
      intent.type === 'chat' ||
      intent.type === 'conversation'
    ) {

      return true;

    }


    if (
      intent.type === 'code' ||
      intent.type === 'coding'
    ) {

      return true;

    }


    if (
      intent.type === 'build' ||
      intent.type === 'create' ||
      intent.type === 'develop'
    ) {

      return true;

    }


    if (
      intent.type === 'analyze' ||
      intent.type === 'analysis'
    ) {

      return true;

    }


    return actions.some(
      action =>
        action.type ===
        'llm.respond'
    );
  }


  /**
   * ----------------------------------------------------------
   * createPlanId
   * ----------------------------------------------------------
   */

  createPlanId() {

    return (
      'PLAN-' +
      Date.now().toString(36) +
      '-' +
      Math.random()
        .toString(36)
        .slice(2, 8)
        .toUpperCase()
    );
  }


  /**
   * ----------------------------------------------------------
   * createActionId
   * ----------------------------------------------------------
   */

  createActionId() {

    return (
      'ACTION-' +
      Date.now().toString(36) +
      '-' +
      Math.random()
        .toString(36)
        .slice(2, 7)
        .toUpperCase()
    );
  }

}


/**
 * ============================================================
 * EXPORT
 * ============================================================
 */

module.exports =
  Planner;
