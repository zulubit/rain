/**
 * @fileoverview Simple error utilities for better testing and debugging
 */

// Global error handler for testing
let errorHandler = null

/**
 * Set a global error handler (mainly for testing)
 * @param {(error: Error) => void} handler
 */
export function setErrorHandler(handler) {
  errorHandler = handler
}

/**
 * Clear the global error handler
 */
export function clearErrorHandler() {
  errorHandler = null
}

/**
 * Throw an error, but allow global handler to intercept for testing
 * @param {string} message
 * @throws {Error}
 */
export function throwError(message) {
  const error = new Error(message)

  if (errorHandler) {
    errorHandler(error)
    return
  }

  throw error
}

/**
 * Log an error, but allow global handler to intercept for testing
 * @param {string} message
 * @param {Error} [error]
 */
export function logError(message, error) {
  const errorObj = error || new Error(message)

  if (errorHandler) {
    errorHandler(errorObj)
    return
  }

  console.error(message, error || '')
}
