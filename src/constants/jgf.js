
//JGF version
export const jgfVersion = '2.0.0'

/**
 * Top level JGF info accessors
 *
 * Each entry names one field a JGF record carries at the top level, with a
 * getter that reads it off a game info object and a setter that writes it
 * onto a JGF object, both by plain property access. The path is what the
 * field is called in a JGF record, and is what the accessors are checked
 * against in the spec beside this file.
 *
 * NOTE: this used to be a flat list of path strings, walked with the get()
 * and set() helpers. A path naming a field that nothing else knew about
 * resolved to undefined without a word, which is how 'game.dates' came to sit
 * in this list while nothing ever assigned it, and the field came out of
 * every record undefined. An accessor has to name a real property, so a field
 * with nowhere to read from is visible on sight rather than silently empty.
 */
export const jgfInfoAccessors = [

  //Record
  {
    path: 'record.version',
    get: info => info.record?.version,
    set: (jgf, value) => ((jgf.record ??= {}).version = value),
  },
  {
    path: 'record.charset',
    get: info => info.record?.charset,
    set: (jgf, value) => ((jgf.record ??= {}).charset = value),
  },
  {
    path: 'record.generator',
    get: info => info.record?.generator,
    set: (jgf, value) => ((jgf.record ??= {}).generator = value),
  },
  {
    path: 'record.transcriber',
    get: info => info.record?.transcriber,
    set: (jgf, value) => ((jgf.record ??= {}).transcriber = value),
  },

  //Source
  {
    path: 'source.name',
    get: info => info.source?.name,
    set: (jgf, value) => ((jgf.source ??= {}).name = value),
  },
  {
    path: 'source.url',
    get: info => info.source?.url,
    set: (jgf, value) => ((jgf.source ??= {}).url = value),
  },
  {
    path: 'source.copyright',
    get: info => info.source?.copyright,
    set: (jgf, value) => ((jgf.source ??= {}).copyright = value),
  },

  //Game
  {
    path: 'game.type',
    get: info => info.game?.type,
    set: (jgf, value) => ((jgf.game ??= {}).type = value),
  },
  {
    path: 'game.name',
    get: info => info.game?.name,
    set: (jgf, value) => ((jgf.game ??= {}).name = value),
  },
  {
    path: 'game.result',
    get: info => info.game?.result,
    set: (jgf, value) => ((jgf.game ??= {}).result = value),
  },
  {
    path: 'game.date',
    get: info => info.game?.date,
    set: (jgf, value) => ((jgf.game ??= {}).date = value),
  },
  {
    path: 'game.dates',
    get: info => info.game?.dates,
    set: (jgf, value) => ((jgf.game ??= {}).dates = value),
  },
  {
    path: 'game.opening',
    get: info => info.game?.opening,
    set: (jgf, value) => ((jgf.game ??= {}).opening = value),
  },
  {
    path: 'game.annotator',
    get: info => info.game?.annotator,
    set: (jgf, value) => ((jgf.game ??= {}).annotator = value),
  },
  {
    path: 'game.description',
    get: info => info.game?.description,
    set: (jgf, value) => ((jgf.game ??= {}).description = value),
  },

  //Event
  {
    path: 'event.name',
    get: info => info.event?.name,
    set: (jgf, value) => ((jgf.event ??= {}).name = value),
  },
  {
    path: 'event.location',
    get: info => info.event?.location,
    set: (jgf, value) => ((jgf.event ??= {}).location = value),
  },
  {
    path: 'event.round',
    get: info => info.event?.round,
    set: (jgf, value) => ((jgf.event ??= {}).round = value),
  },

  //Rules
  {
    path: 'rules.ruleset',
    get: info => info.rules?.ruleset,
    set: (jgf, value) => ((jgf.rules ??= {}).ruleset = value),
  },
  {
    path: 'rules.allowSuicide',
    get: info => info.rules?.allowSuicide,
    set: (jgf, value) => ((jgf.rules ??= {}).allowSuicide = value),
  },
  {
    path: 'rules.disallowRepeats',
    get: info => info.rules?.disallowRepeats,
    set: (jgf, value) => ((jgf.rules ??= {}).disallowRepeats = value),
  },
  {
    path: 'rules.komi',
    get: info => info.rules?.komi,
    set: (jgf, value) => ((jgf.rules ??= {}).komi = value),
  },
  {
    path: 'rules.handicap',
    get: info => info.rules?.handicap,
    set: (jgf, value) => ((jgf.rules ??= {}).handicap = value),
  },
  {
    path: 'rules.time',
    get: info => info.rules?.time,
    set: (jgf, value) => ((jgf.rules ??= {}).time = value),
  },
  {
    path: 'rules.overtime',
    get: info => info.rules?.overtime,
    set: (jgf, value) => ((jgf.rules ??= {}).overtime = value),
  },
  {
    path: 'rules.numberOfPeriods',
    get: info => info.rules?.numberOfPeriods,
    set: (jgf, value) => ((jgf.rules ??= {}).numberOfPeriods = value),
  },
  {
    path: 'rules.timePerPeriod',
    get: info => info.rules?.timePerPeriod,
    set: (jgf, value) => ((jgf.rules ??= {}).timePerPeriod = value),
  },

  //Board
  {
    path: 'board.size',
    get: info => info.board?.size,
    set: (jgf, value) => ((jgf.board ??= {}).size = value),
  },
  {
    path: 'board.width',
    get: info => info.board?.width,
    set: (jgf, value) => ((jgf.board ??= {}).width = value),
  },
  {
    path: 'board.height',
    get: info => info.board?.height,
    set: (jgf, value) => ((jgf.board ??= {}).height = value),
  },
  {
    path: 'board.cutOffLeft',
    get: info => info.board?.cutOffLeft,
    set: (jgf, value) => ((jgf.board ??= {}).cutOffLeft = value),
  },
  {
    path: 'board.cutOffRight',
    get: info => info.board?.cutOffRight,
    set: (jgf, value) => ((jgf.board ??= {}).cutOffRight = value),
  },
  {
    path: 'board.cutOffTop',
    get: info => info.board?.cutOffTop,
    set: (jgf, value) => ((jgf.board ??= {}).cutOffTop = value),
  },
  {
    path: 'board.cutOffBottom',
    get: info => info.board?.cutOffBottom,
    set: (jgf, value) => ((jgf.board ??= {}).cutOffBottom = value),
  },

  //Players, settings and meta data
  {
    path: 'players',
    get: info => info.players,
    set: (jgf, value) => (jgf.players = value),
  },
  {
    path: 'settings',
    get: info => info.settings,
    set: (jgf, value) => (jgf.settings = value),
  },
  {
    path: 'meta',
    get: info => info.meta,
    set: (jgf, value) => (jgf.meta = value),
  },
]

//Node fields to copy over, which are plain keys on a node rather than paths
//through one, so they need no accessor to reach them
export const jgfNodeFields = [
  'name',
  'comments',
  'solution',
]
