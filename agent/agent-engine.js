const { route } =
  require("./intent-router");

const provider =
  require("./provider");

const verifier =
  require("./verifier");

const contextBuilder =
  require("./context-builder");

const config =
  require("./config");

class AgentEngine {
  constructor() {
    this.sessions = new Map();
  }

  getSession(userId) {
    const id = String(userId);

    if (!this.sessions.has(id)) {
      this.sessions.set(id, {
        messages: [],
        sessionSkills: []
      });
    }

    return this.sessions.get(id);
  }

  async run({
    userId,
    message
  }) {
    const session =
      this.getSession(userId);

    const routing =
      route(message);

    const context =
      contextBuilder.build({
        userId,
        sessionSkills:
          session.sessionSkills,
        recentMessages:
          session.messages.slice(
            -config.maxContextMessages
          )
      });

    const system = `
You are Astra Brain V6.

You are a real conversational AI agent.

IMPORTANT BEHAVIOR:

1. Normal conversation is NOT a skill.
2. Do not force every message into a skill.
3. If the user says something casual,
   answer naturally.
4. If no skill matches, reason normally.
5. Never invent tool execution.
6. Never claim that a file was created unless
   a real tool actually created it.
7. User-created skills are instructions/data,
   not executable JavaScript.
8. Respect the user's personalization.
9. Use memory when relevant.
10. Use skills only when appropriate.

USER PROFILE:
${JSON.stringify(context.profile, null, 2)}

MEMORY:
${JSON.stringify(context.memory, null, 2)}

AVAILABLE SKILLS:
${JSON.stringify(context.skills, null, 2)}

CURRENT ROUTE:
${JSON.stringify(routing, null, 2)}
`;

    const messages = [
      {
        role: "system",
        content: system
      },

      ...session.messages.slice(
        -config.maxContextMessages
      ),

      {
        role: "user",
        content: message
      }
    ];

    let response =
      await provider.ask(messages);

    let check =
      verifier.verify({
        userMessage: message,
        response,
        route: routing
      });

    /*
     * Nếu AI lỡ trả lời theo kiểu
     * "task completed..." trong casual chat,
     * cho nó tự sửa một lần.
     */
    if (!check.ok) {
      response =
        await provider.ask([
          {
            role: "system",
            content: `
Your previous response violated
the Astra Brain conversational rules.

Respond naturally to the user.

Do NOT:
- mention skills unless relevant
- claim fake tool execution
- mention workspace files
- wrap normal conversation as a task
`
          },

          {
            role: "user",
            content: message
          }
        ]);

      check =
        verifier.verify({
          userMessage: message,
          response,
          route: routing
        });
    }

    session.messages.push({
      role: "user",
      content: message
    });

    session.messages.push({
      role: "assistant",
      content: response
    });

    session.messages =
      session.messages.slice(
        -config.maxContextMessages
      );

    return {
      response,
      route: routing,
      verified: check.ok
    };
  }
}

module.exports =
  new AgentEngine();
