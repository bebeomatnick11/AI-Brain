"use strict";

const vm = require("vm");

const DEFAULT_TIMEOUT = 2_000;

const FORBIDDEN_CAPABILITIES =
    new Set([
        "filesystem.write",
        "filesystem.delete",
        "process.spawn",
        "process.exec",
        "shell",
        "network.raw",
        "secret.read",
        "auth.modify",
        "permission.modify",
        "sandbox.modify",
        "core.modify",
        "deployment.global"
    ]);

class SkillSandbox {

    constructor(options = {}) {

        this.timeout =
            Math.min(
                Number(
                    options.timeout ||
                    DEFAULT_TIMEOUT
                ),
                10_000
            );

        this.maxOutputSize =
            options.maxOutputSize ||
            100_000;

        this.capabilities =
            options.capabilities || {};
    }

    async execute(
        input = {}
    ) {

        const {

            code,

            args = {},

            permissions = [],

            capabilities = [],

            timeout =
                this.timeout

        } = input;

        if (
            typeof code !==
            "string"
        ) {
            throw new Error(
                "SKILL_CODE_REQUIRED"
            );
        }

        this.checkCapabilities(
            capabilities
        );

        const safePermissions =
            Array.isArray(
                permissions
            )
                ? permissions
                : [];

        const sandbox =
            this.createContext({
                args,
                permissions:
                    safePermissions,
                capabilities
            });

        const wrapped = `
            "use strict";

            (async () => {

                ${code}

                if (
                    typeof main === "function"
                ) {
                    return await main(args);
                }

                return undefined;

            })()
        `;

        const script =
            new vm.Script(
                wrapped,
                {
                    filename:
                        "skill.sandbox.js"
                }
            );

        let result;

        try {

            result =
                await Promise.race([

                    Promise.resolve(
                        script.runInContext(
                            sandbox,
                            {
                                timeout
                            }
                        )
                    ),

                    new Promise(
                        (_, reject) => {

                            setTimeout(
                                () => {
                                    reject(
                                        new Error(
                                            "SKILL_TIMEOUT"
                                        )
                                    );
                                },
                                timeout
                            );
                        }
                    )
                ]);

        } catch (error) {

            throw normalizeExecutionError(
                error
            );
        }

        return limitOutput(
            result,
            this.maxOutputSize
        );
    }

    checkCapabilities(
        capabilities
    ) {

        for (
            const capability of
            capabilities || []
        ) {

            if (
                FORBIDDEN_CAPABILITIES
                    .has(capability)
            ) {

                throw new Error(
                    `CAPABILITY_BLOCKED:${capability}`
                );
            }
        }
    }

    createContext(
        input
    ) {

        const safeConsole = {

            log: (...args) =>
                console.log(
                    "[SKILL]",
                    ...args
                ),

            warn: (...args) =>
                console.warn(
                    "[SKILL]",
                    ...args
                ),

            error: (...args) =>
                console.error(
                    "[SKILL]",
                    ...args
                )
        };

        return vm.createContext({

            args:
                deepFreeze(
                    input.args
                ),

            permissions:
                Object.freeze(
                    [...input.permissions]
                ),

            capabilities:
                Object.freeze(
                    [...input.capabilities]
                ),

            console:
                safeConsole,

            Math,

            JSON,

            Date,

            Promise,

            setTimeout,

            clearTimeout
        });
    }
}

function normalizeExecutionError(
    error
) {

    return Object.assign(
        new Error(
            error?.message ||
            "SKILL_EXECUTION_FAILED"
        ),
        {
            code:
                error?.code ||
                "SKILL_EXECUTION_FAILED",

            cause:
                error
        }
    );
}

function limitOutput(
    value,
    maxSize
) {

    if (
        value === undefined
    ) {
        return undefined;
    }

    let serialized;

    try {

        serialized =
            JSON.stringify(
                value
            );

    } catch {

        throw new Error(
            "SKILL_OUTPUT_NOT_SERIALIZABLE"
        );
    }

    if (
        serialized.length >
        maxSize
    ) {

        throw new Error(
            "SKILL_OUTPUT_TOO_LARGE"
        );
    }

    return value;
}

function deepFreeze(value) {

    if (
        !value ||
        typeof value !==
        "object"
    ) {
        return value;
    }

    Object.freeze(value);

    for (
        const child of
        Object.values(value)
    ) {
        deepFreeze(child);
    }

    return value;
}

module.exports = {
    SkillSandbox
};
