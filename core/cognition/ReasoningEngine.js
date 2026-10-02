'use strict';

class ReasoningEngine {
  constructor(options = {}) {
    this.maxHypotheses =
      Number(
        options.maxHypotheses || 8
      );

    this.rules = [];
    this.registerDefaultRules();
  }

  registerRule(rule) {
    if (
      !rule ||
      typeof rule.when !== 'function' ||
      typeof rule.then !== 'function'
    ) {
      throw new Error(
        'Invalid reasoning rule'
      );
    }

    this.rules.push(rule);

    return rule;
  }

  registerDefaultRules() {
    this.registerRule({
      name: 'question-detection',
      when: state =>
        state.question?.isQuestion === true,

      then: state => ({
        type: 'needs_answer',
        confidence: 0.9,
        reason:
          'Input contains a question'
      })
    });

    this.registerRule({
      name: 'code-intent',
      when: state =>
        state.intent?.type === 'code',

      then: state => ({
        type: 'requires_code_capability',
        confidence:
          state.intent.score || 0.7,
        reason:
          'Detected programming intent'
      })
    });

    this.registerRule({
      name: 'debug-intent',
      when: state =>
        state.intent?.type === 'debug',

      then: state => ({
        type: 'requires_diagnosis',
        confidence:
          state.intent.score || 0.7,
        reason:
          'Detected debugging intent'
      })
    });

    this.registerRule({
      name: 'research-intent',
      when: state =>
        state.intent?.type === 'research',

      then: state => ({
        type: 'requires_information',
        confidence:
          state.intent.score || 0.7,
        reason:
          'Detected research intent'
      })
    });

    this.registerRule({
      name: 'memory-intent',
      when: state =>
        state.intent?.type === 'memory',

      then: state => ({
        type: 'requires_memory_operation',
        confidence:
          state.intent.score || 0.7,
        reason:
          'Detected memory intent'
      })
    });

    this.registerRule({
      name: 'comparison-intent',
      when: state =>
        state.intent?.type === 'comparison',

      then: state => ({
        type: 'requires_comparison',
        confidence:
          state.intent.score || 0.7,
        reason:
          'Detected comparison intent'
      })
    });

    this.registerRule({
      name: 'known-context',
      when: state =>
        Array.isArray(state.memories) &&
        state.memories.length > 0,

      then: state => ({
        type: 'context_available',
        confidence: 0.65,
        reason:
          'Relevant memory was retrieved'
      })
    });
  }

  infer(state = {}) {
    const facts = [];
    const hypotheses = [];

    for (const rule of this.rules) {
      let matched = false;

      try {
        matched =
          rule.when(state) === true;
      } catch {
        matched = false;
      }

      if (!matched) {
        continue;
      }

      facts.push({
        rule:
          rule.name || 'anonymous',
        type: 'rule_match'
      });

      try {
        const result =
          rule.then(state);

        if (result) {
          hypotheses.push({
            ...result,
            rule:
              rule.name || 'anonymous'
          });
        }
      } catch {
        // Broken rules must not
        // break the whole cognitive cycle.
      }
    }

    const conclusion =
      this.selectConclusion(
        hypotheses
      );

    return {
      facts,
      hypotheses:
        hypotheses.slice(
          0,
          this.maxHypotheses
        ),
      conclusion
    };
  }

  selectConclusion(hypotheses) {
    if (!hypotheses.length) {
      return {
        type: 'general_response',
        confidence: 0.3,
        reason:
          'No specialized rule matched'
      };
    }

    return [...hypotheses]
      .sort(
        (a, b) =>
          Number(b.confidence || 0) -
          Number(a.confidence || 0)
      )[0];
  }

  explain(inference) {
    return {
      conclusion:
        inference?.conclusion || null,

      supportingRules:
        (inference?.facts || [])
          .map(x => x.rule),

      hypotheses:
        inference?.hypotheses || []
    };
  }
}

module.exports =
  ReasoningEngine;
