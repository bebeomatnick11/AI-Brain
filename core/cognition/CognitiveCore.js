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

const UserModel =
  require('./UserModel');

const PersonalityEngine =
  require('./PersonalityEngine');

const DialogueEngine =
  require('./DialogueEngine');

const ResponseEngine =
  require('./ResponseEngine');

/**
 * Astra Cognitive Core
 *
 * Cognitive cycle:
 *
 * PERCEIVE
 *   ↓
 * UNDERSTAND
 *   ↓
 * SPEECH ACT
 *   ↓
 * RECALL
 *   ↓
 * ADAPT
 *   ↓
 * REASON
 *   ↓
 * DECIDE
 *   ↓
 * RESPOND
 *   ↓
 * LEARN
 */

class CognitiveCore {
  constructor(options = {}) {
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
      new AssociationEngine(
        this.conceptMemory
      );

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
      new LearningEngine();

    this.userModel =
      options.userModel ||
      new UserModel();

    this.personalityEngine =
      options.personalityEngine ||
      new PersonalityEngine(
        options.personality
      );

    this.dialogueEngine =
      options.dialogueEngine ||
      new DialogueEngine();

    this.responseEngine =
      options.responseEngine ||
      new ResponseEngine();

    this.memoryProvider =
      options.memoryProvider ||
      null;

    this.contextProvider =
      options.contextProvider ||
      null;

    this.sessions =
      new Map();

    this.maxSessionHistory =
      Number(
        options.maxSessionHistory || 30
      );
  }

  async process(
    message,
    options = {}
  ) {
    const startedAt =
      Date.now();

    const userId =
      String(
        options.userId ||
        options.brainId ||
        'default-user'
      );

    const sessionId =
      String(
        options.sessionId ||
        userId
      );

    if (
      !String(message || '').trim()
    ) {
      return {
        success: false,
        error: 'EMPTY_MESSAGE'
      };
    }

    /*
     * ---------------------------------------------------------
     * 1. LANGUAGE UNDERSTANDING
     * ---------------------------------------------------------
     */

    const previousModel =
      this.userModel.get(
        userId
      );

    const understanding =
      this.language.analyze(
        message,
        {
          ...options,

          userModel:
            previousModel,

          session:
            this.getSession(
              sessionId
            )
        }
      );

    /*
     * ---------------------------------------------------------
     * 2. WORKING MEMORY
     * ---------------------------------------------------------
     */

    this.workingMemory.add({
      type: 'user_message',

      content:
        String(message),

      userId,

      sessionId,

      importance:
        this.calculateImportance(
          understanding
        ),

      timestamp:
        Date.now()
    });

    /*
     * ---------------------------------------------------------
     * 3. USER MODEL
     * ---------------------------------------------------------
     */

    const model =
      this.userModel.observe(
        userId,
        {
          text:
            String(message),

          language:
            understanding.language,

          intent:
            understanding.intent,

          speechAct:
            understanding.speechAct,

          topic:
            understanding.topic,

          explicitPreferences:
            options.explicitPreferences
        }
      );

    const adaptation =
      this.userModel.getAdaptation(
        userId
      );

    /*
     * ---------------------------------------------------------
     * 4. ASSOCIATION LEARNING
     * ---------------------------------------------------------
     */

    try {
      if (
        typeof this.associationEngine
          .learnFromTokens ===
        'function'
      ) {
        this.associationEngine
          .learnFromTokens(
            understanding.tokens
          );
      }
    } catch {
      // Association learning must never
      // break the cognitive cycle.
    }

    /*
     * ---------------------------------------------------------
     * 5. MEMORY RETRIEVAL
     * ---------------------------------------------------------
     */

    let memories = [];

    if (
      this.memoryProvider
    ) {
      try {
        if (
          typeof this.memoryProvider
            .retrieve ===
          'function'
        ) {
          const result =
            await this.memoryProvider
              .retrieve(
                message,
                {
                  userId,
                  sessionId,
                  limit:
                    options.memoryLimit ||
                    8
                }
              );

          if (
            Array.isArray(result)
          ) {
            memories = result;
          } else if (
            Array.isArray(
              result?.memories
            )
          ) {
            memories =
              result.memories;
          } else if (
            result
          ) {
            memories = [result];
          }
        }
      } catch (error) {
        memories = [];
      }
    }

    /*
     * ---------------------------------------------------------
     * 6. CONTEXT PROVIDER
     * ---------------------------------------------------------
     */

    let externalContext = {};

    if (
      this.contextProvider
    ) {
      try {
        if (
          typeof this.contextProvider
            .collect ===
          'function'
        ) {
          externalContext =
            await this.contextProvider
              .collect({
                message,
                userId,
                sessionId,
                understanding
              }) || {};
        }
      } catch {
        externalContext = {};
      }
    }

    /*
     * ---------------------------------------------------------
     * 7. SESSION CONTEXT
     * ---------------------------------------------------------
     */

    const session =
      this.getSession(
        sessionId
      );

    const conversationHistory =
      session.history;

    /*
     * ---------------------------------------------------------
     * 8. BUILD COGNITIVE CONTEXT
     * ---------------------------------------------------------
     */

    let cognitiveContext = {};

    try {
      cognitiveContext =
        this.contextEngine.build({
          message,
          understanding,
          memories,
          world:
            options.world || {},
          self:
            options.self || {},
          conversation:
            conversationHistory,
          external:
            externalContext
        }) || {};
    } catch {
      cognitiveContext = {
        message,
        understanding,
        memories,
        conversation:
          conversationHistory,
        external:
          externalContext
      };
    }

    /*
     * ---------------------------------------------------------
     * 9. CONCEPT EXPANSION
     * ---------------------------------------------------------
     */

    let concepts = [];

    try {
      if (
        typeof this.associationEngine
          .expandConcepts ===
        'function'
      ) {
        concepts =
          this.associationEngine
            .expandConcepts(
              understanding.keywords
            ) || [];
      }
    } catch {
      concepts = [];
    }

    /*
     * ---------------------------------------------------------
     * 10. REASONING
     * ---------------------------------------------------------
     */

    let reasoning = {};

    try {
      reasoning =
        this.reasoningEngine.infer({
          message,
          understanding,
          concepts,
          memories,
          context:
            cognitiveContext,
          userModel:
            model
        }) || {};
    } catch (error) {
      reasoning = {
        facts: [],
        hypotheses: [],
        conclusion:
          'Không thể hoàn tất bước suy luận.',
        error:
          error.message
      };
    }

    /*
     * ---------------------------------------------------------
     * 11. GOAL
     * ---------------------------------------------------------
     */

    let goal = null;

    try {
      if (
        typeof this.goalEngine
          .inferFromContext ===
        'function'
      ) {
        goal =
          this.goalEngine
            .inferFromContext({
              message,
              understanding,
              reasoning,
              userModel:
                model
            });
      }
    } catch {
      goal = null;
    }

    /*
     * ---------------------------------------------------------
     * 12. PERSONALITY
     * ---------------------------------------------------------
     */

    const personality =
      this.personalityEngine.build(
        model,
        understanding,
        cognitiveContext
      );

    /*
     * ---------------------------------------------------------
     * 13. DIALOGUE DECISION
     * ---------------------------------------------------------
     */

    const dialogue =
      this.dialogueEngine.decide({
        understanding,

        userModel:
          model,

        adaptation,

        reasoning,

        context:
          cognitiveContext,

        personality,

        confidence:
          understanding.confidence ||
          0.5
      });

    /*
     * ---------------------------------------------------------
     * 14. COGNITIVE STATE
     * ---------------------------------------------------------
     */

    const cognitiveState = {
      userId,

      sessionId,

      understanding,

      userModel:
        adaptation,

      personality,

      dialogue,

      reasoning,

      goal,

      concepts,

      memories,

      context:
        cognitiveContext,

      timestamp:
        Date.now()
    };

    /*
     * ---------------------------------------------------------
     * 15. RESPONSE
     * ---------------------------------------------------------
     */

    let response =
      this.responseEngine.generate({
        message,

        understanding,

        userModel:
          model,

        adaptation,

        personality,

        dialogue,

        reasoning,

        goal,

        concepts,

        memories,

        context:
          cognitiveContext,

        results:
          options.results || []
      });

    /*
     * ---------------------------------------------------------
     * 16. SESSION UPDATE
     * ---------------------------------------------------------
     */

    this.addSessionMessage(
      sessionId,
      {
        role: 'user',

        content:
          String(message),

        understanding: {
          intent:
            understanding.intent,

          speechAct:
            understanding.speechAct,

          topic:
            understanding.topic
        },

        timestamp:
          Date.now()
      }
    );

    this.addSessionMessage(
      sessionId,
      {
        role: 'assistant',

        content:
          response,

        mode:
          dialogue.mode,

        timestamp:
          Date.now()
      }
    );

    /*
     * ---------------------------------------------------------
     * 17. LEARNING
     * ---------------------------------------------------------
     */

    try {
      if (
        typeof this.learningEngine
          .record ===
        'function'
      ) {
        this.learningEngine.record({
          input:
            String(message),

          understanding,

          reasoning,

          action:
            options.results || [],

          result: {
            response
          },

          success: true,

          userId,

          sessionId,

          timestamp:
            Date.now()
        });
      }
    } catch {
      // Learning failure must not
      // destroy the response.
    }

    /*
     * ---------------------------------------------------------
     * 18. PERSIST MEMORY
     * ---------------------------------------------------------
     */

    if (
      this.memoryProvider &&
      typeof this.memoryProvider
        .remember ===
      'function'
    ) {
      try {
        await this.memoryProvider
          .remember({
            type:
              'conversation',

            userId,

            sessionId,

            message:
              String(message),

            response,

            intent:
              understanding.intent,

            speechAct:
              understanding.speechAct,

            topic:
              understanding.topic,

            timestamp:
              Date.now()
          });
      } catch {
        // Persistent memory is optional.
      }
    }

    /*
     * ---------------------------------------------------------
     * 19. RETURN
     * ---------------------------------------------------------
     */

    return {
      success: true,

      response,

      cognitiveState,

      understanding,

      dialogue,

      userModel:
        adaptation,

      personality,

      reasoning,

      goal,

      memories,

      sessionId,

      duration:
        Date.now() -
        startedAt
    };
  }

  getSession(sessionId) {
    const id =
      String(sessionId);

    if (
      !this.sessions.has(id)
    ) {
      this.sessions.set(
        id,
        {
          id,

          history: [],

          createdAt:
            Date.now(),

          lastActivity:
            Date.now()
        }
      );
    }

    const session =
      this.sessions.get(id);

    session.lastActivity =
      Date.now();

    return session;
  }

  addSessionMessage(
    sessionId,
    message
  ) {
    const session =
      this.getSession(
        sessionId
      );

    session.history.push(
      message
    );

    while (
      session.history.length >
      this.maxSessionHistory
    ) {
      session.history.shift();
    }
  }

  calculateImportance(
    understanding
  ) {
    let score = 0.4;

    if (
      understanding.speechAct ===
      'CORRECTION'
    ) {
      score += 0.3;
    }

    if (
      understanding.speechAct ===
      'MEMORY_REQUEST'
    ) {
      score += 0.3;
    }

    if (
      understanding.intent ===
      'code'
    ) {
      score += 0.15;
    }

    if (
      understanding.intent ===
      'debug'
    ) {
      score += 0.2;
    }

    return Math.min(
      1,
      score
    );
  }

  getState(userId = 'default-user') {
    return {
      userModel:
        this.userModel.snapshot(
          userId
        ),

      sessions:
        Array.from(
          this.sessions.values()
        ).map(
          session => ({
            id:
              session.id,

            history:
              session.history,

            createdAt:
              session.createdAt,

            lastActivity:
              session.lastActivity
          })
        ),

      workingMemory:
        typeof this.workingMemory
          .snapshot ===
        'function'
          ? this.workingMemory
              .snapshot()
          : null,

      conceptMemory:
        typeof this.conceptMemory
          .snapshot ===
        'function'
          ? this.conceptMemory
              .snapshot()
          : null
    };
  }

  reset(userId = null) {
    if (
      userId === null
    ) {
      this.sessions.clear();
      this.userModel.clear();

      if (
        typeof this.workingMemory
          .clear ===
        'function'
      ) {
        this.workingMemory.clear();
      }

      if (
        typeof this.conceptMemory
          .clear ===
        'function'
      ) {
        this.conceptMemory.clear();
      }

      return;
    }

    this.userModel.clear(
      userId
    );

    const prefix =
      String(userId);

    for (
      const [
        id
      ] of this.sessions
    ) {
      if (
        id === prefix ||
        id.startsWith(
          `${prefix}:`
        )
      ) {
        this.sessions.delete(
          id
        );
      }
    }
  }
}

module.exports =
  CognitiveCore;
