import BoardLayer from './board-layer.js'
import {boardLayerTypes} from '../../constants/board.js'

/**
 * Background layer
 */
export default class BackgroundLayer extends BoardLayer {

  //Type
  type = boardLayerTypes.BACKGROUND

  /**
   * Unneeded methods
   */
  getAll() {}
  setAll() {}
  removeAll() {}

  /**
   * Draw method
   */
  draw() {

    //Check if can draw
    if (!this.canDraw()) {
      return
    }

    //Get data
    const {theme, context} = this
    const background = theme.get('board.background')
    const {width, height} = context.canvas

    //Load image
    const img = new Image()
    img.src = background
    img.addEventListener('load', () => {
      const pattern = context.createPattern(img, 'repeat')
      context.fillStyle = pattern
      context.fillRect(0, 0, width, height)
    })
  }
}
