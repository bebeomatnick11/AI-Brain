"use strict";

const crypto = require("crypto");
const {
    RiskEngine,
    RISK_LEVELS
} = require("./RiskEngine");

class ApprovalEngine {

    constructor(options = {}) {

        this.db =
            options.db ||
            null;

        this.audit =
            options.audit ||
            null;

        this.riskEngine =
            options.riskEngine ||
            new RiskEngine();
    }

    async createProposal(input = {}, actor = {}) {

        const risk =
            this.riskEngine.classify(
                input
            );

        const proposal = {

            id:
                crypto.randomUUID(),

            brainId:
                input.brainId ||
                "global",

            title:
                input.title ||
                "Untitled Change",

            reason:
                input.reason ||
                "",

            riskLevel:
                risk,

            requiresOwner:
                this.riskEngine
                    .requiresOwnerApproval(
                        risk
                    ),

            requiresExtraReview:
                this.riskEngine
                    .requiresExtraReview(
                        risk
                    ),

            status:
                "PENDING_REVIEW",

            changes:
                input.changes ||
                [],

            areas:
                input.areas ||
                [],

            createdBy:
                actor.id ||
                null,

            createdAt:
                new Date().toISOString()
        };

        if (this.db?.query) {

            await this.db.query(
                `
                INSERT INTO change_proposals
                (
                    id,
                    brain_id,
                    title,
                    reason,
                    risk_level,
                    status,
                    requires_owner,
                    requires_extra_review,
                    payload,
                    created_by,
                    created_at
                )
                VALUES
                ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
                `,
                [
                    proposal.id,
                    proposal.brainId,
                    proposal.title,
                    proposal.reason,
                    proposal.riskLevel,
                    proposal.status,
                    proposal.requiresOwner,
                    proposal.requiresExtraReview,
                    JSON.stringify(proposal),
                    proposal.createdBy
                ]
            );
        }

        await this.audit?.record(
            "change.proposal.created",
            proposal,
            actor
        );

        return proposal;
    }

    async approve(
        proposal,
        actor
    ) {

        if (!proposal) {
            throw new Error(
                "PROPOSAL_NOT_FOUND"
            );
        }

        if (
            proposal.requiresOwner &&
            ![
                "Owner",
                "Admin"
            ].includes(actor.role)
        ) {
            throw new Error(
                "OWNER_APPROVAL_REQUIRED"
            );
        }

        if (
            ![
                "Owner",
                "Admin",
                "Developer"
            ].includes(actor.role)
        ) {
            throw new Error(
                "CHANGE_APPROVAL_DENIED"
            );
        }

        proposal.status =
            "APPROVED";

        proposal.approvedBy =
            actor.id;

        proposal.approvedAt =
            new Date().toISOString();

        if (this.db?.query) {

            await this.db.query(
                `
                UPDATE change_proposals
                SET
                    status = 'APPROVED',
                    approved_by = $2,
                    approved_at = NOW()
                WHERE id = $1
                `,
                [
                    proposal.id,
                    actor.id
                ]
            );
        }

        await this.audit?.record(
            "change.proposal.approved",
            {
                proposalId:
                    proposal.id
            },
            actor
        );

        return proposal;
    }

    async reject(
        proposal,
        actor,
        reason = ""
    ) {

        proposal.status =
            "REJECTED";

        proposal.rejectedBy =
            actor.id;

        proposal.rejectionReason =
            reason;

        proposal.rejectedAt =
            new Date().toISOString();

        await this.audit?.record(
            "change.proposal.rejected",
            {
                proposalId:
                    proposal.id,
                reason
            },
            actor
        );

        return proposal;
    }
}

module.exports = {
    ApprovalEngine
};
