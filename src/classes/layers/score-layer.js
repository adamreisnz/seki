import BoardLayer from './board-layer.js'
import StoneFactory from '../stone-factory.js'
import Grid from '../grid.js'
import {boardLayerTypes} from '../../constants/board.js'
import {stoneModifierStyles} from '../../constants/stone.js'

/**
 * Score layer
 */
export default class ScoreLayer extends BoardLayer {

  //Type
  type = boardLayerTypes.SCORE

  //Helper vars
  territory = null
  captures = null

  /**
   * Set territory and captures
   */
  setAll(territory, captures) {

    //Remove all existing
    this.removeAll()

    //Set
    this.territory = territory
    this.captures = captures
    this.removedStones = new Grid(captures.width, captures.height)

    //Get data
    const {board} = this

    //Remove captures from stones layer
    for (const entry of captures) {
      const {x, y} = entry
      const stone = board.get(boardLayerTypes.STONES, x, y)
      board.remove(boardLayerTypes.STONES, x, y)
      this.removedStones.set(x, y, stone)
    }
  }

  /**
   * Remove all scoring
   */
  removeAll() {

    //Get data
    const {board, removedStones} = this

    //Restore any removed stones
    if (removedStones) {
      for (const entry of removedStones) {
        const {x, y, value: stone} = entry
        board.add(boardLayerTypes.STONES, x, y, stone)
      }
      removedStones.clear()
    }

    //Erase the layer
    this.erase()

    //Clear territory and captures
    this.territory = null
    this.captures = null
  }

  /**
   * Can draw check
   */
  canDraw() {
    if (!super.canDraw()) {
      return false
    }
    return (this.territory && this.captures)
  }

  /**
   * Draw layer
   */
  draw() {

    //Can't draw
    if (!this.canDraw()) {
      return
    }

    //Get data
    const {context, board, captures, territory} = this
    const style = board.theme.get('board.stoneStyle')

    //Draw captures first
    for (const entry of captures) {
      const {x, y, value: {color}} = entry
      const stone = StoneFactory.create(style, color, board)
      const capture = StoneFactory.createCopy(stone, stoneModifierStyles.CAPTURES)
      capture.draw(context, x, y)
    }

    //Draw territory on top of it
    for (const entry of territory) {
      const {x, y, value: {color, probability}} = entry
      const stone = StoneFactory.create(style, color, board)
      const point = StoneFactory.createCopy(stone, stoneModifierStyles.POINTS, {
        probability: Math.abs(probability),
      })

      //Don't draw on top of existing stones that remain (and which are alive)
      if (!board.has(boardLayerTypes.STONES, x, y)) {
        point.draw(context, x, y)
      }
    }
  }
}
