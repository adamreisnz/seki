---
name: seki-development
description: The development workflow for any change to the Seki codebase. Use this skill at the start of EVERY task that will touch code, docs, config or skills in this repo — implementing a feature, fixing a bug, refactoring, updating dependencies, editing CI, anything that ends in a commit — even when the user doesn't mention workflow, branches or PRs. It covers where to work (a dedicated worktree per PR, never main), how to check the branch's PR hasn't already been merged, what has to happen before a PR opens, how to open and report the PR, and what "done" means (CI green, comments addressed). It also covers what is never yours to do on your own: merging a PR, or cutting a release.
---

# Seki development workflow

Every change in this repo travels the same road: a dedicated worktree and
branch, implementation there, a review of the diff, a PR against `main`, and
CI green before handover. This skill is the map of that road.

## Worktree discipline

All implementation happens in a worktree under `.claude/worktrees/`, on a
branch created for that worktree. Never commit to `main`, and never create a
worktree for `main` itself — the main checkout is the user's own working copy
and stays clean. The reason is isolation both ways: the user can keep using
their checkout while you work, and your half-finished state never leaks into
theirs.

- **One worktree and one branch per PR.** If a session tackles several things
  that will become different PRs, give each its own worktree. Don't borrow a
  branch or worktree left over from another piece of work because it happens
  to exist — a PR built on someone else's branch carries their commits, and
  two PRs sharing a worktree can't be reviewed or merged independently.
- **Check where you are before every git write** — commit, push, branch,
  reset, rebase — proactively, not after something lands in the wrong place:

  ```bash
  rtk git branch --show-current && rtk git status
  ```

  If that shows `main`, or a branch belonging to different work, stop and move
  to the right worktree before writing anything. This check is cheap; a commit
  on `main` is not.
- **Check the branch's PR hasn't already been merged**, whenever a worktree
  or branch already existed before this session — you were dropped into one
  from earlier work, or the user is following up on something already handed
  over. Ask GitHub what became of it:

  ```bash
  rtk gh pr view --json number,state,mergedAt,url
  ```

  `OPEN` means carry on there and push onto that PR. `MERGED` or `CLOSED`
  means that branch is spent: pushing to it does not reopen the PR, so further
  commits sit on a dead branch and never reach `main`. Start fresh instead —
  new worktree, new branch off an up-to-date `main`, new PR — as below. An
  error saying no pull request was found just means the branch has no PR yet,
  which is fine; carry on.
- **Creating a worktree by hand**, when the harness hasn't given you one or
  the one you have is spent. The path is `.claude/worktrees/<name>` from the
  main checkout, which is `../<name>` when you are already inside a worktree:

  ```bash
  rtk git fetch origin && rtk git worktree add .claude/worktrees/<name> -b claude/<name> origin/main
  ```

  Name it for the work at hand — a fresh name, not the spent one. Branch off
  `origin/main`, never off the merged branch, so the new PR's diff is only the
  new work. Then run every subsequent command with the new worktree as the
  working directory.
- **Prepare each fresh worktree** before running anything in it. A bare
  `git worktree add` has no `node_modules`, so neither the linter nor the
  tests will run until this is done:

  ```bash
  pnpm install --frozen-lockfile
  ```

If the harness has already put you in a worktree on a fresh `claude/...`
branch, that satisfies all of this — verify with the checks above and carry on
there rather than creating a second one.

## Implementation

Work as usual inside the worktree, with the repo's standing conventions: the
global CLAUDE.md applies (notably the `rtk` prefix on shell commands).

The library is plain ES modules under `src/` with no build step, and
[src/index.js](src/index.js) is both the entry point and the public surface —
a new class, helper or constant that consumers should be able to reach has to
be exported there, or it ships as dead weight. Specs sit next to the code they
cover (`grid.js` / `grid.spec.js`, run by vitest), so a change to a file with
a spec updates that spec in the same commit.

What gets published is the `files` list in [package.json](package.json): `src`
minus the specs, plus `JGF.md`. A new doc or asset that consumers actually
need has to be added there deliberately; anything else stays out of the
package by default.

For a visual check of board rendering there is the embeddable player in
`embed/`, a separate mini package with its own dependencies:

```bash
cd embed && pnpm install && pnpm dev
```

Vite serves it on <http://localhost:4041>. Shut it down again when the check
is done.

Commit as you go with messages in the repo's style: imperative, sentence-case,
describing the change ("Reserve the blue spot for the engine's best move",
"Keep free drawn lines across a redraw").

### Releases are the user's

**Never run `pnpm version`** — patch, minor or major — and never push a tag.
The `postversion` script pushes the commit and the tag straight away, and a
`v*` tag is exactly what starts the Release workflow that publishes to npm.
A version bump here is not local bookkeeping, it is a publish. Cutting a
release is the user's decision on their timing, from an up-to-date `main`;
the README documents how they do it.

The one exception is the user asking for a release in so many words, in that
moment — typically by invoking the [seki-update](../seki-update/SKILL.md)
skill, which cuts the release and pulls it through to Let's Play Go. That ask
covers that release and nothing else: finishing a ticket, merging a PR, or
having been asked to release once before are none of them a reason to run it
again.

### Let's Play Go — the sister app

Seki is consumed by [Let's Play Go](https://github.com/adamreisnz/lets-play-go)
as `@reis/seki`, installed straight from GitHub and checked out beside the
main checkout at `../lets-play-go` — sibling of the main checkout, not of the
worktree you are in, so resolve it from `rtk git worktree list` rather than
from the current directory. Two things follow:

- **Never work in `../lets-play-go` from a session that started here.** No
  edits, no branches, no commits, no PRs. A session rooted in this repo has
  this repo's worktree, branch and PR; changes made in a sibling checkout from
  here land outside all of it. When a change here also needs something over
  there, spawn a task chip for it (`spawn_task`, with `cwd` set to that
  checkout) and carry on with the part that belongs here. Write the chip
  prompt so it stands on its own — what to change, where, and why — because
  the session that picks it up has none of this conversation. The single
  exception is the [seki-update](../seki-update/SKILL.md) skill, which the
  user invokes to move that checkout's Seki pin after a release, and which
  touches nothing else there.
- **A change to the public API is a change to a real consumer.** Renaming or
  removing an export, or changing what a class returns, reaches that app the
  next time the user updates its pin. Keep the old shape working where you
  reasonably can, and when you can't, say so in the PR body rather than
  leaving it to be discovered downstream.

## Review — before any PR

When implementation is complete, review the working diff before opening
anything: run the built-in `/code-review` gate over it, and audit what the
diff introduces for consistency and missed reuse — new classes, constants and
helpers have to justify not being an existing one, since `src/constants/` and
`src/helpers/` already carry a lot. Then run the same checks CI will:

```bash
pnpm check
```

That is `pnpm lint` plus the full vitest run — the CI **Lint and test** job in
one command. If the change touches `src/index.js`, the `files` or `exports`
fields, or `.npmignore`, also run what the **Verify the published package**
job checks:

```bash
npm pack --dry-run --json | grep '\.spec\.js'
node -e "import('./src/index.js')"
```

The first should print nothing (a published spec fails CI), the second should
exit quietly. Opening a PR without any of this just moves the review onto
CI's clock.

## PR and CI

Once the review passes:

1. Push the branch and open a PR against `main` with `rtk gh pr create` — or
   push onto the branch's existing PR if it is still `OPEN`. A branch whose PR
   has already merged gets neither; back up to Worktree discipline and redo
   the work on a new worktree and branch first. Title in the same imperative
   style as the commit messages; body explains what and why.
2. Tell the user about it as `#XXX - Description`, where only the PR number is
   a link and the description is plain text:

   ```markdown
   [#42](https://github.com/adamreisnz/seki/pull/42) - Reserve the blue spot for the engine's best move
   ```

3. Monitor CI until it is green. A PR runs two jobs — **Lint and test** and
   **Verify the published package** — and `rtk gh pr checks <number> --watch`
   (or polling without `--watch`) shows both. If either fails, read the
   failing step's log, fix in the worktree, re-run the checks locally, and
   push; don't hand over with CI red or still pending.
4. If the user leaves comments on the PR — review comments or plain issue
   comments — read them (`rtk gh pr view <number> --comments`), apply the
   changes they call for, and push. Comments are part of the task, not
   optional feedback.

**Never merge a PR.** An open PR with green CI is where your part ends —
merging is the user's decision and belongs to them. It is never part of
finishing a ticket, no matter how routine the change looks, how small the diff
is, or how long the PR has been sitting green. That applies to the PR you just
opened and to any other PR in this repo. The only exception is the user asking
for a merge, in that moment and in so many words; a ticket that says
"implement X" is not that ask, and neither is earlier permission to merge
something else. Merging also moves what Let's Play Go installs, so it is the
user's call twice over.

Nothing on a PR branch can publish anything — npm publishes on `v*` tags only
— so there is no reason to hold back from pushing fixes.

## Definition of done

Work is ready for handover when all of these hold:

- [ ] A dedicated worktree exists with the changes, on its own branch.
- [ ] The diff has been reviewed and `pnpm check` passes.
- [ ] Everything is committed and pushed to GitHub.
- [ ] A PR is open against `main` — an open one carrying this work, not a
      merged one the branch was reused from — reported to the user with a link
      as: `[#XX](https://link-to-pr) - Description`.
- [ ] CI on the PR is green, both jobs.
- [ ] Any PR comments from the user have been addressed
      (there won't be any yet if the PR has just been opened).
- [ ] The PR is left open and unmerged for the user, and no version bump or
      tag has been pushed.
- [ ] Any embed dev server started for testing has been shut down.

Anything short of this — uncommitted files, a PR with pending checks, an
unanswered review comment — is unfinished, and the handover message should say
so explicitly rather than imply completion.
