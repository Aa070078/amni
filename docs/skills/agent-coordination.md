---
name: agent-coordination
summary: Compact coordination guidance for multi-agent work in this repo, including `pnpm agent:sync`, task claiming, and COMMS etiquette.
---

# Agent Coordination (repo skill)

Purpose: a lightweight skill for AI agents to follow the repo's multi-agent workflow.

When to use
- At the start of a session in this repo.
- When planning or claiming tasks, or when touching shared files.

Do
- Run `pnpm agent:sync` from the repo root.
- Read `CHANGELOG.md`, `docs/coordination/WORKBOARD.md`, and `docs/coordination/COMMS.md`.
- Claim one task by setting `Owner`, `Status: in-progress`, and `Branch` in `WORKBOARD.md`; commit the claim first.
- Work on a feature branch, not `dev` or `main`.
- Keep shared docs additive-only and coordinate via COMMS when overlapping.

Don't
- Edit another owner's board row.
- Force-push or rewrite shared history.
- Ignore the session report template in `docs/coordination/README.md`.

See also: `AGENTS.md` and `docs/coordination/README.md`.
