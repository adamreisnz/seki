import {appName, appVersion} from '../../constants/app.js'
import {flip} from '../../helpers/object.js'

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
      map = flip(map)
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
