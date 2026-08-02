# AGNTM-8: Fix A-Pass badge overlap on agent card

Operator feedback: the VerifiedBadge (AGNTM-5) placed top-left of AgentCandidateCard overlaps the bot icon + agent name. Rethink placement so it never collides with the name/score (top), HIRED chip (top-right), or REVIEWS hover chip. Likely move to the meta chip row (next to style chip + paid-jobs) or the footer wallet row. Follow-up to AGNTM-5; lands in PR #1 (cleanverse branch).
