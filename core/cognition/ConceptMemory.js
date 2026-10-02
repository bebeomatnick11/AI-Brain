'use strict';

class ConceptMemory {
  constructor(options = {}) {
    this.concepts = new Map();
    this.maxAssociations =
      Number(
        options.maxAssociations || 16
      );
  }

  ensure(name) {
    const key =
      this.normalize(name);

    if (!key) {
      return null;
    }

    if (!this.concepts.has(key)) {
      this.concepts.set(
        key,
        {
          name: key,
          count: 0,
          attributes: {},
          associations: {},
          history: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      );
    }

    return this.concepts.get(key);
  }

  observe(
    name,
    attributes = {},
    source = 'observation'
  ) {
    const concept =
      this.ensure(name);

    if (!concept) {
      return null;
    }

    concept.count++;

    Object.assign(
      concept.attributes,
      attributes
    );

    concept.history.push({
      source,
      timestamp: Date.now()
    });

    if (
      concept.history.length > 20
    ) {
      concept.history =
        concept.history.slice(-20);
    }

    concept.updatedAt = Date.now();

    return concept;
  }

  associate(
    from,
    to,
    weight = 1
  ) {
    const a =
      this.ensure(from);

    const b =
      this.ensure(to);

    if (!a || !b) {
      return false;
    }

    const key = b.name;

    a.associations[key] =
      Number(
        a.associations[key] || 0
      ) + Number(weight);

    this.trimAssociations(a);

    return true;
  }

  get(name) {
    return (
      this.concepts.get(
        this.normalize(name)
      ) || null
    );
  }

  related(name, limit = 8) {
    const concept =
      this.get(name);

    if (!concept) {
      return [];
    }

    return Object.entries(
      concept.associations
    )
      .sort(
        (a, b) => b[1] - a[1]
      )
      .slice(0, limit)
      .map(
        ([name, weight]) => ({
          name,
          weight,
          concept:
            this.get(name)
        })
      );
  }

  search(text, limit = 10) {
    const query =
      this.normalize(text);

    return Array.from(
      this.concepts.values()
    )
      .map(concept => {
        let score = 0;

        if (
          concept.name.includes(query)
        ) {
          score += 1;
        }

        for (
          const key of Object.keys(
            concept.attributes
          )
        ) {
          if (
            key.includes(query)
          ) {
            score += 0.3;
          }
        }

        return {
          concept,
          score
        };
      })
      .filter(x => x.score > 0)
      .sort(
        (a, b) => b.score - a.score
      )
      .slice(0, limit);
  }

  trimAssociations(concept) {
    const entries =
      Object.entries(
        concept.associations
      )
        .sort(
          (a, b) => b[1] - a[1]
        )
        .slice(
          0,
          this.maxAssociations
        );

    concept.associations =
      Object.fromEntries(entries);
  }

  normalize(value) {
    return String(value || '')
      .normalize('NFC')
      .toLowerCase()
      .trim();
  }

  snapshot() {
    return Array.from(
      this.concepts.values()
    );
  }
}

module.exports =
  ConceptMemory;
