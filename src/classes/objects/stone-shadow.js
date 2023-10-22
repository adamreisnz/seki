import Stone from './stone.js'
import {stoneStyles} from '../../constants/stone.js'

/**
 * Stone shadow class
 */
export default class StoneShadow extends Stone {

  //Style
  style = stoneStyles.SHADOW

  //Parent stone
  parent

  //Additional properties
  size
  blur
  offsetX
  offsetY

  /**
   * Constructor
   */
  constructor(parent) {
    super(parent.board)
    this.parent = parent
  }

  /**
   * Load properties for shadows
   */
  loadProperties() {

    //Load parent stone properties
    const {parent} = this
    const args = parent.loadProperties()

    //Load additional properties
    this.loadThemeProp('scale', ...args)
    this.loadThemeProp('color', ...args)
    this.loadThemeProp('size', ...args)
    this.loadThemeProp('blur', ...args)
    this.loadThemeProp('offsetX', ...args)
    this.loadThemeProp('offsetY', ...args)

    //Get some parent props and determine radius last
    this.alpha = parent.alpha
    this.shadow = parent.shadow
    this.radius = this.getRadius()

    //Pass on args
    return args
  }

  /**
   * Get stone shadow radius, with scaling applied
   */
  getRadius() {
    const {parent, scale} = this
    const radius = Math.max(0, parent.radius - 0.5)
    return Math.round(radius * (scale || 1))
  }

  /**
   * Draw stone shadow
   */
  draw(context, x, y) {

    //Load properties
    this.loadProperties()

    //Check if we should render
    const {alpha, shadow} = this
    if ((alpha && alpha < 1) || !shadow) {
      return
    }

    //Get data
    const {radius, color, blur, offsetX, offsetY} = this
    const absX = this.getAbsX(x)
    const absY = this.getAbsY(y)

    //Configure context
    context.fillStyle = context.createRadialGradient(
      absX + offsetX,
      absY + offsetY,
      radius - 1 - blur,
      absX + offsetX,
      absY + offsetY,
      radius + blur,
    )
    context.fillStyle.addColorStop(0, color)
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
}
