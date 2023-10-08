import PlayerMode from '../player-mode.js'
import {playerModes, playerTools} from '../../constants/player.js'

/**
 * Play a game in this mode
 */
export default class PlayerModePlay extends PlayerMode {

  //Mode type
  mode = playerModes.PLAY

  //Available tools for this mode
  availableTools = [
    playerTools.NONE,
    playerTools.MOVE,
  ]

  //Default tool
  defaultTool = playerTools.MOVE

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

    //Get data
    const {board} = this
    const {x, y} = event.detail

    //Did the click fall outside of the board grid?
    if (!board || !board.isOnBoard(x, y)) {
      return
    }

    //Play move
    this.clearHover()
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
    this.clearHover()
  }

  /**************************************************************************
   * Actions
   ***/

  /**
   * Play move
   */
  playMove(x, y) {
    const {player} = this
    player.play(x, y)
  }

  /**
   * Show hover stone
   */
  showHoverStone(event) {

    //Get data
    const {game} = this
    const {x, y} = event.detail
    const color = game.getTurn()

    //Parent method
    super.showHoverStone(x, y, color)
  }
}
