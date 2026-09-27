'use strict';

/**
 * ============================================================
 * ASTRA BRAIN
 * INTENT ENGINE
 * ============================================================
 *
 * Responsibilities:
 *
 *  - Detect user intent
 *  - Match natural-language triggers
 *  - Return normalized route type
 *  - Return confidence
 *  - Return matched keywords
 *
 * Supported intents:
 *
 *  - research
 *  - code
 *  - debug
 *  - image_generation
 *  - video_generation
 *  - spatial_analysis
 *  - build
 *  - memory
 *  - analyze
 *  - chat
 *
 * ============================================================
 */

class IntentEngine {

  constructor(options = {}) {

    this.options =
      options || {};

    this.rules =
      this.createRules();
  }


  // ============================================================
  // RULES
  // ============================================================

  createRules() {

    return [

      // ========================================================
      // IMAGE GENERATION
      // ========================================================

      {
        type:
          'image_generation',

        priority:
          100,

        words: [

          'tạo ảnh',
          'tạo hình ảnh',
          'generate image',
          'generate an image',
          'vẽ ảnh',
          'vẽ hình',
          'tạo tranh',
          'image generation',
          'ảnh ai',
          'tạo artwork',
          'generate picture',
          'make an image',
          'make image',
          'create image',
          'create an image',
          'ai image'
        ]
      },


      // ========================================================
      // VIDEO GENERATION
      // ========================================================

      {
        type:
          'video_generation',

        priority:
          100,

        words: [

          'tạo video',
          'generate video',
          'generate a video',
          'làm video',
          'tạo clip',
          'tạo đoạn phim',
          'video generation',
          'ai video',
          'make a video',
          'make video',
          'create video',
          'create a video'
        ]
      },


      // ========================================================
      // SPATIAL ANALYSIS
      // ========================================================

      {
        type:
          'spatial_analysis',

        priority:
          95,

        words: [

          'phân tích không gian',
          'phân tích 3d',
          'phân tích cảnh',
          'không gian',
          'spatial',
          '3d',
          'hướng sáng',
          'ánh sáng',
          'bóng đổ',
          'shadow',
          'camera',
          'vị trí vật thể',
          'hình học'
        ]
      },


      // ========================================================
      // RESEARCH
      // ========================================================

      {
        type:
          'research',

        priority:
          80,

        words: [

          'tìm kiếm',
          'tìm hiểu',
          'tìm',
          'search',
          'research',
          'tra cứu',
          'kiểm tra',
          'look up'
        ]
      },


      // ========================================================
      // CODE
      // ========================================================

      {
        type:
          'code',

        priority:
          85,

        words: [

          'code',
          'script',
          'lua',
          'javascript',
          'python',
          'viết code',
          'viết script',
          'lập trình',
          'sửa code'
        ]
      },


      // ========================================================
      // DEBUG
      // ========================================================

      {
        type:
          'debug',

        priority:
          90,

        words: [

          'lỗi',
          'error',
          'bug',
          'debug',
          'fix',
          'sửa lỗi',
          'khắc phục lỗi',
          'sửa bug'
        ]
      },


      // ========================================================
      // BUILD
      // ========================================================

      {
        type:
          'build',

        priority:
          60,

        words: [

          'build',
          'xây',
          'implement',
          'làm cho tôi',
          'tạo hệ thống',
          'xây dựng'
        ]
      },


      // ========================================================
      // MEMORY
      // ========================================================

      {
        type:
          'memory',

        priority:
          70,

        words: [

          'nhớ',
          'remember',
          'quên',
          'memory',
          'đã nói',
          'ghi nhớ',
          'lưu lại'
        ]
      },


      // ========================================================
      // ANALYZE
      // ========================================================

      {
        type:
          'analyze',

        priority:
          65,

        words: [

          'phân tích',
          'analyze',
          'giải thích',
          'explain',
          'phân tích giúp',
          'giải thích cho tôi'
        ]
      }
    ];
  }


  // ============================================================
  // NORMALIZE
  // ============================================================

  normalizeText(
    message
  ) {

    return String(
      message || ''
    )
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        ''
      );
  }


  // ============================================================
  // DETECT
  // ============================================================

  async detect(
    message,
    context = {}
  ) {

    const originalText =
      String(
        message || ''
      ).trim();


    if (!originalText) {

      return {

        type:
          'empty',

        confidence:
          1,

        matched:
          [],

        message:
          ''
      };
    }


    const text =
      this.normalizeText(
        originalText
      );


    const candidates = [];


    // ==========================================================
    // MATCH RULES
    // ==========================================================

    for (
      const rule
      of this.rules
    ) {

      const matched =
        rule.words.filter(
          word => {

            const normalizedWord =
              this.normalizeText(
                word
              );

            return text.includes(
              normalizedWord
            );
          }
        );


      if (
        matched.length > 0
      ) {

        candidates.push({

          type:
            rule.type,

          priority:
            rule.priority || 0,

          matched,

          matchCount:
            matched.length
        });
      }
    }


    // ==========================================================
    // NO MATCH
    // ==========================================================

    if (
      candidates.length === 0
    ) {

      return {

        type:
          'chat',

        confidence:
          0.55,

        matched:
          [],

        message:
          originalText
      };
    }


    // ==========================================================
    // SORT
    // ============================================================
    //
    // Priority first.
    // If priority is equal:
    // more matched words wins.
    //
    // This prevents:
    //
    // "tạo ảnh"
    //
    // from being interpreted as:
    //
    // build
    //
    // because "tạo" alone is a generic trigger.
    // ============================================================

    candidates.sort(
      (
        a,
        b
      ) => {

        if (
          b.priority !==
          a.priority
        ) {

          return (
            b.priority -
            a.priority
          );
        }


        return (
          b.matchCount -
          a.matchCount
        );
      }
    );


    const best =
      candidates[0];


    // ==========================================================
    // CONFIDENCE
    // ==========================================================

    let confidence =
      0.72;


    if (
      best.matchCount >= 2
    ) {

      confidence =
        0.92;

    } else if (
      best.priority >= 95
    ) {

      confidence =
        0.90;

    } else if (
      best.priority >= 80
    ) {

      confidence =
        0.86;

    } else if (
      best.priority >= 60
    ) {

      confidence =
        0.78;
    }


    // ==========================================================
    // CONTEXT
    // ==========================================================

    const result = {

      type:
        best.type,

      confidence,

      matched:
        best.matched,

      message:
        originalText
    };


    // Preserve useful context metadata
    // without modifying the user's context.

    if (
      context &&
      typeof context === 'object'
    ) {

      result.contextAware =
        true;
    }


    // ==========================================================
    // RETURN
    // ==========================================================

    return result;
  }
}


module.exports =
  IntentEngine;
