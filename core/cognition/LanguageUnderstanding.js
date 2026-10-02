'use strict';

/**
 * LanguageUnderstanding
 *
 * Bộ phân tích ngôn ngữ nội bộ ban đầu của Astra.
 *
 * Không sử dụng:
 * - API AI
 * - model bên ngoài
 * - API key
 *
 * Nhiệm vụ:
 * - chuẩn hóa câu
 * - phát hiện intent
 * - tách token
 * - phát hiện câu hỏi
 * - phát hiện phủ định
 * - phát hiện thực thể cơ bản
 * - trích xuất từ khóa
 * - xác định cấu trúc yêu cầu
 */

class LanguageUnderstanding {
  constructor(options = {}) {
    this.minKeywordLength =
      Number(options.minKeywordLength || 2);

    this.stopWords = new Set(
      options.stopWords || [
        'là',
        'và',
        'của',
        'cho',
        'một',
        'những',
        'các',
        'tôi',
        'mình',
        'bạn',
        'anh',
        'em',
        'để',
        'thì',
        'với',
        'trong',
        'này',
        'đó',
        'có',
        'được',
        'không',
        'rằng',
        'the',
        'a',
        'an',
        'is',
        'are',
        'to',
        'of',
        'and',
        'in'
      ]
    );

    this.intentRules = [
      {
        type: 'code',
        words: [
          'code',
          'script',
          'javascript',
          'python',
          'lua',
          'program',
          'lập trình',
          'viết code',
          'sửa code'
        ]
      },
      {
        type: 'debug',
        words: [
          'bug',
          'debug',
          'error',
          'lỗi',
          'sửa lỗi',
          'fix',
          'khắc phục'
        ]
      },
      {
        type: 'research',
        words: [
          'tìm',
          'search',
          'research',
          'tra cứu',
          'kiểm tra',
          'look up'
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
          'ghi nhớ'
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
          'thiết kế'
        ]
      },
      {
        type: 'comparison',
        words: [
          'so sánh',
          'compare',
          'khác nhau',
          'giống nhau',
          'vs',
          'versus'
        ]
      },
      {
        type: 'decision',
        words: [
          'nên',
          'chọn',
          'should',
          'recommend',
          'phù hợp'
        ]
      }
    ];
  }

  analyze(input, context = {}) {
    const raw =
      String(input || '').trim();

    const normalized =
      this.normalize(raw);

    const tokens =
      this.tokenize(normalized);

    const keywords =
      this.extractKeywords(tokens);

    const intent =
      this.detectIntent(normalized);

    const question =
      this.detectQuestion(raw);

    const negations =
      this.detectNegations(normalized);

    const entities =
      this.extractEntities(raw);

    const sentiment =
      this.detectSentiment(normalized);

    return {
      raw,
      normalized,
      tokens,
      keywords,
      intent,
      question,
      negations,
      entities,
      sentiment,
      language:
        this.detectLanguage(normalized),
      context
    };
  }

  normalize(text) {
    return String(text || '')
      .normalize('NFC')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  tokenize(text) {
    return String(text || '')
      .split(/[\s,.!?;:()[\]{}"'`]+/)
      .map(x => x.trim())
      .filter(Boolean);
  }

  extractKeywords(tokens) {
    const result = [];

    for (const token of tokens) {
      if (
        token.length <
        this.minKeywordLength
      ) {
        continue;
      }

      if (
        this.stopWords.has(token)
      ) {
        continue;
      }

      if (!result.includes(token)) {
        result.push(token);
      }
    }

    return result.slice(0, 32);
  }

  detectIntent(text) {
    let best = {
      type: 'chat',
      score: 0,
      matched: []
    };

    for (const rule of this.intentRules) {
      const matched =
        rule.words.filter(word =>
          text.includes(word)
        );

      if (
        matched.length >
        best.matched.length
      ) {
        best = {
          type: rule.type,
          score:
            Math.min(
              1,
              0.45 +
              matched.length * 0.12
            ),
          matched
        };
      }
    }

    return best;
  }

  detectQuestion(text) {
    const value =
      String(text || '');

    const questionWords = [
      'ai',
      'gì',
      'sao',
      'tại sao',
      'vì sao',
      'như nào',
      'thế nào',
      'bao nhiêu',
      'khi nào',
      'ở đâu',
      'who',
      'what',
      'why',
      'how',
      'when',
      'where'
    ];

    const matched =
      questionWords.filter(word =>
        value.toLowerCase().includes(word)
      );

    return {
      isQuestion:
        value.includes('?') ||
        matched.length > 0,
      matched
    };
  }

  detectNegations(text) {
    const words = [
      'không',
      'chưa',
      'đừng',
      'không phải',
      'never',
      'not',
      'no'
    ];

    return words.filter(word =>
      text.includes(word)
    );
  }

  extractEntities(text) {
    const entities = [];

    const quoted =
      String(text || '').match(
        /["“](.+?)["”]/g
      );

    if (quoted) {
      for (const item of quoted) {
        entities.push({
          type: 'quoted',
          value:
            item.slice(1, -1)
        });
      }
    }

    const urls =
      String(text || '').match(
        /https?:\/\/\S+/gi
      );

    if (urls) {
      for (const url of urls) {
        entities.push({
          type: 'url',
          value: url
        });
      }
    }

    return entities;
  }

  detectSentiment(text) {
    const positive = [
      'tốt',
      'hay',
      'thích',
      'tuyệt',
      'vui',
      'great',
      'good',
      'love'
    ];

    const negative = [
      'tệ',
      'ghét',
      'buồn',
      'lỗi',
      'xấu',
      'bad',
      'hate',
      'broken'
    ];

    let score = 0;

    for (const word of positive) {
      if (text.includes(word)) {
        score++;
      }
    }

    for (const word of negative) {
      if (text.includes(word)) {
        score--;
      }
    }

    return {
      score,
      label:
        score > 0
          ? 'positive'
          : score < 0
            ? 'negative'
            : 'neutral'
    };
  }

  detectLanguage(text) {
    if (!text) {
      return 'unknown';
    }

    const vietnamese =
      /[ăâđêôơưáàảãạấầẩẫậắằẳẵặ]/i;

    if (vietnamese.test(text)) {
      return 'vi';
    }

    if (/^[\x00-\x7F]+$/.test(text)) {
      return 'en';
    }

    return 'unknown';
  }
}

module.exports =
  LanguageUnderstanding;
