
/**
 * This class helps tracking event handlers and allows them to be removed
 * easily as well, without tracking the underlying functions in your own
 * classes. It also allows you to namespace events.
 */
export default class EventHandler {

  /**
   * Constructor
   */
  constructor(element) {

    //No element
    if (!element) {
      throw new Error(`Must instantiate with target element`)
    }

    //Init
    this.element = element
    this.handlers = new Map()
    this.throttles = new Map()
  }

  /**
   * Add event listener
   */
  on(event, fn, throttleDelay = 0) {

    //Get element and split off namespace from event
    const {element} = this
    const type = event.split('.')[0]
    const isThrottling = (throttleDelay > 0)

    //Replace any existing handler registered under this key, otherwise the
    //old one is dropped from the map and can never be removed again
    if (this.handlers.has(event)) {
      this.off(event)
    }

    //Create handler
    const handler = (...args) => {

      //Inside the throttle window, ignore this event
      if (isThrottling && this.throttles.has(event)) {
        return
      }

      //Call the function
      fn(...args)

      //Not throttling, done
      if (!isThrottling) {
        return
      }

      //Open the throttle window. NOTE: this timeout is deliberately left to
      //run its course rather than being reset by subsequent events. Resetting
      //it means a continuous stream of events keeps pushing the window out,
      //and the handler never gets to run again.
      const timeout = setTimeout(() => {
        this.throttles.delete(event)
      }, throttleDelay)

      //Set in throttles
      this.throttles.set(event, timeout)
    }

    //Store in handlers map
    this.handlers.set(event, handler)

    //Add listener
    element.addEventListener(type, handler)
  }

  /**
   * Remove event listener
   */
  off(event) {
    const handler = this.handlers.get(event)
    const type = event.split('.')[0]
    const {element} = this
    if (handler) {
      element.removeEventListener(type, handler)
    }
    this.clearThrottle(event)
    this.handlers.delete(event)
  }

  /**
   * Remove all event listeners
   */
  removeAllEventListeners() {
    const {element} = this
    this.handlers.forEach((handler, event) => {
      const type = event.split('.')[0]
      element.removeEventListener(type, handler)
      this.clearThrottle(event)
    })
    this.handlers.clear()
    this.throttles.clear()
  }

  /**
   * Clear a pending throttle window, so its timer doesn't outlive the handler
   */
  clearThrottle(event) {
    const timeout = this.throttles.get(event)
    if (timeout) {
      clearTimeout(timeout)
    }
    this.throttles.delete(event)
  }
}
