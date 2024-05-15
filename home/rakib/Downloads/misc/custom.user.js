// ==UserScript==
// @name        Custom
// @match       https://*.google.com/search?q=*
// @match       https://hitomi.la/*
// @run-at      document-start
// ==/UserScript==

const googleSearchRedirect = () => {
  const redditLinks = document.querySelectorAll('a[href*="reddit.com"]')
  redditLinks.forEach(link => {
    link.href = link.href.replace('www.reddit.com', 'redlib.catsarch.com')
  })

  // Disable Google link tracking redirection.
  // https://github.com/raffaeleflorio/anti_rwt/blob/master/anti_rwt.js
  Object.defineProperty(window, 'rwt', {
    value: () => true,
    writable: false,
    configurable: false,
    enumerable: false
  })
}

if (location.href.includes('google.com/search')) {
  document.addEventListener('DOMContentLoaded', () => {
    googleSearchRedirect()
  })
}

let css = ''
if (location.href.includes('hitomi.la')) {
  css += `
  /* Larger thumbnails. */
  .thumbnail-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }
  .thumbnail-list li {
    min-height: 240px;
  }
  .thumbnail-container,
  .thumbnail-container img {
    width: 100% !important;
    height: 100% !important;
  }
  .thumbnail-container img {
    max-height: 100% !important;
  }

  .thumbnail-container .badge {
    height: 24px;
    min-width: 24px;
    border-radius: 24px;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .simplePagerNav {
    display: flex;
  }

  .simplePagerNav li {
    flex: 1;
    text-align: center;
    cursor: pointer;
  }`
}
if (css) {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
}

