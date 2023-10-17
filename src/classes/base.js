import {getDebug} from '../helpers/util.js'
import {merge, copy} from '../helpers/object.js'

/**
 * Base class for player, board and theme classes
 */
export default class Base extends EventTarget {

  /*************************d*************************************************
   * Debugging and error handling
   ***/

  /**
   * Debugging helper
   */
  debug(...args) {
    if (getDebug()) {
      console.log(`${this.constructor.name}:`, ...args)
    }
  }

  /**
   * Warning helper
   */
  warn(...args) {
    if (getDebug()) {
      console.warn(`${this.constructor.name}:`, ...args)
    }
  }

  /**************************************************************************
   * Configuration helpers
   ***/

  /**
   * Init config
   */
  initConfig(config, defaultConfig) {
    this.config = merge(defaultConfig, config)
  }

  /**
   * Get a copy of config
   */
  getConfigCopy() {
    return copy(this.config)
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
    this.debug(`config ${key} changed to`, value)
    this.triggerEvent('config', {key, value})
  }

  /**
   * Toggle a config flag
   */
  toggleConfig(key, value) {
    if (value === true || value === false) {
      this.setConfig(key, value)
    }
    else {
      this.setConfig(key, !this.config[key])
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

  /**************************************************************************
   * Event handling
   ***/

  /**
   * Bind event listener
   */
  on(type, listener) {
    this.addEventListener(type, listener)
  }

  /**
   * Remove event listener
   */
  off(type, listener) {
    this.removeEventListener(type, listener)
  }

  /**
   * Trigger an event
   */
  triggerEvent(type, detail) {

    //Must have type
    if (!type) {
      return
    }

    //Create new event and dispatch it
    const event = new CustomEvent(type, {detail})
    this.dispatchEvent(event)
  }
}
