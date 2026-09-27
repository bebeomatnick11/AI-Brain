'use strict';

class VideoProviderRouter {

  constructor(
    providers = []
  ) {

    this.providers =
      providers.filter(
        Boolean
      );
  }


  list() {

    return this.providers.map(
      provider => ({

        name:
          provider.name,

        available:
          typeof provider.available ===
          'function'
            ? provider.available()
            : true
      })
    );
  }


  async generate(
    request = {}
  ) {

    let lastError =
      null;


    for (
      const provider
      of this.providers
    ) {

      try {

        const available =
          typeof provider.available ===
          'function'
            ? await provider.available()
            : true;


        if (
          !available
        ) {
          continue;
        }


        const result =
          await provider.generate(
            request
          );


        if (
          result &&
          result.success !== false
        ) {

          return result;
        }

      } catch (
        error
      ) {

        lastError =
          error;
      }
    }


    return {

      success:
        false,

      type:
        'video',

      error:
        lastError?.message ||
        'No video provider available.'
    };
  }


  async status(
    jobId
  ) {

    for (
      const provider
      of this.providers
    ) {

      if (
        typeof provider.status !==
        'function'
      ) {
        continue;
      }


      try {

        const available =
          typeof provider.available ===
          'function'
            ? await provider.available()
            : true;


        if (
          !available
        ) {
          continue;
        }


        return await provider.status(
          jobId
        );

      } catch (
        error
      ) {
        continue;
      }
    }


    return {

      success:
        false,

      status:
        'unknown',

      error:
        'Video job provider unavailable.'
    };
  }
}


module.exports =
  VideoProviderRouter;
