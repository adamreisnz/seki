import PlayerMode from './player-mode.js'
import {aCharUc, aCharLc} from '../../constants/util.js'
import {markupTypes} from '../../constants/markup.js'
import {stoneColors} from '../../constants/stone.js'
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
  tool = null

  //Used markup labels
  usedMarkupLabels = []

  //Track current and last gird event detail
  currentGridDetail
  lastGridDetail

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
    player.extend('removeAllMarkup', mode)
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

  /**
   * Deactivate this mode
   */
  deactivate() {

    //Parent method
    super.deactivate()

    //Clear edit tool
    this.setEditTool(null)
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
    const {nativeEvent} = event.detail
    const action = player.getActionForKeyDownEvent(nativeEvent)

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
    const {area} = event.detail

    //Clear hover layer and edit area
    board.clearHoverLayer()
    this.edit(area)
  }

  /**
   * On grid enter
   */
  onGridEnter(event) {

    //Update grid detail
    this.lastGridDetail = this.currentGridDetail
    this.currentGridDetail = event.detail

    //Show hover markup or stone
    this.showHoverMarkup()
    this.showHoverStone()
  }

  /**
   * On grid leave
   */
  onGridLeave(event) {

    //Get data
    const {board} = this
    const {area} = event.detail

    //Clear current grid detail
    this.currentGridDetail = null

    //Using stone tool? Clear whole layer
    if (this.isUsingStoneTool()) {
      board.clearHoverLayer()
    }

    //If markup tool, clear area to properly redraw grid
    else {
      board.clearHoverArea(area)
    }
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
      case playerActions.REMOVE_ALL_MARKUP:
        this.removeAllMarkup()
        return true
    }

    //No action was performed
    return false
  }

  /**
   * Edit a position
   */
  edit(area) {

    //Get data
    const {player} = this

    //Get markup type and color
    const type = this.getEditingMarkupType()
    const color = this.getEditingColor()

    //Clear tool
    if (this.isUsingClearTool()) {
      this.eraseArea(area)
    }

    //Markup tool
    else if (this.isUsingMarkupTool()) {
      this.addMarkupToArea(area, type)
    }

    //Stone tool
    else if (this.isUsingStoneTool()) {
      this.addStonesToArea(area, color)
    }

    //Process position
    player.processPosition()
  }

  /**
   * Erase an area
   */
  eraseArea(area) {

    //Get data
    const {game, player} = this

    //Erase markup first if it is present
    if (game.hasMarkupInArea(area)) {
      this.removeMarkupFromArea(area)
      player.processPosition()
      return
    }

    //Erase stones otherwise
    else if (game.hasStonesInArea(area)) {
      this.removeStonesFromArea(area)
      player.processPosition()
      return
    }
  }

  /**
   * Add markup to area
   */
  addMarkupToArea(area, type) {

    //Check if dragging
    const {game} = this
    const isDrag = (area.length > 1)

    //Single spot, remove if the same markup is already there
    if (!isDrag) {
      const {x, y} = area[0]
      const existing = game.getMarkup(x, y)
      if (existing && existing.type === type) {
        this.removeMarkupFromArea(area)
        return
      }
    }

    //Remove all existing
    this.removeMarkupFromArea(area)

    //Add markup to area
    for (const {x, y} of area) {
      this.addMarkup(x, y, type)
    }
  }

  /**
   * Add stones to area
   */
  addStonesToArea(area, color) {

    //Check if dragging
    const {game} = this
    const isDrag = (area.length > 1)

    //Single spot, remove if the same markup is already there
    if (!isDrag) {
      const {x, y} = area[0]
      const existing = game.getStone(x, y)
      if (existing && existing.color === color) {
        this.removeStonesFromArea(area)
        return
      }
    }

    //Remove all existing
    this.removeStonesFromArea(area)

    //Add stones to area
    for (const {x, y} of area) {
      this.addStone(x, y, color)
    }
  }

  /**
   * Remove all markup
   */
  removeAllMarkup() {

    //Get data
    const {board, game} = this

    //Reset used markup labels
    this.resetUsedMarkupLabels()

    //Remove all from game and board
    game.removeAllMarkup()
    board.removeAllMarkup()
  }

  /**
   * Helper to remove markup from an area
   */
  removeMarkupFromArea(area) {

    //Get data
    const {game, board} = this

    //Get markup labels
    const labels = area
      .filter(({x, y}) => game.hasMarkup(x, y))
      .map(({x, y}) => game.getMarkup(x, y))
      .map(markup => markup.text)

    //Remove used markup labels
    this.removeUsedMarkupLabel(labels)

    //Remove markup from game and board
    game.removeMarkupFromArea(area)
    board.removeMarkupFromArea(area)
  }

  /**
   * Helper to remove stones from an area
   */
  removeStonesFromArea(area) {

    //Get data
    const {game, board} = this

    //Remove stones from game and board
    game.removeStonesFromArea(area)
    board.removeStonesFromArea(area)
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

    //Show hover, in case we're still over the board with mouse and
    //the tool changed via hotkey
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
    const {currentGridDetail, board} = this
    if (!currentGridDetail) {
      return
    }

    //Get data
    const {area} = currentGridDetail
    const color = this.getEditingColor()
    if (!color) {
      return
    }

    //Create hover stone
    const stone = this.createHoverStone(color)

    //Set hover area
    board.setHoverArea(area, stone)
  }

  /**
   * Show hover markup
   */
  showHoverMarkup() {

    //Check if anything to do
    const {currentGridDetail, board} = this
    if (!currentGridDetail) {
      return
    }

    //Get details
    const {area} = currentGridDetail
    const type = this.getEditingMarkupType()
    const text = this.getText()
    if (!type) {
      return
    }

    //Create markup
    const markup = this.createMarkup(type, {text})

    //Set on hover area
    board.setHoverArea(area, markup)
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
    if (Array.isArray(text)) {
      text.forEach(label => this.removeUsedMarkupLabel(label))
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
   * Check if using markup tool
   */
  isUsingMarkupTool() {
    const {tool} = this
    return [
      editTools.TRIANGLE,
      editTools.CIRCLE,
      editTools.SQUARE,
      editTools.ARROW,
      editTools.DIAMOND,
      editTools.MARK,
      editTools.SELECT,
      editTools.HAPPY,
      editTools.SAD,
      editTools.LETTER,
      editTools.NUMBER,
    ].includes(tool)
  }

  /**
   * Check if using stone tool
   */
  isUsingStoneTool() {
    const {tool} = this
    return [
      editTools.BLACK,
      editTools.WHITE,
    ].includes(tool)
  }

  /**
   * Check if using clear
   */
  isUsingClearTool() {
    const {tool} = this
    return tool === editTools.CLEAR
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
