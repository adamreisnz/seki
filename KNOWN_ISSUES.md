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

`test/fixtures/sgf/print1.sgf` exercises this, carrying `DT[1996-10-18,19]`
and loading as `1996-10-18`. It is also an example of the shorthand form
mentioned below, where the second date gives only its day.

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

## The NGF reader is reverse engineered and incomplete

**Where:** `src/classes/converters/convert-from-ngf.js`

WBaduk has never published the NGF format, so the reader follows what the two
established open source readers do, being [Sabaki][sabaki-ngf] and
[gofish][gofish-ngf], both of which say the same in their own comments. It was
checked against five real records, which it reads and replays legally end to
end. What it does not do:

- **Passes.** No sample carries one and no reader knows how NGF writes one, so
  a move whose coordinates fall outside the board is dropped rather than being
  read as a pass. The GIB reader has the same gap, marked there with a `TODO`.
- **Korean text.** A record written in Korean spells the result out as, for
  example, `250수 흑7집승`, and a rank as `7단P`. Neither is matched, so such a
  record loads with a player name but no rank, and no result. The moves and the
  rest of the header are unaffected.
- **The implied half point on komi.** NGF writes komi as a whole number, and
  both readers above add `0.5` back on for an even game, which is where this
  reader's `7` becoming `7.5` comes from. Nothing confirms that is right, it is
  simply what every other reader does.
- **Handicap placement above three stones.** NGF records no free placement, so
  handicap stones are placed on the fixed points. WBaduk's third stone sits in
  the top left rather than the bottom right, which was confirmed against a
  three stone record that plays its 261st move on the bottom right star point.
  Counts of four and above place the same set of stones either way, so they are
  taken from `handicapPlacements` unchanged and are not separately confirmed.

**Effect:** all of the above degrade to missing information rather than to
wrong information, other than the komi half point, which is a guess that is
applied to every even game.

**What a fix involves:** records that exercise each case. The gaps are gaps in
knowledge of the format rather than in the code, so nothing can be settled
without a record that shows what WBaduk actually writes.

**What the fixture corpus settled.** The three WBaduk records in
`test/fixtures/ngf/` settle one of the four points above and none of the other
three:

- **The half point on komi is corroborated.** `even.ngf` stores komi as a
  whole `7` and reports its result as `Black wins by 0.5!`. Both territory
  and area scoring give whole number margins against a whole number komi, so
  a half point margin can only have come from a komi carrying one. That is
  not proof that the rule is `floor + 0.5` for every value, but it is the
  first evidence that the half point is real rather than a convention the
  other readers copied from each other.
- **Passes, Korean text and handicap above three stones are all still open.**
  No record in the corpus carries a pass, all three declare a move count that
  the reader matches exactly. None is written in Korean; the one non-ASCII
  record is Chinese, and its header is not read at all for the separate
  reason below. The only handicap record is a two stone game.

[sabaki-ngf]: https://github.com/SabakiHQ/Sabaki/blob/master/src/modules/fileformats/ngf.js
[gofish-ngf]: https://github.com/rooklift/gofish/blob/master/gofish/ngf.py

---

## An SGF property value list is truncated at a line break

**Where:** `src/classes/converters/convert-from-sgf.js` (`regexSequence`,
`regexNode`)

Both patterns join a property's values with `(?:${valuePattern})+`, which
allows nothing at all between one `]` and the next `[`. The SGF specification
allows whitespace there, and writers use it to wrap long lists:

```
AB[dd][de][df][dg][dh][di][dj][nj][ni][nh][nf][ne][nd][ij][ii][ih][hq]
[gq][fq][eq][dr][ds][dq][dp][cp][bp][ap][iq][ir][is][bo][bn][an][ms][mr]
AW[pd][pe][pf][pg][ph][pi][pj][fd][fe][ff][fh][fi][fj][kh][ki][kj][os][or]
```

The match ends at the first line break, so only the seventeen points on the
first line are read. Worse, the node match ends there too, so every property
after the break is dropped along with them:

```js
parse('(;FF[4]SZ[19]AB[aa]\n[bb]KM[7.5])').getKomi()  // 0, not 7.5
```

**Effect:** a record that wraps a long `AB`, `AW`, `TB`, `TW` or `LB` list, as
`test/fixtures/sgf/ff4_ex.sgf` does, loads with part of that list missing and
with every later property of the same node missing too. Nothing is warned
about, so the record looks like it read cleanly. A record that keeps each
node on one line, which is most of them, is unaffected.

**What a fix involves:** allowing whitespace between values in the two
patterns, being `(?:\s*${valuePattern})+`. `ff4_ex.sgf` then reads all 35
points of the `AB` list and the 37 of the `AW` list that follows it, so the
spec that currently pins the truncated behaviour is the test for the fix.

---

## The NGF reader does not recognise the GI header dialect

**Where:** `src/classes/converters/convert-from-ngf.js`

The reader identifies every header value by the line it sits on, which is the
only thing a format with no keys allows. Some records instead prefix each
header line with `GI` and carry eleven of them where a current record carries
twelve, so every index lands on the wrong line:

```
GI韩国十段战
GI朴承华 初段
GI李载雄 五段
GI
GI
GI2006-9-5
GI19
GI0
GI0
GI6
GI211
```

**Effect:** the board size, handicap, komi, date and result are all read off
lines that are not what they are taken for, so all five come back wrong or
empty. `test/fixtures/ngf/gb2312.ngf` is the example. The moves survive,
because they are found by scanning every line for a `PM` prefix rather than
from a fixed offset, so the record still replays all 211 of its moves.

**What a fix involves:** detecting the prefix on the first line and reading
the header from a second set of indices when it is present. The meaning of
each line can be read off the record above, but only one such record is
available, so the mapping is a guess from a single sample in the way the rest
of this reader is.

---

## A short legacy record can still be decoded as the wrong language

**Where:** `src/helpers/encoding.js` (`recoveryCandidates`, `scoreDecoding`)

Every reader now takes bytes and works out the encoding for itself, so a
record that declares a charset in `CA`, or that carries a byte order mark, or
that is valid UTF-8, is read correctly. What is left is the guess made for a
record that does none of those, which is scored the way Sabaki scores it: by
decoding the record's own text under each candidate and counting what script
the code points land in.

Two cases score wrongly:

- A few Chinese characters on their own decode as clean hangul under EUC-KR,
  and the hangul language marker then rewards that over the correct GB18030
  reading. It takes a line or two of text before the right answer wins.
- Cyrillic written in windows-1251 forms valid GBK pairs, which score exactly
  as well as the real thing. GB18030 is tried first, so a Russian record is
  only read right if it says `CA[windows-1251]`.

**Effect:** the player names and comments of a very short undeclared Chinese
record, or of any undeclared Russian one, come out as the wrong language
rather than as replacement characters. Every record in
`test/fixtures/` is read correctly.

**What a fix involves:** a character frequency model, which is what jschardet
is and what Sabaki uses ahead of this scorer. Seki has no runtime dependencies
and is not taking one for this, so a fix means porting or writing one.

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
