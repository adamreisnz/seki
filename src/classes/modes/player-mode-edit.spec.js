import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest'
import Player from '../player.js'
import {boardLayerTypes} from '../../constants/board.js'
import {markupTypes} from '../../constants/markup.js'
import {stoneColors} from '../../constants/stone.js'
import {
  playerModes,
  playerActions,
  editTools
} from '../../constants/player.js'

const {BLACK, WHITE} = stoneColors

//Free draw and the pixel to grid conversion both read the device pixel ratio
//off the window, which isn't there outside a browser
beforeEach(() => {
  vi.stubGlobal('window', {devicePixelRatio: 1})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

//A nine by nine game with two moves on it, small enough to keep the
//coordinates in the expectations below readable
const sgf = '(;GM[1]FF[4]SZ[9];B[cc];W[gg])'

/**
 * A player sitting in edit mode on a loaded record
 *
 * The layers are created and the board given a draw size, which is normally
 * the bootstrap's job and needs a document. Neither paints anything without a
 * canvas context, but both are what the grid bookkeeping and the pixel to
 * intersection conversion are driven off.
 */
const createPlayer = (data = sgf, config = {}) => {

  //Create player in edit mode
  const player = new Player({
    initialMode: playerModes.EDIT,
    board: {showCoordinates: false},
    ...config,
  })

  //Bring up the board and load the record
  player.board.createLayers()
  player.board.setDrawSize(600, 600)
  player.loadData(data)

  //The click handler puts focus back on the container, which only exists
  //once the player has been bootstrapped onto an element
  player.elements.container = {focus: vi.fn()}

  //Return player and its mode handler
  return {player, mode: player.getModeHandler(playerModes.EDIT)}
}

/**
 * Build the detail of a grid event for a single intersection
 */
const at = (x, y, extra = {}) => ({detail: {x, y, area: [{x, y}], ...extra}})

/**
 * Build the detail of a mouse move over the pixel an intersection sits at
 */
const moveTo = (board, x, y, isDragging = true) => ({
  detail: {
    isDragging,
    nativeEvent: {
      offsetX: board.getAbsX(x),
      offsetY: board.getAbsY(y),
    },
  },
})

describe('Edit mode teardown', () => {

  let player
  let edit

  beforeEach(() => {
    vi.useFakeTimers()
    player = new Player()
    edit = player.getModeHandler(playerModes.EDIT)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('flushes buffered free draw lines rather than dropping them', () => {
    const listener = vi.fn()
    player.on('edit', listener)

    edit.triggerAddLineEvent(0, 0, 1, 1, '#fff')
    expect(listener).not.toHaveBeenCalled()

    edit.teardown()
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0][0].detail.action).toBe('addLines')
  })

  it('clears the buffer timeout', () => {
    edit.triggerAddLineEvent(0, 0, 1, 1, '#fff')
    expect(vi.getTimerCount()).toBe(1)

    edit.teardown()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does nothing when there is nothing buffered', () => {
    expect(() => edit.teardown()).not.toThrow()
  })

  it('drops the buffer when the player is the one being torn down', () => {

    //NOTE: pinning current behaviour, which is not what the flush above is
    //for. The player flags itself as torn down before it reaches its mode
    //handlers, and triggerEvent() on a torn down player is a no-op, so the
    //flush runs but the event it emits goes nowhere. The buffered lines are
    //lost exactly the way tearing down mid-stroke was meant to stop.
    const listener = vi.fn()
    player.on('edit', listener)
    edit.triggerAddLineEvent(0, 0, 1, 1, '#fff')

    player.teardown()
    expect(listener).not.toHaveBeenCalled()
  })
})

describe('Edit mode tool selection', () => {

  it('starts on the move tool', () => {
    const {player} = createPlayer()
    expect(player.getEditTool()).toBe(editTools.MOVE)
  })

  it('switches to the tool it is given', () => {
    const {player} = createPlayer()
    player.setEditTool(editTools.TRIANGLE)

    expect(player.getEditTool()).toBe(editTools.TRIANGLE)
  })

  it('reads the stone tool as black to start with', () => {

    //The stone tool is a toggle rather than a tool of its own, so asking for
    //it from anywhere but black lands on black
    const {player} = createPlayer()
    player.setEditTool(editTools.STONE)

    expect(player.getEditTool()).toBe(editTools.BLACK)
  })

  it('flips the stone tool from black to white', () => {
    const {player} = createPlayer()
    player.setEditTool(editTools.BLACK)
    player.setEditTool(editTools.STONE)

    expect(player.getEditTool()).toBe(editTools.WHITE)
  })

  it('flips the stone tool back from white to black', () => {
    const {player} = createPlayer()
    player.setEditTool(editTools.WHITE)
    player.setEditTool(editTools.STONE)

    expect(player.getEditTool()).toBe(editTools.BLACK)
  })

  it('announces the tool change', () => {
    const {player} = createPlayer()
    const listener = vi.fn()
    player.on('editToolChange', listener)

    player.setEditTool(editTools.CIRCLE)
    expect(listener.mock.calls[0][0].detail).toEqual({tool: editTools.CIRCLE})
  })

  it('announces the stone toggle as the stone tool, not the colour it landed on', () => {

    //NOTE: pinning current behaviour. The event carries the tool that was
    //asked for rather than this.tool, so a toolbar listening to it to light
    //up the active tool is told 'stone' when the tool is now black.
    const {player} = createPlayer()
    const listener = vi.fn()
    player.on('editToolChange', listener)

    player.setEditTool(editTools.STONE)
    expect(player.getEditTool()).toBe(editTools.BLACK)
    expect(listener.mock.calls[0][0].detail).toEqual({tool: editTools.STONE})
  })

  it('clears the hover layer on every switch', () => {
    const {player} = createPlayer()
    const spy = vi.spyOn(player.board, 'clearHoverLayer')

    player.setEditTool(editTools.SQUARE)
    expect(spy).toHaveBeenCalled()
  })

  it('leaves the grid alone when the mouse is off the board', () => {
    const {player} = createPlayer()
    const spy = vi.spyOn(player.board, 'redrawGridCell')

    player.setEditTool(editTools.SQUARE)
    expect(spy).not.toHaveBeenCalled()
  })

  it('redraws the cell under the cursor when the mouse is on the board', () => {

    //Switching from a markup tool to a stone tool leaves the markup hover
    //behind on that cell, so the grid underneath it has to be repainted
    const {player} = createPlayer()
    player.triggerEvent('gridEnter', {x: 3, y: 3, isDragging: false})

    const spy = vi.spyOn(player.board, 'redrawGridCell')
    player.setEditTool(editTools.BLACK)

    expect(spy).toHaveBeenCalledWith(3, 3)
  })

  it('shows the hover for the new tool straight away', () => {

    //The tool can change by hotkey while the mouse is sitting still, so the
    //hover has to be redrawn rather than waiting for the next grid entry
    const {player, mode} = createPlayer()
    player.triggerEvent('gridEnter', {x: 3, y: 3, isDragging: false})
    player.setEditTool(editTools.SQUARE)

    expect(mode.board.get(boardLayerTypes.HOVER, 3, 3).type)
      .toBe(markupTypes.SQUARE)
  })
})

describe('Edit mode tool predicates', () => {

  let mode

  beforeEach(() => {
    mode = createPlayer().mode
  })

  const toolIs = (tool, predicate) => {
    mode.tool = tool
    return mode[predicate]()
  }

  it('counts every markup type as a markup tool', () => {
    for (const tool of [
      editTools.TRIANGLE, editTools.CIRCLE, editTools.SQUARE, editTools.ARROW,
      editTools.DIAMOND, editTools.MARK, editTools.SELECT, editTools.HAPPY,
      editTools.SAD, editTools.LETTER, editTools.NUMBER,
    ]) {
      expect(toolIs(tool, 'isUsingMarkupTool')).toBe(true)
    }
  })

  it('counts nothing else as a markup tool', () => {
    for (const tool of [
      editTools.MOVE, editTools.BLACK, editTools.WHITE,
      editTools.CLEAR, editTools.CLEAR_AREA, editTools.DRAW,
    ]) {
      expect(toolIs(tool, 'isUsingMarkupTool')).toBe(false)
    }
  })

  it('counts only the two colours as a stone tool', () => {
    expect(toolIs(editTools.BLACK, 'isUsingStoneTool')).toBe(true)
    expect(toolIs(editTools.WHITE, 'isUsingStoneTool')).toBe(true)
    expect(toolIs(editTools.MOVE, 'isUsingStoneTool')).toBe(false)
    expect(toolIs(editTools.CLEAR, 'isUsingStoneTool')).toBe(false)
  })

  it('tells the two clearing tools apart', () => {
    expect(toolIs(editTools.CLEAR, 'isUsingClearTool')).toBe(true)
    expect(toolIs(editTools.CLEAR, 'isUsingClearAreaTool')).toBe(false)
    expect(toolIs(editTools.CLEAR_AREA, 'isUsingClearAreaTool')).toBe(true)
    expect(toolIs(editTools.CLEAR_AREA, 'isUsingClearTool')).toBe(false)
  })

  it('recognises the draw and move tools', () => {
    expect(toolIs(editTools.DRAW, 'isUsingDrawTool')).toBe(true)
    expect(toolIs(editTools.MOVE, 'isUsingDrawTool')).toBe(false)
    expect(toolIs(editTools.MOVE, 'isUsingMoveTool')).toBe(true)
    expect(toolIs(editTools.DRAW, 'isUsingMoveTool')).toBe(false)
  })

  it('gives a colour for the stone tools and nothing for the rest', () => {
    mode.tool = editTools.BLACK
    expect(mode.getEditingColor()).toBe(BLACK)

    mode.tool = editTools.WHITE
    expect(mode.getEditingColor()).toBe(WHITE)

    mode.tool = editTools.MOVE
    expect(mode.getEditingColor()).toBeUndefined()

    mode.tool = editTools.TRIANGLE
    expect(mode.getEditingColor()).toBeUndefined()
  })

  it('maps the label tools onto the label markup type', () => {
    mode.tool = editTools.LETTER
    expect(mode.getEditingMarkupType()).toBe(markupTypes.LABEL)

    mode.tool = editTools.NUMBER
    expect(mode.getEditingMarkupType()).toBe(markupTypes.LABEL)
  })

  it('maps every other markup tool onto itself', () => {
    mode.tool = editTools.TRIANGLE
    expect(mode.getEditingMarkupType()).toBe(markupTypes.TRIANGLE)

    mode.tool = editTools.SELECT
    expect(mode.getEditingMarkupType()).toBe(markupTypes.SELECT)
  })

  it('gives no markup type for the tools that draw none', () => {
    for (const tool of [
      editTools.MOVE, editTools.BLACK, editTools.WHITE,
      editTools.CLEAR, editTools.CLEAR_AREA, editTools.DRAW,
    ]) {
      mode.tool = tool
      expect(mode.getEditingMarkupType()).toBeUndefined()
    }
  })
})

describe('Edit mode keyboard actions', () => {

  //Every action that selects a tool, and the tool it is expected to land on
  const toolActions = [
    [playerActions.SET_EDIT_TOOL_MOVE, editTools.MOVE],
    [playerActions.SET_EDIT_TOOL_BLACK, editTools.BLACK],
    [playerActions.SET_EDIT_TOOL_WHITE, editTools.WHITE],
    [playerActions.SET_EDIT_TOOL_CLEAR, editTools.CLEAR],
    [playerActions.SET_EDIT_TOOL_CLEAR_AREA, editTools.CLEAR_AREA],
    [playerActions.SET_EDIT_TOOL_TRIANGLE, editTools.TRIANGLE],
    [playerActions.SET_EDIT_TOOL_CIRCLE, editTools.CIRCLE],
    [playerActions.SET_EDIT_TOOL_SQUARE, editTools.SQUARE],
    [playerActions.SET_EDIT_TOOL_DIAMOND, editTools.DIAMOND],
    [playerActions.SET_EDIT_TOOL_MARK, editTools.MARK],
    [playerActions.SET_EDIT_TOOL_HAPPY, editTools.HAPPY],
    [playerActions.SET_EDIT_TOOL_SAD, editTools.SAD],
    [playerActions.SET_EDIT_TOOL_LETTER, editTools.LETTER],
    [playerActions.SET_EDIT_TOOL_NUMBER, editTools.NUMBER],
    [playerActions.SET_EDIT_TOOL_DRAW, editTools.DRAW],
  ]

  for (const [action, tool] of toolActions) {
    it(`selects the ${tool} tool for ${action}`, () => {
      const {player, mode} = createPlayer()

      expect(mode.processAction(action)).toBe(true)
      expect(player.getEditTool()).toBe(tool)
    })
  }

  it('toggles the stone colour for the stone tool action', () => {
    const {player, mode} = createPlayer()

    expect(mode.processAction(playerActions.SET_EDIT_TOOL_STONE)).toBe(true)
    expect(player.getEditTool()).toBe(editTools.BLACK)

    mode.processAction(playerActions.SET_EDIT_TOOL_STONE)
    expect(player.getEditTool()).toBe(editTools.WHITE)
  })

  it('clears all markup', () => {
    const {player, mode} = createPlayer()
    mode.addMarkup(1, 1, markupTypes.SQUARE)

    expect(mode.processAction(playerActions.REMOVE_ALL_MARKUP)).toBe(true)
    expect(player.game.hasMarkup(1, 1)).toBe(false)
  })

  it('clears all lines', () => {
    const {player, mode} = createPlayer()
    mode.addLine(0, 0, 1, 1, '#fff')

    expect(mode.processAction(playerActions.REMOVE_ALL_LINES)).toBe(true)
    expect(player.game.getLines()).toHaveLength(0)
  })

  it('hands anything it does not know to the mode it extends', () => {

    //Navigation belongs to replay mode, which edit mode inherits from
    const {player, mode} = createPlayer()

    expect(mode.processAction(playerActions.GO_TO_LAST_POSITION)).toBe(true)
    expect(player.game.getCurrentMoveNumber()).toBe(2)
  })

  it('reports an action nobody handles', () => {
    const {mode} = createPlayer()
    expect(mode.processAction('somethingNobodyDefined')).toBe(false)
  })

  it('runs the bound action for a key that has one', () => {
    const {player} = createPlayer(sgf, {
      keyBindings: [
        {key: 'ArrowRight', action: playerActions.GO_TO_NEXT_POSITION},
      ],
    })

    player.triggerEvent('keydown', {
      nativeEvent: {
        key: 'ArrowRight',
        ctrlKey: false, shiftKey: false, altKey: false, metaKey: false,
        preventDefault: vi.fn(),
      },
    })

    expect(player.game.getCurrentMoveNumber()).toBe(1)
  })

  it('does nothing for a key that has none', () => {

    //Bound alongside a key that does have an action, so this pins the lookup
    //missing rather than there being nothing to look up
    const {player, mode} = createPlayer(sgf, {
      keyBindings: [
        {key: 'ArrowRight', action: playerActions.GO_TO_NEXT_POSITION},
      ],
    })
    const spy = vi.spyOn(mode, 'processAction')

    player.triggerEvent('keydown', {
      nativeEvent: {
        key: 'q',
        ctrlKey: false, shiftKey: false, altKey: false, metaKey: false,
        preventDefault: vi.fn(),
      },
    })

    expect(spy).not.toHaveBeenCalled()
    expect(player.game.getCurrentMoveNumber()).toBe(0)
  })
})

describe('Edit mode stone editing', () => {

  it('places a stone of the tool colour', () => {
    const {player, mode} = createPlayer()
    player.setEditTool(editTools.BLACK)
    mode.edit(at(4, 4))

    expect(player.game.hasStone(4, 4, BLACK)).toBe(true)
    expect(player.board.get(boardLayerTypes.STONES, 4, 4)).toBeTruthy()
  })

  it('places the other colour for the white tool', () => {
    const {player, mode} = createPlayer()
    player.setEditTool(editTools.WHITE)
    mode.edit(at(4, 4))

    expect(player.game.hasStone(4, 4, WHITE)).toBe(true)
  })

  it('takes the stone off again when the same colour is clicked twice', () => {
    const {player, mode} = createPlayer()
    player.setEditTool(editTools.BLACK)
    mode.edit(at(4, 4))
    mode.edit(at(4, 4))

    expect(player.game.hasStone(4, 4)).toBe(false)
  })

  it('replaces a stone of the other colour rather than clearing it', () => {
    const {player, mode} = createPlayer()
    player.setEditTool(editTools.BLACK)
    mode.edit(at(4, 4))

    player.setEditTool(editTools.WHITE)
    mode.edit(at(4, 4))

    expect(player.game.hasStone(4, 4, WHITE)).toBe(true)
  })

  it('keeps painting the same colour while dragging over a placed stone', () => {

    //The removal shortcut is deliberately off while dragging, so dragging
    //back over what was just painted doesn't rub it out again
    const {player, mode} = createPlayer()
    player.setEditTool(editTools.BLACK)
    mode.edit(at(4, 4, {isDragging: true}))
    mode.edit(at(4, 4, {isDragging: true}))

    expect(player.game.hasStone(4, 4, BLACK)).toBe(true)
  })

  it('emits what it did so another instance can follow along', () => {
    const {player, mode} = createPlayer()
    const listener = vi.fn()
    player.on('edit', listener)

    player.setEditTool(editTools.BLACK)
    mode.edit(at(4, 4))

    expect(listener.mock.calls[0][0].detail)
      .toEqual({action: 'addStone', args: [4, 4, BLACK]})
  })

  it('takes a removed stone off the board as well as out of the record', () => {
    const {player, mode} = createPlayer()
    mode.addStone(4, 4, BLACK)
    player.updateBoardPosition()

    mode.removeStone(4, 4)
    expect(player.board.get(boardLayerTypes.STONES, 4, 4)).toBeUndefined()
  })

  it('says nothing about removing a stone that was never there', () => {
    const {player, mode} = createPlayer()
    const listener = vi.fn()
    player.on('edit', listener)

    mode.removeStone(4, 4)
    expect(listener).not.toHaveBeenCalled()
  })

  it('announces a stone the game refused to place', () => {

    //NOTE: pinning current behaviour. The game rejects a colour it doesn't
    //know and leaves the position alone, but the mode emits the event
    //regardless, so a peer instance is told about a stone that isn't there.
    const {player, mode} = createPlayer()
    const listener = vi.fn()
    player.on('edit', listener)

    mode.addStone(4, 4, 'purple')
    expect(player.game.hasStone(4, 4)).toBe(false)
    expect(listener).toHaveBeenCalledTimes(1)
  })
})

describe('Edit mode markup editing', () => {

  //The markup tools that map straight onto a markup type
  const shapes = [
    editTools.TRIANGLE,
    editTools.CIRCLE,
    editTools.SQUARE,
    editTools.DIAMOND,
    editTools.MARK,
    editTools.HAPPY,
    editTools.SAD,
    editTools.SELECT,
  ]

  for (const tool of shapes) {
    it(`draws ${tool} markup where it is clicked`, () => {
      const {player, mode} = createPlayer()
      player.setEditTool(tool)
      mode.edit(at(4, 4))

      expect(player.game.hasMarkup(4, 4, tool)).toBe(true)
      expect(player.board.get(boardLayerTypes.MARKUP, 4, 4).type).toBe(tool)
    })
  }

  it('takes markup of the same type off again on a second click', () => {
    const {player, mode} = createPlayer()
    player.setEditTool(editTools.TRIANGLE)
    mode.edit(at(4, 4))
    mode.edit(at(4, 4))

    expect(player.game.hasMarkup(4, 4)).toBe(false)
  })

  it('replaces markup of a different type', () => {
    const {player, mode} = createPlayer()
    player.setEditTool(editTools.TRIANGLE)
    mode.edit(at(4, 4))

    player.setEditTool(editTools.SQUARE)
    mode.edit(at(4, 4))

    expect(player.game.hasMarkup(4, 4, markupTypes.SQUARE)).toBe(true)
  })

  it('keeps painting the same markup while dragging over it', () => {
    const {player, mode} = createPlayer()
    player.setEditTool(editTools.TRIANGLE)
    mode.edit(at(4, 4, {isDragging: true}))
    mode.edit(at(4, 4, {isDragging: true}))

    expect(player.game.hasMarkup(4, 4, markupTypes.TRIANGLE)).toBe(true)
  })

  it('emits the removal and the addition when it replaces markup', () => {
    const {player, mode} = createPlayer()
    player.setEditTool(editTools.TRIANGLE)
    mode.edit(at(4, 4))

    const listener = vi.fn()
    player.on('edit', listener)
    player.setEditTool(editTools.SQUARE)
    mode.edit(at(4, 4))

    expect(listener.mock.calls.map(call => call[0].detail.action))
      .toEqual(['removeMarkup', 'addMarkup'])
  })

  it('takes removed markup off the board as well as out of the record', () => {
    const {player, mode} = createPlayer()
    mode.addMarkup(4, 4, markupTypes.SQUARE)
    player.updateBoardPosition()

    mode.removeMarkup(4, 4)
    expect(player.board.get(boardLayerTypes.MARKUP, 4, 4)).toBeUndefined()
  })

  it('says nothing about removing markup that was never there', () => {
    const {player, mode} = createPlayer()
    const listener = vi.fn()
    player.on('edit', listener)

    mode.removeMarkup(4, 4)
    expect(listener).not.toHaveBeenCalled()
  })

  it('writes the markup into the record it saves', () => {
    const {player, mode} = createPlayer()
    player.setEditTool(editTools.TRIANGLE)
    mode.edit(at(4, 4))

    expect(player.game.toSgf()).toContain('TR[ee]')
  })

  it('throws on the arrow tool, having already written the markup', () => {

    //NOTE: pinning current behaviour, and it is a bug. Arrow counts as a
    //markup tool and maps onto a markup type, but there is no arrow markup
    //object to draw, so the board sync at the end of the edit throws — after
    //the arrow has gone into the record. Nothing in the player selects this
    //tool, so it is only reachable by setting it directly.
    const {player, mode} = createPlayer()
    player.setEditTool(editTools.ARROW)

    expect(() => mode.edit(at(4, 4))).toThrow(/arrow/)
    expect(player.game.hasMarkup(4, 4, markupTypes.ARROW)).toBe(true)
  })
})

describe('Edit mode markup labels', () => {

  it('labels the first point A', () => {
    const {player, mode} = createPlayer()
    player.setEditTool(editTools.LETTER)
    mode.edit(at(0, 0))

    expect(player.game.getMarkup(0, 0))
      .toEqual({type: markupTypes.LABEL, text: 'A'})
  })

  it('walks the alphabet as more labels go down', () => {
    const {player, mode} = createPlayer()
    player.setEditTool(editTools.LETTER)
    mode.edit(at(0, 0))
    mode.edit(at(1, 0))
    mode.edit(at(2, 0))

    expect(player.game.getMarkup(2, 0).text).toBe('C')
  })

  it('fills a gap left by a label that was taken off', () => {
    const {player, mode} = createPlayer()
    player.setEditTool(editTools.LETTER)
    mode.edit(at(0, 0))
    mode.edit(at(1, 0))
    mode.edit(at(0, 0))
    mode.edit(at(2, 0))

    expect(player.game.getMarkup(2, 0).text).toBe('A')
  })

  it('carries on into lower case past Z', () => {
    const {mode} = createPlayer()
    for (let i = 0; i < 26; i++) {
      mode.addMarkup(i % 9, Math.floor(i / 9), markupTypes.LABEL, mode.getNextLetter())
    }

    expect(mode.getNextLetter()).toBe('a')
  })

  it('carries on into two letter labels past z', () => {
    const {mode} = createPlayer()
    for (let i = 0; i < 52; i++) {
      mode.addMarkup(i % 9, Math.floor(i / 9), markupTypes.LABEL, mode.getNextLetter())
    }

    expect(mode.getNextLetter()).toBe('AA')
  })

  it('numbers points from one when using the number tool', () => {
    const {player, mode} = createPlayer()
    player.setEditTool(editTools.NUMBER)
    mode.edit(at(0, 0))
    mode.edit(at(1, 0))

    expect(player.game.getMarkup(0, 0).text).toBe('1')
    expect(player.game.getMarkup(1, 0).text).toBe('2')
  })

  it('fills a gap left by a number that was taken off', () => {
    const {player, mode} = createPlayer()
    player.setEditTool(editTools.NUMBER)
    mode.edit(at(0, 0))
    mode.edit(at(1, 0))
    mode.edit(at(0, 0))
    mode.edit(at(2, 0))

    expect(player.game.getMarkup(2, 0).text).toBe('1')
  })

  it('takes a label off on a second click, whatever its text', () => {

    //A label collides on the label type rather than on its text, so clicking
    //a labelled point again clears it instead of stacking a second one
    const {player, mode} = createPlayer()
    player.setEditTool(editTools.LETTER)
    mode.edit(at(0, 0))
    mode.edit(at(0, 0))

    expect(player.game.hasMarkup(0, 0)).toBe(false)
  })

  it('counts only labels that carry text as used', () => {
    const {mode} = createPlayer()
    mode.addMarkup(1, 1, markupTypes.SQUARE)
    mode.addMarkup(2, 2, markupTypes.LABEL, 'Z')

    expect(mode.findUsedMarkupLabels()).toEqual(['Z'])
  })

  it('gives no text for a tool that carries none', () => {
    const {mode} = createPlayer()
    mode.tool = editTools.TRIANGLE
    expect(mode.getText()).toBeUndefined()
  })
})

describe('Edit mode erasing', () => {

  it('takes markup off a point before the stone under it', () => {
    const {player, mode} = createPlayer()
    mode.addStone(4, 4, BLACK)
    mode.addMarkup(4, 4, markupTypes.SQUARE)

    player.setEditTool(editTools.CLEAR)
    mode.edit(at(4, 4))

    expect(player.game.hasMarkup(4, 4)).toBe(false)
    expect(player.game.hasStone(4, 4)).toBe(true)
  })

  it('takes the stone on the second pass', () => {
    const {player, mode} = createPlayer()
    mode.addStone(4, 4, BLACK)
    mode.addMarkup(4, 4, markupTypes.SQUARE)

    player.setEditTool(editTools.CLEAR)
    mode.edit(at(4, 4))
    mode.edit(at(4, 4))

    expect(player.game.hasStone(4, 4)).toBe(false)
  })

  it('leaves an empty point alone', () => {
    const {player, mode} = createPlayer()
    const listener = vi.fn()
    player.on('edit', listener)

    player.setEditTool(editTools.CLEAR)
    mode.edit(at(4, 4))

    expect(listener).not.toHaveBeenCalled()
  })

  it('takes both markup and stones off an area in one pass', () => {
    const {player, mode} = createPlayer()
    mode.addStone(0, 0, BLACK)
    mode.addStone(1, 1, WHITE)
    mode.addMarkup(1, 1, markupTypes.SQUARE)

    player.setEditTool(editTools.CLEAR_AREA)
    mode.edit({detail: {x: 1, y: 1, area: [{x: 0, y: 0}, {x: 1, y: 1}]}})

    expect(player.game.hasStone(0, 0)).toBe(false)
    expect(player.game.hasStone(1, 1)).toBe(false)
    expect(player.game.hasMarkup(1, 1)).toBe(false)
  })

  it('skips the points in the area that hold nothing', () => {
    const {player, mode} = createPlayer()
    const listener = vi.fn()
    player.on('edit', listener)

    player.setEditTool(editTools.CLEAR_AREA)
    mode.edit({detail: {x: 1, y: 1, area: [{x: 0, y: 0}, {x: 1, y: 1}]}})

    expect(listener).not.toHaveBeenCalled()
  })

  it('clears all markup from the position and the board', () => {
    const {player, mode} = createPlayer()
    mode.addMarkup(1, 1, markupTypes.SQUARE)
    mode.addMarkup(2, 2, markupTypes.TRIANGLE)
    player.updateBoardPosition()

    player.removeAllMarkup()

    expect(player.game.hasMarkup(1, 1)).toBe(false)
    expect(player.game.hasMarkup(2, 2)).toBe(false)
    expect(player.board.get(boardLayerTypes.MARKUP, 1, 1)).toBeUndefined()
  })

  it('takes the cleared markup out of the record it saves', () => {
    const {player, mode} = createPlayer()
    mode.addMarkup(1, 1, markupTypes.SQUARE)
    player.removeAllMarkup()

    expect(player.game.toSgf()).not.toContain('SQ')
  })

  it('announces the clear as a single event', () => {
    const {player, mode} = createPlayer()
    mode.addMarkup(1, 1, markupTypes.SQUARE)
    mode.addMarkup(2, 2, markupTypes.TRIANGLE)

    const listener = vi.fn()
    player.on('edit', listener)
    player.removeAllMarkup()

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0][0].detail)
      .toEqual({action: 'removeAllMarkup', args: []})
  })
})

describe('Edit mode setup stones', () => {

  it('writes a stone placed at the root into the root setup', () => {
    const {player, mode} = createPlayer()
    mode.addStone(4, 4, BLACK)

    expect(player.game.getRootNode().setup)
      .toEqual([{type: BLACK, coords: [{x: 4, y: 4}]}])
    expect(player.game.toSgf()).toContain('AB[ee]')
  })

  it('takes it straight back out of the setup when it is removed again', () => {
    const {player, mode} = createPlayer()
    mode.addStone(4, 4, BLACK)
    mode.removeStone(4, 4)

    expect(player.game.getRootNode().setup).toBeUndefined()
    expect(player.game.toSgf()).not.toContain('AB[')
  })

  it('mutates the position in place when no new node is needed', () => {

    //Setting up on a node that already holds setup instructions changes the
    //position the game is already on, rather than stacking a new one
    const {player, mode} = createPlayer()
    const position = player.game.getPosition()

    mode.addStone(4, 4, BLACK)

    expect(player.game.getPosition()).toBe(position)
    expect(position.stones.get(4, 4)).toBe(BLACK)
  })

  it('creates a node to hold the setup when the current node is a move', () => {

    //Setup instructions can't live on a move node, so placing one here has to
    //push a child node in front of the rest of the game
    const {player, mode} = createPlayer()
    player.goToNextPosition()
    mode.addStone(4, 4, WHITE)

    expect(player.game.getCurrentNode().setup)
      .toEqual([{type: WHITE, coords: [{x: 4, y: 4}]}])
    expect(player.game.toSgf()).toContain('AW[ee]')
  })

  it('moves the game onto the node it just created', () => {
    const {player, mode} = createPlayer()
    player.goToNextPosition()
    const node = player.game.getCurrentNode()

    mode.addStone(4, 4, WHITE)

    expect(player.game.getCurrentNode()).not.toBe(node)
    expect(player.game.getCurrentNode().getParent()).toBe(node)
    expect(player.game.hasStone(4, 4, WHITE)).toBe(true)
  })

  it('leaves the moves that followed standing as a sibling variation', () => {

    //NOTE: the setup node is appended to the move node rather than spliced
    //into the line, so the game the record held carries on as the first
    //variation and the edit becomes a second one
    const {player, mode} = createPlayer()
    player.goToNextPosition()
    mode.addStone(4, 4, WHITE)

    const sgfString = player.game.toSgf()
    expect(sgfString).toContain('W[gg]')
    expect(sgfString).toContain('AW[ee]')
  })

  it('clears a stone a move put down with a clear instruction', () => {

    //The stone isn't in any setup instruction on this node, so taking it off
    //means adding an instruction that says so, which needs a node of its own
    const {player, mode} = createPlayer()
    player.goToNextPosition()
    mode.removeStone(2, 2)

    expect(player.game.getCurrentNode().setup)
      .toEqual([{type: 'clear', coords: [{x: 2, y: 2}]}])
    expect(player.game.hasStone(2, 2)).toBe(false)
    expect(player.game.toSgf()).toContain('AE[cc]')
  })

  it('captures what a setup stone surrounds, when a node was created for it', () => {

    //Setup placement runs the same capture check a move does, so filling the
    //last liberty of a lone black stone takes it off. Black on (1,1) has one
    //liberty left on (1,2), which the white stone below fills.
    const {player, mode} = createPlayer('(;GM[1]FF[4]SZ[9]AB[bb]AW[ab][ba];W[cb])')
    player.goToNextPosition()
    mode.addStone(1, 2, WHITE)

    expect(player.game.hasStone(1, 1)).toBe(false)
  })

  it('captures nothing when the node takes the setup instruction directly', () => {

    //NOTE: pinning current behaviour, and it is a bug — in game.js rather
    //than here. Both paths work the capture out, but only the one that
    //creates a node puts the resulting position on the stack; the in place
    //path drops it and sets the bare stone on the position it already has.
    //So the same edit captures or doesn't depending on the node it lands on.
    const {player, mode} = createPlayer('(;GM[1]FF[4]SZ[9]AB[bb]AW[ab][cb][ba])')
    mode.addStone(1, 2, WHITE)

    expect(player.game.hasStone(1, 1)).toBe(true)
  })

  it('leaves no ko point behind, whatever shape the capture makes', () => {

    //A capture that leaves a single stone in a single eye is a ko when a move
    //made it, but a setup stone is not a move and cannot start one
    const {player, mode} = createPlayer('(;GM[1]FF[4]SZ[9]AB[bb]AW[ab][ba];W[cb])')
    player.goToNextPosition()
    mode.addStone(1, 2, WHITE)

    expect(player.game.hasKoPoint()).toBe(false)
  })

  it('refuses a stone off the board and says nothing about it', () => {
    const {player, mode} = createPlayer()
    const listener = vi.fn()
    player.on('edit', listener)

    mode.addStone(20, 20, BLACK)

    expect(player.game.getRootNode().setup).toBeUndefined()
    expect(listener).toHaveBeenCalledTimes(1)
  })
})

describe('Edit mode move tool', () => {

  it('plays a move where the board was clicked', () => {
    const {player, mode} = createPlayer()
    mode.edit(at(4, 4))

    expect(player.game.getCurrentMoveNumber()).toBe(1)
    expect(player.game.hasStone(4, 4, BLACK)).toBe(true)
  })

  it('plays nothing while dragging', () => {

    //Dragging with the move tool is a drag across the board, not a string of
    //moves, so the grid entries it fires are ignored
    const {player, mode} = createPlayer()
    mode.edit(at(4, 4, {isDragging: true}))

    expect(player.game.getCurrentMoveNumber()).toBe(0)
  })

  it('leaves the move markers standing', () => {

    //The move tool returns before the board sync and marker rendering the
    //other tools end on, which would otherwise wipe the marker the move that
    //was just played put on the board
    const {player, mode} = createPlayer('(;GM[1]FF[4]SZ[9])')
    mode.edit(at(4, 4))

    expect(player.board.get(boardLayerTypes.MARKUP, 4, 4).type)
      .toBe(markupTypes.LAST_MOVE)
  })
})

describe('Edit mode free drawing', () => {

  it('records a line on the position and draws it on the board', () => {
    const {player, mode} = createPlayer()
    mode.addLine(0, 0, 1, 1, '#f00')

    expect(player.game.getLines()).toEqual([[0, 0, 1, 1, '#f00']])
    expect(player.board.getLayer(boardLayerTypes.DRAW).getAll())
      .toEqual([[0, 0, 1, 1, '#f00']])
  })

  it('records a batch of lines in one go', () => {
    const {player, mode} = createPlayer()
    mode.addLines([[0, 0, 1, 1, '#f00'], [1, 1, 2, 2, '#0f0']])

    expect(player.game.getLines()).toHaveLength(2)
    expect(player.board.getLayer(boardLayerTypes.DRAW).getAll()).toHaveLength(2)
  })

  it('announces a batch as a single event', () => {
    const {player, mode} = createPlayer()
    const listener = vi.fn()
    player.on('edit', listener)

    mode.addLines([[0, 0, 1, 1, '#f00'], [1, 1, 2, 2, '#0f0']])

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0][0].detail.action).toBe('addLines')
  })

  it('clears the lines from the position and the board', () => {
    const {player, mode} = createPlayer()
    mode.addLine(0, 0, 1, 1, '#f00')

    player.removeAllLines()

    expect(player.game.getLines()).toHaveLength(0)
    expect(player.board.getLayer(boardLayerTypes.DRAW).getAll()).toHaveLength(0)
  })

  it('announces the clear', () => {
    const {player, mode} = createPlayer()
    mode.addLine(0, 0, 1, 1, '#f00')

    const listener = vi.fn()
    player.on('edit', listener)
    player.removeAllLines()

    expect(listener.mock.calls[0][0].detail)
      .toEqual({action: 'removeAllLines', args: []})
  })

  it('emits each line straight away when no buffering is configured', () => {
    const {player, mode} = createPlayer(sgf, {freeDrawEventBufferDelay: 0})
    const listener = vi.fn()
    player.on('edit', listener)

    mode.triggerAddLineEvent(0, 0, 1, 1, '#f00')

    expect(listener.mock.calls[0][0].detail)
      .toEqual({action: 'addLine', args: [0, 0, 1, 1, '#f00']})
  })

  it('gathers a stroke into one event when it is buffering', () => {
    vi.useFakeTimers()
    const {player, mode} = createPlayer()
    const listener = vi.fn()
    player.on('edit', listener)

    mode.triggerAddLineEvent(0, 0, 1, 1, '#f00')
    mode.triggerAddLineEvent(1, 1, 2, 2, '#f00')
    expect(listener).not.toHaveBeenCalled()

    vi.advanceTimersByTime(50)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0][0].detail).toEqual({
      action: 'addLines',
      args: [[[0, 0, 1, 1, '#f00'], [1, 1, 2, 2, '#f00']]],
    })
    vi.useRealTimers()
  })

  it('empties the buffer once it has flushed', () => {
    vi.useFakeTimers()
    const {mode} = createPlayer()

    mode.triggerAddLineEvent(0, 0, 1, 1, '#f00')
    vi.advanceTimersByTime(50)

    expect(mode.linesAdded).toEqual([])
    expect(mode.lineAddTimeout).toBeNull()
    vi.useRealTimers()
  })

  it('keeps one timeout for the whole stroke', () => {
    vi.useFakeTimers()
    const {mode} = createPlayer()

    mode.triggerAddLineEvent(0, 0, 1, 1, '#f00')
    const timeout = mode.lineAddTimeout
    mode.triggerAddLineEvent(1, 1, 2, 2, '#f00')

    expect(mode.lineAddTimeout).toBe(timeout)
    vi.useRealTimers()
  })

  it('draws nothing from the first point of a stroke', () => {

    //A line needs two points, and the first mouse move only has one
    const {player, mode} = createPlayer()
    player.setEditTool(editTools.DRAW)
    mode.onMouseMove(moveTo(player.board, 2, 2))

    expect(player.game.getLines()).toHaveLength(0)
    expect(mode.lastFreeDrawX).toBe(2)
    expect(mode.lastFreeDrawY).toBe(2)
  })

  it('draws from the last point to this one as the mouse moves', () => {
    const {player, mode} = createPlayer()
    player.setEditTool(editTools.DRAW)
    mode.onMouseMove(moveTo(player.board, 2, 2))
    mode.onMouseMove(moveTo(player.board, 4, 4))

    expect(player.game.getLines())
      .toEqual([[2, 2, 4, 4, player.getConfig('freeDrawColor')]])
  })

  it('ignores the mouse when it is not being dragged', () => {
    const {player, mode} = createPlayer()
    player.setEditTool(editTools.DRAW)
    mode.onMouseMove(moveTo(player.board, 2, 2, false))

    expect(mode.lastFreeDrawX).toBeNull()
  })

  it('ignores the mouse when another tool is in hand', () => {
    const {player, mode} = createPlayer()
    player.setEditTool(editTools.BLACK)
    mode.onMouseMove(moveTo(player.board, 2, 2))

    expect(mode.lastFreeDrawX).toBeNull()
  })

  it('breaks the stroke when the mouse comes back up', () => {

    //The click that ends a drag stops the stroke, so the next one starts
    //fresh rather than joining onto where the last one left off
    const {player, mode} = createPlayer()
    player.setEditTool(editTools.DRAW)
    mode.onMouseMove(moveTo(player.board, 2, 2))

    mode.onClick(at(2, 2))
    expect(mode.lastFreeDrawX).toBeNull()

    mode.onMouseMove(moveTo(player.board, 4, 4))
    expect(player.game.getLines()).toHaveLength(0)
  })

  it('edits nothing when the draw tool reaches the edit itself', () => {

    //None of the tool branches claim a free draw, so the edit falls through
    //to the board sync having changed nothing about the position
    const {player, mode} = createPlayer()
    player.setEditTool(editTools.DRAW)
    const spy = vi.spyOn(player, 'updateBoardPosition')

    mode.edit(at(4, 4))

    expect(player.game.hasStone(4, 4)).toBe(false)
    expect(player.game.hasMarkup(4, 4)).toBe(false)
    expect(spy).toHaveBeenCalled()
  })

  it('edits nothing on a click while the draw tool is in hand', () => {
    const {player, mode} = createPlayer()
    player.setEditTool(editTools.DRAW)
    mode.onClick(at(4, 4))

    expect(player.game.hasStone(4, 4)).toBe(false)
    expect(player.game.getCurrentMoveNumber()).toBe(0)
  })
})

describe('Edit mode click handling', () => {

  it('puts focus back on the player', () => {
    const {player, mode} = createPlayer()
    mode.onClick(at(4, 4))

    expect(player.elements.container.focus).toHaveBeenCalled()
  })

  it('ignores a click that landed off the board', () => {
    const {player, mode} = createPlayer()
    player.setEditTool(editTools.BLACK)
    mode.onClick({detail: {x: -1, y: 4}})

    expect(player.game.getRootNode().setup).toBeUndefined()
  })

  it('ignores a click on the cell a drag just edited', () => {

    //A drag that ends on a cell fires the grid entry that edits it and then a
    //click on the same cell, which would toggle the edit straight back off
    const {player, mode} = createPlayer()
    player.setEditTool(editTools.BLACK)
    player.triggerEvent('gridEnter', {x: 3, y: 3, isDragging: true})
    expect(player.game.hasStone(3, 3, BLACK)).toBe(true)

    mode.onClick(at(3, 3))
    expect(player.game.hasStone(3, 3, BLACK)).toBe(true)
  })

  it('only ignores it once', () => {
    const {player, mode} = createPlayer()
    player.setEditTool(editTools.BLACK)
    player.triggerEvent('gridEnter', {x: 3, y: 3, isDragging: true})

    mode.onClick(at(3, 3))
    mode.onClick(at(3, 3))

    expect(player.game.hasStone(3, 3)).toBe(false)
  })

  it('takes a click on a different cell than the drag ended on', () => {
    const {player, mode} = createPlayer()
    player.setEditTool(editTools.BLACK)
    player.triggerEvent('gridEnter', {x: 3, y: 3, isDragging: true})

    mode.onClick(at(5, 5))
    expect(player.game.hasStone(5, 5, BLACK)).toBe(true)
  })

  it('clears the hover before it edits', () => {
    const {player, mode} = createPlayer()
    const spy = vi.spyOn(player.board, 'clearHoverLayer')

    mode.onClick(at(4, 4))
    expect(spy).toHaveBeenCalled()
  })

  it('edits nothing when the event carries no detail at all', () => {
    const {player, mode} = createPlayer()
    mode.edit({})

    expect(player.game.getCurrentMoveNumber()).toBe(0)
  })
})

describe('Edit mode hover feedback', () => {

  it('remembers where the mouse is', () => {
    const {player, mode} = createPlayer()
    player.triggerEvent('gridEnter', {x: 3, y: 3, isDragging: false})

    expect(mode.currentGridDetail).toEqual({x: 3, y: 3, isDragging: false})
  })

  it('keeps the cell it came from as the last one', () => {
    const {player, mode} = createPlayer()
    player.triggerEvent('gridEnter', {x: 3, y: 3, isDragging: false})
    player.triggerEvent('gridEnter', {x: 4, y: 4, isDragging: false})

    expect(mode.lastGridDetail).toEqual({x: 3, y: 3, isDragging: false})
    expect(mode.currentGridDetail).toEqual({x: 4, y: 4, isDragging: false})
  })

  it('shows a hover stone in the colour whose turn it is', () => {
    const {player} = createPlayer()
    player.triggerEvent('gridEnter', {x: 3, y: 3, isDragging: false})

    //A shadow and the stone itself
    const hover = player.board.get(boardLayerTypes.HOVER, 3, 3)
    expect(hover).toHaveLength(2)
    expect(hover[1].stoneColor).toBe(BLACK)
  })

  it('shows no hover stone on a point that already holds one', () => {
    const {player} = createPlayer()
    player.goToNextPosition()
    player.triggerEvent('gridEnter', {x: 2, y: 2, isDragging: false})

    expect(player.board.get(boardLayerTypes.HOVER, 2, 2)).toBeUndefined()
  })

  it('shows a hover stone in the tool colour when editing', () => {

    //Black to play, so the tool colour is the one that shows rather than
    //whose turn it is
    const {player} = createPlayer()
    player.setEditTool(editTools.WHITE)
    player.triggerEvent('gridEnter', {x: 3, y: 3, isDragging: false})

    const hover = player.board.get(boardLayerTypes.HOVER, 3, 3)
    expect(hover).toHaveLength(2)
    expect(hover[1].stoneColor).toBe(WHITE)
  })

  it('shows no hover stone on a point that already holds that colour', () => {
    const {player, mode} = createPlayer()
    mode.addStone(3, 3, WHITE)
    player.setEditTool(editTools.WHITE)
    player.triggerEvent('gridEnter', {x: 3, y: 3, isDragging: false})

    expect(player.board.get(boardLayerTypes.HOVER, 3, 3)).toBeUndefined()
  })

  it('shows the markup the tool would draw', () => {
    const {player} = createPlayer()
    player.setEditTool(editTools.SQUARE)
    player.triggerEvent('gridEnter', {x: 3, y: 3, isDragging: false})

    expect(player.board.get(boardLayerTypes.HOVER, 3, 3).type)
      .toBe(markupTypes.SQUARE)
  })

  it('shows the label the tool would draw next', () => {
    const {player} = createPlayer()
    player.setEditTool(editTools.LETTER)
    player.triggerEvent('gridEnter', {x: 3, y: 3, isDragging: false})

    expect(player.board.get(boardLayerTypes.HOVER, 3, 3).text).toBe('A')
  })

  it('shows a mark as the eraser for the clear tool', () => {
    const {player} = createPlayer()
    player.setEditTool(editTools.CLEAR)
    player.triggerEvent('gridEnter', {x: 3, y: 3, isDragging: false})

    expect(player.board.get(boardLayerTypes.HOVER, 3, 3).type)
      .toBe(markupTypes.MARK)
  })

  it('shows no eraser for a tool that does not erase', () => {
    const {player, mode} = createPlayer()
    player.setEditTool(editTools.BLACK)
    mode.currentGridDetail = {x: 3, y: 3}
    const spy = vi.spyOn(player.board, 'setHoverCell')

    mode.showHoverEraser()
    expect(spy).not.toHaveBeenCalled()
  })

  it('shows nothing at all when the mouse is off the board', () => {
    const {player, mode} = createPlayer()
    const spy = vi.spyOn(player.board, 'setHoverCell')

    mode.showHoverStone()
    mode.showHoverMarkup()
    mode.showHoverEraser()

    expect(spy).not.toHaveBeenCalled()
  })

  it('ignores a grid entry that landed off the board', () => {

    //Where the mouse is is still remembered, but nothing is drawn for it
    const {player, mode} = createPlayer()
    const spy = vi.spyOn(player.board, 'setHoverCell')
    player.triggerEvent('gridEnter', {x: -1, y: -1, isDragging: false})

    expect(mode.currentGridDetail).toEqual({x: -1, y: -1, isDragging: false})
    expect(spy).not.toHaveBeenCalled()
  })

  it('shows only the hover stone when dragging with the move tool', () => {

    //The click handler is what plays the move, so the grid entry has nothing
    //to do here but keep the hover stone under the cursor
    const {player} = createPlayer()
    player.triggerEvent('gridEnter', {x: 3, y: 3, isDragging: true})

    expect(player.game.getCurrentMoveNumber()).toBe(0)
    expect(player.board.get(boardLayerTypes.HOVER, 3, 3)).toHaveLength(2)
  })

  it('does nothing when dragging with the draw tool', () => {

    //The mouse move handler owns free drawing, down to the sub-cell precision
    //the grid events don't carry
    const {player, mode} = createPlayer()
    player.setEditTool(editTools.DRAW)
    player.triggerEvent('gridEnter', {x: 3, y: 3, isDragging: true})

    expect(mode.lastEditedGridDetail).toBeUndefined()
    expect(player.board.get(boardLayerTypes.HOVER, 3, 3)).toBeUndefined()
  })

  it('edits as it is dragged over cells with any other tool', () => {
    const {player} = createPlayer()
    player.setEditTool(editTools.TRIANGLE)
    player.triggerEvent('gridEnter', {x: 3, y: 3, isDragging: true})
    player.triggerEvent('gridEnter', {x: 4, y: 4, isDragging: true})

    expect(player.game.hasMarkup(3, 3, markupTypes.TRIANGLE)).toBe(true)
    expect(player.game.hasMarkup(4, 4, markupTypes.TRIANGLE)).toBe(true)
  })

  it('forgets where the mouse was on the way out', () => {
    const {player, mode} = createPlayer()
    player.triggerEvent('gridEnter', {x: 3, y: 3, isDragging: false})
    player.triggerEvent('gridLeave', {x: 3, y: 3})

    expect(mode.currentGridDetail).toBeNull()
  })

  it('clears the whole hover layer on the way out with a stone tool', () => {

    //Stones carry a shadow onto the neighbouring cells, so clearing the one
    //cell would leave part of the hover behind
    const {player} = createPlayer()
    player.setEditTool(editTools.BLACK)
    const spy = vi.spyOn(player.board, 'clearHoverLayer')

    player.triggerEvent('gridLeave', {x: 3, y: 3})
    expect(spy).toHaveBeenCalled()
  })

  it('clears the whole hover layer on the way out with the move tool', () => {
    const {player} = createPlayer()
    const spy = vi.spyOn(player.board, 'clearHoverLayer')

    player.triggerEvent('gridLeave', {x: 3, y: 3})
    expect(spy).toHaveBeenCalled()
  })

  it('clears just the cell on the way out with a markup tool', () => {
    const {player} = createPlayer()
    player.setEditTool(editTools.SQUARE)
    const spyLayer = vi.spyOn(player.board, 'clearHoverLayer')
    const spyCell = vi.spyOn(player.board, 'clearHoverCell')

    player.triggerEvent('gridLeave', {x: 3, y: 3})

    expect(spyLayer).not.toHaveBeenCalled()
    expect(spyCell).toHaveBeenCalledWith(3, 3)
  })

  it('clears just the cell on the way out with the clear tool', () => {
    const {player} = createPlayer()
    player.setEditTool(editTools.CLEAR)
    const spyCell = vi.spyOn(player.board, 'clearHoverCell')

    player.triggerEvent('gridLeave', {x: 3, y: 3})
    expect(spyCell).toHaveBeenCalledWith(3, 3)
  })

  it('clears nothing on the way out with the draw tool', () => {
    const {player} = createPlayer()
    player.setEditTool(editTools.DRAW)
    const spyLayer = vi.spyOn(player.board, 'clearHoverLayer')
    const spyCell = vi.spyOn(player.board, 'clearHoverCell')

    player.triggerEvent('gridLeave', {x: 3, y: 3})

    expect(spyLayer).not.toHaveBeenCalled()
    expect(spyCell).not.toHaveBeenCalled()
  })

  it('ignores a grid leave from off the board', () => {
    const {player, mode} = createPlayer()
    player.triggerEvent('gridEnter', {x: 3, y: 3, isDragging: false})
    player.triggerEvent('gridLeave', {x: -1, y: -1})

    expect(mode.currentGridDetail).not.toBeNull()
  })
})

describe('Edit mode processEdit', () => {

  //Every action processEdit accepts, with arguments that leave the position
  //in a state the assertion below can check
  const actions = [
    ['addStone', [4, 4, BLACK], p => expect(p.game.hasStone(4, 4, BLACK)).toBe(true)],
    ['addMarkup', [4, 4, markupTypes.TRIANGLE], p =>
      expect(p.game.hasMarkup(4, 4, markupTypes.TRIANGLE)).toBe(true)],
    ['addLine', [0, 0, 1, 1, '#f00'], p => expect(p.game.getLines()).toHaveLength(1)],
    ['addLines', [[[0, 0, 1, 1, '#f00']]], p => expect(p.game.getLines()).toHaveLength(1)],
  ]

  for (const [action, args, assert] of actions) {
    it(`applies ${action}`, () => {
      const {player} = createPlayer()
      player.processEdit(action, args)
      assert(player)
    })
  }

  it('applies removeStone', () => {
    const {player, mode} = createPlayer()
    mode.addStone(4, 4, BLACK)

    player.processEdit('removeStone', [4, 4])
    expect(player.game.hasStone(4, 4)).toBe(false)
  })

  it('applies removeMarkup', () => {
    const {player, mode} = createPlayer()
    mode.addMarkup(4, 4, markupTypes.TRIANGLE)

    player.processEdit('removeMarkup', [4, 4])
    expect(player.game.hasMarkup(4, 4)).toBe(false)
  })

  it('applies removeAllMarkup', () => {
    const {player, mode} = createPlayer()
    mode.addMarkup(1, 1, markupTypes.SQUARE)
    mode.addMarkup(2, 2, markupTypes.TRIANGLE)

    player.processEdit('removeAllMarkup', [])
    expect(player.game.hasMarkup(1, 1)).toBe(false)
    expect(player.game.hasMarkup(2, 2)).toBe(false)
  })

  it('applies removeAllLines', () => {
    const {player, mode} = createPlayer()
    mode.addLine(0, 0, 1, 1, '#f00')

    player.processEdit('removeAllLines', [])
    expect(player.game.getLines()).toHaveLength(0)
  })

  it('takes no arguments at all for the actions that need none', () => {
    const {player, mode} = createPlayer()
    mode.addMarkup(1, 1, markupTypes.SQUARE)

    expect(() => player.processEdit('removeAllMarkup')).not.toThrow()
    expect(player.game.hasMarkup(1, 1)).toBe(false)
  })

  it('refuses an action it does not know', () => {
    const {player} = createPlayer()
    expect(() => player.processEdit('somethingElse'))
      .toThrow('Invalid edit action: somethingElse')
  })

  it('refuses a method on the mode that is not an edit action', () => {

    //The action names map onto method names, so the list is what stops an
    //incoming event from calling anything else on the handler
    const {player} = createPlayer()
    expect(() => player.processEdit('teardown')).toThrow(/Invalid edit action/)
  })

  it('stays quiet, so an applied edit does not echo back', () => {
    const {player} = createPlayer()
    const listener = vi.fn()
    player.on('edit', listener)

    player.processEdit('addStone', [4, 4, BLACK])
    expect(listener).not.toHaveBeenCalled()
  })

  it('starts talking again once it is done', () => {
    const {player, mode} = createPlayer()
    player.processEdit('addStone', [4, 4, BLACK])

    const listener = vi.fn()
    player.on('edit', listener)
    mode.addStone(5, 5, BLACK)

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('syncs the board after an edit to the position', () => {
    const {player} = createPlayer()
    player.processEdit('addStone', [4, 4, BLACK])

    expect(player.board.get(boardLayerTypes.STONES, 4, 4)).toBeTruthy()
  })

  it('leaves the board alone for a line, which draws itself', () => {

    //Lines go straight onto the draw layer, so a position sync would be
    //nothing but wasted work in the middle of a stroke
    const {player} = createPlayer()
    const spy = vi.spyOn(player, 'updateBoardPosition')

    player.processEdit('addLine', [0, 0, 1, 1, '#f00'])
    player.processEdit('addLines', [[[1, 1, 2, 2, '#f00']]])

    expect(spy).not.toHaveBeenCalled()
    expect(player.board.getLayer(boardLayerTypes.DRAW).getAll()).toHaveLength(2)
  })

  it('carries an edit from one instance into another', () => {

    //The round trip the emitted event and this method exist for: two players
    //on the same record, one following what the other does
    const a = createPlayer()
    const b = createPlayer()
    a.player.on('edit', event => {
      const {action, args} = event.detail
      b.player.processEdit(action, args)
    })

    a.player.setEditTool(editTools.BLACK)
    a.mode.edit(at(3, 3))

    expect(b.player.game.hasStone(3, 3, BLACK)).toBe(true)
    expect(b.player.game.toSgf()).toBe(a.player.game.toSgf())
  })

  it('does not send what it applied back the other way', () => {
    const a = createPlayer()
    const b = createPlayer()
    const listener = vi.fn()

    a.player.on('edit', event => {
      const {action, args} = event.detail
      b.player.processEdit(action, args)
    })
    b.player.on('edit', listener)

    a.player.setEditTool(editTools.BLACK)
    a.mode.edit(at(3, 3))

    expect(listener).not.toHaveBeenCalled()
  })
})
