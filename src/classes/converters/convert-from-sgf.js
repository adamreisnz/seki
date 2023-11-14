import Converter from './converter.js'
import Game from '../game.js'
import GameNode from '../game-node.js'
import {set, get} from '../../helpers/object.js'
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
const regexMove = /^;[B|W]\[/i
const regexBlackPlayer = /PB|BT|BR|BL|OB/i
const regexWhitePlayer = /PW|WT|WR|WL|OW/i

//Property to parser map
const parsingMap = {

  //Record properties
  AP: 'parseGenerator',

  //Game information
  GM: 'parseGameType',
  RE: 'parseResult',
  DT: 'parseDates',
  KM: 'parseKomi',

  //Board information
  SZ: 'parseSize',
  XL: 'parseCutOff',
  XR: 'parseCutOff',
  XT: 'parseCutOff',
  XB: 'parseCutOff',

  //Settings
  ST: 'parseVariationSettings',

  //Player info handling
  PB: 'parsePlayer',
  PW: 'parsePlayer',
  BT: 'parsePlayer',
  WT: 'parsePlayer',
  BR: 'parsePlayerRank',
  WR: 'parsePlayerRank',

  //Moves
  B: 'parseMove',
  W: 'parseMove',

  //Node annotation
  C: 'parseComment',
  N: 'parseNodeName',

  //Time and periods left
  BL: 'parseTimeLeft',
  WL: 'parseTimeLeft',
  OB: 'parsePeriodsLeft',
  OW: 'parsePeriodsLeft',

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
export default class ConvertFromSgf extends Converter {

  /**
   * Convert SGF string into a seki game object
   */
  convert(sgf) {

    //Initialize
    const game = new Game()
    const info = {}
    const root = this.parseSgf(sgf, info)

    //Set game info and root node
    game.setInfo(info)
    game.setRootNode(root)

    //Return game
    return game
  }

  /**
   * Parse SGF
   */
  parseSgf(sgf, info, parentNode = null) {

    //Get sequence and initialise stack for parent nodes
    const sequence = sgf.match(regexSequence)
    const stack = []
    const root = new GameNode()

    //No parent node? Use root node
    if (!parentNode) {
      parentNode = root
    }

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

      //Is this a move?
      if (str.match(regexMove)) {
        const node = new GameNode()
        parentNode.appendChild(node)
        parentNode = node
      }

      //Get node properties and parse them
      const properties = str.match(regexNode)
      if (properties) {
        this.parseProperties(properties, parentNode, info)
      }
    }

    //Return the root node
    return root
  }

  /**
   * Parse node propties
   */
  parseProperties(properties, node, info) {

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
        this[parsingMap[key]](info, node, key, values)
        continue
      }

      //Plain info value?
      else if (sgfGameInfoMap[key]) {
        const value = this.getSimpleValue(values)
        set(info, sgfGameInfoMap[key], value)
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
   * Move parser function
   */
  parseMove(info, node, key, values) {

    //Instantiate move
    const move = {}

    //Set color
    move.color = this.convertColor(key)

    //Pass
    if (values[0] === '' || (values[0] === 'tt' && this.isNormalSize(info))) {
      move.pass = true
    }

    //Regular move
    else {
      const coord = this.createCoordinate(values[0])
      if (!coord) {
        console.warn(`Invalid coordinate encountered while parsing SGF: ${key} =>`, values[0])
        return
      }
      Object.assign(move, coord)
    }

    //Append to node
    node.move = move
  }

  /**
   * Time left
   */
  parseTimeLeft(info, node, key, values) {

    //Get color
    const color = key.match(regexBlackPlayer) ?
      stoneColors.BLACK :
      stoneColors.WHITE

    //Must already have a move node of matching color
    if (!node.move || node.move.color !== color) {
      return
    }

    //Set on node
    node.move.timeLeft = parseFloat(values[0])
  }

  /**
   * Periods left
   */
  parsePeriodsLeft(info, node, key, values) {

    //Get color
    const color = key.match(regexBlackPlayer) ?
      stoneColors.BLACK :
      stoneColors.WHITE

    //Must already have a move node of matching color
    if (!node.move || node.move.color !== color) {
      return
    }

    //Set on node
    node.move.periodsLeft = parseInt(values[0])
  }

  /**
   * Comment parser function
   */
  parseComment(info, node, key, values) {
    node.comments = values
  }

  /**
   * Node name parser function
   */
  parseNodeName(info, node, key, values) {
    node.name = values[0]
  }

  /**
   * Markup parser function
   */
  parseMarkup(info, node, key, values) {

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
      if (!coord) {
        console.warn(`Invalid coordinate encountered while parsing SGF: ${key} =>`, value)
        continue
      }
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
  parseSetup(info, node, key, values) {

    //Initialize setup container and get color
    const setup = node.setup || []
    const color = this.convertColor(key.charAt(1))
    const type = color || setupTypes.CLEAR

    //Create setup entry for this type
    const coords = []
    const entry = {type, coords}
    setup.push(entry)

    //Add values
    for (const value of values) {
      const coord = this.createCoordinate(value, {})
      if (!coord) {
        console.warn(`Invalid coordinate encountered while parsing SGF: ${key} =>`, value)
        continue
      }
      coords.push(coord)
    }

    //Append to node
    node.setup = setup
  }

  /**
   * Scoring parser function
   */
  parseScore(info, node, key, values) {

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
      if (!coord) {
        console.warn(`Invalid coordinate encountered while parsing SGF: ${key} =>`, value)
        continue
      }
      coords.push(coord)
    }

    //Append to node
    node.score = score
  }

  /**
   * Turn parser function
   */
  parseTurn(info, node, key, values) {
    node.turn = this.convertColor(values[0])
  }

  /**
   * Generator parser
   */
  parseGenerator(info, node, key, values) {
    const [name, version] = values[0].split(':')
    set(info, 'record.generator', `${name}${version ? ` v${version}` : ''}`)
  }

  /**
   * Game type parser
   */
  parseGameType(info, node, key, values) {
    const type = this.getMappedValue(values[0], sgfGameTypes, true)
    set(info, 'game.type', type || gameTypes.GO)
  }

  /**
   * Game result parser
   */
  parseResult(info, node, key, values) {
    const result = values[0]
      .replace(/0\.03'/, 'F') //Fox use 0.03 result for a Forfeit
      .replace(/0\.02'/, 'T') //Fox use 0.02 result for a Timeout
      .replace('¼', '.25')
      .replace('½', '.5')
      .replace('¾', '.75')
    set(info, 'game.result', result)
  }

  /**
   * Komi parser
   */
  parseKomi(info, node, key, values) {
    const komi = values[0]
      .replace(/375/, '7.5') //Fox use chinese half-area counting
      .replace('¼', '.25')
      .replace('½', '.5')
      .replace('¾', '.75')
    set(info, 'rules.komi', komi)
  }

  /**
   * Size parser
   */
  parseSize(info, node, key, values) {
    const [width, height] = values[0].split(':')
    if (width && height && width !== height) {
      set(info, 'board.width', width)
      set(info, 'board.height', height)
    }
    else if (width) {
      set(info, 'board.size', width)
    }
  }

  /**
   * Cut off parser
   */
  parseCutOff(info, node, key, values) {
    const side = key.charAt(1)
    const cutOff = values[0]
    switch (side) {
      case 'L':
        set(info, 'board.cutOffLeft', cutOff)
        break
      case 'R':
        set(info, 'board.cutOffRight', cutOff)
        break
      case 'T':
        set(info, 'board.cutOffTop', cutOff)
        break
      case 'B':
        set(info, 'board.cutOffBottom', cutOff)
        break
    }
  }

  /**
   * Dates parser
   */
  parseDates(info, node, key, values) {
    set(info, 'game.dates', values[0].split(','))
  }

  /**
   * Variation settings parser
   */
  parseVariationSettings(info, node, key, values) {

    //Initialize variation display settings
    const settings = {
      showVariations: false,
      showSiblingVariations: false,
    }

    //Parse as integer
    const value = parseInt(values[0])

    //Determine what we want (see SGF specs for details)
    switch (value) {
      case 0:
        settings.showVariations = true
        settings.showSiblingVariations = false
        break
      case 1:
        settings.showVariations = true
        settings.showSiblingVariations = true
        break
      case 2:
        settings.showVariations = false
        settings.showSiblingVariations = false
        break
      case 3:
        settings.showVariations = false
        settings.showSiblingVariations = true
        break
    }

    //Set in game info
    set(info, 'settings', settings)
  }

  /**
   * Player info parser
   */
  parsePlayer(info, node, key, values) {

    //Determine player color
    const color = this.convertPlayerColor(key)
    const infoKey = sgfPlayerInfoMap[key]

    //Set on info
    set(info, `players.${color}.${infoKey}`, values[0])
  }

  /**
   * Player rank parser
   */
  parsePlayerRank(info, node, key, values) {

    //Determine player color and normalise rank
    const color = this.convertPlayerColor(key)
    const rank = values[0]
      .replace('段', 'd')
      .replace('級', 'k')
      .replace('级', 'k')
      .replace('一', '1')
      .replace('二', '2')
      .replace('三', '3')
      .replace('四', '4')
      .replace('五', '5')
      .replace('六', '6')
      .replace('七', '7')
      .replace('八', '8')
      .replace('九', '9')
      .replace('十', '10')
      .toLowerCase()

    //Set on info
    set(info, `players.${color}.rank`, rank)
  }

  /*****************************************************************************
   * Parsing helpers
   ***/

  /**
   * Helper to create a coordinate
   */
  createCoordinate(str) {
    const x = str.charCodeAt(0) - charCodeA
    const y = str.charCodeAt(1) - charCodeA
    if (x < 0 || y < 0) {
      return null
    }
    return {x, y}
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

  /**
   * Check if board is normal size
   */
  isNormalSize(info) {
    const size = get(info, 'board.size')
    const width = get(info, 'board.width')
    const height = get(info, 'board.height')
    return (
      (size && size <= 19) ||
      (width && height && width <= 19 && height <= 19)
    )
  }
}
