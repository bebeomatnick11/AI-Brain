'use strict';

class LocalProvider {

  constructor() {

    this.name =
      'local-fallback';
  }


  async available() {

    return true;
  }


  async generate(
    request = {}
  ) {

    const message =
      String(
        request.message || ''
      );


    return {

      success: true,

      provider:
        this.name,

      text:
        this.simpleResponse(
          message
        )
    };
  }


  simpleResponse(
    message
  ) {

    if (!message) {

      return 'Astra đang chờ yêu cầu.';
    }


    return (
      'Astra đã nhận yêu cầu: ' +
      message
    );
  }
}


module.exports =
  LocalProvider;
