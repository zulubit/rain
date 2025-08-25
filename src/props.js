/**
 * @fileoverview RainJS Props - Type-aware property system with JSON support
 * @version 0.0.8
 */

/**
 * Type coercion functions for converting string attributes to typed values
 */
const coercers = {
  String: (value) => value == null ? '' : String(value),

  Number: (value) => {
    if (value == null || value === '') return 0
    const num = Number(value)
    return isNaN(num) ? 0 : num
  },

  Boolean: (value) => {
    if (typeof value === 'boolean') return value
    if (value === 'false' || value === '0' || value == null || value === '') return false
    return true
  },

  Object: (value) => {
    if (value == null) return null
    if (typeof value === 'object') return value
    if (typeof value === 'string') {
      if (value === '') return null
      if (value.startsWith('{')) {
        try {
          return JSON.parse(value)
        } catch {
          console.warn('Invalid JSON for Object prop:', value)
          return null
        }
      }
    }
    return null
  },

  Array: (value) => {
    if (value == null) return []
    if (Array.isArray(value)) return value
    if (typeof value === 'string') {
      if (value === '') return []
      if (value.startsWith('[')) {
        try {
          return JSON.parse(value)
        } catch {
          console.warn('Invalid JSON for Array prop:', value)
          return []
        }
      }
    }
    return []
  },

  Function: (value) => typeof value === 'function' ? value : null
}

/**
 * Props helper class for managing component properties with type safety and coercion
 */
export class PropsManager {
  /**
   * Creates a new props manager for a component
   * @param {Record<string, any>} propDefs - Property definitions object
   * @param {HTMLElement} element - Component element instance
   * @throws {Error} When propDefs or element is invalid
   */
  constructor(propDefs, element) {
    this.element = element
    this.propDefs = this.normalizePropDefs(propDefs)
    this.observedAttributes = this.getObservedAttributes()
  }

  /**
   * Normalize prop definitions from shorthand to full format
   * @param {Record<string, any>} defs - Prop definitions
   * @returns {Record<string, any>} Normalized definitions
   */
  normalizePropDefs(defs) {
    const normalized = {}

    for (const [name, def] of Object.entries(defs)) {
      if (typeof def === 'function') {
        // Shorthand: { name: String } becomes { name: { type: String } }
        normalized[name] = { type: def }
      } else {
        // Full format: { name: { type: String, default: 'value', ... } }
        normalized[name] = {
          type: def.type || String,
          default: def.default,
          required: def.required || false,
          validator: def.validator
        }
      }
    }

    return normalized
  }

  /**
   * Get list of attributes to observe (all except Function type)
   * @returns {string[]} List of attribute names
   */
  getObservedAttributes() {
    return Object.entries(this.propDefs)
      .filter(([_, def]) => def.type !== Function)
      .map(([name]) => name)
  }

  /**
   * Get initial prop values from element attributes and properties
   * @returns {Record<string, any>} Initial prop values
   */
  getInitialProps() {
    const props = {}

    for (const [name, def] of Object.entries(this.propDefs)) {
      let value

      // Try property first (for complex types like functions/objects)
      if (name in this.element && this.element[name] !== undefined) {
        value = this.element[name]
      }
      // Then try attribute (for simple types)
      else if (this.element.hasAttribute(name)) {
        value = this.element.getAttribute(name)
      }
      // Use default value
      else if ('default' in def) {
        value = typeof def.default === 'function' ? def.default() : def.default
      }
      // Fallback to type default
      else {
        value = this.getTypeDefault(def.type)
      }

      // Coerce and validate
      value = this.coerceValue(value, def.type)
      this.validateProp(name, value, def)

      props[name] = value
    }

    return props
  }

  /**
   * Get default value for a type
   * @param {Function} type - Type constructor
   * @returns {any} Default value
   */
  getTypeDefault(type) {
    switch (type) {
    case String: return ''
    case Number: return 0
    case Boolean: return false
    case Array: return []
    case Object: return null
    case Function: return null
    default: return null
    }
  }

  /**
   * Coerce a value to the specified type
   * @param {any} value - Value to coerce
   * @param {Function} type - Type constructor
   * @returns {any} Coerced value
   */
  coerceValue(value, type) {
    const coercer = coercers[type.name]
    return coercer ? coercer(value) : value
  }

  /**
   * Validate a prop value
   * @param {string} name - Prop name
   * @param {any} value - Prop value
   * @param {Record<string, any>} def - Prop definition
   */
  validateProp(name, value, def) {
    // Check required
    if (def.required && (value == null || value === '')) {
      console.error(`Required prop '${name}' is missing on ${this.element.tagName}`)
    }

    // Run custom validator
    if (def.validator && value != null) {
      try {
        if (!def.validator(value)) {
          console.warn(`Prop '${name}' failed validation:`, value)
        }
      } catch (error) {
        console.error(`Validator error for prop '${name}':`, error)
      }
    }
  }

  /**
   * Handle attribute change and return coerced value
   * @param {string} name - Attribute name
   * @param {string} newValue - New attribute value
   * @returns {any|null} Coerced value or null if not a prop
   */
  handleAttributeChange(name, newValue) {
    const def = this.propDefs[name]
    if (!def) return null

    // Functions can't be attributes - they must be set as properties
    if (def.type === Function) return null

    const coercedValue = this.coerceValue(newValue, def.type)
    this.validateProp(name, coercedValue, def)

    return coercedValue
  }

  /**
   * Set up property descriptors on element for direct property access
   * @param {Function} getProp - Function to get prop value
   * @param {Function} setProp - Function to set prop value
   */
  setupPropertyDescriptors(getProp, setProp) {
    for (const [name, def] of Object.entries(this.propDefs)) {
      // Skip if property already exists
      if (this.element.hasOwnProperty(name)) continue

      Object.defineProperty(this.element, name, {
        get() {
          return getProp(name)
        },
        set: (value) => {
          // Coerce and validate
          const coercedValue = this.coerceValue(value, def.type)
          this.validateProp(name, coercedValue, def)
          setProp(name, coercedValue)
        },
        enumerable: true,
        configurable: true
      })
    }
  }
}

/**
 * Create a props manager for a component
 * @param {Record<string, any>} propDefs - Property definitions
 * @param {HTMLElement} element - Component element
 * @returns {PropsManager} Props manager instance
 */
export function createPropsManager(propDefs, element) {
  return new PropsManager(propDefs, element)
}

