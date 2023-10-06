import Base from './base.js'

/**
 * Base player mode class
 */
export default class PlayerMode extends Base {

  //Mouse coordinates helper var
  mouse = {
    lastX: -1,
    lastY: -1,
  }

  /**
   * Constructor
   */
  constructor(player) {

    //Parent constructor
    super()

    //Store reference to player
    this.player = player
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
   * Create bound listeners for given event/method map
   */
  createBoundListeners(map) {

    //No map  given
    if (!map) {
      return
    }

    //Store map
    this.eventListenersMap = map

    //Create bound listeners
    this.bound = Object
      .values(map)
      .reduce((obj, name) => {
        obj[name] = this[name].bind(this)
        return obj
      }, {})
  }

  /**
   * Register event listeners on the player
   */
  registerEventListeners() {

    //Get event listeners map
    const {eventListenersMap, player, bound} = this
    if (!eventListenersMap) {
      return
    }

    //Register event listeners
    for (const key in eventListenersMap) {
      const fn = eventListenersMap[key]
      player.on(key, bound[fn])
    }
  }

  /**
   * Remove event listeners
   */
  removeEventListeners() {

    //Get event listeners map
    const {eventListenersMap, player, bound} = this
    if (!eventListenersMap) {
      return
    }

    //Remove event listeners
    for (const key in eventListenersMap) {
      const fn = eventListenersMap[key]
      player.off(key, bound[fn])
    }
  }
}
