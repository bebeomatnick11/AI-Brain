'use strict';

/**
 * DialogueEngine
 *
 * Không tạo câu trả lời.
 *
 * Nó quyết định:
 * - trả lời
 * - hỏi lại
 * - giải thích
 * - thực thi
 * - xác nhận
 * - phản hồi cảm xúc
 * - sửa hiểu nhầm
 * - hướng dẫn
 */

class DialogueEngine {
  decide(input = {}) {
    const understanding =
      input.understanding || {};

    const userModel =
      input.userModel || {};

    const reasoning =
      input.reasoning || {};

    const speechAct =
      understanding.speechAct;

    const intent =
      understanding.intent;

    const adaptation =
      input.adaptation || {};

    const decision = {
      purpose: 'respond',

      mode: 'answer',

      speechAct,

      intent,

      needsAction: false,

      needsClarification: false,

      shouldUseMemory: true,

      shouldMentionContext: false,

      shouldExplain: false,

      shouldAcknowledge: false,

      depth:
        adaptation?.explanation
          ?.depth || 'balanced',

      confidence:
        input.confidence ??
        0.5,

      reason: []
    };

    if (!understanding.original) {
      decision.mode = 'clarify';
      decision.needsClarification = true;
      decision.reason.push(
        'empty_input'
      );

      return decision;
    }

    switch (speechAct) {
      case 'PRAISE':
        decision.mode = 'acknowledge';
        decision.shouldAcknowledge = true;
        decision.shouldUseMemory = false;
        decision.reason.push(
          'user_is_praising_or_reacting'
        );
        return decision;

      case 'THANKS':
        decision.mode = 'acknowledge';
        decision.shouldAcknowledge = true;
        decision.shouldUseMemory = false;
        return decision;

      case 'GREETING':
        decision.mode = 'greet';
        decision.shouldUseMemory = true;
        return decision;

      case 'CORRECTION':
        decision.mode = 'correct';
        decision.shouldAcknowledge = true;
        decision.shouldUseMemory = true;
        decision.reason.push(
          'user_corrected_astra'
        );
        return decision;

      case 'CONFIRMATION':
        decision.mode = 'continue';
        decision.shouldUseMemory = true;
        return decision;

      case 'DENIAL':
        decision.mode = 'adjust';
        decision.shouldUseMemory = true;
        return decision;

      case 'EXPLANATION_REQUEST':
        decision.mode = 'explain';
        decision.shouldExplain = true;
        decision.shouldUseMemory = true;
        return decision;

      case 'QUESTION':
        decision.mode = 'answer';
        decision.shouldExplain = true;
        decision.shouldUseMemory = true;
        return decision;

      case 'REQUEST':
        decision.mode = 'execute';
        decision.needsAction = true;
        decision.shouldUseMemory = true;
        decision.shouldMentionContext =
          !userModel?.isNew;
        return decision;

      case 'MEMORY_REQUEST':
        decision.mode = 'memory';
        decision.shouldUseMemory = true;
        return decision;

      case 'OPINION':
      case 'OBSERVATION':
      case 'REACTION':
        decision.mode = 'conversation';
        decision.shouldUseMemory = true;
        return decision;
    }

    if (
      intent === 'code' ||
      intent === 'creation'
    ) {
      decision.mode = 'execute';
      decision.needsAction = true;
      return decision;
    }

    if (
      intent === 'debug'
    ) {
      decision.mode = 'diagnose';
      decision.shouldExplain = true;
      return decision;
    }

    if (
      intent === 'analysis' ||
      intent === 'research'
    ) {
      decision.mode = 'explain';
      decision.shouldExplain = true;
      return decision;
    }

    if (
      reasoning?.conclusion
    ) {
      decision.mode = 'answer';
      decision.shouldExplain = true;
    }

    return decision;
  }
}

module.exports =
  DialogueEngine;
