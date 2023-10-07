import BoardLayer from '../board-layer.js'
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

    //Add to stones layer
    super.add(x, y, stone)

    //Create shadow copy
    const shadow = this.createStoneShadow(stone)

    //Also add to shadows layer
    this.board.add(boardLayerTypes.SHADOW, x, y, shadow)
  }

  /**
   * Remove a single stone
   */
  remove(x, y) {

    //Remove from stones layer
    super.remove(x, y)

    //Also remove from shadows layer
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
      .map(stone => this.createStoneShadow(stone))

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
   * Create stone shadow
   */
  createStoneShadow(stone) {
    return StoneFactory.createShadowCopy(stone)
  }
}
