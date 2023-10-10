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
}
