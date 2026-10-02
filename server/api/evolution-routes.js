"use strict";

/*
 * ============================================================
 * ASTRA BRAIN — EVOLUTION HTTP ROUTES
 * ============================================================
 *
 * Express routes cho Evolution Runtime.
 *
 * Flow:
 *
 * Permission
 *     ↓
 * Workspace
 *     ↓
 * Snapshot / Edit
 *     ↓
 * Diff
 *     ↓
 * Verify
 *     ↓
 * Change Proposal
 *     ↓
 * Approval
 *     ↓
 * Version
 *     ↓
 * Canary
 *     ↓
 * Deployment
 *     ↓
 * Rollback
 *
 * Route này KHÔNG tự tạo EvolutionRuntime.
 * Nó nhận runtime từ server.js.
 * ============================================================
 */


/* ============================================================
 * HELPERS
 * ============================================================
 */

function safeObject(value) {

    if (
        value &&
        typeof value === "object"
    ) {
        return value;
    }

    return {};
}


function safeArray(value) {

    return Array.isArray(value)
        ? value
        : [];
}


function getUser(req) {

    return (
        req.user ||
        req.auth ||
        {
            id:
                "local-owner",

            role:
                "Owner"
        }
    );
}


function getActor(req) {

    const user =
        getUser(req);

    return {

        id:
            user.id ||
            user.userId ||
            "local-owner",

        userId:
            user.userId ||
            user.id ||
            "local-owner",

        username:
            user.username ||
            user.name ||
            "local-owner",

        role:
            user.role ||
            "Owner",

        permissions:
            safeArray(
                user.permissions
            )
    };
}


/* ============================================================
 * DEFAULT AUTH
 *
 * Server có thể truyền auth middleware riêng qua options.auth.
 * ============================================================
 */

function defaultAuth(
    req,
    res,
    next
) {

    if (!req.user) {

        req.user = {
            id:
                "local-owner",

            role:
                "Owner",

            permissions:
                ["*"]
        };
    }

    next();
}


/* ============================================================
 * PERMISSION ENGINE
 * ============================================================
 */

function createPermissionMiddleware(
    runtime,
    permission,
    options = {}
) {

    return async function (
        req,
        res,
        next
    ) {

        const actor =
            getActor(req);

        /*
         * Owner wildcard.
         */

        if (
            actor.role === "Owner" ||
            actor.permissions.includes("*")
        ) {

            return next();
        }


        /*
         * Nếu server đã truyền permission
         * middleware riêng thì ưu tiên nó.
         */

        if (
            typeof options.requirePermission ===
                "function"
        ) {

            try {

                const allowed =
                    await options.requirePermission(
                        req,
                        permission,
                        runtime
                    );

                if (allowed === true) {
                    return next();
                }

                return res.status(403).json({

                    success:
                        false,

                    error:
                        "PERMISSION_DENIED",

                    permission
                });

            } catch (error) {

                return res.status(403).json({

                    success:
                        false,

                    error:
                        error.message ||
                        "PERMISSION_DENIED"
                });
            }
        }


        /*
         * Nếu runtime có PermissionEngine.
         */

        const engine =
            runtime &&
            (
                runtime.permissionEngine ||
                runtime.permissions
            );


        if (engine) {

            try {

                let allowed = false;

                if (
                    typeof engine.can ===
                        "function"
                ) {

                    allowed =
                        await engine.can(
                            actor,
                            permission,
                            req.body || {}
                        );

                } else if (
                    typeof engine.check ===
                        "function"
                ) {

                    allowed =
                        await engine.check(
                            actor,
                            permission,
                            req.body || {}
                        );

                } else if (
                    typeof engine.authorize ===
                        "function"
                ) {

                    allowed =
                        await engine.authorize(
                            actor,
                            permission,
                            req.body || {}
                        );
                }

                if (allowed === true) {
                    return next();
                }

            } catch (error) {

                return res.status(403).json({

                    success:
                        false,

                    error:
                        error.message ||
                        "PERMISSION_DENIED"
                });
            }
        }


        /*
         * Fail closed.
         *
         * Nếu là mutation mà không có permission
         * system thì không tự cho phép.
         */

        if (
            options.allowWithoutPermission ===
                true
        ) {

            return next();
        }

        return res.status(403).json({

            success:
                false,

            error:
                "PERMISSION_ENGINE_REQUIRED",

            permission
        });
    };
}


/* ============================================================
 * SECURITY GATE
 * ============================================================
 */

function createSecurityMiddleware(
    runtime,
    action
) {

    return async function (
        req,
        res,
        next
    ) {

        const gate =
            runtime &&
            (
                runtime.securityGate ||
                runtime.security
            );


        /*
         * Không có SecurityGate thì không tự
         * giả vờ rằng request đã được kiểm tra.
         *
         * Owner vẫn có thể tiếp tục nếu không có
         * security gate hiện tại, nhưng request
         * được đánh dấu để runtime/audit biết.
         */

        if (!gate) {

            req.evolutionSecurity = {

                checked:
                    false,

                reason:
                    "SECURITY_GATE_NOT_CONFIGURED",

                action
            };

            return next();
        }


        try {

            let result;

            if (
                typeof gate.check ===
                    "function"
            ) {

                result =
                    await gate.check({

                        action,

                        actor:
                            getActor(req),

                        input:
                            req.body || {},

                        request:
                            req
                    });

            } else if (
                typeof gate.evaluate ===
                    "function"
            ) {

                result =
                    await gate.evaluate({

                        action,

                        actor:
                            getActor(req),

                        input:
                            req.body || {},

                        request:
                            req
                    });

            } else {

                result = {
                    allowed:
                        true
                };
            }


            if (
                result &&
                result.allowed === false
            ) {

                return res.status(403).json({

                    success:
                        false,

                    error:
                        "SECURITY_GATE_BLOCKED",

                    reason:
                        result.reason ||
                        null
                });
            }


            req.evolutionSecurity =
                result || {
                    allowed:
                        true
                };

            return next();

        } catch (error) {

            return res.status(403).json({

                success:
                    false,

                error:
                    "SECURITY_GATE_ERROR",

                message:
                    error.message ||
                    String(error)
            });
        }
    };
}


/* ============================================================
 * ERROR RESPONSE
 * ============================================================
 */

function sendError(
    res,
    error,
    status = 500
) {

    return res.status(status).json({

        success:
            false,

        error:
            error?.code ||
            "EVOLUTION_ERROR",

        message:
            error?.message ||
            String(error)
    });
}


/* ============================================================
 * REGISTER ROUTES
 * ============================================================
 */

function registerEvolutionRoutes(
    app,
    runtime,
    options = {}
) {

    if (!app) {
        throw new Error(
            "registerEvolutionRoutes: Express app is required"
        );
    }


    if (!runtime) {
        throw new Error(
            "registerEvolutionRoutes: EvolutionRuntime is required"
        );
    }


    /*
     * --------------------------------------------------------
     * AUTH
     * --------------------------------------------------------
     */

    const auth =
        options.auth ||
        defaultAuth;


    /*
     * --------------------------------------------------------
     * PERMISSION FACTORY
     * --------------------------------------------------------
     */

    const permission =
        (
            name,
            config = {}
        ) =>
            createPermissionMiddleware(
                runtime,
                name,
                {
                    ...options,
                    ...config
                }
            );


    const security =
        action =>
            createSecurityMiddleware(
                runtime,
                action
            );


    /*
     * ========================================================
     * STATUS
     * ========================================================
     */

    app.get(
        "/api/evolution/status",
        auth,
        async (
            req,
            res
        ) => {

            try {

                if (
                    typeof runtime.getStatus ===
                        "function"
                ) {

                    return res.json({

                        success:
                            true,

                        runtime:
                            runtime.getStatus()
                    });
                }


                return res.json({

                    success:
                        true,

                    status:
                        "ready"
                });

            } catch (error) {

                return sendError(
                    res,
                    error
                );
            }
        }
    );


    /*
     * ========================================================
     * ERROR REPORT
     * ========================================================
     */

    app.post(
        "/api/evolution/errors",
        auth,
        permission(
            "evolution.error.report",
            {
                allowWithoutPermission:
                    true
            }
        ),
        async (
            req,
            res
        ) => {

            try {

                const result =
                    await runtime.reportError(
                        req.body
                    );

                return res.json({

                    success:
                        true,

                    result
                });

            } catch (error) {

                return sendError(
                    res,
                    error
                );
            }
        }
    );


    /*
     * ========================================================
     * ERROR LIST
     * ========================================================
     */

    app.get(
        "/api/evolution/errors",
        auth,
        permission(
            "evolution.error.read",
            {
                allowWithoutPermission:
                    true
            }
        ),
        async (
            req,
            res
        ) => {

            try {

                const center =
                    runtime.errorCenter;

                if (
                    !center
                ) {

                    return res.json({

                        success:
                            true,

                        errors:
                            []
                    });
                }


                let result = [];


                if (
                    typeof center.list ===
                        "function"
                ) {

                    result =
                        await center.list(
                            req.query || {}
                        );

                } else if (
                    typeof center.getAll ===
                        "function"
                ) {

                    result =
                        await center.getAll(
                            req.query || {}
                        );
                }


                return res.json({

                    success:
                        true,

                    errors:
                        result
                });

            } catch (error) {

                return sendError(
                    res,
                    error
                );
            }
        }
    );


    /*
     * ========================================================
     * CREATE SKILL
     * ========================================================
     */

    app.post(
        "/api/evolution/skills",
        auth,
        permission(
            "skill.create"
        ),
        security(
            "skill.create"
        ),
        async (
            req,
            res
        ) => {

            try {

                const result =
                    await runtime.createSkill(
                        req.body || {},
                        getActor(req)
                    );

                return res.status(201).json({

                    success:
                        true,

                    skill:
                        result
                });

            } catch (error) {

                return sendError(
                    res,
                    error
                );
            }
        }
    );


    /*
     * ========================================================
     * LIST SKILLS
     * ========================================================
     */

    app.get(
        "/api/evolution/skills",
        auth,
        permission(
            "skill.read",
            {
                allowWithoutPermission:
                    true
            }
        ),
        async (
            req,
            res
        ) => {

            try {

                const registry =
                    runtime.skills;

                let result = [];


                if (
                    registry &&
                    typeof registry.list ===
                        "function"
                ) {

                    result =
                        await registry.list(
                            req.query || {}
                        );

                } else if (
                    registry &&
                    typeof registry.getAll ===
                        "function"
                ) {

                    result =
                        await registry.getAll();
                }


                return res.json({

                    success:
                        true,

                    skills:
                        result
                });

            } catch (error) {

                return sendError(
                    res,
                    error
                );
            }
        }
    );


    /*
     * ========================================================
     * RUN SKILL
     * ========================================================
     */

    app.post(
        "/api/evolution/skills/:id/run",
        auth,
        permission(
            "skill.run"
        ),
        security(
            "skill.run"
        ),
        async (
            req,
            res
        ) => {

            try {

                const id =
                    req.params.id;

                const executor =
                    runtime.skillExecutor;

                if (
                    !executor
                ) {

                    return res.status(503).json({

                        success:
                            false,

                        error:
                            "SKILL_EXECUTOR_UNAVAILABLE"
                    });
                }


                let result;


                if (
                    typeof executor.run ===
                        "function"
                ) {

                    result =
                        await executor.run(
                            id,
                            req.body || {},
                            getActor(req)
                        );

                } else if (
                    typeof executor.execute ===
                        "function"
                ) {

                    result =
                        await executor.execute(
                            id,
                            req.body || {},
                            getActor(req)
                        );

                } else {

                    return res.status(501).json({

                        success:
                            false,

                        error:
                            "SKILL_EXECUTOR_CONTRACT_UNSUPPORTED"
                    });
                }


                return res.json({

                    success:
                        true,

                    result
                });

            } catch (error) {

                return sendError(
                    res,
                    error
                );
            }
        }
    );


    /*
     * ========================================================
     * CREATE EXPERIMENT
     * ========================================================
     */

    app.post(
        "/api/evolution/experiments",
        auth,
        permission(
            "experiment.create"
        ),
        security(
            "experiment.create"
        ),
        async (
            req,
            res
        ) => {

            try {

                const result =
                    await runtime.createExperiment(
                        req.body || {},
                        getActor(req)
                    );

                return res.status(201).json({

                    success:
                        true,

                    experiment:
                        result
                });

            } catch (error) {

                return sendError(
                    res,
                    error
                );
            }
        }
    );


    /*
     * ========================================================
     * GET EXPERIMENT
     * ========================================================
     */

    app.get(
        "/api/evolution/experiments/:id",
        auth,
        permission(
            "experiment.read",
            {
                allowWithoutPermission:
                    true
            }
        ),
        async (
            req,
            res
        ) => {

            try {

                const lab =
                    runtime.experiments;

                if (
                    !lab
                ) {

                    return res.status(503).json({

                        success:
                            false,

                        error:
                            "EXPERIMENT_LAB_UNAVAILABLE"
                    });
                }


                let result;


                if (
                    typeof lab.get ===
                        "function"
                ) {

                    result =
                        await lab.get(
                            req.params.id
                        );

                } else if (
                    typeof lab.getById ===
                        "function"
                ) {

                    result =
                        await lab.getById(
                            req.params.id
                        );
                }


                return res.json({

                    success:
                        true,

                    experiment:
                        result
                });

            } catch (error) {

                return sendError(
                    res,
                    error
                );
            }
        }
    );


    /*
     * ========================================================
     * UPDATE EXPERIMENT POLICY
     * ========================================================
     */

    app.patch(
        "/api/evolution/experiments/:id/policy",
        auth,
        permission(
            "experiment.policy.modify"
        ),
        security(
            "experiment.policy.modify"
        ),
        async (
            req,
            res
        ) => {

            try {

                const lab =
                    runtime.experiments;

                if (
                    !lab
                ) {

                    return res.status(503).json({

                        success:
                            false,

                        error:
                            "EXPERIMENT_LAB_UNAVAILABLE"
                    });
                }


                let result;


                if (
                    typeof lab.updatePolicy ===
                        "function"
                ) {

                    result =
                        await lab.updatePolicy(
                            req.params.id,
                            req.body || {},
                            getActor(req)
                        );

                } else if (
                    typeof lab.setPolicy ===
                        "function"
                ) {

                    result =
                        await lab.setPolicy(
                            req.params.id,
                            req.body || {},
                            getActor(req)
                        );

                } else {

                    return res.status(501).json({

                        success:
                            false,

                        error:
                            "EXPERIMENT_POLICY_CONTRACT_UNSUPPORTED"
                    });
                }


                return res.json({

                    success:
                        true,

                    result
                });

            } catch (error) {

                return sendError(
                    res,
                    error
                );
            }
        }
    );


    /*
     * ========================================================
     * ADD SKILL TO EXPERIMENT
     * ========================================================
     */

    app.post(
        "/api/evolution/experiments/:id/skills",
        auth,
        permission(
            "experiment.skill.add"
        ),
        security(
            "experiment.skill.add"
        ),
        async (
            req,
            res
        ) => {

            try {

                const lab =
                    runtime.experiments;

                if (
                    !lab ||
                    typeof lab.addSkill !==
                        "function"
                ) {

                    return res.status(501).json({

                        success:
                            false,

                        error:
                            "EXPERIMENT_SKILL_CONTRACT_UNSUPPORTED"
                    });
                }


                const result =
                    await lab.addSkill(
                        req.params.id,
                        req.body || {},
                        getActor(req)
                    );


                return res.json({

                    success:
                        true,

                    result
                });

            } catch (error) {

                return sendError(
                    res,
                    error
                );
            }
        }
    );


    /*
     * ========================================================
     * SKILL BUILDER
     * ========================================================
     */

    app.post(
        "/api/evolution/skill-builder",
        auth,
        permission(
            "skill.builder.create"
        ),
        security(
            "skill.builder.create"
        ),
        async (
            req,
            res
        ) => {

            try {

                const pipeline =
                    runtime.skillBuildPipeline;

                const builder =
                    runtime.skillBuilder;


                if (
                    pipeline &&
                    typeof pipeline.run ===
                        "function"
                ) {

                    const result =
                        await pipeline.run(
                            req.body || {},
                            getActor(req)
                        );

                    return res.status(201).json({

                        success:
                            true,

                        result
                    });
                }


                if (
                    builder &&
                    typeof builder.build ===
                        "function"
                ) {

                    const result =
                        await builder.build(
                            req.body || {},
                            getActor(req)
                        );

                    return res.status(201).json({

                        success:
                            true,

                        result
                    });
                }


                return res.status(503).json({

                    success:
                        false,

                    error:
                        "SKILL_BUILDER_UNAVAILABLE"
                });

            } catch (error) {

                return sendError(
                    res,
                    error
                );
            }
        }
    );


    /*
     * ========================================================
     * SKILL BUILDER APPROVE
     * ========================================================
     */

    app.post(
        "/api/evolution/skill-builder/approve/:id",
        auth,
        permission(
            "skill.builder.approve"
        ),
        security(
            "skill.builder.approve"
        ),
        async (
            req,
            res
        ) => {

            try {

                const builder =
                    runtime.skillBuilder;

                const id =
                    req.params.id;


                let result;


                if (
                    builder &&
                    typeof builder.approve ===
                        "function"
                ) {

                    result =
                        await builder.approve(
                            id,
                            getActor(req),
                            req.body || {}
                        );

                } else if (
                    runtime.skillBuildPipeline &&
                    typeof runtime.skillBuildPipeline.approve ===
                        "function"
                ) {

                    result =
                        await runtime.skillBuildPipeline.approve(
                            id,
                            getActor(req),
                            req.body || {}
                        );

                } else {

                    return res.status(501).json({

                        success:
                            false,

                        error:
                            "SKILL_BUILDER_APPROVAL_UNAVAILABLE"
                    });
                }


                return res.json({

                    success:
                        true,

                    result
                });

            } catch (error) {

                return sendError(
                    res,
                    error
                );
            }
        }
    );


    /*
     * ========================================================
     * SKILL BUILDER TEST
     * ========================================================
     */

    app.post(
        "/api/evolution/skill-builder/test/:id",
        auth,
        permission(
            "skill.builder.test"
        ),
        security(
            "skill.builder.test"
        ),
        async (
            req,
            res
        ) => {

            try {

                const pipeline =
                    runtime.skillBuildPipeline;

                const builder =
                    runtime.skillBuilder;


                let result;


                if (
                    pipeline &&
                    typeof pipeline.test ===
                        "function"
                ) {

                    result =
                        await pipeline.test(
                            req.params.id,
                            req.body || {},
                            getActor(req)
                        );

                } else if (
                    builder &&
                    typeof builder.test ===
                        "function"
                ) {

                    result =
                        await builder.test(
                            req.params.id,
                            req.body || {},
                            getActor(req)
                        );

                } else if (
                    runtime.testEngine
                ) {

                    result =
                        await runtime.testEngine.run(
                            req.body || {}
                        );

                } else {

                    return res.status(503).json({

                        success:
                            false,

                        error:
                            "SKILL_TEST_ENGINE_UNAVAILABLE"
                    });
                }


                return res.json({

                    success:
                        true,

                    result
                });

            } catch (error) {

                return sendError(
                    res,
                    error
                );
            }
        }
    );


    /*
     * ========================================================
     * CODING REPAIR
     * ========================================================
     */

    app.post(
        "/api/evolution/coding/repair",
        auth,
        permission(
            "code.repair"
        ),
        security(
            "code.repair"
        ),
        async (
            req,
            res
        ) => {

            try {

                const pipeline =
                    runtime.codingPipeline;

                const agent =
                    runtime.codingAgent;


                let result;


                if (
                    pipeline &&
                    typeof pipeline.run ===
                        "function"
                ) {

                    result =
                        await pipeline.run(
                            req.body || {},
                            getActor(req)
                        );

                } else if (
                    pipeline &&
                    typeof pipeline.repair ===
                        "function"
                ) {

                    result =
                        await pipeline.repair(
                            req.body || {},
                            getActor(req)
                        );

                } else if (
                    agent &&
                    typeof agent.run ===
                        "function"
                ) {

                    result =
                        await agent.run(
                            req.body || {},
                            getActor(req)
                        );

                } else {

                    return res.status(503).json({

                        success:
                            false,

                        error:
                            "CODING_PIPELINE_UNAVAILABLE"
                    });
                }


                return res.json({

                    success:
                        true,

                    result
                });

            } catch (error) {

                return sendError(
                    res,
                    error
                );
            }
        }
    );


    /*
     * ========================================================
     * CREATE WORKSPACE
     * ========================================================
     */

    app.post(
        "/api/evolution/workspaces",
        auth,
        permission(
            "workspace.create"
        ),
        security(
            "workspace.create"
        ),
        async (
            req,
            res
        ) => {

            try {

                const modification =
                    runtime.modification;


                if (
                    !modification
                ) {

                    return res.status(503).json({

                        success:
                            false,

                        error:
                            "MODIFICATION_ENGINE_UNAVAILABLE"
                    });
                }


                if (
                    typeof modification.createWorkspace !==
                        "function"
                ) {

                    return res.status(501).json({

                        success:
                            false,

                        error:
                            "WORKSPACE_CREATE_UNSUPPORTED"
                    });
                }


                const result =
                    await modification.createWorkspace(
                        req.body || {},
                        getActor(req)
                    );


                return res.status(201).json({

                    success:
                        true,

                    workspace:
                        result
                });

            } catch (error) {

                return sendError(
                    res,
                    error
                );
            }
        }
    );


    /*
     * ========================================================
     * WRITE WORKSPACE FILE
     * ========================================================
     */

    app.put(
        "/api/evolution/workspaces/:id/files",
        auth,
        permission(
            "workspace.write"
        ),
        security(
            "workspace.write"
        ),
        async (
            req,
            res
        ) => {

            try {

                const modification =
                    runtime.modification;

                if (
                    !modification
                ) {

                    return res.status(503).json({

                        success:
                            false,

                        error:
                            "MODIFICATION_ENGINE_UNAVAILABLE"
                    });
                }


                const body =
                    safeObject(
                        req.body
                    );

                const filePath =
                    body.path ||
                    body.filePath;

                const content =
                    body.content;


                if (
                    !filePath
                ) {

                    return res.status(400).json({

                        success:
                            false,

                        error:
                            "FILE_PATH_REQUIRED"
                    });
                }


                if (
                    typeof content !==
                        "string"
                ) {

                    return res.status(400).json({

                        success:
                            false,

                        error:
                            "FILE_CONTENT_REQUIRED"
                    });
                }


                let result;


                if (
                    typeof modification.writeFile ===
                        "function"
                ) {

                    result =
                        await modification.writeFile(
                            req.params.id,
                            filePath,
                            content,
                            getActor(req)
                        );

                } else if (
                    typeof modification.updateFile ===
                        "function"
                ) {

                    result =
                        await modification.updateFile(
                            req.params.id,
                            {
                                path:
                                    filePath,

                                content
                            },
                            getActor(req)
                        );

                } else if (
                    modification.workspace &&
                    typeof modification.workspace.writeFile ===
                        "function"
                ) {

                    result =
                        await modification.workspace.writeFile(
                            req.params.id,
                            filePath,
                            content
                        );

                } else {

                    return res.status(501).json({

                        success:
                            false,

                        error:
                            "WORKSPACE_WRITE_UNSUPPORTED"
                    });
                }


                return res.json({

                    success:
                        true,

                    result
                });

            } catch (error) {

                return sendError(
                    res,
                    error
                );
            }
        }
    );


    /*
     * ========================================================
     * GET WORKSPACE DIFF
     * ========================================================
     */

    app.get(
        "/api/evolution/workspaces/:id/diff",
        auth,
        permission(
            "workspace.diff.read",
            {
                allowWithoutPermission:
                    true
            }
        ),
        async (
            req,
            res
        ) => {

            try {

                const diff =
                    runtime.diffEngine;

                if (
                    !diff
                ) {

                    return res.status(503).json({

                        success:
                            false,

                        error:
                            "DIFF_ENGINE_UNAVAILABLE"
                    });
                }


                let result;


                if (
                    typeof diff.getWorkspaceDiff ===
                        "function"
                ) {

                    result =
                        await diff.getWorkspaceDiff(
                            req.params.id,
                            req.query || {}
                        );

                } else if (
                    typeof diff.diffWorkspace ===
                        "function"
                ) {

                    result =
                        await diff.diffWorkspace(
                            req.params.id,
                            req.query || {}
                        );

                } else if (
                    typeof diff.diff ===
                        "function"
                ) {

                    result =
                        await diff.diff(
                            req.query || {}
                        );

                } else {

                    return res.status(501).json({

                        success:
                            false,

                        error:
                            "DIFF_CONTRACT_UNSUPPORTED"
                    });
                }


                return res.json({

                    success:
                        true,

                    diff:
                        result
                });

            } catch (error) {

                return sendError(
                    res,
                    error
                );
            }
        }
    );


    /*
     * ========================================================
     * VERIFY WORKSPACE
     * ========================================================
     */

    app.post(
        "/api/evolution/workspaces/:id/verify",
        auth,
        permission(
            "workspace.verify"
        ),
        security(
            "workspace.verify"
        ),
        async (
            req,
            res
        ) => {

            try {

                const modification =
                    runtime.modification;


                if (
                    !modification
                ) {

                    return res.status(503).json({

                        success:
                            false,

                        error:
                            "MODIFICATION_ENGINE_UNAVAILABLE"
                    });
                }


                const body =
                    safeObject(
                        req.body
                    );


                let result;


                if (
                    typeof modification.verifyWorkspace ===
                        "function"
                ) {

                    result =
                        await modification.verifyWorkspace(
                            req.params.id,
                            body,
                            getActor(req)
                        );

                } else if (
                    runtime.codingLoop &&
                    typeof runtime.codingLoop.verify ===
                        "function"
                ) {

                    result =
                        await runtime.codingLoop.verify(
                            req.params.id,
                            body
                        );

                } else if (
                    runtime.testEngine
                ) {

                    result =
                        await runtime.testEngine.run(
                            body
                        );

                } else {

                    return res.status(501).json({

                        success:
                            false,

                        error:
                            "WORKSPACE_VERIFY_UNSUPPORTED"
                    });
                }


                return res.json({

                    success:
                        true,

                    verification:
                        result
                });

            } catch (error) {

                return sendError(
                    res,
                    error
                );
            }
        }
    );


    /*
     * ========================================================
     * CREATE CHANGE PROPOSAL
     * ========================================================
     */

    app.post(
        "/api/evolution/changes",
        auth,
        permission(
            "change.create"
        ),
        security(
            "change.create"
        ),
        async (
            req,
            res
        ) => {

            try {

                const result =
                    await runtime.createChangeProposal(
                        req.body || {},
                        getActor(req)
                    );


                return res.status(201).json({

                    success:
                        true,

                    change:
                        result
                });

            } catch (error) {

                return sendError(
                    res,
                    error
                );
            }
        }
    );


    /*
     * ========================================================
     * APPROVE CHANGE
     * ========================================================
     */

    app.post(
        "/api/evolution/changes/:id/approve",
        auth,
        permission(
            "change.approve"
        ),
        security(
            "change.approve"
        ),
        async (
            req,
            res
        ) => {

            try {

                const approval =
                    runtime.approval;

                if (
                    !approval
                ) {

                    return res.status(503).json({

                        success:
                            false,

                        error:
                            "APPROVAL_ENGINE_UNAVAILABLE"
                    });
                }


                let result;


                if (
                    typeof approval.approve ===
                        "function"
                ) {

                    result =
                        await approval.approve(
                            req.params.id,
                            getActor(req),
                            req.body || {}
                        );

                } else if (
                    typeof approval.approveProposal ===
                        "function"
                ) {

                    result =
                        await approval.approveProposal(
                            req.params.id,
                            getActor(req),
                            req.body || {}
                        );

                } else {

                    return res.status(501).json({

                        success:
                            false,

                        error:
                            "CHANGE_APPROVAL_UNSUPPORTED"
                    });
                }


                return res.json({

                    success:
                        true,

                    result
                });

            } catch (error) {

                return sendError(
                    res,
                    error
                );
            }
        }
    );


    /*
     * ========================================================
     * REJECT CHANGE
     * ========================================================
     */

    app.post(
        "/api/evolution/changes/:id/reject",
        auth,
        permission(
            "change.reject"
        ),
        security(
            "change.reject"
        ),
        async (
            req,
            res
        ) => {

            try {

                const approval =
                    runtime.approval;

                if (
                    !approval
                ) {

                    return res.status(503).json({

                        success:
                            false,

                        error:
                            "APPROVAL_ENGINE_UNAVAILABLE"
                    });
                }


                let result;


                if (
                    typeof approval.reject ===
                        "function"
                ) {

                    result =
                        await approval.reject(
                            req.params.id,
                            getActor(req),
                            req.body || {}
                        );

                } else if (
                    typeof approval.rejectProposal ===
                        "function"
                ) {

                    result =
                        await approval.rejectProposal(
                            req.params.id,
                            getActor(req),
                            req.body || {}
                        );

                } else {

                    return res.status(501).json({

                        success:
                            false,

                        error:
                            "CHANGE_REJECTION_UNSUPPORTED"
                    });
                }


                return res.json({

                    success:
                        true,

                    result
                });

            } catch (error) {

                return sendError(
                    res,
                    error
                );
            }
        }
    );


    /*
     * ========================================================
     * SNAPSHOT
     * ========================================================
     */

    app.post(
        "/api/evolution/workspaces/:id/snapshot",
        auth,
        permission(
            "snapshot.create"
        ),
        security(
            "snapshot.create"
        ),
        async (
            req,
            res
        ) => {

            try {

                const manager =
                    runtime.snapshotManager;

                if (
                    !manager
                ) {

                    return res.status(503).json({

                        success:
                            false,

                        error:
                            "SNAPSHOT_MANAGER_UNAVAILABLE"
                    });
                }


                let result;


                if (
                    typeof manager.create ===
                        "function"
                ) {

                    result =
                        await manager.create(
                            req.params.id,
                            {
                                ...safeObject(
                                    req.body
                                ),

                                actor:
                                    getActor(req)
                            }
                        );

                } else if (
                    typeof manager.createSnapshot ===
                        "function"
                ) {

                    result =
                        await manager.createSnapshot(
                            req.params.id,
                            req.body || {},
                            getActor(req)
                        );

                } else {

                    return res.status(501).json({

                        success:
                            false,

                        error:
                            "SNAPSHOT_CONTRACT_UNSUPPORTED"
                    });
                }


                return res.status(201).json({

                    success:
                        true,

                    snapshot:
                        result
                });

            } catch (error) {

                return sendError(
                    res,
                    error
                );
            }
        }
    );


    /*
     * ========================================================
     * VERSION CREATE
     * ========================================================
     */

    app.post(
        "/api/evolution/versions",
        auth,
        permission(
            "version.create"
        ),
        security(
            "version.create"
        ),
        async (
            req,
            res
        ) => {

            try {

                const manager =
                    runtime.versionManager;

                if (
                    !manager
                ) {

                    return res.status(503).json({

                        success:
                            false,

                        error:
                            "VERSION_MANAGER_UNAVAILABLE"
                    });
                }


                let result;


                if (
                    typeof manager.create ===
                        "function"
                ) {

                    result =
                        await manager.create(
                            req.body || {},
                            getActor(req)
                        );

                } else if (
                    typeof manager.createVersion ===
                        "function"
                ) {

                    result =
                        await manager.createVersion(
                            req.body || {},
                            getActor(req)
                        );

                } else {

                    return res.status(501).json({

                        success:
                            false,

                        error:
                            "VERSION_CREATE_UNSUPPORTED"
                    });
                }


                return res.status(201).json({

                    success:
                        true,

                    version:
                        result
                });

            } catch (error) {

                return sendError(
                    res,
                    error
                );
            }
        }
    );


    /*
     * ========================================================
     * VERSION LIST
     * ========================================================
     */

    app.get(
        "/api/evolution/versions",
        auth,
        permission(
            "version.read",
            {
                allowWithoutPermission:
                    true
            }
        ),
        async (
            req,
            res
        ) => {

            try {

                const manager =
                    runtime.versionManager;

                let result = [];


                if (
                    manager &&
                    typeof manager.list ===
                        "function"
                ) {

                    result =
                        await manager.list(
                            req.query || {}
                        );

                } else if (
                    manager &&
                    typeof manager.getAll ===
                        "function"
                ) {

                    result =
                        await manager.getAll(
                            req.query || {}
                        );
                }


                return res.json({

                    success:
                        true,

                    versions:
                        result
                });

            } catch (error) {

                return sendError(
                    res,
                    error
                );
            }
        }
    );


    /*
     * ========================================================
     * CANARY DEPLOYMENT
     * ========================================================
     */

    app.post(
        "/api/evolution/deployments/canary",
        auth,
        permission(
            "deployment.canary"
        ),
        security(
            "deployment.canary"
        ),
        async (
            req,
            res
        ) => {

            try {

                const manager =
                    runtime.deploymentManager;

                if (
                    !manager
                ) {

                    return res.status(503).json({

                        success:
                            false,

                        error:
                            "DEPLOYMENT_MANAGER_UNAVAILABLE"
                    });
                }


                const body =
                    safeObject(
                        req.body
                    );

                const actor =
                    getActor(req);


                let result;


                if (
                    typeof manager.canary ===
                        "function"
                ) {

                    result =
                        await manager.canary(
                            body,
                            actor
                        );

                } else if (
                    typeof manager.deployCanary ===
                        "function"
                ) {

                    result =
                        await manager.deployCanary(
                            body,
                            actor
                        );

                } else if (
                    runtime.canaryManager &&
                    typeof runtime.canaryManager.start ===
                        "function"
                ) {

                    result =
                        await runtime.canaryManager.start(
                            body,
                            actor
                        );

                } else {

                    return res.status(501).json({

                        success:
                            false,

                        error:
                            "CANARY_DEPLOYMENT_UNSUPPORTED"
                    });
                }


                return res.json({

                    success:
                        true,

                    deployment:
                        result
                });

            } catch (error) {

                return sendError(
                    res,
                    error
                );
            }
        }
    );


    /*
     * ========================================================
     * GLOBAL DEPLOYMENT
     * ========================================================
     */

    app.post(
        "/api/evolution/deployments",
        auth,
        permission(
            "deployment.global"
        ),
        security(
            "deployment.global"
        ),
        async (
            req,
            res
        ) => {

            try {

                const manager =
                    runtime.deploymentManager;

                if (
                    !manager
                ) {

                    return res.status(503).json({

                        success:
                            false,

                        error:
                            "DEPLOYMENT_MANAGER_UNAVAILABLE"
                    });
                }


                const body =
                    safeObject(
                        req.body
                    );

                const actor =
                    getActor(req);


                let result;


                if (
                    typeof manager.deploy ===
                        "function"
                ) {

                    result =
                        await manager.deploy(
                            body,
                            actor
                        );

                } else if (
                    typeof manager.execute ===
                        "function"
                ) {

                    result =
                        await manager.execute(
                            body,
                            actor
                        );

                } else {

                    return res.status(501).json({

                        success:
                            false,

                        error:
                            "GLOBAL_DEPLOYMENT_UNSUPPORTED"
                    });
                }


                return res.json({

                    success:
                        true,

                    deployment:
                        result
                });

            } catch (error) {

                return sendError(
                    res,
                    error
                );
            }
        }
    );


    /*
     * ========================================================
     * ROLLBACK
     * ========================================================
     */

    app.post(
        "/api/evolution/rollback",
        auth,
        permission(
            "deployment.rollback"
        ),
        security(
            "deployment.rollback"
        ),
        async (
            req,
            res
        ) => {

            try {

                const manager =
                    runtime.rollbackManager;

                if (
                    !manager
                ) {

                    return res.status(503).json({

                        success:
                            false,

                        error:
                            "ROLLBACK_MANAGER_UNAVAILABLE"
                    });
                }


                const body =
                    safeObject(
                        req.body
                    );

                const actor =
                    getActor(req);


                let result;


                if (
                    typeof manager.rollback ===
                        "function"
                ) {

                    result =
                        await manager.rollback(
                            body,
                            actor
                        );

                } else if (
                    typeof manager.execute ===
                        "function"
                ) {

                    result =
                        await manager.execute(
                            body,
                            actor
                        );

                } else {

                    return res.status(501).json({

                        success:
                            false,

                        error:
                            "ROLLBACK_UNSUPPORTED"
                    });
                }


                return res.json({

                    success:
                        true,

                    rollback:
                        result
                });

            } catch (error) {

                return sendError(
                    res,
                    error
                );
            }
        }
    );


    /*
     * ========================================================
     * CODING VERIFICATION LOOP
     * ========================================================
     */

    app.post(
        "/api/evolution/workspaces/:id/coding-loop",
        auth,
        permission(
            "code.verify"
        ),
        security(
            "code.verify"
        ),
        async (
            req,
            res
        ) => {

            try {

                const loop =
                    runtime.codingLoop;


                if (
                    !loop
                ) {

                    return res.status(503).json({

                        success:
                            false,

                        error:
                            "CODING_VERIFICATION_LOOP_UNAVAILABLE"
                    });
                }


                let result;


                if (
                    typeof loop.run ===
                        "function"
                ) {

                    result =
                        await loop.run({

                            workspaceId:
                                req.params.id,

                            ...safeObject(
                                req.body
                            ),

                            actor:
                                getActor(req)
                        });

                } else if (
                    typeof loop.execute ===
                        "function"
                ) {

                    result =
                        await loop.execute({

                            workspaceId:
                                req.params.id,

                            ...safeObject(
                                req.body
                            ),

                            actor:
                                getActor(req)
                        });

                } else {

                    return res.status(501).json({

                        success:
                            false,

                        error:
                            "CODING_LOOP_CONTRACT_UNSUPPORTED"
                    });
                }


                return res.json({

                    success:
                        true,

                    result
                });

            } catch (error) {

                return sendError(
                    res,
                    error
                );
            }
        }
    );


    /*
     * ========================================================
     * API REGISTRATION COMPLETE
     * ========================================================
     */

    return {
        registered:
            true,

        routes: [

            "GET /api/evolution/status",

            "POST /api/evolution/errors",
            "GET /api/evolution/errors",

            "POST /api/evolution/skills",
            "GET /api/evolution/skills",
            "POST /api/evolution/skills/:id/run",

            "POST /api/evolution/experiments",
            "GET /api/evolution/experiments/:id",
            "PATCH /api/evolution/experiments/:id/policy",
            "POST /api/evolution/experiments/:id/skills",

            "POST /api/evolution/skill-builder",
            "POST /api/evolution/skill-builder/approve/:id",
            "POST /api/evolution/skill-builder/test/:id",

            "POST /api/evolution/coding/repair",

            "POST /api/evolution/workspaces",
            "PUT /api/evolution/workspaces/:id/files",
            "GET /api/evolution/workspaces/:id/diff",
            "POST /api/evolution/workspaces/:id/verify",
            "POST /api/evolution/workspaces/:id/snapshot",
            "POST /api/evolution/workspaces/:id/coding-loop",

            "POST /api/evolution/changes",
            "POST /api/evolution/changes/:id/approve",
            "POST /api/evolution/changes/:id/reject",

            "POST /api/evolution/versions",
            "GET /api/evolution/versions",

            "POST /api/evolution/deployments/canary",
            "POST /api/evolution/deployments",

            "POST /api/evolution/rollback"
        ]
    };
}


module.exports = {
    registerEvolutionRoutes
};
