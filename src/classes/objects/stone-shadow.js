import Stone from './stone.js'

/**
 * Stone shadow class
 */
export default class StoneShadow extends Stone {

  /**
   * Draw stone shadow
   */
  draw(context, gridX, gridY) {

    //Get data
    const {alpha, shadow} = this

    //Don't draw shadows if there is stone alpha or if explicitly stated
    if ((alpha && alpha < 1) || shadow === false) {
      return
    }

    //Get data
    const {board, theme} = this

    //Get coordinates and stone radius
    const absX = board.getAbsX(gridX)
    const absY = board.getAbsY(gridY)
    const radius = this.getRadius()

    //Get theme properties
    const cellSize = board.getCellSize()
    const blur = theme.get('shadow.blur', cellSize)
    const offsetX = theme.get('shadow.offsetX', cellSize)
    const offsetY = theme.get('shadow.offsetY', cellSize)
    const shadowColor = theme.get('shadow.color')

    //Configure context
    context.fillStyle = context.createRadialGradient(
      absX + offsetX,
      absY + offsetY,
      radius - 1 - blur,
      absX + offsetX,
      absY + offsetY,
      radius + blur,
    )
    context.fillStyle.addColorStop(0, shadowColor)
    context.fillStyle.addColorStop(1, 'rgba(0,0,0,0)')

    //Draw shadow
    context.beginPath()
    context.arc(
      absX + offsetX,
      absY + offsetY,
      radius + blur,
      0,
      2 * Math.PI,
      true,
    )
    context.fill()
  }

  /**************************************************************************
   * Helpers
   ***/

  /**
   * Get stone shadow radius, with scaling applied
   */
  getRadius() {

    //Get data
    const {board, theme, scale} = this
    const cellSize = board.getCellSize()
    const radius = Math.max(0, theme.get('stone.radius', cellSize) - 0.5)

    //No scaling factor
    if (scale === 1) {
      return radius
    }

    //Scale
    return Math.round(radius * scale)
  }
}
