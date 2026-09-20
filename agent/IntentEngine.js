'use strict';

class IntentEngine {

  async detect(
    message,
    context = {}
  ) {

    const text =
      String(message || '')
        .trim()
        .toLowerCase();


    if (!text) {

      return {
        type: 'empty',
        confidence: 1
      };
    }


    const rules = [

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
        type: 'code',
        words: [
          'code',
          'script',
          'lua',
          'javascript',
          'python',
          'viết code',
          'sửa code'
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
          'sửa lỗi'
        ]
      },

      {
        type: 'build',
        words: [
          'build',
          'tạo',
          'xây',
          'implement',
          'làm cho tôi'
        ]
      },

      {
        type: 'memory',
        words: [
          'nhớ',
          'remember',
          'quên',
          'memory',
          'đã nói'
        ]
      },

      {
        type: 'analyze',
        words: [
          'phân tích',
          'analyze',
          'giải thích',
          'explain'
        ]
      }
    ];


    for (
      const rule
      of rules
    ) {

      if (
        rule.words.some(
          word =>
            text.includes(word)
        )
      ) {

        return {
          type:
            rule.type,

          confidence:
            0.82,

          matched:
            rule.words.filter(
              word =>
                text.includes(word)
            )
        };
      }
    }


    return {
      type: 'chat',
      confidence: 0.55
    };
  }
}


module.exports =
  IntentEngine;
