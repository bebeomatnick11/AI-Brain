'use strict';

function verify(result, expectation = {}) {
  const checks = [];

  checks.push({
    name: 'result_exists',
    passed:
      result !== undefined &&
      result !== null
  });

  if (
    expectation.requiredFields &&
    result &&
    typeof result === 'object'
  ) {
    for (
      const field
      of expectation.requiredFields
    ) {
      checks.push({
        name:
          `field:${field}`,
        passed:
          result[field] !== undefined
      });
    }
  }

  const passed =
    checks.every(
      check => check.passed
    );

  return {
    passed,
    checks
  };
}

module.exports = {
  verify
};
