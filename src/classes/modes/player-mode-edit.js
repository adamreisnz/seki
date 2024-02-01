import PlayerModeReplay from './player-mode-replay.js'
import {randomInt, getPixelRatio} from '../../helpers/util.js'
import {aCharUc, aCharLc} from '../../constants/util.js'
import {markupTypes} from '../../constants/markup.js'
import {stoneColors} from '../../constants/stone.js'
import {
  playerModes,
  playerActions,
  editTools,
} from '../../constants/player.js'

/**
 * This mode lets you edit a single position
 */
export default class PlayerModeEdit extends PlayerModeReplay {

  //Mode type
  mode = playerModes.EDIT

  //Set default editing tool
  tool = editTools.MOVE

  //Used markup labels
  usedMarkupLabels = []

  //Track current and last gird event detail
  currentGridDetail
  lastGridDetail
  lastEditedGridDetail

  //Track last free draw coordinates
  lastFreeDrawX = null
  lastFreeDrawY = null

  //Line tracking (for throttling)
  linesAdded = []
  lineAddTimeout = null

  /**
   * Initialise
   */
  init() {

    //Extend player
    this.extendPlayer()

    //Create bound event listeners
    this.createBoundListeners({
      keydown: 'onKeyDown',
      click: 'onClick',
      wheel: 'onMouseWheel',
      config: 'onConfigChange',
      pathChange: 'onPathChange',
      variationChange: 'onVariationChange',
      gameLoad: 'onGameLoad',
      mousemove: 'onMouseMove',
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
    player.extend('getEditTool', mode)
    player.extend('setEditTool', mode)
    player.extend('removeAllMarkup', mode)
    player.extend('removeAllLines', mode)
    player.extend('processEdit', mode)
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
    const {player, board} = this

    //Re-apply focus on player
    player.elements.container.focus()

    //Stop free draw
    if (this.isUsingDrawTool()) {
      this.stopFreeDraw()
      return
    }

    //Only process if valid coordinates
    if (!this.hasValidCoordinates(event)) {
      return
    }

    //Only process if not same grid detail as last time
    if (this.isLastEditedGridDetail(event)) {
      return
    }

    //Clear hover layer
    board.clearHoverLayer()
    this.edit(event)
  }

  /**
   * Mouse move handler
   */
  onMouseMove(event) {

    //Get data
    const {player, board} = this
    const {nativeEvent, isDragging} = event.detail

    //Only process if dragging and using free draw tool
    if (!isDragging || !this.isUsingDrawTool()) {
      return
    }

    //Re-apply focus on player
    player.elements.container.focus()

    //Free draw
    const {offsetX, offsetY} = nativeEvent
    const pixelRatio = getPixelRatio()

    //Apply pixel ratio factor
    const absX = offsetX * pixelRatio
    const absY = offsetY * pixelRatio

    //Get un-rounded board grid coordinates
    const x = board.getGridX(absX, false)
    const y = board.getGridY(absY, false)

    //Get last coordinates
    const {lastFreeDrawX, lastFreeDrawY} = this

    //Update last coordinates
    this.lastFreeDrawX = x
    this.lastFreeDrawY = y

    //Must have had previous coordinates to be able to draw
    if (lastFreeDrawX === null || lastFreeDrawY === null) {
      return
    }

    //Add line
    this.addLine(lastFreeDrawX, lastFreeDrawY, x, y)
  }

  /**
   * On grid enter
   */
  onGridEnter(event) {

    //Update grid detail
    this.lastGridDetail = this.currentGridDetail
    this.currentGridDetail = event.detail

    //Get event data
    const {isDragging} = event.detail

    //Check if valid coordinates
    if (!this.hasValidCoordinates(event)) {
      return
    }

    //Show eraser always
    this.showHoverEraser()

    //Dragging?
    if (isDragging) {

      //Move tool, action will be handled by the click handler
      //Just display the hover stone though
      if (this.isUsingMoveTool()) {
        this.showHoverStone()
        return
      }

      //Draw tool, action will be handled by the mouse move handler
      if (this.isUsingDrawTool()) {
        return
      }

      //Store last edited grid detail. This is to prevent the click event
      //from double triggering the edit event when it fires on the same cell
      this.lastEditedGridDetail = event.detail

      //Use edit tool
      this.edit(event)
      return
    }

    //Otherwise, show hover stuff
    this.showHoverMarkup()
    this.showHoverStone()
  }

  /**
   * On grid leave
   */
  onGridLeave(event) {

    //Check if valid coordinates
    if (!this.hasValidCoordinates(event)) {
      return
    }

    //Get data
    const {board} = this
    const {x, y} = event.detail

    //Clear current grid detail
    this.currentGridDetail = null

    //Using stone or move tool? Clear whole layer
    if (this.isUsingStoneTool() || this.isUsingMoveTool()) {
      board.clearHoverLayer()
    }

    //If markup tool, clear cell to properly redraw grid
    else if (this.isUsingMarkupTool() || this.isUsingClearTool()) {
      board.clearHoverCell(x, y)
    }
  }

  /**************************************************************************
   * Actions
   ***/

  /**
   * Process an action
   */
  processAction(action, event) {

    //Parent method
    if (super.processAction(action, event)) {
      return true
    }

    //Get data
    const {player} = this

    //Determine action
    switch (action) {

      //Edit tools
      case playerActions.SET_EDIT_TOOL_MOVE:
        player.setEditTool(editTools.MOVE)
        return true
      case playerActions.SET_EDIT_TOOL_STONE:
        player.setEditTool(editTools.STONE)
        return true
      case playerActions.SET_EDIT_TOOL_BLACK:
        player.setEditTool(editTools.BLACK)
        return true
      case playerActions.SET_EDIT_TOOL_WHITE:
        player.setEditTool(editTools.WHITE)
        return true
      case playerActions.SET_EDIT_TOOL_CLEAR:
        player.setEditTool(editTools.CLEAR)
        return true
      case playerActions.SET_EDIT_TOOL_CLEAR_AREA:
        player.setEditTool(editTools.CLEAR_AREA)
        return true
      case playerActions.SET_EDIT_TOOL_TRIANGLE:
        player.setEditTool(editTools.TRIANGLE)
        return true
      case playerActions.SET_EDIT_TOOL_CIRCLE:
        player.setEditTool(editTools.CIRCLE)
        return true
      case playerActions.SET_EDIT_TOOL_SQUARE:
        player.setEditTool(editTools.SQUARE)
        return true
      case playerActions.SET_EDIT_TOOL_DIAMOND:
        player.setEditTool(editTools.DIAMOND)
        return true
      case playerActions.SET_EDIT_TOOL_MARK:
        player.setEditTool(editTools.MARK)
        return true
      case playerActions.SET_EDIT_TOOL_HAPPY:
        player.setEditTool(editTools.HAPPY)
        return true
      case playerActions.SET_EDIT_TOOL_SAD:
        player.setEditTool(editTools.SAD)
        return true
      case playerActions.SET_EDIT_TOOL_LETTER:
        player.setEditTool(editTools.LETTER)
        return true
      case playerActions.SET_EDIT_TOOL_NUMBER:
        player.setEditTool(editTools.NUMBER)
        return true
      case playerActions.SET_EDIT_TOOL_DRAW:
        player.setEditTool(editTools.DRAW)
        return true
      case playerActions.REMOVE_ALL_MARKUP:
        player.removeAllMarkup()
        return true
      case playerActions.REMOVE_ALL_LINES:
        player.removeAllLines()
        return true
    }

    //No action was performed
    return false
  }

  /**
   * Process an edit
   *
   * This is compatible with the data emitted by the edited event and can be
   * used to synchronise multiple instances of the same game.
   */
  processEdit(action, args) {

    //Validate action (maps to method name)
    const {player} = this
    const validActions = [
      'addLine',
      'addLines',
      'addStone',
      'addMarkup',
      'removeStone',
      'removeMarkup',
      'removeAllMarkup',
      'removeAllLines',
    ]

    //Invalid action
    if (!validActions.includes(action)) {
      throw new Error(`Invalid edit action: ${action}`)
    }

    //Process
    this.supressEditEvent = true
    this[action](...args)
    this.supressEditEvent = false

    //Free draw event, done, as this is drawn directly onto the board
    if (action === 'addLine' || action === 'addLines') {
      return
    }

    //Update board position and render markers
    player.updateBoardPosition()
    this.renderMarkers()
  }

  /**
   * Edit a position
   */
  edit(event) {

    //Check if valid coordinates
    if (!this.hasValidCoordinates(event)) {
      return
    }

    //Get data
    const {player, game} = this
    const {x, y, area, isDragging} = event.detail

    //Move tool
    if (this.isUsingMoveTool()) {
      if (!isDragging) {
        player.playMove(x, y)
      }
      return //Return to preserve move markers
    }

    //Clear tool
    else if (this.isUsingClearTool()) {
      this.eraseCell(x, y)
      this.showHoverEraser()
    }

    //Clear area tool
    else if (this.isUsingClearAreaTool()) {
      this.eraseArea(area)
      // this.showHoverEraser()
    }

    //Markup tool
    else if (this.isUsingMarkupTool()) {

      //Get markup data
      const type = this.getEditingMarkupType()
      const text = this.getText()

      //If not dragging, check if there's an existing markup of same type
      //In that case, removal is enough
      if (!isDragging && game.hasMarkup(x, y, type)) {
        this.removeMarkup(x, y)
      }
      else {
        this.removeMarkup(x, y)
        this.addMarkup(x, y, type, text)
      }
    }

    //Stone tool
    else if (this.isUsingStoneTool()) {

      //Get color
      const color = this.getEditingColor()

      //If not dragging, check if there's an existing stone of same color
      //In that case, removal is enough
      if (!isDragging && game.hasStone(x, y, color)) {
        this.removeStone(x, y)
      }
      else {
        this.removeStone(x, y)
        this.addStone(x, y, color)
      }
    }

    //Update board position
    player.updateBoardPosition()
    this.renderMarkers()
  }

  /**
   * Erase cell
   */
  eraseCell(x, y) {

    //Get data
    const {game} = this

    //Erase markup first if it is present
    if (game.hasMarkup(x, y)) {
      this.removeMarkup(x, y)
    }

    //Erase stones otherwise
    else if (game.hasStone(x, y)) {
      this.removeStone(x, y)
    }
  }

  /**
   * Erase area
   */
  eraseArea(area) {

    //Get data
    const {game} = this

    //Loop area, erasing both markup and stones indiscriminantly
    area.forEach(({x, y}) => {
      if (game.hasMarkup(x, y)) {
        this.removeMarkup(x, y)
      }
      if (game.hasStone(x, y)) {
        this.removeStone(x, y)
      }
    })
  }

  /**
   * Add stone
   */
  addStone(x, y, color) {

    //Get data
    const {game} = this

    //Add stone
    game.addStone(x, y, color)

    //Trigger edited event
    this.triggerEditEvent('addStone', x, y, color)
  }

  /**
   * Remove stone
   */
  removeStone(x, y) {

    //Get data
    const {game, board} = this

    //No stone here
    if (!game.hasStone(x, y)) {
      return
    }

    //Remove from game and board
    game.removeStone(x, y)
    board.removeStone(x, y)

    //Trigger edited event
    this.triggerEditEvent('removeStone', x, y)
  }

  /**
   * Helper to add markup
   */
  addMarkup(x, y, type, text) {

    //Get data
    const {game} = this

    //Add new markup
    game.addMarkup(x, y, {type, text})

    //Trigger event
    this.triggerEditEvent('addMarkup', x, y, type, text)
  }

  /**
   * Remove markup
   */
  removeMarkup(x, y) {

    //Get data
    const {game, board} = this

    //No markup here
    if (!game.hasMarkup(x, y)) {
      return
    }

    //Remove from game and board
    game.removeMarkup(x, y)
    board.removeMarkup(x, y)

    //Trigger event
    this.triggerEditEvent('removeMarkup', x, y)
  }

  /**
   * Remove all markup
   */
  removeAllMarkup() {

    //Get data
    const {game, board} = this

    //Remove all markup from game and board
    game.removeAllMarkup()
    board.removeAllMarkup()

    //Re-render markers and trigger event
    this.renderMarkers()
    this.triggerEditEvent('removeAllMarkup')
  }

  /**
   * Remove all free drawn lines
   */
  removeAllLines() {

    //Get board
    const {game, board} = this

    //Remove all lines from game and board
    game.removeAllLines()
    board.removeAllLines()

    //Trigger event
    this.triggerEditEvent('removeAllLines')
  }

  /**
   * Add line or lines
   */
  addLine(fromX, fromY, toX, toY, color) {

    //Process line and trigger event
    this.processLine(fromX, fromY, toX, toY, color)
    this.triggerAddLineEvent(fromX, fromY, toX, toY, color)
  }

  /**
   * Add lines in bulk
   */
  addLines(lines) {

    //Process lines
    for (const line of lines) {
      this.processLine(...line)
    }

    //Trigger bulk add lines event
    this.triggerEditEvent('addLines', lines)
  }

  /**
   * Helper to process a line
   */
  processLine(fromX, fromY, toX, toY, color) {

    //Get data
    const {player, game, board} = this

    //Load color from player config if not given
    if (!color) {
      color = player.getConfig('freeDrawColor')
    }

    //Add to game and draw
    game.addLine(fromX, fromY, toX, toY, color)
    board.drawLine(fromX, fromY, toX, toY, color)
  }

  /**
   * Stop free draw
   */
  stopFreeDraw() {
    this.lastFreeDrawX = null
    this.lastFreeDrawY = null
  }

  /**
   * Trigger free draw event
   */
  triggerAddLineEvent(...args) {

    //Get buffer delay
    const {player} = this
    const delay = player.getConfig('freeDrawEventBufferDelay')

    //If no delay, emit immediately
    if (!delay) {
      this.triggerEditEvent('addLine', ...args)
      return
    }

    //Buffer the event
    this.linesAdded.push(args)

    //Already have a timeout in place
    if (this.lineAddTimeout) {
      return
    }

    //Create timeout
    this.lineAddTimeout = setTimeout(() => {
      this.triggerEditEvent('addLines', this.linesAdded)
      this.lineAddTimeout = null
      this.linesAdded = []
    }, delay)
  }

  /**
   * Get edit tool
   */
  getEditTool() {
    return this.tool
  }

  /**
   * Switch editing tool to use
   */
  setEditTool(tool) {

    //Get data
    const {board, currentGridDetail} = this

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

    //Clear hover layer and redraw grid
    board.clearHoverLayer()

    //Currently over board? Redraw grid cell in case we
    //switched from a markup tool to e.g. stone tool
    if (currentGridDetail) {
      const {x, y} = currentGridDetail
      board.redrawGridCell(x, y)
    }

    //Show hover, in case we're still over the board with mouse and
    //the tool or move color changed via hotkey
    this.showHoverEraser()
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
    const {currentGridDetail, game} = this
    if (!currentGridDetail) {
      return
    }

    //Get coordinates
    const {x, y} = currentGridDetail

    //Move tool
    if (this.isUsingMoveTool()) {

      //Already has any stone
      if (game.hasStone(x, y)) {
        return
      }

      //Get color and create stone
      const color = game.getTurn()
      this.showHoverStoneForColor(x, y, color)
      return
    }

    //Editing, check if valid color and if not have stone of this color
    const color = this.getEditingColor()
    if (!color || game.hasStone(x, y, color)) {
      return
    }

    //Show hover color
    this.showHoverStoneForColor(x, y, color)
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
    const {x, y} = currentGridDetail
    const type = this.getEditingMarkupType()
    const text = this.getText()
    if (!type) {
      return
    }

    //Create markup
    const markup = this.createMarkup(type, {text})

    //Set hover
    board.setHoverCell(x, y, markup)
  }

  /**
   * Show hover eraser
   */
  showHoverEraser() {

    //Check if anything to do
    const {currentGridDetail, board} = this
    if (!currentGridDetail || !this.isUsingClearTool()) {
      return
    }

    //Get details
    const {x, y} = currentGridDetail
    const type = markupTypes.MARK

    //Create markup
    const markup = this.createMarkup(type)

    //Set hover
    board.setHoverCell(x, y, markup)
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

    //Get used labels
    const usedMarkupLabels = this.findUsedMarkupLabels()

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

    //Get used labels
    const usedMarkupLabels = this.findUsedMarkupLabels()

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
   * Find all the used markup labels in current position
   */
  findUsedMarkupLabels() {

    //Get data
    const {game} = this
    const markup = game.position.markup.getAll()

    //Filter function
    const isLabel = (entry) =>
      entry.value.type === markupTypes.LABEL &&
      entry.value.text

    //Loop
    return markup
      .filter(isLabel)
      .map(item => item.value.text)
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
   * Check if using clear tool
   */
  isUsingClearTool() {
    const {tool} = this
    return tool === editTools.CLEAR
  }

  /**
   * Check if using clear area tool
   */
  isUsingClearAreaTool() {
    const {tool} = this
    return tool === editTools.CLEAR_AREA
  }

  /**
   * Check if using draw tool
   */
  isUsingDrawTool() {
    const {tool} = this
    return tool === editTools.DRAW
  }

  /**
   * Check if using move tool
   */
  isUsingMoveTool() {
    const {tool} = this
    return tool === editTools.MOVE
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

  /**
   * Trigger edit event
   */
  triggerEditEvent(action, ...args) {
    if (!this.supressEditEvent) {
      this.player.triggerEvent('edit', {action, args})
    }
  }

  /**
   * Check if event has the same coordinates as last grid detail
   */
  isLastEditedGridDetail(event) {

    //Get last detail
    const {lastEditedGridDetail} = this
    if (!lastEditedGridDetail) {
      return false
    }

    //Reset it for next time
    this.lastEditedGridDetail = null

    //Check detail
    const {x, y} = lastEditedGridDetail
    return (x === event.detail.x && y === event.detail.y)
  }
}
