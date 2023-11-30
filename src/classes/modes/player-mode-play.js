import PlayerModeReplay from './player-mode-replay.js'
import {randomInt} from '../../helpers/util.js'
import {playerModes} from '../../constants/player.js'

/**
 * Play a game in this mode
 */
export default class PlayerModePlay extends PlayerModeReplay {

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
    const {player, board, game} = this

    //Play move
    const outcome = player.playMove(x, y)
    if (outcome.isValid) {
      board.clearHoverLayer()
      player.playSound('move')
      if (game.position.hasCaptures()) {
        const num = Math.min(game.position.getTotalCaptureCount(), 10)
        for (let i = 0; i < num; i++) {
          setTimeout(() => {
            player.stopSound('capture')
            player.playSound('capture')
          }, 150 + randomInt(30, 90) * i)
        }
      }
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
