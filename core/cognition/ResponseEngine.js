'use strict';

/**
 * Astra Dynamic Response Engine
 *
 * Không phải LLM.
 *
 * Đây là Natural Response Composer:
 * - chọn mục đích
 * - chọn nội dung
 * - chọn mức giải thích
 * - chọn giọng
 * - chọn context
 * - ghép response từ nhiều thành phần
 *
 * Không dùng một câu cố định cho mỗi intent.
 */

class ResponseEngine {
  constructor(options = {}) {
    this.maxSentences =
      Number(options.maxSentences || 8);
  }

  generate(input = {}) {
    const understanding =
      input.understanding || {};

    const dialogue =
      input.dialogue || {};

    const reasoning =
      input.reasoning || {};

    const personality =
      input.personality || {};

    const adaptation =
      input.adaptation || {};

    const memories =
      input.memories || [];

    const results =
      input.results || [];

    const context =
      input.context || {};

    const mode =
      dialogue.mode || 'answer';

    switch (mode) {
      case 'acknowledge':
        return this.composeAcknowledgement(
          understanding,
          personality,
          adaptation
        );

      case 'greet':
        return this.composeGreeting(
          understanding,
          personality,
          adaptation,
          memories
        );

      case 'correct':
        return this.composeCorrection(
          understanding,
          reasoning,
          personality
        );

      case 'continue':
        return this.composeContinuation(
          understanding,
          context,
          personality
        );

      case 'adjust':
        return this.composeAdjustment(
          understanding,
          context,
          personality
        );

      case 'memory':
        return this.composeMemoryResponse(
          memories,
          personality
        );

      case 'execute':
        return this.composeExecutionResponse(
          understanding,
          results,
          reasoning,
          adaptation,
          personality
        );

      case 'diagnose':
        return this.composeDiagnosis(
          understanding,
          reasoning,
          results,
          adaptation,
          personality
        );

      case 'explain':
        return this.composeExplanation(
          understanding,
          reasoning,
          memories,
          adaptation,
          personality
        );

      case 'conversation':
        return this.composeConversation(
          understanding,
          context,
          memories,
          personality,
          adaptation
        );

      case 'clarify':
        return this.composeClarification(
          understanding,
          personality
        );

      default:
        return this.composeAnswer(
          understanding,
          reasoning,
          memories,
          adaptation,
          personality
        );
    }
  }

  composeAcknowledgement(
    understanding,
    personality,
    adaptation
  ) {
    const sentiment =
      understanding.sentiment?.label;

    const topic =
      understanding.topic;

    const casual =
      personality.style ===
      'warm-casual';

    const pieces = [];

    if (
      sentiment === 'positive'
    ) {
      pieces.push(
        casual
          ? this.pick([
              'Haha, đúng là có cái để vui thật.',
              'Chuẩn, đoạn này khá thú vị.',
              '😄 Ừ, nhìn nó chạy được như vậy khá đã.'
            ])
          : this.pick([
              'Cảm ơn anh.',
              'Mình nhận được tín hiệu tích cực đó.',
              'Nghe vậy vui thật.'
            ])
      );
    } else {
      pieces.push(
        this.pick([
          'Mình hiểu phản ứng của anh.',
          'Ừ, mình bắt được ý rồi.',
          'Mình hiểu.'
        ])
      );
    }

    if (topic && topic !== 'general') {
      pieces.push(
        this.pick([
          `Đặc biệt là phần ${topic.toLowerCase()}.`,
          `Phần ${topic.toLowerCase()} cũng là chỗ khá đáng chú ý.`,
          `Ở chủ đề ${topic.toLowerCase()} thì điều đó khá hợp lý.`
        ])
      );
    }

    if (
      adaptation?.isNew
    ) {
      pieces.push(
        'Nếu anh mới làm quen với Astra, mình có thể giải thích từng phần từ đầu.'
      );
    }

    return this.finalize(
      pieces
    );
  }

  composeGreeting(
    understanding,
    personality,
    adaptation,
    memories
  ) {
    if (
      adaptation?.isNew
    ) {
      return this.finalize([
        this.pick([
          'Chào anh 👋',
          'Chào anh, rất vui được gặp.',
          'Hey anh 👋'
        ]),
        this.pick([
          'Mình có thể giúp anh tìm hiểu Astra từng bước.',
          'Anh có thể bắt đầu bằng bất cứ câu hỏi hoặc ý tưởng nào.',
          'Nếu chưa biết bắt đầu từ đâu, mình có thể dẫn anh đi từ những phần cơ bản.'
        ])
      ]);
    }

    const topic =
      this.getRecentTopic(
        memories
      );

    const pieces = [
      this.pick([
        'Chào anh 👋',
        'Hey anh.',
        'Chào anh, mình đây.'
      ])
    ];

    if (topic) {
      pieces.push(
        `Mình vẫn giữ ngữ cảnh gần đây về ${topic}.`
      );
    }

    pieces.push(
      this.pick([
        'Mình sẵn sàng tiếp tục từ chỗ đang làm.',
        'Cứ ném ý tưởng tiếp theo sang đây.',
        'Mình có thể tiếp tục từ phần trước.'
      ])
    );

    return this.finalize(
      pieces
    );
  }

  composeCorrection(
    understanding,
    reasoning,
    personality
  ) {
    const pieces = [
      this.pick([
        'Ừ, mình hiểu ý anh rồi.',
        'Đúng, vậy là mình đã hiểu lệch chỗ đó.',
        'Mình bắt được phần cần sửa rồi.'
      ])
    ];

    if (
      reasoning?.conclusion
    ) {
      pieces.push(
        reasoning.conclusion
      );
    }

    pieces.push(
      this.pick([
        'Mình sẽ dùng cách hiểu mới này cho phần tiếp theo.',
        'Vậy mình điều chỉnh hướng xử lý theo ý anh.',
        'Từ đây mình sẽ bám theo cách hiểu này.'
      ])
    );

    return this.finalize(
      pieces
    );
  }

  composeContinuation(
    understanding,
    context,
    personality
  ) {
    const pieces = [];

    if (
      context?.lastTopic
    ) {
      pieces.push(
        `Ừ, tiếp tục với ${context.lastTopic} nhé.`
      );
    } else {
      pieces.push(
        this.pick([
          'Ừ, mình theo tiếp được.',
          'Được, mình tiếp tục nhé.',
          'OK, mình bắt được mạch rồi.'
        ])
      );
    }

    if (
      understanding.original
    ) {
      pieces.push(
        this.pick([
          'Phần tiếp theo mình sẽ dựa trên ngữ cảnh vừa có.',
          'Mình sẽ giữ lại những gì vừa thống nhất thay vì bắt đầu lại từ đầu.'
        ])
      );
    }

    return this.finalize(
      pieces
    );
  }

  composeAdjustment(
    understanding,
    context,
    personality
  ) {
    return this.finalize([
      this.pick([
        'Được, mình sẽ điều chỉnh hướng xử lý.',
        'Hiểu rồi, mình bỏ hướng vừa rồi và cập nhật lại.',
        'OK, mình sẽ không tiếp tục theo giả định cũ.'
      ]),
      context?.lastTopic
        ? `Mình vẫn giữ phần ngữ cảnh về ${context.lastTopic}.`
        : 'Mình sẽ dựa vào yêu cầu mới của anh.'
    ]);
  }

  composeMemoryResponse(
    memories,
    personality
  ) {
    if (!memories.length) {
      return this.finalize([
        'Hiện tại mình chưa tìm thấy ký ức phù hợp.',
        'Nếu anh cung cấp thêm ngữ cảnh, mình có thể dùng nó làm mốc cho cuộc trao đổi này.'
      ]);
    }

    const descriptions =
      memories
        .slice(0, 4)
        .map(memory =>
          this.describeMemory(memory)
        )
        .filter(Boolean);

    return this.finalize([
      'Mình tìm được một vài mảnh ngữ cảnh liên quan:',
      ...descriptions
    ]);
  }

  composeExecutionResponse(
    understanding,
    results,
    reasoning,
    adaptation,
    personality
  ) {
    const success =
      this.resultsSucceeded(results);

    const pieces = [];

    if (success) {
      pieces.push(
        this.buildExecutionOpening(
          understanding,
          adaptation
        )
      );

      const useful =
        this.extractUsefulResults(
          results
        );

      if (useful.length) {
        pieces.push(
          ...useful
        );
      } else if (
        reasoning?.conclusion
      ) {
        pieces.push(
          reasoning.conclusion
        );
      }

      if (
        adaptation?.level ===
        'advanced'
      ) {
        pieces.push(
          this.pick([
            'Mình giữ phần giải thích gọn để không lặp lại những thứ anh đã nắm.',
            'Mình bỏ qua phần nhập môn và tập trung vào phần thực thi.',
            'Mình giữ trọng tâm ở phần cần làm.'
          ])
        );
      } else {
        pieces.push(
          this.pick([
            'Nếu cần, mình có thể giải thích từng phần hoạt động như thế nào.',
            'Nếu đây là phần mới với anh, mình có thể đi qua từng bước.'
          ])
        );
      }
    } else {
      pieces.push(
        this.buildExecutionFailure(
          results
        )
      );

      if (
        reasoning?.conclusion
      ) {
        pieces.push(
          reasoning.conclusion
        );
      }

      pieces.push(
        this.pick([
          'Mình sẽ giữ lỗi này làm tín hiệu cho bước kiểm tra tiếp theo.',
          'Phần này cần kiểm tra thêm trước khi coi là hoàn thành.'
        ])
      );
    }

    return this.finalize(
      pieces
    );
  }

  composeDiagnosis(
    understanding,
    reasoning,
    results,
    adaptation,
    personality
  ) {
    const pieces = [];

    pieces.push(
      this.pick([
        'Mình đã tách vấn đề ra để kiểm tra.',
        'Mình nhìn lỗi này theo từng lớp thay vì chỉ sửa triệu chứng.',
        'Mình đã phân tích phần đang gặp vấn đề.'
      ])
    );

    if (
      reasoning?.facts?.length
    ) {
      pieces.push(
        'Những điểm mình xác định được:'
      );

      for (
        const fact of
        reasoning.facts.slice(0, 4)
      ) {
        pieces.push(
          `• ${this.toText(fact)}`
        );
      }
    }

    if (
      reasoning?.conclusion
    ) {
      pieces.push(
        `Kết luận hiện tại: ${reasoning.conclusion}`
      );
    }

    if (
      adaptation?.explanation
        ?.examples
    ) {
      pieces.push(
        'Mình có thể đưa ví dụ cụ thể để phần này dễ kiểm tra hơn.'
      );
    }

    return this.finalize(
      pieces
    );
  }

  composeExplanation(
    understanding,
    reasoning,
    memories,
    adaptation,
    personality
  ) {
    const pieces = [];

    const detailed =
      adaptation?.explanation
        ?.depth === 'detailed';

    if (
      reasoning?.conclusion
    ) {
      pieces.push(
        reasoning.conclusion
      );
    } else {
      pieces.push(
        this.pick([
          'Mình sẽ giải thích theo phần cốt lõi trước.',
          'Mình tách vấn đề thành các phần để dễ theo dõi.'
        ])
      );
    }

    if (
      reasoning?.facts?.length
    ) {
      if (detailed) {
        pieces.push(
          'Các điểm quan trọng:'
        );

        for (
          const fact of
          reasoning.facts.slice(
            0,
            6
          )
        ) {
          pieces.push(
            `• ${this.toText(fact)}`
          );
        }
      } else {
        pieces.push(
          ...reasoning.facts
            .slice(0, 3)
            .map(
              fact =>
                `• ${this.toText(fact)}`
            )
        );
      }
    }

    if (
      memories.length &&
      adaptation?.isNew === false
    ) {
      pieces.push(
        'Mình cũng đối chiếu với ngữ cảnh trước để tránh giải thích tách rời khỏi cuộc trao đổi.'
      );
    }

    return this.finalize(
      pieces
    );
  }

  composeConversation(
    understanding,
    context,
    memories,
    personality,
    adaptation
  ) {
    const pieces = [];

    if (
      understanding.sentiment?.label ===
      'positive'
    ) {
      pieces.push(
        this.pick([
          'Ừ, mình cũng thấy hướng này khá thú vị.',
          'Đúng, ý này có một điểm khá hay.',
          'Mình bắt được sự hào hứng trong ý này.'
        ])
      );
    } else if (
      understanding.sentiment?.label ===
      'negative'
    ) {
      pieces.push(
        this.pick([
          'Ừ, mình hiểu điểm anh đang không hài lòng.',
          'Mình hiểu vấn đề anh đang phản ứng tới.',
          'Đúng, chỗ này cần xem lại.'
        ])
      );
    } else {
      pieces.push(
        this.pick([
          'Mình hiểu ý anh.',
          'Ừ, mình theo được ý này.',
          'Mình bắt được hướng anh đang nói.'
        ])
      );
    }

    if (
      context?.lastTopic
    ) {
      pieces.push(
        `Nó cũng liên quan khá sát với phần ${context.lastTopic} mình đang làm.`
      );
    }

    if (
      adaptation?.level ===
      'new'
    ) {
      pieces.push(
        'Nếu đây là khái niệm mới, mình sẽ giải thích từ nền tảng thay vì mặc định anh đã biết.'
      );
    }

    return this.finalize(
      pieces
    );
  }

  composeClarification(
    understanding,
    personality
  ) {
    return this.finalize([
      'Mình chưa có đủ thông tin để xác định chính xác ý anh muốn.',
      this.pick([
        'Anh muốn mình giải thích, tạo, sửa hay phân tích phần nào?',
        'Anh cho mình thêm mục tiêu hoặc phần cần tác động nhé.',
        'Chỉ cần thêm một chút ngữ cảnh là mình có thể đi tiếp.'
      ])
    ]);
  }

  composeAnswer(
    understanding,
    reasoning,
    memories,
    adaptation,
    personality
  ) {
    const pieces = [];

    if (
      reasoning?.conclusion
    ) {
      pieces.push(
        reasoning.conclusion
      );
    }

    if (
      reasoning?.facts?.length
    ) {
      pieces.push(
        ...reasoning.facts
          .slice(
            0,
            adaptation?.explanation
              ?.depth === 'detailed'
              ? 5
              : 3
          )
          .map(
            fact =>
              `• ${this.toText(fact)}`
          )
      );
    }

    if (!pieces.length) {
      pieces.push(
        this.pick([
          'Mình chưa có đủ dữ kiện để kết luận chắc chắn.',
          'Phần này cần thêm ngữ cảnh trước khi mình kết luận.',
          'Mình đang thiếu thông tin để đưa ra câu trả lời đáng tin cậy.'
        ])
      );
    }

    return this.finalize(
      pieces
    );
  }

  buildExecutionOpening(
    understanding,
    adaptation
  ) {
    const intent =
      understanding.intent;

    if (
      intent === 'code' ||
      intent === 'creation'
    ) {
      if (
        adaptation?.level ===
        'advanced'
      ) {
        return this.pick([
          'Được, mình xử lý phần cần tạo.',
          'OK, mình đi thẳng vào phần triển khai.',
          'Được, mình bám vào yêu cầu và triển khai.'
        ]);
      }

      return this.pick([
        'Được, mình sẽ làm phần này.',
        'OK, mình bắt đầu từ yêu cầu chính rồi đi tới phần thực hiện.',
        'Được, mình sẽ xử lý từng phần để kết quả dễ kiểm tra.'
      ]);
    }

    return this.pick([
      'Mình đã xử lý yêu cầu.',
      'Được, mình đã thực hiện bước cần thiết.',
      'Mình đi theo hướng anh yêu cầu.'
    ]);
  }

  buildExecutionFailure(results) {
    const errors =
      results
        .filter(
          item => item && item.success === false
        )
        .slice(0, 3)
        .map(
          item =>
            item.error ||
            item.message ||
            'Unknown execution error'
        );

    if (!errors.length) {
      return 'Bước thực thi chưa hoàn thành như dự kiến.';
    }

    return (
      'Bước thực thi chưa hoàn thành. ' +
      errors.join('; ')
    );
  }

  extractUsefulResults(results) {
    const output = [];

    for (
      const item of
      results.slice(0, 5)
    ) {
      if (!item) {
        continue;
      }

      if (
        typeof item.result ===
        'string'
      ) {
        output.push(
          item.result
        );
        continue;
      }

      if (
        item.result &&
        typeof item.result ===
          'object'
      ) {
        if (
          typeof item.result.message ===
          'string'
        ) {
          output.push(
            item.result.message
          );
        }

        if (
          typeof item.result.output ===
          'string'
        ) {
          output.push(
            item.result.output
          );
        }
      }
    }

    return output.slice(0, 5);
  }

  resultsSucceeded(results) {
    if (!results.length) {
      return true;
    }

    const failures =
      results.filter(
        result =>
          result &&
          result.success === false
      );

    return failures.length === 0;
  }

  describeMemory(memory) {
    if (!memory) {
      return null;
    }

    if (
      typeof memory === 'string'
    ) {
      return `• ${memory}`;
    }

    const text =
      memory.content ||
      memory.text ||
      memory.value ||
      memory.summary;

    return text
      ? `• ${String(text)}`
      : null;
  }

  getRecentTopic(memories) {
    for (const memory of memories) {
      const topic =
        memory?.topic ||
        memory?.metadata?.topic;

      if (topic) {
        return topic;
      }
    }

    return null;
  }

  toText(value) {
    if (
      typeof value ===
      'string'
    ) {
      return value;
    }

    if (
      value &&
      typeof value.text ===
      'string'
    ) {
      return value.text;
    }

    if (
      value &&
      typeof value.description ===
      'string'
    ) {
      return value.description;
    }

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  pick(values) {
    if (!values.length) {
      return '';
    }

    return values[
      Math.floor(
        Math.random() *
        values.length
      )
    ];
  }

  finalize(parts) {
    const clean =
      parts
        .flatMap(
          item =>
            String(item || '')
              .split('\n')
        )
        .map(
          item =>
            item.trim()
        )
        .filter(Boolean);

    return clean
      .slice(
        0,
        this.maxSentences
      )
      .join('\n');
  }
}

module.exports =
  ResponseEngine;
