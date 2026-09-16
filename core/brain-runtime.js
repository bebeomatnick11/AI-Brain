'use strict';

const {
  route
} = require('./cognitive-router');

const {
  search,
  buildContext
} = require('./hybrid-rag');

const {
  ToolRegistry
} = require('./tool-registry');

const {
  checkInput,
  checkTool,
  checkOutput
} = require('./guardrails');

const {
  verify
} = require('./verifier');

const {
  repair
} = require('./repair-engine');

const {
  createTrace,
  addEvent,
  finishTrace,
  failTrace
} = require('./audit-trace');

class BrainRuntime {
  constructor(options = {}) {
    this.db =
      options.db || {};

    this.provider =
      options.provider || null;

    this.tools =
      options.tools ||
      new ToolRegistry();
  }

  async run(input = {}) {
    const trace =
      createTrace(input);

    try {

      addEvent(
        trace,
        'OBSERVE',
        {
          input
        }
      );

      const inputCheck =
        checkInput(input);

      if (!inputCheck.allowed) {
        throw new Error(
          inputCheck.reason
        );
      }

      const decision =
        route(input);

      trace.intent =
        decision.intent;

      trace.route =
        decision.route;

      addEvent(
        trace,
        'ROUTE',
        decision
      );

      let context = '';

      if (
        decision.requiresMemory ||
        decision.requiresRetrieval
      ) {

        const documents =
          this.collectDocuments();

        const results =
          search(
            input.text,
            documents,
            {
              limit: 8
            }
          );

        context =
          buildContext(
            results
          );

        addEvent(
          trace,
          'RETRIEVAL',
          {
            count:
              results.length
          }
        );
      }

      const result =
        await this.executeReasoning(
          input,
          decision,
          context,
          trace
        );

      const outputCheck =
        checkOutput(result);

      if (!outputCheck.allowed) {
        throw new Error(
          outputCheck.reason
        );
      }

      if (
        decision.requiresVerification
      ) {

        const verification =
          verify(result);

        addEvent(
          trace,
          'VERIFY',
          verification
        );

        if (!verification.passed) {

          const repaired =
            await repair(
              async () =>
                this.executeReasoning(
                  input,
                  decision,
                  context,
                  trace
                ),
              {
                input,
                decision
              },
              {
                maxRetries: 2
              }
            );

          if (!repaired.success) {
            throw new Error(
              'Verification and repair failed'
            );
          }

          finishTrace(
            trace,
            repaired.result
          );

          return {
            success: true,
            result:
              repaired.result,
            trace
          };
        }
      }

      finishTrace(
        trace,
        result
      );

      return {
        success: true,
        result,
        trace
      };

    } catch (error) {

      failTrace(
        trace,
        error
      );

      return {
        success: false,
        error:
          error.message,
        trace
      };
    }
  }

  collectDocuments() {
    const docs = [];

    if (
      Array.isArray(
        this.db.documents
      )
    ) {
      docs.push(
        ...this.db.documents
      );
    }

    if (
      this.db.knowledge &&
      typeof this.db.knowledge === 'object'
    ) {
      for (
        const [key, value]
        of Object.entries(
          this.db.knowledge
        )
      ) {
        docs.push({
          title: key,
          content:
            JSON.stringify(value)
        });
      }
    }

    return docs;
  }

  async executeReasoning(
    input,
    decision,
    context,
    trace
  ) {
    if (!this.provider) {
      return {
        type: 'no_provider',
        message:
          'No AI provider configured.',
        route:
          decision.route,
        context
      };
    }

    addEvent(
      trace,
      'REASONING',
      {
        route:
          decision.route
      }
    );

    const messages = [
      {
        role: 'system',
        content:
          'You are Astra Brain. Use the supplied context only as supporting evidence. Do not claim an action succeeded unless it was verified.'
      },
      {
        role: 'user',
        content:
          String(input.text || '')
      }
    ];

    if (context) {
      messages.splice(
        1,
        0,
        {
          role: 'system',
          content:
            `Retrieved context:\n${context}`
        }
      );
    }

    const response =
      await this.provider.ask(
        messages
      );

    return (
      response?.content ??
      response
    );
  }
}

module.exports = {
  BrainRuntime
};
