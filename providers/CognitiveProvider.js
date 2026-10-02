'use strict';

const BaseProvider =
  require('./BaseProvider');

/**
 * CognitiveProvider
 *
 * Contract cho Cognitive Core của Astra.
 *
 * Không gọi API AI bên ngoài.
 * Không chứa API key.
 *
 * CognitiveEngine sau này sẽ implement hoặc sử dụng
 * contract này để thực hiện:
 *
 * - hiểu input
 * - suy luận
 * - tạo kế hoạch tư duy
 * - tạo response
 * - học từ kết quả
 */

class CognitiveProvider
  extends BaseProvider {

  constructor(options = {}) {
    super({
      ...options,
      name:
        options.name ||
        'astra-cognitive-provider'
    });
  }

  async understand(
    input,
    context = {}
  ) {
    this.assertEnabled();

    throw new Error(
      'CognitiveProvider.understand() is not implemented'
    );
  }

  async reason(
    input,
    context = {}
  ) {
    this.assertEnabled();

    throw new Error(
      'CognitiveProvider.reason() is not implemented'
    );
  }

  async plan(
    input,
    context = {}
  ) {
    this.assertEnabled();

    throw new Error(
      'CognitiveProvider.plan() is not implemented'
    );
  }

  async generate(
    input,
    context = {}
  ) {
    this.assertEnabled();

    throw new Error(
      'CognitiveProvider.generate() is not implemented'
    );
  }

  async learn(
    experience,
    context = {}
  ) {
    this.assertEnabled();

    throw new Error(
      'CognitiveProvider.learn() is not implemented'
    );
  }
}

module.exports =
  CognitiveProvider;
