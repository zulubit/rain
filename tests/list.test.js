import { describe, it, expect } from 'vitest'
import { $, html } from '../src/core.js'

describe('List Reconciliation', () => {
  function createItem(id, name) {
    const div = html`<div data-id="${id}">${name}</div>`
    div._nodeId = `node-${id}`
    return div
  }

  describe('keyed lists', () => {
    it('preserves DOM nodes on reorder', () => {
      const [items, setItems] = $([
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
        { id: 3, name: 'C' }
      ])

      const el = $.list(items, 
        item => createItem(item.id, item.name),
        item => item.id
      )

      const nodeA = el.children[0]
      const nodeB = el.children[1]
      const nodeC = el.children[2]

      // Reverse order
      setItems([
        { id: 3, name: 'C' },
        { id: 2, name: 'B' },
        { id: 1, name: 'A' }
      ])

      // Same nodes, different positions
      expect(el.children[0]).toBe(nodeC)
      expect(el.children[1]).toBe(nodeB)
      expect(el.children[2]).toBe(nodeA)
    })

    it('handles add/remove/reorder', () => {
      const [items, setItems] = $([
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
        { id: 3, name: 'C' }
      ])

      const el = $.list(items,
        item => createItem(item.id, item.name),
        item => item.id
      )

      const nodeA = el.children[0]
      const nodeC = el.children[2]

      // Remove B, add D and E, reorder
      setItems([
        { id: 3, name: 'C' },
        { id: 4, name: 'D' },
        { id: 1, name: 'A' },
        { id: 5, name: 'E' }
      ])

      expect(el.children).toHaveLength(4)
      expect(el.children[0]).toBe(nodeC) // C reused
      expect(el.children[2]).toBe(nodeA) // A reused
      expect(el.children[1].dataset.id).toBe('4') // D new
      expect(el.children[3].dataset.id).toBe('5') // E new
    })

    it('falls back on invalid keys', () => {
      const [items] = $([
        { id: null, name: 'Null' },
        { id: 1, name: 'Duplicate' },
        { id: 1, name: 'Duplicate2' }
      ])

      const el = $.list(items,
        item => html`<div>${item.name}</div>`,
        item => item.id
      )

      // Should render all despite bad keys
      expect(el.children).toHaveLength(3)
    })
  })

  describe('performance', () => {
    it('handles large lists', () => {
      const bigList = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`
      }))

      const [items, setItems] = $(bigList)
      const el = $.list(items,
        item => html`<div data-id="${item.id}">${item.name}</div>`,
        item => item.id
      )

      expect(el.children).toHaveLength(1000)

      // Remove every other item
      setItems(bigList.filter((_, i) => i % 2 === 0))
      expect(el.children).toHaveLength(500)
    })

    it('handles prepend/append efficiently', () => {
      const [items, setItems] = $([{ id: 2, name: 'B' }])
      
      const el = $.list(items,
        item => createItem(item.id, item.name),
        item => item.id
      )

      const nodeB = el.children[0]

      // Prepend A, append C
      setItems([
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
        { id: 3, name: 'C' }
      ])

      expect(el.children[1]).toBe(nodeB) // B reused
      expect(el.children[0].dataset.id).toBe('1')
      expect(el.children[2].dataset.id).toBe('3')
    })
  })

  describe('reactivity', () => {
    it('maintains signal reactivity after reorder', () => {
      const [count1, setCount1] = $(10)
      const [count2, setCount2] = $(20)
      
      const [items, setItems] = $([
        { id: 1, counter: count1 },
        { id: 2, counter: count2 }
      ])

      const el = $.list(items,
        item => html`<div data-id=${item.id}>${item.counter}</div>`,
        item => item.id
      )

      expect(el.children[0].textContent).toBe('10')
      expect(el.children[1].textContent).toBe('20')

      // Reorder
      setItems([items()[1], items()[0]])
      
      // Update signals - should still work
      setCount1(100)
      setCount2(200)
      
      expect(el.children[0].textContent).toBe('200')
      expect(el.children[1].textContent).toBe('100')
    })
  })

  describe('edge cases', () => {
    it('handles rapid updates', () => {
      const [items, setItems] = $([])
      const el = $.list(items,
        item => html`<div>${item.name}</div>`,
        item => item.id
      )

      // Rapid changes
      setItems([{ id: 1, name: 'A' }])
      setItems([{ id: 1, name: 'A' }, { id: 2, name: 'B' }])
      setItems([])
      setItems([{ id: 3, name: 'C' }])

      expect(el.children).toHaveLength(1)
      expect(el.children[0].textContent).toBe('C')
    })

    it('handles non-array gracefully', () => {
      const [items, setItems] = $('not array')
      const el = $.list(items,
        item => html`<div>${item}</div>`,
        item => item
      )

      expect(el.children).toHaveLength(0)
      
      setItems([1, 2, 3])
      expect(el.children).toHaveLength(3)
    })

    it('cleans up removed nodes', () => {
      const [items, setItems] = $([
        { id: 1, name: 'A' },
        { id: 2, name: 'B' }
      ])

      const el = $.list(items,
        item => createItem(item.id, item.name),
        item => item.id
      )

      expect(el.children).toHaveLength(2)
      
      setItems([])
      expect(el.children).toHaveLength(0)
      
      setItems([{ id: 10, name: 'X' }])
      expect(el.children).toHaveLength(1)
      expect(el.children[0].dataset.id).toBe('10')
    })
  })
})