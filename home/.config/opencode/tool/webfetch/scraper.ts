import { IMPORTANT_ATTRS, BYPASS_TAGS } from './constants'

export interface Metadata {
  title?: string
  description?: string
  author?: string
  publishedTime?: string
}

export const extractMetadata = (document: Document): Metadata => {
  const getMeta = (selectors: string[]) => {
    for (const sel of selectors) {
      const content = document.querySelector(sel)?.getAttribute('content')
      if (content) return content
    }
  }

  return {
    title:
      document.querySelector('title')?.textContent?.trim() ||
      getMeta(['meta[property="og:title"]', 'meta[name="twitter:title"]']),
    description: getMeta([
      'meta[name="description"]',
      'meta[property="og:description"]',
      'meta[name="twitter:description"]'
    ]),
    author: getMeta(['meta[name="author"]', 'meta[property="article:author"]']),
    publishedTime: getMeta(['meta[property="article:published_time"]', 'meta[name="date"]'])
  }
}

export const detoxDOM = (document: Document) => {
  const unwantedTags = ['script', 'style', 'noscript', 'iframe', 'svg', 'canvas', 'template', 'img']
  unwantedTags.forEach(tag => document.querySelectorAll(tag).forEach(el => el.remove()))

  removeUnwantedAttributes(document)
  removeEmptyElements(document)
}

const removeUnwantedAttributes = (document: Document) => {
  document.querySelectorAll('*').forEach(el => {
    ;[...el.attributes].forEach(attr => {
      if (!IMPORTANT_ATTRS.has(attr.name)) {
        el.removeAttribute(attr.name)
      }
    })
  })
}

const removeEmptyElements = (document: Document) => {
  ;[...document.querySelectorAll('*')].reverse().forEach(el => {
    if (BYPASS_TAGS.has(el.tagName.toLowerCase())) return
    if (!el.textContent?.trim() && !el.children.length) el.remove()
  })
}
