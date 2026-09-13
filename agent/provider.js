const config =
  require("./config");

async function ask(messages) {
  const endpoint =
    config.provider.endpoint;

  const response = await fetch(
    `${endpoint}/chat/completions`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json"
      },

      body: JSON.stringify({
        model: config.provider.model,
        messages,
        temperature: 0.7
      })
    }
  );

  if (!response.ok) {
    throw new Error(
      `AI_PROVIDER_${response.status}`
    );
  }

  const data =
    await response.json();

  return (
    data?.choices?.[0]?.message?.content ||
    ""
  );
}

module.exports = {
  ask
};
