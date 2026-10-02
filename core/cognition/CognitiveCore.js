'use strict';

const LanguageUnderstanding =
  require('./LanguageUnderstanding');

const WorkingMemory =
  require('./WorkingMemory');

const ConceptMemory =
  require('./ConceptMemory');

const AssociationEngine =
  require('./AssociationEngine');

const ContextEngine =
  require('./ContextEngine');

const ReasoningEngine =
  require('./ReasoningEngine');

const GoalEngine =
  require('./GoalEngine');

const LearningEngine =
  require('./LearningEngine');

const ResponseEngine =
  require('./ResponseEngine');

/**
 * CognitiveCore
 *
 * Cognitive engine nội bộ của Astra.
 *
 * Không gọi:
 * - OpenAI
 * - Gemini
 * - DeepSeek
 * - Grok
 * - Ollama
 * - API model bên ngoài
 *
 * Cognitive cycle:
 *
 * INPUT
 *   ↓
 * UNDERSTAND
 *   ↓
 * CONTEXT
 *   ↓
 * ASSOCIATE
 *   ↓
 * REASON
 *   ↓
 * GOAL
 *   ↓
 * RESPONSE
 *   ↓
 * LEARN
 */

class CognitiveCore {
  constructor(options = {}) {
    this.name =
      'Astra Cognitive Core';

    this.version =
      options.version ||
      '0.1.0';

    this.language =
      options.languageUnderstanding ||
      new LanguageUnderstanding();

    this.workingMemory =
      options.workingMemory ||
      new WorkingMemory();

    this.conceptMemory =
      options.conceptMemory ||
      new ConceptMemory();

    this.associationEngine =
      options.associationEngine ||
      new AssociationEngine({
        conceptMemory:
          this.conceptMemory
      });

    this.contextEngine =
      options.contextEngine ||
      new ContextEngine();

    this.reasoningEngine =
      options.reasoningEngine ||
      new ReasoningEngine();

    this.goalEngine =
      options.goalEngine ||
      new GoalEngine();

    this.learningEngine =
      options.learningEngine ||
      new LearningEngine({
        conceptMemory:
          this.conceptMemory
      });

    this.responseEngine =
      options.responseEngine ||
      new ResponseEngine();

    this.memoryProvider =
      options.memoryProvider ||
      null;

    this.knowledgeProvider =
      options.knowledgeProvider ||
      null;

    this.contextProvider =
      options.contextProvider ||
      null;

    this.toolProvider =
      options.toolProvider ||
      null;

    this.cycle = 0;
  }

  async process(
    message,
    options = {}
  ) {
    const cycleId =
      ++this.cycle;

    const startedAt =
      Date.now();

    const input =
      String(message || '').trim();

    if (!input) {
      return {
        success: false,
        error: 'EMPTY_INPUT',
        cycleId
      };
    }

    /*
     * -------------------------------------------------------
     * 1. UNDERSTAND
     * -------------------------------------------------------
     */

    const understanding =
      this.language.analyze(
        input,
        options
      );

    /*
     * -------------------------------------------------------
     * 2. WORKING MEMORY
     * -------------------------------------------------------
     */

    this.workingMemory.add(
      {
        type: 'user_input',
        text: input
      },
      {
        importance: 0.9
      }
    );

    /*
     * -------------------------------------------------------
     * 3. ASSOCIATION LEARNING
     * -------------------------------------------------------
     */

    const associations =
      this.associationEngine
        .learnFromTokens(
          understanding.tokens
        );

    /*
     * -------------------------------------------------------
     * 4. EXTERNAL/PERSISTENT MEMORY
     * -------------------------------------------------------
     *
     * Đây chỉ là bridge.
     * Không bắt buộc phải tồn tại.
     */

    let memories = [];

    if (
      this.memoryProvider &&
      typeof this.memoryProvider.retrieve ===
        'function'
    ) {
      try {
        memories =
          await this.memoryProvider.retrieve(
            input,
            options
          );
      } catch {
        memories = [];
      }
    }

    /*
     * -------------------------------------------------------
     * 5. CONTEXT
     * -------------------------------------------------------
     */

    let context = {
      message: input,
      understanding,
      memories
    };

    if (
      this.contextProvider &&
      typeof this.contextProvider.collect ===
        'function'
    ) {
      try {
        context =
          await this.contextProvider.collect(
            {
              message: input,
              understanding
            },
            context
          );
      } catch {
        // Context provider failure
        // must not destroy cognition.
      }
    }

    context =
      this.contextEngine.build({
        message: input,
        understanding,
        memories,
        world:
          options.world || null,
        self:
          options.self || null
      });

    /*
     * -------------------------------------------------------
     * 6. ASSOCIATIVE EXPANSION
     * -------------------------------------------------------
     */

    const related =
      this.associationEngine
        .expandConcepts(
          understanding.keywords
        );

    /*
     * -------------------------------------------------------
     * 7. REASONING
     * -------------------------------------------------------
     */

    const reasoningState = {
      ...context,
      intent:
        understanding.intent,
      question:
        understanding.question,
      keywords:
        understanding.keywords,
      related
    };

    const reasoning =
      this.reasoningEngine.infer(
        reasoningState
      );

    /*
     * -------------------------------------------------------
     * 8. GOAL
     * -------------------------------------------------------
     */

    const goal =
      this.goalEngine
        .inferFromContext({
          ...context,
          intent:
            understanding.intent
        });

    /*
     * -------------------------------------------------------
     * 9. INTERNAL COGNITIVE STATE
     * -------------------------------------------------------
     */

    const cognitiveState = {
      cycleId,

      input,

      understanding,

      context,

      associations,

      related,

      reasoning,

      goal,

      memories,

      workingMemory:
        this.workingMemory.recent(8)
    };

    /*
     * -------------------------------------------------------
     * 10. RESPONSE
     * -------------------------------------------------------
     */

    const response =
      this.responseEngine.generate(
        cognitiveState
      );

    /*
     * -------------------------------------------------------
     * 11. LEARNING
     * -------------------------------------------------------
     */

    const learning =
      this.learningEngine.record({
        input,

        understanding,

        reasoning,

        action: goal,

        result: response,

        success: true
      });

    /*
     * -------------------------------------------------------
     * 12. PERSIST MEMORY
     * -------------------------------------------------------
     */

    if (
      this.memoryProvider &&
      typeof this.memoryProvider.remember ===
        'function'
    ) {
      try {
        await this.memoryProvider.remember(
          {
            type: 'cognitive_experience',

            input,

            intent:
              understanding.intent,

            reasoning:
              reasoning.conclusion,

            response:
              response.text
          },
          {
            cycleId
          }
        );
      } catch {
        // Persistent memory failure
        // must not break the cognitive cycle.
      }
    }

    /*
     * -------------------------------------------------------
     * 13. FINAL RESULT
     * -------------------------------------------------------
     */

    return {
      success: true,

      cycleId,

      core: {
        name: this.name,
        version: this.version
      },

      input,

      understanding,

      context,

      reasoning,

      goal,

      response,

      learning: {
        recorded: !!learning
      },

      duration:
        Date.now() - startedAt
    };
  }

  getState() {
    return {
      name: this.name,
      version: this.version,
      cycle: this.cycle,

      workingMemory:
        this.workingMemory.snapshot(),

      concepts:
        this.conceptMemory.snapshot(),

      learning:
        this.learningEngine.statistics(),

      activeGoals:
        this.goalEngine.active()
    };
  }

  reset() {
    this.workingMemory.clear();
    this.contextEngine.clear();

    this.goalEngine.goals = [];

    return true;
  }
}

module.exports =
  CognitiveCore;
