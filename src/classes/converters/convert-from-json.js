import ConvertFromJgf from './convert-from-jgf.js'

/**
 * Convert JGF data in JSON into a seki game object
 */
export default class ConvertFromJson extends ConvertFromJgf {

  /**
   * Convert JGF object into a Seki consumable format
   */
  convert(json) {
    try {
      const jgf = JSON.parse(json)
      return super.convert(jgf)
    }
    catch (error) {
      throw new Error(`Unable to parse JSON: ${error.message}`)
    }
  }
}
