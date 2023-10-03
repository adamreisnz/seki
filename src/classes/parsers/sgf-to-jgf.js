import KifuFactory from '../kifu-factory.js'
import {gameTypes, stoneColors} from '../../constants/jgf.js'

//Regexes
const regexSequence = /\(|\)|(;(\s*[A-Z]+\s*((\[\])|(\[(.|\s)*?([^\\]\])))+)*)/g
const regexNode = /[A-Z]+\s*((\[\])|(\[(.|\s)*?([^\\]\])))+/g
const regexProperty = /[A-Z]+/
const regexValues = /(\[\])|(\[(.|\s)*?([^\\]\]))/g

//A char
const aChar = String('a').charCodeAt(0)

//These properties need a node object
const needsNode = [
  'B', 'W', 'C', 'N',
  'AB', 'AW', 'AE', 'PL',
  'LB', 'CR', 'SQ', 'TR',
  'MA', 'SL', 'TW', 'TB',
]

//These properties represent the black player
const blackPlayerFields = [
  'PB', 'BT', 'BR',
]

//Property to parser map
const parsingMap = {

  //Application, game type, board size, komi, date
  AP: 'parseApp',
  FF: 'parseSgfFormat',
  GM: 'parseGame',
  SZ: 'parseSize',
  KM: 'parseKomi',
  DT: 'parseDate',

  //Variations handling
  ST: 'parseVariations',

  //Player info handling
  PB: 'parsePlayer',
  PW: 'parsePlayer',
  BT: 'parsePlayer',
  WT: 'parsePlayer',
  BR: 'parsePlayer',
  WR: 'parsePlayer',

  //Moves
  B: 'parseMove',
  W: 'parseMove',

  //Node annotation
  C: 'parseComment',
  N: 'parseNodeName',

  //Board setup
  AB: 'parseSetup',
  AW: 'parseSetup',
  AE: 'parseSetup',
  PL: 'parseTurn',
  TW: 'parseScore',
  TB: 'parseScore',

  //Markup
  CR: 'parseMarkup',
  SQ: 'parseMarkup',
  TR: 'parseMarkup',
  MA: 'parseMarkup',
  SL: 'parseMarkup',
  LB: 'parseLabel',
}

/**
 * Property map
 */
export const propertyMap = {

  //Record properties
  AP: 'record.application',
  CA: 'record.charset',
  CP: 'record.copyright',
  SO: 'record.source',
  US: 'record.transcriber',
  AN: 'record.annotator',

  //Game properties
  GM: 'game.type',
  GN: 'game.name',
  KM: 'game.komi',
  HA: 'game.handicap',
  RE: 'game.result',
  RU: 'game.rules',
  TM: 'game.time.main',
  OT: 'game.time.overtime',
  DT: 'game.dates',
  PC: 'game.location',
  EV: 'game.event',
  RO: 'game.round',
  ON: 'game.opening',
  GC: 'game.comment',

  //Player info properties
  PB: 'name',
  PW: 'name',
  BT: 'team',
  WT: 'team',
  BR: 'rank',
  WR: 'rank',

  //Node annotation
  N: 'name',
  C: 'comments',
  CR: 'circle',
  TR: 'triangle',
  SQ: 'square',
  MA: 'mark',
  SL: 'select',
  LB: 'label',
}

/**
 * This is a parser to convert SGF to JGF
 */
export default class SgfToJgf {

  /**
   * Parse SGF string into a JGF object or string
   */
  parse(sgf) {

    //Get new JGF object (with SGF node as a base)
    const jgf = KifuFactory.blankJgf({record: {sgf: {}}})

    //Initialize
    const stack = []
    let container = jgf.tree

    //Create first node for game, which is usually an empty board position, but can
    //contain comments or board setup instructions, which will be added to the node
    //later if needed.
    let node = {root: true}
    container.push(node)

    //Find sequence of elements
    let sequence = sgf.match(regexSequence)

    //Loop sequence items
    for (let i = 0; i < sequence.length; i++) {

      //Push stack if new variation found
      if (sequence[i] === '(') {

        //First encounter, this defines the main tree branch, so skip
        if (i === 0 || i === '0') {
          continue
        }

        //Push the current container to the stack
        stack.push(container)

        //Create variation container if it doesn't exist yet
        if (!Array.isArray(container[container.length - 1])) {
          container.push([])
        }

        //Use variation container
        container = container[container.length - 1]

        //Now create moves container
        container.push([])
        container = container[container.length - 1]
        continue
      }

      //Grab last container from stack if end of variation reached
      else if (sequence[i] === ')') {
        if (stack.length) {
          container = stack.pop()
        }
        continue
      }

      //Make array of properties within this sequence
      let properties = sequence[i].match(regexNode) || []

      //Loop them
      for (let j = 0; j < properties.length; j++) {

        //Get property's key and separate values
        let key = regexProperty.exec(properties[j])[0].toUpperCase()
        let values = properties[j].match(regexValues)

        //Remove additional braces [ and ]
        for (let k = 0; k < values.length; k++) {
          values[k] = values[k].substring(1, values[k].length - 1).replace(/\\(?!\\)/g, '')
        }

        //SGF parser present for this key? Call it, and we're done
        if (parsingMap[key]) {

          //Does this type of property need a node?
          if (needsNode.indexOf(key) !== -1) {

            //If no node object present, create a new node
            //For moves, always a new node is created
            if (!node || key === 'B' || key === 'W') {
              node = {}
              container.push(node)
            }
          }

          //Apply parsing function on node
          this[parsingMap[key]](jgf, node, key, values)
          continue
        }

        //No SGF parser present, we continue with regular property handling

        //If there is only one value, simplify array
        if (values.length === 1) {
          values = values[0]
        }

        //SGF alias known? Then this is an info element and we handle it accordingly
        if (typeof propertyMap[key] !== 'undefined') {

          //The position in the JGF object is represented by dot separated strings
          //in the property map. Split the position and use the setInfo helper
          //to set the info on the JGF object
          this.setInfo(jgf, propertyMap[key].split('.'), values)
          continue
        }

        //No SGF alias present either, just append the data

        //Save in node
        if (node) {
          node[key] = values
        }

        //Save in root
        else {
          jgf[key] = values
        }
      }

      //Reset node, unless this was the root node
      if (node && !node.root) {
        node = null
      }
    }

    //Return jgf
    return jgf
  }

  /*****************************************************************************
   * Parsers
   ***/

  /**
   * Application parser function (doesn't overwrite existing signature)
   */
  parseApp(jgf, node, key, value) {
    if (!jgf.record.application) {
      let app = value[0].split(':')
      if (app.length > 1) {
        jgf.record.application = app[0] + ' v' + app[1]
      }
      else {
        jgf.record.application = app[0]
      }
    }
  }

  /**
   * SGF format parser
   */
  parseSgfFormat() {
    return
  }

  /**
   * Game type parser function
   */
  parseGame(jgf, node, key, value) {
    const type = value[0]
    jgf.game.type = this.convertGameType(type)
  }

  /**
   * Move parser function
   */
  parseMove(jgf, node, key, value) {

    //Create move container
    node.move = {}

    //Pass
    if (value[0] === '' || (jgf.width <= 19 && value[0] === 'tt')) {
      node.move[key] = 'pass'
    }

    //Regular move
    else {
      node.move[key] = this.convertCoordinates(value[0])
    }
  }

  /**
   * Comment parser function
   */
  parseComment(jgf, node, key, value) {

    //Get key alias
    if (typeof propertyMap[key] !== 'undefined') {
      key = propertyMap[key]
    }

    //Set value
    node[key] = value
  }

  /**
   * Node name parser function
   */
  parseNodeName(jgf, node, key, value) {

    //Get key alias
    if (typeof propertyMap[key] !== 'undefined') {
      key = propertyMap[key]
    }

    //Set value
    node[key] = value[0]
  }

  /**
   * Board setup parser function
   */
  parseSetup(jgf, node, key, value) {

    //Initialize setup container on node
    if (typeof node.setup === 'undefined') {
      node.setup = {}
    }

    //Remove "A" from setup key
    key = key.charAt(1)

    //Initialize setup container of this type
    if (typeof node.setup[key] === 'undefined') {
      node.setup[key] = []
    }

    //Add values
    for (const entry of value) {
      node.setup[key].push(this.convertCoordinates(entry))
    }
  }

  /**
   * Scoring parser function
   */
  parseScore(jgf, node, key, value) {

    //Initialize score container on node
    if (typeof node.score === 'undefined') {
      node.score = {
        [stoneColors.BLACK]: [],
        [stoneColors.WHITE]: [],
      }
    }

    //Remove "T" from setup key
    key = key.charAt(1)

    //Add values
    for (const entry of value) {
      node.score[key].push(this.convertCoordinates(entry))
    }
  }

  /**
   * Turn parser function
   */
  parseTurn(jgf, node, key, value) {
    node.turn = value[0]
  }

  /**
   * Label parser function
   */
  parseLabel(jgf, node, key, value) {

    //Get key alias
    if (typeof propertyMap[key] !== 'undefined') {
      key = propertyMap[key]
    }

    //Initialize markup container on node
    if (typeof node.markup === 'undefined') {
      node.markup = {}
    }

    //Initialize markup container of this type
    if (typeof node.markup[key] === 'undefined') {
      node.markup[key] = []
    }

    //Add values
    for (const entry of value) {

      //Split off coordinates and add label contents
      let coords = this.convertCoordinates(entry.substr(0, 2))
      coords.push(entry.substr(3))

      //Add to node
      node.markup[key].push(coords)
    }
  }

  /**
   * Markup parser function
   */
  parseMarkup(jgf, node, key, value) {

    //Get key alias
    if (typeof propertyMap[key] !== 'undefined') {
      key = propertyMap[key]
    }

    //Initialize markup container on node
    if (typeof node.markup === 'undefined') {
      node.markup = {}
    }

    //Initialize markup container of this type
    if (typeof node.markup[key] === 'undefined') {
      node.markup[key] = []
    }

    //Add values
    for (const entry of value) {
      node.markup[key].push(this.convertCoordinates(entry))
    }
  }

  /**
   * Size parser function
   */
  parseSize(jgf, node, key, value) {

    //Initialize board container
    if (typeof jgf.board === 'undefined') {
      jgf.board = {}
    }

    //Add size property (can be width:height or just a single size)
    let size = value[0].split(':')
    if (size.length > 1) {
      jgf.board.width = parseInt(size[0])
      jgf.board.height = parseInt(size[1])
    }
    else {
      jgf.board.width = jgf.board.height = parseInt(size[0])
    }
  }

  /**
   * Date parser function
   */
  parseDate(jgf, node, key, value) {

    //Initialize dates container
    if (typeof jgf.game.dates === 'undefined') {
      jgf.game.dates = []
    }

    //Explode dates
    const dates = value[0].split(',')
    for (const date of dates) {
      jgf.game.dates.push(date)
    }
  }

  /**
   * Komi parser function
   */
  parseKomi(jgf, node, key, value) {
    jgf.game.komi = parseFloat(value[0])
  }

  /**
   * Variations handling parser function
   */
  parseVariations(jgf, node, key, value) {

    //Initialize display property
    if (typeof jgf.player === 'undefined') {
      jgf.player = {}
    }

    //Initialize variation display settings
    jgf.player.variationMarkup = false
    jgf.player.variationChildren = false
    jgf.player.variationSiblings = false

    //Parse as integer
    const st = parseInt(value[0])

    //Determine what we want (see SGF specs for details)
    switch (st) {
      case 0:
        jgf.player.variationMarkup = true
        jgf.player.variationChildren = true
        break
      case 1:
        jgf.player.variationMarkup = true
        jgf.player.variationSiblings = true
        break
      case 2:
        jgf.player.variationChildren = true
        break
      case 3:
        jgf.player.variationSiblings = true
        break
    }
  }

  /**
   * Player info parser function
   */
  parsePlayer(jgf, node, key, value) {

    //Initialize players container
    if (typeof jgf.game.players === 'undefined') {
      jgf.game.players = []
    }

    //Determine player color
    const color = blackPlayerFields.includes(key) ?
      stoneColors.BLACK :
      stoneColors.WHITE

    //Get key alias
    if (typeof propertyMap[key] !== 'undefined') {
      key = propertyMap[key]
    }

    //Check if player of this color already exists
    for (const player of jgf.game.players) {
      if (player.color === color) {
        player[key] = value[0]
        return
      }
    }

    //Player of this color not found, initialize
    const player = {color}
    player[key] = value[0]
    jgf.game.players.push(player)
  }

  /*****************************************************************************
   * Parser helpers
   ***/

  /**
   * Helper to convert SGF coordinates
   */
  convertCoordinates(coords) {
    return [
      coords.charCodeAt(0) - aChar,
      coords.charCodeAt(1) - aChar,
    ]
  }

  /**
   * Convert SGF game type
   */
  convertGameType(type) {
    switch (type) {
      case 1:
        return gameTypes.GO
      case 2:
        return gameTypes.OTHELLO
      case 3:
        return gameTypes.CHESS
      case 4:
        return gameTypes.RENJU
      case 6:
        return gameTypes.BACKGAMMON
      case 7:
        return gameTypes.CHINESE_CHESS
      case 8:
        return gameTypes.SHOGI
      default:
        return gameTypes.UNKNOWN
    }
  }

  /**
   * Set info in the JGF tree at a certain position
   */
  setInfo(jgf, position, value) {

    //Position given must be an array
    if (typeof position !== 'object') {
      return
    }

    //Initialize node to attach value to
    let node = jgf
    let key

    //Loop the position
    for (let p = 0; p < position.length; p++) {

      //Get key
      key = position[p]

      //Last key reached? Done
      if ((p + 1) === position.length) {
        break
      }

      //Create container if not set
      if (typeof node[key] !== 'object') {
        node[key] = {}
      }

      //Move up in tree
      node = node[key]
    }

    //Set value
    node[key] = value
  }
}
