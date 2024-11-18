// ==UserScript==
// @name        Hitomi.la Mods
// @description Larger thumbnails.
// @match       https://hitomi.la/*
// @run-at      document-start
// ==/UserScript==

let css = `
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
if (css) {
  const style = document.createElement('style')
  style.textContent = css
  document.head.appendChild(style)
}
