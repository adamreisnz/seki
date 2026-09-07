---
name: seki-update
description: Cut a Seki release and, if the user wants it, pull it through to Let's Play Go. Use this skill ONLY when the user explicitly asks for it by name or in so many words — "/seki-update", "release Seki and update Let's Play Go", "cut a patch and pull it through". It bumps the version in the Seki main checkout, which publishes to npm, then asks whether to run `pnpm seki:update` in the Let's Play Go main checkout to move its lockfile pin and push it, or to leave Let's Play Go alone. Takes an optional argument of `patch`, `minor` or `major`; asks when it isn't given. Never invoke this off your own bat as part of finishing a ticket, and never as a follow-on to merging a PR.
---

# Releasing Seki and pulling it through

This is the one workflow that reaches outside a branch and outside this repo.
It publishes to npm and pushes commits to `main` in up to two repositories, so
it runs only when the user asks for it, in that moment and in so many words.

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
- The reach into Let's Play Go is the user's to grant per run, and step 1 asks
  for it. A "yes" there covers this release only, and a "skip" means this
  session does not touch `../lets-play-go` at all.
- If the change meant to go out isn't merged into `main` yet, stop and say so.
  Releasing publishes whatever `main` holds, not what is sitting in a PR.

## Where this runs

The **main checkouts**, never a worktree. A release describes `main`, and the
tag has to sit on the commit `main` actually points at. Resolve the paths
rather than assuming the current directory is either of them:

```bash
rtk git worktree list
```

The first entry is the Seki main checkout. Let's Play Go is its sibling,
`../lets-play-go` from there — sibling of the main checkout, not of whatever
worktree you are in.

## 1. Ask what this release is

Two things have to be settled before anything is checked or bumped, and both
are the user's call. Ask them together in a single `AskUserQuestion`, unless
the invocation already answered one:

**Which kind of bump.** If the invocation named one — `/seki-update patch` —
take it and don't ask again. Otherwise offer `patch`, `minor` and `major`.
Never guess from the size of the diff: whether a change is breaking is a
judgement about the public surface, and it is the user's to make.

**Whether to pull it through to Let's Play Go.** Offer updating Let's Play Go
and skipping it. Default the recommendation to updating — pulling through is
the usual reason this skill exists — but take a skip at face value and don't
argue it. If the invocation already said which way ("release Seki only",
"don't touch Let's Play Go", "cut a patch and pull it through"), take that and
don't ask again.

Seki is consumed by Let's Play Go from npm under a caret range, in
`apps/web`, `apps/api` and `packages/shared`, so a `major` reaches a real app
on the next update — which is this run, if the user asked to pull it through.
Worth saying plainly when the bump is `major` and they're deciding.

Skipping leaves Let's Play Go pinned to the older Seki release until someone
updates it later. That is a fine thing to want; just say it back so the user
knows that is what they chose.

## 2. Check the checkouts are ready

In the Seki main checkout, and in the Let's Play Go main checkout too if step 1
said to pull through:

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

If the user chose to skip Let's Play Go, don't run anything in
`../lets-play-go` — not even a status check. Skipping means leaving it alone.

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

Only if step 1 said to. If the user chose to skip, go straight to step 5 and
report the release on its own.

Seki is resolved from npm, not from a git tarball, so the pull-through cannot
start until the **Release** workflow has actually published. Wait for it to go
green before running anything:

```bash
rtk gh run watch "$(rtk gh run list --workflow=release.yml --limit 1 --json databaseId -q '.[0].databaseId')" --exit-status --interval 10
```

Running the update early does not just fail, it fails quietly. pnpm caches the
registry metadata it fetched, so a run that happens before the publish records
the old version as the newest one and every retry for the next few minutes
repeats "already at the latest release" from that cache, with nothing in the
output saying the answer is stale. Wait first and the whole question does not
arise.

Then, from the Let's Play Go main checkout:

```bash
pnpm seki:update
```

The script stashes anything open, runs `pnpm update -r --latest @reis/seki`,
commits `pnpm-lock.yaml`, `pnpm-workspace.yaml` and the `package.json` files
it touched as `Update Seki to <version>`, pushes that, and gives the stash
back.

Read its output rather than assuming it worked. It has three endings that are
not a failure but are not a finished job either, and each one needs passing on
verbatim rather than glossing:

- **"Seki is already at the latest release, nothing to commit."** The pin was
  already there. Say so; don't go looking for something to commit. If the
  release you just cut is the one missing, this is the stale-cache case above
  rather than a finished job — say that instead of reporting success.
- **A push it couldn't make** — no upstream, a detached HEAD, or a rejected
  push. The lockfile commit exists locally either way; say where it is and
  what the script asked for, and don't force anything.
- **A stash it couldn't restore, or a lockfile modified again afterwards.**
  The user's own work is involved. Repeat the script's warning as it stands
  and leave it to them.

### The release age gate

pnpm 11 refuses to resolve a release younger than its `minimumReleaseAge`,
which is a 24 hour cutoff here and is not configured anywhere in the repo — it
is pnpm's own default. A release cut minutes ago is always inside it, so a
pull-through on the same day hits one of these:

```
[WARN] "@reis/seki@>=6.0.0 <7.0.0-0" was updated to 6.0.0, not 6.0.1, to match
the version preferred by your manifests and already installed dependencies

[ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION] @reis/seki@X.Y.Z was published at
<timestamp>, within the minimumReleaseAge cutoff (<timestamp>)
```

`minimumReleaseAgeExclude` in Let's Play Go's own `pnpm-workspace.yaml` is the
escape hatch, and it already carries an entry for whichever Seki release was
last pulled through while it was still fresh. Adding this release's version to
that list is a
supply-chain policy change, so it is the user's call and not something to do
on your own. Say the gate is what is blocking it and offer the two ways out:

- **Wait it out.** The pull-through happens 24 hours after the publish, with
  no policy change and no entry to clean up later. Nothing needs doing in the
  meantime; the release itself is already out on npm.
- **Add the exclude entry**, if the user asks for it. Replace the stale
  `@reis/seki@<old>` line rather than accumulating one per release, and do not
  remove the old line before the update lands — the lockfile still names the
  old version until then, and dropping its entry fails the policy check
  outright.

Never reach for `--config.minimumReleaseAge=0`. It gets the resolution through
without recording anything, so CI and every other checkout hit the same gate
on a lockfile that only installs locally.

## 5. Verify and report

If you pulled through, check what actually got installed, in the workspace
package rather than the repo root:

```bash
node -p "require('./apps/web/node_modules/@reis/seki/package.json').version"
```

Then confirm each repo you touched is level with `origin` (`rtk git status
--short --branch` in each), and tell the user in one place:

- the new Seki version and its tag,
- the Seki version Let's Play Go now resolves to, and the commit that recorded
  it — or, if they skipped it or the release age gate held it back, that Let's
  Play Go was left alone and still pins the older release,
- whether the Release workflow has gone green and the version is on npm
  (`rtk gh run list --workflow=release.yml --limit 1`),
- anything from step 4 that needs them, stashes included.

## Definition of done

- [ ] The user asked for this release explicitly, in this session.
- [ ] The user said which bump, and whether Let's Play Go was to be updated or
      skipped.
- [ ] Seki's main checkout was on `main`, up to date and clean — and Let's Play
      Go's too, if it was being updated.
- [ ] The bump ran in the Seki main checkout, and `pnpm check` passed as part
      of it.
- [ ] The version commit and `vX.Y.Z` tag are on `origin`.
- [ ] If pulling through: the Release workflow went green **before**
      `pnpm seki:update` ran in the Let's Play Go main checkout, and its
      outcome — committed, already current, held back by the release age gate,
      or something needing the user — has been passed on as it stands. If
      skipping: nothing was run in `../lets-play-go`.
- [ ] No supply-chain policy was relaxed without the user asking for it, and
      no resolution was forced through with `--config.minimumReleaseAge=0`.
- [ ] Every repo touched is level with `origin`, and any stash the script took
      has been given back.
- [ ] The user has been told the version, the tag, and either the version
      Let's Play Go now resolves to or why it was left alone.
