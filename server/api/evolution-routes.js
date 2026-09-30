"use strict";

function registerEvolutionRoutes(
    app,
    runtime,
    options = {}
) {

    const requireAuth =
        options.requireAuth ||
        defaultAuth;

    const requirePermission =
        options.requirePermission ||
        defaultPermission;

    /*
     * ERROR CENTER
     */

    app.post(
    "/api/evolution/skill-builder/test/:id",
    requireAuth,
    requirePermission("skill.run"),
    async (req, res) => {

        try {

            const skill =
                runtime.skills.get(
                    req.params.id
                );

            if (!skill) {

                return res
                    .status(404)
                    .json({
                        error:
                            "SKILL_NOT_FOUND"
                    });
            }

            const result =
                await runtime
                    .skillBuildPipeline
                    .test(
                        skill,
                        req.body?.inputs ||
                        [{}],
                        req.user
                    );

            res.json(result);

        } catch (error) {

            res.status(400).json({
                error:
                    error.message
            });
        }
    }
);
    app.post(
    "/api/evolution/coding/repair",
    requireAuth,
    requirePermission("change.propose"),
    async (req, res) => {

        try {

            const result =
                await runtime
                    .codingPipeline
                    .run(
                        req.body || {},
                        req.user
                    );

            res.json(result);

        } catch (error) {

            res.status(400).json({
                error:
                    error.message
            });
        }
    }
);
    app.post(
    "/api/evolution/skill-builder/approve",
    requireAuth,
    requirePermission("skill.create"),
    async (req, res) => {

        try {

            const skill =
                await runtime
                    .skillBuildPipeline
                    .approve(
                        req.body,
                        req.user
                    );

            res.status(201).json(
                skill
            );

        } catch (error) {

            res.status(400).json({
                error:
                    error.message
            });
        }
    }
);
    app.post(
    "/api/evolution/skill-builder",
    requireAuth,
    requirePermission("skill.create"),
    async (req, res) => {

        try {

            const result =
                await runtime
                    .skillBuildPipeline
                    .build(
                        req.body?.request,
                        req.body?.context ||
                        {},
                        req.user
                    );

            res.status(201).json(
                result
            );

        } catch (error) {

            res.status(400).json({
                error:
                    error.message
            });
        }
    }
);
    app.post(
    "/api/evolution/workspaces/:id/coding-loop",
    requireAuth,
    requirePermission("change.propose"),
    async (req, res) => {

        try {

            const workspace =
                runtime.modification
                    .workspace
                    .get(
                        req.params.id
                    );

            if (!workspace) {

                return res
                    .status(404)
                    .json({
                        error:
                            "WORKSPACE_NOT_FOUND"
                    });
            }

            /*
             * Repairer thực tế sẽ được
             * nối với Coding Agent ở Pack 4.
             *
             * Hiện tại không giả vờ rằng
             * AI repair đã tồn tại.
             */

            const result =
                await runtime
                    .codingLoop
                    .run(
                        workspace,
                        req.body ||
                        {},
                        null,
                        req.user
                    );

            res.json(result);

        } catch (error) {

            res.status(400).json({
                error:
                    error.message
            });
        }
    }
);
    app.post(
    "/api/evolution/skills/:id/run",
    requireAuth,
    requirePermission("skill.run"),
    async (req, res) => {

        try {

            const skill =
                runtime.skills.get(
                    req.params.id
                );

            if (!skill) {

                return res
                    .status(404)
                    .json({
                        error:
                            "SKILL_NOT_FOUND"
                    });
            }

            const result =
                await runtime
                    .skillExecutor
                    .run(
                        skill,
                        req.body?.input ||
                        {},
                        req.user
                    );

            res.json(result);

        } catch (error) {

            res.status(400).json({
                error:
                    error.message
            });
        }
    }
);
    app.post(
        "/api/evolution/errors",
        requireAuth,
        requirePermission("error.report"),
        async (req, res) => {

            try {

                const result =
                    await runtime.reportError(
                        req.body || {}
                    );

                res
                    .status(
                        result.requiresApproval
                            ? 202
                            : 201
                    )
                    .json(result);

            } catch (error) {

                res.status(500).json({
                    error:
                        "ERROR_REPORT_FAILED"
                });
            }
        }
    );

    /*
     * PRIVATE ERROR LIST
     */

    app.get(
        "/api/evolution/errors",
        requireAuth,
        requirePermission("error.view.private"),
        async (req, res) => {

            if (!runtime.db?.query) {

                return res.status(503).json({
                    error:
                        "DATABASE_UNAVAILABLE"
                });
            }

            const result =
                await runtime.db.query(
                    `
                    SELECT *
                    FROM error_events
                    ORDER BY created_at DESC
                    LIMIT 100
                    `
                );

            res.json({
                errors:
                    result.rows
            });
        }
    );

    /*
     * SKILLS
     */

    app.post(
        "/api/evolution/skills",
        requireAuth,
        requirePermission("skill.create"),
        async (req, res) => {

            try {

                const skill =
                    await runtime.createSkill(
                        req.body || {},
                        req.user
                    );

                res.status(201).json(
                    skill
                );

            } catch (error) {

                res.status(400).json({
                    error:
                        error.message
                });
            }
        }
    );

    app.get(
        "/api/evolution/skills",
        requireAuth,
        requirePermission("skill.view"),
        async (req, res) => {

            res.json({
                skills:
                    runtime.skills.list()
            });
        }
    );

    /*
     * EXPERIMENT
     */

    app.post(
        "/api/evolution/experiments",
        requireAuth,
        requirePermission("experiment.use"),
        async (req, res) => {

            try {

                const experiment =
                    await runtime.createExperiment(
                        req.body || {},
                        req.user
                    );

                res.status(201).json(
                    experiment
                );

            } catch (error) {

                res.status(400).json({
                    error:
                        error.message
                });
            }
        }
    );

    app.get(
        "/api/evolution/experiments/:id",
        requireAuth,
        requirePermission("experiment.use"),
        (req, res) => {

            const experiment =
                runtime.experiments.get(
                    req.params.id
                );

            if (!experiment) {

                return res
                    .status(404)
                    .json({
                        error:
                            "EXPERIMENT_NOT_FOUND"
                    });
            }

            res.json(
                experiment
            );
        }
    );

    /*
     * SAFETY FILTER
     */

    app.patch(
        "/api/evolution/experiments/:id/policy",
        requireAuth,
        requirePermission("experiment.use"),
        (req, res) => {

            try {

                const experiment =
                    runtime.experiments
                        .updatePolicy(
                            req.params.id,
                            req.body || {},
                            req.user
                        );

                res.json({
                    experimentId:
                        experiment.id,

                    policy:
                        experiment.policy
                });

            } catch (error) {

                res.status(400).json({
                    error:
                        error.message
                });
            }
        }
    );

    /*
     * CREATE SKILL INSIDE LAB
     */

    app.post(
        "/api/evolution/experiments/:id/skills",
        requireAuth,
        requirePermission("experiment.use"),
        async (req, res) => {

            try {

                const skill =
                    await runtime.experiments
                        .createSkill(
                            req.params.id,
                            req.body || {},
                            req.user
                        );

                res.status(201).json(
                    skill
                );

            } catch (error) {

                res.status(400).json({
                    error:
                        error.message
                });
            }
        }
    );

    /*
     * CHANGE PROPOSAL
     */

    app.post(
        "/api/evolution/changes",
        requireAuth,
        requirePermission("change.propose"),
        async (req, res) => {

            try {

                const proposal =
                    await runtime
                        .createChangeProposal(
                            req.body || {},
                            req.user
                        );

                res.status(201).json(
                    proposal
                );

            } catch (error) {

                res.status(400).json({
                    error:
                        error.message
                });
            }
        }
    );
}

function defaultAuth(
    req,
    res,
    next
) {

    req.user =
        req.user || {
            id: "local-owner",
            role: "Owner"
        };

    next();
}

function defaultPermission(
    permission
) {

    return (
        req,
        res,
        next
    ) => {

        /*
         * CHỈ LÀ FALLBACK CHO MODULE TEST.
         *
         * Khi nối vào AI-Brain thật,
         * thay bằng PermissionEngine hiện tại.
         */

        if (!req.user) {

            return res
                .status(401)
                .json({
                    error:
                        "AUTH_REQUIRED"
                });
        }

        next();
    };
}

module.exports = {
    registerEvolutionRoutes
};
