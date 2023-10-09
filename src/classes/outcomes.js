
/**
 * Base outcome class
 */
export class Outcome {
  isValid
}

/**
 * Valid outcome
 */
export class ValidOutcome extends Outcome {
  isValid = true
  payload
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
  constructor(reason) {
    super()
    if (reason) {
      this.reason = reason
    }
  }
}
