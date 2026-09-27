'use strict';

class ImageProviderRouter {

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
        'image',

      error:
        lastError?.message ||
        'No image provider available.'
    };
  }
}


module.exports =
  ImageProviderRouter;
