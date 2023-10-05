
/**
 * Base player mode class
 */
export default class PlayerMode {

  /**
   * Constructor
   */
  constructor(player, mode) {

    //Reference to player
    this.player = player

    //Set the mode identifier
    this.mode = mode

    //Available tools in this mode
    this.availableTools = []
    this.defaultTool = undefined

    //Event handler
    this.eventHandler = undefined

    //Mouse coordinate helper var
    this.mouse = {
      lastX: -1,
      lastY: -1,
    }

    //Create bound event listeners
    this.createBoundListeners()
  }

  /**
   * Game virtual shortcut
   */
  get game() {
    return this.player.game
  }

  /**
   * Board virtual shortcut
   */
  get board() {
    return this.player.board
  }

  /**
   * Whether this mode is active
   */
  get isActive() {
    return (this.player.mode === this.mode)
  }

  /**************************************************************************
   * Mode activation/deactivation
   ***/

  /**
   * Activate this mode
   */
  activate() {

    //Get data
    const {player, availableTools, defaultTool} = this

    //Register event listeners
    this.registerEventListeners()

    //Set available tools and active tool
    player.setAvailableTools(availableTools)
    player.switchTool(defaultTool)
  }

  /**
   * Deactivate this mode
   */
  deactivate() {

    //NOTE: There is no need to tear down any available tools or active tool,
    //because the new mode will do that automatically when it's activated.

    //Remove event listeners
    this.removeEventListeners()
  }

  /**************************************************************************
   * Event handling
   ***/

  /**
   * Create bound listeners for given method names
   */
  createBoundListeners(names) {

    //No names given
    if (!Array.isArray(names)) {
      return
    }

    //Create bound listeners
    this.bound = names
      .reduce((obj, name) => {
        obj[name] = this[name].bind(this)
        return obj
      }, {})
  }

  /**
   * Register event listeners on the player (none by default)
   */
  registerEventListeners() {}
  removeEventListeners() {}
}
