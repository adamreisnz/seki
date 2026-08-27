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

/**
 * Game info accessors, keyed by the SGF property that carries the field
 *
 * Each entry names the game info field an SGF property maps onto, with a
 * getter that reads it off a game info object and a setter that writes it onto
 * one, both by plain property access. The path is what the field is called in
 * a game info object, and is what the accessors are checked against in the
 * spec beside this file.
 *
 * NOTE: this used to map each property to a path string, walked with the get()
 * and set() helpers. A path naming a field that nothing else knew about
 * resolved to undefined without a word, either dropping the property from
 * every record written or landing it somewhere nothing ever read it. An
 * accessor has to name a real property, so a field with nowhere to go is
 * visible on sight.
 */
export const sgfGameInfoAccessors = {

  //Record properties
  FF: {
    path: 'record.version',
    get: info => info.record?.version,
    set: (info, value) => ((info.record ??= {}).version = value),
  },
  CA: {
    path: 'record.charset',
    get: info => info.record?.charset,
    set: (info, value) => ((info.record ??= {}).charset = value),
  },
  AP: {
    path: 'record.generator',
    get: info => info.record?.generator,
    set: (info, value) => ((info.record ??= {}).generator = value),
  },
  US: {
    path: 'record.transcriber',
    get: info => info.record?.transcriber,
    set: (info, value) => ((info.record ??= {}).transcriber = value),
  },

  //Source properties
  SO: {
    path: 'source.name',
    get: info => info.source?.name,
    set: (info, value) => ((info.source ??= {}).name = value),
  },
  CP: {
    path: 'source.copyright',
    get: info => info.source?.copyright,
    set: (info, value) => ((info.source ??= {}).copyright = value),
  },

  //Game information
  GM: {
    path: 'game.type',
    get: info => info.game?.type,
    set: (info, value) => ((info.game ??= {}).type = value),
  },
  GN: {
    path: 'game.name',
    get: info => info.game?.name,
    set: (info, value) => ((info.game ??= {}).name = value),
  },
  DT: {
    path: 'game.date',
    get: info => info.game?.date,
    set: (info, value) => ((info.game ??= {}).date = value),
  },
  RE: {
    path: 'game.result',
    get: info => info.game?.result,
    set: (info, value) => ((info.game ??= {}).result = value),
  },
  ON: {
    path: 'game.opening',
    get: info => info.game?.opening,
    set: (info, value) => ((info.game ??= {}).opening = value),
  },
  AN: {
    path: 'game.annotator',
    get: info => info.game?.annotator,
    set: (info, value) => ((info.game ??= {}).annotator = value),
  },
  GC: {
    path: 'game.description',
    get: info => info.game?.description,
    set: (info, value) => ((info.game ??= {}).description = value),
  },

  //Board information. NOTE: a partial board is not in here, as it doesn't
  //map onto a single info property either way. It is read from VW, with the
  //private XL/XR/XT/XB properties as a fallback for older seki records, and
  //written as VW alone
  SZ: {
    path: 'board.size',
    get: info => info.board?.size,
    set: (info, value) => ((info.board ??= {}).size = value),
  },

  //Event information
  EV: {
    path: 'event.name',
    get: info => info.event?.name,
    set: (info, value) => ((info.event ??= {}).name = value),
  },
  PC: {
    path: 'event.location',
    get: info => info.event?.location,
    set: (info, value) => ((info.event ??= {}).location = value),
  },
  RO: {
    path: 'event.round',
    get: info => info.event?.round,
    set: (info, value) => ((info.event ??= {}).round = value),
  },

  //Rules
  KM: {
    path: 'rules.komi',
    get: info => info.rules?.komi,
    set: (info, value) => ((info.rules ??= {}).komi = value),
  },
  HA: {
    path: 'rules.handicap',
    get: info => info.rules?.handicap,
    set: (info, value) => ((info.rules ??= {}).handicap = value),
  },
  RU: {
    path: 'rules.ruleset',
    get: info => info.rules?.ruleset,
    set: (info, value) => ((info.rules ??= {}).ruleset = value),
  },
  TM: {
    path: 'rules.time',
    get: info => info.rules?.time,
    set: (info, value) => ((info.rules ??= {}).time = value),
  },
  OT: {
    path: 'rules.overtime',
    get: info => info.rules?.overtime,
    set: (info, value) => ((info.rules ??= {}).overtime = value),
  },
  TC: { //Fox
    path: 'rules.numberOfPeriods',
    get: info => info.rules?.numberOfPeriods,
    set: (info, value) => ((info.rules ??= {}).numberOfPeriods = value),
  },
  TT: { //Fox
    path: 'rules.timePerPeriod',
    get: info => info.rules?.timePerPeriod,
    set: (info, value) => ((info.rules ??= {}).timePerPeriod = value),
  },

  //Settings
  ST: {
    path: 'settings',
    get: info => info.settings,
    set: (info, value) => (info.settings = value),
  },
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
