import BoardLayer from './board-layer.js'
import StoneFactory from '../stone-factory.js'
import {boardLayerTypes} from '../../constants/board.js'

/**
 * Stones layer
 */
export default class StonesLayer extends BoardLayer {

  //Type
  type = boardLayerTypes.STONES

  /**
   * Add a single stone
   */
  add(x, y, stone) {
    super.add(x, y, stone)
    const shadow = StoneFactory.createShadow(stone)
    this.board.add(boardLayerTypes.SHADOW, x, y, shadow)
  }

  /**
   * Remove a single stone
   */
  remove(x, y) {
    super.remove(x, y)
    this.board.remove(boardLayerTypes.SHADOW, x, y)
  }

  /**
   * Set all
   */
  setAll(grid) {

    //Erase shadows layer
    this.board.eraseLayer(boardLayerTypes.SHADOW)

    //Parent method
    super.setAll(grid)

    //Create copy of grid with stone shadows
    const shadows = grid
      .map(stone => StoneFactory.createShadow(stone))

    //Set on shadow grid
    this.board.setAll(boardLayerTypes.SHADOW, shadows)
  }

  /**
   * Remove all (erase layer and clear grid)
   */
  removeAll() {

    //Erase shadows layer
    this.board.eraseLayer(boardLayerTypes.SHADOW)

    //Parent method
    super.removeAll()
  }

  /**
   * Apply a set of grid changes, keeping the shadow layer in sync
   *
   * NOTE: the stones are updated cell by cell, but the shadow layer's canvas
   * is redrawn in full at the end, because erasing a single cell there also
   * clips the shadow blur spilling over from neighbouring stones. Its grid
   * is therefore updated quietly here and drawn once.
   */
  applyChanges(changes, createStone) {

    //Get shadow layer and its grid
    const shadowLayer = this.board.getLayer(boardLayerTypes.SHADOW)
    const shadows = shadowLayer.getAll()

    //Remove stones
    for (const {x, y} of changes.remove) {
      super.remove(x, y)
      shadows.delete(x, y)
    }

    //Add stones
    for (const {x, y, value} of changes.add) {
      const stone = createStone(value)
      super.add(x, y, stone)
      shadows.set(x, y, StoneFactory.createShadow(stone))
    }

    //Redraw the shadow layer once
    shadowLayer.redraw()
  }
}
