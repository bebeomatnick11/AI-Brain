'use strict';

class AssociationEngine {
  constructor(options = {}) {
    this.conceptMemory =
      options.conceptMemory || null;

    this.windowSize =
      Number(
        options.windowSize || 6
      );
  }

  setConceptMemory(memory) {
    this.conceptMemory = memory;
  }

  learnFromTokens(tokens = []) {
    if (!this.conceptMemory) {
      return [];
    }

    const clean =
      tokens
        .map(x =>
          String(x || '')
            .trim()
            .toLowerCase()
        )
        .filter(Boolean);

    const associations = [];

    for (
      let i = 0;
      i < clean.length;
      i++
    ) {
      const current =
        clean[i];

      this.conceptMemory.observe(
        current
      );

      for (
        let j = i + 1;
        j < Math.min(
          clean.length,
          i + this.windowSize
        );
        j++
      ) {
        const other =
          clean[j];

        if (
          current === other
        ) {
          continue;
        }

        this.conceptMemory.associate(
          current,
          other,
          1
        );

        this.conceptMemory.associate(
          other,
          current,
          0.5
        );

        associations.push([
          current,
          other
        ]);
      }
    }

    return associations;
  }

  expandConcepts(
    concepts = [],
    limit = 12
  ) {
    if (!this.conceptMemory) {
      return [];
    }

    const result = [];

    for (const concept of concepts) {
      const related =
        this.conceptMemory.related(
          concept,
          limit
        );

      for (const item of related) {
        result.push({
          source: concept,
          target: item.name,
          weight: item.weight
        });
      }
    }

    return result
      .sort(
        (a, b) =>
          b.weight - a.weight
      )
      .slice(0, limit);
  }
}

module.exports =
  AssociationEngine;
