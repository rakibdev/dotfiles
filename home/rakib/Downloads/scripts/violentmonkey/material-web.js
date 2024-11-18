// ==UserScript==
// @name        Material Web
// @description Dynamic theming for all websites.
// @match       https://*/*
// @run-at      document-start
// @grant       GM.xmlHttpRequest
// @grant       GM.getValue
// @grant       GM.setValue
// @noframes
// ==/UserScript==

// todo: add pre support.

const options = {
  dark: window.matchMedia('(prefers-color-scheme: dark)').matches,
  theme: [] // HSL only.
}

const loadTheme = () =>
  new Promise(resolve => {
    if (options.theme.length) return resolve()
    GM.xmlHttpRequest({
      url: 'file:///home/rakib/.config/system-ui/app-data.json',
      method: 'GET',
      responseType: 'json',
      onload({ response }) {
        options.theme = Object.values(response.theme).map(hslFromHex)
        resolve()
      }
    })
  })

const hslFromHex = hex => {
  if (hex.startsWith('#')) hex = hex.slice(1)
  if (hex.length == 3) {
    hex = hex
      .split('')
      .map(char => char + char)
      .join('')
  }

  // Hex to RGB.
  const r = Number.parseInt(hex.slice(0, 2), 16)
  const g = Number.parseInt(hex.slice(2, 4), 16)
  const b = Number.parseInt(hex.slice(4, 6), 16)
  return hslFromRgb([r, g, b])
}

const hslFromRgb = ([r, g, b]) => {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = Math.floor((max + min) / ((0xff * 2) / 100))

  if (max === min) return [0, 0, l]
  const d = max - min
  const s = Math.floor((d / (l > 50 ? 0xff * 2 - max - min : max + min)) * 100)

  if (max === r) return [Math.floor(((g - b) / d + (g < b && 6)) * 60), s, l]
  return max === g ? [Math.floor(((b - r) / d + 2) * 60), s, l] : [Math.floor(((r - g) / d + 4) * 60), s, l]
}

const parseCSSColor = rgbOrHex => rgbOrHex.match(/([\d.]+)/g)

const findNearestThemeColor = target => {
  const tooDark = target[2] < 24
  let color = []
  let nearest = null
  options.theme.forEach((hsl, index) => {
    let diff = null
    const lDiff = Math.abs(hsl[2] - target[2])
    if (tooDark)
      diff = lDiff // S doesn't matter if L too low.
    else {
      const sDiff = Math.abs(hsl[1] - target[1])
      diff = Math.sqrt(sDiff * sDiff + lDiff * lDiff)
    }
    if (diff < nearest || index == 0) {
      nearest = diff
      color = hsl
    }
  })
  return color
}

const cssFromHsl = ([h, s, l], alpha) => {
  if (alpha == undefined) return `hsl(${h} ${s}% ${l}%)`
  return `hsl(${h} ${s}% ${l}% / ${alpha})`
}

const cache = new Map()
const replaceCssColors = css => {
  let changed = false
  const result = css.replaceAll(/#([a-f0-9]+)|(rgb|hsl)a?\((.+?)\)/g, (match, hex, type, color) => {
    if (match.includes('calc')) debugger
    return

    changed = true
    const colorKey = hex || color
    if (!cache.has(colorKey)) {
      let hsl = []
      let alpha = null
      if (hex) {
        hsl = hslFromHex(hex)
        if (hex.length == 8) alpha = parseInt(hex.slice(6, 8), 16) / 255
      } else {
        const parsed = parseCSSColor(color)
        if (type == 'hsl') hsl = parsed
        else if (type == 'rgb') hsl = hslFromRgb(parsed)
        // Keep alpha between 0-1.
        if (parsed[3] > 1) alpha = parsed[3] /= 255
      }
      cache.set(colorKey, cssFromHsl(findNearestThemeColor(hsl), alpha))
    }
    return cache.get(colorKey)
  })
  if (changed) return result
}

const iterateCssRules = cssRules => {
  for (const rule of cssRules) {
    if (rule.style) {
      const content = replaceCssColors(rule.style.cssText)
      if (content) rule.style.cssText = content
    } else if (rule.cssRules?.length) iterateCssRules(rule.cssRules)
  }
}

const cloneCorsStyle = style => {
  GM.xmlHttpRequest({
    method: 'GET',
    url: style.href,
    onload({ response }) {
      const clone = document.createElement('style')
      clone.textContent = replaceCssColors(response)
      clone.dataset.handled = true
      document.head.appendChild(clone)
    }
  })
}

const onStyleAdded = style => {
  const inlineStyle = !style.href
  const canReadCssRules = style.href?.includes(location.origin) || style.crossOrigin == 'anonymous'
  if (inlineStyle || canReadCssRules) {
    if (style.sheet) iterateCssRules(style.sheet.cssRules)
    else {
      style.addEventListener('load', () => {
        iterateCssRules(style.sheet.cssRules)
      })
    }
  } else if (!style.href.includes('fonts')) {
    // Access to cssRules blocked by CORS.
    cloneCorsStyle(style)
  }
}
;(async () => {
  await loadTheme()

  // ~= also matches rel="preload stylesheet".
  const elements = document.querySelectorAll('link[rel~="stylesheet"],style')
  for (const style of elements) {
    onStyleAdded(style)
  }

  const observeOptions = { childList: true }
  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType != Node.ELEMENT_NODE) continue
        if (node.tagName == 'BODY') observer.observe(document.body, observeOptions)
        else if ((node.tagName == 'STYLE' || node.rel?.includes('stylesheet')) && !node.dataset.handled) {
          node.dataset.handled = true
          onStyleAdded(node)
        }
      }
    }
  })
  observer.observe(document.head, observeOptions)
  if (document.body) observer.observe(document.body, observeOptions)
  else {
    // Body is dynamically inserted in Vue apps. E.g. https://vuejs.org
    observer.observe(document.documentElement, observeOptions)
  }

  document.addEventListener('readystatechange', () => {
    // Checking "interactive" instead of "DOMContentLoaded"
    // readyState is never "complete" on some sites e.g. Discord.
    if (document.readyState == 'interactive') observer.disconnect()
  })
})()
