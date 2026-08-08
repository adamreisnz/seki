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
    //NOTE: this mode is replay mode with a board you can play on, so it needs
    //the replay listeners as well as its own, the same way edit mode spells
    //them out. Listing only its own three meant markers were rendered once on
    //activation and never again, so the last move marker stayed wherever it
    //was when the mode was entered, and no keyboard binding did anything.
    this.createBoundListeners({
      keydown: 'onKeyDown',
      click: 'onClick',
      wheel: 'onMouseWheel',
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
