/**
 * @fileoverview Rainbow - Server-driven paradigm for RainWC
 */

import { rain } from './component.js'
import { $ } from './core.js'
import { jsx } from './jsx.js'

/**
 * Global context signals - accessible via $$.page() and $$.global()
 * @private
 */
let pageDataSignal = $({})
let globalDataSignal = $({})
let loadingSignal = $(false)

// Store getter functions to ensure they're stable references
const pageDataGetter = pageDataSignal[0]
const globalDataGetter = globalDataSignal[0]
const loadingGetter = loadingSignal[0]
const loadingSetter = loadingSignal[1]

/**
 * Rainbow server-driven paradigm API
 * @typedef {Object} RainbowAPI
 * @property {() => Object} page - Access current page data signal
 * @property {() => Object} global - Access current global data signal
 * @property {() => boolean} loading - Access loading state signal
 * @property {(options?: Object) => Promise<Object>} update - Update current page data
 * @property {(url: string, options?: Object) => Function} submitForm - Submit form with automatic data collection
 */

/**
 * Rainbow server-driven paradigm API
 * @type {RainbowAPI}
 */
const $$ = {
  /**
   * Access current page data signal
   * @type {() => Object}
   * @example
   * const pd = $$.page
   * return () => <div>Message: {pd().message}</div>
   */
  page: pageDataGetter,

  /**
   * Access current global data signal  
   * @type {() => Object}
   * @example
   * const gd = $$.global
   * return () => <div>Token: {gd().csrf_token}</div>
   */
  global: globalDataGetter,

  /**
   * Access loading state signal
   * @type {() => boolean}
   * @example
   * const loading = $$.loading
   * return () => <button disabled={loading()}>Submit</button>
   */
  loading: loadingGetter
}

/**
 * Updates page data signal
 * @param {Object} newPageData - New page data object
 * @private
 */
function updatePageData(newPageData) {
  pageDataSignal[1](newPageData || {})
}

/**
 * Updates global data signal
 * @param {Object} newGlobalData - New global data object
 * @private
 */
function updateGlobalData(newGlobalData) {
  globalDataSignal[1](newGlobalData || {})
}

/**
 * Makes HTTP request with automatic CSRF and error handling
 * @param {string} url - Request URL
 * @param {Object} options - Request options
 * @param {string} [options.method='GET'] - HTTP method
 * @param {Object} [options.data={}] - Request data
 * @param {Function} [options.onError] - Error callback
 * @param {boolean} [options.includeContext=false] - Include page/global data in request
 * @returns {Promise<Object>} Response data
 * @private
 */
async function makeRequest(url, options = {}) {
  const {
    method = 'GET',
    data = {},
    onError,
    includeContext = false
  } = options

  // Auto-include CSRF token from global data
  const globalData = $$.global()
  const headers = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...(options.headers || {})
  }

  if (globalData.csrf_token) {
    headers['X-CSRF-TOKEN'] = globalData.csrf_token
  }

  // Include current context for full roundtrip requests
  let requestData = data
  if (includeContext) {
    requestData = {
      _page: $$.page(),
      _global: $$.global(),
      ...data
    }
  }

  const requestOptions = {
    method: method.toUpperCase(),
    headers
  }

  if (method.toUpperCase() !== 'GET' && Object.keys(requestData).length > 0) {
    requestOptions.body = JSON.stringify(requestData)
  }

  // Set loading state
  loadingSetter(true)

  try {
    const response = await fetch(url, requestOptions)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const responseData = await response.json()

    // Update signals if response contains page/global data
    if (responseData.pageData !== undefined) {
      updatePageData(responseData.pageData)
    }
    if (responseData.globalData !== undefined) {
      updateGlobalData(responseData.globalData)
    }

    return responseData
  } catch (error) {
    console.error('Request failed:', error)

    // Update global errors if needed
    const currentGlobal = $$.global()
    updateGlobalData({
      ...currentGlobal,
      errors: {
        ...currentGlobal.errors,
        request: error.message
      }
    })

    if (onError) {
      onError(error)
    }

    throw error
  } finally {
    // Clear loading state
    loadingSetter(false)
  }
}

/**
 * Update current page data by making request to current route
 * @param {Object} [options] - Request options
 * @param {string} [options.method='POST'] - HTTP method
 * @param {Object} [options.data] - Request data
 * @param {Function} [options.onError] - Error callback
 * @returns {Promise<Object>} Server response
 * @example
 * $$.update({ data: { action: 'refresh' } })
 * $$.update({ method: 'GET' })
 */
$$.update = async function(options = {}) {
  return makeRequest(window.location.pathname + window.location.search, {
    method: 'POST',
    includeContext: false,
    ...options
  })
}

/**
 * Submit form with automatic data collection and file upload support
 * @param {string} url - Form action URL
 * @param {Object} [options] - Submit options
 * @param {string} [options.method='POST'] - HTTP method
 * @param {Function} [options.onBeforeSubmit] - Called before submission with FormData, return false to cancel
 * @param {Function} [options.onError] - Called on server/network errors
 * @returns {Function} Event handler function for form onSubmit
 * @example
 * <form onSubmit={$$.submitForm('/users/create')}>
 *   <input name="name" />
 *   <input type="file" name="avatar" />
 * </form>
 *
 * // With validation and error handling
 * <form onSubmit={$$.submitForm('/users/create', {
 *   onBeforeSubmit: (formData) => {
 *     if (!formData.get('email').includes('@')) {
 *       alert('Invalid email')
 *       return false
 *     }
 *   },
 *   onError: (error) => {
 *     alert('Server error: ' + error.message)
 *   }
 * })}>
 */
$$.submitForm = function(url, options = {}) {
  return async function(event) {
    event.preventDefault()

    const form = event.target
    const formData = new FormData(form)

    // Call onBeforeSubmit if provided
    if (options.onBeforeSubmit) {
      const shouldContinue = options.onBeforeSubmit(formData)
      if (shouldContinue === false) {
        return // Abort submission
      }
    }

    // Check if form has files for multipart handling
    const hasFiles = Array.from(formData.entries()).some(([, value]) => value instanceof File)

    let requestData
    let headers = { ...options.headers }

    if (hasFiles) {
      // Use FormData for file uploads
      requestData = formData
      // Don't set Content-Type, let browser set multipart boundary
      delete headers['Content-Type']
    } else {
      // Convert to JSON for regular forms
      requestData = Object.fromEntries(formData.entries())
    }

    const requestOptions = {
      method: options.method || 'POST',
      data: requestData,
      headers,
      includeContext: true,
      onError: options.onError
    }

    // Override makeRequest for file uploads
    if (hasFiles) {
      const globalData = $$.global()
      const fetchHeaders = { ...headers }

      if (globalData.csrf_token) {
        fetchHeaders['X-CSRF-TOKEN'] = globalData.csrf_token
      }

      // Add context data to FormData
      formData.append('_page', JSON.stringify($$.page()))
      formData.append('_global', JSON.stringify($$.global()))

      // Set loading state
      loadingSetter(true)

      try {
        const response = await fetch(url, {
          method: requestOptions.method,
          headers: fetchHeaders,
          body: formData
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const responseData = await response.json()

        if (responseData.pageData !== undefined) {
          updatePageData(responseData.pageData)
        }
        if (responseData.globalData !== undefined) {
          updateGlobalData(responseData.globalData)
        }

        return responseData
      } catch (error) {
        console.error('Form submit failed:', error)

        const currentGlobal = $$.global()
        updateGlobalData({
          ...currentGlobal,
          errors: {
            ...currentGlobal.errors,
            form: error.message
          }
        })

        if (options.onError) {
          options.onError(error)
        }

        throw error
      } finally {
        // Clear loading state
        loadingSetter(false)
      }
    } else {
      return makeRequest(url, requestOptions)
    }
  }
}

/**
 * rain-bow component - Context provider for server-driven apps
 */
rain('rain-bow', ['page-data', 'global-data'], function(props) {
  // Parse JSON from attributes and update signals
  const pageData = $.computed(() => {
    try {
      return JSON.parse(props['page-data']() || '{}')
    } catch {
      return {}
    }
  })

  const globalData = $.computed(() => {
    try {
      const parsed = JSON.parse(props['global-data']() || '{}')
      return {
        csrf_token: '',
        flash: [],
        ...parsed
      }
    } catch {
      return {
        csrf_token: '',
        flash: []
      }
    }
  })

  // Update global signals when attributes change
  $.effect(() => {
    updatePageData(pageData())
  })

  $.effect(() => {
    updateGlobalData(globalData())
  })

  return () => jsx('slot', null)
})

// Export the $$ object with all rainbow features
export { $$ }
