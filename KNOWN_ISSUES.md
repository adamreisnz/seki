# Known issues

Things that are known to be wrong or incomplete, and have been consciously left
that way for now. Anything listed here should have enough detail to pick up
without re-deriving it.

---

## Records with several dates keep only the first

**Where:** `src/classes/game.js` (`setInfo`, `getInfo`), `src/constants/jgf.js`

SGF's `DT` property and JGF's `game.dates` both allow more than one date, which
is how a game played over several days, or an adjourned game, is recorded:

```
DT[2024-03-01,2024-03-02]
```

The SGF parser reads this correctly and hands over the full list as
`info.game.dates`. `Game#setInfo` then takes the first entry only:

```js
if (typeof gameDate !== 'undefined') {
  this.setGameDate(gameDate)
}
else if (Array.isArray(gameDates) && gameDates.length > 0) {
  this.setGameDate(gameDates[0])
}
```

There is no `gameDates` field on `Game`, so the remaining dates are dropped at
that point and cannot be recovered. `getInfo` still writes out a `game.dates`
key, and `jgfPaths` still lists `game.dates`, but both read a field that is
never assigned, so the value is always `undefined`. Those lines are left in
place deliberately: they mark where the field belongs, and removing them would
make this easier to lose track of, not easier to find.

**Effect:** a multi-date record loads with only its first date, and exporting it
writes back a single date. The other dates are lost on a round trip. Single
date records, which is the overwhelming majority, are unaffected.

**What a fix involves:**

1. Store the full list on `Game`, e.g. a `gameDates` array, with `gameDate`
   remaining the first entry so existing callers keep working
2. Have `setInfo` populate both, and `getInfo` emit the list
3. Have `ConvertToSgf` write `DT` as a comma separated list when there is more
   than one date, and `ConvertToJgf` emit `game.dates`
4. Cover the round trip in `src/classes/game.spec.js` and the converter specs

**Also worth deciding at that point:** `Game#setGameDate` only accepts a date in
`YYYY`, `YYYY-MM` or `YYYY-MM-DD` form and silently truncates anything else.
The SGF spec allows shorthand within a list, where `2024-03-01,02` means the
first and second of March, which the parser does not currently expand.

---

## Reordering a variation swaps rather than moves it

**Where:** `src/classes/game-node.js` (`moveChild`)

`moveChild` puts the child at the target index and the child that was there at
the child's old index, so it is a swap. `moveChildUp` and `moveChildDown` only
ever move by one place, where a swap and a move are the same thing, so those
are unaffected.

`Game#makeMainVariation` is not. It calls `moveToIndex(0)` on each node up to
the root, so promoting the third variation of a node leaves the variation that
used to be first sitting in third place, rather than second.

**Effect:** the promoted variation does become the main line, which is what the
method is for. The remaining variations change order relative to each other,
which a UI listing them will show.

**What a fix involves:** splice the child out and back in at the target index
instead of swapping, keeping the active path index pointing at whichever child
it pointed at before. `src/classes/game-node.spec.js` documents the current
swap behaviour and would need updating along with it.

---

## Canvas drawing is not covered by the test suite

**Where:** `src/classes/layers/*`, `src/classes/objects/markup-*.js`,
`src/classes/objects/stone-*.js`

The suite covers everything these classes decide, being which theme properties
apply, what gets erased and redrawn, and what ends up on which layer. It does
not cover what they actually paint, because that needs a real canvas and a way
to compare the result against a reference image.

**Effect:** a change to the drawing code itself, as opposed to the bookkeeping
around it, can pass the whole suite and still be visibly wrong. Statement
coverage sits at roughly 65% overall, and nearly all of what is missing is
these draw methods.

**What a fix involves:** a browser test environment with a canvas, and image
comparison against committed reference renders for a handful of positions.
That is a project in itself rather than a change, hence its being listed here.
