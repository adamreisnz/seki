import PlayerMode from './player-mode.js'
import {aCharUc, aCharLc} from '../../constants/common.js'
import {markupTypes} from '../../constants/markup.js'
import {stoneColors} from '../../constants/stone.js'
import {boardLayerTypes} from '../../constants/board.js'
import {
  playerActions,
  playerModes,
  editTools,
} from '../../constants/player.js'

/**
 * This mode lets you edit a single position
 */
export default class PlayerModeEdit extends PlayerMode {

  //Mode type
  mode = playerModes.EDIT

  //Set default editing tool
  tool = editTools.STONE

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
    player.extend('setEditTool', mode)
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

    //Set default tool
    this.setEditTool(editTools.STONE)
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
    if (action) {
      this.processAction(action, event)
    }
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

    //Parent method
    if (super.processAction(action, event)) {
      return true
    }

    //Determine action
    switch (action) {
      case playerActions.SET_EDIT_TOOL_STONE:
        this.setEditTool(editTools.STONE)
        return true
      case playerActions.SET_EDIT_TOOL_BLACK:
        this.setEditTool(editTools.BLACK)
        return true
      case playerActions.SET_EDIT_TOOL_WHITE:
        this.setEditTool(editTools.WHITE)
        return true
      case playerActions.SET_EDIT_TOOL_CLEAR:
        this.setEditTool(editTools.CLEAR)
        return true
      case playerActions.SET_EDIT_TOOL_TRIANGLE:
        this.setEditTool(editTools.TRIANGLE)
        return true
      case playerActions.SET_EDIT_TOOL_CIRCLE:
        this.setEditTool(editTools.CIRCLE)
        return true
      case playerActions.SET_EDIT_TOOL_SQUARE:
        this.setEditTool(editTools.SQUARE)
        return true
      case playerActions.SET_EDIT_TOOL_DIAMOND:
        this.setEditTool(editTools.DIAMOND)
        return true
      case playerActions.SET_EDIT_TOOL_MARK:
        this.setEditTool(editTools.MARK)
        return true
      case playerActions.SET_EDIT_TOOL_HAPPY:
        this.setEditTool(editTools.HAPPY)
        return true
      case playerActions.SET_EDIT_TOOL_SAD:
        this.setEditTool(editTools.SAD)
        return true
      case playerActions.SET_EDIT_TOOL_LETTER:
        this.setEditTool(editTools.LETTER)
        return true
      case playerActions.SET_EDIT_TOOL_NUMBER:
        this.setEditTool(editTools.NUMBER)
        return true
    }

    //No action was performed
    return false
  }

  /**
   * Edit a position
   */
  edit(x, y) {

    //Get data
    const {player, game, tool} = this

    //Clear tool
    if (tool === editTools.CLEAR) {

      //Erase markup first
      if (game.hasMarkup(x, y)) {
        this.removeMarkup(x, y)
        this.redrawGridCell(x, y)
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
    const {game, board} = this
    if (!game.hasMarkup(x, y)) {
      return
    }

    //Check what markup there is
    const markup = game.getMarkup(x, y)
    const {text} = markup

    //Remove used markup label
    this.removeUsedMarkupLabel(text)

    //Remove markup from game and board and return removed markup
    game.removeMarkup(x, y)
    board
      .getLayer(boardLayerTypes.MARKUP)
      .remove(x, y)

    //Return removed markup
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
  setEditTool(tool) {

    //Special stone tool case
    if (tool === editTools.STONE) {
      if (this.tool === editTools.BLACK) {
        this.tool = editTools.WHITE
      }
      else {
        this.tool = editTools.BLACK
      }
    }
    else {
      this.tool = tool
    }

    //Set tool
    this.debug(`🪛 ${tool} tool activated`)

    //Show hover
    this.showHoverMarkup()
    this.showHoverStone()

    //Trigger event
    this.player.triggerEvent('editToolChange', {tool})
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
    if (tool === editTools.LETTER) {
      return this.getNextLetter()
    }
    else if (tool === editTools.NUMBER) {
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
    if (tool === editTools.BLACK) {
      return stoneColors.BLACK
    }
    else if (tool === editTools.WHITE) {
      return stoneColors.WHITE
    }
  }

  /**
   * Get markup type for a given editing tool
   */
  getEditingMarkupType() {
    const {tool} = this
    const label = [
      editTools.LETTER,
      editTools.NUMBER,
    ]
    if (label.includes(tool)) {
      return markupTypes.LABEL
    }
    else if (Object.values(markupTypes).includes(tool)) {
      return tool
    }
  }
}
