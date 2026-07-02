# SmartLight — Git Workflow

| Field | Value |
| --- | --- |
| **Document ID** | `GOV-GIT-WORKFLOW-001` |
| **Document Owner** | Principal Software Architect |
| **Status** | Approved — v1.0 |
| **Effective Date** | 2026-07-02 |
| **Last Reviewed** | 2026-07-02 |
| **Next Review** | 2027-01-02 |
| **Classification** | Project Governance — Source of Truth |
| **Audience** | Engineering, DevOps, AI Agents |

---

## 1. Purpose

This document defines the **Git workflow** for SmartLight. It exists to ensure:

1. `main` is always **green and deployable**.
2. Changes are **small, reviewable, and reversible**.
3. History is **clean, linear, and informative**.
4. Releases are **predictable and traceable**.
5. Humans and AI agents follow the **same rules**.

---

## 2. Branching Model: Trunk-Based Development

SmartLight uses **trunk-based development** with short-lived feature branches and frequent merges to `main`. Long-running branches are forbidden except for hotfixes and release coordination.

```
main ─┬─ feat/cart-add-item ──────┐
      ├─ fix/checkout-validation ─┤
      ├─ chore/deps-bump ─────────┤
      └─ docs/governance-update ──┴─► main (always green)
```

### 2.1 Branch Types

| Type | Pattern | Lifetime | Merges Into |
| --- | --- | --- | --- |
| Main | `main` | Permanent | — |
| Feature | `feat/<scope>-<short-desc>` | < 5 days | `main` |
| Bugfix | `fix/<scope>-<short-desc>` | < 5 days | `main` |
| Chore | `chore/<short-desc>` | < 5 days | `main` |
| Docs | `docs/<short-desc>` | < 5 days | `main` |
| Refactor | `refactor/<scope>-<short-desc>` | < 5 days | `main` |
| Hotfix | `hotfix/<short-desc>` | < 24h | `main` (and forward-merge if needed) |
| Release | `release/<version>` | < 1 day | `main` |

### 2.2 Scope Examples

`<scope>` should reference the module or area: `catalog`, `cart`, `orders`, `checkout`, `auth`, `admin`, `infra`, `ci`, `deps`, `contracts`, `i18n`.

### 2.3 Branch Lifetime Rules

- Feature branches older than 7 days without merge are **stale** and must be re-justified.
- Stale branches may be closed by the Tech Lead after a 24-hour notice.

---

## 3. Commit Rules

### 3.1 Conventional Commits (Enforced by Commitlint)

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 3.2 Allowed Types

| Type | Purpose |
| --- | --- |
| `feat` | New user-facing functionality |
| `fix` | Bug fix |
| `chore` | Tooling, deps, non-functional changes |
| `docs` | Documentation only |
| `refactor` | Code change that neither fixes nor adds feature |
| `perf` | Performance improvement |
| `test` | Adding or fixing tests |
| `build` | Build system or external dependencies |
| `ci` | CI configuration |
| `revert` | Reverts a previous commit |
| `style` | Formatting/whitespace only |

### 3.3 Subject Rules

- Imperative mood (`add`, not `added` or `adds`).
- Lowercase.
- No trailing period.
- ≤ 72 characters.
- No emoji.

### 3.4 Body Rules

- Explain **why**, not what.
- Wrap at 100 columns.
- Separate from subject with a blank line.

### 3.5 Footer Rules

- Reference issues: `Closes #123`, `Refs #456`.
- Breaking changes: `BREAKING CHANGE: <description>`.

### 3.6 Examples

```text
feat(cart): add endpoint to update line item quantity

Customers reported confusion when quantity changes did not
update totals in real time. This change introduces a
dedicated endpoint and invalidates the cart query cache.

Closes #142
```

```text
fix(checkout): prevent double-submit on payment redirect

The submit button could be clicked multiple times before
navigation, occasionally producing two orders. Added
in-flight guard.

Closes #203
```

```text
docs(governance): add versioning strategy

Documents SemVer and changesets usage.
```

---

## 4. Pull Request Workflow

### 4.1 PR Lifecycle

```
Draft → Ready for Review → Changes Requested → Approved → Merged → Deployed → Verified
```

### 4.2 Draft PRs

- Allowed and encouraged for early feedback.
- Draft PRs do not require full DoD but must build cleanly.
- Convert to Ready when:
  - Tests are added.
  - Self-review is complete.
  - DoD checklist is complete.

### 4.3 PR Title

- Same format as commit subject: `<type>(<scope>): <subject>`.
- Conventional Commits linting runs on PR titles.

### 4.4 Required PR Content

The PR template (`.github/PULL_REQUEST_TEMPLATE.md`) requires:

- **Summary** — 2–5 sentences.
- **Motivation** — linked ticket.
- **Changes** — bulleted list.
- **Screenshots / Recordings** — for UI work.
- **Test Plan** — exact reproduction/verification steps.
- **Risk & Rollback** — risks and rollback approach.
- **DoD Checklist** — see `DEFINITION_OF_DONE.md`.

### 4.5 Author DoD (Pre-Merge)

- [ ] Linked to a ticket.
- [ ] Tests added/updated.
- [ ] `pnpm lint` passes locally.
- [ ] `pnpm typecheck` passes locally.
- [ ] `pnpm test` passes locally.
- [ ] Docs updated if behavior changed.
- [ ] No secrets or PII included.
- [ ] No new dependencies without justification/ADR.
- [ ] Migrations are reversible or rationale documented.
- [ ] Screenshots/recordings attached for UI.
- [ ] Self-reviewed the diff.
- [ ] Branch rebased on latest `main`.

### 4.6 Reviewer Rules

- First response within **1 business day**.
- For Sev-1 / Sev-2 work: within **2 hours**.
- Distinguish **blocking** comments from **suggestions**.
- Approve only when confident the change is safe and correct.
- Reviews cover: design, correctness, tests, security, performance, docs.

### 4.7 Approval Requirements

| Path | Approvers Required |
| --- | --- |
| `apps/api/src/modules/payments/**` | Tech Lead + Security Champion |
| `apps/api/src/modules/identity/**` | Tech Lead + Security Champion |
| `apps/api/prisma/**` | Tech Lead |
| `apps/storefront/**` (checkout, auth) | Tech Lead (FE) |
| `infra/**` | DevOps + Tech Lead |
| `docs/00-governance/**` | Principal Architect |
| Everything else | ≥ 1 approver from CODEOWNERS |

CODEOWNERS file is maintained in `.github/CODEOWNERS`.

### 4.8 Merge Strategy

| Method | When |
| --- | --- |
| **Squash merge** | Default for most PRs; single conventional commit on `main` |
| **Rebase merge** | When preserving commit history adds value |
| **Merge commit** | Forbidden on `main` |

---

## 5. Branch Protection Rules (`main`)

- Require PR before merge.
- Require approvals per section 4.7.
- Require green status checks.
- Require up-to-date branch.
- Require linear history.
- Dismiss stale approvals on new pushes.
- Restrict who can push (no direct pushes).
- Include administrators in restrictions.

### 5.1 Required Status Checks

- `lint`
- `typecheck`
- `test`
- `build`
- `coverage` (backend modules)
- `gitleaks`
- `codeql` (on schedule and PR)

---

## 6. Tagging and Releases

### 6.1 Tags

- Tags follow SemVer: `vMAJOR.MINOR.PATCH` (e.g., `v1.4.0`).
- Tags are created on `main` by the release workflow.
- Tags trigger production deployment pipelines.

### 6.2 Release Branches

- Used only when a release needs cherry-picks independent of ongoing work.
- Created from `main` at the release commit.
- Hotfixes merge to `release/*` and then forward-merge to `main`.

### 6.3 Changelog

- Generated by Changesets from `.changeset/*.md` files.
- Stored in `docs/90-changelog/CHANGELOG.md`.
- Each release has a release notes document under `docs/90-changelog/releases/`.

---

## 7. Hotfix Workflow

```
main ──── production issue detected ──── hotfix/<desc> ────► main
                                                     └─► tag vX.Y.Z+1
                                                     └─► deploy production
                                                     └─► forward-merge to any active release branches
```

Hotfix rules:

- Branch from `main`.
- Minimal scope (only the fix).
- Expedited review (Sev-1: ≤ 1 hour response).
- Post-merge, verify in production within 30 minutes.
- File a post-mortem within 5 business days.

---

## 8. Conflict Resolution

- Prefer rebasing feature branches onto `main` frequently.
- Large conflicts must be resolved by the original author with reviewer present.
- Conflicts that reveal architectural issues must trigger an ADR.

---

## 9. History Hygiene

- Commit history on `main` is **linear and clean**.
- Squash noisy WIP commits before merging.
- Revert commits (`revert: ...`) preferred over force pushes to fix bad merges.
- Force-push to shared branches is **forbidden**; rebases of personal branches are allowed locally before merge.

---

## 10. Submodules and Large Files

- Git submodules are avoided unless absolutely necessary.
- Large binaries stored in Cloudinary or object storage, referenced by URL.
- Git LFS not enabled in Phase 1.

---

## 11. Local Development Setup

Standard developer workflow:

```bash
# Clone
git clone git@github.com:smartlight/smartlight.git
cd smartlight

# Install
corepack enable
pnpm install

# Create a feature branch
git checkout -b feat/cart-add-item

# Develop, commit, push
git add -A
git commit -m "feat(cart): add line item add endpoint"
git push -u origin feat/cart-add-item

# Open PR, request review, merge via squash
```

### 11.1 Pre-commit Hooks (Husky)

- `lint-staged` runs Prettier + ESLint on staged files.
- `gitleaks` blocks secret commits.
- Type-check on changed workspaces.

---

## 12. CI/CD Pipeline (Git-Based Triggers)

| Trigger | Workflow | Outcome |
| --- | --- | --- |
| Pull request | `ci.yml` | Lint, typecheck, test, build, preview deploy |
| Push to `main` | `ci.yml` + `deploy-staging.yml` | Full pipeline + staging deploy |
| Tag `v*` | `release.yml` + `deploy-prod.yml` | Production deploy |
| Schedule (nightly) | `nightly.yml` | Full E2E, security scan, dep audit |
| Manual | `hotfix-deploy.yml` | One-click production deploy after approval |

---

## 13. CODEOWNERS Model

- `CODEOWNERS` declared per path glob.
- Owners are auto-assigned as reviewers.
- Changes touching owned paths require owner approval.
- Owners escalate to Tech Leads or Principal Architect when blocked.

---

## 14. AI Agent Git Rules (Summary)

- AI agents create branches prefixed with `ai/<agent-name>/feat/...`.
- AI agents never push directly to `main`.
- AI agents open PRs with the same template and DoD.
- AI agents must follow conventional commit messages.
- AI agents must not amend, force-push, or rewrite history of others' branches.

Full rules: `AI_DEVELOPMENT_RULES.md`.

---

## 15. Anti-Patterns (Forbidden)

| Anti-Pattern | Reason |
| --- | --- |
| Long-lived feature branches | Causes painful merges and stale code |
| Direct push to `main` | Bypasses review and CI |
| Merge commits on `main` | Pollutes linear history |
| Force-pushing shared branches | Destroys others' work |
| Committing secrets | Security incident |
| Mixing unrelated changes in one PR | Hard to review and revert |
| Skipping PR template | Loses critical context |
| Reverting revert to undo original | Use proper fix or rollback instead |

---

## 16. Git Policy Enforcement Summary

| Rule | Enforced By |
| --- | --- |
| Linear history | Branch protection |
| Required checks | Branch protection + CI |
| Required approvals | Branch protection + CODEOWNERS |
| Conventional commits | Commitlint (pre-commit + PR) |
| No secrets | `gitleaks` (pre-commit + CI) |
| No large files | `.gitattributes` + size limits in CI |
| PR template usage | GitHub PR template enforcement |
| DoD | PR checklist + reviewer |

---

## 17. Document Control

| Version | Date | Author | Change Summary |
| --- | --- | --- | --- |
| 1.0 | 2026-07-02 | Principal Architect | Initial governance baseline |

---

**End of Document — GIT_WORKFLOW.md**