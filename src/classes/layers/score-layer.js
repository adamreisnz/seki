import BoardLayer from './board-layer.js'
import StoneFactory from '../stone-factory.js'
import {boardLayerTypes} from '../../constants/board.js'
import {stoneModifierStyles} from '../../constants/stone.js'

/**
 * Score layer
 */
export default class ScoreLayer extends BoardLayer {

  //Type
  type = boardLayerTypes.SCORE

  //Helper vars
  points = []
  captures = []

  /**
   * Set points and captures
   */
  setAll(pointsGrid, capturesGrid) {

    //Remove all existing
    this.removeAll()

    //Set
    this.points = pointsGrid.getAll()
    this.captures = capturesGrid.getAll()

    //Get data
    const {board, captures} = this

    //Remove captures from stones layer
    for (const entry of captures) {
      const {x, y} = entry
      board.remove(boardLayerTypes.STONES, x, y)
    }
  }

  /**
   * Remove all scoring
   */
  removeAll() {

    //Get data
    const {board, captures} = this

    //If there were captures, add them back onto the stones layer
    for (const entry of captures) {
      const {x, y, value} = entry
      board.add(boardLayerTypes.STONES, x, y, value)
    }

    //Erase the layer
    this.erase()

    //Clear points and captures
    this.points = []
    this.captures = []
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
    const {context, captures, points} = this

    //Draw captures first
    for (const entry of captures) {
      const {x, y, value: stone} = entry
      const capture = StoneFactory
        .createCopy(stone, stoneModifierStyles.CAPTURES)
      capture.draw(context, x, y)
    }

    //Draw points on top of it
    for (const entry of points) {
      const {x, y, value: stone} = entry
      const point = StoneFactory
        .createCopy(stone, stoneModifierStyles.POINTS)
      point.draw(context, x, y)
    }
  }
}
