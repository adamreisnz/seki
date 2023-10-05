import PlayerMode from '../player-mode.js'
import {playerModes, playerTools} from '../../constants/player.js'

/**
 * A mode that doesn't allow the player to do anything
 */
export default class PlayerModeNone extends PlayerMode {

  /**
   * Constructor
   */
  constructor(player) {

    //Parent method
    super(player, playerModes.NONE)

    //Available tools in this mode
    this.availableTools = [
      playerTools.NONE,
    ]

    //Default mode
    this.defaultTool = playerTools.NONE
  }
}
