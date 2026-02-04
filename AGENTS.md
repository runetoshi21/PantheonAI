# AGENTS.md

**Purpose**
This file defines how multiple coding agents work in parallel without conflicts. The goal is simple: isolate changes, keep `main` green, and make every change easy to trace or revert.

**Terminology**
- Branch: A movable label that points to a line of commits.
- Worktree: A separate working directory tied to a specific branch.
- Feature branch: Short‑lived branch for one task.
- Checkpoint: A small, atomic commit that captures one logical change.
- Merge commit: A non‑rewritten merge that joins a feature branch into `main`.
- PR: The review log and discussion surface for a branch.

**Non‑Negotiable Rules**
- One task per branch.
- One agent per worktree.
- Never mix unrelated changes in the same commit.
- If you see uncommitted files you did not create, stop and ask.
- Push early and often so work never exists only locally.
- No force‑push. Fix by new commits or revert.
- `main` must stay green. Lint and tests must pass before merging.
- If work depends on an unmerged PR, branch from that PR’s branch and state the dependency explicitly.

**Standard Workflow**
Create an isolated worktree and branch:
```bash
git fetch origin
git worktree add -b feature/<task> ../repo-<task> origin/main
```

Commit and push checkpoints:
```bash
git add <files>
git commit -m "Clear, single‑purpose message"
git push -u origin feature/<task>
```

Open a PR and keep it updated until merge.

**Merge Protocol**
Use a clean merge worktree so you never merge from a dirty working directory:
```bash
git worktree add -b merge/<task> ../repo-merge origin/main
git merge --no-ff feature/<task>
npm run lint
npm test
git push origin merge/<task>:main
```

**Cleanup**
When done, remove temporary worktrees:
```bash
git worktree remove ../repo-<task>
git worktree remove ../repo-merge
```
