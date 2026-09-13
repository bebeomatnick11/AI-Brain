function hasAny(text, words) {
  return words.some(word => text.includes(word));
}

function route(message) {
  const text = String(message || "").toLowerCase().trim();

  if (!text) {
    return {
      type: "empty",
      confidence: 1
    };
  }

  if (
    hasAny(text, [
      "nhớ rằng",
      "hãy nhớ",
      "ghi nhớ",
      "lưu lại",
      "remember that",
      "remember this"
    ])
  ) {
    return {
      type: "memory",
      action: "remember",
      confidence: 0.98
    };
  }

  if (
    hasAny(text, [
      "bạn nhớ gì",
      "mày nhớ gì",
      "anh đã bảo",
      "tôi đã bảo",
      "what do you remember",
      "do you remember"
    ])
  ) {
    return {
      type: "memory",
      action: "recall",
      confidence: 0.96
    };
  }

  if (
    hasAny(text, [
      "quên",
      "xóa ký ức",
      "forget",
      "clear memory"
    ])
  ) {
    return {
      type: "memory",
      action: "forget",
      confidence: 0.95
    };
  }

  if (
    hasAny(text, [
      "tạo skill",
      "tạo kỹ năng",
      "create skill",
      "make a skill"
    ])
  ) {
    return {
      type: "skill",
      action: "create",
      confidence: 0.97
    };
  }

  if (
    hasAny(text, [
      "code",
      "script",
      "lập trình",
      "viết script",
      "viết code",
      "javascript",
      "luau",
      "lua",
      "python"
    ])
  ) {
    return {
      type: "build",
      confidence: 0.9
    };
  }

  if (
    hasAny(text, [
      "tìm trên web",
      "tìm kiếm",
      "search",
      "research",
      "nghiên cứu"
    ])
  ) {
    return {
      type: "research",
      confidence: 0.9
    };
  }

  if (
    hasAny(text, [
      "phân tích",
      "analyze",
      "audit",
      "kiểm tra repo",
      "kiểm tra code"
    ])
  ) {
    return {
      type: "analysis",
      confidence: 0.88
    };
  }

  return {
    type: "chat",
    confidence: 0.65
  };
}

module.exports = {
  route
};
