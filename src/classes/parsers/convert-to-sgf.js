import KifuFactory from '../kifu-factory.js'

/**
 * Converter to SGF
 */
export default class ConvertToSgf {

  /**
   * Convert Seki game object to SGF
   */
  convert(game) {

    //Initialize
    const sgf = KifuFactory.blankSgf()

    //TODO convert game

    //Return JGF
    return sgf
  }
}
