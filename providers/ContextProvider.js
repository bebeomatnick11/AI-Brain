'use strict';

const BaseProvider =
  require('./BaseProvider');

class ContextProvider
  extends BaseProvider {

  constructor(options = {}) {
    super({
      ...options,
      name:
        options.name ||
        'astra-context-provider'
    });

    this.sources =
      new Map();
  }

  registerSource(
    name,
    source
  ) {
    if (!name) {
      throw new Error(
        'Context source name is required'
      );
    }

    this.sources.set(
      String(name),
      source
    );

    return source;
  }

  unregisterSource(name) {
    return this.sources.delete(
      String(name)
    );
  }

  hasSource(name) {
    return this.sources.has(
      String(name)
    );
  }

  getSource(name) {
    return (
      this.sources.get(
        String(name)
      ) || null
    );
  }

  listSources() {
    return Array.from(
      this.sources.keys()
    );
  }

  async collect(
    input = {},
    baseContext = {}
  ) {
    this.assertEnabled();

    const context = {
      ...baseContext
    };

    for (
      const [
        name,
        source
      ] of this.sources
    ) {
      try {
        let value;

        if (
          typeof source ===
          'function'
        ) {
          value =
            await source(
              input,
              context
            );
        } else if (
          source &&
          typeof source.getContext ===
          'function'
        ) {
          value =
            await source.getContext(
              input,
              context
            );
        } else if (
          source &&
          typeof source.collect ===
          'function'
        ) {
          value =
            await source.collect(
              input,
              context
            );
        } else {
          value = source;
        }

        context[name] =
          value;

      } catch (error) {
        context[name] = {
          error:
            error?.message ||
            String(error)
        };
      }
    }

    return context;
  }
}

module.exports =
  ContextProvider;
