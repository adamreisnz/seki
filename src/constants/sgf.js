import {stoneColors} from './stone.js'
import {markupTypes} from './markup.js'
import {setupTypes} from './setup.js'
import {scoreTypes} from './score.js'
import {gameTypes} from './game.js'

//The a and A characters. SGF coordinates run a-z for 0-25, and continue
//with A-Z for 26-51 on boards larger than 26.
export const charCodeA = 97
export const charCodeAUpper = 65
export const maxCoordinate = 51

//Info properties map for general game properties
export const sgfGameInfoMap = {

  //Record properties
  FF: 'record.version',
  CA: 'record.charset',
  AP: 'record.generator',
  US: 'record.transcriber',

  //Source properties
  SO: 'source.name',
  CP: 'source.copyright',

  //Game information
  GM: 'game.type',
  GN: 'game.name',
  DT: 'game.date',
  RE: 'game.result',
  ON: 'game.opening',
  AN: 'game.annotator',
  GC: 'game.description',

  //Board information. NOTE: a partial board is not in here, as it doesn't
  //map onto a single info property either way. It is read from VW, with the
  //private XL/XR/XT/XB properties as a fallback for older seki records, and
  //written as VW alone
  SZ: 'board.size',

  //Event information
  EV: 'event.name',
  PC: 'event.location',
  RO: 'event.round',

  //Rules
  KM: 'rules.komi',
  HA: 'rules.handicap',
  RU: 'rules.ruleset',
  TM: 'rules.time',
  OT: 'rules.overtime',
  TC: 'rules.numberOfPeriods', //Fox
  TT: 'rules.timePerPeriod', //Fox

  //Settings
  ST: 'settings',
}

//Player info properties map
export const sgfPlayerInfoMap = {
  PB: 'name',
  PW: 'name',
  BT: 'team',
  WT: 'team',
  BR: 'rank',
  WR: 'rank',
}

//Stone colors
export const sgfStoneColors = {
  [stoneColors.BLACK]: 'B',
  [stoneColors.WHITE]: 'W',
}

//Game types
export const sgfGameTypes = {
  [gameTypes.GO]: 1,
  [gameTypes.OTHELLO]: 2,
  [gameTypes.CHESS]: 3,
  [gameTypes.RENJU]: 4,
  [gameTypes.BACKGAMMON]: 6,
  [gameTypes.CHINESE_CHESS]: 7,
  [gameTypes.SHOGI]: 8,
  [gameTypes.UNKNOWN]: 0,
}

//Markup types
export const sgfMarkupTypes = {
  [markupTypes.LABEL]: 'LB',
  [markupTypes.LINE]: 'LN',
  [markupTypes.ARROW]: 'AR',
  [markupTypes.SELECT]: 'SL',
  [markupTypes.SQUARE]: 'SQ',
  [markupTypes.CIRCLE]: 'CR',
  [markupTypes.TRIANGLE]: 'TR',
  [markupTypes.MARK]: 'MA',
  [markupTypes.HAPPY]: 'MH',
  [markupTypes.SAD]: 'MS',
}

//Setup types
export const sgfSetupTypes = {
  [setupTypes.BLACK]: 'AB',
  [setupTypes.WHITE]: 'AW',
  [setupTypes.CLEAR]: 'AE',
}

//Scoring types
export const sgfScoreTypes = {
  [scoreTypes.TERRITORY_BLACK]: 'TB',
  [scoreTypes.TERRITORY_WHITE]: 'TW',
  [scoreTypes.TERRITORY_NEUTRAL]: 'TN',
}

//Token types produced by the SGF tokenizer, being the four things an SGF is
//made of plus a catch all for anything that isn't one of them. The names are
//the specification's own, so that a token can be read against the grammar.
export const sgfTokenTypes = {
  PARENTHESIS: 'parenthesis',
  SEMICOLON: 'semicolon',
  PROP_IDENT: 'prop_ident',
  C_VALUE_TYPE: 'c_value_type',
  INVALID: 'invalid',
}

//Diagnostic codes reported when reading a record that isn't well formed.
//None of these stop a record being read: each one names something that was
//skipped, so a caller can tell the difference between a record that read
//cleanly and one that read at all.
export const sgfDiagnosticCodes = {
  INVALID_INPUT: 'invalid_input',
  UNTERMINATED_VALUE: 'unterminated_value',
  VALUE_WITHOUT_IDENTIFIER: 'value_without_identifier',
  PROPERTY_WITHOUT_IDENTIFIER: 'property_without_identifier',
  PROPERTY_WITHOUT_VALUE: 'property_without_value',
  PROPERTY_OUTSIDE_NODE: 'property_outside_node',
  UNMATCHED_CLOSING_PARENTHESIS: 'unmatched_closing_parenthesis',
  UNCLOSED_PARENTHESIS: 'unclosed_parenthesis',
}
