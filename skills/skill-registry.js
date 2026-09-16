'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR =
  process.env.DATA_DIR ||
  path.join(__dirname, '..', 'data');

const SKILLS_PATH =
  path.join(DATA_DIR, 'skills.json');

const MAX_NAME = 120;
const MAX_DESCRIPTION = 2000;
const MAX_INSTRUCTIONS = 20000;
const MAX_ARRAY = 50;

const BUILTIN_SKILLS = [
  {
    id: 'research',
    name: 'Research',
    type: 'builtin',
    ownerId: null,
    description:
      'Research and retrieve information.',
    version: '1.0.0',
    trigger: 'research',
    instructions:
      'Research the requested topic and return useful evidence.',
    permissions: [
      'web.read'
    ],
    tools: [
      'search'
    ],
    usageCount: 0,
    enabled: true
  },
  {
    id: 'analyze',
    name: 'Analyze',
    type: 'builtin',
    ownerId: null,
    description:
      'Analyze information and identify patterns.',
    version: '1.0.0',
    trigger: 'analyze',
    instructions:
      'Analyze the supplied information carefully and explain the reasoning.',
    permissions: [
      'knowledge.read'
    ],
    tools: [],
    usageCount: 0,
    enabled: true
  },
  {
    id: 'build',
    name: 'Build',
    type: 'builtin',
    ownerId: null,
    description:
      'Plan and build requested systems.',
    version: '1.0.0',
    trigger: 'build',
    instructions:
      'Break the requested build task into verifiable steps.',
    permissions: [
      'project.read',
      'project.write'
    ],
    tools: [],
    usageCount: 0,
    enabled: true
  },
  {
    id: 'code',
    name: 'Code',
    type: 'builtin',
    ownerId: null,
    description:
      'Write and modify code.',
    version: '1.0.0',
    trigger: 'code',
    instructions:
      'Produce correct, runnable code and explain important implementation details.',
    permissions: [
      'project.read',
      'project.write'
    ],
    tools: [],
    usageCount: 0,
    enabled: true
  },
  {
    id: 'debug',
    name: 'Debug',
    type: 'builtin',
    ownerId: null,
    description:
      'Find and repair software errors.',
    version: '1.0.0',
    trigger: 'debug',
    instructions:
      'Inspect the available evidence, identify the likely cause, apply a repair and verify it.',
    permissions: [
      'project.read',
      'project.write'
    ],
    tools: [],
    usageCount: 0,
    enabled: true
  },
  {
    id: 'observe',
    name: 'Observe',
    type: 'builtin',
    ownerId: null,
    description:
      'Observe and inspect available system state.',
    version: '1.0.0',
    trigger: 'observe',
    instructions:
      'Inspect the available state and report concrete observations.',
    permissions: [
      'system.read'
    ],
    tools: [],
    usageCount: 0,
    enabled: true
  }
];

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(
      DATA_DIR,
      {
        recursive: true
      }
    );
  }
}

function normalizeArray(
  value,
  maxLength = MAX_ARRAY,
  itemMax = 120
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(
      item =>
        String(item || '')
          .trim()
          .slice(0, itemMax)
    )
    .filter(Boolean)
    .slice(0, maxLength);
}

function cleanText(
  value,
  max
) {
  return String(
    value || ''
  )
    .trim()
    .slice(0, max);
}

function createId() {
  return (
    'skill_' +
    crypto
      .randomBytes(12)
      .toString('hex')
  );
}

function createDefaultSkill(skill) {
  const timestamp =
    new Date().toISOString();

  return {
    id: skill.id,
    name: skill.name,
    type: skill.type || 'builtin',
    ownerId:
      skill.ownerId || null,
    description:
      skill.description || '',
    version:
      skill.version || '1.0.0',
    trigger:
      skill.trigger || '',
    instructions:
      skill.instructions || '',
    permissions:
      Array.isArray(skill.permissions)
        ? skill.permissions
        : [],
    tools:
      Array.isArray(skill.tools)
        ? skill.tools
        : [],
    usageCount:
      Number(skill.usageCount || 0),
    enabled:
      skill.enabled !== false,
    createdAt:
      skill.createdAt || timestamp,
    updatedAt:
      skill.updatedAt || timestamp,
    lastUsedAt:
      skill.lastUsedAt || null
  };
}

function load() {
  ensureDir();

  try {
    if (
      !fs.existsSync(
        SKILLS_PATH
      )
    ) {
      const initial = {
        skills:
          BUILTIN_SKILLS.map(
            createDefaultSkill
          )
      };

      fs.writeFileSync(
        SKILLS_PATH,
        JSON.stringify(
          initial,
          null,
          2
        ),
        'utf8'
      );

      return initial;
    }

    const parsed =
      JSON.parse(
        fs.readFileSync(
          SKILLS_PATH,
          'utf8'
        )
      );

    if (
      !parsed ||
      !Array.isArray(
        parsed.skills
      )
    ) {
      return {
        skills:
          BUILTIN_SKILLS.map(
            createDefaultSkill
          )
      };
    }

    const existingIds =
      new Set(
        parsed.skills.map(
          skill => skill.id
        )
      );

    for (
      const builtin
      of BUILTIN_SKILLS
    ) {
      if (
        !existingIds.has(
          builtin.id
        )
      ) {
        parsed.skills.push(
          createDefaultSkill(
            builtin
          )
        );
      }
    }

    save(parsed);

    return parsed;

  } catch (error) {
    console.error(
      'Skill registry load error:',
      error.message
    );

    return {
      skills:
        BUILTIN_SKILLS.map(
          createDefaultSkill
        )
    };
  }
}

function save(db) {
  ensureDir();

  const tmp =
    SKILLS_PATH +
    '.tmp';

  fs.writeFileSync(
    tmp,
    JSON.stringify(
      db,
      null,
      2
    ),
    'utf8'
  );

  fs.renameSync(
    tmp,
    SKILLS_PATH
  );
}

let registry =
  load();

function list(options = {}) {
  let skills =
    registry.skills.slice();

  if (
    options.type ===
    'builtin'
  ) {
    skills =
      skills.filter(
        skill =>
          skill.type ===
          'builtin'
      );
  }

  if (
    options.type ===
    'user'
  ) {
    skills =
      skills.filter(
        skill =>
          skill.type ===
          'user'
      );
  }

  if (
    options.ownerId
  ) {
    skills =
      skills.filter(
        skill =>
          String(
            skill.ownerId || ''
          ) ===
          String(
            options.ownerId
          )
      );
  }

  if (
    options.query
  ) {
    const q =
      String(
        options.query
      )
        .trim()
        .toLowerCase();

    if (q) {
      skills =
        skills.filter(
          skill =>
            [
              skill.id,
              skill.name,
              skill.description,
              skill.trigger,
              skill.instructions,
              ...(skill.tools || []),
              ...(skill.permissions || [])
            ]
              .join(' ')
              .toLowerCase()
              .includes(q)
        );
    }
  }

  return skills.sort(
    (a, b) => {
      if (
        a.type !==
        b.type
      ) {
        return a.type ===
          'builtin'
          ? -1
          : 1;
      }

      return String(
        a.name
      ).localeCompare(
        String(b.name)
      );
    }
  );
}

function get(id) {
  return (
    registry.skills.find(
      skill =>
        skill.id ===
        String(id)
    ) || null
  );
}

function create(input) {
  if (
    !input ||
    typeof input !==
      'object'
  ) {
    throw new Error(
      'Invalid skill'
    );
  }

  const name =
    cleanText(
      input.name,
      MAX_NAME
    );

  if (!name) {
    throw new Error(
      'Skill name is required'
    );
  }

  const ownerId =
    String(
      input.ownerId || ''
    ).trim();

  if (!/^\d+$/.test(ownerId)) {
    throw new Error(
      'Valid ownerId is required'
    );
  }

  const timestamp =
    new Date().toISOString();

  const skill = {
    id:
      createId(),

    name,

    type:
      'user',

    ownerId,

    description:
      cleanText(
        input.description,
        MAX_DESCRIPTION
      ),

    version:
      cleanText(
        input.version || '1.0.0',
        40
      ),

    trigger:
      cleanText(
        input.trigger,
        200
      ),

    instructions:
      cleanText(
        input.instructions,
        MAX_INSTRUCTIONS
      ),

    permissions:
      normalizeArray(
        input.permissions,
        30,
        100
      ),

    tools:
      normalizeArray(
        input.tools,
        30,
        100
      ),

    usageCount: 0,

    enabled:
      input.enabled !== false,

    createdAt:
      timestamp,

    updatedAt:
      timestamp,

    lastUsedAt:
      null
  };

  registry.skills.push(
    skill
  );

  save(registry);

  return skill;
}

function update(
  id,
  input
) {
  const skill =
    get(id);

  if (!skill) {
    throw new Error(
      'Skill not found'
    );
  }

  if (
    skill.type ===
    'builtin'
  ) {
    throw new Error(
      'Built-in skills cannot be modified'
    );
  }

  if (
    input.name !==
    undefined
  ) {
    const name =
      cleanText(
        input.name,
        MAX_NAME
      );

    if (!name) {
      throw new Error(
        'Skill name is required'
      );

    skill.name =
      name;
  }

  if (
    input.description !==
    undefined
  ) {
    skill.description =
      cleanText(
        input.description,
        MAX_DESCRIPTION
      );
  }

  if (
    input.version !==
    undefined
  ) {
    skill.version =
      cleanText(
        input.version,
        40
      );
  }

  if (
    input.trigger !==
    undefined
  ) {
    skill.trigger =
      cleanText(
        input.trigger,
        200
      );
  }

  if (
    input.instructions !==
    undefined
  ) {
    skill.instructions =
      cleanText(
        input.instructions,
        MAX_INSTRUCTIONS
      );
  }

  if (
    input.permissions !==
    undefined
  ) {
    skill.permissions =
      normalizeArray(
        input.permissions,
        30,
        100
      );
  }

  if (
    input.tools !==
    undefined
  ) {
    skill.tools =
      normalizeArray(
        input.tools,
        30,
        100
      );
  }

  if (
    input.enabled !==
    undefined
  ) {
    skill.enabled =
      input.enabled === true;
  }

  skill.updatedAt =
    new Date().toISOString();

  save(registry);

  return skill;
}

function remove(id) {
  const index =
    registry.skills.findIndex(
      skill =>
        skill.id ===
        String(id)
    );

  if (index === -1) {
    throw new Error(
      'Skill not found'
    );
  }

  if (
    registry.skills[index]
      .type ===
    'builtin'
  ) {
    throw new Error(
      'Built-in skills cannot be deleted'
    );
  }

  const removed =
    registry.skills.splice(
      index,
      1
    )[0];

  save(registry);

  return removed;
}

function recordUsage(id) {
  const skill =
    get(id);

  if (!skill) {
    return null;
  }

  skill.usageCount =
    Number(
      skill.usageCount || 0
    ) + 1;

  skill.lastUsedAt =
    new Date().toISOString();

  skill.updatedAt =
    new Date().toISOString();

  save(registry);

  return skill;
}

function reload() {
  registry =
    load();

  return registry;
}

module.exports = {
  BUILTIN_SKILLS,
  list,
  get,
  create,
  update,
  remove,
  recordUsage,
  reload,
  getPath() {
    return SKILLS_PATH;
  }
};
