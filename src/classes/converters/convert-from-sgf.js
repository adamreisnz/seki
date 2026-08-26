import Converter from './converter.js'
import Game from '../game.js'
import GameNode from '../game-node.js'
import {set, get} from '../../helpers/object.js'
import {decodeData} from '../../helpers/encoding.js'
import {parseDates as parseDateList} from '../../helpers/parsing.js'
import {tokenizeSgf} from '../../helpers/sgf-tokenizer.js'
import {defaultGameInfo} from '../../constants/defaults.js'
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
  sgfMarkupTypes,
  sgfTokenTypes,
  sgfDiagnosticCodes
} from '../../constants/sgf.js'

//The lowercase letters FF[3] allowed to be mixed into a property identifier
//for compatibility with older applications, to be ignored when reading, so
//that the CoPyright IGS writes is read as the CP property
const regexLowerCase = /[a-z]/g

//Regexes
const regexCutOff = /^\d+$/
const regexBlackPlayer = /PB|BT|BR|BL|OB/i
const regexWhitePlayer = /PW|WT|WR|WL|OW/i

//The properties that record a move. A node carrying one of them is a move
//node, and always becomes a node of its own rather than being folded into the
//node before it.
const moveKeys = ['B', 'W']

/**
 * Whether a property records a move
 */
function isMoveProperty({key}) {
  return moveKeys.includes(key)
}

//Property to parser map
const parsingMap = {

  //Record properties
  AP: 'parseGenerator',

  //Game information
  GM: 'parseGameType',
  RE: 'parseResult',
  DT: 'parseDates',
  KM: 'parseKomi',

  //Board information. VW is the standard property for a partial board; the
  //XL/XR/XT/XB set is the private one seki inherited from ngGo, kept here so
  //that records seki wrote before it moved to VW still read
  SZ: 'parseSize',
  VW: 'parseView',
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

  //Board views read from VW properties, one per game tree, keyed by the game
  //info they belong to. They can't be turned into cut off amounts as they are
  //read, because that needs the board size and SZ is free to come after VW in
  //the root node
  views = new Map()

  //Everything the reader had to say about the record it last read, in the
  //order it appears in that record. See getDiagnostics() below.
  diagnostics = []

  //Whether to warn about things that are worth knowing but not worth
  //reporting, such as a property no reader here acts on
  verbose = false

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

    //Start a fresh set of diagnostics, so that what getDiagnostics() reports
    //is about the record being read now and not the one before it
    this.diagnostics = []

    //Turn the record into tokens, each of which knows where in the record it
    //came from. NOTE: this used to match the whole record against a regex
    //with a g flag, which skips whatever fails to match without saying so, so
    //a malformed record came out as a smaller game rather than as a problem.
    const tokens = tokenizeSgf(sgf)

    //Initialise stack and collection of game trees
    const stack = []
    const trees = []

    //Start with no views, so that a second call on the same converter can't
    //crop its games with a view read out of the first one
    this.views = new Map()

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

    //Walk the tokens
    let i = 0
    while (i < tokens.length) {
      const token = tokens[i]

      //New variation, or the start of a game tree if none is open
      if (token.type === sgfTokenTypes.PARENTHESIS && token.value === '(') {
        if (root === null) {
          startTree()
        }
        stack.push({node: parentNode, token})
        i++
        continue
      }

      //End of variation
      else if (token.type === sgfTokenTypes.PARENTHESIS) {
        if (stack.length === 0) {
          this.addDiagnostic(
            sgfDiagnosticCodes.UNMATCHED_CLOSING_PARENTHESIS, token,
            `Closing parenthesis without an opening one`
          )
          i++
          continue
        }
        parentNode = stack.pop().node

        //Back at the top level, so this game tree is complete and the next
        //( in the file opens a new game rather than a variation of this one
        if (stack.length === 0) {
          root = null
          info = null
          parentNode = null
        }
        i++
        continue
      }

      //A node, being a semicolon and every property that follows it
      else if (token.type === sgfTokenTypes.SEMICOLON) {

        //Read the node's properties, carrying on from whatever ended it
        const {properties, next} = this.readProperties(tokens, i + 1)
        i = next

        //Properties before the first ( of the file. Not valid SGF, but it
        //used to be read onto the root node all the same, so give it one to
        //land on
        if (root === null) {
          startTree()
        }

        //Create a new node if the parent node already has instructions, or if
        //this node records a move. Otherwise, the instructions are set on the
        //parent node. This allows for setup instructions to be set on the
        //root node without creating a new node.
        if (parentNode.hasInstructions() || properties.some(isMoveProperty)) {
          const node = new GameNode()
          parentNode.appendChild(node)
          parentNode = node
        }

        //Parse the properties onto it
        this.parseProperties(properties, parentNode, info)
        continue
      }

      //Anything else is outside of a node, so there is nothing to read it
      //onto. Skipped rather than fatal, as the game trees around it are still
      //perfectly readable.
      this.reportStrayToken(token)
      i++
    }

    //Variations that were opened and never closed. Everything in them was
    //still read, so this is worth reporting rather than failing over.
    for (const {token} of stack) {
      this.addDiagnostic(
        sgfDiagnosticCodes.UNCLOSED_PARENTHESIS, token,
        `Opening parenthesis is never closed`
      )
    }

    //Hand the diagnostics back in the order they appear in the record, rather
    //than in the order the reader happened to notice them
    this.diagnostics.sort((a, b) => a.pos - b.pos)

    //Nothing but stray closing brackets, so there was no game tree in there
    //after all. NOTE: this used to hand back an empty game instead, leaving
    //the caller to work out that nothing had been read
    if (trees.length === 0) {
      throw new Error(`Unable to parse SGF data: no game tree found`)
    }

    //Every board size is known now, so any views read can become cut offs
    for (const {info} of trees) {
      this.applyView(info)
    }

    //Return the game trees
    return trees
  }

  /**
   * Read the properties of a node, being everything between its semicolon and
   * whatever ends it
   *
   * Returns the properties read, and the index of the token that ended the
   * node so the caller can carry on from there. Anything unreadable in
   * between is reported and skipped rather than ending the node early, since
   * a reader that stops at the first thing it doesn't understand loses every
   * property after it as well.
   */
  readProperties(tokens, start) {

    //Collect properties, each being an identifier and the values after it
    const properties = []
    let property = null
    let i = start

    //Read until something that isn't part of this node
    for (; i < tokens.length; i++) {
      const token = tokens[i]

      //A new property starts here. The lowercase letters FF[3] allowed to be
      //mixed in are dropped, so that CoPyright is read as CP.
      if (token.type === sgfTokenTypes.PROP_IDENT) {
        property = {
          key: token.value.replace(regexLowerCase, ''),
          values: [],
          token,
        }
        properties.push(property)
        continue
      }

      //A value, belonging to the property before it. NOTE: whitespace is not
      //a token, so a value list that wraps over several lines reads as one
      //list rather than ending at the line break.
      else if (token.type === sgfTokenTypes.C_VALUE_TYPE) {
        if (property === null) {
          this.addDiagnostic(
            sgfDiagnosticCodes.VALUE_WITHOUT_IDENTIFIER, token,
            `Property value without an identifier: ${token.value}`
          )
          continue
        }
        property.values.push(this.unescapeValue(
          token.value.substring(1, token.value.length - 1)
        ))
        continue
      }

      //Something unreadable in the middle of the node, which is skipped so
      //that the properties after it are still read
      else if (token.type === sgfTokenTypes.INVALID) {
        this.reportStrayToken(token)
        continue
      }

      //A parenthesis or another semicolon ends this node
      break
    }

    //Return the properties, and where the node ended
    return {properties, next: i}
  }

  /**
   * Parse node properties onto a node
   */
  parseProperties(properties, node, info) {

    //Handle each property of this node
    for (const {key, values, token} of properties) {

      //Nothing but lowercase letters, so there is no identifier to act on
      if (key === '') {
        this.addDiagnostic(
          sgfDiagnosticCodes.PROPERTY_WITHOUT_IDENTIFIER, token,
          `Property without an identifier: ${token.value}`
        )
        continue
      }

      //An identifier with no value after it, which says nothing
      if (values.length === 0) {
        this.addDiagnostic(
          sgfDiagnosticCodes.PROPERTY_WITHOUT_VALUE, token,
          `Property ${key} has no value`
        )
        continue
      }

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
   * Diagnostics
   ***/

  /**
   * Get the diagnostics collected while reading the last record
   *
   * Each entry is of the shape {code, message, row, col, pos}, where the code
   * is one of sgfDiagnosticCodes, row and col count from 1 as an editor shows
   * them, and pos is an index into the record. They come back in the order
   * they appear in the record, and an empty array means it read cleanly.
   */
  getDiagnostics() {
    return this.diagnostics
  }

  /**
   * Record a diagnostic about something the record got wrong
   *
   * These are collected rather than thrown. Records in the wild are written
   * by all sorts of software, and a reader that starts rejecting files it
   * used to open is a worse reader; the caller is told what was skipped
   * instead. Only a record with no game tree in it at all is fatal, which
   * parseSgf handles itself.
   */
  addDiagnostic(code, token, message) {
    const {row, col, pos} = token
    this.diagnostics.push({code, message, row, col, pos})
    if (this.verbose) {
      console.warn(`SGF diagnostic on line ${row}, column ${col}: ${message}`)
    }
  }

  /**
   * Report a token that couldn't be read where it was found
   *
   * A [ that never closes is worth naming separately, as it swallows the rest
   * of the record and takes its own property with it, rather than being a
   * stray character that only costs what it is.
   */
  reportStrayToken(token) {

    //An unterminated property value
    if (token.type === sgfTokenTypes.INVALID && token.value.charAt(0) === '[') {
      this.addDiagnostic(
        sgfDiagnosticCodes.UNTERMINATED_VALUE, token,
        `Property value is not closed before the end of the record`
      )
      return
    }

    //Anything else the tokenizer couldn't make sense of
    if (token.type === sgfTokenTypes.INVALID) {
      this.addDiagnostic(
        sgfDiagnosticCodes.INVALID_INPUT, token,
        `Skipped input that is not valid SGF: ${token.value}`
      )
      return
    }

    //A property, or one of its values, that isn't inside a node, so there is
    //nothing to read it onto
    const what = (token.type === sgfTokenTypes.C_VALUE_TYPE) ?
      `Property value` :
      `Property`
    this.addDiagnostic(
      sgfDiagnosticCodes.PROPERTY_OUTSIDE_NODE, token,
      `${what} outside of a node: ${token.value}`
    )
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
   * View parser
   *
   * VW is the FF[4] property for a partial board, naming the region that
   * stays visible as a point list. Seki's own model is four cut off amounts,
   * one per side, so the view is read as the bounding box of the points
   * listed. A view that isn't rectangular therefore comes back as the
   * smallest rectangle containing it, with whatever it left out restored.
   *
   * NOTE: in SGF a view is inheritable and applies from its node down until
   * an empty VW[] clears it again. Seki holds the cut off as board wide
   * configuration with no per node equivalent, so only the root node's view
   * is read and a view set part way through a game is ignored.
   */
  parseView(info, node, key, values) {

    //Not the root node, so this is a view seki has nowhere to put
    if (!node.isRoot()) {
      if (this.verbose) {
        console.warn(`Ignoring ${key} property on a non root node, as seki has no per node board view:`, values)
      }
      return
    }

    //Collect every point the values cover. NOTE: a value may be a compressed
    //point list naming a whole rectangle, which this expands
    const points = []
    for (const value of values) {
      if (value === '') {
        continue
      }
      const coords = this.createCoordinates(value)
      if (coords.length === 0) {
        console.warn(`Invalid coordinate encountered while parsing SGF: ${key} =>`, value)
        continue
      }
      points.push(...coords)
    }

    //Points to work with, so store their bounding box
    if (points.length > 0) {
      const x = points.map(point => point.x)
      const y = points.map(point => point.y)
      this.views.set(info, {
        minX: Math.min(...x),
        maxX: Math.max(...x),
        minY: Math.min(...y),
        maxY: Math.max(...y),
      })
      return
    }

    //An empty VW[] resets the view, putting the whole board back on show.
    //Anything else here is a value list we couldn't read at all, which is no
    //instruction to go on, so leave any earlier view in place
    if (values.every(value => value === '')) {
      this.views.set(info, null)
    }
  }

  /**
   * Turn a board view into cut off amounts
   *
   * Called once a game tree has been read in full, as the cut off on the
   * right and at the bottom is measured from the far edge of the board and
   * so can't be worked out until the board size is known.
   */
  applyView(info) {

    //No view read for this game, so leave whatever the legacy XL/XR/XT/XB
    //properties set alone. Reading a view is what overrides them
    if (!this.views.has(info)) {
      return
    }

    //Get the board dimensions the view is measured against, falling back to
    //the size assumed for a game whose record doesn't state one
    const fallback = defaultGameInfo.board.size
    const size = parseInt(get(info, 'board.size'))
    const width = parseInt(get(info, 'board.width')) || size || fallback
    const height = parseInt(get(info, 'board.height')) || size || fallback

    //A cleared view means the whole board is visible again
    const view = this.views.get(info) ||
      {minX: 0, maxX: width - 1, minY: 0, maxY: height - 1}

    //Store against each side. NOTE: the amounts are clamped, so that a view
    //naming points past the edge of the board can't cut off a negative
    //number of lines and grow the board instead of cropping it
    const {minX, maxX, minY, maxY} = view
    set(info, 'board.cutOffLeft', Math.max(minX, 0))
    set(info, 'board.cutOffRight', Math.max(width - 1 - maxX, 0))
    set(info, 'board.cutOffTop', Math.max(minY, 0))
    set(info, 'board.cutOffBottom', Math.max(height - 1 - maxY, 0))
  }

  /**
   * Cut off parser
   *
   * XL/XR/XT/XB are the private properties seki inherited from ngGo and used
   * to write for a partial board. They are still read so that records seki
   * wrote before it moved to the standard VW property keep their cropping,
   * but a VW on the root node overrides them.
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
   *
   * DT can list more than one date, for a game played over several days or an
   * adjourned one, and a date in that list may leave off whatever it shares
   * with the one before it. NOTE: this used to split on commas and stop there,
   * so 1996-10-18,19 came through as the second date being the number 19.
   */
  parseDates(info, node, key, values) {
    const dates = parseDateList(values[0])
    set(info, 'game.dates', dates)
    set(info, 'game.date', dates[0])
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
