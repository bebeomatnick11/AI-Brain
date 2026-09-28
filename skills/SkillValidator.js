"use strict";

class SkillValidator {

    constructor(options = {}) {

        this.maxCodeLength =
            options.maxCodeLength || 100_000;

        this.allowedLevels =
            new Set([1, 2, 3]);
    }

    validateDefinition(skill = {}) {

        const errors = [];

        if (
            !skill.name ||
            typeof skill.name !== "string"
        ) {
            errors.push({
                code: "NAME_REQUIRED",
                message: "Skill name is required."
            });
        }

        const level =
            Number(skill.level || 1);

        if (
            !this.allowedLevels.has(level)
        ) {
            errors.push({
                code: "INVALID_LEVEL",
                message: "Skill level must be 1, 2 or 3."
            });
        }

        if (
            skill.permissions &&
            !Array.isArray(skill.permissions)
        ) {
            errors.push({
                code: "INVALID_PERMISSIONS",
                message: "permissions must be an array."
            });
        }

        if (
            skill.capabilities &&
            !Array.isArray(skill.capabilities)
        ) {
            errors.push({
                code: "INVALID_CAPABILITIES",
                message: "capabilities must be an array."
            });
        }

        if (
            level === 2 &&
            typeof skill.code !== "string"
        ) {
            errors.push({
                code: "CODE_REQUIRED",
                message:
                    "Level 2 user-coded Skills require code."
            });
        }

        if (
            typeof skill.code === "string" &&
            skill.code.length >
            this.maxCodeLength
        ) {
            errors.push({
                code: "CODE_TOO_LARGE",
                message:
                    "Skill code exceeds the maximum size."
            });
        }

        return {
            valid:
                errors.length === 0,

            errors
        };
    }

    validateCode(code) {

        if (
            typeof code !== "string"
        ) {
            return {
                valid: false,
                errors: [
                    {
                        code: "INVALID_CODE",
                        message:
                            "Code must be a string."
                    }
                ]
            };
        }

        if (
            code.length >
            this.maxCodeLength
        ) {
            return {
                valid: false,
                errors: [
                    {
                        code: "CODE_TOO_LARGE",
                        message:
                            "Code exceeds the maximum size."
                    }
                ]
            };
        }

        try {

            /*
             * Syntax validation only.
             * NEVER execute user code here.
             */

            new Function(
                `"use strict";\n${code}`
            );

            return {
                valid: true,
                errors: []
            };

        } catch (error) {

            return {
                valid: false,
                errors: [
                    {
                        code: "SYNTAX_ERROR",
                        message:
                            error.message
                    }
                ]
            };
        }
    }
}

module.exports = {
    SkillValidator
};
