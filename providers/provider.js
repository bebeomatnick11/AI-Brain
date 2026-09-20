const noKey = require("./noKey");
const fallback = require("./fallback");

async function chat(options) {
    const providers = [
        noKey,
        fallback
    ];

    let lastError = null;

    for (const provider of providers) {
        try {
            const result =
                await provider.chat(options);

            if (
                result &&
                result.text &&
                result.text.trim()
            ) {
                return {
                    ...result,
                    provider:
                        provider.name || "unknown"
                };
            }

        } catch (error) {
            lastError = error;
        }
    }

    return {
        text: fallback.localResponse(
            options.message
        ),

        provider: "local-fallback",

        degraded: true,

        error:
            lastError?.message || null
    };
}

module.exports = {
    chat
};
