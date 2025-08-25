/**
 * @fileoverview RainWC Utilities - Shared utility functions across the framework
 * @version 0.0.8
 */

/**
 * Check if debug logging is enabled
 * @returns {boolean} True if debug logging is enabled
 */
export const isDebugEnabled = () => typeof window !== 'undefined' && window.RAIN_DEBUG

/**
 * Simple debug logging helper
 * @param {string} namespace - Debug namespace
 * @param {string} message - Debug message
 * @param {any} [data] - Optional debug data
 */
export function debugLog(namespace, message, data) {
  if (isDebugEnabled()) {
    console.log(`[Rain:${namespace}] ${message}`, data || '')
  }
}

/**
 * Checks if a value is a Preact signal
 * @param {any} value - Value to check
 * @returns {boolean} True if value is a signal
 */
export function isSignal(value) {
  return value && typeof value === 'object' && 'value' in value && 'peek' in value
}
