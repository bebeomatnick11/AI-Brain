function localResponse(message) {
    const text =
        String(message || "")
            .trim()
            .toLowerCase();

    if (!text) {
        return "Astra đang chờ yêu cầu.";
    }

    if (
        text.includes("hello") ||
        text.includes("xin chào") ||
        text === "hi"
    ) {
        return "Chào bro. Astra vẫn đang hoạt động.";
    }

    if (
        text.includes("learning") ||
        text.includes("học") ||
        text.includes("thích nghi")
    ) {
        return "Astra đã ghi nhận yêu cầu học và sẽ đưa quan sát này vào hệ thống learning.";
    }

    if (
        text.includes("error") ||
        text.includes("lỗi")
    ) {
        return "Astra đã nhận diện đây là yêu cầu xử lý lỗi. Hãy cung cấp lỗi hoặc context để agent phân tích.";
    }

    if (
        text.includes("build") ||
        text.includes("tạo")
    ) {
        return "Astra đã nhận nhiệm vụ build. Planner có thể chia nhiệm vụ thành các bước nhỏ.";
    }

    return [
        "Tôi chưa có AI provider khả dụng ở thời điểm này.",
        "Nhưng Brain Core vẫn đang hoạt động.",
        "Memory, learning, state và planner vẫn có thể tiếp tục xử lý."
    ].join(" ");
}

async function chat(options = {}) {
    return {
        text: localResponse(
            options.message
        ),

        degraded: true
    };
}

module.exports = {
    name: "local-fallback",
    chat,
    localResponse
};
