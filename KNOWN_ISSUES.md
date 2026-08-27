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

---

## Setup stones capture only when a new node was created for them

**Where:** `Game#addStone`, `src/classes/game.js`

**Pinned by:** `src/classes/modes/player-mode-edit.spec.js`, "captures nothing
when the node takes the setup instruction directly"

`addStone` asks `validateSetupPlacement` for the position the placement would
produce, which already has any resulting capture applied to it. When the
current node is a move node, a child node is created to hold the setup
instruction and that computed position goes onto the stack, so the capture
stands. When the current node can take the instruction itself, the computed
position is dropped and the bare stone is set on the position the game already
has, so the capture never happens.

**Effect:** the same edit captures or does not depending on which node the game
happens to be sitting on, which is nothing the caller can see or control.
Setting up a position by placing stones one at a time can leave dead stones on
the board.

**What a fix involves:** using the computed position on both paths. The
in place branch would need to replace the position on the stack rather than
mutate it, which is what the other branch already does, so the fix is small but
it changes what a setup edit does to the position stack.

---

## Tearing the player down drops buffered free draw lines

**Where:** `Player#teardown`, `PlayerModeEdit#flushLineAddBuffer`

**Pinned by:** `src/classes/modes/player-mode-edit.spec.js`, "drops the buffer
when the player is the one being torn down"

`flushLineAddBuffer` exists so that lines drawn in the last few milliseconds
before teardown are emitted rather than lost with the pending timeout, and it
does that when the mode handler is torn down on its own. Through
`Player#teardown` it does not: the player sets `isTornDown` before it reaches
its mode handlers, and `Player#triggerEvent` returns early once that flag is
set. The flush runs, the event is raised, and nothing receives it.

**Effect:** an app that tears the player down while the user is mid stroke — a
route change, a modal closing — loses the last buffered fragment of that
stroke, which is the case the flush was written for.

**What a fix involves:** flushing before the flag is set, or letting the flush
raise its event past it. Both change teardown ordering, so it wants doing
deliberately rather than as a side effect.

---

## The arrow edit tool throws, after writing to the record

**Where:** `PlayerModeEdit#edit`, `MarkupFactory`

**Pinned by:** `src/classes/modes/player-mode-edit.spec.js`, "throws on the
arrow tool, having already written the markup"

`editTools.ARROW` is listed as a markup tool and `getEditingMarkupType` maps it
onto `markupTypes.ARROW`, but there is no arrow markup object for the factory
to build — the type is marked "currently not implemented" in
`src/constants/markup.js`. The edit writes the arrow into the node and the
board sync then throws on the way out.

**Effect:** the record is left holding markup that cannot be drawn, and the
edit throws. Nothing in the player selects this tool, so it is only reachable
by a consumer calling `setEditTool(editTools.ARROW)` directly.

**What a fix involves:** either a `MarkupArrow` object, which is a drawing
change, or taking `ARROW` out of `isUsingMarkupTool` so the tool is inert
rather than fatal. The second is the smaller of the two and loses nothing that
works today.

---

## `editToolChange` announces the stone tool rather than the colour it selected

**Where:** `PlayerModeEdit#setEditTool`

**Pinned by:** `src/classes/modes/player-mode-edit.spec.js`, "announces the
stone toggle as the stone tool, not the colour it landed on"

`editTools.STONE` is a toggle rather than a tool of its own: asking for it sets
the tool to black or white, alternating. The event raised at the end of the
method carries the tool that was asked for rather than `this.tool`.

**Effect:** a toolbar listening to `editToolChange` to light up the active tool
is told `stone` when the active tool is now `black`, so it cannot show which
colour is in hand without asking `getEditTool()` separately.

**What a fix involves:** raising the event with `this.tool`. That is a change
to what consumers receive, so it needs saying in a release note.

---

## An edit event is emitted for a stone the game refused to place

**Where:** `PlayerModeEdit#addStone`

**Pinned by:** `src/classes/modes/player-mode-edit.spec.js`, "announces a stone
the game refused to place"

`Game#addStone` validates the colour and returns without touching the position
if it does not recognise it. The mode raises its `edit` event regardless.

**Effect:** a second player instance synchronising off those events is told
about a stone that was never placed. Harmless in practice, since the peer's own
`addStone` refuses it in turn, but the event does not describe what happened.

**What a fix involves:** having `Game#addStone` report whether it placed
anything, which it currently does not, and raising the event only when it did.

---

## A theme cannot supply a coordinate generator function

**Where:** `CoordinatesLayer#getCharacter`, `Theme#get`

**Pinned by:** `src/classes/layers/coordinates-layer.spec.js`, "cannot take a
generator function from the theme"

`getCharacter` accepts either the name of one of the built in generators or a
function to call per coordinate, and `coordinates.horizontal.type` is where a
theme says which. But `Theme#get` calls any function it finds and returns the
result, so a generator handed to the theme is invoked once, with no arguments,
and whatever it returns is then looked up as if it were the name of a
generator. Nothing matches, and every label falls back to a bare index.

**Effect:** the function branch in `getCharacter` is unreachable through the
only route a consumer has to it. A board themed with a custom coordinate
generator silently shows `0 1 2 3` instead.

**What a fix involves:** reading this one property without the theme's
function calling, which `Theme` has no way to ask for today. Adding one is a
change to the theme API; special casing the read inside the layer is not, and
is probably the smaller of the two.

---

## Clicking a variation marker follows the wrong variation

**Where:** `PlayerModeReplay#selectMoveVariation`, `Player#goToNextPosition`

**Pinned by:** `src/classes/modes/player-mode-replay.spec.js`, "follows the
selected path rather than the variation clicked"

`selectMoveVariation` works out the index of the variation that was clicked and
calls `player.goToNextPosition(i)`. `Player#goToNextPosition` takes no
arguments: it reads `game.getCurrentPathIndex()` and passes that to the game
instead. The index worked out from the click is discarded.

**Effect:** on a node that forks, clicking the marker for variation B walks
down variation A — whichever branch the remembered path is on. The only way to
reach the other branch is `selectNextVariation`, which is bound to the keyboard
rather than to the markers. This is the visible half of replay mode's variation
handling, so it is worth more than its size suggests.

**What a fix involves:** giving `Player#goToNextPosition` the optional index
its caller already assumes it has, defaulting to the current path index. It has
several other callers, none of which pass one, so the default keeps them
working.

---

## Markers do not appear until something has been navigated

**Where:** `Player#processLoadedGame`, `PlayerModeReplay#onGameLoad`

**Pinned by:** `src/classes/modes/player-mode-replay.spec.js`, "shows nothing
at all until something has been navigated"

Loading a record calls `processPathChange(true)`, and the `true` suppresses the
`pathChange` event on purpose. Rendering the markers hangs off that event, and
replay mode's `onGameLoad` handler only stops auto play, so nothing renders
them. They appear the first time the user navigates.

**Effect:** a record shown at its opening position carries none of the markers
it should — no variation letters where the first move forks, no last move
marker where a record opens part way in. A problem collection or joseki
dictionary lands the user on exactly that position.

**What a fix involves:** rendering the markers from the game load handler as
well, after the board position has been updated. The ordering matters: the
position sync rebuilds the markup layer, so markers drawn before it are lost.

---

## `Game#findNodeByName` cannot ever have worked

**Where:** `Game#findNodeByName`, `src/classes/game.js`

**Pinned by:** `src/classes/game-info.spec.js`, "throws when asked to find a
node by name"

```js
findNodeByName(name) {
  return this.root.findNodeByName(name)
}
```

`GameNode` has no `findNodeByName`. It has `findNode(target, path)`, which
looks for a node by identity rather than by name, and nothing else of the sort.
Calling this method throws a `TypeError` on the first line, whatever it is
given.

**Effect:** a public method on `Game` that always throws. `findNamedNode(name)`
on the same class does what this one reads as though it should, and is what
`getPathToNamedNode` and `goToNamedNode` actually use, so nothing inside the
library is affected — but it is exported surface, and a consumer reaching for
the obvious looking name gets a crash.

**What a fix involves:** deleting it, or making it an alias for
`findNamedNode`. Deleting is a breaking change on paper and no change at all in
practice, since no call to it can currently succeed.

---

## Re-bootstrapping a board leaves the previous one in the container

**Where:** `Board#setupElements`, `src/classes/board.js`

**Pinned by:** `src/classes/board-bootstrap.spec.js`, "leaves the board it
built last time in the container"

`setupElements` resets `this.elements` and builds a fresh wrapper, board
element and canvas container, appending the wrapper to the container it was
given. It never takes out the wrapper a previous bootstrap put there. Bootstrap
the same player or board onto the same element twice and the container ends up
holding two complete boards, one of them orphaned: nothing points at it any
more, and its canvases are never drawn to again.

**Effect:** an app that calls `bootstrap()` again rather than tearing down
first stacks a dead board under the live one, at full size. Tearing down in
between is fine — `Board#destroy` takes the wrapper out — so this is only the
bootstrap-onto-bootstrap path. The listeners on the old element are removed
correctly, and the audio elements and the resize observer both take care of
this case already, so this is the one place in the bootstrap path where it is
not handled.

**What a fix involves:** removing the previous wrapper in `setupElements`
before building the new one, the way `createAudioElements` calls
`removeAudioElements` first. The element references are already on
`this.elements` when it runs, so it is a couple of lines.
