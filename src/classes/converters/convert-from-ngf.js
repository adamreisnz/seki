import Converter from './converter.js'
import Game from '../game.js'
import GameNode from '../game-node.js'
import {decodeData} from '../../helpers/encoding.js'
import {koreanHandicapPlacements} from '../../constants/game.js'
import {charCodeAUpper, sgfStoneColors} from '../../constants/sgf.js'
import {stoneColors} from '../../constants/stone.js'

/**
 * Header line indices
 *
 * NOTE: NGF carries no keys whatsoever. A header value is identified purely
 * by the line it sits on, so these indices are the entire header "schema".
 */
const lineBoardSize = 1
const linePlayerWhite = 2
const linePlayerBlack = 3
const lineHandicap = 5
const lineKomi = 7
const lineDate = 8
const lineResult = 10

/**
 * Regular expressions
 *
 * NOTE: none of these carry the global flag, as they are all matched against
 * a single line at a time rather than stepped through a whole file.
 */

//Move lines read PM<number><color><x><y><y><x>, e.g. PMABBREER. The move
//number and the coordinates are all letters, and the last two characters
//repeat the coordinates the other way around, which is of no use to us.
const regexMove = /^PM[A-Z]{2}([BW])([A-Z])([A-Z])/i

//Player lines are a name, whitespace, and a rank like 9DP, 7D* or 21K*, where
//the trailing asterisk marks a certified rank. The rank is anchored to the end
//of the line so that a name with a space in it survives.
const regexPlayer = /^(.+?)\s+(\d+)(DP|D|K)\*?$/i

//Player lines without a recognisable rank still carry a name
const regexPlayerName = /^(\S+)/

//Dates read YYYYMMDD, followed by a bracketed time we have no field for.
//Older records separate the parts with hyphens instead.
const regexDate = /^(\d{4})-?(\d{2})-?(\d{2})/

//Result lines are free text, and phrase a loss as readily as a win
const regexBlackWins = /black\s*win|white\s*lose/i
const regexWhiteWins = /white\s*win|black\s*lose/i
const regexResigned = /resign/i
const regexTimeout = /time/i
const regexMargin = /\bby\s+(\d+(?:\.\d+)?)/i

//Rank suffixes, as written by WBaduk, mapped onto conventional notation
const ngfRanks = {
  DP: 'p',
  D: 'd',
  K: 'k',
}

/**
 * Parse NGF data into a seki game object
 *
 * NOTE: Since the NGF format is not public, the accuracy of this parser is
 * not guaranteed. It follows the reverse engineered behaviour of the two
 * established open source readers, Sabaki and gofish.
 */
export default class ConvertFromNgf extends Converter {

  /**
   * Convert NGF data into a game object
   */
  convert(ngf) {

    //Decode binary data, detecting the encoding from the bytes themselves.
    //A string is handed straight back, so a caller that has already decoded
    //is unaffected.
    ngf = decodeData(ngf)

    //No data
    if (!ngf) {
      throw new Error(`No NGF data supplied`)
    }

    //Initialize. NGF files are written with CRLF line endings, and the
    //trailing carriage returns would otherwise end up inside every value.
    const game = new Game()
    const lines = String(ngf)
      .split(/\r?\n/)
      .map(line => line.trim())

    //Find data. The board size and handicap are read first, as the moves are
    //validated against the former and the handicap stones need the latter.
    const boardSize = this.findBoardSize(lines, game)
    const handicap = this.findHandicap(lines, game)

    //Find remaining header data
    this.findPlayerInformation(lines, game)
    this.findKomi(lines, game, handicap)
    this.findDate(lines, game)
    this.findGameResult(lines, game)

    //Place handicap stones and find moves. NGF records no free placement, so
    //a handicap game always uses the fixed points for the board size.
    this.placeHandicapStones(game, handicap, boardSize, koreanHandicapPlacements)
    this.findMoves(lines, game, boardSize)

    //Set event location
    game.setEventLocation('WBaduk Go Server')

    //Return game
    return game
  }

  /**
   * Find the board size, defaulting to 19 when it can't be read
   */
  findBoardSize(lines, game) {

    //Parse, falling back to a regular board
    const boardSize = parseInt(lines[lineBoardSize], 10)
    const size = (isNaN(boardSize) || boardSize < 1) ? 19 : boardSize

    //Set on game
    game.setBoardSize(size)
    return size
  }

  /**
   * Find the handicap
   */
  findHandicap(lines, game) {

    //Parse. Anything outside of the range the format can express is taken to
    //mean the line wasn't a handicap at all.
    const handicap = parseInt(lines[lineHandicap], 10)
    if (isNaN(handicap) || handicap < 0 || handicap > 9) {
      return 0
    }

    //Set on game
    game.setHandicap(handicap)
    return handicap
  }

  /**
   * Find player information
   */
  findPlayerInformation(lines, game) {
    this.parsePlayer(game, stoneColors.WHITE, lines[linePlayerWhite])
    this.parsePlayer(game, stoneColors.BLACK, lines[linePlayerBlack])
  }

  /**
   * Find komi
   */
  findKomi(lines, game, handicap) {

    //Parse
    const komi = parseFloat(lines[lineKomi])
    if (isNaN(komi)) {
      return
    }

    //NGF stores komi as a whole number and leaves the half point implied, so
    //an even game gets it added back on. Handicap games are played without.
    const value = (handicap === 0) ? Math.floor(komi) + 0.5 : Math.floor(komi)
    if (!value) {
      return
    }

    //Set on game
    game.setKomi(value)
  }

  /**
   * Find date
   */
  findDate(lines, game) {

    //Find match
    const match = regexDate.exec(lines[lineDate] || '')
    if (match) {
      const [, year, month, day] = match
      game.setGameDate(`${year}-${month}-${day}`)
    }
  }

  /**
   * Find game result
   */
  findGameResult(lines, game) {

    //Get the result line and determine the winner. Without one there is
    //nothing worth recording, as the margin alone says nothing.
    const line = lines[lineResult] || ''
    const winner = this.determineWinner(line)
    if (!winner) {
      return
    }

    //Set on game
    game.setGameResult(`${winner}+${this.determineMargin(line)}`)
  }

  /**
   * Find moves
   */
  findMoves(lines, game, boardSize) {

    //Moves are searched for across all lines, rather than from a fixed
    //offset, because older files carry fewer header lines than current ones
    let parentNode = game.root

    //Go over the lines
    for (const line of lines) {

      //Parse into a node, skipping anything that isn't a move
      const node = this.parseMove(line, boardSize)
      if (!node) {
        continue
      }

      //Append and descend
      parentNode.appendChild(node)
      parentNode = node
    }
  }

  /**************************************************************************
   * Parsers
   ***/

  /**
   * Player parser function
   */
  parsePlayer(game, color, line) {

    //Nothing to read
    if (!line) {
      return
    }

    //Rank present
    const match = regexPlayer.exec(line)
    if (match) {
      const [, name, grade, suffix] = match
      game.setPlayer(color, {name, rank: this.convertRank(grade, suffix)})
      return
    }

    //Name only, which is all a record in Korean gives us
    const nameMatch = regexPlayerName.exec(line)
    if (nameMatch) {
      game.setPlayer(color, {name: nameMatch[1]})
    }
  }

  /**
   * Move parser function
   */
  parseMove(line, boardSize) {

    //Not a move line
    const match = regexMove.exec(line)
    if (!match) {
      return
    }

    //Determine player color
    const color = this.convertColor(match[1])
    if (!color) {
      return
    }

    //Determine coordinates, and drop anything that can't be played. NGF has
    //no known way of expressing a pass, so this only catches corrupt lines.
    const x = this.convertCoordinate(match[2])
    const y = this.convertCoordinate(match[3])
    if (x < 0 || y < 0 || x >= boardSize || y >= boardSize) {
      return
    }

    //Create node
    return new GameNode({move: {color, x, y}})
  }

  /*****************************************************************************
   * Parsing helpers
   ***/

  /**
   * Determine who won from a free text result line
   */
  determineWinner(line) {
    if (regexWhiteWins.test(line)) {
      return 'W'
    }
    else if (regexBlackWins.test(line)) {
      return 'B'
    }
  }

  /**
   * Determine the winning margin from a free text result line
   */
  determineMargin(line) {

    //Win conditions come before any margin, as a game won on resignation or
    //on time still mentions the score it stood at
    if (regexResigned.test(line)) {
      return 'R'
    }
    else if (regexTimeout.test(line)) {
      return 'T'
    }

    //Margin, if one was written
    const match = regexMargin.exec(line)
    return match ? match[1] : ''
  }

  /**
   * Convert a WBaduk rank into its conventional notation, e.g. 9DP => 9p
   */
  convertRank(grade, suffix) {
    const notation = this.getMappedValue(suffix.toUpperCase(), ngfRanks)
    return `${grade}${notation}`
  }

  /**
   * Convert a string color value to a numeric color value. NGF writes colours
   * as the same B and W that SGF does, so the SGF map serves for both.
   */
  convertColor(color) {
    return this.getMappedValue(color.toUpperCase(), sgfStoneColors, true)
  }

  /**
   * Convert a single coordinate character, where B is the first line
   */
  convertCoordinate(char) {
    return char.toUpperCase().charCodeAt(0) - charCodeAUpper - 1
  }
}
