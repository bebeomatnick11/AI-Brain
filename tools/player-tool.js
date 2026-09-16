'use strict';

module.exports = {
  name: 'player.lookup',

  description:
    'Lookup a registered Roblox player.',

  permissions: [
    'player.read'
  ],

  schema: {
    type: 'object',
    required: ['userId']
  },

  async execute(input, context) {
    const players =
      context.players || {};

    const userId =
      String(
        input?.userId || ''
      );

    return (
      players[userId] ||
      null
    );
  }
};
