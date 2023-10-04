import Game from '../game.js'
import GameNode from '../game-node.js'
import {gameTypes} from '../../constants/game.js'
import {stoneColors} from '../../constants/stone.js'
import {markupTypes} from '../../constants/markup.js'
import {set, get} from '../../helpers/object.js'

//Regexes
const regexSequence = /\(|\)|(;(\s*[A-Z]+\s*((\[\])|(\[(.|\s)*?([^\\]\])))+)*)/g
const regexNode = /[A-Z]+\s*((\[\])|(\[(.|\s)*?([^\\]\])))+/g
const regexProperty = /[A-Z]+/
const regexValues = /(\[\])|(\[(.|\s)*?([^\\]\]))/g

//A char
const aChar = String('a').charCodeAt(0)

//These properties need a node object
// const needsNode = [
//   'B', 'W', 'C', 'N',
//   'AB', 'AW', 'AE', 'PL',
//   'LB', 'CR', 'SQ', 'TR',
//   'MA', 'SL', 'TW', 'TB',
// ]

//These properties represent the black player
const blackPlayerKeys = [
  'PB', 'BT', 'BR',
]

//Property to parser map
const parsingMap = {

  //Record properties
  AP: 'parseGenerator',
  FF: 'parseFormat',

  //Game information
  GM: 'parseGameType',
  DT: 'parseDates',

  //Board information
  SZ: 'parseSize',

  //Rules
  KM: 'parseKomi',
  HA: 'parseHandicap',

  //Settings
  ST: 'parseVariationSettings',

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
 * Game info map (these don't have a dedicated parser)
 */
export const infoMap = {

  //Record properties
  CA: 'record.charset',
  US: 'record.transcriber',

  //Source properties
  SO: 'source.name',
  CP: 'source.copyright',

  //Game information
  GN: 'game.name',
  RE: 'game.result',
  ON: 'game.opening',
  AN: 'game.annotator',
  GC: 'game.description',

  //Event information
  EV: 'event.name',
  PC: 'event.location',
  RO: 'event.round',

  //Rules
  RU: 'rules.ruleSet',
  TM: 'rules.mainTime',
  OT: 'rules.overTime',
}

//Player info map
const playerInfoMap = {
  PB: 'name',
  PW: 'name',
  BT: 'team',
  WT: 'team',
  BR: 'rank',
  WR: 'rank',
}

/**
 * Parser to convert SGF
 */
export default class ParseSgf {

  /**
   * Parse SGF string into a seki game object
   */
  parse(sgf) {

    //Initialize
    const game = new Game()

    //Create root node
    game.root = new GameNode()

    //Find sequence of elements
    const sequence = sgf.match(regexSequence)

    //Parse sequence
    this.parseSequence(sequence, game, game.root)

    //Return object
    return game
  }

  /**
   * Parse sequence
   */
  parseSequence(sequence, game, parentNode) {

    //Keep track of stack of nodes
    const stack = []

    //Loop sequence items
    for (let i = 0; i < sequence.length; i++) {

      //New variation found
      if (sequence[i] === '(') {

        //First encounter, this defines the main tree branch, so skip
        if (i === 0 || i === '0') {
          continue
        }

        //Push the current parent node to the stack
        stack.push(parentNode)

        //Create new node for variation and set as current parent node
        const variationNode = new GameNode()
        parentNode.appendChild(variationNode)
        parentNode = variationNode

        //Continue with next sequence item
        continue
      }

      //End of variations reached, grab last parent node from stack
      else if (sequence[i] === ')') {
        if (stack.length) {
          parentNode = stack.pop()
        }
        continue
      }

      //Make array of properties within this sequence
      const properties = sequence[i].match(regexNode) || []

      //Parse properties
      this.parseProperties(properties, game, parentNode)
    }
  }

  /**
   * Parse properties
   */
  parseProperties(properties, game, parentNode) {

    //Loop them
    for (const prop of properties) {

      //Get key
      const key = regexProperty.exec(prop)[0].toUpperCase()

      //Get values, removing any additional braces [ and ]
      const values = prop
        .match(regexValues)
        .map(value => value
          .substring(1, value.length - 1)
          .replace(/\\(?!\\)/g, ''),
        )

      //SGF parser present for this key?
      if (parsingMap[key]) {

        //For moves, always create a new node
        if (this.isMove(key)) {
          const node = new GameNode()

          //Append to parent node
          parentNode.appendChild(node)
          parentNode = node
        }

        //Apply parsing function on node
        this[parsingMap[key]](game, parentNode, key, values)
        continue
      }

      //Plain info element?
      else if (infoMap[key]) {
        this.setGameInfo(game, infoMap[key], values)
        continue
      }

      //Unknown property
      console.warn(`Unknown property encountered while parsing SGF: ${key} =>`, values)
    }
  }

  /**
   * Check if key is a move
   */
  isMove(key) {
    return (key === 'B' || key === 'W')
  }

  /*****************************************************************************
   * Parsers
   ***/

  /**
   * Generator parser
   */
  parseGenerator(game, node, key, values) {
    const [name, version] = values[0].split(':')
    game.record.generator = `${name}${version ? ` v${version}` : ''}`
  }

  /**
   * SGF format parser
   */
  parseFormat() {
    return
  }

  /**
   * Game type parser function
   */
  parseGameType(game, node, key, values) {
    const type = values[0]
    game.game.type = this.convertGameType(type)
  }

  /**
   * Move parser function
   */
  parseMove(game, node, key, values) {

    //Create move container
    const move = {}
    const isNormalSize = (
      game.info && game.info.board && game.info.board.size <= 19
    )

    //Set color
    move.color = this.convertColor(key)

    //Pass
    if (values[0] === '' || (values[0] === 'tt' && isNormalSize)) {
      move.pass = true
    }

    //Regular move
    else {
      this.appendCoordinates(values[0], move)
    }

    //Append to node
    node.move = move
  }

  /**
   * Comment parser function
   */
  parseComment(game, node, key, values) {
    node.comments = values
  }

  /**
   * Node name parser function
   */
  parseNodeName(game, node, key, values) {
    node.name = values[0]
  }

  /**
   * Board setup parser function
   */
  parseSetup(game, node, key, values) {

    //Initialize setup container and get color
    const setup = node.setup || []
    const color = this.convertColor(key.charAt(1))

    //Add values
    for (const value of values) {
      const obj = {color}
      this.appendCoordinates(value, obj)
      setup.push(obj)
    }

    //Append to node
    node.setup = setup
  }

  /**
   * Scoring parser function
   */
  parseScore(game, node, key, values) {

    //Initialize score container and get color
    const score = node.score || []
    const color = this.convertColor(key.charAt(1))

    //Create score entry for this color
    const coordinates = []
    const entry = {color, coordinates}
    score.push(entry)

    //Add values
    for (const value of values) {
      const coord = this.appendCoordinates(value, {})
      coordinates.push(coord)
    }

    //Append to node
    node.score = score
  }

  /**
   * Turn parser function
   */
  parseTurn(game, node, key, values) {
    node.turn = this.convertColor(values[0])
  }

  /**
   * Label parser function
   */
  parseLabel(game, node, key, values) {

    //Initialize markup container
    const markup = node.markup || []
    const type = markupTypes.LABEL

    //Add values
    for (const value of values) {

      //Get coordinates and label text
      const coord = value.substr(0, 2)
      const text = value.substr(3)

      //Create markup object
      const obj = {type, text}

      //Append coordinates and push to array
      this.appendCoordinates(coord, obj)
      markup.push(obj)
    }

    //Append to node
    node.markup = markup
  }

  /**
   * Markup parser function
   */
  parseMarkup(game, node, key, values) {

    //Initialize markup container
    const markup = node.markup || []
    const type = this.convertMarkupType(key)

    //Add values
    for (const value of values) {

      //Create markup object
      const obj = {type}

      //Append coordinates and push to array
      this.appendCoordinates(value, obj)
      markup.push(obj)
    }

    //Append to node
    node.markup = markup
  }

  /**
   * Size parser function
   */
  parseSize(game, node, key, values) {

    //Add size property (can be width:height or just a single size)
    const [width, height] = values[0].split(':')
    if (width && height && width !== height) {
      this.setGameInfo(game, 'board.width', parseInt(width))
      this.setGameInfo(game, 'board.height', parseInt(height))
    }
    else {
      this.setGameInfo(game, 'board.size', parseInt(width))
    }
  }

  /**
   * Dates parser function
   */
  parseDates(game, node, key, values) {

    //Get dates
    const dates = values[0].split(',')
    if (dates.length > 1) {
      this.setGameInfo(game, 'game.dates', dates)
    }
    else {
      this.setGameInfo(game, 'game.date', dates[0])
    }
  }

  /**
   * Komi parser function
   */
  parseKomi(game, node, key, values) {
    const komi = parseFloat(values[0])
    this.setGameInfo(game, 'rules.komi', komi)
  }

  /**
   * Handicap parser function
   */
  parseHandicap(game, node, key, values) {
    const handicap = parseInt(values[0])
    this.setGameInfo(game, 'rules.handicap', handicap)
  }

  /**
   * Variation settings parser function
   */
  parseVariationSettings(game, node, key, values) {

    //Initialize variation display settings
    const settings = {
      variationMarkup: false,
      variationChildren: false,
      variationSiblings: false,
    }

    //Parse as integer
    const value = parseInt(values[0])

    //Determine what we want (see SGF specs for details)
    switch (value) {
      case 0:
        settings.variationMarkup = true
        settings.variationChildren = true
        break
      case 1:
        settings.variationMarkup = true
        settings.variationSiblings = true
        break
      case 2:
        settings.variationChildren = true
        break
      case 3:
        settings.variationSiblings = true
        break
    }

    //Set in game info
    this.setGameInfo(game, 'settings', settings)
  }

  /**
   * Player info parser function
   */
  parsePlayer(game, node, key, values) {

    //Initialize players container
    const players = this.getGameInfo(game, 'players', [])

    //Determine player color
    const color = this.determinePlayerColor(key)
    const infoKey = playerInfoMap[key]

    //Check if player of this color already exists
    const existing = players.find(player => player.color === color)
    if (existing) {
      existing[infoKey] = values[0]
      return
    }

    //Player of this color not found, add to array
    players.push({
      color,
      [infoKey]: values[0],
    })

    //Set on game
    this.setGameInfo(game, 'players', players)
  }

  /*****************************************************************************
   * Parsing helpers
   ***/

  /**
   * Helper to convert SGF coordinates to x/y and append to an object
   */
  appendCoordinates(coords, obj = {}) {
    obj.x = coords.charCodeAt(0) - aChar
    obj.y = coords.charCodeAt(1) - aChar
    return obj
  }

  /**
   * Determine player color
   */
  determinePlayerColor(key) {
    return blackPlayerKeys.includes(key) ?
      stoneColors.BLACK :
      stoneColors.WHITE
  }

  /**
   * Convert a string color value to a numeric color value
   */
  convertColor(color) {
    if (color === 'B') {
      return stoneColors.BLACK
    }
    else if (color === 'W') {
      return stoneColors.WHITE
    }
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
   * Convert SGF markup type
   */
  convertMarkupType(type) {
    switch (type) {
      case 'CR':
        return markupTypes.CIRCLE
      case 'SQ':
        return markupTypes.SQUARE
      case 'TR':
        return markupTypes.TRIANGLE
      case 'SL':
        return markupTypes.SELECT
      case 'LB':
        return markupTypes.LABEL
      case 'MA':
      default:
        return markupTypes.MARK
    }
  }

  /**
   * Get game info
   */
  getGameInfo(game, path, defaultValue) {
    return get(game.info, path, defaultValue)
  }

  /**
   * Set info in the JGF tree at a certain position
   */
  setGameInfo(game, path, value) {

    //If there is only one value, simplify array
    if (Array.isArray(value) && value.length === 1) {
      value = value[0]
    }

    //Set value
    set(game.info, path, value)
  }
}
