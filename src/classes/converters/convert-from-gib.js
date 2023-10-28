import Converter from './converter.js'
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
export default class ConvertFromGib extends Converter {

  /**
   * Convert GIB data into a game object
   */
  convert(gib) {

    //Initialize
    const game = new Game()

    //Find data
    this.findPlayerInformation(gib, game)
    this.findKomi(gib, game)
    this.findDate(gib, game)
    this.findGameResult(gib, game)
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
      if (node) {
        parentNode.appendChild(node)
        parentNode = node
      }

      //Continue finding moves
      this.findMoves(gib, game, parentNode)
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
    const name = match[2]
    const rank = match[3].toLowerCase()

    //Set on game
    game.setPlayer(color, {name, rank})
  }

  /**
   * Komi parser function
   */
  parseKomi(game, match) {
    const komi = match[1] / 10
    game.setKomi(komi)
  }

  /**
   * Date parser function
   */
  parseDate(game, match) {
    const date = `${match[1]}-${match[2]}-${match[3]}`
    game.setDate(date)
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
    game.setGameResult(result)
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
    if (Number(color) === 1) {
      return stoneColors.BLACK
    }
    else if (Number(color) === 2) {
      return stoneColors.WHITE
    }
  }
}
