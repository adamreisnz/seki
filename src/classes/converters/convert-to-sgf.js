import Converter from './converter.js'
import Game from '../game.js'
import {get} from '../../helpers/object.js'
import {markupTypes} from '../../constants/markup.js'
import {
  charCodeA,
  charCodeAUpper,
  maxCoordinate,
  sgfStoneColors,
  sgfGameInfoMap,
  sgfGameTypes,
  sgfSetupTypes,
  sgfMarkupTypes
} from '../../constants/sgf.js'

//Info properties parsing map
const gameInfoConversionMap = {
  'record.generator': 'convertGenerator',
  'game.type': 'convertGameType',
  settings: 'convertVariationSettings',
}

//Node parsing map
const nodeParsingMap = {
  name: 'parseNodeName',
  move: 'parseMove',
  markup: 'parseMarkup',
  setup: 'parseSetup',
  score: 'parseScore',
  turn: 'parseTurn',
  comments: 'parseComments',
}

//Default options
const defaultOptions = {
  includeVariationSettings: false,
  includeZeroValues: false,
}

/**
 * Converter to SGF
 */
export default class ConvertToSgf extends Converter {

  /**
   * Convert Seki game object to SGF
   */
  convert(game, options = {}) {

    //Not a game instance
    if (!(game instanceof Game)) {
      throw new Error('Not a game instance')
    }

    //Get options
    const {
      includeVariationSettings,
      includeZeroValues,
    } = Object.assign({}, defaultOptions, options || {})

    //Get game info and initialize sgf root properties object. What comes
    //out of here is a JavaScript string, so the charset it declares is UTF-8
    //whatever the record was read from.
    const info = game.getInfo()
    const root = {
      FF: 4,
      CA: 'UTF-8',
    }

    //Keys whose zero values get ignored
    const ignoreZeroValues = !includeZeroValues ? [
      'XL', 'XR',
      'XT', 'XB',
      'KM', 'HA',
      'TM', 'OT',
      'TC', 'TT',
    ] : []

    //Loop SGF game info map
    for (const key in sgfGameInfoMap) {

      //Get prop and value
      const prop = sgfGameInfoMap[key]
      const value = get(info, prop)

      //No value
      if (typeof value === 'undefined') {
        continue
      }

      //Ignore variation settings?
      if (!includeVariationSettings && key === 'ST') {
        continue
      }

      //Never let the source charset overwrite the one set above. A record
      //read as EUC-KR carries that in record.charset, and copying it over
      //would have this UTF-8 output declare itself as EUC-KR.
      if (key === 'CA') {
        continue
      }

      //Zero value
      if (value === 0 && ignoreZeroValues.includes(key)) {
        continue
      }

      //Parser present?
      if (gameInfoConversionMap[prop]) {
        root[key] = this[gameInfoConversionMap[prop]](value, game)
      }

      //Otherwise, just copy over
      else if (value !== '') {
        root[key] = this.escapeSgf(value)
      }
    }

    //Append data
    this.appendGenerator(root)
    this.appendSource(root, game)
    this.appendBoardSize(root, game)
    this.appendPlayers(root, game)

    //Initialize
    let sgf = ''

    //Append
    for (const key in root) {
      sgf += `\n`
      sgf += this.makeSgfGroup(key, root[key])
    }

    //Append game tree
    sgf += `\n;`
    sgf += this.parseNode(game.root)

    //Return
    return `(;${sgf}\n)`
  }

  /**
   * Append generator info
   */
  appendGenerator(root) {
    root.AP = this.getGeneratorSignature()
  }

  /**
   * Append source info
   */
  appendSource(root, game) {

    //Get source data
    const name = game.getSourceName()
    const url = game.getSourceUrl()
    const copyright = game.getSourceCopyright()

    //Set
    if (name && url) {
      root.SO = `${name || ''}, ${url || ''}`
    }
    else if (name) {
      root.SO = name
    }
    else if (url) {
      root.SO = url
    }
    if (copyright) {
      root.CP = copyright
    }
  }

  /**
   * Append baord size
   */
  appendBoardSize(root, game) {

    //Get size properties
    const {width, height} = game.getBoardSize()

    //Get key
    const key = 'SZ'

    //Width and height which are the same
    if (width && height && width === height) {
      root[key] = width
    }

    //Different dimensions
    else if (width && height) {
      root[key] = `${width}:${height}`
    }

    //Can't determine size
    else {
      root[key] = 0
    }
  }

  /**
   * Append players
   */
  appendPlayers(root, game) {

    //Get players
    const players = game.getPlayers()
    const colors = Object.keys(players)

    //Loop
    for (const color of colors) {

      //Get color
      const c = this.convertColor(color)
      if (!c) {
        continue
      }

      //Get data
      const {name, rank, team} = players[color]

      //Set properties
      root[`P${c}`] = this.escapeSgf(name || '')
      if (rank) {
        root[`${c}R`] = this.escapeSgf(rank)
      }
      if (team) {
        root[`${c}T`] = this.escapeSgf(team)
      }
    }
  }

  /**************************************************************************
   * Tree and node parsing
   ***/

  /**
   * Parse a node
   */
  parseNode(node) {

    //Initialize
    let sgf = ''

    //Loop node properties
    for (const key in node) {
      if (nodeParsingMap[key]) {
        sgf += this[nodeParsingMap[key]](node[key])
      }
    }

    //Multiple children
    if (node.hasMultipleChildren()) {
      for (const child of node.children) {
        sgf += '(\n;'
        sgf += this.parseNode(child)
        sgf += '\n)'
      }
    }

    //Just one child
    else if (node.hasChildren()) {

      //Already have content? Add separator
      if (sgf !== '') {
        sgf += ';'
      }

      //Add node contents
      sgf += this.parseNode(node.getChild(), sgf)
    }

    //Return value
    return sgf
  }

  /**
   * Move parser
   */
  parseMove(move) {

    //Determine color
    const color = this.convertColor(move.color)

    //Pass move
    if (move.pass) {
      return this.makeSgfGroup(color)
    }

    //Determine coors
    const coords = this.extractCoordinates(move)
    return this.makeSgfGroup(color, coords)
  }

  /**
   * Setup parser
   */
  parseSetup(setup) {

    //Initialise coordinate groups
    const groups = {}

    //Loop over setup instructions
    for (const obj of setup) {

      //Get SGF setup type and extract coordinates
      const key = this.getMappedValue(obj.type, sgfSetupTypes)
      const coords = this.extractCoordinates(obj.coords)

      //Initialise group and add entry
      groups[key] = groups[key] || []
      groups[key].push(...coords)
    }

    //Now convert by type to SGF
    let sgf = ''
    for (const key in groups) {
      sgf += this.makeSgfGroup(key, groups[key])
    }

    //Return
    return sgf
  }

  /**
   * Markup parser
   */
  parseMarkup(markup) {

    //Initialise coordinate groups
    const groups = {}

    //Loop over markup instructions
    for (const obj of markup) {

      //Get SGF markup type and extract coordinates
      const isLabel = (obj.type === markupTypes.LABEL)
      const key = this.getMappedValue(obj.type, sgfMarkupTypes)
      const coords = this.extractCoordinates(obj.coords, isLabel)

      //Initialise group
      groups[key] = groups[key] || []
      groups[key].push(...coords)
    }

    //Now convert by type to SGF
    let sgf = ''
    for (const key in groups) {
      sgf += this.makeSgfGroup(key, groups[key])
    }

    //Return
    return sgf
  }

  /**
   * Score parser
   */
  parseScore(score) {

    //Initialise sgf
    let sgf = ''

    //Loop entries
    for (const entry of score) {
      const color = this.convertColor(entry.color)
      const key = `T${color}`
      const coords = this.extractCoordinates(entry.coords)
      sgf += this.makeSgfGroup(key, coords)
    }

    //Return
    return sgf
  }

  /**
   * Turn parser
   */
  parseTurn(turn) {
    return this.makeSgfGroup('PL', this.convertColor(turn))
  }

  /**
   * Comments parser
   */
  parseComments(comments) {

    //No comments
    if (!comments) {
      return ''
    }

    //Not an array
    if (!Array.isArray(comments)) {
      comments = [comments]
    }

    //Filter out empty comments
    comments = comments.filter(Boolean)
    if (comments.length === 0) {
      return ''
    }

    //Make group
    return this.makeSgfGroup('C', comments, true)
  }

  /**
   * Node name parser
   */
  parseNodeName(nodeName) {
    if (!nodeName) {
      return ''
    }
    return this.makeSgfGroup('N', nodeName, true)
  }

  /*****************************************************************************
   * Parsing helpers
   ***/

  /**
   * Helper to convert to SGF coordinates
   */
  extractCoordinates(obj, isLabel = false) {
    if (Array.isArray(obj)) {
      return obj.map(entry => this.extractCoordinates(entry, isLabel))
    }
    const x = this.encodeCoordinate(obj.x)
    const y = this.encodeCoordinate(obj.y)

    //Label text is written into the value, so it has to be escaped here. It
    //can't be escaped by the caller, which would mangle the coordinates.
    //NOTE: without this a label containing a ] closed the property early and
    //everything after it was lost when the file was read back in.
    if (isLabel && obj.text) {
      return `${x}${y}:${this.escapeSgf(String(obj.text))}`
    }
    return `${x}${y}`
  }

  /**
   * Encode a single coordinate as an SGF coordinate character
   *
   * SGF runs a-z for 0-25 and continues with A-Z for 26-51, so anything past
   * 25 has to switch alphabets rather than carrying on past 'z' into
   * punctuation.
   */
  encodeCoordinate(i) {

    //Validate
    if (!Number.isInteger(i) || i < 0 || i > maxCoordinate) {
      throw new Error(`Invalid coordinate: ${i}`)
    }

    //Lowercase a-z covers 0-25
    if (i < 26) {
      return String.fromCharCode(charCodeA + i)
    }

    //Uppercase A-Z covers 26-51
    return String.fromCharCode(charCodeAUpper + i - 26)
  }

  /**
   * Convert a string color value to a numeric color value
   */
  convertColor(color) {
    return this.getMappedValue(color, sgfStoneColors)
  }

  /**
   * Game type parser
   */
  convertGameType(type) {
    return this.getMappedValue(type, sgfGameTypes)
  }

  /**
   * Generator parser
   */
  convertGenerator(generator) {
    return generator
      .split(' v')
      .join(':')
  }

  /**
   * Settings parser
   */
  convertVariationSettings(settings) {
    return (
      (settings.showVariations ? 0 : 2) +
      (settings.showSiblingVariations ? 1 : 0)
    )
  }

  /**
   * Helper to escape SGF info
   */
  escapeSgf(str) {
    if (typeof str === 'string') {
      return str
        .replace(/\\/g, '\\\\')
        .replace(/]/g, '\\]')
    }
    return str
  }

  /**
   * Helper to make an SGF key
   */
  makeSgfGroup(key, value = '', escape = false) {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return ''
      }
      value = value
        .map(value => escape ? this.escapeSgf(value) : value)
        .join('][')
    }
    else if (escape) {
      value = this.escapeSgf(value)
    }
    return `${key}[${value}]`
  }
}
