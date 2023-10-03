import SgfToJgf from './parsers/sgf-to-jgf.js'

/**
 * This is a class which can parse kifu formats of various types
 */
export default class KifuParser {

  /**
   * Convert JSON to JGF
   */
  static jsonToJgf(json) {
    try {
      return JSON.parse(json)
    }
    catch (error) {
      return null
    }
  }

  /**
   * Convert SGF to JGF
   */
  static sgfToJgf(sgf) {
    const converter = new SgfToJgf()
    return converter.parse(sgf)
  }
}
