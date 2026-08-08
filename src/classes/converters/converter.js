import {appName, appVersion} from '../../constants/app.js'
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
   * Helper to get generator signature string
   */
  getGeneratorSignature() {
    return `${appName} v${appVersion}`
  }
}
