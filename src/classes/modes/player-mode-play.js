import PlayerModeReplay from './player-mode-replay.js'
import {playerModes} from '../../constants/player.js'

/**
 * Play a game in this mode
 */
export default class PlayerModePlay extends PlayerModeReplay {

  //Mode type
  mode = playerModes.PLAY

  /**
   * Initialise
   */
  init() {

    //Create bound event listeners
    //NOTE: this mode needs the replay listeners that keep the board display
    //fresh, so that the last move marker follows the game as it is played.
    //It deliberately leaves out the keyboard and mouse wheel listeners, as a
    //game being played is not a record to navigate back and forth through.
    this.createBoundListeners({
      click: 'onClick',
      config: 'onConfigChange',
      pathChange: 'onPathChange',
      variationChange: 'onVariationChange',
      gameLoad: 'onGameLoad',
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
