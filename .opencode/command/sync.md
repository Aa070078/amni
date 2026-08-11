---
description: Sync to latest dev and review changelog, workboard, and COMMS — the multi-agent session start.
agent: build
---

Run the repo's multi-agent session start from the repo root (`F:\amni`):

1. Run `pnpm agent:sync`.
2. Read the printed sections and report back concisely:
   - Latest `CHANGELOG.md [Unreleased]` entries (what already landed)
   - `WORKBOARD.md` — current claims/owners/status (who owns what)
   - `COMMS.md` — any messages addressed to this agent (`@<agent-name>` / `@all`)
3. If another agent asked this agent something, reply in COMMS (append-only).
4. Do NOT claim a task unless the operator instructs you to.
