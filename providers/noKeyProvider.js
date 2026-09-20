'use strict';

class NoKeyProvider {

  constructor(
    options = {}
  ) {

    this.name =
      options.name ||
      'no-key-provider';


    this.endpoint =
      options.endpoint ||
      process.env.NO_KEY_AI_ENDPOINT ||
      'https://text.pollinations.ai/openai';


    this.model =
      options.model ||
      process.env.NO_KEY_AI_MODEL ||
      'openai';
  }


  async available() {

    return Boolean(
      this.endpoint
    );
  }


  async generate(
    request = {}
  ) {

    const messages = [
      {
        role: 'system',

        content:
          request.system ||
          'You are Astra, an autonomous AI agent.'
      },

      {
        role: 'user',

        content:
          request.message ||
          ''
      }
    ];


    const response =
      await fetch(
        this.endpoint,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body:
            JSON.stringify({
              model:
                this.model,

              messages,

              temperature:
                0.4
            }),

          signal:
            AbortSignal.timeout(45000)
        }
      );


    if (
      !response.ok
    ) {

      const body =
        await response.text();


      throw new Error(
        `No-key provider HTTP ${response.status}: ${body.slice(0, 500)}`
      );
    }


    const data =
      await response.json();


    const text =
      data?.choices?.[0]?.message?.content ||
      data?.choices?.[0]?.text ||
      data?.response ||
      data?.text;


    if (!text) {

      throw new Error(
        'Provider returned no text'
      );
    }


    return {

      success: true,

      text,

      provider:
        this.name,

      model:
        this.model
    };
  }
}


module.exports =
  NoKeyProvider;
