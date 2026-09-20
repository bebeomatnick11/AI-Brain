const { recall, remember } =
    require("../core/memory");

const { chat } =
    require("../providers/provider");

function detectIntent(goal) {
    const text =
        String(goal || "").toLowerCase();

    if (
        /build|create|make|tạo|xây/i.test(text)
    ) {
        return "build";
    }

    if (
        /debug|fix|error|bug|lỗi|sửa/i.test(text)
    ) {
        return "debug";
    }

    if (
        /research|search|find|tìm|nghiên cứu/i.test(text)
    ) {
        return "research";
    }

    if (
        /learn|learning|học|thích nghi/i.test(text)
    ) {
        return "learn";
    }

    if (
        /observe|look|scan|quan sát/i.test(text)
    ) {
        return "observe";
    }

    return "general";
}

function makePlan(intent, goal) {
    switch (intent) {

        case "build":
            return [
                "understand_goal",
                "inspect_context",
                "design_solution",
                "execute_tools",
                "validate_result",
                "store_learning"
            ];

        case "debug":
            return [
                "collect_error",
                "inspect_context",
                "identify_cause",
                "design_fix",
                "validate_fix",
                "store_learning"
            ];

        case "research":
            return [
                "define_question",
                "search_sources",
                "compare_evidence",
                "summarize",
                "store_learning"
            ];

        case "learn":
            return [
                "collect_observation",
                "compare_existing_memory",
                "extract_pattern",
                "store_learning"
            ];

        case "observe":
            return [
                "inspect_world",
                "detect_changes",
                "update_world_model"
            ];

        default:
            return [
                "understand",
                "retrieve_memory",
                "reason",
                "respond",
                "store_relevant_memory"
            ];
    }
}

async function runAgent({
    brainId,
    goal,
    context = {}
}) {
    if (!goal) {
        throw new Error(
            "Agent goal is required"
        );
    }

    const intent =
        detectIntent(goal);

    const plan =
        makePlan(intent, goal);

    const memories =
        recall(
            brainId,
            goal,
            12
        );

    const memoryContext =
        memories
            .map(
                m => `- ${m.content}`
            )
            .join("\n");

    const prompt = `
You are Astra, an autonomous AI agent.

Intent:
${intent}

Goal:
${goal}

Plan:
${plan.join(" -> ")}

Relevant memories:
${memoryContext || "(none)"}

Current context:
${JSON.stringify(context, null, 2)}

Do not pretend that an action was executed if it was not.
Explain what should happen next.
`;

    const result =
        await chat({
            brainId,
            message: prompt,
            history: []
        });

    await remember(
        brainId,
        `Agent goal: ${goal}\nIntent: ${intent}\nPlan: ${plan.join(", ")}`,
        {
            type: "agent-plan",
            importance: 0.65
        }
    );

    return {
        intent,
        plan,
        response: result.text,
        provider: result.provider,
        degraded: result.degraded || false
    };
}

module.exports = {
    runAgent
};
