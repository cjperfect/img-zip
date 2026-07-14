// 共享的代理注册 — 在开发环境下拦截 SDK 的 XHR 请求，通过 Vite 代理转发绕过跨域限制

const proxyConfigs = []

/**
 * @param {{ protocol: string, hostname?: string, hostnameSuffix?: string, proxyPrefix: string }} pattern
 */
export function registerProxyEndpoint(pattern) {
  proxyConfigs.push(pattern)
  ensureXhrPatched()
}

function ensureXhrPatched() {
  if (XMLHttpRequest.prototype.open.__proxyPatched) return
  const originalOpen = XMLHttpRequest.prototype.open
  XMLHttpRequest.prototype.open = function (method, url) {
    if (typeof url === 'string' && proxyConfigs.length) {
      try {
        const reqUrl = new URL(url)
        for (const pc of proxyConfigs) {
          const matches = pc.hostname
            ? reqUrl.hostname === pc.hostname || reqUrl.hostname.endsWith('.' + pc.hostname)
            : reqUrl.hostname.endsWith(pc.hostnameSuffix)

          if (matches && reqUrl.protocol === pc.protocol) {
            let cleanOrigin = reqUrl.origin
            if (reqUrl.port === '443' || reqUrl.port === '80') {
              cleanOrigin = reqUrl.protocol + '//' + reqUrl.hostname
            }
            arguments[1] = pc.proxyPrefix + encodeURIComponent(cleanOrigin) + reqUrl.pathname + reqUrl.search
            break
          }
        }
      } catch {
        // 忽略无法解析的 SDK URL
      }
    }
    return originalOpen.apply(this, arguments)
  }
  XMLHttpRequest.prototype.open.__proxyPatched = true
}
