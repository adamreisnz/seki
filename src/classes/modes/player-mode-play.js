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
      hover: 'onHover',
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
    this.playMove(x, y)
  }

  /**
   * On hover
   */
  onHover(event) {

    //Get data
    const {player} = this

    //Move tool active
    if (player.isToolActive(playerTools.MOVE)) {
      this.createHoverStone(event)
    }
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
}
