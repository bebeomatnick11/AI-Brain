'use strict';

class ProviderRouter {

  constructor(
    providers = []
  ) {

    this.providers =
      providers.filter(Boolean);
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
    request
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


        if (!available) {
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

          return result.text ||
            result.response ||
            String(result);
        }

      } catch (error) {

        lastError =
          error;
      }
    }


    if (lastError) {

      return (
        'Astra chưa thể kết nối AI provider: ' +
        lastError.message
      );
    }


    return (
      'Hiện chưa có AI provider khả dụng.'
    );
  }
}


module.exports =
  ProviderRouter;
