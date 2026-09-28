"use strict";

class RollbackManager {

    constructor(options = {}) {

        this.audit =
            options.audit || null;

        this.versionManager =
            options.versionManager ||
            null;
    }

    async rollback(
        input = {},
        actor = {}
    ) {

        const {
            versionId,
            targetVersion,
            reason
        } = input;

        if (
            !targetVersion
        ) {

            throw new Error(
                "TARGET_VERSION_REQUIRED"
            );
        }

        /*
         * Quan trọng:
         *
         * rollback không xóa lịch sử.
         *
         * Nó tạo một operation mới
         * phục hồi state cũ.
         */

        let result = {

            operation:
                "ROLLBACK",

            versionId:
                versionId || null,

            targetVersion,

            reason:
                reason ||
                "manual rollback",

            status:
                "PREPARED",

            createdAt:
                new Date().toISOString()
        };

        if (
            this.versionManager
                ?.createRestoreVersion
        ) {

            result =
                await this.versionManager
                    .createRestoreVersion(
                        targetVersion,
                        {
                            reason:
                                reason ||
                                "rollback",

                            actor:
                                actor.id ||
                                null
                        }
                    );
        }

        await this.audit?.record(
            "version.rollback",
            result,
            actor
        );

        return result;
    }
}

module.exports = {
    RollbackManager
};
