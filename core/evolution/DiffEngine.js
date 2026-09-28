"use strict";

class DiffEngine {

    compare(
        before = {},
        after = {}
    ) {

        const paths =
            new Set([
                ...Object.keys(before),
                ...Object.keys(after)
            ]);

        const files = [];

        for (const path of paths) {

            const oldContent =
                before[path];

            const newContent =
                after[path];

            if (
                oldContent ===
                newContent
            ) {
                continue;
            }

            let type;

            if (
                oldContent === undefined
            ) {
                type = "ADDED";

            } else if (
                newContent === undefined
            ) {
                type = "DELETED";

            } else {
                type = "MODIFIED";
            }

            files.push({
                path,
                type,
                oldContent:
                    oldContent ?? null,
                newContent:
                    newContent ?? null,

                statistics:
                    calculateStatistics(
                        oldContent || "",
                        newContent || ""
                    )
            });
        }

        return {

            changed:
                files.length > 0,

            fileCount:
                files.length,

            files,

            createdAt:
                new Date().toISOString()
        };
    }

    summary(diff) {

        const result = {

            added: 0,
            modified: 0,
            deleted: 0
        };

        for (
            const file of
            diff.files || []
        ) {

            if (
                file.type ===
                "ADDED"
            ) {
                result.added++;

            } else if (
                file.type ===
                "MODIFIED"
            ) {
                result.modified++;

            } else if (
                file.type ===
                "DELETED"
            ) {
                result.deleted++;
            }
        }

        return result;
    }
}

function calculateStatistics(
    oldText,
    newText
) {

    const oldLines =
        oldText
            ? oldText.split("\n")
            : [];

    const newLines =
        newText
            ? newText.split("\n")
            : [];

    return {

        oldLines:
            oldLines.length,

        newLines:
            newLines.length,

        addedLines:
            Math.max(
                0,
                newLines.length -
                oldLines.length
            ),

        removedLines:
            Math.max(
                0,
                oldLines.length -
                newLines.length
            )
    };
}

module.exports = {
    DiffEngine
};
