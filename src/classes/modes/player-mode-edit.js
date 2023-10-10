import PlayerMode from './player-mode.js'
import {aCharUc, aCharLc} from '../../constants/common.js'
import {markupTypes} from '../../constants/markup.js'
import {stoneColors} from '../../constants/stone.js'
import {
  playerActions,
  playerModes,
  editingTools,
} from '../../constants/player.js'

/**
 * This mode lets you edit a single position
 */
export default class PlayerModeEdit extends PlayerMode {

  //Mode type
  mode = playerModes.EDIT

  //Set default editing tool
  tool = editingTools.TRIANGLE

  //Used markup labels
  usedMarkupLabels = []

  //Track hover coordinates so we can update the hover object
  currentHoverGrid

  /**
   * Constructor
   */
  constructor(player) {

    //Parent method
    super(player)

    //Extend player
    this.extendPlayer()

    //Create bound event listeners
    this.createBoundListeners({
      keydown: 'onKeyDown',
      click: 'onClick',
      gridEnter: 'onGridEnter',
      gridLeave: 'onGridLeave',
    })
  }

  /**
   * Extend the player with new methods
   */
  extendPlayer() {

    //Get data
    const {player, mode} = this

    //Extend player
    player.extend('useEditingTool', mode)
  }

  /**
   * Activate this mode
   */
  activate() {

    //Parent method
    super.activate()

    //Find used markup labels
    this.resetUsedMarkupLabels()
    this.findUsedMarkupLabels()
  }

  /**************************************************************************
   * Event listeners
   ***/

  /**
   * Keydown events
   */
  onKeyDown(event) {

    //Get data
    const {player} = this
    const {keyCode} = event.detail.nativeEvent
    const action = player.getActionForKeyCode(keyCode)

    //Process action
    this.processAction(action, event)
  }

  /**
   * Click handler
   */
  onClick(event) {

    //Get data
    const {board} = this
    const {x, y} = event.detail

    //Debug
    this.debug(`click event at (${x},${y})`)

    //Did the click fall outside of the board grid?
    if (!board || !board.isOnBoard(x, y)) {
      this.debug(`position (${x},${y}) is outside of board grid`)
      return
    }

    //Clear hover layer and edit spot
    this.clearHover()
    this.edit(x, y)
  }

  /**
   * On grid enter
   */
  onGridEnter(event) {

    //Track coordinates
    this.currentHoverGrid = event.detail

    //Show hover markup or stone
    this.showHoverMarkup()
    this.showHoverStone()
  }

  /**
   * On grid leave
   */
  onGridLeave(event) {

    //Get data
    const {x, y} = event.detail

    //Clear hover and redraw grid cell (for removed markup)
    this.clearHover()
    this.redrawGridCell(x, y)
  }

  /**************************************************************************
   * Actions
   ***/

  /**
   * Process a bound action
   */
  processAction(action, event) {

    //No action
    if (!action) {
      return
    }

    //Debug
    this.debug(`🎯 action ${action}`)

    //Get data
    const {nativeEvent} = event.detail

    //Prevent default
    nativeEvent.preventDefault()

    //Determine action
    switch (action) {
      case playerActions.USE_EDIT_TOOL_BLACK:
        this.useEditingTool(editingTools.BLACK)
        break
      case playerActions.USE_EDIT_TOOL_WHITE:
        this.useEditingTool(editingTools.WHITE)
        break
      case playerActions.USE_EDIT_TOOL_CLEAR:
        this.useEditingTool(editingTools.CLEAR)
        break
      case playerActions.USE_EDIT_TOOL_TRIANGLE:
        this.useEditingTool(editingTools.TRIANGLE)
        break
      case playerActions.USE_EDIT_TOOL_CIRCLE:
        this.useEditingTool(editingTools.CIRCLE)
        break
      case playerActions.USE_EDIT_TOOL_SQUARE:
        this.useEditingTool(editingTools.SQUARE)
        break
      case playerActions.USE_EDIT_TOOL_DIAMOND:
        this.useEditingTool(editingTools.DIAMOND)
        break
      case playerActions.USE_EDIT_TOOL_MARK:
        this.useEditingTool(editingTools.MARK)
        break
      case playerActions.USE_EDIT_TOOL_HAPPY:
        this.useEditingTool(editingTools.HAPPY)
        break
      case playerActions.USE_EDIT_TOOL_SAD:
        this.useEditingTool(editingTools.SAD)
        break
      case playerActions.USE_EDIT_TOOL_LETTER:
        this.useEditingTool(editingTools.LETTER)
        break
      case playerActions.USE_EDIT_TOOL_NUMBER:
        this.useEditingTool(editingTools.NUMBER)
        break
    }
  }

  /**
   * Edit a position
   */
  edit(x, y) {

    //Get data
    const {player, game, tool} = this

    //Clear tool
    if (tool === editingTools.CLEAR) {

      //Erase markup first
      if (game.hasMarkup(x, y)) {
        this.removeMarkup(x, y)
        player.processPosition()
        return
      }

      //Erase stone otherwise
      else if (game.hasStone(x, y)) {
        this.removeStone(x, y)
        player.processPosition()
        return
      }

      //Nothing here
      return
    }

    //Get markup type and color
    const type = this.getEditingMarkupType()
    const color = this.getEditingColor()

    //Set markup type
    if (type) {

      //Debug
      this.debug(`setting 🔵 ${type} markup at (${x},${y})`)

      //Already markup in place? Remove it first
      //If it is the same type we're adding, we're done
      if (game.hasMarkup(x, y)) {
        const removed = this.removeMarkup(x, y)
        if (removed.type === type) {
          player.processPosition()
          return
        }
      }

      //Add markup
      this.addMarkup(x, y, type)
    }

    //Set stone
    else if (color) {

      //Debug
      this.debug(
        `setting ${color === stoneColors.WHITE ? '⚪️' : '⚫️'} stone at (${x},${y})`,
      )

      //Stone already in place of this same color
      if (game.hasStone(x, y, color)) {
        this.debug(`already have ${color} stone at (${x},${y})`)
        return
      }

      //Remove existing stone and add new styone
      this.removeStone(x, y)
      this.addStone(x, y, color)
    }

    //Process position
    player.processPosition()
  }

  /**
   * Helper to remove markup
   */
  removeMarkup(x, y) {

    //Get data
    const {game} = this
    if (!game.hasMarkup(x, y)) {
      return
    }

    //Check what markup there is
    const markup = game.getMarkup(x, y)
    const {text} = markup

    //Remove used markup label
    this.removeUsedMarkupLabel(text)

    //Remove markup and return removed markup
    game.removeMarkup(x, y)
    return markup
  }

  /**
   * Helper to remove a stone
   */
  removeStone(x, y) {
    const {game} = this
    if (game.hasStone(x, y)) {
      game.removeStone(x, y)
    }
  }

  /**
   * Helper to add markup
   */
  addMarkup(x, y, type) {
    const {game} = this
    const text = this.getText()
    game.addMarkup(x, y, {type, text})
    this.addUsedMarkupLabel(text)
  }

  /**
   * Helper to add a stone
   */
  addStone(x, y, color) {
    const {game} = this
    game.addStone(x, y, color)
  }

  /**
   * Switch editing tool to use
   */
  useEditingTool(tool) {
    this.tool = tool
    this.debug(`🪛 ${tool} tool activated`)
    this.showHoverMarkup()
    this.showHoverStone()
  }

  /**
   * Show hover stone
   */
  showHoverStone() {

    //Check if anything to do
    const {currentHoverGrid} = this
    if (!currentHoverGrid) {
      return
    }

    //Get data
    const {x, y} = currentHoverGrid
    const color = this.getEditingColor()
    if (!color) {
      return
    }

    //Parent method
    super.showHoverStone(x, y, color)
  }

  /**
   * Show hover markup
   */
  showHoverMarkup() {

    //Check if anything to do
    const {currentHoverGrid} = this
    if (!currentHoverGrid) {
      return
    }

    //Get details
    const {x, y} = currentHoverGrid
    const type = this.getEditingMarkupType()
    const text = this.getText()
    if (!type) {
      return
    }

    //Parent method
    super.showHoverMarkup(x, y, type, text)
  }

  /**************************************************************************
   * Helpers
   ***/

  /**
   * Get text for markup
   */
  getText() {
    const {tool} = this
    if (tool === editingTools.LETTER) {
      return this.getNextLetter()
    }
    else if (tool === editingTools.NUMBER) {
      return this.getNextNumber()
    }
  }

  /**
   * Determine the next letter for markup label text
   */
  getNextLetter() {

    //Get data
    const {usedMarkupLabels} = this

    //Initialise
    let i = 0
    let text = ''

    //Loop while the label is present
    while (!text || usedMarkupLabels.includes(text)) {

      //A-Z
      if (i < 26) {
        text = String.fromCharCode(aCharUc + i)
      }

      //a-z
      else if (i < 52) {
        text = String.fromCharCode(aCharLc + i - 26)
      }

      //AA, AB, AC, etc.
      else {
        text = String.fromCharCode(aCharUc + Math.floor(i / 26) - 2) +
          String.fromCharCode(aCharUc + (i % 26))
      }

      //Keep going
      i++
    }

    //Return text
    return text
  }

  /**
   * Determine the next number for markup label text
   */
  getNextNumber() {

    //Get data
    const {usedMarkupLabels} = this

    //Initialise
    let num = 0
    let text = ''

    //Loop while the label is present
    while (text === '' || usedMarkupLabels.includes(text)) {
      num++
      text = String(num)
    }

    //Return
    return text
  }

  /**
   * Add used markup label
   */
  addUsedMarkupLabel(text) {
    if (text) {
      this.usedMarkupLabels.push(text)
    }
  }

  /**
   * Remove used markup label
   */
  removeUsedMarkupLabel(text) {
    if (!text) {
      return
    }
    const {usedMarkupLabels} = this
    const i = usedMarkupLabels.indexOf(text)
    if (i !== -1) {
      usedMarkupLabels.splice(i, 1)
    }
  }

  /**
   * Find all the used markup labels in current position
   */
  findUsedMarkupLabels() {

    //Get data
    const {game, usedMarkupLabels} = this
    const markup = game.position.markup.getAll()

    //Filter function
    const isLabel = (entry) =>
      entry.value.type === markupTypes.LABEL &&
      entry.value.text

    //Loop
    markup
      .filter(isLabel)
      .forEach(item => usedMarkupLabels.push(item.value.text))
  }

  /**
   * Reset used markup labels
   */
  resetUsedMarkupLabels() {
    this.usedMarkupLabels = []
  }

  /**
   * Get stone color for a given editing tool
   */
  getEditingColor() {
    const {tool} = this
    if (tool === editingTools.BLACK) {
      return stoneColors.BLACK
    }
    else if (tool === editingTools.WHITE) {
      return stoneColors.WHITE
    }
  }

  /**
   * Get markup type for a given editing tool
   */
  getEditingMarkupType() {
    const {tool} = this
    const label = [
      editingTools.LETTER,
      editingTools.NUMBER,
    ]
    if (label.includes(tool)) {
      return markupTypes.LABEL
    }
    else if (Object.values(markupTypes).includes(tool)) {
      return tool
    }
  }
}
