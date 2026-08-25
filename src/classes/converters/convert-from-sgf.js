import Converter from './converter.js'
import Game from '../game.js'
import GameNode from '../game-node.js'
import {set, get} from '../../helpers/object.js'
import {decodeData} from '../../helpers/encoding.js'
import {gameTypes} from '../../constants/game.js'
import {stoneColors} from '../../constants/stone.js'
import {markupTypes} from '../../constants/markup.js'
import {setupTypes} from '../../constants/setup.js'
import {
  charCodeA,
  charCodeAUpper,
  sgfStoneColors,
  sgfGameInfoMap,
  sgfPlayerInfoMap,
  sgfGameTypes,
  sgfMarkupTypes
} from '../../constants/sgf.js'

//A single property value, being everything between [ and ], where a
//backslash escapes whatever follows it. This is shared by the three regexes
//below so that they can't drift apart in how they recognise a value.
//
//NOTE: the previous pattern instead looked for a ] not directly preceded by
//a backslash, which cannot tell an escaped bracket (\]) apart from an
//escaped backslash at the end of a value (\\]). The latter made the value,
//and with it the whole property, fail to match and be dropped silently.
const valuePattern = String.raw`\[(?:\\[\s\S]|[^\\\]])*\]`

//Property identifiers are uppercase letters, but FF[3] allowed lowercase ones
//to be mixed in for compatibility with older applications, to be ignored when
//reading. They have to be matched all the same, or a property like the
//CoPyright IGS writes ends the node early and silently drops everything after
//it, so this is deliberately wider than the identifiers we act on.
const identifierPattern = String.raw`[A-Za-z]+`

//The SGF spec allows whitespace between the values of a property, and writers
//use it to wrap a long list over several lines. Without the \s* in front of
//each value, the list would end at the line break and every later property of
//that node would be dropped along with it.
const valueListPattern = String.raw`(?:\s*${valuePattern})+`

//Regexes
const regexSequence = new RegExp(
  String.raw`\(|\)|(;(\s*${identifierPattern}${valueListPattern})*)`, 'g'
)
const regexNode = new RegExp(
  String.raw`${identifierPattern}${valueListPattern}`, 'g'
)
const regexValues = new RegExp(valuePattern, 'g')
const regexProperty = new RegExp(identifierPattern)
const regexLowerCase = /[a-z]/g
const regexMove = /(;|\])[B|W]\[/i
const regexCutOff = /^\d+$/
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
  MH: 'parseMarkup',
  MS: 'parseMarkup',
}

/**
 * Convert SGF file data into a seki game object
 */
export default class ConvertFromSgf extends Converter {

  /**
   * Convert SGF string into a seki game object
   *
   * An SGF file can hold a collection of game trees. This only reads the
   * first one, for backwards compatibility with what a caller expecting a
   * single game does with the result. Use convertAll() to read them all.
   */
  convert(sgf, verbose = false) {

    //Convert all games in the collection
    const games = this.convertAll(sgf, verbose)

    //Warn about the games being dropped. NOTE: this is not gated on the
    //verbose flag, as losing entire games without a word is exactly what
    //this used to do, silently merging them into one another
    if (games.length > 1) {
      console.warn(
        `SGF contains ${games.length} games, only the first one was read. ` +
        `Use convertAll() to read the entire collection`
      )
    }

    //Return the first game
    return games[0]
  }

  /**
   * Convert SGF string into an array of seki game objects, one for each game
   * tree in the collection
   */
  convertAll(sgf, verbose = false) {

    //Decode binary data, detecting the encoding from the bytes themselves.
    //A string is handed straight back, so a caller that has already decoded
    //is unaffected.
    sgf = decodeData(sgf)

    //No data
    if (!sgf) {
      throw new Error(`No SGF data supplied`)
    }

    //Set verbose flag
    this.verbose = verbose

    //Parse the collection into a root node and game info per game tree
    const trees = this.parseSgf(sgf)

    //Create a game for each of them
    return trees.map(({root, info}) => {

      //Set game info and root node, in that order
      const game = new Game()
      game.setInfo(info)
      game.setRootNode(root)

      //Return game
      return game
    })
  }

  /**
   * Parse SGF
   *
   * Returns an array of {root, info} pairs, one for each game tree in the
   * collection. NOTE: these have to stay separate, as a shared root node
   * makes the second game a variation of the first, and shared game info
   * lets the last game in the file overwrite the players, result and board
   * size of every game before it.
   */
  parseSgf(sgf) {

    //Get sequence. Anything that isn't recognisable as an SGF game tree
    //produces no match at all, which has to be reported as a parsing failure
    //rather than being allowed to blow up on a null further down.
    const sequence = sgf.match(regexSequence)
    if (!sequence) {
      throw new Error(`Unable to parse SGF data: no game tree found`)
    }

    //Initialise stack and collection of game trees
    const stack = []
    const trees = []

    //No game tree open yet
    let root = null
    let info = null
    let parentNode = null

    //Helper to start a new game tree in the collection
    const startTree = () => {
      root = new GameNode()
      info = {}
      parentNode = root
      trees.push({root, info})
    }

    //Loop sequence
    for (const str of sequence) {

      //New variation, or the start of a game tree if none is open
      if (str === '(') {
        if (root === null) {
          startTree()
        }
        stack.push(parentNode)
        continue
      }

      //End of variation
      else if (str === ')') {
        if (stack.length > 0) {
          parentNode = stack.pop()

          //Back at the top level, so this game tree is complete and the next
          //( in the file opens a new game rather than a variation of this one
          if (stack.length === 0) {
            root = null
            info = null
            parentNode = null
          }
        }
        continue
      }

      //Properties before the first ( of the file. Not valid SGF, but it used
      //to be read onto the root node all the same, so give it one to land on
      if (root === null) {
        startTree()
      }

      //Create a new node if the parent node already has instructions, or if
      //the string contains a move node. Otherwise, the instructions are set
      //on the parent node. This allows for setup instructions to be set on
      //the root node without creating a new node.
      if (parentNode.hasInstructions() || str.match(regexMove)) {
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

    //Nothing but stray closing brackets, so there was no game tree in there
    //after all. NOTE: this used to hand back an empty game instead, leaving
    //the caller to work out that nothing had been read
    if (trees.length === 0) {
      throw new Error(`Unable to parse SGF data: no game tree found`)
    }

    //Return the game trees
    return trees
  }

  /**
   * Parse node propties
   */
  parseProperties(properties, node, info) {

    //Make array of properties within this sequence
    for (const prop of properties) {

      //Get key, dropping the lowercase letters FF[3] allowed to be mixed in,
      //so that a property written as CoPyright is read as CP
      const key = regexProperty.exec(prop)[0].replace(regexLowerCase, '')

      //Nothing but lowercase letters, so there is no identifier to act on
      if (key === '') {
        if (this.verbose) {
          console.warn(`Property without identifier encountered while parsing SGF:`, prop)
        }
        continue
      }

      //Get values, stripping the enclosing brackets and unescaping
      const matches = prop.match(regexValues)
      if (!matches) {
        continue
      }
      const values = matches
        .map(value => this.unescapeValue(
          value.substring(1, value.length - 1)
        ))

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
      if (this.verbose) {
        console.warn(`Unknown property encountered while parsing SGF: ${key} =>`, values)
      }
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

    //Get type and collect coordinates
    const type = this.getMappedValue(key, sgfMarkupTypes, true)
    const coords = []

    //Add values
    for (const value of values) {

      //Labels are written as point:text, so the colon separates a label from
      //its point rather than marking out a rectangle, and the value has to be
      //read as a single point however it is punctuated
      if (type === markupTypes.LABEL) {
        const coord = this.createCoordinate(value.substring(0, 2))
        if (!coord) {
          console.warn(`Invalid coordinate encountered while parsing SGF: ${key} =>`, value)
          continue
        }
        coord.text = value.substring(3)
        coords.push(coord)
        continue
      }

      //Every other markup property takes a point list, so a value may cover a
      //whole rectangle of points
      const points = this.createCoordinates(value)
      if (points.length === 0) {
        console.warn(`Invalid coordinate encountered while parsing SGF: ${key} =>`, value)
        continue
      }
      coords.push(...points)
    }

    //Nothing usable, don't leave an empty entry behind
    if (coords.length === 0) {
      return
    }

    //Append to node
    const markup = node.markup || []
    markup.push({type, coords})
    node.markup = markup
  }

  /**
   * Board setup parser function
   */
  parseSetup(info, node, key, values) {

    //Get type and collect coordinates
    const color = this.convertColor(key.charAt(1))
    const type = color || setupTypes.CLEAR
    const coords = []

    //Add values, which may each cover a whole rectangle of points
    for (const value of values) {
      const points = this.createCoordinates(value)
      if (points.length === 0) {
        console.warn(`Invalid coordinate encountered while parsing SGF: ${key} =>`, value)
        continue
      }
      coords.push(...points)
    }

    //Nothing usable, don't leave an empty entry behind
    if (coords.length === 0) {
      return
    }

    //Append to node
    const setup = node.setup || []
    setup.push({type, coords})
    node.setup = setup
  }

  /**
   * Scoring parser function
   */
  parseScore(info, node, key, values) {

    //Get color and collect coordinates
    const color = this.convertColor(key.charAt(1))
    const coords = []

    //Add values, which may each cover a whole rectangle of points
    for (const value of values) {
      const points = this.createCoordinates(value)
      if (points.length === 0) {
        console.warn(`Invalid coordinate encountered while parsing SGF: ${key} =>`, value)
        continue
      }
      coords.push(...points)
    }

    //Nothing usable, don't leave an empty entry behind
    if (coords.length === 0) {
      return
    }

    //Append to node
    const score = node.score || []
    score.push({color, coords})
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
    set(info, 'game.result', values[0])
  }

  /**
   * Komi parser
   */
  parseKomi(info, node, key, values) {
    set(info, 'rules.komi', values[0])
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
   *
   * NOTE: XL/XR/XT/XB are private properties, so the same keys are in use by
   * other applications for entirely unrelated data. BadukPop writes its
   * territory estimate to XT as a long list of signed decimals, which parsed
   * leniently gave a cut off of -1, growing the board by a row and shifting
   * every coordinate with it. Only a plain non negative whole number of lines
   * is a cut off; anything else belongs to whoever else claimed the key.
   */
  parseCutOff(info, node, key, values) {

    //Not a cut off value, leave it alone
    const side = key.charAt(1)
    const cutOff = values[0].trim()
    if (!regexCutOff.test(cutOff)) {
      if (this.verbose) {
        console.warn(`Ignoring ${key} property, which is not a cut off value:`, values[0])
      }
      return
    }

    //Store against the relevant side
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

    //Determine player color and rank
    const color = this.convertPlayerColor(key)
    const rank = values[0]

    //Set on info
    set(info, `players.${color}.rank`, rank)
  }

  /*****************************************************************************
   * Parsing helpers
   ***/

  /**
   * Helper to create the list of coordinates a point list value covers
   *
   * A value of the point list type may be written in compressed form as
   * `corner1:corner2`, which stands for every point in the rectangle between
   * the two corners, given in either orientation. Anything else is a single
   * point. Returns an empty array for a value that isn't usable, so that
   * callers can report it the same way they report a bad single coordinate.
   */
  createCoordinates(str) {

    //Not a compressed point list, so a single point at most
    if (typeof str !== 'string' || !str.includes(':')) {
      const coord = this.createCoordinate(str)
      return coord ? [coord] : []
    }

    //Decode both corners of the rectangle
    const [first, second] = str.split(':')
    const from = this.createCoordinate(first)
    const to = this.createCoordinate(second)
    if (!from || !to) {
      return []
    }

    //Expand it, taking the corners in whichever order they were given
    const coords = []
    const [xLow, xHigh] = (from.x <= to.x) ? [from.x, to.x] : [to.x, from.x]
    const [yLow, yHigh] = (from.y <= to.y) ? [from.y, to.y] : [to.y, from.y]
    for (let x = xLow; x <= xHigh; x++) {
      for (let y = yLow; y <= yHigh; y++) {
        coords.push({x, y})
      }
    }

    //Return coordinates
    return coords
  }

  /**
   * Helper to create a coordinate
   *
   * Returns null for anything that isn't a valid pair of SGF coordinate
   * characters, so that callers can skip it. NOTE: this has to reject rather
   * than pass through NaN, which is what an empty or truncated value used to
   * produce, since a NaN coordinate ends up on the game position unnoticed.
   */
  createCoordinate(str) {

    //Needs at least two characters to be a coordinate
    if (typeof str !== 'string' || str.length < 2) {
      return null
    }

    //Decode both characters
    const x = this.decodeCoordinate(str.charAt(0))
    const y = this.decodeCoordinate(str.charAt(1))

    //Either one out of range
    if (x === null || y === null) {
      return null
    }

    //Return coordinate
    return {x, y}
  }

  /**
   * Decode a single SGF coordinate character
   */
  decodeCoordinate(char) {

    //Get character code
    const code = char.charCodeAt(0)

    //Lowercase a-z covers 0-25
    if (code >= charCodeA && code <= charCodeA + 25) {
      return code - charCodeA
    }

    //Uppercase A-Z covers 26-51, for boards larger than 26
    if (code >= charCodeAUpper && code <= charCodeAUpper + 25) {
      return code - charCodeAUpper + 26
    }

    //Not a coordinate character
    return null
  }

  /**
   * Unescape an SGF property value
   *
   * In SGF a backslash escapes the character that follows it, so that ] and
   * \ itself can appear in text. A backslash before a line break is a soft
   * line break and disappears entirely. This is done in a single pass, so
   * that a run of escaped backslashes is not re-processed and collapsed.
   */
  unescapeValue(value) {
    return value.replace(/\\([\s\S])/g, (match, char) => {
      return /[\n\r]/.test(char) ? '' : char
    })
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
    const size = parseInt(get(info, 'board.size'))
    const width = parseInt(get(info, 'board.width'))
    const height = parseInt(get(info, 'board.height'))
    return (
      (size > 0 && size <= 19) ||
      (width > 0 && height > 0 && width <= 19 && height <= 19)
    )
  }
}
