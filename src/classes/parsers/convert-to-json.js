import ConvertToJgf from './convert-to-jgf.js'

/**
 * Converter to JGF
 */
export default class ConvertToJson extends ConvertToJgf {

  /**
   * Convert Seki game object to JGF JSON
   */
  convert(game) {

    //Convert to JGF first
    const jgf = super.output(game)

    //Convert to JSON
    return JSON.stringify(jgf, null, 2)
  }
}
