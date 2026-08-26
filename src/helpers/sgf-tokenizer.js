
/**
 * SGF tokenizer
 *
 * An SGF is a game tree written as parentheses, semicolons, property
 * identifiers and property values, and that is all this turns a record into:
 * a flat list of typed tokens, each carrying where in the source it came
 * from. Building the node tree from that list is the reader's job.
 *
 * The point of doing it this way is that nothing goes missing quietly.
 * Matching the whole record against a regex with a `g` flag, which is what
 * this replaces, skips whatever fails to match without saying so, and a
 * malformed record therefore came out as a smaller game rather than as an
 * error. Here every character of the input ends up inside a token, and
 * anything that isn't recognisable is an `invalid` token with a position on
 * it, so the reader can report it and carry on.
 *
 * The rule set is the one Sabaki's src/tokenize.js uses (MIT, Copyright ©
 * 2015-2020 Yichuan Shen), rewritten around sticky regexes and a cursor so
 * that it needs no `doken` dependency, and so that an unterminated value is
 * a token to be reported rather than an exception.
 */

import {sgfTokenTypes} from '../constants/sgf.js'

//The rules, tried in order at the cursor, each anchored to it with the sticky
//flag. Order matters: the two bracket rules have to be tried before the catch
//all, and the terminated value before the unterminated one.
//
//NOTE: between them these cover every possible character, so the cursor
//always advances. Whitespace, brackets, semicolons and letters have rules of
//their own, and the catch all takes everything else, a stray closing bracket
//included.
const rules = [

  //Whitespace separates tokens without being one, so it has no type. This is
  //also what lets a property value list wrap over several lines.
  {type: null, regex: /\s+/y},

  //The game tree structure
  {type: sgfTokenTypes.PARENTHESIS, regex: /[()]/y},
  {type: sgfTokenTypes.SEMICOLON, regex: /;/y},

  //Property identifiers are uppercase letters, but FF[3] allowed lowercase
  //ones to be mixed in for compatibility with older applications, to be
  //ignored when reading. They have to be tokenised all the same, or a
  //property like the CoPyright IGS writes ends the node early.
  {type: sgfTokenTypes.PROP_IDENT, regex: /[A-Za-z]+/y},

  //A property value, being everything between [ and ], where a backslash
  //escapes whatever follows it.
  //
  //NOTE: a pattern looking for a ] not directly preceded by a backslash
  //cannot tell an escaped bracket (\]) apart from an escaped backslash at
  //the end of a value (\\]), and the latter used to make the whole property
  //fail to match and be dropped.
  {type: sgfTokenTypes.C_VALUE_TYPE, regex: /\[(?:\\[\s\S]|[^\\\]])*\]/y},

  //A [ that never closes, which runs to the end of the record. Only reached
  //when the rule above fails, so this is always a truncated record rather
  //than a value.
  {type: sgfTokenTypes.INVALID, regex: /\[[\s\S]*$/y},

  //Anything else, taken as a run so that a stretch of junk is reported once
  //rather than per character
  {type: sgfTokenTypes.INVALID, regex: /[^\s();[A-Za-z]+/y},
]

/**
 * Tokenize an SGF record
 *
 * Returns a flat array of tokens, each being a plain object of the shape
 * `{type, value, row, col, pos}`. The value is the exact source text the
 * token covers, so `pos + value.length` is where the next token starts.
 * Rows and columns count from 1, as an editor shows them; `pos` counts from
 * 0, being an index into the string.
 *
 * Never throws, and never returns early: a record that is nothing but junk
 * tokenizes into a list of `invalid` tokens rather than into an error.
 */
export function tokenizeSgf(sgf) {

  //Nothing to read
  if (typeof sgf !== 'string' || sgf === '') {
    return []
  }

  //Walk the record with a cursor, keeping track of where it is
  const tokens = []
  let pos = 0
  let row = 1
  let col = 1

  //Read a token at a time until the record runs out
  while (pos < sgf.length) {

    //Match a rule at the cursor
    const match = matchRule(sgf, pos)
    const {type, value} = match

    //Keep it, unless it was whitespace
    if (type !== null) {
      tokens.push({type, value, row, col, pos})
    }

    //Move the cursor past it
    const moved = advance(value, row, col)
    row = moved.row
    col = moved.col
    pos += value.length
  }

  //Return the tokens
  return tokens
}

/**
 * Match the first rule that applies at the cursor
 */
function matchRule(sgf, pos) {

  //Try each rule in turn, anchored at the cursor
  for (const {type, regex} of rules) {
    regex.lastIndex = pos
    const match = regex.exec(sgf)
    if (match && match[0] !== '') {
      return {type, value: match[0]}
    }
  }

  //Unreachable with the rules above, which cover every character. Kept all
  //the same, because a tokenizer that fails to advance hangs on the record
  //instead of reporting it.
  return {type: sgfTokenTypes.INVALID, value: sgf.charAt(pos)}
}

/**
 * Work out where the cursor ends up after consuming a piece of the record
 */
function advance(value, row, col) {

  //Line breaks are written any of three ways, and a CRLF pair is one break
  const lines = value.split(/\r\n|\n|\r/)

  //Stayed on the same line
  if (lines.length === 1) {
    return {row, col: col + value.length}
  }

  //Moved down, and the column restarts within the last line
  return {
    row: row + lines.length - 1,
    col: lines[lines.length - 1].length + 1,
  }
}
