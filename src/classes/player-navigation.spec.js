import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest'
import Player from './player.js'
import Game from './game.js'
import {playerModes} from '../constants/player.js'

//Turning a click into a grid coordinate reads the device pixel ratio off the
//window, which isn't there outside a browser
beforeEach(() => {
  vi.stubGlobal('window', {devicePixelRatio: 1})
})

afterEach(() => {
  vi.unstubAllGlobals()
})

//A record that runs six moves, forks at the third, names a node and carries a
//comment, so that every way of navigating has something to reach
const sgf = [
  '(;GM[1]FF[4]SZ[9]',
  ';B[cc]C[a note]',
  ';W[gg]N[the fork]',
  '(;B[cg];W[gc];B[ee];W[ec])',
  '(;B[gc]))',
].join('')

const load = (data = sgf, config = {}) => {
  const player = new Player(config)
  player.board.createLayers()
  player.loadData(data)
  return player
}

describe('Player navigation', () => {

  it('steps forward and back', () => {
    const player = load()

    player.goToNextPosition()
    expect(player.game.getCurrentMoveNumber()).toBe(1)

    player.goToPreviousPosition()
    expect(player.game.getCurrentMoveNumber()).toBe(0)
  })

  it('stays put at either end', () => {
    const player = load()

    player.goToPreviousPosition()
    expect(player.game.getCurrentMoveNumber()).toBe(0)

    player.goToLastPosition()
    player.goToNextPosition()
    expect(player.game.getCurrentMoveNumber()).toBe(6)
  })

  it('does nothing when told to go last from the last position', () => {
    const player = load()
    player.goToLastPosition()
    const spy = vi.spyOn(player, 'processPathChange')

    player.goToLastPosition()
    expect(spy).not.toHaveBeenCalled()
  })

  it('jumps to the first and last positions', () => {
    const player = load()

    player.goToLastPosition()
    expect(player.game.getCurrentMoveNumber()).toBe(6)

    player.goToFirstPosition()
    expect(player.game.getCurrentMoveNumber()).toBe(0)
  })

  it('skips a run of moves at a time', () => {
    const player = load(sgf, {numSkipMoves: 3})

    player.goForwardNumPositions()
    expect(player.game.getCurrentMoveNumber()).toBe(3)

    player.goBackNumPositions()
    expect(player.game.getCurrentMoveNumber()).toBe(0)
  })

  it('takes a count over the configured one', () => {
    const player = load()

    player.goForwardNumPositions(2)
    expect(player.game.getCurrentMoveNumber()).toBe(2)

    player.goBackNumPositions(1)
    expect(player.game.getCurrentMoveNumber()).toBe(1)
  })

  it('goes to a move number', () => {
    const player = load()
    player.goToMoveNumber(4)

    expect(player.game.getCurrentMoveNumber()).toBe(4)
  })

  it('goes to a named node', () => {
    const player = load()
    player.goToNamedNode('the fork')

    expect(player.game.getCurrentNodeName()).toBe('the fork')
  })

  it('says when it reaches a named node', () => {
    const player = load()
    const listener = vi.fn()
    player.on('namedNode', listener)

    player.goToNamedNode('the fork')

    expect(listener.mock.calls[0][0].detail.node.name).toBe('the fork')
  })

  it('goes to a node it is handed', () => {
    const player = load()
    const target = player.game.findNamedNode('the fork')

    player.goToNode(target)

    expect(player.isAtNode(target)).toBe(true)
  })

  it('goes to a path it is handed', () => {
    const player = load()
    player.goToLastPosition()
    const path = player.game.getPath().clone()

    player.goToFirstPosition()
    player.goToPath(path)

    expect(player.game.getCurrentMoveNumber()).toBe(6)
  })

  it('walks between comments', () => {
    const player = load()

    player.goToNextComment()
    expect(player.game.getCurrentMoveNumber()).toBe(1)

    player.goToLastPosition()
    player.goToPreviousComment()
    expect(player.game.getCurrentMoveNumber()).toBe(1)
  })

  it('walks between forks', () => {
    const player = load()

    player.goToNextFork()
    expect(player.game.getCurrentMoveNumber()).toBe(2)
  })
})

describe('Player variations', () => {

  it('selects between the variations of a fork', () => {
    const player = load()
    player.goToMoveNumber(2)

    player.selectNextVariation()
    expect(player.game.getCurrentPathIndex()).toBe(1)

    player.selectPreviousVariation()
    expect(player.game.getCurrentPathIndex()).toBe(0)
  })

  it('says when the selected variation changes', () => {
    const player = load()
    player.goToMoveNumber(2)
    const listener = vi.fn()
    player.on('variationChange', listener)

    player.selectNextVariation()

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('walks sideways between the siblings of a fork', () => {

    //Both branches start at move three, so this moves across rather than
    //along: from the first continuation to the second and back
    const player = load()
    player.goToMoveNumber(3)
    expect(player.game.getCurrentNode().move.x).toBe(2)

    player.goToNextVariation()
    expect(player.game.getCurrentNode().move.x).toBe(6)

    player.goToPreviousVariation()
    expect(player.game.getCurrentNode().move.x).toBe(2)
  })

  it('stays put when there is no sibling to walk to', () => {
    const player = load()
    player.goToMoveNumber(1)

    player.goToNextVariation()
    player.goToPreviousVariation()

    expect(player.game.getCurrentMoveNumber()).toBe(1)
  })

  it('makes a node the main variation', () => {
    const player = load()
    player.goToMoveNumber(2)
    player.selectNextVariation()
    player.goToNextPosition()
    const node = player.game.getCurrentNode()

    player.makeMainVariation(node)

    expect(player.game.findNodeForPath(player.game.getPath())).toBe(node)
    expect(player.game.toSgf()).toMatch(/;B\[gc\]/)
  })

  it('says what it did, in a shape another instance can replay', () => {

    //The path is captured before the tree is restructured, because the child
    //indices it consists of only address the node in the shape it was in
    const player = load()
    player.goToMoveNumber(2)
    player.selectNextVariation()
    player.goToNextPosition()
    const listener = vi.fn()
    player.on('variationChange', listener)

    player.makeMainVariation(player.game.getCurrentNode())

    const {action, args} = listener.mock.calls[0][0].detail
    expect(action).toBe('makeMainVariation')
    expect(args[0]).toEqual({moveNo: 3, path: {2: 1}, branches: 1})
  })

  it('removes a node', () => {
    const player = load()
    player.goToMoveNumber(3)
    const node = player.game.getCurrentNode()

    player.removeNode(node)

    expect(player.game.getCurrentMoveNumber()).toBe(2)
    expect(player.game.toSgf()).not.toContain('B[cg]')
  })

  it('says what it removed', () => {
    const player = load()
    player.goToMoveNumber(3)
    const listener = vi.fn()
    player.on('edit', listener)

    player.removeNode(player.game.getCurrentNode())

    const {action, args} = listener.mock.calls[0][0].detail
    expect(action).toBe('removeNode')
    expect(args[0]).toEqual({moveNo: 3, path: {}, branches: 0})
  })
})

describe('Player moves', () => {

  it('plays a move and says so', () => {
    const player = load('(;GM[1]FF[4]SZ[9])')
    const listener = vi.fn()
    player.on('move', listener)

    player.playMove(3, 3)

    expect(player.game.hasStone(3, 3, 'black')).toBe(true)
    expect(listener.mock.calls[0][0].detail).toMatchObject({
      color: 'black', x: 3, y: 3,
    })
  })

  it('says when a move passes', () => {
    const player = load('(;GM[1]FF[4]SZ[9])')
    const listener = vi.fn()
    player.on('pass', listener)

    player.passMove()

    expect(listener).toHaveBeenCalled()
    expect(player.game.getCurrentNode().move.pass).toBe(true)
  })

  it('says so again when navigating onto a pass', () => {
    const player = load('(;GM[1]FF[4]SZ[9];B[cc];W[])')
    const listener = vi.fn()
    player.on('pass', listener)

    player.goToLastPosition()

    expect(listener).toHaveBeenCalled()
  })

  it('does not repeat itself when the path did not change', () => {
    const player = load()
    player.goToLastPosition()
    const listener = vi.fn()
    player.on('pathChange', listener)

    player.processPathChange()

    expect(listener).not.toHaveBeenCalled()
  })
})

describe('Player mode handling', () => {

  it('refuses to hand out a handler for no mode at all', () => {
    const player = load()
    expect(() => player.getModeHandler()).toThrow('No mode specified')
  })

  it('builds each handler once and keeps it', () => {
    const player = load()
    const handler = player.getModeHandler(playerModes.EDIT)

    expect(player.getModeHandler(playerModes.EDIT)).toBe(handler)
  })

  it('will not switch to a mode that is not available', () => {
    const player = load(sgf, {availableModes: [playerModes.REPLAY]})

    player.setMode(playerModes.EDIT)

    expect(player.getActiveMode()).toBe(playerModes.REPLAY)
  })

  it('stays put when told to switch to the mode it is in', () => {
    const player = load()
    const listener = vi.fn()
    player.on('modeChange', listener)

    player.setMode(playerModes.REPLAY)

    expect(listener).not.toHaveBeenCalled()
  })

  it('passes an action to whichever mode is active', () => {
    const player = load()
    const mode = player.getModeHandler(playerModes.REPLAY)
    const spy = vi.spyOn(mode, 'processAction')

    player.processAction('somethingElse')

    expect(spy).toHaveBeenCalledWith('somethingElse')
  })
})

describe('Player game handling', () => {

  it('passes on what the game says about itself', () => {
    const player = load()
    const listener = vi.fn()
    player.on('info', listener)

    player.game.setGameName('a name')

    expect(listener).toHaveBeenCalled()
  })

  it('passes on a position change the game made', () => {
    const player = load()
    const listener = vi.fn()
    player.on('positionChange', listener)

    player.game.addStone(4, 4, 'black')

    expect(listener).toHaveBeenCalled()
  })

  it('takes a board handed to it after the fact', () => {
    const player = load()
    const board = player.board
    const other = new Player().board
    other.createLayers()

    player.setBoard(other)

    expect(player.getBoard()).toBe(other)
    expect(player.getBoard()).not.toBe(board)
  })

  it('loads config out of the record when allowed', () => {
    const game = new Game()
    game.setSettings({showCoordinates: false})
    const player = new Player()

    player.loadGame(game)

    expect(player.getConfig('showCoordinates')).toBe(false)
  })

  it('leaves its own config alone when not', () => {
    const game = new Game()
    game.setSettings({showCoordinates: false})
    const player = new Player({allowPlayerConfig: false})

    player.loadGame(game)

    expect(player.getConfig('showCoordinates')).toBe(true)
  })
})

describe('Player mouse events', () => {

  const createPlayer = () => {
    const player = new Player({board: {showCoordinates: false}})
    player.board.createLayers()
    player.board.setDrawSize(600, 600)
    return player
  }

  const at = (player, x, y) => ({
    offsetX: player.board.getAbsX(x),
    offsetY: player.board.getAbsY(y),
    preventDefault: vi.fn(),
  })

  it('turns a pixel position into an intersection', () => {
    const player = createPlayer()
    const listener = vi.fn()
    player.on('click', listener)

    player.triggerEvent('click', {nativeEvent: at(player, 3, 4)})

    expect(listener.mock.calls[0][0].detail).toMatchObject({x: 3, y: 4})
  })

  it('reports no intersection at all without a native event', () => {
    const player = createPlayer()
    const listener = vi.fn()
    player.on('click', listener)

    player.triggerEvent('click', {})

    expect(listener.mock.calls[0][0].detail).toMatchObject({
      x: -1, y: -1, area: [],
    })
  })

  it('raises grid entry and leave as the mouse crosses cells', () => {
    const player = createPlayer()
    const entered = vi.fn()
    const left = vi.fn()
    player.on('gridEnter', entered)
    player.on('gridLeave', left)

    player.triggerEvent('mousemove', {nativeEvent: at(player, 3, 3)})
    player.triggerEvent('mousemove', {nativeEvent: at(player, 4, 4)})

    expect(entered).toHaveBeenCalledTimes(2)
    expect(entered.mock.calls[1][0].detail).toMatchObject({x: 4, y: 4})
    expect(left.mock.calls[1][0].detail).toMatchObject({x: 3, y: 3})
  })

  it('stays quiet while the mouse moves within one cell', () => {
    const player = createPlayer()
    const entered = vi.fn()
    player.on('gridEnter', entered)

    player.triggerEvent('mousemove', {nativeEvent: at(player, 3, 3)})
    player.triggerEvent('mousemove', {nativeEvent: at(player, 3, 3)})

    expect(entered).toHaveBeenCalledTimes(1)
  })

  it('speaks up again when the same cell is entered dragging', () => {

    //The cell has not changed, but what happens on it has
    const player = createPlayer()
    const entered = vi.fn()
    player.on('gridEnter', entered)

    player.triggerEvent('mousemove', {nativeEvent: at(player, 3, 3)})
    player.isDragging = true
    player.triggerEvent('mousemove', {nativeEvent: at(player, 3, 3)})

    expect(entered).toHaveBeenCalledTimes(2)
  })

  it('reports the single cell under the cursor when not dragging', () => {
    const player = createPlayer()
    const listener = vi.fn()
    player.on('click', listener)

    player.triggerEvent('click', {nativeEvent: at(player, 3, 4)})

    expect(listener.mock.calls[0][0].detail.area).toEqual([{x: 3, y: 4}])
  })

  it('reports the rectangle a drag has covered', () => {
    const player = createPlayer()
    const listener = vi.fn()
    player.on('mousemove', listener)

    player.triggerEvent('mousedown', {nativeEvent: at(player, 2, 2)})
    player.isDragging = true
    player.triggerEvent('mousemove', {nativeEvent: at(player, 3, 3)})

    const {area} = listener.mock.calls[0][0].detail
    expect(area).toHaveLength(4)
    expect(area).toContainEqual({x: 2, y: 2})
    expect(area).toContainEqual({x: 3, y: 3})
  })

  it('clamps the drag rectangle to the board', () => {
    const player = createPlayer()
    const listener = vi.fn()
    player.on('mousemove', listener)

    player.triggerEvent('mousedown', {nativeEvent: at(player, 0, 0)})
    player.isDragging = true
    player.triggerEvent('mousemove', {nativeEvent: at(player, 30, 30)})

    const {area} = listener.mock.calls[0][0].detail
    expect(area).toHaveLength(19 * 19)
  })

  it('starts no drag from a press that landed off the board', () => {
    const player = createPlayer()
    const listener = vi.fn()
    player.on('mousemove', listener)

    player.triggerEvent('mousedown', {nativeEvent: at(player, -3, -3)})
    player.triggerEvent('mousemove', {nativeEvent: at(player, 3, 3)})

    expect(listener.mock.calls[0][0].detail.area).toEqual([{x: 3, y: 3}])
  })

  it('ends the drag on the click that closes it', () => {
    const player = createPlayer()
    const listener = vi.fn()
    player.on('mousemove', listener)

    player.triggerEvent('mousedown', {nativeEvent: at(player, 2, 2)})
    player.triggerEvent('click', {nativeEvent: at(player, 3, 3)})
    player.triggerEvent('mousemove', {nativeEvent: at(player, 4, 4)})

    expect(listener.mock.calls[0][0].detail.area).toEqual([{x: 4, y: 4}])
  })
})
