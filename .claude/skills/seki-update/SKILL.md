---
name: seki-update
description: Cut a Seki release and pull it through to Let's Play Go. Use this skill ONLY when the user explicitly asks for it by name or in so many words — "/seki-update", "release Seki and update Let's Play Go", "cut a patch and pull it through". It bumps the version in the Seki main checkout, which publishes to npm, then runs `pnpm seki:update` in the Let's Play Go main checkout to move its lockfile pin and push it. Takes an optional argument of `patch`, `minor` or `major`; asks when it isn't given. Never invoke this off your own bat as part of finishing a ticket, and never as a follow-on to merging a PR.
---

# Releasing Seki and pulling it through

This is the one workflow that reaches outside a branch and outside this repo.
It publishes to npm and pushes commits to `main` in two repositories, so it
runs only when the user asks for it, in that moment and in so many words.

## This skill is the exception, and only while it is invoked

[seki-development](../seki-development/SKILL.md) says never to run
`pnpm version`, never to push a tag, and never to work in `../lets-play-go`
from a session rooted here. Those rules stand. This skill is the user handing
over all three deliberately, for one run, and nothing here licenses any of it
outside that:

- An explicit invocation covers **this** release and no other. Being asked for
  a patch today is not standing permission to cut one tomorrow.
- Nothing else in the session inherits it. Merging a PR, finishing a ticket or
  updating a dependency does not become a reason to release, and a request to
  release is not a request to merge anything first.
- If the change meant to go out isn't merged into `main` yet, stop and say so.
  Releasing publishes whatever `main` holds, not what is sitting in a PR.

## Where this runs

Both **main checkouts**, never a worktree. A release describes `main`, and the
tag has to sit on the commit `main` actually points at. Resolve the paths
rather than assuming the current directory is either of them:

```bash
rtk git worktree list
```

The first entry is the Seki main checkout. Let's Play Go is its sibling,
`../lets-play-go` from there — sibling of the main checkout, not of whatever
worktree you are in.

## 1. Check both checkouts are ready

In each of the two main checkouts, in turn:

```bash
rtk git branch --show-current && rtk git status --short && rtk git pull --ff-only
```

Every one of these has to hold before anything is bumped:

- **On `main`.** Bumping on a branch tags a branch, and `postversion` pushes
  that tag; the Release workflow then publishes from it.
- **Clean working tree in Seki.** `pnpm version` refuses a dirty tree, and a
  half-finished edit has no business in a published package.
- **Up to date with `origin`.** A fast-forward pull, not a merge — if it can't
  fast-forward, the local `main` has commits of its own and that is for the
  user to sort out before a release, not something to reconcile here.
- **The change being released is in Seki's `main`.** Check the merge landed
  (`rtk git log --oneline -5`) rather than taking the PR's word for it.

Let's Play Go's tree does not have to be clean — `pnpm seki:update` stashes
what is open and gives it back afterwards. Say what you found if it wasn't
clean, so the user knows their work was moved and restored.

## 2. Ask which kind of bump

If the invocation named one — `/seki-update patch` — take it and don't ask
again. Otherwise ask, with `AskUserQuestion`, offering `patch`, `minor` and
`major`. Never guess from the size of the diff: whether a change is breaking
is a judgement about the public surface, and it is the user's to make.

Seki is consumed by Let's Play Go as `github:adamreisnz/seki` in both
`apps/web` and `apps/api`, so a `major` reaches a real app on the next update
— which is the one this skill is about to run.

## 3. Bump the version in Seki

From the Seki main checkout:

```bash
pnpm version <patch|minor|major>
```

Know what that does before you run it, because most of it is not reversible:

1. `preversion` runs `pnpm check` — lint plus the full vitest run. A failure
   here aborts the bump with nothing written and nothing pushed, which is the
   one safe failure in this sequence. Report it and stop; don't retry past it.
2. `version` writes the new version to `package.json` and runs
   `scripts/sync-version.js`, which mirrors it into
   [src/constants/app.js](src/constants/app.js).
3. npm commits the bump and tags it `vX.Y.Z`.
4. `postversion` runs `git push && git push --tags`.

That last step is the point of no return: pushing a `v*` tag starts the
**Release** workflow, which publishes the package to npm. A published version
cannot be replaced, only superseded by another release.

Confirm the tag and the sync landed:

```bash
rtk git log --oneline -1 && rtk grep -n appVersion src/constants/app.js
```

## 4. Pull it through to Let's Play Go

From the Let's Play Go main checkout:

```bash
pnpm seki:update
```

The pin is a GitHub tarball rather than an npm version, so this resolves
against the commit just pushed and does not wait on the npm publish. The
script stashes anything open, runs `pnpm update -r @reis/seki`, commits
`pnpm-lock.yaml` on its own as `Update Seki to <version> (<commit>)`, pushes
it, and gives the stash back.

Read its output rather than assuming it worked. It has three endings that are
not a failure but are not a finished job either, and each one needs passing on
verbatim rather than glossing:

- **"Seki is already at the latest commit, nothing to commit."** The pin was
  already there. Say so; don't go looking for something to commit.
- **A push it couldn't make** — no upstream, a detached HEAD, or a rejected
  push. The lockfile commit exists locally either way; say where it is and
  what the script asked for, and don't force anything.
- **A stash it couldn't restore, or a lockfile modified again afterwards.**
  The user's own work is involved. Repeat the script's warning as it stands
  and leave it to them.

## 5. Verify and report

Check what actually got installed, in the workspace package rather than the
repo root:

```bash
node -p "require('./apps/web/node_modules/@reis/seki/package.json').version"
```

Then confirm both repos are level with `origin` (`rtk git status --short
--branch` in each), and tell the user in one place:

- the new Seki version and its tag,
- the Seki commit Let's Play Go now pins, and the commit that recorded it,
- that the Release workflow is publishing to npm, with a word on whether it
  has gone green yet (`rtk gh run list --workflow=release.yml --limit 1`),
- anything from step 4 that needs them, stashes included.

## Definition of done

- [ ] The user asked for this release explicitly, in this session.
- [ ] Both main checkouts were on `main`, up to date, and Seki's was clean.
- [ ] The bump ran in the Seki main checkout, and `pnpm check` passed as part
      of it.
- [ ] The version commit and `vX.Y.Z` tag are on `origin`.
- [ ] `pnpm seki:update` ran in the Let's Play Go main checkout, and its
      outcome — committed, already current, or something needing the user —
      has been passed on as it stands.
- [ ] Both repos are level with `origin`, and any stash the script took has
      been given back.
- [ ] The user has been told the version, the tag and the pinned commit.
