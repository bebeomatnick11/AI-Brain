"use strict";

class SkillArchitecturePlanner {

    constructor(options = {}) {

        this.capabilityRegistry =
            options.capabilityRegistry ||
            null;

        this.audit =
            options.audit ||
            null;
    }

    async plan(input = {}) {

        const requirements =
            input.requirements || {};

        const requestedCapabilities =
            Array.isArray(
                requirements.capabilities
            )
                ? requirements.capabilities
                : [];

        const capabilities =
            this.resolveCapabilities(
                requestedCapabilities
            );

        const permissions =
            this.resolvePermissions(
                requirements,
                capabilities
            );

        const level =
            this.chooseLevel(
                requirements
            );

        return {

            type:
                "SKILL",

            level,

            inputSchema:
                requirements.inputs ||
                {},

            outputSchema:
                requirements.outputs ||
                {},

            capabilities,

            permissions,

            dependencies:
                requirements.dependencies ||
                [],

            constraints:
                requirements.constraints ||
                [],

            verification: {

                syntax:
                    true,

                contract:
                    true,

                tests:
                    true,

                regression:
                    true
            },

            scope:
                "experiment"
        };
    }

    resolveCapabilities(
        requested
    ) {

        if (
            !this.capabilityRegistry
        ) {
            return requested;
        }

        return requested.filter(
            capability => {

                if (
                    this.capabilityRegistry
                        .get
                ) {

                    return Boolean(
                        this.capabilityRegistry
                            .get(
                                capability
                            )
                    );
                }

                return true;
            }
        );
    }

    resolvePermissions(
        requirements,
        capabilities
    ) {

        const requested =
            Array.isArray(
                requirements.permissions
            )
                ? requirements.permissions
                : [];

        /*
         * Không tự cấp quyền Core.
         */

        const forbidden = new Set([
            "core.modify",
            "security.manage",
            "permission.modify",
            "auth.modify",
            "secret.read",
            "sandbox.modify",
            "deployment.global"
        ]);

        return requested.filter(
            permission =>
                !forbidden.has(
                    permission
                )
        );
    }

    chooseLevel(
        requirements
    ) {

        if (
            requirements.userCode
        ) {
            return 2;
        }

        return 3;
    }
}

module.exports = {
    SkillArchitecturePlanner
};
