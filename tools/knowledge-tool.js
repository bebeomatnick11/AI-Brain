'use strict';

module.exports = {
  name: 'knowledge.search',

  description:
    'Search learned Astra Brain knowledge.',

  permissions: [
    'knowledge.read'
  ],

  schema: {
    type: 'object',
    required: ['query']
  },

  async execute(input, context) {
    const knowledge =
      context.knowledge || {};

    const query =
      String(
        input?.query || ''
      ).toLowerCase();

    return Object.entries(
      knowledge
    )
      .filter(
        ([key, value]) =>
          `${key} ${JSON.stringify(value)}`
            .toLowerCase()
            .includes(query)
      )
      .slice(0, 20)
      .map(
        ([key, value]) => ({
          key,
          value
        })
      );
    }
  };
