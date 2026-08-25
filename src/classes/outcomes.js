/**
 * Base outcome class
 *
 * NOTE: the payload lives here rather than on the valid outcome alone, because
 * an outcome that reports on something rather than simply permitting it has
 * just as much to say when the answer is no. A move check that finds a ko or a
 * suicide is the case in point: the facts it gathered are exactly what a caller
 * wants in order to explain the refusal.
 */
export class Outcome {
  isValid
  payload
}

/**
 * Valid outcome
 */
export class ValidOutcome extends Outcome {
  isValid = true
  constructor(payload) {
    super()
    if (payload) {
      this.payload = payload
    }
  }
}

/**
 * Error outcome
 */
export class ErrorOutcome extends Outcome {
  isValid = false
  reason = 'No reason provided'
  constructor(reason, payload) {
    super()
    if (reason) {
      this.reason = reason
    }
    if (payload) {
      this.payload = payload
    }
  }
}
