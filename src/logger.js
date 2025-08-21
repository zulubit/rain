/**
 * @fileoverview RainJS Logger - Structured logging utility for development
 * @version 0.0.3
 */

import { isDebugEnabled } from './utils.js'

/**
 * Log levels for filtering output
 */
const LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
}

/**
 * Get current log level from window or default
 */
function getCurrentLogLevel() {
  return typeof window !== 'undefined' && window.RAIN_LOG_LEVEL !== undefined
    ? window.RAIN_LOG_LEVEL
    : LogLevel.WARN
}

/**
 * Logger class with structured output and proper grouping
 */
class Logger {
  constructor(namespace) {
    this.namespace = namespace
    this._openGroups = 0 // Track open console groups
  }

  _shouldLog(level) {
    return isDebugEnabled() && level <= getCurrentLogLevel()
  }

  _formatMessage(level, message) {
    const levelNames = ['ERROR', 'WARN', 'INFO', 'DEBUG']
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0]
    return `[${timestamp}] [${levelNames[level]}] [${this.namespace}] ${message}`
  }

  error(message, ...data) {
    if (this._shouldLog(LogLevel.ERROR)) {
      if (data.length > 0) {
        console.group(this._formatMessage(LogLevel.ERROR, message))
        data.forEach(item => console.error(item))
        console.groupEnd()
      } else {
        console.error(this._formatMessage(LogLevel.ERROR, message))
      }
    }
  }

  warn(message, ...data) {
    if (this._shouldLog(LogLevel.WARN)) {
      if (data.length > 0) {
        console.group(this._formatMessage(LogLevel.WARN, message))
        data.forEach(item => console.warn(item))
        console.groupEnd()
      } else {
        console.warn(this._formatMessage(LogLevel.WARN, message))
      }
    }
  }

  info(message, ...data) {
    if (this._shouldLog(LogLevel.INFO)) {
      if (data.length > 0) {
        console.group(this._formatMessage(LogLevel.INFO, message))
        data.forEach(item => console.log(item))
        console.groupEnd()
      } else {
        console.log(this._formatMessage(LogLevel.INFO, message))
      }
    }
  }

  debug(message, ...data) {
    if (this._shouldLog(LogLevel.DEBUG)) {
      if (data.length > 0) {
        console.group(this._formatMessage(LogLevel.DEBUG, message))
        data.forEach(item => console.log(item))
        console.groupEnd()
      } else {
        console.log(this._formatMessage(LogLevel.DEBUG, message))
      }
    }
  }

  group(message) {
    if (this._shouldLog(LogLevel.DEBUG)) {
      console.group(this._formatMessage(LogLevel.DEBUG, message))
      this._openGroups++
    }
  }

  groupEnd() {
    // Always close groups that were opened, regardless of current log level
    if (this._openGroups > 0) {
      console.groupEnd()
      this._openGroups--
    }
  }

  /**
   * Log performance timing with proper grouping
   */
  perf(operation, startTime, ...data) {
    if (this._shouldLog(LogLevel.DEBUG)) {
      const duration = Math.round(performance.now() - startTime)
      this.debug(`${operation} completed in ${duration}ms`, ...data)
    }
  }
}

/**
 * Create a logger for a specific namespace
 * @param {string} namespace - Logger namespace (e.g., 'Component', 'List', 'CSS')
 * @returns {Logger} Logger instance
 */
export function createLogger(namespace) {
  return new Logger(namespace)
}

/**
 * Set the global log level
 * @param {number} level - Log level (0=ERROR, 1=WARN, 2=INFO, 3=DEBUG)
 * @throws {Error} When level is not a valid number between 0 and 3
 */
export function setLogLevel(level) {
  if (typeof level !== 'number' || level < 0 || level > 3 || !Number.isInteger(level)) {
    throw new Error(`Invalid log level: ${level}. Must be an integer between 0 (ERROR) and 3 (DEBUG)`)
  }
  if (typeof window !== 'undefined') {
    window.RAIN_LOG_LEVEL = level
  }
}

export { LogLevel }
