/**
 * @fileoverview List reconciliation utilities for reactive lists
 */

import { effect } from '@preact/signals-core'
import { throwError } from './error-utils.js'

/**
 * Renders reactive lists with optional keyed reconciliation
 * @param {() => any[]} itemsSignal
 * @param {(item: any, index: number) => Element} renderFn
 * @param {(item: any, index: number) => string | number} [keyFn]
 * @returns {Element}
 * @example
 * createList(items, item => html`<li>${item.name}</li>`, item => item.id)
 */
export function createList(itemsSignal, renderFn, keyFn) {
  const container = document.createElement('div')
  container.style.display = 'contents'
  container._listCleanup = true

  let cleanup = null

  if (keyFn) {
    const nodeMap = new Map()

    cleanup = effect(() => {
      const items = itemsSignal()
      if (!Array.isArray(items)) return

      if (items.length === 0) {
        for (const [, node] of nodeMap) {
          if (node.parentNode === container) {
            node.remove()
          }
        }
        nodeMap.clear()
        return
      }

      const keys = items.map((item, index) => keyFn(item, index))
      const validKeys = keys.every(key => key != null)
      const uniqueKeys = new Set(keys).size === keys.length

      if (!validKeys || !uniqueKeys) {
        if (typeof window !== 'undefined' && window.RAIN_DEBUG) {
          console.log('[Rain:List] Invalid keys, falling back to full re-render')
        }
        Array.from(container.children).forEach(child => child.remove())
        nodeMap.clear()
        items.forEach((item, index) => {
          const node = renderFn(item, index)
          if (!node || !(node instanceof Node)) {
            throwError(`renderFn must return a DOM Node, got ${typeof node}`)
          }
          container.appendChild(node)
        })
        return
      }

      const usedNodes = new Set()

      const desiredNodes = []
      items.forEach((item, index) => {
        const key = keys[index]
        let node = nodeMap.get(key)

        usedNodes.add(key)

        if (!node) {
          node = renderFn(item, index)
          if (!node || !(node instanceof Node)) {
            throwError(`renderFn must return a DOM Node, got ${typeof node}`)
          }
          nodeMap.set(key, node)
        }

        desiredNodes.push(node)
      })

      const currentNodes = Array.from(container.children)

      currentNodes.forEach(node => {
        if (node.parentNode === container) {
          container.removeChild(node)
        }
      })

      desiredNodes.forEach(node => {
        container.appendChild(node)
      })

      for (const [key, node] of nodeMap) {
        if (!usedNodes.has(key)) {
          if (node.parentNode === container) {
            node.remove()
          }
          nodeMap.delete(key)
        }
      }
    })
  } else {
    cleanup = effect(() => {
      const items = itemsSignal()
      if (!Array.isArray(items)) return

      Array.from(container.children).forEach(child => child.remove())

      items.forEach((item, index) => {
        const node = renderFn(item, index)
        if (!node || !(node instanceof Node)) {
          throwError(`renderFn must return a DOM Node, got ${typeof node}`)
        }
        container.appendChild(node)
      })
    })
  }

  container._listCleanup = cleanup
  return container
}