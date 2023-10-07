import Stone from './stone.js'

/**
 * Mono stone class
 */
export default class StoneMono extends Stone {

  /**
   * Constructor
   */
  constructor(board, color, data) {

    //Parent constructor
    super(board, color, data)

    //Don't draw shadows
    this.shadow = false
  }

  /**
   * Draw mono stones
   */
  draw(context, x, y) {

    //Get data
    const {board, theme} = this

    //Get coordinates and stone radius
    const absX = board.getAbsX(x)
    const absY = board.getAbsY(y)
    const radius = this.getRadius()
    const color = this.getColor()

    //Get theme variables
    const cellSize = board.getCellSize()
    const lineWidth = theme.get('stone.mono.lineWidth', cellSize) || 1
    const fillStyle = theme.get('stone.mono.color', color)
    const strokeStyle = theme.get('stone.mono.lineColor', color)
    const canvasTranslate = theme.canvasTranslate()

    //Prepare context
    this.prepareContext(context, canvasTranslate)

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

    //Restore context
    this.restoreContext(context, canvasTranslate)
  }
}
