function verify({
  userMessage,
  response,
  route
}) {
  const text =
    String(response || "").toLowerCase();

  const leaks = [
    "tác vụ hoàn tất",
    "workspace/system_output",
    "skill không tồn tại",
    "skill not found",
    "task completed successfully"
  ];

  const leaked =
    leaks.some(x =>
      text.includes(x)
    );

  if (
    route.type === "casual" &&
    leaked
  ) {
    return {
      ok: false,
      reason: "SKILL_OR_TASK_LEAK"
    };
  }

  if (!response.trim()) {
    return {
      ok: false,
      reason: "EMPTY_RESPONSE"
    };
  }

  return {
    ok: true
  };
}

module.exports = {
  verify
};
