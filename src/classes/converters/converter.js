import {appName, appVersion} from '../../constants/app.js'
import {handicapPlacements} from '../../constants/game.js'
import {setupTypes} from '../../constants/setup.js'
import {flip} from '../../helpers/object.js'

//Cache of inverted maps, keyed on the map itself. The maps being inverted are
//the module level constants in constants/sgf.js, so there is a small fixed
//number of them, and each gets flipped once instead of once per lookup.
//Parsing an SGF asks for a mapped value for every colour, markup type and
//setup type it comes across.
const inverseMaps = new WeakMap()

/**
 * Base class for converters
 */
export default class Converter {

  /**
   * Get a mapped value
   */
  getMappedValue(value, map, inverse = false) {

    //Inverse the map?
    if (inverse) {
      if (!inverseMaps.has(map)) {
        inverseMaps.set(map, flip(map))
      }
      map = inverseMaps.get(map)
    }

    //Return mapped value
    return map[value]
  }

  /**
   * Place the handicap stones for a handicap game on the root node
   *
   * This is for the formats that record a handicap as a count alone, leaving
   * the reader to place the stones the server would have placed. An override
   * table can be passed for a server that is known to differ from the
   * standard placement, and is consulted before it.
   */
  placeHandicapStones(game, handicap, boardSize, overrides = null) {

    //Nothing to place
    if (handicap < 2) {
      return
    }

    //Find the placement to use
    const placement = this.findHandicapPlacement(handicap, boardSize, overrides)
    if (!placement) {
      return
    }

    //Add the stones to the root node as setup instructions
    for (const {x, y} of placement) {
      game.root.addSetup(x, y, {type: setupTypes.BLACK})
    }
  }

  /**
   * Find the handicap placement to use, which is the standard one for this
   * board size unless the given overrides differ from it
   */
  findHandicapPlacement(handicap, boardSize, overrides = null) {
    const override = overrides && overrides[boardSize]
    if (override && override[handicap]) {
      return override[handicap]
    }
    const standard = handicapPlacements[boardSize]
    return (standard && standard[handicap]) || null
  }

  /**
   * Helper to get generator signature string
   */
  getGeneratorSignature() {
    return `${appName} v${appVersion}`
  }
}
