'use strict';

function checkInput(input) {
  const text =
    String(input?.text || '');

  if (text.length > 20000) {
    return {
      allowed: false,
      reason: 'Input too large'
    };
  }

  return {
    allowed: true
  };
}

function checkTool(tool, context = {}) {
  if (!tool) {
    return {
      allowed: false,
      reason: 'Tool does not exist'
    };
  }

  const dangerous =
    tool.permissions?.includes(
      'dangerous'
    );

  if (
    dangerous &&
    context.allowDangerous !== true
  ) {
    return {
      allowed: false,
      reason:
        'Dangerous tool requires explicit permission'
    };
  }

  return {
    allowed: true
  };
}

function checkOutput(output) {
  const text =
    typeof output === 'string'
      ? output
      : JSON.stringify(output);

  if (text.length > 50000) {
    return {
      allowed: false,
      reason: 'Output too large'
    };
  }

  return {
    allowed: true
  };
}

module.exports = {
  checkInput,
  checkTool,
  checkOutput
};
