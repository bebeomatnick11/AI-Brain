'use strict';

async function repair(
  operation,
  context = {},
  options = {}
) {
  const maxRetries =
    options.maxRetries ?? 2;

  let lastError = null;

  for (
    let attempt = 0;
    attempt <= maxRetries;
    attempt++
  ) {
    try {
      const result =
        await operation(
          attempt,
          context,
          lastError
        );

      return {
        success: true,
        attempts: attempt + 1,
        result
      };

    } catch (error) {
      lastError = error;
    }
  }

  return {
    success: false,
    attempts:
      maxRetries + 1,
    error:
      lastError?.message ||
      'Repair failed'
  };
}

module.exports = {
  repair
};
