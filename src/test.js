import MockRequest from './mocks/mock-request'
import MockResource from './mocks/mock-resource'
import MockGateway from './gateway/mock'
import { configs } from './index'
import { toQueryString } from './utils'

let store = []
let ids = 1
let originalGateway = null

/**
 * High level abstraction, it works directly on your client mocking
 * the resources and their methods.
 * @param {Object} client - the client generated by {@link forge}
 *
 * @return {MockAssert}
 */
export const mockClient = (client) => {
  const entry = new MockResource(ids++, client)
  store.push(entry)
  return entry
}

/**
 * Low level abstraction, very useful for automations
 * @param {Object} props
 *   @param {String} props.method - request method (get, post, etc)
 *   @param {String} props.url - request url (http://example.com)
 *   @param {String} props.body - request body
 *   @param {String} props.response
 *     @param {String} props.response.status
 *     @param {String} props.response.headers
 *     @param {String} props.response.body
 *
 * @return {MockAssert}
 */
export const mockRequest = (props) => {
  const entry = new MockRequest(ids++, props)
  store.push(entry)
  return entry.assertObject()
}

/**
 * Setup the test library
 */
export const install = () => {
  originalGateway = configs.gateway
  configs.gateway = MockGateway
}

/**
 * Teardown the test library
 */
export const uninstall = () => {
  clear()
  if (originalGateway) {
    configs.gateway = originalGateway
    originalGateway = null
  }
}

/**
 * Cleans up all mocks
 */
export const clear = () => {
  store = []
}

/**
 * Returns number of unused mocks
 * @returns {Number}
 */
export const unusedMocks = () => {
  const mocks = store.map((mock) => mock.toMockRequest())
  let count = 0
  mocks.forEach((mock) => {
    if (mock.calls.length === 0) count++
  })
  return count
}

/**
 * Similar to "lookupResponse" but it also runs the request/prepareRequest phase of the middleware
 * stack
 *
 * @param {Request} request
 * @return {Promise<Response>}
 * @throws Will throw an error if it doesn't find a mock to match the given request
 */
export const lookupResponseAsync = (request) => {
  const mocksPendingMiddlewareExecution = store.filter((mock) => mock.pendingMiddlewareExecution)
  return configs.Promise.all(
    mocksPendingMiddlewareExecution.map((mock) => mock.executeMiddlewareStack())
  ).then(() => lookupResponse(request))
}

/**
 * @param {Request} request
 * @return {Response}
 * @throws Will throw an error if it doesn't find a mock to match the given request
 */
export const lookupResponse = (request) => {
  const mocks = store.map((mock) => mock.toMockRequest())

  const exactMatch = mocks.filter((mock) => mock.isExactMatch(request)).pop()

  if (exactMatch) {
    return exactMatch.call(request)
  }

  const partialMatch = mocks.filter((mock) => mock.isPartialMatch(request)).pop()

  if (partialMatch) {
    throw new Error(
      `[Mappersmith Test] No exact match found for ${requestToLog(
        request
      )}, partial match with ${mockToLog(partialMatch)}, check your mock definition`
    )
  }

  throw new Error(
    `[Mappersmith Test] No match found for ${requestToLog(request)}, check your mock definition`
  )
}

/**
 * List of match functions
 */
export const m = {
  stringMatching: (regexp) => {
    if (!(regexp instanceof RegExp)) {
      throw new Error(`[Mappersmith Test] "stringMatching" received an invalid regexp (${regexp})`)
    }
    return (string) => regexp.test(string)
  },

  stringContaining: (sample) => {
    if (typeof sample !== 'string') {
      throw new Error(
        `[Mappersmith Test] "stringContaining" received an invalid string (${sample})`
      )
    }

    return (string) => stringIncludes(string, sample)
  },

  uuid4: () => {
    // NOTE: based on https://github.com/chriso/validator.js/blob/3443132beccddf06c3f0a5e88c1dd2ee6513b612/src/lib/isUUID.js
    const uuid4Rx = /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i

    return (string) => uuid4Rx.test(string)
  },

  anything: () => () => true,
}

const requestToLog = (request) =>
  `"${request.method().toUpperCase()} ${request.url()}" (body: "${toQueryString(
    request.body()
  )}"; headers: "${toQueryString(request.headers())}")`
const mockToLog = (requestMock) =>
  `"${requestMock.method.toUpperCase()} ${requestMock.url}" (body: "${
    requestMock.body
  }"; headers: "${requestMock.headers}")`

const stringIncludes = (str, search, start) => {
  if (typeof start !== 'number') {
    start = 0
  }

  if (typeof str.includes === 'function') {
    return str.includes(search, start)
  }

  if (start + search.length > str.length) {
    return false
  }

  return str.indexOf(search, start) !== -1
}
