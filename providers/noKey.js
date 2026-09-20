const ENDPOINTS = [
    "https://text.pollinations.ai/openai",
    "https://text.pollinations.ai/"
];

const MODEL =
    process.env.ASTRA_NO_KEY_MODEL ||
    "openai";

async function request(endpoint, payload) {
    const controller =
        new AbortController();

    const timer = setTimeout(
        () => controller.abort(),
        30000
    );

    try {
        const response =
            await fetch(endpoint, {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify(payload),

                signal:
                    controller.signal
            });

        if (!response.ok) {
            throw new Error(
                `Provider HTTP ${response.status}`
            );
        }

        const text =
            await response.text();

        if (!text.trim()) {
            throw new Error(
                "Empty provider response"
            );
        }

        let parsed;

        try {
            parsed = JSON.parse(text);
        } catch {
            return {
                text: text.trim()
            };
        }

        const result =
            parsed?.choices?.[0]?.message?.content ||
            parsed?.choices?.[0]?.text ||
            parsed?.output ||
            parsed?.text;

        if (!result) {
            throw new Error(
                "Provider returned no text"
            );
        }

        return {
            text: String(result)
        };

    } finally {
        clearTimeout(timer);
    }
}

async function chat(options = {}) {
    const messages = [
        {
            role: "system",
            content:
                options.system ||
                "You are Astra, an autonomous AI agent."
        },
        ...(options.history || []),
        {
            role: "user",
            content: String(
                options.message || ""
            )
        }
    ];

    let lastError;

    for (const endpoint of ENDPOINTS) {
        try {
            return await request(
                endpoint,
                {
                    model: MODEL,
                    messages
                }
            );
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError ||
        new Error("No no-key provider available");
}

module.exports = {
    name: "no-key",
    chat
};
