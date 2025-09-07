/**
 * @fileoverview Signal utilities for RainWC
 */

import { signal, computed, effect } from '@preact/signals-core'
import { throwError } from './error-utils.js'

const SIGNAL_SYMBOL = Symbol('rain.signal')

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

  getter[SIGNAL_SYMBOL] = sig
  setter[SIGNAL_SYMBOL] = sig

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
  accessor[SIGNAL_SYMBOL] = comp
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
  return effect(fn)
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

  return () => {
    target.removeEventListener(eventName, handler)
  }
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
 * @param {any} value
 * @returns {boolean}
 */
function isReactive(value) {
  return typeof value === 'function' && value[SIGNAL_SYMBOL]
}

export { $, SIGNAL_SYMBOL, isReactive }
