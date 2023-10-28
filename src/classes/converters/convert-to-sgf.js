import Converter from './converter.js'
import Game from '../game.js'
import {get} from '../../helpers/object.js'
import {markupTypes} from '../../constants/markup.js'
import {
  charCodeA,
  sgfStoneColors,
  sgfGameInfoMap,
  sgfGameTypes,
  sgfSetupTypes,
  sgfMarkupTypes,
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

/**
 * Converter to SGF
 */
export default class ConvertToSgf extends Converter {

  /**
   * Convert Seki game object to SGF
   */
  convert(game) {

    //Not a game instance
    if (!(game instanceof Game)) {
      throw new Error('Not a game instance')
    }

    //Get game info and initialize sgf root properties object
    const info = game.getInfo()
    const root = {
      FF: 4,
      CA: 'UTF-8',
    }

    //Loop SGF game info map
    for (const key in sgfGameInfoMap) {

      //Get prop and value
      const prop = sgfGameInfoMap[key]
      const value = get(info, prop)

      //No value
      if (typeof value === 'undefined') {
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
        sgf += '\n;'
      }
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
      console.log(key, coords)

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
      const key = this.getMappedValue(obj.type, sgfMarkupTypes)
      const coords = this.extractCoordinates(obj.coords)
      const mapped = coords.map(coord => {
        if (obj.type === markupTypes.LABEL) {
          return `${coord}:${obj.text}`
        }
        return coord
      })

      //Initialise group
      groups[key] = groups[key] || []
      groups[key].push(...mapped)
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
      const coords = this.extractCoordinates(entry.coordinates)
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

    //Flatten comment objects
    const flattened = comments
      .map(comment => {
        if (typeof comment === 'string') {
          return comment
        }
        else if (typeof comment === 'object' && comment.comment) {
          return comment.comment
        }
      })
      .filter(comment => !!comment)

    //Nothing
    if (flattened.length === 0) {
      return ''
    }

    //Make group
    return this.makeSgfGroup('C', flattened, true)
  }

  /**
   * Node name parser
   */
  parseNodeName(nodeName) {
    return this.makeSgfGroup('N', nodeName, true)
  }

  /*****************************************************************************
   * Parsing helpers
   ***/

  /**
   * Helper to convert to SGF coordinates
   */
  extractCoordinates(obj) {
    if (Array.isArray(obj)) {
      return obj.map(entry => this.extractCoordinates(entry))
    }
    if (obj.x < 0 || obj.y < 0) {
      throw new Error(`Invalid coordinates: (${obj.x},${obj.y})`)
    }
    const x = String.fromCharCode(charCodeA + obj.x)
    const y = String.fromCharCode(charCodeA + obj.y)
    return `${x}${y}`
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
