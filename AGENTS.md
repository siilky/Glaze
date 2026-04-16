# AGENTS.md — Workflow Rules

## Local Development

- **Work only on feature branches.** Do not develop on local `dev` anymore.
- `dev` remains an integration/reference branch only when explicitly needed, but it is not the default working branch.
- **Never open a PR from local `dev`.** All work must be committed, pushed, and reviewed from feature branches.

## Committing & PR Workflow

1. Start from the correct **feature branch** (e.g. `feat/vectorization-v2`).
2. Develop and test directly on that feature branch.
3. Commit changes on the feature branch.
4. Push the feature branch.
5. Open a PR targeting `upstream/dev` (never `main`).
6. If a new feature depends on an existing feature branch, create the new branch from that feature branch and keep working there.

```
# Example workflow
git checkout feat/vectorization-v2
git commit -m "feat: add Russian i18n for embedding settings"
git push origin feat/vectorization-v2
gh pr create --base dev --title "..."

# Dependent feature workflow
git checkout feat/vectorization-v2
git checkout -b feat/memorybook
git commit -m "feat: add memorybook scaffolding"
git push -u origin feat/memorybook
gh pr create --base dev --title "..."
```

## Branch Rules

- **All PRs target `upstream/dev`, never `main`.**
- PR branches are created from `upstream/dev`: `git checkout -b feat/xxx upstream/dev`.
- If PR B depends on PR A, create branch B from branch A, not from dev.
- If a branch is created from another feature branch, it automatically includes all commits already present in that parent branch.
- **Do not push local `dev`** to any remote.

## Current Branches

| Branch | Purpose | PR |
|--------|---------|----|
| `dev` (local) | Integration/reference only | No PR |
| `fast-fixes` | Mobile testing bug fixes batch | Not yet |

### Historical (merged & deleted)
- `feat/cloud-sync` → merged via PR #20
- `feat/vectorization-v2` → merged via PR #24  
- `feat/memorybook` → merged via PR #27
- `archive/feat/summary` → deleted
- `archive/feat/tokenizer` → deleted

## Before Starting Work

- Check `git branch --show-current` — make sure you're on the right branch.
- If working on a feature, the final commit must land on the feature branch, not on `dev`.
- If starting follow-up work, create or switch to the correct feature branch before editing files.
- Run `npm run build` before committing to verify no build errors.

## Roadmap Maintenance

- `Roadmap.md` must be kept current during implementation, not updated retroactively at the very end.
- Break roadmap work into smaller concrete subtasks instead of leaving large vague items.
- For each roadmap task or subtask, explicitly record:
  - completion status: `done` / `not done`
  - testing status: `tested` / `not tested`
- When work is only partially completed, split the remaining scope into separate follow-up subtasks instead of leaving an ambiguous mixed-status item.
- Use `Roadmap.md` to explicitly point the user to what still needs manual verification, so pending test coverage is visible in the roadmap itself.

## Conflict Avoidance Strategy (NEW)

### The Problem
When feature branches accumulate unmerged changes, they diverge and create merge conflicts when upstream accepts other PRs.

### The Solution: Strict Branch Hygiene
1. **One feature per branch** — Never combine unrelated work in a single branch
2. **Always branch from `upstream/dev`** (or previous feature if dependent)
3. **Never branch from local `dev`** that has unmerged feature commits
4. **Delete merged branches immediately** — both local and remote

### Visual Workflow
```
# CORRECT: Isolated feature branches
upstream/dev ─┬─► feat/fix-ui-crash ─► PR #1 (merged) ─► deleted
               ├─► feat/add-novelai ─► PR #2 (merged) ─► deleted
               └─► feat/vector-v3 ──► PR #3 (merged) ─► deleted

# WRONG: Compound branch with multiple features
upstream/dev ─► dev (local, has feat/A) ─► feat/A+B ─► conflicts!
```

### Dependency Handling
If feature B depends on feature A:
```bash
# Create branch B from A, not from dev
git checkout feat/A
git checkout -b feat/B

# When A merges to upstream/dev, rebase B:
git checkout feat/B
git rebase upstream/dev  # Resolve conflicts once
```

### Cleanup Checklist After Merge
- [ ] Delete local branch: `git branch -D feat/xxx`
- [ ] Delete remote branch: `git push origin --delete feat/xxx`
- [ ] Verify no stale references: `git branch -a`
