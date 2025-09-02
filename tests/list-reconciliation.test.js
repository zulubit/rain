import { describe, it, expect, vi } from 'vitest'
import { $, html } from '../src/core.js'

describe('List Reconciliation - Advanced', () => {
  // Helper to create items with unique DOM markers
  function createItem(id, name) {
    const div = html`<div class="item">${name}</div>`
    div.dataset.id = id
    div._testMarker = `item-${id}` // Unique marker to track DOM node identity
    return div
  }

  function getItemIds(container) {
    return Array.from(container.children).map(child => child.dataset.id)
  }

  function getTestMarkers(container) {
    return Array.from(container.children).map(child => child._testMarker)
  }

  describe('Key Edge Cases', () => {
    it('should handle duplicate keys gracefully', () => {
      const [items, setItems] = $([
        { id: 1, name: 'First' },
        { id: 1, name: 'Duplicate' }, // Same key!
        { id: 2, name: 'Second' }
      ])

      const el = $.list(
        items,
        item => createItem(item.id, item.name),
        item => item.id
      )

      // Should fall back to full re-render due to duplicate keys
      expect(el.children).toHaveLength(3)
      expect(el.children[0].textContent).toBe('First')
      expect(el.children[1].textContent).toBe('Duplicate')
      expect(el.children[2].textContent).toBe('Second')
    })

    it('should handle null/undefined keys', () => {
      const [items, setItems] = $([
        { id: null, name: 'Null Key' },
        { id: undefined, name: 'Undefined Key' },
        { id: 1, name: 'Valid Key' }
      ])

      const el = $.list(
        items,
        item => createItem(item.id || 'no-id', item.name),
        item => item.id
      )

      // Should fall back to full re-render due to invalid keys
      expect(el.children).toHaveLength(3)
    })

    it('should handle changing key function', () => {
      const [items, setItems] = $([
        { id: 1, slug: 'first', name: 'First' },
        { id: 2, slug: 'second', name: 'Second' }
      ])

      // Start with id-based keys
      let useSlugKeys = false
      const el = $.list(
        items,
        item => createItem(item.id, item.name),
        item => useSlugKeys ? item.slug : item.id
      )

      const originalFirstChild = el.children[0]
      expect(originalFirstChild._testMarker).toBe('item-1')

      // Change the key function (this would require re-creating the list in practice)
      // This tests that the system is robust to key function changes
      setItems([
        { id: 1, slug: 'first-updated', name: 'First Updated' },
        { id: 2, slug: 'second-updated', name: 'Second Updated' }
      ])

      expect(el.children).toHaveLength(2)
    })
  })

  describe('Complex Reordering', () => {
    it('should handle complex reordering with additions and deletions', () => {
      const [items, setItems] = $([
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
        { id: 3, name: 'C' },
        { id: 4, name: 'D' }
      ])

      const el = $.list(
        items,
        item => createItem(item.id, item.name),
        item => item.id
      )

      // Capture original DOM nodes
      const originalNodes = Array.from(el.children)
      const nodeA = originalNodes[0] // id: 1
      const nodeB = originalNodes[1] // id: 2
      const nodeC = originalNodes[2] // id: 3
      const nodeD = originalNodes[3] // id: 4

      // Complex update: remove B, add E and F, reorder
      setItems([
        { id: 3, name: 'C' },     // Move C to front
        { id: 5, name: 'E' },     // New item
        { id: 1, name: 'A' },     // Move A to middle
        { id: 6, name: 'F' },     // New item
        { id: 4, name: 'D' }      // Move D to end
      ])

      expect(el.children).toHaveLength(5)
      expect(getItemIds(el)).toEqual(['3', '5', '1', '6', '4'])

      // Verify node reuse for existing items
      expect(el.children[0]).toBe(nodeC) // C reused
      expect(el.children[2]).toBe(nodeA) // A reused
      expect(el.children[4]).toBe(nodeD) // D reused
      
      // Verify new nodes for new items
      expect(el.children[1]).not.toBe(nodeB) // E is new
      expect(el.children[3]).not.toBe(nodeB) // F is new
    })

    it('should handle reverse order efficiently', () => {
      const [items, setItems] = $([
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
        { id: 3, name: 'C' },
        { id: 4, name: 'D' }
      ])

      const el = $.list(
        items,
        item => createItem(item.id, item.name),
        item => item.id
      )

      const originalNodes = Array.from(el.children)

      // Reverse the order
      setItems([
        { id: 4, name: 'D' },
        { id: 3, name: 'C' },
        { id: 2, name: 'B' },
        { id: 1, name: 'A' }
      ])

      expect(getItemIds(el)).toEqual(['4', '3', '2', '1'])
      
      // All original nodes should be reused, just reordered
      expect(el.children[0]).toBe(originalNodes[3]) // D
      expect(el.children[1]).toBe(originalNodes[2]) // C
      expect(el.children[2]).toBe(originalNodes[1]) // B
      expect(el.children[3]).toBe(originalNodes[0]) // A
    })
  })

  describe('Performance Scenarios', () => {
    it('should handle large list updates efficiently', () => {
      // Create a larger list
      const initialItems = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Item ${i}`
      }))

      const [items, setItems] = $(initialItems)
      const el = $.list(
        items,
        item => createItem(item.id, item.name),
        item => item.id
      )

      expect(el.children).toHaveLength(100)

      // Remove every other item
      const filteredItems = initialItems.filter((_, i) => i % 2 === 0)
      setItems(filteredItems)

      expect(el.children).toHaveLength(50)
      expect(getItemIds(el)).toEqual(filteredItems.map(item => String(item.id)))
    })

    it('should handle prepending efficiently', () => {
      const [items, setItems] = $([
        { id: 2, name: 'B' },
        { id: 3, name: 'C' }
      ])

      const el = $.list(
        items,
        item => createItem(item.id, item.name),
        item => item.id
      )

      const originalB = el.children[0]
      const originalC = el.children[1]

      // Prepend new item
      setItems([
        { id: 1, name: 'A' }, // New item at front
        { id: 2, name: 'B' },
        { id: 3, name: 'C' }
      ])

      expect(getItemIds(el)).toEqual(['1', '2', '3'])
      
      // Original nodes should be reused
      expect(el.children[1]).toBe(originalB)
      expect(el.children[2]).toBe(originalC)
    })

    it('should handle appending efficiently', () => {
      const [items, setItems] = $([
        { id: 1, name: 'A' },
        { id: 2, name: 'B' }
      ])

      const el = $.list(
        items,
        item => createItem(item.id, item.name),
        item => item.id
      )

      const originalA = el.children[0]
      const originalB = el.children[1]

      // Append new items
      setItems([
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
        { id: 3, name: 'C' }, // New
        { id: 4, name: 'D' }  // New
      ])

      expect(getItemIds(el)).toEqual(['1', '2', '3', '4'])
      
      // Original nodes should be reused
      expect(el.children[0]).toBe(originalA)
      expect(el.children[1]).toBe(originalB)
    })
  })

  describe('Reactive Content Within List Items', () => {
    it('should maintain reactivity within list items during reordering', () => {
      const [count1, setCount1] = $(10)
      const [count2, setCount2] = $(20)
      
      const [items, setItems] = $([
        { id: 1, counter: count1 },
        { id: 2, counter: count2 }
      ])

      const el = $.list(
        items,
        item => {
          const div = html`<div data-id=${item.id}>Count: ${item.counter}</div>`
          return div
        },
        item => item.id
      )

      expect(el.children[0].textContent).toBe('Count: 10')
      expect(el.children[1].textContent).toBe('Count: 20')

      // Reorder items
      setItems([
        { id: 2, counter: count2 },
        { id: 1, counter: count1 }
      ])

      expect(el.children[0].textContent).toBe('Count: 20')
      expect(el.children[1].textContent).toBe('Count: 10')

      // Update counters - reactivity should still work
      setCount1(100)
      setCount2(200)

      expect(el.children[0].textContent).toBe('Count: 200')
      expect(el.children[1].textContent).toBe('Count: 100')
    })
  })

  describe('Error Handling', () => {
    it('should handle render function throwing errors', () => {
      const [items, setItems] = $([
        { id: 1, name: 'Good' },
        { id: 2, name: 'Bad' },
        { id: 3, name: 'Good' }
      ])

      expect(() => {
        $.list(
          items,
          item => {
            if (item.name === 'Bad') {
              throw new Error('Render error')
            }
            return createItem(item.id, item.name)
          },
          item => item.id
        )
      }).toThrow('Render error')
    })

    it('should handle non-array items gracefully', () => {
      const [items, setItems] = $('not an array')
      
      const el = $.list(
        items,
        item => createItem(item.id, item.name),
        item => item.id
      )

      expect(el.children).toHaveLength(0)

      // Switch to valid array
      setItems([{ id: 1, name: 'Valid' }])
      expect(el.children).toHaveLength(1)
    })
  })

  describe('Mixed Operations', () => {
    it('should handle simultaneous add, remove, and move operations', () => {
      const [items, setItems] = $([
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
        { id: 3, name: 'C' },
        { id: 4, name: 'D' },
        { id: 5, name: 'E' }
      ])

      const el = $.list(
        items,
        item => createItem(item.id, item.name),
        item => item.id
      )

      const originalNodes = Array.from(el.children)

      // Complex operation: remove B and D, add F and G, reorder
      setItems([
        { id: 5, name: 'E' },     // Move E to front
        { id: 6, name: 'F' },     // Add F
        { id: 1, name: 'A' },     // Keep A, new position
        { id: 7, name: 'G' },     // Add G
        { id: 3, name: 'C' }      // Keep C, new position
      ])

      expect(getItemIds(el)).toEqual(['5', '6', '1', '7', '3'])
      
      // Verify specific node reuse
      expect(el.children[0]).toBe(originalNodes[4]) // E reused
      expect(el.children[2]).toBe(originalNodes[0]) // A reused
      expect(el.children[4]).toBe(originalNodes[2]) // C reused
    })
  })
})