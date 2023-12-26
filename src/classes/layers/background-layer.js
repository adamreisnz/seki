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

        //Create image scaling canvas to upscale background image
        const scalingCanvas = document.createElement('canvas')
        const scalingContext = scalingCanvas.getContext('2d')
        const scaledWidth = img.width / 2
        const scaledHeight = img.height / 2

        //Set the size and draw image on it
        scalingCanvas.width = scaledWidth
        scalingCanvas.height = scaledHeight
        scalingContext.drawImage(
          img,
          0, 0, img.width, img.height,
          0, 0, scaledWidth, scaledHeight
        )

        //Create pattern for actual canvas now
        const pattern = context.createPattern(scalingCanvas, 'repeat')
        context.fillStyle = pattern
        context.fillRect(0, 0, width, height)
      })
    }
  }
}
