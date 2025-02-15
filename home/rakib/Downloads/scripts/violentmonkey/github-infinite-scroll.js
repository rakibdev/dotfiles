// ==UserScript==
// @name         GitHub Search Infinite Scroll
// @description  For code and repository search.
// @version      1.0
// @author       rakib13332@gmail.com
// @match        https://github.com/search?q=*
// @run-at       document-end
// ==/UserScript==

let listContainer
let listSelector = `[data-testid="results-list"]`
let observer
let hasMore = true
let loading = false

const indicatorStyle = 'text-align: center; padding: 16px;'

const loadingIndicator = document.createElement('div')
loadingIndicator.textContent = 'Loading...'
loadingIndicator.style.cssText = indicatorStyle

const endReached = message => {
  observer.disconnect()
  loadingIndicator.style.display = 'none'

  if (message) {
    const status = document.createElement('div')
    status.textContent = message
    status.style.cssText = indicatorStyle
    status.style.color = '#9198a1'
    status.style.fontSize = '14px'
    listContainer.insertBefore(status, loadingIndicator)
  }
}

const loadNextPage = async () => {
  if (loading || !hasMore) return
  loading = true

  try {
    const url = new URL(window.location.href)
    let page = Number(url.searchParams.get('p')) || 1
    url.searchParams.set('p', ++page)
    window.history.replaceState({}, '', url.toString())

    const response = await fetch(url.toString())
    if (!response.ok) throw new Error(`Status: ${response.status}`)
    const text = await response.text()

    const parser = new DOMParser()
    const doc = parser.parseFromString(text, 'text/html')

    const pageText = document.createElement('div')
    pageText.textContent = `Page ${page}`
    pageText.style.cssText = indicatorStyle
    listContainer.insertBefore(pageText, loadingIndicator)

    const newItems = doc.querySelectorAll(`${listSelector} > div`)
    newItems.forEach(item => listContainer.insertBefore(item, loadingIndicator))

    hasMore = Boolean(newItems.length) && !doc.querySelector('a[rel="next"]')?.hasAttribute('aria-disabled')
    if (!hasMore) endReached('No more results.')
  } catch (error) {
    hasMore = false
    endReached(error.message)
  } finally {
    loading = false
  }
}

const init = () => {
  listContainer = document.querySelector(listSelector)
  if (listContainer) {
    observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) loadNextPage()
        })
      },
      { threshold: 0 }
    )
    listContainer.appendChild(loadingIndicator)
    observer.observe(loadingIndicator)
  }
}

// onhashchange, MutationObserver doesn't work with annoying ass GitHub.
// This is a workaround.
let watchingUrl
const onScroll = () => {
  if (window.location.href == watchingUrl) return
  if (document.documentElement.scrollTop > 400) {
    watchingUrl = window.location.href
    observer?.disconnect()
    init()
  }
}
window.addEventListener('scroll', onScroll)
