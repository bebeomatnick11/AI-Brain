'use strict';

class ResponseEngine {
  generate(state = {}) {
    const intent =
      state.understanding?.intent?.type ||
      'chat';

    const conclusion =
      state.reasoning?.conclusion;

    const confidence =
      Number(
        conclusion?.confidence || 0
      );

    if (
      state.understanding?.question
        ?.isQuestion
    ) {
      if (
        state.memories &&
        state.memories.length
      ) {
        return this.answerWithContext(
          state
        );
      }

      return this.questionResponse(
        state,
        confidence
      );
    }

    switch (intent) {
      case 'code':
        return this.codeResponse(
          state
        );

      case 'debug':
        return this.debugResponse(
          state
        );

      case 'research':
        return this.researchResponse(
          state
        );

      case 'memory':
        return this.memoryResponse(
          state
        );

      case 'analysis':
        return this.analysisResponse(
          state
        );

      case 'comparison':
        return this.comparisonResponse(
          state
        );

      case 'creation':
        return this.creationResponse(
          state
        );

      default:
        return this.chatResponse(
          state
        );
    }
  }

  questionResponse(
    state,
    confidence
  ) {
    const keywords =
      state.understanding?.keywords
        ?.slice(0, 5)
        .join(', ');

    if (keywords) {
      return {
        text:
          `Astra đã xác định câu hỏi xoay quanh: ${keywords}. ` +
          `Mức chắc chắn hiện tại là ` +
          `${Math.round(confidence * 100)}%.`,
        mode: 'structured'
      };
    }

    return {
      text:
        'Astra đã nhận diện đây là một câu hỏi, nhưng hiện chưa có đủ tri thức nội bộ để kết luận.',
      mode: 'uncertain'
    };
  }

  answerWithContext(state) {
    return {
      text:
        'Astra đã tìm thấy thông tin liên quan trong context và đang sử dụng nó để hình thành câu trả lời.',
      mode: 'memory_context',
      context:
        state.memories
    };
  }

  codeResponse() {
    return {
      text:
        'Astra đã nhận diện yêu cầu lập trình và chuyển mục tiêu sang code capability.',
      mode: 'code'
    };
  }

  debugResponse() {
    return {
      text:
        'Astra đã nhận diện yêu cầu debug và chuyển mục tiêu sang chẩn đoán vấn đề.',
      mode: 'debug'
    };
  }

  researchResponse() {
    return {
      text:
        'Astra đã nhận diện yêu cầu nghiên cứu và tạo mục tiêu thu thập thông tin.',
      mode: 'research'
    };
  }

  memoryResponse() {
    return {
      text:
        'Astra đã nhận diện yêu cầu liên quan đến memory.',
      mode: 'memory'
    };
  }

  analysisResponse() {
    return {
      text:
        'Astra đã nhận diện yêu cầu phân tích và chuyển sang reasoning.',
      mode: 'analysis'
    };
  }

  comparisonResponse() {
    return {
      text:
        'Astra đã nhận diện yêu cầu so sánh và sẽ tổ chức thông tin theo các thuộc tính liên quan.',
      mode: 'comparison'
    };
  }

  creationResponse() {
    return {
      text:
        'Astra đã xác định mục tiêu là tạo một kết quả mới.',
      mode: 'creation'
    };
  }

  chatResponse(state) {
    const keywords =
      state.understanding?.keywords || [];

    if (keywords.length) {
      return {
        text:
          `Astra đã hiểu các khái niệm chính: ${keywords.slice(0, 8).join(', ')}.`,
        mode: 'chat'
      };
    }

    return {
      text:
        'Astra đã tiếp nhận thông tin và hình thành trạng thái nhận thức ban đầu.',
      mode: 'chat'
    };
  }
}

module.exports =
  ResponseEngine;
