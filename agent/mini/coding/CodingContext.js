"use strict";

class CodingContext {

    constructor(input = {}) {

        this.workspaceId =
            input.workspaceId ||
            null;

        this.files =
            input.files || {};

        this.requirements =
            input.requirements || {};

        this.errors =
            input.errors || [];

        this.tests =
            input.tests || [];

        this.dependencies =
            input.dependencies || [];

        this.changedFiles =
            input.changedFiles || [];

        this.metadata =
            input.metadata || {};
    }

    addError(error) {

        this.errors.push(
            error
        );
    }

    addChangedFile(path) {

        if (
            !this.changedFiles
                .includes(path)
        ) {

            this.changedFiles.push(
                path
            );
        }
    }

    toJSON() {

        return {

            workspaceId:
                this.workspaceId,

            files:
                Object.keys(
                    this.files
                ),

            requirements:
                this.requirements,

            errors:
                this.errors,

            tests:
                this.tests,

            dependencies:
                this.dependencies,

            changedFiles:
                this.changedFiles,

            metadata:
                this.metadata
        };
    }
}

module.exports = {
    CodingContext
};
