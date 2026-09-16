'use strict';

class ToolRegistry {
  constructor() {
    this.tools = new Map();
  }

  register(tool) {
    if (!tool || !tool.name) {
      throw new Error(
        'Tool must have a name'
      );
    }

    if (typeof tool.execute !== 'function') {
      throw new Error(
        `Tool "${tool.name}" must provide execute()`
      );
    }

    this.tools.set(
      tool.name,
      {
        name: tool.name,
        description:
          tool.description || '',
        permissions:
          tool.permissions || [],
        schema:
          tool.schema || null,
        execute:
          tool.execute
      }
    );
  }

  get(name) {
    return this.tools.get(name) || null;
  }

  has(name) {
    return this.tools.has(name);
  }

  list() {
    return Array.from(
      this.tools.values()
    ).map(tool => ({
      name: tool.name,
      description: tool.description,
      permissions: tool.permissions,
      schema: tool.schema
    }));
  }

  async execute(
    name,
    input,
    context = {}
  ) {
    const tool =
      this.get(name);

    if (!tool) {
      throw new Error(
        `Unknown tool: ${name}`
      );
    }

    return tool.execute(
      input,
      context
    );
  }
}

module.exports = {
  ToolRegistry
};
