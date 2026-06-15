# AGNTM-5: VerifiedBadge component + card integration

FR-007, SPEC sec.8. New app/app/components/VerifiedBadge.tsx, 4 states: Verified (green BadgeCheck), Unverified (amber ShieldAlert), Checking (muted pulse), Hidden (unavailable/unconfigured). Integrate into AgentCandidateCard.tsx top-left, no collision with HIRED (top-right) or REVIEWS hover chip. Honesty: Verified only on real verified:true. Depends on CLN-4. Parallel with CLN-6.
