import { TAG_WEIGHTS, NOISE_PATTERNS } from './constants'

export const calculateLinkDensity = (element: Element): number => {
  const totalText = element.textContent?.length || 0
  if (!totalText) return 1

  let linkText = 0
  element.querySelectorAll('a').forEach(a => {
    linkText += a.textContent?.length || 0
  })

  return linkText / totalText
}

export const scoreNode = (element: Element): number => {
  const tagName = element.tagName.toLowerCase()
  let score = TAG_WEIGHTS[tagName] ?? 0

  const textLength = element.textContent?.trim().length || 0
  const htmlLength = element.innerHTML?.length || 1
  const textDensity = textLength / htmlLength

  score += textDensity * 10
  if (calculateLinkDensity(element) > 0.6) score -= 20

  const classId = `${element.className || ''} ${element.id || ''}`
  if (NOISE_PATTERNS.test(classId) && textDensity < 0.3) score -= 15

  return score
}

export const findMainContent = (document: Document): Element => {
  const candidates: Array<{ element: Element; score: number }> = []

  const selectors = ['article', 'main', '[role="main"]', '.content', '.post', '.article', '#content', '#main']
  selectors.forEach(sel => {
    const el = document.querySelector(sel)
    if (el) candidates.push({ element: el, score: scoreNode(el) + 50 })
  })

  document.querySelectorAll('div, section').forEach(el => {
    const score = scoreNode(el)
    if (score > 0) candidates.push({ element: el, score })
  })

  if (!candidates.length) return document.body || document.documentElement

  candidates.sort((a, b) => b.score - a.score)
  return candidates[0].element
}

const cleanPreBlocks = (element: Element) => {
  element.querySelectorAll('pre').forEach(pre => {
    // Remove non-code children inside <pre>
    // Keep <span> too because GitHub doesn't use <code> but only <span>
    ;[...pre.children].forEach(child => {
      const tag = child.tagName.toLowerCase()
      if (tag !== 'code' && tag !== 'span') {
        child.remove()
      }
    })

    // Some sites (e.g., shadcn) place copy buttons outside <pre> in parent elements
    let current = pre.parentElement
    for (let i = 0; i < 3 && current; i++) {
      ;[...current.querySelectorAll('button')].forEach(btn => {
        const text = btn.textContent?.trim().toLowerCase()
        if (text?.startsWith('copy')) {
          btn.remove()
        }
      })
      current = current.parentElement
    }
  })
}

export const pruneContent = (element: Element) => {
  cleanPreBlocks(element)

  const toRemove: Element[] = []

  element.querySelectorAll('*').forEach(child => {
    if (calculateLinkDensity(child) > 0.6 && scoreNode(child) < 0) {
      toRemove.push(child)
    }
  })

  toRemove.forEach(el => el.remove())
}
