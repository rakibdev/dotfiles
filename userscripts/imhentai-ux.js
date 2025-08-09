// ==UserScript==
// @name         Imhentai UX
// @description  Auto "View All" on gallery pages
// @version      1.1
// @match        https://imhentai.xxx/gallery/*
// ==/UserScript==

const clickViewAll = () => {
  const button = document.getElementById('load_all')
  if (button) setTimeout(() => button.click(), 200)
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', clickViewAll)
else clickViewAll()
