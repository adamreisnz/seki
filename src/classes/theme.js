import merge from 'deepmerge'
import {get, set} from '../helpers/object.js'
import defaultTheme from '../themes/default.js'

/**
 * This class representes the theme of a Go board. It contains all tweakable
 * visual aspects like colors, dimensions, used stone style, etc. It is very
 * flexible and allows you to use static values or dynamic values depending on
 * other properties, like the grid cell size.
 */
export default class Theme {

  /**
   * Board theme constructor
   */
  constructor(config) {

    //Set theme config
    if (config) {
      this.setThemeConfig(config)
    }
    else {
      this.resetToDefaults()
    }
  }

  /**
   * Change the theme
   */
  setThemeConfig(config) {
    this.config = merge.all([defaultTheme, config || {}])
  }

  /**
   * Reset to defaults
   */
  resetToDefaults() {
    this.config = merge.all([defaultTheme, {}])
  }

  /**
   * Get a theme property
   */
  get(property, ...args) {

    //Get value
    const value = get(this.config, property)

    //Function
    if (typeof value === 'function') {
      return value.call(this, ...args)
    }

    //Return value as is
    return value
  }

  /**
   * Change a theme property dynamically (accepts handler function as value)
   */
  set(property, value) {
    set(this.config, property, value)
  }

  /**
   * To combat 2d canvas blurry lines, we translate the canvas prior to drawing elements.
   * See: http://www.mobtowers.com/html5-canvas-crisp-lines-every-time/
   */
  canvasTranslate(lineWidth) {

    //If no linewidth specified, use the grid line width as a reference
    //to make sure stuff is aligned to the grid
    if (typeof lineWidth === 'undefined') {
      lineWidth = this.get('grid.lineWidth')
    }

    //Return a translation for uneven widths
    return (lineWidth % 2) * 0.5
  }
}
