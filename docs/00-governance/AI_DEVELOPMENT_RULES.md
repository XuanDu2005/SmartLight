# SmartLight — AI Development Rules

| Field | Value |
| --- | --- |
| **Document ID** | `GOV-AI-DEV-RULES-001` |
| **Document Owner** | Principal Software Architect |
| **Status** | Approved — v1.0 |
| **Effective Date** | 2026-07-02 |
| **Last Reviewed** | 2026-07-02 |
| **Next Review** | 2027-01-02 |
| **Classification** | Project Governance — Source of Truth |
| **Audience** | AI Agents, Engineering Leads, Code Reviewers |

---

## 1. Purpose

This document defines the **rules, constraints, and responsibilities** for AI coding agents contributing to the SmartLight codebase. Its goals are to:

1. Allow AI agents to **contribute safely and productively**.
2. Prevent AI agents from **making architectural or governance changes** without human oversight.
3. Make AI-generated contributions **indistinguishable in quality** from human contributions.
4. Ensure **full traceability** of AI-generated changes.
5. Preserve the **security, privacy, and integrity** of customer data and systems.

These rules are **non-negotiable**. Violations are treated as serious process failures, regardless of outcome.

---

## 2. Scope and Applicability

This document applies to **any AI coding agent** that:

- Reads, writes, or modifies files in the SmartLight repository.
- Opens, comments on, or merges pull requests.
- Executes scripts, tests, or commands inside the repository.
- Interacts with the project's infrastructure, dependencies, or third-party services.

This applies regardless of the underlying model, vendor, or integration mechanism (Cursor, Copilot, Claude, GPT, in-house agents, etc.).

---

## 3. Governing Principles

1. **AI is a contributor, not an authority.** AI agents have no governance power.
2. **Humans own decisions.** A named human is responsible for every merged change.
3. **Transparency is mandatory.** AI-generated contributions must be identifiable.
4. **Scope discipline is critical.** AI agents operate strictly within assigned tasks.
5. **Same quality bar.** AI-generated code is held to the same standards as human code.
6. **Trust is earned, not assumed.** Every AI contribution is reviewed as if it came from an unknown contributor.

---

## 4. Authority Boundaries

### 4.1 AI Agents MAY

- Read any file in the repository.
- Create or modify files within an **assigned task scope**.
- Run linters, type-checks, and tests.
- Propose PRs with full descriptions, test plans, and checklists.
- Ask clarifying questions via PR comments or chat.
- Open follow-up tickets for issues outside their scope.

### 4.2 AI Agents MUST NOT

- Modify any file in `docs/00-governance/**`.
- Modify `CODEOWNERS`, branch protection, or CI workflows.
- Modify database migrations outside their task scope.
- Introduce new dependencies, libraries, or frameworks.
- Bump dependency major versions.
- Force-push to shared branches.
- Merge or approve any PR.
- Modify production infrastructure, secrets, or environment variables.
- Disable, bypass, or weaken any lint, test, or security rule.
- Access, log, or transmit any customer PII, secrets, or production data.
- Generate or commit cryptographic material (keys, tokens, secrets).

### 4.3 AI Agents REQUIRE Human Approval For

- New architectural decisions (ADR required).
- New external integrations.
- Schema changes affecting shared tables.
- API contract changes (path, request shape, response shape).
- New feature flags.
- Modifications to authentication or authorization logic.
- Changes to billing, pricing, or payment logic.
- Performance or cost-impacting infrastructure changes.

---

## 5. Task Scoping Rules

### 5.1 Scoped Tasks Only

- AI agents must operate on a **single, clearly defined task** at a time.
- A task is described by a ticket with explicit acceptance criteria.
- If a task is ambiguous, the AI agent must request clarification **before** producing code.

### 5.2 Branch Naming

AI agents use a dedicated branch prefix:

```
ai/<agent-name>/<type>/<scope>-<short-desc>
```

Examples:

```
ai/cursor/feat/cart-add-line-item
ai/copilot/fix/order-duplicate-email
ai/claude/refactor/catalog-split-read-write
```

- `<agent-name>` identifies the AI vendor or system.
- Branches must be created from the latest `main`.
- Branches are short-lived (≤ 48 hours).

### 5.3 File Scope

- AI agents must list in the PR description the **files expected to change**.
- Files outside this list must be flagged before commit.
- Unrelated changes (drive-by edits, formatting, dead code removal) are forbidden in the same PR.

---

## 6. Code Quality Standards

AI agents must produce code that:

- Conforms to `CODING_STANDARDS.md` (TypeScript strict, naming, formatting).
- Passes `pnpm lint` and `pnpm typecheck` locally.
- Passes `pnpm test` (unit, integration, component) locally.
- Includes tests proportional to the change.
- Uses the existing module structure; does not invent new patterns.
- Reuses existing utilities and shared packages.
- Avoids speculative abstractions, "future-proofing", or unused exports.

### 6.1 Forbidden Code Patterns

AI agents must never produce:

- `any`, `as any`, non-null assertions (`!`).
- `@ts-ignore`, floating promises, unhandled errors.
- `console.log` in production code.
- Hardcoded secrets, tokens, credentials.
- Hardcoded URLs, environment values, or feature flags.
- New top-level dependencies.
- Refactors that span unrelated modules.
- Comments that narrate what the code does.
- Placeholder code, `TODO: implement later` without a linked ticket.
- Dead code, commented-out code, unreachable branches.

### 6.2 Required Patterns

- Explicit return types on exported functions.
- Branded types for entity IDs.
- Discriminated unions for state machines.
- Zod schemas for runtime validation.
- Structured logging via `@smartlight/logger`.
- Typed errors with stable `code`.

---

## 7. Testing Requirements

AI agents must produce tests aligned with the existing test pyramid:

| Change Type | Minimum Required Tests |
| --- | --- |
| New service method | ≥ 2 unit tests (happy + error path) |
| New endpoint | ≥ 1 integration test (happy) + ≥ 1 error path test |
| New component | ≥ 1 component test for primary render + interaction |
| Bug fix | ≥ 1 regression test that fails before the fix |
| Refactor | Existing tests still pass; new tests if behavior is added |

AI agents must not:

- Mock so heavily that tests verify nothing.
- Reuse the same test data across many tests without isolation.
- Skip assertions or write tautological tests.

---

## 8. Pull Request Requirements

### 8.1 PR Description

Every AI-generated PR must include:

1. **Summary** — 2–5 sentences.
2. **Motivation** — linked ticket.
3. **Changes** — bulleted list.
4. **Files Expected to Change** — explicit list.
5. **Test Plan** — exact verification steps.
6. **Risk & Rollback** — known risks and rollback approach.
7. **Generated-By Footer**:

```
Generated-By: <Agent Name> <Model Version>
Reviewed-By: <Human Reviewer Name>
```

### 8.2 PR Title

- Conventional Commits format: `<type>(<scope>): <subject>`.
- Must pass Commitlint.

### 8.3 PR Size

- ≤ 300 lines changed preferred.
- Hard cap: 800 lines (per `DEVELOPMENT_RULES.md`).
- Larger changes must be split.

### 8.4 PR Behavior

- AI agents must **not approve** their own PRs.
- AI agents must respond to review comments constructively.
- AI agents must **not** push force, amend, or rewrite history after human review has begun.

---

## 9. Review and Approval

### 9.1 Human-in-the-Loop Mandatory

Every AI-generated PR must be reviewed by a **named human engineer** who:

- Reads and understands every line of the diff.
- Confirms the change meets the Definition of Done.
- Confirms the change stays within the assigned scope.
- Confirms no governance, security, or privacy rule is violated.

### 9.2 Reviewer Authority

Human reviewers may:

- Request changes.
- Block merge.
- Reject the PR entirely.
- Require splitting into smaller PRs.

AI agents must accept reviewer decisions without argument or negotiation.

### 9.3 Double Review for Sensitive Areas

PRs touching the following paths require **two human approvers**:

- `apps/api/src/modules/identity/**`
- `apps/api/src/modules/payments/**`
- `apps/api/prisma/**`
- `apps/api/src/modules/orders/**` (refund/dispute logic)
- `infra/**`
- `docs/00-governance/**` (AI agents cannot author these at all)

---

## 10. Prohibited Activities

AI agents are **strictly prohibited** from:

| Activity | Reason |
| --- | --- |
| Pushing directly to `main` | Branch protection rule |
| Merging any PR | Governance violation |
| Modifying CI workflows | Security risk |
| Bypassing lint/type/test gates | Quality degradation |
| Adding secrets or credentials | Security incident |
| Logging PII or secrets | Compliance violation |
| Modifying production configs | Operational risk |
| Accessing production data | Privacy violation |
| Generating or modifying crypto material | Security incident |
| Auto-merging Dependabot PRs | Requires human review |
| Resolving review conversations themselves | Human must close threads |

---

## 11. Data and Privacy Rules

AI agents must:

- Treat all data in the repository as **sensitive by default**.
- Never commit customer PII, even in tests or fixtures.
- Use synthetic test data only (`faker` with a fixed seed).
- Never run code that connects to production databases or services.
- Avoid loading large data files into context unnecessarily.

AI agents must not:

- Echo or summarize production data in PR comments or chat.
- Embed real customer content in test cases.
- Use real payment credentials or test cards belonging to customers.

---

## 12. Security Rules

AI agents must:

- Follow input validation, output encoding, and parameterized queries.
- Use only documented, approved authentication patterns.
- Surface any suspected vulnerability via PR comments and tickets, not silent fixes.
- Treat warnings from secret scanners (`gitleaks`) as blocking errors.

AI agents must not:

- Disable or weaken security middleware (Helmet, rate limits, CSRF).
- Add new auth flows without an ADR.
- Modify JWT signing/verification configuration.
- Weaken password hashing parameters.

---

## 13. Failure Modes and Recovery

If an AI agent:

| Failure | Response |
| --- | --- |
| Produces code that violates the DoD | Author must fix before review |
| Modifies a forbidden file | Revert immediately; incident review |
| Commits a secret | Rotate immediately; full incident response |
| Pushes to a protected branch | Revert; harden process |
| Loses context or hallucinates an API | Author rewrites from scratch |
| Generates an insecure pattern | PR blocked; security review |

All incidents involving AI agents are reviewed by the Tech Lead and recorded in `docs/30-operations/incidents/`.

---

## 14. Communication Rules

### 14.1 In Pull Requests

- AI agents identify themselves in the PR footer.
- AI agents do not impersonate humans.
- AI agents respond to comments factually, not defensively.

### 14.2 In Chat or Issue Comments

- AI agents may assist with triage, explanation, and suggestions.
- AI agents must clearly disclose their non-human status when used as a conversational contributor.
- AI agents must not make commitments on behalf of the team.

### 14.3 Tone

- Concise, technical, neutral.
- No flattery, no apologies for being an AI.
- No unnecessary preamble or filler.

---

## 15. Governance Update Rule

- This document may only be modified by the **Principal Architect**.
- AI agents cannot edit this file under any circumstances.
- Changes to this document require a PR review by at least two Tech Leads.

---

## 16. AI Agent Onboarding Checklist

Before any AI agent contributes to SmartLight, the operator must confirm:

- [ ] The agent has read all governance documents in `docs/00-governance/`.
- [ ] The agent has read the relevant module's README and existing tests.
- [ ] The agent's branch naming convention is configured.
- [ ] The agent cannot push directly to `main`.
- [ ] The agent cannot modify CI, governance, or protected paths.
- [ ] The agent has a designated human reviewer for each task.
- [ ] The agent's outputs are logged for audit (PR description, comments).

---

## 17. Audit and Traceability

The following must be traceable for every AI contribution:

| Field | Source |
| --- | --- |
| Agent identity | PR footer |
| Model version | PR footer |
| Human reviewer | PR approver |
| Files changed | Git history |
| Branch name | Git history |
| Time spent | PR timing |
| Test results | CI logs |
| Review comments | PR conversation |

These records are kept indefinitely.

---

## 18. Liability and Accountability

- **Human reviewer** is accountable for the change merged.
- **Tech Lead** is accountable for AI agent behavior on their team.
- **Principal Architect** is accountable for the governance of AI agents.

AI agents bear no liability. They are tools, not actors.

---

## 19. Future Capabilities

AI agents may be allowed to perform additional tasks (e.g., auto-triage issues, suggest ADRs) only after:

- A formal proposal and ADR.
- Tech Lead and Principal Architect approval.
- A trial period with audit.
- An update to this document.

---

## 20. Summary: Golden Rules for AI Agents

1. Stay in your lane — task scope is sacred.
2. The human owns the merge.
3. Never touch governance, CI, or secrets.
4. Match the existing code style exactly.
5. Tests are not optional.
6. Document your work transparently.
7. When in doubt, ask, do not assume.
8. Do not be clever — be correct.
9. The Definition of Done applies to you.
10. You are a contributor; the team is the author.

---

## 21. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-02 | Principal Architect | Initial governance baseline |

---

**End of Document — AI_DEVELOPMENT_RULES.md**