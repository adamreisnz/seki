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
    const backgroundColor = theme.get('board.backgroundColor')
    const backgroundImage = theme.get('board.backgroundImage')
    const {width, height} = context.canvas

    //Background color
    if (backgroundColor) {
      context.fillStyle = backgroundColor
      context.fillRect(0, 0, width, height)
    }

    //Background image
    if (backgroundImage) {
      const img = new Image()
      img.src = backgroundImage
      img.addEventListener('load', () => {
        const pattern = context.createPattern(img, 'repeat')
        context.fillStyle = pattern
        context.fillRect(0, 0, width, height)
      })
    }
  }
}
