import Convert from '../convert.js'
import Game from '../game.js'
import GameNode from '../game-node.js'
import {stoneColors} from '../../constants/stone.js'

/**
 * Regular expressions
 */
const regexMove = /STO\s0\s([0-9]+)\s(1|2)\s([0-9]+)\s([0-9]+)/gi
const regexPlayer = /GAME(BLACK|WHITE)NAME=([A-Za-z0-9]+)\s\(([0-9]+D|K)\)/gi
const regexKomi = /GAMEGONGJE=([0-9]+)/gi
const regexDate = /GAMEDATE=([0-9]+)-\s?([0-9]+)-\s?([0-9]+)/g
const regexResultMargin = /GAMERESULT=(white|black)\s([0-9]+\.?[0-9]?)/gi
const regexResultOther = /GAMERESULT=(white|black)\s[a-z\s]+(resignation|time)/gi

/**
 * Parse GIB data into a seki game object
 *
 * NOTE: Since the Gib format is not public,
 * the accuracy of this parser is not guaranteed
 */
export default class ConvertFromGib extends Convert {

  /**
   * Convert GIB data into a game object
   */
  convert(gib) {

    //Initialize
    const game = new Game()

    //Create root node
    game.root = new GameNode()

    //Find player information
    this.findPlayerInformation(gib, game)

    //Find komi
    this.findKomi(gib, game)

    //Find game date
    this.findDate(gib, game)

    //Find game result
    this.findGameResult(gib, game)

    //Find moves
    this.findMoves(gib, game, game.root)

    //Return game
    return game
  }

  /**
   * Find player information
   */
  findPlayerInformation(gib, game) {

    //Find player information
    const match = regexPlayer.exec(gib)
    if (match) {
      this.parsePlayer(game, match)
      this.findPlayerInformation(gib, game)
    }
  }

  /**
   * Find komi
   */
  findKomi(gib, game) {

    //Find match
    const match = regexKomi.exec(gib)
    if (match) {
      this.parseKomi(game, match)
    }
  }

  /**
   * Find date
   */
  findDate(gib, game) {

    //Find match
    const match = regexDate.exec(gib)
    if (match) {
      this.parseDate(game, match)
    }
  }

  /**
   * Find game result
   */
  findGameResult(gib, game) {

    //Find match
    const match = regexResultMargin.exec(gib)
    if (match) {
      this.parseResult(game, match)
    }
    else {
      const match = regexResultOther.exec(gib)
      if (match) {
        this.parseResult(game, match)
      }
    }
  }

  /**
   * Find moves
   */
  findMoves(gib, game, parentNode) {

    //Find match
    const match = regexMove.exec(gib)
    if (match) {

      //Create move node
      const node = this.parseMove(match)

      //Append to parent node
      parentNode.appendChild(node)

      //Continue finding moves
      this.findMoves(gib, game, node)
    }
  }

  /**************************************************************************
   * Parsers
   ***/

  /**
   * Player parser function
   */
  parsePlayer(game, match) {

    //Determine player color
    const color = this.determinePlayerColor(match[1])

    //Get players container (filter out if existing player found)
    const players = game
      .getInfo('players', [])
      .filter(player => player.color !== color)

    //Create player object
    const player = {
      color,
      name: match[2],
      rank: match[3].toLowerCase(),
    }

    //Add to players
    players.push(player)

    //Set on game
    game.setInfo('players', players)
  }

  /**
   * Komi parser function
   */
  parseKomi(game, match) {
    const komi = match[1] / 10
    game.setInfo('rules.komi', komi)
  }

  /**
   * Date parser function
   */
  parseDate(game, match) {
    const date = `${match[1]}-${match[2]}-${match[3]}`
    game.setInfo('game.date', date)
  }

  /**
   * Result parser function
   */
  parseResult(game, match) {

    //Winner color
    let result = (match[1].toLowerCase() === 'black') ? 'B' : 'W'
    result += '+'

    //Win condition
    if (match[2].match(/res/i)) {
      result += 'R'
    }
    else if (match[2].match(/time/i)) {
      result += 'T'
    }
    else {
      result += match[2]
    }

    //Set in game
    game.setInfo('game.result', result)
  }

  /**
   * Move parser function
   */
  parseMove(match) {

    //Determine player color
    const color = this.convertColor(match[2])
    if (!color) {
      return
    }

    //Create move
    const move = {}

    //TODO: Pass
    // eslint-disable-next-line no-constant-condition
    if (false) {
      move.pass = true
    }

    //Regular move
    else {
      move.color = color
      move.x = parseInt(match[3])
      move.y = parseInt(match[4])
    }

    //Create node
    return new GameNode({move})
  }

  /*****************************************************************************
   * Parsing helpers
   ***/

  /**
   * Determine player color
   */
  determinePlayerColor(str) {
    if (str.match(/black/i)) {
      return stoneColors.BLACK
    }
    else if (str.match(/white/i)) {
      return stoneColors.WHITE
    }
  }

  /**
   * Convert a string color value to a numeric color value
   */
  convertColor(color) {
    if (color === 1) {
      return stoneColors.BLACK
    }
    else if (color === 2) {
      return stoneColors.WHITE
    }
  }
}
