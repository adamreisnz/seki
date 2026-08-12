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
  getAll() {} // eslint-disable-line no-empty-function
  setAll() {} // eslint-disable-line no-empty-function
  removeAll() {} // eslint-disable-line no-empty-function

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
    const backgroundGradient = theme.get('board.backgroundGradient')
    const backgroundImage = theme.get('board.backgroundImage')
    const backgroundImageScale = theme.get('board.backgroundImageScale')
    const {width, height} = context.canvas

    //Background color
    if (backgroundColor) {
      context.fillStyle = backgroundColor
      context.fillRect(0, 0, width, height)
    }

    //Background gradient, following CSS linear-gradient semantics: the angle
    //is in degrees with 0 pointing up and running clockwise, and the gradient
    //line is sized so that the first and last stops touch the corners
    if (backgroundGradient) {
      const {angle = 0, stops = []} = backgroundGradient
      const radians = angle * Math.PI / 180
      const dirX = Math.sin(radians)
      const dirY = -Math.cos(radians)
      const length = Math.abs(width * dirX) + Math.abs(height * dirY)
      const gradient = context.createLinearGradient(
        (width / 2) - (dirX * length / 2),
        (height / 2) - (dirY * length / 2),
        (width / 2) + (dirX * length / 2),
        (height / 2) + (dirY * length / 2)
      )
      for (const [offset, color] of stops) {
        gradient.addColorStop(offset, color)
      }
      context.fillStyle = gradient
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
        const scaledWidth = img.width * backgroundImageScale
        const scaledHeight = img.height * backgroundImageScale

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
