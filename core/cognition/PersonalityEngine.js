'use strict';

/**
 * PersonalityEngine
 *
 * Personality = cách nói.
 * Cognitive reasoning = nội dung.
 *
 * Không để personality quyết định sự thật.
 */

class PersonalityEngine {
  constructor(options = {}) {
    this.base = {
      warmth:
        this.number(
          options.warmth,
          0.7
        ),

      curiosity:
        this.number(
          options.curiosity,
          0.7
        ),

      patience:
        this.number(
          options.patience,
          0.85
        ),

      humor:
        this.number(
          options.humor,
          0.25
        ),

      directness:
        this.number(
          options.directness,
          0.75
        ),

      enthusiasm:
        this.number(
          options.enthusiasm,
          0.65
        )
    };
  }

  build(userModel, understanding, context = {}) {
    const preferences =
      userModel?.preferences || {};

    const tone = {
      warmth:
        this.combine(
          this.base.warmth,
          preferences.warmth
        ),

      directness:
        this.combine(
          this.base.directness,
          preferences.directness
        ),

      humor:
        this.combine(
          this.base.humor,
          preferences.humor
        ),

      enthusiasm:
        this.base.enthusiasm,

      patience:
        this.base.patience,

      curiosity:
        this.base.curiosity
    };

    const speechAct =
      understanding.speechAct;

    if (
      speechAct === 'PRAISE'
    ) {
      tone.warmth =
        this.clamp(
          tone.warmth + 0.1,
          0,
          1
        );

      tone.enthusiasm =
        this.clamp(
          tone.enthusiasm + 0.1,
          0,
          1
        );
    }

    if (
      speechAct === 'CORRECTION'
    ) {
      tone.directness =
        this.clamp(
          tone.directness + 0.1,
          0,
          1
        );

      tone.humor =
        this.clamp(
          tone.humor - 0.1,
          0,
          1
        );
    }

    return {
      tone,

      style:
        this.selectStyle(
          tone,
          userModel,
          understanding
        ),

      explanation:
        this.selectExplanationStyle(
          userModel,
          understanding
        ),

      language:
        userModel?.language ||
        understanding.language ||
        'vi'
    };
  }

  selectStyle(
    tone,
    userModel,
    understanding
  ) {
    if (
      understanding.speechAct ===
      'PRAISE'
    ) {
      return 'warm-casual';
    }

    if (
      understanding.speechAct ===
      'CORRECTION'
    ) {
      return 'clear-corrective';
    }

    if (
      tone.directness >= 0.75
    ) {
      return 'direct-friendly';
    }

    if (
      tone.warmth >= 0.75
    ) {
      return 'warm-explanatory';
    }

    return 'balanced';
  }

  selectExplanationStyle(
    userModel,
    understanding
  ) {
    const depth =
      userModel?.preferences
        ?.explanationDepth
        ?.value ?? 0.5;

    const technical =
      userModel?.preferences
        ?.technicality
        ?.value ?? 0.5;

    const familiarity =
      userModel?.familiarity
        ?.technical ?? 0;

    if (
      userModel?.isNew
    ) {
      return {
        depth: 'beginner',
        technicality: 'low',
        examples: true,
        defineTerms: true
      };
    }

    if (
      depth >= 0.72 ||
      technical >= 0.7
    ) {
      return {
        depth: 'detailed',
        technicality: 'high',
        examples: false,
        defineTerms:
          familiarity < 0.4
      };
    }

    if (
      depth <= 0.3
    ) {
      return {
        depth: 'concise',
        technicality:
          familiarity >= 0.5
            ? 'high'
            : 'medium',
        examples: false,
        defineTerms: false
      };
    }

    return {
      depth: 'balanced',
      technicality:
        familiarity >= 0.5
          ? 'medium-high'
          : 'medium',
      examples: familiarity < 0.4,
      defineTerms: familiarity < 0.4
    };
  }

  number(value, fallback) {
    const n =
      Number(value);

    return Number.isFinite(n)
      ? this.clamp(n, 0, 1)
      : fallback;
  }

  combine(base, preference) {
    if (
      !preference ||
      typeof preference.value !==
        'number'
    ) {
      return base;
    }

    const confidence =
      Number(
        preference.confidence || 0
      );

    return this.clamp(
      base * (1 - confidence) +
      preference.value * confidence,
      0,
      1
    );
  }

  clamp(value, min, max) {
    return Math.max(
      min,
      Math.min(max, value)
    );
  }
}

module.exports =
  PersonalityEngine;
