/**
 * @fileoverview Signal utilities for RainWC
 */

import { signal, computed, effect, batch } from '@preact/signals-core'
import { throwError } from './error-utils.js'

const SIGNAL_BRAND = Symbol.for('preact-signals')

/**
 * Creates a reactive signal with tuple return
 * @template T
 * @param {T} initialValue
 * @returns {[() => T, (value: T) => void]}
 * @example
 * const [count, setCount] = $(0)
 * setCount(5)
 */
function $(initialValue) {
  const sig = signal(initialValue)

  const getter = () => sig.value
  const setter = (newValue) => {
    sig.value = newValue
  }

  getter.brand = SIGNAL_BRAND
  setter.brand = SIGNAL_BRAND

  return [getter, setter]
}

/**
 * Creates a computed signal that updates when dependencies change
 * @template T
 * @param {() => T} computation
 * @returns {() => T}
 * @example
 * const doubled = $.computed(() => count() * 2)
 */
$.computed = function(computation) {
  if (typeof computation !== 'function') {
    throwError('$.computed expects a function, got ' + typeof computation)
  }
  const comp = computed(computation)
  const accessor = () => comp.value
  accessor.brand = SIGNAL_BRAND
  return accessor
}

/**
 * Creates an effect that runs when dependencies change
 * @param {() => void} fn
 * @returns {() => void}
 * @example
 * $.effect(() => document.title = `Count: ${count()}`)
 */
$.effect = function(fn) {
  if (typeof fn !== 'function') {
    throwError('$.effect expects a function, got ' + typeof fn)
  }
  const cleanup = effect(fn)

  if (typeof window !== 'undefined' && window.__currentRainInstance?._cleanups) {
    window.__currentRainInstance._cleanups.push(cleanup)
  }

  return cleanup
}

/**
 * Batches signal updates to avoid multiple re-renders
 * @param {() => any} fn - Function containing signal updates
 * @returns {any} Return value of the function
 * @example
 * const [name, setName] = $('John')
 * const [age, setAge] = $(30)
 * $.batch(() => {
 *   setName('Alice')
 *   setAge(25)
 *   // Only triggers one re-render
 * })
 */
$.batch = function(fn) {
  if (typeof fn !== 'function') {
    throwError('$.batch expects a function, got ' + typeof fn)
  }
  return batch(fn)
}

/**
 * Listen for custom events with automatic cleanup
 * @param {string} eventName
 * @param {(event: CustomEvent) => void} handler
 * @param {EventTarget} [target=document]
 * @returns {() => void}
 * @example
 * $.listen('user-changed', (e) => setUser(e.detail))
 */
$.listen = function(eventName, handler, target = document) {
  if (typeof eventName !== 'string') {
    throwError('$.listen expects eventName to be a string')
  }
  if (typeof handler !== 'function') {
    throwError('$.listen expects handler to be a function')
  }

  target.addEventListener(eventName, handler)

  const cleanup = () => {
    target.removeEventListener(eventName, handler)
  }

  if (typeof window !== 'undefined' && window.__currentRainInstance?._cleanups) {
    window.__currentRainInstance._cleanups.push(cleanup)
  }

  return cleanup
}

/**
 * Emit custom events
 * @param {string} eventName
 * @param {any} [detail]
 * @param {EventTarget} [target]
 * @example
 * $.emit('value-changed', { value: newValue })
 */
$.emit = function(eventName, detail, target) {
  if (typeof eventName !== 'string') {
    throwError('$.emit expects eventName to be a string')
  }

  const emitter = target || document

  const event = new CustomEvent(eventName, {
    detail,
    bubbles: true,
    composed: true
  })

  emitter.dispatchEvent(event)
}

/**
 * Auto-emit events when signal value changes
 * @param {string} eventName
 * @param {() => any} signalValue
 * @param {EventTarget} [target]
 * @returns {() => void}
 * @example
 * const [count, setCount] = $(0)
 * const cleanup = $.effectEmit('count-changed', count)
 */
$.effectEmit = function(eventName, signalValue, target) {
  if (typeof eventName !== 'string') {
    throwError('$.effectEmit expects eventName to be a string')
  }
  if (typeof signalValue !== 'function') {
    throwError('$.effectEmit expects signalValue to be a signal getter function')
  }

  let previousValue

  return $.effect(() => {
    const value = signalValue()

    if (value !== previousValue) {
      previousValue = value
      $.emit(eventName, value, target)
    }
  })
}

/**
 * @param {any} value
 * @returns {boolean}
 */
function isReactive(value) {
  return typeof value === 'function' && value.brand === SIGNAL_BRAND
}

export { $, isReactive }
