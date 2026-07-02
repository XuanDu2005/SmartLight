# SmartLight — Definition of Done

| Field | Value |
| --- | --- |
| **Document ID** | `GOV-DOD-001` |
| **Document Owner** | Principal Software Architect |
| **Status** | Approved — v1.0 |
| **Effective Date** | 2026-07-02 |
| **Last Reviewed** | 2026-07-02 |
| **Next Review** | 2027-01-02 |
| **Classification** | Project Governance — Source of Truth |
| **Audience** | Engineering, Product, QA, AI Agents |

---

## 1. Purpose

This document defines what **Done** means at SmartLight. It is the single, authoritative checklist that determines whether any unit of work — a feature, a bug fix, a refactor, a release — is truly complete.

A work item is **NOT done** if any item below is unchecked. There are **no exceptions** unless explicitly waived by the Tech Lead with a written rationale in the PR.

This DoD applies to:

- Features and user stories.
- Bug fixes.
- Refactors that ship to production.
- Infrastructure changes.
- Documentation changes (where applicable).
- AI-generated contributions.

---

## 2. Levels of Done

SmartLight recognizes **four levels** of Done. Each level adds stricter criteria.

| Level | Name | Applies To |
| --- | --- | --- |
| L1 | **Code Done** | A PR ready for review |
| L2 | **Accepted** | The PR is merged and meets team standards |
| L3 | **Released** | The change is live for users |
| L4 | **Validated** | Outcomes are measured and verified |

---

## 3. Level 1 — Code Done (PR-Ready)

A PR is "Code Done" only when **all** of the following are true.

### 3.1 Functional

- [ ] Acceptance criteria met for all linked tickets.
- [ ] Edge cases and error paths handled.
- [ ] User-facing strings localized via `t('key')`.
- [ ] Accessibility requirements met (semantic HTML, focus, contrast).
- [ ] No `console.log`, debugger, or commented-out code remains.

### 3.2 Tests

- [ ] Unit tests added/updated for new logic.
- [ ] Integration tests added/updated for new endpoints.
- [ ] Component tests added/updated for new UI.
- [ ] Regression test added for bug fixes.
- [ ] All tests pass locally.
- [ ] Coverage thresholds met (backend modules ≥ 80%, frontend features ≥ 70%).

### 3.3 Code Quality

- [ ] `pnpm lint` passes.
- [ ] `pnpm typecheck` passes (no `any`, no `as any`, no `@ts-ignore`).
- [ ] No new lint warnings introduced.
- [ ] No new dependencies without justification (and ADR if major).
- [ ] Code follows `CODING_STANDARDS.md`.
- [ ] No magic numbers; constants named appropriately.

### 3.4 Security and Privacy

- [ ] Inputs validated at boundaries.
- [ ] Auth and authorization checks in place server-side.
- [ ] No secrets, credentials, or PII in code, logs, fixtures, or commits.
- [ ] No SQL injection vectors; only Prisma queries.
- [ ] No XSS vectors; output encoded where user content is rendered.

### 3.5 Observability

- [ ] Structured logging added for key operations.
- [ ] Errors emit stable `code` and safe `message`.
- [ ] External calls have timeout and retry policy.

### 3.6 Database (If Changed)

- [ ] Migration added and reversible (or two-phase plan documented).
- [ ] Indexes added for new query patterns.
- [ ] Seed data updated if relevant.
- [ ] No destructive change without ADR.

### 3.7 API Contract (If Changed)

- [ ] `@smartlight/contracts` updated with new types/schemas.
- [ ] OpenAPI annotations updated.
- [ ] Changeset entry added for affected packages.
- [ ] Backward compatibility verified.

### 3.8 Documentation

- [ ] Inline JSDoc on exported public APIs.
- [ ] User-facing feature documentation updated (if applicable).
- [ ] ADR added for architectural decisions.
- [ ] README updated if setup or usage changed.
- [ ] Inline `TODO` comments include ticket reference.

### 3.9 Git and PR Hygiene

- [ ] Branch rebased on latest `main`.
- [ ] Conventional Commits format used.
- [ ] PR template fully filled out.
- [ ] Screenshots / recordings attached for UI changes.
- [ ] Self-reviewed the diff.
- [ ] Linked to a ticket.

### 3.10 AI-Generated Code (Additional)

- [ ] Author has reviewed and understood every line.
- [ ] No generated dead code, commented-out code, or placeholders.
- [ ] PR description includes "Generated-By" footer.
- [ ] All AI_DEVELOPMENT_RULES.md items satisfied.

---

## 4. Level 2 — Accepted (Merge-Ready)

A PR moves from Code Done to Accepted when **all** of L1 are true **AND**:

- [ ] Required approvals obtained per `GIT_WORKFLOW.md`.
- [ ] CODEOWNERS approval for owned paths.
- [ ] CI pipeline green (lint, typecheck, test, build, coverage, secrets).
- [ ] Preview deployment reviewed.
- [ ] All review conversations resolved.
- [ ] Squash-merged (or rebased) to `main` with linear history.
- [ ] Branch deleted.

---

## 5. Level 3 — Released (Live in Production)

A change is Released when **all** of L2 are true **AND**:

- [ ] Deployed to staging successfully.
- [ ] Smoke tests passed on staging.
- [ ] Feature flag configured (if applicable).
- [ ] Database migration applied successfully (if applicable).
- [ ] Deploy to production completed without rollback.
- [ ] Monitoring shows no error spikes within 30 minutes post-deploy.
- [ ] Release notes / changelog updated.
- [ ] Tag created for product releases (per `VERSIONING_STRATEGY.md`).
- [ ] Stakeholders notified (if applicable).

---

## 6. Level 4 — Validated (Outcomes Verified)

A change is Validated when **all** of L3 are true **AND**:

- [ ] Real user behavior observed and recorded.
- [ ] Success metrics defined at ticket creation are met or explained.
- [ ] Analytics events firing as expected.
- [ ] A/B test results captured (if applicable).
- [ ] Customer support feedback reviewed for related tickets.
- [ ] Feature flag fully rolled out (or rolled back with rationale).
- [ ] Retrospective notes captured for the team.

The feature is only fully closed at L4.

---

## 7. Done By Artifact Type

### 7.1 New Backend Module

- L1–L3 fully met.
- At least one integration test per public endpoint.
- OpenAPI documentation generated.
- Admin surface (if relevant) implemented.
- Seed data updated.

### 7.2 New Frontend Feature

- L1–L3 fully met.
- At least one component test per primary state.
- Accessibility check (axe) passes.
- Lighthouse performance score ≥ 80 on the affected page.
- Translation files updated for `vi`.

### 7.3 Bug Fix

- L1–L3 fully met.
- A regression test that fails before the fix and passes after.
- Root cause documented in the ticket.
- Verification steps recorded for QA.

### 7.4 Infrastructure Change

- L1–L3 fully met.
- Documented in `docs/30-operations/runbooks/` if operational.
- Rollback plan tested or rehearsed.
- Cost impact assessed.

### 7.5 Documentation Change

- Markdown lint passes.
- Links validated.
- Reviewed by at least one domain owner.
- Reflects current state of the system.

### 7.6 AI-Generated Contribution

- All items in section 3.10 satisfied.
- Reviewed by a human engineer who can explain every line.
- Provenance recorded in PR description.

---

## 8. Anti-Patterns (Definition of NOT Done)

A PR is **explicitly NOT Done** if any of the following are true:

| Anti-Pattern | Reason |
| --- | --- |
| "I'll add tests later" | Tests are part of Done |
| "Will document in next PR" | Documentation is part of Done |
| "I'll fix this lint warning later" | Lint clean is part of Done |
| "Works on my machine" | Must work in CI and staging |
| "Will deploy from my laptop" | Deployment is automated |
| "Just a small fix" | All criteria still apply |
| "I'll handle the rollback later" | Rollback plan is part of Done |
| "The AI generated it, looks fine" | Human review required |

---

## 9. Acceptance Sign-Off

For features, sign-off requires:

| Role | Sign-Off |
| --- | --- |
| **Author** | All L1 items verified |
| **Reviewer(s)** | Code review approval |
| **Tech Lead** | Architecture and quality approval |
| **Product Owner** | Acceptance criteria met |
| **QA Lead** | Test plan executed and passed |

For releases, additional sign-off:

- **Principal Architect** — release readiness.
- **Security Champion** — security gates passed.
- **Operations** — observability and rollback verified.

---

## 10. Waivers

A waiver may be granted by the Tech Lead (or Principal Architect for governance-impacting items) only when:

1. The waiver is requested **before** the PR is opened.
2. The waived items are listed in the PR description.
3. A follow-up ticket is created for the waived items.
4. The waiver is time-bound (≤ 30 days).

Waivers are tracked in `docs/30-operations/waivers.md`.

---

## 11. Definition of Done vs. Acceptance Criteria

| Concept | Scope |
| --- | --- |
| **Acceptance Criteria** | Per-ticket; defines what the feature must do |
| **Definition of Done** | Project-wide; defines how anything is shipped |

Both must be satisfied. A feature can meet acceptance criteria and still fail DoD.

---

## 12. Definition of Done for AI Agents

AI agents must treat **every** DoD item as binding. In particular:

- AI agents must produce test code matching the feature's test pyramid.
- AI agents must not "stub out" parts of DoD with placeholder code.
- AI agents must open a follow-up ticket for any DoD item they cannot complete.
- AI agents must surface DoD gaps explicitly in the PR description, not silently skip them.

Full rules: `AI_DEVELOPMENT_RULES.md`.

---

## 13. DoD Enforcement

| Level | Enforced By |
| --- | --- |
| L1 | Author self-check + CI checks |
| L2 | Reviewers + branch protection + CI |
| L3 | Release pipeline + post-deploy checks |
| L4 | Product analytics + retrospective |

CI pipelines fail PRs that violate lint, type-check, test, build, or coverage thresholds.

---

## 14. Continuous Improvement

This DoD evolves. Proposals to change it are submitted as PRs modifying this document and require:

- Principal Architect approval.
- Engineering team notification.
- 1-week comment period before merge.

---

## 15. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-02 | Principal Architect | Initial governance baseline |

---

**End of Document — DEFINITION_OF_DONE.md**