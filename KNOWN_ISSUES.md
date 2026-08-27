# Known issues

Things that are known to be wrong or incomplete, and have been consciously left
that way for now. Anything listed here should have enough detail to pick up
without re-deriving it.

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

## What the canvas actually paints is not covered by the test suite

**Where:** `src/classes/layers/*`, `src/classes/objects/markup-*.js`,
`src/classes/objects/stone-*.js`

The suite covers everything these classes decide, being which theme properties
apply, what gets erased and redrawn, what ends up on which layer, and — through
the recording context in [test/helpers.js](test/helpers.js) — the geometry each
draw method asks the canvas for. What it does not cover is the pixels that come
out the other end, because that needs a real canvas and a way to compare the
result against a reference image.

**Effect:** a change that draws the right shapes in the wrong colours, or that
paints them in an order that hides one behind another, can pass the whole suite
and still be visibly wrong. Anything that changes *which* shape is drawn, or
where, is caught.

**What a fix involves:** a browser test environment with a canvas, and image
comparison against committed reference renders for a handful of positions. That
is a project in itself rather than a change, hence its being listed here.
