import Stone from './stone.js'
import {stoneColors} from '../../constants/index.js'

//Random shell seed
const seed = Math.ceil(Math.random() * 9999999)

/**
 * Slate & shell stone class
 */
export default class StoneSlateShell extends Stone {

  /**
   * Draw slate and shell stones
   */
  draw(context) {

    //Check can draw
    if (!context || !this.canDraw(context)) {
      return
    }

    //Get data
    const {board, theme, alpha, x, y} = this

    //Get coordinates and stone radius
    const absX = board.getAbsX(x)
    const absY = board.getAbsY(y)
    const radius = this.getRadius()
    const color = this.getColor()

    //Get theme variables
    const shellTypes = theme.get('stone.shell.types')
    const fillStyle = theme.get('stone.shell.color', color)
    const strokeStyle = theme.get('stone.shell.stroke')
    const canvasTranslate = theme.canvasTranslate()

    //Translate canvas
    context.translate(canvasTranslate, canvasTranslate)

    //Apply transparency?
    if (alpha && alpha < 1) {
      context.globalAlpha = alpha
    }

    //Draw stone
    context.beginPath()
    context.arc(absX, absY, Math.max(0, radius - 0.5), 0, 2 * Math.PI, true)
    context.fillStyle = fillStyle
    context.fill()

    //Shell stones
    if (color === stoneColors.WHITE) {

      //Get random shell type
      const len = shellTypes.length
      const type = seed % (len + x * board.width + y) % len
      const style = shellTypes[type]

      //Determine random angle
      const z = board.width * board.height + x * board.width + y
      const angle = (2 / z) * (seed % z)

      //Draw shell pattern
      this.shellPattern(style, absX, absY, radius, angle, strokeStyle)

      //Add radial gradient
      context.beginPath()
      context.fillStyle = context.createRadialGradient(
        absX - 2 * radius / 5,
        absY - 2 * radius / 5,
        radius / 6,
        absX - radius / 5,
        absY - radius / 5,
        radius,
      )
      context.fillStyle.addColorStop(0, 'rgba(255,255,255,0.9)')
      context.fillStyle.addColorStop(1, 'rgba(255,255,255,0)')
      context.arc(absX, absY, Math.max(0, radius - 0.5), 0, 2 * Math.PI, true)
      context.fill()
    }

    //Slate stones
    else {

      //Add radial gradient
      context.beginPath()
      context.fillStyle = context.createRadialGradient(
        absX + 2 * radius / 5,
        absY + 2 * radius / 5,
        0,
        absX + radius / 2,
        absY + radius / 2,
        radius,
      )
      context.fillStyle.addColorStop(0, 'rgba(32,32,32,1)')
      context.fillStyle.addColorStop(1, 'rgba(0,0,0,0)')
      context.arc(absX, absY, Math.max(0, radius - 0.5), 0, 2 * Math.PI, true)
      context.fill()

      //Add radial gradient
      context.beginPath()
      context.fillStyle = context.createRadialGradient(
        absX - 2 * radius / 5,
        absY - 2 * radius / 5,
        1,
        absX - radius / 2,
        absY - radius / 2,
        3 * radius / 2,
      )
      context.fillStyle.addColorStop(0, 'rgba(64,64,64,1)')
      context.fillStyle.addColorStop(1, 'rgba(0,0,0,0)')
      context.arc(absX, absY, Math.max(0, radius - 0.5), 0, 2 * Math.PI, true)
      context.fill()
    }

    //Undo transparency?
    if (alpha && alpha < 1) {
      context.globalAlpha = 1
    }

    //Undo translation
    context.translate(-canvasTranslate, -canvasTranslate)
  }

  /**
   * Helper to draw a shell pattern
   */
  shellPattern(style, x, y, radius, angle, strokeStyle) {

    //Get lines from style
    const {lines} = style

    //Initialize start and end angle
    let startAngle = angle
    let endAngle = angle

    //Loop lines
    for (let i = 0; i < lines.length; i++) {
      startAngle += lines[i]
      endAngle -= lines[i]
      this.shellLine(style, x, y, radius, startAngle, endAngle, strokeStyle)
    }
  }

  /**
   * Helper to draw a shell line
   */
  shellLine(style, x, y, radius, startAngle, endAngle, strokeStyle) {

    //Get context
    const {context} = this
    const {thickness, factor} = style

    //Initialize
    context.shadowBlur = 2
    context.strokeStyle = strokeStyle
    context.lineWidth = (radius / 30) * thickness
    context.beginPath()

    //Lower radius
    radius -= Math.max(1, context.lineWidth)

    //Determine coordinates
    const x1 = x + radius * Math.cos(startAngle * Math.PI)
    const y1 = y + radius * Math.sin(startAngle * Math.PI)
    const x2 = x + radius * Math.cos(endAngle * Math.PI)
    const y2 = y + radius * Math.sin(endAngle * Math.PI)

    //Math magic
    let m, angle
    if (x2 > x1) {
      m = (y2 - y1) / (x2 - x1)
      angle = Math.atan(m)
    }
    else if (x2 === x1) {
      angle = Math.PI / 2
    }
    else {
      m = (y2 - y1) / (x2 - x1)
      angle = Math.atan(m) - Math.PI
    }

    //Curvature factor
    const c = factor * radius
    const dx = Math.sin(angle) * c
    const dy = Math.cos(angle) * c

    //Curvature coordinates
    const bx1 = x1 + dx
    const by1 = y1 - dy
    const bx2 = x2 + dx
    const by2 = y2 - dy

    //Draw shell stroke
    context.moveTo(x1, y1)
    context.bezierCurveTo(bx1, by1, bx2, by2, x2, y2)
    context.stroke()
  }
}
