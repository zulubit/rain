import { describe, it, expect } from 'vitest'
import { $, html } from '../src/core.js'

describe('List Reconciliation', () => {
  function createTrackedItem(id, name) {
    const div = html`<div class="item" data-id="${id}">${name}</div>`
    div._nodeId = `node-${id}-${Math.random()}`
    div._testMarker = `item-${id}`
    return div
  }

  function getItemIds(container) {
    return Array.from(container.children).map(child => child.dataset.id)
  }

  describe('Key Edge Cases', () => {
    it('should handle duplicate keys gracefully', () => {
      const [items, setItems] = $([
        { id: 1, name: 'First' },
        { id: 1, name: 'Duplicate' },
        { id: 2, name: 'Second' }
      ])

      const el = $.list(
        items,
        item => createTrackedItem(item.id, item.name),
        item => item.id
      )

      expect(el.children).toHaveLength(3)
      expect(el.children[0].textContent).toBe('First')
      expect(el.children[1].textContent).toBe('Duplicate')
      expect(el.children[2].textContent).toBe('Second')
    })

    it('should handle null/undefined keys', () => {
      const [items] = $([
        { id: null, name: 'Null Key' },
        { id: undefined, name: 'Undefined Key' },
        { id: 1, name: 'Valid Key' }
      ])

      const el = $.list(
        items,
        item => createTrackedItem(item.id || 'no-id', item.name),
        item => item.id
      )

      expect(el.children).toHaveLength(3)
    })

    it('should handle keys with special characters', () => {
      const [items, setItems] = $([
        { id: 'item-with-dashes', name: 'Dashes' },
        { id: 'item_with_underscores', name: 'Underscores' },
        { id: 'item.with.dots', name: 'Dots' },
        { id: 'item with spaces', name: 'Spaces' }
      ])

      const el = $.list(
        items,
        item => html`<div data-id="${item.id}">${item.name}</div>`,
        item => item.id
      )

      expect(el.children).toHaveLength(4)
      
      setItems([...items()].reverse())
      
      expect(el.children[0].dataset.id).toBe('item with spaces')
      expect(el.children[3].dataset.id).toBe('item-with-dashes')
    })

    it('should handle symbol keys', () => {
      const symbolKey1 = Symbol('key1')
      const symbolKey2 = Symbol('key2')
      
      const [items, setItems] = $([
        { key: symbolKey1, name: 'Symbol 1' },
        { key: symbolKey2, name: 'Symbol 2' }
      ])

      const el = $.list(
        items,
        item => html`<div>${item.name}</div>`,
        item => item.key
      )

      expect(el.children).toHaveLength(2)
      expect(el.children[0].textContent).toBe('Symbol 1')

      setItems([
        { key: symbolKey2, name: 'Symbol 2' },
        { key: symbolKey1, name: 'Symbol 1' }
      ])

      expect(el.children[0].textContent).toBe('Symbol 2')
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
        item => createTrackedItem(item.id, item.name),
        item => item.id
      )

      const originalNodes = Array.from(el.children)
      const nodeA = originalNodes[0]
      const nodeC = originalNodes[2]
      const nodeD = originalNodes[3]

      // Remove B, add E and F, reorder
      setItems([
        { id: 3, name: 'C' },
        { id: 5, name: 'E' },
        { id: 1, name: 'A' },
        { id: 6, name: 'F' },
        { id: 4, name: 'D' }
      ])

      expect(el.children).toHaveLength(5)
      expect(getItemIds(el)).toEqual(['3', '5', '1', '6', '4'])

      // Verify node reuse for existing items
      expect(el.children[0]).toBe(nodeC)
      expect(el.children[2]).toBe(nodeA)
      expect(el.children[4]).toBe(nodeD)
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
        item => createTrackedItem(item.id, item.name),
        item => item.id
      )

      const originalNodes = Array.from(el.children)

      setItems([
        { id: 4, name: 'D' },
        { id: 3, name: 'C' },
        { id: 2, name: 'B' },
        { id: 1, name: 'A' }
      ])

      expect(getItemIds(el)).toEqual(['4', '3', '2', '1'])
      
      // All original nodes should be reused, just reordered
      expect(el.children[0]).toBe(originalNodes[3])
      expect(el.children[1]).toBe(originalNodes[2])
      expect(el.children[2]).toBe(originalNodes[1])
      expect(el.children[3]).toBe(originalNodes[0])
    })

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
        item => createTrackedItem(item.id, item.name),
        item => item.id
      )

      const originalNodes = Array.from(el.children)

      // Remove B and D, add F and G, reorder
      setItems([
        { id: 5, name: 'E' },
        { id: 6, name: 'F' },
        { id: 1, name: 'A' },
        { id: 7, name: 'G' },
        { id: 3, name: 'C' }
      ])

      expect(getItemIds(el)).toEqual(['5', '6', '1', '7', '3'])
      
      // Verify specific node reuse
      expect(el.children[0]).toBe(originalNodes[4]) // E reused
      expect(el.children[2]).toBe(originalNodes[0]) // A reused
      expect(el.children[4]).toBe(originalNodes[2]) // C reused
    })
  })

  describe('Performance Scenarios', () => {
    it('should handle large list updates efficiently', () => {
      const initialItems = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Item ${i}`
      }))

      const [items, setItems] = $(initialItems)
      const el = $.list(
        items,
        item => createTrackedItem(item.id, item.name),
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
        item => createTrackedItem(item.id, item.name),
        item => item.id
      )

      const originalB = el.children[0]
      const originalC = el.children[1]

      setItems([
        { id: 1, name: 'A' },
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
        item => createTrackedItem(item.id, item.name),
        item => item.id
      )

      const originalA = el.children[0]
      const originalB = el.children[1]

      setItems([
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
        { id: 3, name: 'C' },
        { id: 4, name: 'D' }
      ])

      expect(getItemIds(el)).toEqual(['1', '2', '3', '4'])
      
      // Original nodes should be reused
      expect(el.children[0]).toBe(originalA)
      expect(el.children[1]).toBe(originalB)
    })

    it('should handle shuffling large lists', () => {
      const originalItems = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        name: `Item ${i}`
      }))

      const [items, setItems] = $(originalItems)
      const el = $.list(
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
      
      // Verify all original nodes are still used
      const currentNodes = Array.from(el.children)
      const originalNodeIds = originalNodes.map(n => n._nodeId)
      const currentNodeIds = currentNodes.map(n => n._nodeId)
      
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
      const el = $.list(
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

  describe('Reactive Content', () => {
    it('should maintain reactivity within list items during reordering', () => {
      const [count1, setCount1] = $(10)
      const [count2, setCount2] = $(20)
      
      const [items, setItems] = $([
        { id: 1, counter: count1 },
        { id: 2, counter: count2 }
      ])

      const el = $.list(
        items,
        item => html`<div data-id=${item.id}>Count: ${item.counter}</div>`,
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

    it('should handle items with complex nested reactive content', () => {
      const [counter1, setCounter1] = $(0)
      const [counter2, setCounter2] = $(0)
      const [visible1, setVisible1] = $(true)
      const [visible2, setVisible2] = $(true)

      const [items, setItems] = $([
        { id: 1, counter: counter1, visible: visible1 },
        { id: 2, counter: counter2, visible: visible2 }
      ])

      const el = $.list(
        items,
        item => {
          const div = document.createElement('div')
          div.dataset.id = item.id
          
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
      expect(el.children[1].querySelector('span').textContent).toBe('Count: 100')
      expect(el.children[0].querySelector('span').textContent).toBe('Count: 200')
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid successive updates', () => {
      const [items, setItems] = $([{ id: 1, name: 'A' }])

      const el = $.list(
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

      const el = $.list(
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
      
      // All nodes should be new
      expect(el.children[0]).not.toBe(originalNodes[0])
      expect(el.children[1]).not.toBe(originalNodes[1])
      expect(el.children[2]).not.toBe(originalNodes[2])
      
      expect(el.children[0].dataset.id).toBe('10')
    })

    it('should handle alternating add/remove pattern', () => {
      const [items, setItems] = $([])

      const el = $.list(
        items,
        item => createTrackedItem(item.id, item.name),
        item => item.id
      )

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

    it('should handle non-array items gracefully', () => {
      const [items, setItems] = $('not an array')
      
      const el = $.list(
        items,
        item => createTrackedItem(item.id, item.name),
        item => item.id
      )

      expect(el.children).toHaveLength(0)

      // Switch to valid array
      setItems([{ id: 1, name: 'Valid' }])
      expect(el.children).toHaveLength(1)
    })

    it('should not leak DOM nodes when items are removed', () => {
      const [items, setItems] = $([
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
        { id: 3, name: 'C' }
      ])

      const el = $.list(
        items,
        item => createTrackedItem(item.id, item.name),
        item => item.id
      )

      expect(el.children.length).toBe(3)

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