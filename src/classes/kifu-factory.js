import {blankJgf, blankSgf} from '../constants/kifu.js'
import {appName, appVersion} from '../constants/app.js'

/**
 * This is a class which can generate Kifu records of various types
 */
export default class KifuFactory {

  /**
   * Get blank JGF
   */
  static blankJgf(data) {
    return this.makeBlank(blankJgf, data)
  }

  /**
   * Get blank SGF
   */
  static blankSgf(data) {
    return this.makeBlank(blankSgf, data)
  }

  /**
   * Helper to make a blank
   */
  static makeBlank(base, data) {

    //Initialize blank
    const blank = JSON.parse(JSON.stringify(base))

    //Data given?
    if (data) {
      for (const key in data) {
        blank[key] = Object.assign({}, blank[key] || {}, data[key])
      }
    }

    //Return
    return blank
  }

  /**
   * Sign a JGF kifu record with our app signature
   */
  static sign(jgf) {
    jgf.record = jgf.record || {}
    jgf.record.generator = `${appName} v${appVersion}`
  }
}
