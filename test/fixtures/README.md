# Fixture corpus

Records written by real software, kept byte for byte as they were published,
so that the converter specs have something to read that nobody on this project
wrote. The inline strings in `src/classes/converters/*.spec.js` pin specific
parsing decisions and stay where they are; these files answer a different
question, which is whether the readers cope with what actual programs emit.

Nothing here is published to npm. The `files` field in `package.json` lists
`src` and `JGF.md` only, and `.npmignore` names `test` as well.

## Rules for this directory

- **Never edit a record.** A fixture that has been tidied up is no longer
  evidence of what the writing software does, which is the only reason these
  files are worth having. If a record is wrong for a test, add another one.
- **Byte for byte.** `.gitattributes` marks this directory `-text`, so git
  leaves line endings and legacy encodings alone. Several records are not
  UTF-8 and must not be normalised into it.
- **Record the provenance.** Every file below says where it came from. A
  record with no traceable source cannot be told apart from something someone
  invented, so it is worth no more than an inline string.

## `gib/`, `ngf/`, and the four Sabaki SGFs

Vendored from [Sabaki](https://github.com/SabakiHQ/Sabaki), which is MIT
licensed (Copyright © 2015-2020 Yichuan Shen). Taken from commit
[`d451324`](https://github.com/SabakiHQ/Sabaki/tree/d451324de9353cbb96ccee0cd3b6e6137a48dfaa/test),
where they live under `test/gib/`, `test/ngf/` and `test/sgf/`.

| File | What it is |
| --- | --- |
| `gib/euc-kr.gib` | Tygem record in EUC-KR. Korean result and rank text. |
| `gib/gb2312.gib` | Tygem record in GB2312. Five stone handicap, Chinese date. |
| `gib/utf8.gib` | Tygem record in UTF-8. Three stone handicap, kyu players. |
| `ngf/even.ngf` | WBaduk even game, 333 moves, komi stored as `7`. |
| `ngf/gb2312.ngf` | WBaduk record in GB2312, using the `GI` header dialect. |
| `ngf/handicap2.ngf` | WBaduk two stone handicap game, 189 moves. |
| `sgf/beginner_game.sgf` | Nine stone handicap, `HA` with an `AB` placement. |
| `sgf/blank_game.sgf` | Header only, no moves, and an empty `DT[]`. |
| `sgf/pro_game.sgf` | 1976 title game, 235 moves, no `SZ` property at all. |
| `sgf/shodan_game.sgf` | Even game, 83 moves, resignation result. |

## `sgf/ff4_ex.sgf`, `sgf/print1.sgf`, `sgf/print2.sgf`

The SGF FF[4] specification's own example files, from
<https://www.red-bean.com/sgf/examples/> (Arno Hollosi, last updated
1997-05-27). Downloaded unchanged.

| File | What it reaches that the records above do not |
| --- | --- |
| `ff4_ex.sgf` | Compressed point lists, a two tree collection, passes written both `B[]` and `W[tt]`, markup, arrows and lines, and a deliberate suicide move at the end. |
| `print1.sgf` | A multi-date `DT[1996-10-18,19]`, in the shorthand form where the second date carries only its day. Heavily branched, 142 nodes over 6 forks. |
| `print2.sgf` | A month-only `DT[1996-08]`, and the deepest tree in the corpus at 314 nodes. |

## `sgf/large-board.sgf`

**Hand written for this corpus**, and the only file here that is not a real
record. Nothing in either source above uses a board past 19 lines, and a
record that does is needed to exercise the uppercase half of the coordinate
alphabet on a game that actually replays rather than on a single move.

It is a 29×29 board with twenty moves, deliberately placed far enough apart
that no capture is possible, so the record stays legal without being a real
game. Coordinates `A`, `B` and `C` stand for 26, 27 and 28. Should a genuine
large board record turn up, replace this file with it.

## Adding to this directory

Drop the file under `test/fixtures/<format>/`, add a row above saying where it
came from and what it is for, and reference it from a spec through
`test/fixtures.js`. Records in legacy encodings are especially welcome, since
the readers currently assume UTF-8 throughout.
