import Stone from './stone.js'

/**
 * Mono stone class
 */
export default class StoneMono extends Stone {

  /**
   * Constructor
   */
  constructor(board, layer) {

    //Parent constructor
    super(board, layer)

    //Don't draw shadows
    this.shadow = false
  }

  /**
   * Draw mono stones
   */
  draw(context, gridX, gridY) {

    //Get data
    const {board, theme, alpha} = this

    //Get coordinates and stone radius
    const absX = board.getAbsX(gridX)
    const absY = board.getAbsY(gridY)
    const radius = this.getRadius()
    const color = this.getColor()

    //Get theme variables
    const cellSize = board.getCellSize()
    const lineWidth = theme.get('stone.mono.lineWidth', cellSize) || 1
    const fillStyle = theme.get('stone.mono.color', color)
    const strokeStyle = theme.get('stone.mono.lineColor', color)
    const canvasTranslate = theme.canvasTranslate()

    //Translate canvas
    context.translate(canvasTranslate, canvasTranslate)

    //Apply transparency?
    if (alpha && alpha < 1) {
      context.globalAlpha = alpha
    }

    //Configure context
    context.fillStyle = fillStyle

    //Draw stone
    context.beginPath()
    context.arc(
      absX,
      absY,
      Math.max(0, radius - lineWidth),
      0,
      2 * Math.PI,
      true,
    )
    context.fill()

    //Configure context
    context.lineWidth = lineWidth
    context.strokeStyle = strokeStyle

    //Draw outline
    context.stroke()

    //Undo transparency?
    if (alpha && alpha < 1) {
      context.globalAlpha = 1
    }

    //Undo translation
    context.translate(-canvasTranslate, -canvasTranslate)
  }
}
