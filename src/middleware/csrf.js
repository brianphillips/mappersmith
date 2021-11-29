/**
 * Sets a request header with the value of a cookie from document.cookie, if it exists
 */
export default (cookieName = 'csrfToken', headerName = 'x-csrf-token') =>
  function CsrfMiddleware() {
    const REGEXP_COOKIE_NAME = new RegExp(cookieName + '[^;]+')
    const getCookie = () => {
      const cookieString = REGEXP_COOKIE_NAME.exec((document || {}).cookie || '')
      return cookieString
        ? decodeURIComponent(cookieString.toString().replace(/^[^=]+./, ''))
        : undefined
    }

    return {
      prepareRequest(next) {
        return next().then((request) => {
          if (typeof document === 'undefined') {
            return request
          }

          const csrf = getCookie()

          return !csrf
            ? request
            : request.enhance({
                headers: { [headerName]: csrf },
              })
        })
      },
    }
  }
