import PlayerMode from './player-mode.js'
import {playerModes} from '../../constants/player.js'

/**
 * Play a game in this mode
 */
export default class PlayerModePlay extends PlayerMode {

  //Mode type
  mode = playerModes.PLAY

  /**
   * Constructor
   */
  constructor(player) {

    //Parent method
    super(player)

    //Create bound event listeners
    this.createBoundListeners({
      click: 'onClick',
      gridEnter: 'onGridEnter',
      gridLeave: 'onGridLeave',
    })
  }

  /**************************************************************************
   * Event listeners
   ***/

  /**
   * Click handler
   */
  onClick(event) {

    //Check if valid coordinates
    if (!this.hasValidCoordinates(event)) {
      return
    }

    //Get data
    const {board} = this
    const {x, y} = event.detail

    //Play move
    board.clearHoverLayer()
    this.playMove(x, y)
  }

  /**
   * On grid enter
   */
  onGridEnter(event) {
    this.showHoverStone(event)
  }

  /**
   * On grid leave
   */
  onGridLeave() {
    const {board} = this
    board.clearHoverLayer()
  }

  /**************************************************************************
   * Actions
   ***/

  /**
   * Play move
   */
  playMove(x, y) {
    const {player} = this
    const outcome = player.playMove(x, y)
    if (outcome.isValid) {
      player.playSound('move')
    }
  }

  /**
   * Show hover stone
   */
  showHoverStone(event) {

    //Get data
    const {game, board} = this

    //Already a stone in place?
    const {x, y} = event.detail
    if (game.hasStone(x, y)) {
      return
    }

    //Create hover stone
    const color = game.getTurn()
    const stone = this.createHoverStone(color)

    //Set hover cell, but clear whole layer first due to shadows
    board.clearHoverLayer()
    board.setHoverCell(x, y, stone)
  }
}
