
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

    //Create handler
    const handler = (...args) => {

      //Not throttled, call function
      if (!isThrottling || !this.throttles.has(event)) {
        fn(...args)
      }

      //Flag as throttled
      if (isThrottling) {

        //Clear the previous timeout
        const existing = this.throttles.get(event)
        if (existing) {
          clearTimeout(existing)
        }

        //Setup new timeout
        const timeout = setTimeout(() => {
          this.throttles.delete(event)
        }, throttleDelay)

        //Set in throttles
        this.throttles.set(event, timeout)
      }
    }

    //Store in handlers and throttles map
    this.handlers.set(event, handler)
    this.throttles.set(event, false)

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
    element.removeEventListener(type, handler)
    this.handlers.delete(event)
    this.throttles.delete(event)
  }

  /**
   * Remove all event listeners
   */
  removeAllEventListeners() {
    const {element} = this
    this.handlers.forEach((handler, event) => {
      const type = event.split('.')[0]
      element.removeEventListener(type, handler)
    })
    this.handlers.clear()
    this.throttles.clear()
  }
}
