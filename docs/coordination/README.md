# Multi-Agent Coordination Protocol

**Read this before doing anything.** This protocol exists because multiple agents (and the human operator) work in the same repo concurrently. Following it prevents two agents from (a) working the same task, (b) overwriting each other's commits, or (c) building on stale code.

The whole system is three files plus git itself:

| File | Role |
|---|---|
| `docs/coordination/WORKBOARD.md` | The task board. **The single registry of who is working on what.** |
| `CHANGELOG.md` | The record of what has already landed on `dev`. **The sync point every session starts from.** |
| git (branches, rebase, PRs) | The enforcement mechanism: claims are git commits; conflicts happen only if two agents collide. |
| `scripts/agent-sync.mjs` (`pnpm agent:sync`) | One-command session start: pull latest, show changelog + board. |

---

## 0. The golden rules (memorize these)

1. **Never overwrite another agent's commits.** Always pull before you start, before you commit, before you push.
2. **Never push to `dev` or `main` directly.** Work on a branch, merge via PR.
3. **Claim before you build.** The board is the lock. If a task is `in-progress`, it belongs to someone. Don't touch it.
4. **One agent per task, one task per agent at a time.**
5. **Keep changes additive where shared.** `packages/ui`, `packages/shared`, `docs/coordination/WORKBOARD.md`, and the root `CHANGELOG.md` are edited by many agents — append, don't rewrite.
6. **Rebase, don't rewrite history.** Never `force-push`, never `reset --hard`, never rewrite a branch that isn't yours.

---

## 1. Session start (every session, in order)

Run from the repo root:

```bash
pnpm agent:sync
```

This does, in one shot:
1. `git fetch origin` + `git checkout dev` + `git pull --rebase origin dev` — **always start from the latest `dev`**.
2. Prints the top of `CHANGELOG.md` (`[Unreleased]` section) so you know what already landed.
3. Prints the `WORKBOARD.md` so you know what's claimed, in-progress, and done.

Then:

4. **Read `docs/coordination/WORKBOARD.md`** and pick an unclaimed task. Prefer tasks matching your milestone/role.
5. **Announce your intent** (in your session output / to the operator): "I'm taking `M2-003 Customers list`."
6. **Claim it in the board**: set `Owner` to your agent name, `Status` to `in-progress`, and the branch name you'll use. Commit this claim *first*.

> Why commit the claim first? Your claim is now a real git commit. If another agent somehow claims the same task simultaneously, one of you will get a merge conflict on the board file — the conflict is the signal. The later one must back off and pick another task.

---

## 2. Claim format

Each WORKBOARD row has: `Task ID | Task | Milestone | Owner | Status | Branch | Notes`. Statuses: `planned` → `in-progress` → `done`. A `done` row never reverts to `in-progress`.

Claim checklist:
- [ ] Owner = your unique agent name (e.g. `agent-alpha`). **Never** claim a row owned by another agent without the operator reassigning it.
- [ ] Status = `in-progress`.
- [ ] Branch = `feat/<milestone>/<slug>` (e.g. `feat/M2/customers-list`). Milestone prefix optional but encouraged.
- [ ] Notes = one line on scope so others know your turf.

---

## 3. During work

- One logical change per commit (Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).
- Small, reviewable changes. If a task grows, split it into a follow-up task on the board.
- **Pull often**: `git pull --rebase origin dev` before every push so you never build a stack on stale code. If rebase shows conflicts, resolve carefully — you may have collided with a merged PR; read both sides before resolving.
- Respect turf (see §5): don't edit files owned by another in-progress task.

---

## 4. Session end (definition of done)

1. `git pull --rebase origin dev` once more.
2. Run `pnpm lint`, `pnpm typecheck` (and `pnpm test` if your change has logic/tests). Fix before pushing.
3. Push your branch: `git push origin <branch>`.
4. **Open a PR to `dev`.** PR title = the task (`feat(M2): customers list`). Description references the task ID, lists changes, and notes any docs touched.
5. **Update the board**: status → `done`, note the PR. Update `CHANGELOG.md` `[Unreleased]` with the change (see §6). Commit both *on the branch* so they merge together.
6. Merge via squash (maintains a clean linear `dev` history).

---

## 5. Turf / conflict avoidance

High-churn shared files that many agents touch — edit **additively only**:

| Path | Rule |
|---|---|
| `packages/ui` | Extend, don't refactor/rename existing exports. Add new components + exports. |
| `packages/shared` | Add new schemas/types; never rename/remove fields without updating every consumer (AGENTS.md §13). |
| `docs/coordination/WORKBOARD.md` | Only edit rows you own, plus marking new tasks `planned`. |
| `CHANGELOG.md` | Only append under `[Unreleased]`; never rewrite entries of merged work. |
| `apps/web/src/components/dashboard/*` | Dashboard is DONE (M1). Only touch for bugfixes, and announce in the board first. |
| Per-module pages (`apps/web/app/(app)/sales`, `inventory`, …) | One agent per module at a time; task rows declare the module. |

If your work *requires* touching another agent's in-progress turf, stop and coordinate via the board/operator. Don't silently edit.

---

## 6. The changelog is the source of merged truth

- Every merged PR appends to `CHANGELOG.md` `[Unreleased]` (keep-a-changelog style, grouped `Added/Changed/Fixed`).
- **Every session starts by reading it** (automated by `pnpm agent:sync`). If you see work you didn't know about, you were stale — pull and reconcile.
- On release, `[Unreleased]` is renamed to the version and a new empty section is opened.

---

## 7. When things go wrong

- **Merge conflict on the board file** → another agent claimed the same/adjacent task. Don't force it: read who owns it, pick another task, and tell the operator.
- **Your PR has a stale `dev` base** → the branch drifted; `git fetch origin && git rebase origin/dev` and resolve conflicts with both sides in mind.
- **You realize a committed change is wrong** → new fix commit (never amend/force-push a pushed branch).
- **A task is blocked** → leave it `in-progress`, add a `Notes` line with the blocker, and tell the operator. Don't silently abandon it.

---

## 8. Session report template (output at the end of every session)

```
SESSION REPORT
- Session: <date> <agent-name>
- Synced from: dev @ <commit-hash> (latest at start)
- Worked on: M2-003 Customers list (branch feat/M2/customers-list)
- Merged: PR #<n> — <one line>
- Board state: <task IDs> planned / <IDs> in-progress / <IDs> done
- Changelog: appended "<one line>" under [Unreleased]
- Next: (optionally) I intend to take <M2-00x>
```

This report is how the human and other agents know the state without guessing.
