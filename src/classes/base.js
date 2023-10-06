import merge from 'deepmerge'

/**
 * Base class for player, board and theme classes
 */
export default class Base extends EventTarget {

  /**
   * Init config
   */
  initConfig(config, defaultConfig) {
    this.config = merge.all([defaultConfig, config || {}])
  }

  /**
   * Get a config flag
   */
  getConfig(key, defaultValue) {
    if (this.config[key] === undefined) {
      return defaultValue
    }
    return this.config[key]
  }

  /**
   * Set a config flag
   */
  setConfig(key, value) {
    this.config[key] = value
  }

  /**
   * Toggle a config flag
   */
  toggleConfig(key, value) {
    if (value === true || value === false) {
      this.config[key] = value
    }
    else {
      this.config[key] = !this.config[key]
    }
  }

  /**
   * Load config from an object
   */
  loadConfig(config) {
    if (!config) {
      return
    }
    for (const key in config) {
      this.setConfig(key, config[key])
    }
  }
}
