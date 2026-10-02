'use strict';

/**
 * UserModel
 *
 * Astra không ghi:
 *
 *   "user = impatient"
 *
 * mà ghi:
 *
 *   directness = 0.82
 *   confidence = 0.71
 *   evidence = [...]
 *
 * Các đặc điểm có thể thay đổi theo hội thoại.
 */

class UserModel {
  constructor(options = {}) {
    this.maxEvidence =
      Number(options.maxEvidence || 30);

    this.users = new Map();
  }

  getUserId(context = {}) {
    return String(
      context.userId ||
      context.brainId ||
      'default-user'
    );
  }

  get(userId = 'default-user') {
    const id =
      String(userId);

    if (!this.users.has(id)) {
      this.users.set(
        id,
        this.createDefault(id)
      );
    }

    return this.users.get(id);
  }

  createDefault(id) {
    return {
      userId: id,

      interactions: 0,

      firstSeen:
        Date.now(),

      lastSeen:
        Date.now(),

      isNew: true,

      familiarity: {
        general: 0,
        technical: 0,
        coding: 0,
        architecture: 0,
        robotics: 0,
        gameDevelopment: 0
      },

      preferences: {
        explanationDepth: {
          value: 0.5,
          confidence: 0
        },

        directness: {
          value: 0.5,
          confidence: 0
        },

        technicality: {
          value: 0.5,
          confidence: 0
        },

        humor: {
          value: 0.25,
          confidence: 0
        },

        warmth: {
          value: 0.65,
          confidence: 0
        },

        codeCompleteness: {
          value: 0.5,
          confidence: 0
        }
      },

      language: 'vi',

      topics: {},

      recentSpeechActs: [],

      recentIntents: [],

      evidence: []
    };
  }

  observe(userId, observation = {}) {
    const model =
      this.get(userId);

    model.interactions += 1;
    model.lastSeen =
      Date.now();

    model.isNew =
      model.interactions <= 3;

    if (observation.language) {
      model.language =
        observation.language;
    }

    if (observation.topic) {
      this.observeTopic(
        model,
        observation.topic
      );
    }

    if (observation.speechAct) {
      this.pushBounded(
        model.recentSpeechActs,
        observation.speechAct,
        20
      );
    }

    if (observation.intent) {
      this.pushBounded(
        model.recentIntents,
        observation.intent,
        20
      );
    }

    this.learnPreferences(
      model,
      observation
    );

    this.learnFamiliarity(
      model,
      observation
    );

    return model;
  }

  learnPreferences(model, observation) {
    const text =
      String(
        observation.text || ''
      ).toLowerCase();

    const explicit =
      observation.explicitPreferences ||
      {};

    if (
      explicit.detailed === true ||
      this.hasAny(text, [
        'giải thích kỹ',
        'giải thích chi tiết',
        'nói rõ',
        'chi tiết hơn',
        'full'
      ])
    ) {
      this.adjust(
        model.preferences.explanationDepth,
        0.15,
        0.9,
        'requested_detailed'
      );
    }

    if (
      explicit.concise === true ||
      this.hasAny(text, [
        'ngắn gọn',
        'nói ngắn',
        'chỉ cần',
        'brief'
      ])
    ) {
      this.adjust(
        model.preferences.explanationDepth,
        -0.15,
        0.9,
        'requested_concise'
      );
    }

    if (
      this.hasAny(text, [
        'full code',
        'toàn bộ code',
        'trọn bộ code',
        'full script',
        'viết full'
      ])
    ) {
      this.adjust(
        model.preferences.codeCompleteness,
        0.2,
        0.95,
        'requested_full_code'
      );
    }

    if (
      this.hasAny(text, [
        'đừng giải thích dài',
        'khỏi giải thích',
        'chỉ code'
      ])
    ) {
      this.adjust(
        model.preferences.explanationDepth,
        -0.2,
        0.9,
        'requested_less_explanation'
      );
    }

    if (
      this.hasAny(text, [
        'bro',
        'haha',
        '😂',
        '🤣'
      ])
    ) {
      this.adjust(
        model.preferences.humor,
        0.08,
        0.55,
        'casual_language'
      );
    }

    if (
      this.hasAny(text, [
        'đừng gọi',
        'không gọi',
        'gọi tôi'
      ])
    ) {
      // Không tự suy diễn danh xưng.
      // Chỉ giữ preference khi có hệ thống
      // truyền explicitPreferences.
    }

    if (
      observation.speechAct === 'PRAISE'
    ) {
      this.adjust(
        model.preferences.warmth,
        0.03,
        0.4,
        'positive_interaction'
      );
    }

    if (
      observation.speechAct === 'CORRECTION'
    ) {
      this.adjust(
        model.preferences.directness,
        0.03,
        0.4,
        'correction_interaction'
      );
    }
  }

  learnFamiliarity(model, observation) {
    const intent =
      observation.intent;

    const familiarity =
      model.familiarity;

    familiarity.general =
      this.grow(
        familiarity.general,
        0.01
      );

    if (
      intent === 'code' ||
      intent === 'debug' ||
      intent === 'creation'
    ) {
      familiarity.coding =
        this.grow(
          familiarity.coding,
          0.08
        );

      familiarity.technical =
        this.grow(
          familiarity.technical,
          0.05
        );
    }

    if (
      observation.topic ===
      'Programming'
    ) {
      familiarity.technical =
        this.grow(
          familiarity.technical,
          0.06
        );
    }

    if (
      observation.topic ===
      'Backend'
    ) {
      familiarity.architecture =
        this.grow(
          familiarity.architecture,
          0.08
        );
    }
  }

  observeTopic(model, topic) {
    const key =
      String(topic);

    if (!model.topics[key]) {
      model.topics[key] = {
        count: 0,
        firstSeen: Date.now(),
        lastSeen: Date.now()
      };
    }

    model.topics[key].count += 1;
    model.topics[key].lastSeen =
      Date.now();
  }

  adjust(
    preference,
    delta,
    confidenceGain,
    reason
  ) {
    preference.value =
      this.clamp(
        preference.value + delta,
        0,
        1
      );

    preference.confidence =
      this.clamp(
        preference.confidence +
        confidenceGain * 0.15,
        0,
        1
      );

    if (!preference.evidence) {
      preference.evidence = [];
    }

    this.pushBounded(
      preference.evidence,
      {
        reason,
        timestamp: Date.now()
      },
      this.maxEvidence
    );
  }

  getAdaptation(userId) {
    const model =
      this.get(userId);

    const technical =
      model.familiarity.technical;

    let level =
      'new';

    if (
      technical >= 0.65 ||
      model.interactions >= 20
    ) {
      level = 'advanced';
    } else if (
      technical >= 0.25 ||
      model.interactions >= 5
    ) {
      level = 'intermediate';
    }

    return {
      level,

      isNew:
        model.isNew,

      language:
        model.language,

      familiarity:
        model.familiarity,

      preferences:
        model.preferences,

      topics:
        model.topics
    };
  }

  snapshot(userId) {
    return JSON.parse(
      JSON.stringify(
        this.get(userId)
      )
    );
  }

  restore(snapshot) {
    if (
      !snapshot ||
      !snapshot.userId
    ) {
      return false;
    }

    this.users.set(
      String(snapshot.userId),
      snapshot
    );

    return true;
  }

  clear(userId = null) {
    if (userId === null) {
      this.users.clear();
      return;
    }

    this.users.delete(
      String(userId)
    );
  }

  hasAny(text, values) {
    return values.some(
      value =>
        text.includes(
          String(value).toLowerCase()
        )
    );
  }

  grow(value, amount) {
    return this.clamp(
      value + amount,
      0,
      1
    );
  }

  pushBounded(array, value, limit) {
    array.push(value);

    while (
      array.length > limit
    ) {
      array.shift();
    }
  }

  clamp(value, min, max) {
    return Math.max(
      min,
      Math.min(max, value)
    );
  }
}

module.exports =
  UserModel;
