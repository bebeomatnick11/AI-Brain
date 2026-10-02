'use strict';

const BaseProvider =
  require('./BaseProvider');

/**
 * KnowledgeProvider
 *
 * Cung cấp knowledge cho Astra.
 *
 * Có thể kết nối với:
 * - knowledge store
 * - registry
 * - local knowledge base
 * - verified knowledge
 *
 * Không phụ thuộc model bên ngoài.
 */

class KnowledgeProvider
  extends BaseProvider {

  constructor(options = {}) {
    super({
      ...options,
      name:
        options.name ||
        'astra-knowledge-provider'
    });

    this.knowledge =
      options.knowledge || null;
  }

  setKnowledge(knowledge) {
    this.knowledge = knowledge;
    return true;
  }

  getKnowledge() {
    return this.knowledge;
  }

  async search(
    query,
    context = {}
  ) {
    this.assertEnabled();

    if (!this.knowledge) {
      return [];
    }

    if (
      typeof this.knowledge.search ===
      'function'
    ) {
      return await this.knowledge.search(
        query,
        context
      );
    }

    if (
      typeof this.knowledge.retrieve ===
      'function'
    ) {
      return await this.knowledge.retrieve(
        query,
        context
      );
    }

    return [];
  }

  async get(
    id,
    context = {}
  ) {
    this.assertEnabled();

    if (!this.knowledge) {
      return null;
    }

    if (
      typeof this.knowledge.get ===
      'function'
    ) {
      return await this.knowledge.get(
        id,
        context
      );
    }

    return null;
  }

  async add(
    item,
    context = {}
  ) {
    this.assertEnabled();

    if (!this.knowledge) {
      return {
        success: false,
        error: 'KNOWLEDGE_NOT_CONNECTED'
      };
    }

    if (
      typeof this.knowledge.add ===
      'function'
    ) {
      return await this.knowledge.add(
        item,
        context
      );
    }

    if (
      typeof this.knowledge.store ===
      'function'
    ) {
      return await this.knowledge.store(
        item,
        context
      );
    }

    return {
      success: false,
      error: 'KNOWLEDGE_WRITE_UNSUPPORTED'
    };
  }
}

module.exports =
  KnowledgeProvider;
