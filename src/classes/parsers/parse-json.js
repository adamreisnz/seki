import ParseJgf from './parse-jgf.js'

/**
 * Parse JGF data in JSON into a seki game object
 */
export default class ParseJson extends ParseJgf {

  /**
   * Convert JGF object into a Seki consumable format
   */
  parse(json) {
    try {
      const jgf = JSON.parse(json)
      return super.parse(jgf)
    }
    catch (error) {
      throw new Error(`Unable to parse JSON: ${error.message}`)
    }
  }
}
