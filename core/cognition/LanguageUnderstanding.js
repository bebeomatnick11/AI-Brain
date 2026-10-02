'use strict';

/**
 * Astra Language Understanding
 *
 * Không phải LLM.
 *
 * Nhiệm vụ:
 * - Chuẩn hóa input
 * - Nhận diện intent
 * - Nhận diện speech act
 * - Trích xuất keyword
 * - Phát hiện câu hỏi
 * - Phát hiện phủ định
 * - Phát hiện cảm xúc cơ bản
 * - Nhận diện mức độ quen thuộc với chủ đề
 *
 * Quan trọng:
 * Intent != Speech Act
 *
 * Ví dụ:
 * "Wow script này hay thật"
 *
 * intent:
 *   conversation
 *
 * speechAct:
 *   PRAISE
 *
 * Không được biến thành:
 *   "CREATE"
 */

class LanguageUnderstanding {
  constructor(options = {}) {
    this.maxKeywords =
      Number(options.maxKeywords || 20);

    this.maxTokens =
      Number(options.maxTokens || 200);
  }

  analyze(message, context = {}) {
    const original =
      String(message || '').trim();

    const text =
      original.toLowerCase();

    const tokens =
      this.tokenize(text);

    const keywords =
      this.extractKeywords(tokens);

    const intent =
      this.detectIntent(text);

    const speechAct =
      this.detectSpeechAct(
        text,
        intent
      );

    const question =
      this.detectQuestion(text);

    const negations =
      this.detectNegations(text);

    const sentiment =
      this.detectSentiment(text);

    const language =
      this.detectLanguage(text);

    const entities =
      this.extractEntities(original);

    const topic =
      this.detectTopic(
        text,
        keywords
      );

    const familiarity =
      this.detectFamiliarity(
        text,
        context
      );

    const urgency =
      this.detectUrgency(text);

    const modality =
      this.detectModality(text);

    return {
      original,

      normalized: text,

      tokens,

      keywords,

      intent,

      speechAct,

      question,

      negations,

      sentiment,

      language,

      entities,

      topic,

      familiarity,

      urgency,

      modality,

      timestamp: Date.now()
    };
  }

  tokenize(text) {
    return String(text || '')
      .toLowerCase()
      .match(/[\p{L}\p{N}_]+/gu)
      ?.slice(0, this.maxTokens) || [];
  }

  extractKeywords(tokens) {
    const stopWords =
      new Set([
        'là',
        'và',
        'của',
        'cho',
        'tôi',
        'mình',
        'bạn',
        'anh',
        'em',
        'the',
        'a',
        'an',
        'is',
        'are',
        'to',
        'of',
        'and',
        'or',
        'it',
        'this',
        'that'
      ]);

    const counts =
      new Map();

    for (const token of tokens) {
      if (
        token.length < 2 ||
        stopWords.has(token)
      ) {
        continue;
      }

      counts.set(
        token,
        (counts.get(token) || 0) + 1
      );
    }

    return Array.from(
      counts.entries()
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, this.maxKeywords)
      .map(([word, count]) => ({
        word,
        count
      }));
  }

  detectIntent(text) {
    const rules = [
      {
        type: 'code',
        words: [
          'code',
          'script',
          'javascript',
          'python',
          'lua',
          'node',
          'server.js',
          'html',
          'css',
          'roblox'
        ]
      },

      {
        type: 'debug',
        words: [
          'lỗi',
          'error',
          'bug',
          'debug',
          'fix',
          'sửa lỗi',
          'không chạy',
          'crash',
          'disconnect'
        ]
      },

      {
        type: 'research',
        words: [
          'tìm',
          'search',
          'research',
          'tra cứu',
          'look up',
          'kiểm tra'
        ]
      },

      {
        type: 'memory',
        words: [
          'nhớ',
          'remember',
          'quên',
          'memory',
          'đã nói',
          'lần trước'
        ]
      },

      {
        type: 'comparison',
        words: [
          'so sánh',
          'khác nhau',
          'vs',
          'versus',
          'hay hơn',
          'giống nhau'
        ]
      },

      {
        type: 'analysis',
        words: [
          'phân tích',
          'analyze',
          'giải thích',
          'explain',
          'tại sao',
          'vì sao'
        ]
      },

      {
        type: 'creation',
        words: [
          'tạo',
          'create',
          'build',
          'xây',
          'làm',
          'viết',
          'thiết kế',
          'generate'
        ]
      },

      {
        type: 'conversation',
        words: [
          'wow',
          'haha',
          'hay',
          'tuyệt',
          'ghê',
          'bro',
          'ê',
          'này'
        ]
      }
    ];

    for (const rule of rules) {
      if (
        rule.words.some(
          word => text.includes(word)
        )
      ) {
        return rule.type;
      }
    }

    return 'chat';
  }

  /**
   * Speech Act quan trọng hơn intent
   *
   * CREATE + PRAISE không được xử lý
   * giống CREATE + REQUEST.
   */
  detectSpeechAct(text, intent) {
    if (!text) {
      return 'EMPTY';
    }

    if (
      this.matches(text, [
        'wow',
        'tuyệt',
        'hay quá',
        'đỉnh',
        'nice',
        'great',
        'awesome',
        'thật tuyệt',
        'giỏi',
        'quá hay'
      ])
    ) {
      return 'PRAISE';
    }

    if (
      this.matches(text, [
        'cảm ơn',
        'thanks',
        'thank you',
        'thanks bro'
      ])
    ) {
      return 'THANKS';
    }

    if (
      this.matches(text, [
        'xin chào',
        'hello',
        'hi',
        'chào',
        'hey'
      ])
    ) {
      return 'GREETING';
    }

    if (
      this.matches(text, [
        'không phải',
        'sai rồi',
        'không đúng',
        'sửa lại',
        'ý tôi là',
        'ý anh là'
      ])
    ) {
      return 'CORRECTION';
    }

    if (
      this.matches(text, [
        'không',
        'no',
        'đừng',
        'không cần'
      ])
    ) {
      return 'DENIAL';
    }

    if (
      this.matches(text, [
        'đúng',
        'chính xác',
        'ok',
        'okay',
        'ừ',
        'được'
      ])
    ) {
      return 'CONFIRMATION';
    }

    if (
      this.matches(text, [
        'tại sao',
        'vì sao',
        'how',
        'why',
        'giải thích',
        'explain'
      ])
    ) {
      return 'EXPLANATION_REQUEST';
    }

    if (
      this.matches(text, [
        'có thể',
        'liệu',
        'phải không',
        'đúng không',
        'không?'
      ]) ||
      text.includes('?')
    ) {
      return 'QUESTION';
    }

    if (
      this.matches(text, [
        'tôi nghĩ',
        'mình nghĩ',
        'theo tôi',
        'tôi thấy',
        'mình thấy'
      ])
    ) {
      return 'OPINION';
    }

    if (
      this.matches(text, [
        'hãy',
        'làm',
        'tạo',
        'viết',
        'build',
        'create',
        'implement',
        'sửa'
      ])
    ) {
      return 'REQUEST';
    }

    if (
      this.matches(text, [
        'haha',
        'lol',
        '😂',
        '🤣',
        'bro',
        'ghê'
      ])
    ) {
      return 'REACTION';
    }

    if (intent === 'memory') {
      return 'MEMORY_REQUEST';
    }

    return 'OBSERVATION';
  }

  detectQuestion(text) {
    return (
      text.includes('?') ||
      this.matches(text, [
        'tại sao',
        'vì sao',
        'làm sao',
        'thế nào',
        'bao nhiêu',
        'ở đâu',
        'khi nào',
        'có phải',
        'what',
        'why',
        'how',
        'where',
        'when'
      ])
    );
  }

  detectNegations(text) {
    const words = [
      'không',
      'chưa',
      'đừng',
      'không phải',
      'never',
      'not',
      'no',
      'without'
    ];

    return words.filter(
      word => text.includes(word)
    );
  }

  detectSentiment(text) {
    const positive = [
      'hay',
      'tuyệt',
      'đỉnh',
      'thích',
      'vui',
      'awesome',
      'great',
      'nice',
      'love',
      'wow'
    ];

    const negative = [
      'ghét',
      'tệ',
      'dở',
      'lỗi',
      'bug',
      'chán',
      'khó chịu',
      'sai',
      'bad',
      'terrible'
    ];

    const p =
      positive.filter(
        x => text.includes(x)
      ).length;

    const n =
      negative.filter(
        x => text.includes(x)
      ).length;

    if (p > n) {
      return {
        label: 'positive',
        score: Math.min(1, p / 3)
      };
    }

    if (n > p) {
      return {
        label: 'negative',
        score: -Math.min(1, n / 3)
      };
    }

    return {
      label: 'neutral',
      score: 0
    };
  }

  detectLanguage(text) {
    const vietnamese =
      /[ăâđêôơưáàảãạấầẩẫậếềểễệốồổỗộớờởỡợứừửữự]/i
        .test(text);

    const english =
      /\b(the|this|that|you|what|why|how|create|code|script)\b/i
        .test(text);

    if (vietnamese && english) {
      return 'vi-en';
    }

    if (vietnamese) {
      return 'vi';
    }

    if (english) {
      return 'en';
    }

    return 'unknown';
  }

  extractEntities(original) {
    const entities = [];

    const urls =
      original.match(
        /https?:\/\/[^\s]+/gi
      ) || [];

    for (const url of urls) {
      entities.push({
        type: 'url',
        value: url
      });
    }

    const quoted =
      original.match(
        /["“](.+?)["”]/g
      ) || [];

    for (const item of quoted) {
      entities.push({
        type: 'quoted',
        value: item.slice(1, -1)
      });
    }

    return entities;
  }

  detectTopic(text, keywords) {
    const topicRules = [
      ['roblox', 'Roblox'],
      ['astra', 'Astra'],
      ['ai', 'AI'],
      ['javascript', 'JavaScript'],
      ['node', 'Node.js'],
      ['server', 'Backend'],
      ['script', 'Programming'],
      ['code', 'Programming'],
      ['html', 'Web'],
      ['physics', 'Physics'],
      ['vũ trụ', 'Space'],
      ['hành tinh', 'Space'],
      ['game', 'Game']
    ];

    for (const [key, value] of topicRules) {
      if (text.includes(key)) {
        return value;
      }
    }

    return (
      keywords[0]?.word ||
      'general'
    );
  }

  detectFamiliarity(text, context) {
    const level =
      context.userModel?.familiarity ||
      context.userModel?.technicalLevel;

    if (level) {
      return level;
    }

    const advancedTerms = [
      'architecture',
      'api',
      'agentloop',
      'planner',
      'router',
      'registry',
      'runtime',
      'backend',
      'repository',
      'database',
      'capability',
      'cognitive',
      'sandbox'
    ];

    const score =
      advancedTerms.filter(
        term => text.includes(term)
      ).length;

    if (score >= 3) {
      return 'advanced';
    }

    if (score >= 1) {
      return 'intermediate';
    }

    return 'unknown';
  }

  detectUrgency(text) {
    if (
      this.matches(text, [
        'khẩn cấp',
        'urgent',
        'gấp',
        'ngay',
        'asap'
      ])
    ) {
      return 1;
    }

    return 0.3;
  }

  detectModality(text) {
    if (
      this.matches(text, [
        'muốn',
        'cần',
        'hãy',
        'please',
        'can you',
        'có thể'
      ])
    ) {
      return 'request';
    }

    if (
      this.matches(text, [
        'có lẽ',
        'chắc',
        'có thể là',
        'maybe',
        'probably'
      ])
    ) {
      return 'uncertain';
    }

    return 'assertive';
  }

  matches(text, words) {
    return words.some(
      word => text.includes(word)
    );
  }
}

module.exports =
  LanguageUnderstanding;
