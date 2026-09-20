'use strict';

class VerificationTool {

  async verify(
    state
  ) {

    const results =
      Array.isArray(
        state.results
      )
        ? state.results
        : [];


    const errors =
      Array.isArray(
        state.errors
      )
        ? state.errors
        : [];


    const failed =
      results.filter(
        result =>
          result &&
          result.success === false
      );


    return {

      verified:
        failed.length === 0 &&
        errors.length === 0,

      totalResults:
        results.length,

      failedResults:
        failed.length,

      errors:
        errors.length,

      warnings:
        []
    };
  }
}


module.exports =
  VerificationTool;
