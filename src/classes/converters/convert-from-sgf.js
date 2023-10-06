import Convert from '../convert.js'
import Game from '../game.js'
import GameNode from '../game-node.js'
import {gameTypes} from '../../constants/game.js'
import {stoneColors} from '../../constants/stone.js'
import {markupTypes} from '../../constants/markup.js'
import {setupTypes} from '../../constants/setup.js'
import {
  charCodeA,
  sgfStoneColors,
  sgfGameInfoMap,
  sgfPlayerInfoMap,
  sgfGameTypes,
  sgfMarkupTypes,
} from '../../constants/sgf.js'

//Regexes
const regexSequence = /\(|\)|(;(\s*[A-Z]+\s*((\[\])|(\[(.|\s)*?([^\\]\])))+)*)/g
const regexNode = /[A-Z]+\s*((\[\])|(\[(.|\s)*?([^\\]\])))+/g
const regexProperty = /[A-Z]+/
const regexValues = /(\[\])|(\[(.|\s)*?([^\\]\]))/g
const regexMove = /^;B|W\[/i
const regexBlackPlayer = /PB|BT|BR/i
const regexWhitePlayer = /PW|WT|WR/i

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
  LB: 'parseMarkup',
}

/**
 * Convert SGF file data into a seki game object
 */
export default class ConvertFromSgf extends Convert {

  /**
   * Convert SGF string into a seki game object
   */
  convert(sgf) {

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

    //Loop sequence
    for (const str of sequence) {

      //New variation
      if (str === '(') {
        stack.push(parentNode)
        continue
      }

      //End of variation
      else if (str === ')') {
        if (stack.length > 0) {
          parentNode = stack.pop()
        }
        continue
      }

      //Is this a move? Create new node
      if (str.match(regexMove)) {
        const node = new GameNode()
        parentNode.appendChild(node)
        parentNode = node
      }

      //Get node properties and parse them
      const properties = str.match(regexNode)
      if (properties) {
        this.parseProperties(properties, parentNode, game)
      }
    }
  }

  /**
   * Parse node propties
   */
  parseProperties(properties, node, game) {

    //Make array of properties within this sequence
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
        this[parsingMap[key]](game, node, key, values)
        continue
      }

      //Plain info value?
      else if (sgfGameInfoMap[key]) {
        const value = this.getSimpleValue(values)
        game.setInfo(sgfGameInfoMap[key], value)
        continue
      }

      //Unknown property
      console.warn(`Unknown property encountered while parsing SGF: ${key} =>`, values)
    }
  }

  /*****************************************************************************
   * Parsers
   ***/

  /**
   * Generator parser
   */
  parseGenerator(game, node, key, values) {
    const [name, version] = values[0].split(':')
    game.setInfo('record.generator', `${name}${version ? ` v${version}` : ''}`)
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
    const type = this.getMappedValue(values[0], sgfGameTypes, true)
    game.setInfo('game.type', type || gameTypes.GO)
  }

  /**
   * Move parser function
   */
  parseMove(game, node, key, values) {

    //Instantiate move
    const move = {}
    const size = game.getInfo('board.size')
    const isNormalSize = (size && size <= 19)

    //Set color
    move.color = this.convertColor(key)

    //Pass
    if (values[0] === '' || (values[0] === 'tt' && isNormalSize)) {
      move.pass = true
    }

    //Regular move
    else {
      Object.assign(move, this.createCoordinate(values[0]))
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
   * Markup parser function
   */
  parseMarkup(game, node, key, values) {

    //Initialize markup container
    const markup = node.markup || []
    const type = this.getMappedValue(key, sgfMarkupTypes, true)

    //Create markup entry for this type
    const coords = []
    const entry = {type, coords}
    markup.push(entry)

    //Add values
    for (const value of values) {
      const coord = this.createCoordinate(value.substr(0, 2))
      if (type === markupTypes.LABEL) {
        coord.text = value.substr(3)
      }
      coords.push(coord)
    }

    //Append to node
    node.markup = markup
  }

  /**
   * Board setup parser function
   */
  parseSetup(game, node, key, values) {

    //Initialize setup container and get color
    const setup = node.setup || []
    const color = this.convertColor(key.charAt(1))
    const type = color || setupTypes.EMPTY

    //Create setup entry for this type
    const coords = []
    const entry = {type, coords}
    setup.push(entry)

    //Add values
    for (const value of values) {
      const coord = this.createCoordinate(value, {})
      coords.push(coord)
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
    const coords = []
    const entry = {color, coords}
    score.push(entry)

    //Add values
    for (const value of values) {
      const coord = this.createCoordinate(value, {})
      coords.push(coord)
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
   * Size parser function
   */
  parseSize(game, node, key, values) {

    //Add size property (can be width:height or just a single size)
    const [width, height] = values[0].split(':')
    if (width && height && width !== height) {
      game.setInfo('board.width', parseInt(width))
      game.setInfo('board.height', parseInt(height))
    }
    else {
      game.setInfo('board.size', parseInt(width))
    }
  }

  /**
   * Dates parser function
   */
  parseDates(game, node, key, values) {
    const dates = values[0].split(',')
    game.setInfo('game.dates', dates)
  }

  /**
   * Komi parser function
   */
  parseKomi(game, node, key, values) {
    const komi = values[0]
    game.setInfo('rules.komi', komi)
  }

  /**
   * Handicap parser function
   */
  parseHandicap(game, node, key, values) {
    const handicap = values[0]
    game.setInfo('rules.handicap', handicap)
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
    game.setInfo('settings', settings)
  }

  /**
   * Player info parser function
   */
  parsePlayer(game, node, key, values) {

    //Initialize players container
    const players = game.getInfo('players', [])

    //Determine player color
    const color = this.convertPlayerColor(key)
    const infoKey = sgfPlayerInfoMap[key]

    //Check if player of this color already exists
    const existing = players.find(player => player.color === color)

    //Exists
    if (existing) {
      existing[infoKey] = values[0]
    }
    else {
      players.push({
        color,
        [infoKey]: values[0],
      })
    }

    //Set on game
    game.setInfo('players', players)
  }

  /*****************************************************************************
   * Parsing helpers
   ***/

  /**
   * Helper to create a coordinate
   */
  createCoordinate(str) {
    return {
      x: str.charCodeAt(0) - charCodeA,
      y: str.charCodeAt(1) - charCodeA,
    }
  }

  /**
   * Convert player color from key
   */
  convertPlayerColor(key) {
    if (key.match(regexBlackPlayer)) {
      return stoneColors.BLACK
    }
    else if (key.match(regexWhitePlayer)) {
      return stoneColors.WHITE
    }
  }

  /**
   * Convert a string color value to a numeric color value
   */
  convertColor(color) {
    return this.getMappedValue(color, sgfStoneColors, true)
  }

  /**
   * Get simple value if array of values given with one entry
   */
  getSimpleValue(values) {
    if (Array.isArray(values) && values.length === 1) {
      return values[0]
    }
    return values
  }
}
