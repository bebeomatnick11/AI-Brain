'use strict';

module.exports = {
  name: 'game.lookup',

  description:
    'Lookup registered Roblox game information.',

  permissions: [
    'game.read'
  ],

  schema: {
    type: 'object',
    required: ['gameId']
  },

  async execute(input, context) {
    const games =
      context.games || {};

    const gameId =
      String(
        input?.gameId || ''
      );

    return (
      games[gameId] ||
      null
    );
  }
};
