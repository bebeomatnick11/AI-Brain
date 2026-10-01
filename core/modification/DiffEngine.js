'use strict';

class DiffEngine {
  compare(oldContent = '', newContent = '') {
    const oldLines =
      String(oldContent).split('\n');

    const newLines =
      String(newContent).split('\n');

    const max =
      Math.max(
        oldLines.length,
        newLines.length
      );

    const changes = [];

    for (let i = 0; i < max; i++) {
      const oldLine =
        oldLines[i];

      const newLine =
        newLines[i];

      if (oldLine === newLine) {
        continue;
      }

      if (
        oldLine !== undefined
      ) {
        changes.push({
          type: 'REMOVE',
          line: i + 1,
          content: oldLine
        });
      }

      if (
        newLine !== undefined
      ) {
        changes.push({
          type: 'ADD',
          line: i + 1,
          content: newLine
        });
      }
    }

    return {
      changed:
        changes.length > 0,

      additions:
        changes.filter(
          c => c.type === 'ADD'
        ).length,

      removals:
        changes.filter(
          c => c.type === 'REMOVE'
        ).length,

      changes
    };
  }

  createFileDiff(
    path,
    oldContent,
    newContent
  ) {
    return {
      path,

      oldContent:
        oldContent ?? null,

      newContent:
        newContent ?? null,

      diff:
        this.compare(
          oldContent || '',
          newContent || ''
        )
    };
  }

  summarize(changeSet) {
    const files =
      changeSet.files || [];

    return {
      filesChanged:
        files.length,

      additions:
        files.reduce(
          (sum, file) =>
            sum +
            (
              file.diff?.additions ||
              0
            ),
          0
        ),

      removals:
        files.reduce(
          (sum, file) =>
            sum +
            (
              file.diff?.removals ||
              0
            ),
          0
        )
    };
  }
}

module.exports = DiffEngine;
