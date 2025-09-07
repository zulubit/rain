/**
 * Test setup - intercept error logging to keep console clean
 */

import { beforeEach, afterEach } from 'vitest'
import { setErrorHandler, clearErrorHandler } from '../src/error-utils.js'

// Global setup to intercept error logs during tests
let originalConsoleError
let interceptedErrors = []

beforeEach(() => {
  // Store original console.error in case logError falls through
  originalConsoleError = console.error
  console.error = () => {} // Suppress any console.error calls
  
  // Set up error handler to capture validation errors but let component errors be graceful
  interceptedErrors = []
  setErrorHandler((error) => {
    interceptedErrors.push(error)
    // Only throw validation errors (from throwError calls)
    // Let component runtime errors be handled gracefully
    const isValidationError = error.message.includes('expects') || 
                             error.message.includes('required') || 
                             error.message.includes('must be') ||
                             error.message.includes('must return') ||
                             error.message.includes('not allowed') ||
                             error.message.includes('called outside')
    if (isValidationError) {
      throw error
    }
    // Component errors are logged but not re-thrown
  })
})

afterEach(() => {
  clearErrorHandler()
  console.error = originalConsoleError
  interceptedErrors = []
})