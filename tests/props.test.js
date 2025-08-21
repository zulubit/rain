import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PropsManager, createPropsManager } from '../src/props.js'

describe('props.js', () => {
  let mockElement

  beforeEach(() => {
    mockElement = {
      hasAttribute: vi.fn(),
      getAttribute: vi.fn(),
      tagName: 'TEST-COMPONENT',
      hasOwnProperty: vi.fn()
    }
  })

  describe('PropsManager', () => {
    describe('normalizePropDefs', () => {
      it('should normalize shorthand prop definitions', () => {
        const manager = new PropsManager({
          name: String,
          age: Number,
          active: Boolean
        }, mockElement)

        expect(manager.propDefs).toEqual({
          name: { type: String },
          age: { type: Number },
          active: { type: Boolean }
        })
      })

      it('should normalize full prop definitions', () => {
        const manager = new PropsManager({
          name: { type: String, default: 'test', required: true },
          age: { type: Number, default: 0 },
          active: { type: Boolean, validator: v => typeof v === 'boolean' }
        }, mockElement)

        expect(manager.propDefs).toEqual({
          name: { type: String, default: 'test', required: true, validator: undefined },
          age: { type: Number, default: 0, required: false, validator: undefined },
          active: { type: Boolean, default: undefined, required: false, validator: expect.any(Function) }
        })
      })

      it('should default type to String', () => {
        const manager = new PropsManager({
          name: { default: 'test' }
        }, mockElement)

        expect(manager.propDefs.name.type).toBe(String)
      })
    })

    describe('getObservedAttributes', () => {
      it('should return all prop names except Functions', () => {
        const manager = new PropsManager({
          name: String,
          age: Number,
          active: Boolean,
          data: Object,
          items: Array,
          onClick: Function
        }, mockElement)

        expect(manager.observedAttributes).toEqual(['name', 'age', 'active', 'data', 'items'])
      })

      it('should return empty array for only Function props', () => {
        const manager = new PropsManager({
          onClick: Function,
          onSubmit: Function
        }, mockElement)

        expect(manager.observedAttributes).toEqual([])
      })
    })

    describe('coerceValue', () => {
      let manager

      beforeEach(() => {
        manager = new PropsManager({}, mockElement)
      })

      it('should coerce String values', () => {
        expect(manager.coerceValue(null, String)).toBe('')
        expect(manager.coerceValue(undefined, String)).toBe('')
        expect(manager.coerceValue(123, String)).toBe('123')
        expect(manager.coerceValue('hello', String)).toBe('hello')
      })

      it('should coerce Number values', () => {
        expect(manager.coerceValue(null, Number)).toBe(0)
        expect(manager.coerceValue('', Number)).toBe(0)
        expect(manager.coerceValue('123', Number)).toBe(123)
        expect(manager.coerceValue('abc', Number)).toBe(0)
        expect(manager.coerceValue(42, Number)).toBe(42)
      })

      it('should coerce Boolean values', () => {
        expect(manager.coerceValue(true, Boolean)).toBe(true)
        expect(manager.coerceValue(false, Boolean)).toBe(false)
        expect(manager.coerceValue('false', Boolean)).toBe(false)
        expect(manager.coerceValue('0', Boolean)).toBe(false)
        expect(manager.coerceValue(null, Boolean)).toBe(false)
        expect(manager.coerceValue('', Boolean)).toBe(false)
        expect(manager.coerceValue('true', Boolean)).toBe(true)
        expect(manager.coerceValue('1', Boolean)).toBe(true)
        expect(manager.coerceValue('any', Boolean)).toBe(true)
      })

      it('should coerce Object values', () => {
        expect(manager.coerceValue(null, Object)).toBe(null)
        expect(manager.coerceValue('', Object)).toBe(null)
        expect(manager.coerceValue('{"key":"value"}', Object)).toEqual({ key: 'value' })
        expect(manager.coerceValue({ key: 'value' }, Object)).toEqual({ key: 'value' })
        expect(manager.coerceValue('invalid json', Object)).toBe(null)
      })

      it('should coerce Array values', () => {
        expect(manager.coerceValue(null, Array)).toEqual([])
        expect(manager.coerceValue('', Array)).toEqual([])
        expect(manager.coerceValue('[1,2,3]', Array)).toEqual([1, 2, 3])
        expect(manager.coerceValue([1, 2, 3], Array)).toEqual([1, 2, 3])
        expect(manager.coerceValue('invalid json', Array)).toEqual([])
      })

      it('should coerce Function values', () => {
        const fn = () => {}
        expect(manager.coerceValue(fn, Function)).toBe(fn)
        expect(manager.coerceValue('not a function', Function)).toBe(null)
        expect(manager.coerceValue(null, Function)).toBe(null)
      })
    })

    describe('getInitialProps', () => {
      it('should get values from element properties first', () => {
        mockElement.name = 'property-value'
        mockElement.hasAttribute.mockReturnValue(true)
        mockElement.getAttribute.mockReturnValue('attribute-value')

        const manager = new PropsManager({
          name: { type: String, default: 'default-value' }
        }, mockElement)

        const props = manager.getInitialProps()
        expect(props.name).toBe('property-value')
      })

      it('should get values from attributes if no property', () => {
        mockElement.hasAttribute.mockReturnValue(true)
        mockElement.getAttribute.mockReturnValue('attribute-value')

        const manager = new PropsManager({
          name: { type: String, default: 'default-value' }
        }, mockElement)

        const props = manager.getInitialProps()
        expect(props.name).toBe('attribute-value')
      })

      it('should use default values if no property or attribute', () => {
        mockElement.hasAttribute.mockReturnValue(false)

        const manager = new PropsManager({
          name: { type: String, default: 'default-value' },
          count: { type: Number, default: 42 }
        }, mockElement)

        const props = manager.getInitialProps()
        expect(props.name).toBe('default-value')
        expect(props.count).toBe(42)
      })

      it('should use type defaults if no default specified', () => {
        mockElement.hasAttribute.mockReturnValue(false)

        const manager = new PropsManager({
          name: String,
          count: Number,
          active: Boolean,
          data: Object,
          items: Array
        }, mockElement)

        const props = manager.getInitialProps()
        expect(props.name).toBe('')
        expect(props.count).toBe(0)
        expect(props.active).toBe(false)
        expect(props.data).toBe(null)
        expect(props.items).toEqual([])
      })

      it('should coerce values to correct types', () => {
        mockElement.hasAttribute.mockReturnValue(true)
        mockElement.getAttribute.mockImplementation((attr) => {
          switch (attr) {
            case 'count': return '42'
            case 'active': return 'true'
            case 'data': return '{"key":"value"}'
            case 'items': return '[1,2,3]'
            default: return null
          }
        })

        const manager = new PropsManager({
          count: Number,
          active: Boolean,
          data: Object,
          items: Array
        }, mockElement)

        const props = manager.getInitialProps()
        expect(props.count).toBe(42)
        expect(props.active).toBe(true)
        expect(props.data).toEqual({ key: 'value' })
        expect(props.items).toEqual([1, 2, 3])
      })
    })

    describe('handleAttributeChange', () => {
      it('should handle attribute changes for declared props', () => {
        const manager = new PropsManager({
          name: String,
          count: Number
        }, mockElement)

        expect(manager.handleAttributeChange('name', 'new-value')).toBe('new-value')
        expect(manager.handleAttributeChange('count', '42')).toBe(42)
      })

      it('should return null for undeclared attributes', () => {
        const manager = new PropsManager({
          name: String
        }, mockElement)

        expect(manager.handleAttributeChange('unknown', 'value')).toBe(null)
      })

      it('should return null for Function props', () => {
        const manager = new PropsManager({
          onClick: Function
        }, mockElement)

        expect(manager.handleAttributeChange('onClick', 'value')).toBe(null)
      })
    })

    describe('validation', () => {
      it('should validate required props', () => {
        mockElement.hasAttribute.mockReturnValue(false)

        const manager = new PropsManager({
          name: { type: String, required: true }
        }, mockElement)

        // Just ensure it doesn't throw - the actual logging is tested elsewhere
        expect(() => manager.getInitialProps()).not.toThrow()
      })

      it('should run custom validators', () => {
        const validator = vi.fn().mockReturnValue(false)
        
        mockElement.hasAttribute.mockReturnValue(true)
        mockElement.getAttribute.mockReturnValue('invalid-value')

        const manager = new PropsManager({
          name: { type: String, validator }
        }, mockElement)

        manager.getInitialProps()
        
        expect(validator).toHaveBeenCalledWith('invalid-value')
      })
    })
  })

  describe('createPropsManager', () => {
    it('should create a PropsManager instance', () => {
      const manager = createPropsManager({ name: String }, mockElement)
      expect(manager).toBeInstanceOf(PropsManager)
    })
  })
})