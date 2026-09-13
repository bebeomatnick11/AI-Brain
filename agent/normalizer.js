function normalizeText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

function normalizeUserId(value) {
  if (value === null || value === undefined) {
    return "anonymous";
  }

  const id = String(value).trim();

  if (!id) {
    return "anonymous";
  }

  return id.slice(0, 200);
}

function normalizeLanguage(value) {
  const language = normalizeText(value).toLowerCase();

  if (
    language.startsWith("vi") ||
    language.includes("vietnam")
  ) {
    return "vi";
  }

  if (
    language.startsWith("en") ||
    language.includes("english")
  ) {
    return "en";
  }

  return "auto";
}

function normalizeMessage(input) {
  if (typeof input === "string") {
    return normalizeText(input);
  }

  if (!input || typeof input !== "object") {
    return "";
  }

  return normalizeText(
    input.message ||
    input.prompt ||
    input.question ||
    input.content ||
    ""
  );
}

module.exports = {
  normalizeText,
  normalizeUserId,
  normalizeLanguage,
  normalizeMessage
};
