import PlayerMode from '../player-mode.js'
import {playerModes, playerTools} from '../../constants/player.js'

/**
 * Solve puzzles in this mode
 */
export default class PlayerModeSolve extends PlayerMode {

  /**
   * Constructor
   */
  constructor(player) {

    //Parent method
    super(player, playerModes.SOLVE)

    //Available tools in this mode
    this.availableTools = [
      playerTools.NONE,
      playerTools.MOVE,
    ]

    //Set default tool
    this.defaultTool = playerTools.MOVE
  }
}
