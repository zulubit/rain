import { describe, it, expect, vi } from 'vitest'
import { $, html, list } from '../src/core.js'

describe('List Reconciliation - Stress Tests', () => {
  function createTrackedItem(id, name) {
    const div = html`<div class="item" data-id="${id}">${name}</div>`
    div._nodeId = `node-${id}-${Math.random()}` // Unique identity
    return div
  }

  describe('Extreme Edge Cases', () => {
    it('should handle rapid successive updates', () => {
      const [items, setItems] = $([
        { id: 1, name: 'A' }
      ])

      const el = list(
        items,
        item => createTrackedItem(item.id, item.name),
        item => item.id
      )

      // Rapid successive updates
      setItems([{ id: 1, name: 'A' }, { id: 2, name: 'B' }])
      setItems([{ id: 2, name: 'B' }, { id: 3, name: 'C' }])
      setItems([{ id: 3, name: 'C' }, { id: 1, name: 'A' }])
      setItems([{ id: 1, name: 'A' }])

      expect(el.children).toHaveLength(1)
      expect(el.children[0].dataset.id).toBe('1')
    })

    it('should handle complete list replacement', () => {
      const [items, setItems] = $([
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
        { id: 3, name: 'C' }
      ])

      const el = list(
        items,
        item => createTrackedItem(item.id, item.name),
        item => item.id
      )

      const originalNodes = Array.from(el.children)

      // Complete replacement with new IDs
      setItems([
        { id: 10, name: 'X' },
        { id: 11, name: 'Y' },
        { id: 12, name: 'Z' }
      ])

      expect(el.children).toHaveLength(3)
      
      // All nodes should be new (no reuse possible)
      expect(el.children[0]).not.toBe(originalNodes[0])
      expect(el.children[1]).not.toBe(originalNodes[1])
      expect(el.children[2]).not.toBe(originalNodes[2])
      
      expect(el.children[0].dataset.id).toBe('10')
      expect(el.children[1].dataset.id).toBe('11')
      expect(el.children[2].dataset.id).toBe('12')
    })

    it('should handle alternating add/remove pattern', () => {
      const [items, setItems] = $([])

      const el = list(
        items,
        item => createTrackedItem(item.id, item.name),
        item => item.id
      )

      // Pattern: empty -> 1 item -> empty -> 2 items -> empty
      setItems([{ id: 1, name: 'A' }])
      expect(el.children).toHaveLength(1)

      setItems([])
      expect(el.children).toHaveLength(0)

      setItems([{ id: 1, name: 'A' }, { id: 2, name: 'B' }])
      expect(el.children).toHaveLength(2)

      setItems([])
      expect(el.children).toHaveLength(0)

      setItems([{ id: 3, name: 'C' }])
      expect(el.children).toHaveLength(1)
      expect(el.children[0].dataset.id).toBe('3')
    })

    it('should handle items with complex nested reactive content', () => {
      const [counter1, setCounter1] = $(0)
      const [counter2, setCounter2] = $(0)
      const [visible1, setVisible1] = $(true)
      const [visible2, setVisible2] = $(true)

      const [items, setItems] = $([
        { id: 1, counter: counter1, visible: visible1 },
        { id: 2, counter: counter2, visible: visible2 }
      ])

      const el = list(
        items,
        item => {
          const div = document.createElement('div')
          div.dataset.id = item.id
          
          // Nested reactive content
          const counterEl = html`<span>Count: ${item.counter}</span>`
          const statusEl = html`<span style=${() => `display: ${item.visible() ? 'inline' : 'none'}`}>Visible</span>`
          
          div.appendChild(counterEl)
          div.appendChild(statusEl)
          return div
        },
        item => item.id
      )

      expect(el.children).toHaveLength(2)

      // Update nested reactive content
      setCounter1(10)
      setCounter2(20)
      expect(el.children[0].querySelector('span').textContent).toBe('Count: 10')
      expect(el.children[1].querySelector('span').textContent).toBe('Count: 20')

      // Reorder items
      setItems([
        { id: 2, counter: counter2, visible: visible2 },
        { id: 1, counter: counter1, visible: visible1 }
      ])

      // Reactivity should still work after reordering
      setCounter1(100)
      setCounter2(200)
      expect(el.children[1].querySelector('span').textContent).toBe('Count: 100') // Item 1 now at index 1
      expect(el.children[0].querySelector('span').textContent).toBe('Count: 200') // Item 2 now at index 0
    })
  })

  describe('Performance Edge Cases', () => {
    it('should handle shuffling large lists', () => {
      // Create a larger list for shuffling
      const originalItems = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        name: `Item ${i}`
      }))

      const [items, setItems] = $(originalItems)
      const el = list(
        items,
        item => createTrackedItem(item.id, item.name),
        item => item.id
      )

      const originalNodes = Array.from(el.children)
      expect(el.children).toHaveLength(50)

      // Shuffle the array
      const shuffledItems = [...originalItems].sort(() => Math.random() - 0.5)
      setItems(shuffledItems)

      expect(el.children).toHaveLength(50)
      
      // Verify all original nodes are still used (just reordered)
      const currentNodes = Array.from(el.children)
      const originalNodeIds = originalNodes.map(n => n._nodeId)
      const currentNodeIds = currentNodes.map(n => n._nodeId)
      
      // All original nodes should still be present
      originalNodeIds.forEach(nodeId => {
        expect(currentNodeIds).toContain(nodeId)
      })
    })

    it('should handle inserting in middle of large list', () => {
      const originalItems = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Item ${i}`
      }))

      const [items, setItems] = $(originalItems)
      const el = list(
        items,
        item => createTrackedItem(item.id, item.name),
        item => item.id
      )

      // Insert new item in the middle
      const updatedItems = [...originalItems]
      updatedItems.splice(50, 0, { id: 999, name: 'Inserted Item' })
      setItems(updatedItems)

      expect(el.children).toHaveLength(101)
      expect(el.children[50].dataset.id).toBe('999')
      expect(el.children[50].textContent).toBe('Inserted Item')
    })
  })

  describe('Key Function Edge Cases', () => {
    it('should handle keys that are not strings or numbers', () => {
      const symbolKey1 = Symbol('key1')
      const symbolKey2 = Symbol('key2')
      
      const [items, setItems] = $([
        { key: symbolKey1, name: 'Symbol 1' },
        { key: symbolKey2, name: 'Symbol 2' }
      ])

      const el = list(
        items,
        item => html`<div>${item.name}</div>`,
        item => item.key
      )

      expect(el.children).toHaveLength(2)
      expect(el.children[0].textContent).toBe('Symbol 1')
      expect(el.children[1].textContent).toBe('Symbol 2')

      // Reorder
      setItems([
        { key: symbolKey2, name: 'Symbol 2' },
        { key: symbolKey1, name: 'Symbol 1' }
      ])

      expect(el.children[0].textContent).toBe('Symbol 2')
      expect(el.children[1].textContent).toBe('Symbol 1')
    })

    it('should handle keys with special characters', () => {
      const [items, setItems] = $([
        { id: 'item-with-dashes', name: 'Dashes' },
        { id: 'item_with_underscores', name: 'Underscores' },
        { id: 'item.with.dots', name: 'Dots' },
        { id: 'item with spaces', name: 'Spaces' },
        { id: 'item/with/slashes', name: 'Slashes' }
      ])

      const el = list(
        items,
        item => html`<div data-id="${item.id}">${item.name}</div>`,
        item => item.id
      )

      expect(el.children).toHaveLength(5)
      
      // Reverse order (create new array to avoid mutation)
      setItems([...items()].reverse())
      
      expect(el.children[0].dataset.id).toBe('item/with/slashes')
      expect(el.children[4].dataset.id).toBe('item-with-dashes')
    })
  })

  describe('Memory and Cleanup', () => {
    it('should not leak DOM nodes when items are removed', () => {
      const [items, setItems] = $([
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
        { id: 3, name: 'C' }
      ])

      const el = list(
        items,
        item => createTrackedItem(item.id, item.name),
        item => item.id
      )

      const originalNodeCount = el.children.length
      expect(originalNodeCount).toBe(3)

      // Remove all items
      setItems([])
      expect(el.children).toHaveLength(0)

      // Add different items
      setItems([
        { id: 10, name: 'X' },
        { id: 11, name: 'Y' }
      ])

      expect(el.children).toHaveLength(2)
      expect(el.children[0].dataset.id).toBe('10')
      expect(el.children[1].dataset.id).toBe('11')
    })
  })
})