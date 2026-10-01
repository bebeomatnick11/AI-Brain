'use strict';

const crypto = require('crypto');

class ExperimentWorkspace {
  constructor(options = {}) {
    this.workspaces = new Map();

    this.maxFiles =
      Number.isFinite(options.maxFiles)
        ? options.maxFiles
        : 1000;

    this.maxFileSize =
      Number.isFinite(options.maxFileSize)
        ? options.maxFileSize
        : 2 * 1024 * 1024;
  }

  create(input = {}) {
    const id =
      input.id ||
      `exp-ws-${crypto.randomUUID()}`;

    if (this.workspaces.has(id)) {
      throw new Error(`Workspace already exists: ${id}`);
    }

    const workspace = {
      id,

      experimentId:
        input.experimentId || null,

      ownerId:
        input.ownerId || null,

      name:
        input.name || 'Experiment Workspace',

      status: 'DRAFT',

      baseVersion:
        input.baseVersion || null,

      files: new Map(),

      changedFiles: new Set(),

      createdAt: new Date().toISOString(),

      updatedAt: new Date().toISOString()
    };

    this.workspaces.set(id, workspace);

    return this.snapshot(id);
  }

  get(id) {
    const workspace = this.workspaces.get(id);

    if (!workspace) {
      throw new Error(`Workspace not found: ${id}`);
    }

    return workspace;
  }

  has(id) {
    return this.workspaces.has(id);
  }

  writeFile(id, filePath, content) {
    const workspace = this.get(id);

    if (
      typeof filePath !== 'string' ||
      !filePath.trim()
    ) {
      throw new Error('Invalid file path');
    }

    if (typeof content !== 'string') {
      throw new Error('File content must be a string');
    }

    if (
      Buffer.byteLength(content, 'utf8') >
      this.maxFileSize
    ) {
      throw new Error('File exceeds workspace size limit');
    }

    if (
      !workspace.files.has(filePath) &&
      workspace.files.size >= this.maxFiles
    ) {
      throw new Error('Workspace file limit reached');
    }

    workspace.files.set(filePath, {
      path: filePath,
      content,
      updatedAt: new Date().toISOString()
    });

    workspace.changedFiles.add(filePath);

    workspace.updatedAt =
      new Date().toISOString();

    return {
      workspaceId: id,
      path: filePath,
      changed: true
    };
  }

  readFile(id, filePath) {
    const workspace = this.get(id);

    const file = workspace.files.get(filePath);

    if (!file) {
      return null;
    }

    return {
      ...file
    };
  }

  deleteFile(id, filePath) {
    const workspace = this.get(id);

    if (!workspace.files.has(filePath)) {
      return {
        deleted: false,
        reason: 'NOT_FOUND'
      };
    }

    workspace.files.delete(filePath);

    workspace.changedFiles.add(filePath);

    workspace.updatedAt =
      new Date().toISOString();

    return {
      deleted: true,
      path: filePath
    };
  }

  listFiles(id) {
    const workspace = this.get(id);

    return [...workspace.files.values()]
      .map(file => ({
        path: file.path,
        size: Buffer.byteLength(
          file.content,
          'utf8'
        ),
        updatedAt: file.updatedAt
      }));
  }

  getChangedFiles(id) {
    const workspace = this.get(id);

    return [...workspace.changedFiles];
  }

  markStatus(id, status) {
    const workspace = this.get(id);

    workspace.status = status;
    workspace.updatedAt =
      new Date().toISOString();

    return workspace.status;
  }

  clearChanges(id) {
    const workspace = this.get(id);

    workspace.changedFiles.clear();

    workspace.updatedAt =
      new Date().toISOString();
  }

  snapshot(id) {
    const workspace = this.get(id);

    return {
      id: workspace.id,
      experimentId: workspace.experimentId,
      ownerId: workspace.ownerId,
      name: workspace.name,
      status: workspace.status,
      baseVersion: workspace.baseVersion,
      files: [...workspace.files.values()]
        .map(file => ({
          path: file.path,
          content: file.content,
          updatedAt: file.updatedAt
        })),
      changedFiles: [
        ...workspace.changedFiles
      ],
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt
    };
  }

  destroy(id) {
    this.workspaces.delete(id);
  }
}

module.exports = ExperimentWorkspace;
