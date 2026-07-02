# SmartLight — Development Rules

| Field | Value |
| --- | --- |
| **Document ID** | `GOV-DEV-RULES-001` |
| **Document Owner** | Principal Software Architect |
| **Status** | Approved — v1.0 |
| **Effective Date** | 2026-07-02 |
| **Last Reviewed** | 2026-07-02 |
| **Next Review** | 2027-01-02 |
| **Classification** | Project Governance — Source of Truth |
| **Audience** | Engineering, Product, QA, AI Agents |

---

## 1. Purpose

This document defines the **non-negotiable development workflow rules** for SmartLight. These rules ensure:

- Predictable delivery cadence.
- High code quality from day one.
- Safe production deployments.
- Clear ownership and accountability.
- Effective collaboration between humans and AI agents.

These rules apply to **every contributor**, including AI coding assistants.

---

## 2. Principles

1. **Trunk-based development** — short-lived branches, fast merges.
2. **Continuous Integration** — `main` is always green and deployable.
3. **Continuous Delivery** — every merge to `main` is a candidate for production.
4. **Definition of Done** — no exceptions (see `DEFINITION_OF_DONE.md`).
5. **Small, reviewable changes** — large PRs are rejected or split.
6. **Explicit ownership** — code owners approve changes in their areas.
7. **Documentation as code** — governance docs change through PRs.

---

## 3. Roles and Responsibilities

| Role | Responsibilities |
| --- | --- |
| **Principal Architect** | Owns governance; approves ADRs; final tech authority |
| **Tech Lead (FE / BE)** | Owns area quality; merges to `main`; reviews area PRs |
| **Engineer** | Implements features; writes tests; opens PRs; responds to review |
| **QA Lead** | Owns test strategy; signs off on release candidates |
| **Product Owner** | Prioritizes; accepts features; owns scope |
| **Security Champion** | Reviews security-sensitive PRs; owns threat models |
| **AI Agent** | Operates strictly under `AI_DEVELOPMENT_RULES.md` |

A single person may hold multiple roles in Phase 1.

---

## 4. Work Lifecycle

```
Backlog → Ready → In Progress → In Review → Changes Requested → Approved → Merged → Deployed → Verified
                                                                                                  ↘ Hotfix Loop
```

### 4.1 Ticket States

| State | Entry Criteria | Exit Criteria |
| --- | --- | --- |
| **Backlog** | Created and tagged | Acceptance criteria defined, sized |
| **Ready** | Sized, dependencies known, accepted by PO | Pull request opened |
| **In Progress** | PR opened (Draft OK) | Marked Ready for Review |
| **In Review** | PR marked Ready for Review | All reviewers approved |
| **Changes Requested** | Reviewer requests changes | Author pushes fixes |
| **Approved** | All required approvals obtained | Merged to `main` |
| **Deployed** | CI deploys preview/production | Verified in environment |
| **Verified** | Acceptance criteria met | Ticket closed |

### 4.2 WIP Limits

- A single engineer: **max 2 active PRs**.
- A single engineer: **max 1 critical/hotfix PR in flight**.
- A reviewer: **must respond within 1 business day** for non-urgent PRs.

---

## 5. Branching Rules

| Branch Type | Pattern | Lifetime | Source → Target |
| --- | --- | --- | --- |
| **Main** | `main` | Permanent | — |
| **Feature** | `feat/<scope>-<short-desc>` | < 5 days | `main` ← `feat/*` |
| **Bugfix** | `fix/<scope>-<short-desc>` | < 5 days | `main` ← `fix/*` |
| **Chore** | `chore/<short-desc>` | < 5 days | `main` ← `chore/*` |
| **Docs** | `docs/<short-desc>` | < 5 days | `main` ← `docs/*` |
| **Release** | `release/<version>` | < 1 day | `main` ← `release/*` (cherry-picks) |
| **Hotfix** | `hotfix/<short-desc>` | < 24h | `main` ← `hotfix/*` (then forward-merge) |

### 5.1 Branch Protection (main)

- Require PR before merge.
- Require ≥ 1 approval (≥ 2 for `apps/api/**` and security-sensitive files).
- Require green CI.
- Require linear history (squash or rebase).
- Require up-to-date branch before merge.
- Dismiss stale approvals on new pushes.
- Restrict direct push to `main`.
- CODEOWNERS approval required for owned paths.

---

## 6. Commit Rules

- **Conventional Commits** enforced via Commitlint.
- Format: `<type>(<scope>): <subject>`
- Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `revert`, `style`.
- Subject: imperative, lowercase, no trailing period, ≤ 72 chars.
- Body: explain **why**, not what.
- Footer: reference issue (`Closes #123`) and breaking changes (`BREAKING CHANGE:`).
- One logical change per commit; rebase/squash before merging.

### 6.1 Examples

```text
feat(cart): add line-item quantity update endpoint
fix(orders): prevent double-submit on checkout
docs(governance): add versioning strategy
chore(deps): bump prisma to 5.18.0
refactor(catalog): split product service into query/command
```

---

## 7. Pull Request Rules

### 7.1 Size

| Metric | Target | Hard Limit |
| --- | --- | --- |
| Lines changed | < 300 | 800 |
| Files changed | < 20 | 50 |
| Review time | < 1 day | 3 days |

PRs exceeding hard limits **must be split** unless explicitly waived by the Tech Lead with rationale documented.

### 7.2 Required Content (PR Template)

- **Summary** — 2–5 sentences describing the change.
- **Motivation** — link to ticket/issue; explain the why.
- **Changes** — high-level list.
- **Screenshots / Recordings** — for UI changes.
- **Test Plan** — exact steps a reviewer or QA can run.
- **Risk & Rollback** — known risks and how to revert.
- **Checklist** — see below.

### 7.3 Author Checklist (must all be checked)

- [ ] Linked to a ticket.
- [ ] Tests added or updated.
- [ ] `pnpm lint` passes.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm test` passes.
- [ ] Docs updated if behavior changed.
- [ ] No secrets, credentials, or PII in code or logs.
- [ ] No new dependencies without ADR.
- [ ] Migrations are reversible (or documented why not).
- [ ] Screenshots/recordings attached for UI changes.
- [ ] Self-reviewed the diff.

### 7.4 Reviewer Rules

- Review the PR within 1 business day.
- Be specific and constructive; suggest alternatives, not just problems.
- Distinguish **blocking** comments from **non-blocking suggestions**.
- Approve only when **you would be comfortable shipping this yourself**.
- Do not approve your own PR.
- For AI-generated PRs, see `AI_DEVELOPMENT_RULES.md`.

### 7.5 Merge Strategy

- **Default:** Squash merge with conventional commit message.
- **Allowed:** Rebase merge for clean multi-commit histories.
- **Forbidden:** Merge commits into `main`.

---

## 8. Testing Rules

### 8.1 Test Pyramid

| Level | Purpose | Speed | Quantity |
| --- | --- | --- | --- |
| **Unit** | Pure logic, edge cases | < 5 ms/test | Many |
| **Integration** | Module behavior with real DB/cache | < 1 s/test | Moderate |
| **E2E** | Critical user journeys | < 30 s/test | Few |

### 8.2 Required Tests

- Every new public API endpoint: **integration test** covering happy path + 1 error path.
- Every new frontend feature: **component test** for primary states.
- Every bug fix: a **regression test** that fails before the fix.
- Every domain rule: **unit test** at the entity/service level.

### 8.3 Coverage Gate

- Minimum **80%** line coverage on `apps/api/src/modules/**`.
- Minimum **70%** on frontend feature folders.
- Tracked in CI; PRs that drop coverage below gate fail.

### 8.4 Test Isolation

- Backend integration tests use Testcontainers (Postgres + Redis).
- Each test seeds only the data it needs.
- Tests must not rely on execution order.

---

## 9. Code Review SLA

| Severity | First Response | Resolution |
| --- | --- | --- |
| **Critical** (security, data loss, outage) | ≤ 2 hours | ≤ 24 hours |
| **High** (feature blocker) | ≤ 4 hours | ≤ 2 business days |
| **Normal** | ≤ 1 business day | ≤ 5 business days |
| **Low / Nit** | ≤ 2 business days | Next sprint |

---

## 10. Environments and Deployments

| Environment | Trigger | Approver | Notes |
| --- | --- | --- | --- |
| **Preview** | PR open / push | Automatic | Per-PR isolated stack |
| **Staging** | Merge to `main` | Automatic | Used for QA & smoke |
| **Production** | Manual promote from staging | Tech Lead + PO | After QA sign-off |

### 10.1 Production Deploy Gates

- All CI checks green.
- Migration dry-run passed.
- Security scan clean (no high/critical).
- Staging verified for ≥ 1 hour with synthetic traffic.
- Rollback plan documented in the release ticket.

### 10.2 Rollback Strategy

- **Frontend:** Vercel instant rollback to previous deployment.
- **Backend:** Re-deploy previous container image.
- **Database:** Forward-fix preferred; rollback only if migration is reversible.
- Every rollback must be followed by a post-mortem within 5 business days.

---

## 11. Dependency Management

- New dependency requires justification in the PR description and, for major libraries, an ADR.
- Pin exact versions in `package.json`.
- Renovate/Dependabot opens weekly PRs; PRs auto-merge on patch green CI.
- Minor/major upgrades require review and dedicated upgrade window.
- Forbidden dependencies are listed in `TECH_STACK.md`.

---

## 12. Database Migration Rules

- Migrations live in `apps/api/prisma/migrations/`.
- One migration per PR; never combine unrelated schema changes.
- Migrations must be **reversible** unless explicitly justified.
- Destructive migrations (column drops, type changes) require:
  - ADR or written rationale.
  - Two-phase deployment strategy documented.
- Backfills run as background jobs, not as part of the migration.
- Seed scripts must be idempotent.

---

## 13. Feature Flags

- Use a feature flag service or simple config-based flags for non-trivial features.
- Every flag has: name, owner, default state, expiry date, removal ticket.
- Flags must be removed before the owning feature is considered done.

---

## 14. Secrets and Configuration

- Secrets **never** appear in source code or logs.
- Local: `.env.local` (gitignored) or CLI tools (Doppler/1Password).
- Production: provider-managed secret store.
- `.env.example` declares required keys with descriptions only.
- Rotation cadence: every 90 days for high-privilege secrets.

---

## 15. Logging, Errors, and Observability

- All logs are JSON structured with: `timestamp`, `level`, `requestId`, `userId` (when present), `module`, `message`.
- No PII in logs.
- Use the project's logger from `@smartlight/logger`; do not `console.log` in production code.
- Every new external integration must have:
  - Timeout configuration.
  - Retry policy with exponential backoff and jitter.
  - Circuit breaker for repeated failures.
- Errors must include a stable `code` and safe `message`; sensitive details go to server logs only.

---

## 16. Security Rules (Minimum Baseline)

- All inputs validated at the boundary (Zod schemas / class-validator).
- All authorization checks performed server-side; never trust client claims.
- No raw SQL unless explicitly reviewed and approved.
- Rate limits on auth, checkout, and public endpoints.
- File uploads: validate type, size, and content; store outside web root.
- Dependencies scanned in CI; critical CVEs block deploy.

---

## 17. Performance Rules

- New endpoints must declare latency expectations and be measured.
- Database queries reviewed for indexes (no full table scans in hot paths).
- N+1 queries are forbidden; use Prisma `include`/`select` deliberately.
- Heavy work runs in background jobs, not request lifecycle.
- Frontend: images optimized via Cloudinary; use `loading="lazy"` for below-the-fold.

---

## 18. Documentation Rules

| Change | Doc Updated |
| --- | --- |
| New module | Architecture diagram + ADR |
| New external integration | `docs/10-architecture/integration-map.md` |
| New env variable | `.env.example` + this repo's README |
| New API endpoint | OpenAPI (auto) + contract package |
| New feature flag | Flag registry |
| Incident | Runbook updated within 5 business days |

---

## 19. Incident and On-Call

- Severity levels defined in `docs/30-operations/incident-playbooks/`.
- On-call rotation owned by Tech Lead until team grows.
- Every Sev-1/Sev-2 incident produces a post-mortem.
- Action items from post-mortems are tracked as tickets with owners and dates.

---

## 20. AI Agent Rules (Summary)

The full ruleset for AI agents is in `AI_DEVELOPMENT_RULES.md`. In summary:

- AI agents operate on **task-scoped branches** only.
- AI agents must not modify governance documents without human approval.
- AI agents must include the same PR checklist as humans.
- All AI-generated code is treated as **untrusted until reviewed**.
- AI agents must not introduce new dependencies without human approval.

---

## 21. Violations and Enforcement

| Violation | Consequence |
| --- | --- |
| Direct push to `main` | Reverted; branch protection prevents, but if it happens, immediate revert + review |
| PR merged without required approvals | Reverted, root cause analyzed |
| Secret committed | Rotated immediately, history scrubbed, post-mortem filed |
| New dep without ADR | PR blocked |
| Skipped DoD | PR blocked |

CI enforcement backs these rules. Code review is the second line; tech leadership is the third.

---

## 22. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-02 | Principal Architect | Initial governance baseline |

---

**End of Document — DEVELOPMENT_RULES.md**