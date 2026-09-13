const fs = require("fs");
const path = require("path");

const userSkillFile =
  path.join(
    __dirname,
    "..",
    "data",
    "user-skills.json"
  );

const systemSkillDir =
  path.join(
    __dirname,
    "..",
    "skills"
  );

function ensureUserSkillFile() {
  const dir =
    path.dirname(userSkillFile);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {
      recursive: true
    });
  }

  if (!fs.existsSync(userSkillFile)) {
    fs.writeFileSync(
      userSkillFile,
      "{}",
      "utf8"
    );
  }
}

function loadUserSkills() {
  ensureUserSkillFile();

  try {
    return JSON.parse(
      fs.readFileSync(
        userSkillFile,
        "utf8"
      )
    );
  } catch {
    return {};
  }
}

function loadSystemSkills() {
  if (!fs.existsSync(systemSkillDir)) {
    return [];
  }

  return fs.readdirSync(
    systemSkillDir
  )
    .filter(
      file =>
        file.endsWith(".js")
    )
    .map(file => {
      try {
        return {
          ...require(
            path.join(
              systemSkillDir,
              file
            )
          ),
          source: "system"
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function getSkills(
  userId,
  sessionSkills = []
) {
  const users =
    loadUserSkills();

  const user =
    users[String(userId)];

  const userSkills =
    user?.skills || [];

  return [
    ...loadSystemSkills(),

    ...userSkills
      .filter(x => x.enabled)
      .map(x => ({
        ...x,
        source: "user"
      })),

    ...sessionSkills.map(x => ({
      ...x,
      source: "session"
    }))
  ];
}

module.exports = {
  getSkills,
  loadSystemSkills,
  loadUserSkills
};
