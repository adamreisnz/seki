import Stone from './stone.js'
import {stoneStyles, stoneColors} from '../../constants/stone.js'

//Random shell seed (needs to be global otherwise stones will
//be different each time they're drawn)
const seed = Math.ceil(Math.random() * 9999999)

/**
 * Slate & shell stone class
 */
export default class StoneSlateShell extends Stone {

  //Style
  style = stoneStyles.SLATE_SHELL

  //Additional properties
  shellTypes
  shellStroke

  /**
   * Load additional properties for this stone type
   */
  loadProperties() {

    //Load parent properties
    const args = super.loadProperties()

    //Load additional properties
    this.loadThemeProp('shellTypes', ...args)
    this.loadThemeProp('shellStroke', ...args)

    //Pass on args
    return args
  }

  /**
   * Draw slate and shell stones
   */
  draw(context, x, y) {

    //Load properties and prepare context
    this.loadProperties()
    this.prepareContext(context)

    //Draw stone
    if (this.displayColor === stoneColors.WHITE) {
      this.drawShellStone(context, x, y)
    }
    else {
      this.drawSlateStone(context, x, y)
    }

    //Restore context
    this.restoreContext(context)
  }

  /**
   * Draw slate stone
   */
  drawSlateStone(context, x, y) {

    //Get data
    const {color, radius} = this
    const absX = this.getAbsX(x)
    const absY = this.getAbsY(y)

    //Draw stone
    context.beginPath()
    context.arc(absX, absY, Math.max(0, radius - 0.5), 0, 2 * Math.PI, true)
    context.fillStyle = color
    context.fill()

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
    context.fillStyle.addColorStop(0, 'rgba(90,90,90,1)')
    context.fillStyle.addColorStop(0.5, 'rgba(0,0,0,0.2)')
    context.fillStyle.addColorStop(1, 'rgba(0,0,0,0)')
    context.arc(absX, absY, Math.max(0, radius - 0.5), 0, 2 * Math.PI, true)
    context.fill()
  }

  /**
   * Draw shell stone
   */
  drawShellStone(context, x, y) {

    //Get data
    const {board, color, radius, shellTypes} = this
    const absX = this.getAbsX(x)
    const absY = this.getAbsY(y)

    //Get random shell type
    const len = shellTypes.length
    const type = seed % (len + x * board.width + y) % len
    const style = shellTypes[type]

    //Determine random angle
    const z = board.width * board.height + x * board.width + y
    const angle = (2 / z) * (seed % z)

    //Draw stone
    context.beginPath()
    context.arc(absX, absY, Math.max(0, radius - 0.5), 0, 2 * Math.PI, true)
    context.fillStyle = color
    context.fill()

    //Draw shell pattern
    this.drawShellPattern(context, style, absX, absY, angle)

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
    context.fillStyle.addColorStop(0, 'rgba(255,255,255,0.95)')
    context.fillStyle.addColorStop(0.1, 'rgba(255,255,255,0.85)')
    context.fillStyle.addColorStop(0.5, 'rgba(255,255,255,0.5)')
    context.fillStyle.addColorStop(1, 'rgba(255,255,255,0.1)')
    context.arc(absX, absY, Math.max(0, radius - 0.5), 0, 2 * Math.PI, true)
    context.fill()
  }

  /**
   * Helper to draw a shell pattern
   */
  drawShellPattern(context, style, x, y, angle) {

    //Get lines from style
    const {lines} = style

    //Initialize start and end angle
    let startAngle = angle
    let endAngle = angle

    //Loop lines
    for (let i = 0; i < lines.length; i++) {
      startAngle += lines[i]
      endAngle -= lines[i]
      this.drawShellLine(context, style, x, y, startAngle, endAngle)
    }
  }

  /**
   * Helper to draw a shell line
   */
  drawShellLine(
    context, style, x, y, startAngle, endAngle,
  ) {

    //Get data
    const {radius, shellStroke} = this
    const {thickness, factor} = style

    //Initialize
    context.shadowBlur = 2
    context.strokeStyle = shellStroke
    context.lineWidth = (radius / 30) * thickness
    context.beginPath()

    //Lower radius
    const r = radius - Math.max(1, context.lineWidth)

    //Determine coordinates
    const x1 = x + r * Math.cos(startAngle * Math.PI)
    const y1 = y + r * Math.sin(startAngle * Math.PI)
    const x2 = x + r * Math.cos(endAngle * Math.PI)
    const y2 = y + r * Math.sin(endAngle * Math.PI)

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
    const c = factor * r
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
