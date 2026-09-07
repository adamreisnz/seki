import PlayerModeReplay from './player-mode-replay.js'
import {playerModes} from '../../constants/player.js'

/**
 * Play a game in this mode
 */
export default class PlayerModePlay extends PlayerModeReplay {

  //Mode type
  mode = playerModes.PLAY

  /**
   * Get the event listeners this mode needs
   *
   * This mode needs the replay listeners that keep the board display fresh, so
   * that the last move marker follows the game as it is played. They are taken
   * from the parent rather than restated, so that a listener added there is
   * picked up here too.
   */
  getEventListeners() {

    //Get the replay listeners
    const listeners = super.getEventListeners()

    //A game being played is not a record to navigate back and forth through,
    //so the keyboard and mouse wheel listeners are deliberately left out
    delete listeners.keydown
    delete listeners.wheel

    //Add our own
    return {
      ...listeners,
      gridEnter: 'onGridEnter',
      gridLeave: 'onGridLeave',
    }
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
    const {x, y} = event.detail

    //Play move
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
   * Play a move
   */
  playMove(x, y) {

    //Get player
    const {player, board} = this

    //Play move. NOTE: the player takes care of the move and capture sounds,
    //so this must not play them again or they end up doubled up.
    const outcome = player.playMove(x, y)
    if (outcome.isValid) {
      board.clearHoverLayer()
    }
  }

  /**
   * Show hover stone
   */
  showHoverStone(event) {

    //Get data
    const {game} = this

    //Already a stone in place?
    const {x, y} = event.detail
    if (game.hasStone(x, y)) {
      return
    }

    //Create hover stone
    const color = game.getTurn()

    //Show hover stone for given color
    this.showHoverStoneForColor(x, y, color)
  }
}
