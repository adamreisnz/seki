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
