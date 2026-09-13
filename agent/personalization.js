const fs = require("fs");
const path = require("path");

const FILE =
  path.join(
    __dirname,
    "..",
    "data",
    "personalization.json"
  );

const DEFAULTS = {
  language: "vi",
  preferredAddress: "",
  personality: "friendly",
  style: "natural",
  verbosity: "balanced",
  technicalLevel: "normal",

  preferences: {
    fullCode: true,
    preserveExistingFeatures: true
  },

  instructions: []
};

function ensure() {
  const dir =
    path.dirname(FILE);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {
      recursive: true
    });
  }

  if (!fs.existsSync(FILE)) {
    fs.writeFileSync(
      FILE,
      "{}",
      "utf8"
    );
  }
}

function load() {
  ensure();

  try {
    return JSON.parse(
      fs.readFileSync(
        FILE,
        "utf8"
      )
    );
  } catch {
    return {};
  }
}

function save(data) {
  fs.writeFileSync(
    FILE,
    JSON.stringify(
      data,
      null,
      2
    ),
    "utf8"
  );
}

function get(userId) {
  const data = load();

  return {
    ...DEFAULTS,
    ...(data[String(userId)] || {})
  };
}

function update(
  userId,
  changes
) {
  const data = load();

  const id =
    String(userId);

  data[id] = {
    ...get(userId),
    ...changes
  };

  save(data);

  return data[id];
}

module.exports = {
  get,
  update
};
