import Convert from '../convert.js'
import Game from '../game.js'
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
  'game.dates': 'convertDates',
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
export default class ConvertToSgf extends Convert {

  /**
   * Convert Seki game object to SGF
   */
  convert(game) {

    //Not a game instance
    if (!(game instanceof Game)) {
      throw new Error('Not a game instance')
    }

    //Initialize sgf root properties object
    const root = {}

    //Loop SGF game info map
    for (const key in sgfGameInfoMap) {

      //Get prop and value
      const prop = sgfGameInfoMap[key]
      const value = game.getInfo(prop)

      //Parser present?
      if (gameInfoConversionMap[prop]) {
        root[key] = this[gameInfoConversionMap[prop]](value, game)
      }

      //Otherwise, just copy over
      else {
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
      sgf += this.makeSgfGroup(key, root[key])
    }

    //Append game tree
    sgf += this.parseTree(game.tree)

    //Return
    return `(\n;${sgf})`
  }

  /**
   * Append generator info
   */
  appendGenerator(root) {
    root.AP = this.getGeneratorSignature()
    root.CA = 'UTF-8'
    root.FF = 4
  }

  /**
   * Append baord size
   */
  appendBoardSize(root, game) {

    //Get size properties
    const size = game.getInfo('board.size')
    const width = game.getInfo('board.width')
    const height = game.getInfo('board.height')

    //Get key
    const key = 'SZ'

    //Size
    if (size) {
      root[key] = size
    }

    //Width and height which are the same
    else if (width && height && width === height) {
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
    const players = game.getInfo('players')

    //Loop
    for (const player of players) {

      //Get color
      const color = this.convertColor(player.color)
      if (!color) {
        continue
      }

      //Get data
      const {name, rank, team} = player

      //Set properties
      root[`P${color}`] = this.escapeSgf(name || '')
      if (rank) {
        root[`${color}R`] = this.escapeSgf(rank)
      }
      if (team) {
        root[`${color}T`] = this.escapeSgf(team)
      }
    }
  }

  /**************************************************************************
   * Tree and node parsing
   ***/

  /**
   * Helper to convert a tree to SGF
   */
  parseTree(tree) {

    //Initialize
    let sgf = ''

    //Loop nodes in the tree
    for (const node of tree) {

      //Already have content? Add separator
      if (sgf !== '') {
        sgf += '\n;'
      }

      //Array? That means a variation
      if (Array.isArray(node)) {
        for (const n of node) {
          sgf += '(\n;'
          sgf += this.parseTree(n)
          sgf += '\n)'
        }

        //Continue
        continue
      }

      //Loop node properties
      for (const key in node) {
        if (nodeParsingMap[key]) {
          sgf += this[nodeParsingMap[key]](node[key])
        }
      }
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
      const type = this.getMappedValue(obj.type, sgfSetupTypes)
      const coords = this.extractCoordinates(obj)

      //Initialise group and add entry
      groups[type] = groups[type] || []
      groups[type].push(coords)
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
      const type = this.getMappedValue(obj.type, sgfMarkupTypes)
      const coords = this.extractCoordinates(obj)

      //Initialise group
      groups[type] = groups[type] || []

      //Add to group
      if (obj.type === markupTypes.LABEL) {
        groups[type].push(`${coords}:${obj.text}`)
      }
      else {
        groups[type].push(coords)
      }
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
   * Date conversion
   */
  convertDates(dates) {
    return dates
      .join(',')
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
    let value = 0
    if (!settings.variationMarkup) {
      value += 2
    }
    if (settings.variationSiblings) {
      value += 1
    }
    return value
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