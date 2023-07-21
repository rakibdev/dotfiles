// ==UserScript==
// @name        Material 3 Dark Theme
// @version     1.1
// @match *://*/*
// @run-at document-start
// ==/UserScript==

let css = `
:root {
  --primary: #7dc2f6;
  --primary-90: #004163;
  --primary-10: #e4f2ff;
  --surface: #192a36;
  --background: #141c23;
  --neutral-20: #eaf2fc;
  --neutral-80: #4e565e;
  --foreground: var(--neutral-20);
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-thumb {
  background-color: var(--neutral-80);
  border-radius: 30px;
  border: 2px solid transparent;
  background-clip: padding-box;
}

`

if (location.href.includes('google.com')) {
  css += `
  body,
  .sfbg, /* topbar */
  .yg51vc, /* topnav */
  .appbar, /* result count */
  .Ww4FFb, /* list item */
  .FalWJb /* related searches rich */ {
    background-color: var(--background) !important;
  }

  .RNNXgb, /* search */
  .aajZCb, /* suggestion */
  .k8XOCe /* related searches chips */ {
    background-color: var(--surface) !important;
  }

  a {
    color: var(--primary) !important;
  }

  #sfooter {
    display: none;
  }`
}

if (location.href.includes('youtube.com')) {
  css += `
  html[dark],
  [dark] {
    --yt-spec-base-background: var(--background) !important;
    --yt-spec-additive-background: var(--surface) !important; /* chips */
    --yt-spec-menu-background: var(--surface) !important;
  }

  .ytd-searchbox {
    --ytd-searchbox-background: var(--surface);
    border: 0 !important;
  }

  /* disable player ambient mode */
  #cinematics canvas {
    display: none;
  }`
}

if (location.href.includes('github.com')) {
  css += `
  html, body {
    height: 100%;
    --color-canvas-default: var(--background) !important; /* fallback body */
  }

  body {
    --color-canvas-inset: var(--background); /* header */
    --color-canvas-subtle: var(--background); /* comemnt header */
    --color-canvas-overlay: var(--surface); /* sidebar */
    --color-accent-muted: var(--primary-90); /* add readme alert */
    --color-accent-fg: var(--primary); /* links */
    --color-accent-emphasis: var(--primary-90); /* selected chip */
    --color-fg-default: var(--foreground);
    --color-fg-muted: var(--foreground); /* icons */
    --color-btn-bg: var(--surface);
    --color-btn-primary-bg: var(--primary-90);
    --color-btn-primary-text: var(--primary-10);
    --color-primer-border-active: var(--primary); /* tab bottom indicator */
  }
  `
}

if (location.href.includes('libreddit.kavin.rocks')) {
  css += `
  body {
    --outside: var(--background);
    --post: var(--background);
    --foreground: var(--surface);
    --highlighted: var(--surface);
  }`
}

if (location.href.includes('stackoverflow.com')) {
  css += `
  body.unified-theme {
    --theme-background-color: var(--background) !important;
    --theme-content-background-color: var(--background) !important;
    --highlight-bg: var(--surface) !important; /* code highlight */
  }

  #question-header .question-hyperlink {
    color: var(--primary) !important;
  }
  `
  document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('theme-dark')
  })
}

if (location.href.includes('app.raindrop.io')) {
  css += `
  :root {
    --background-color: var(--background);
    --accent-color: var(--primary);
  }
  [data-theme=night] {
    --sidebar-background-color: var(--background);
  }
  `
}

const style = document.createElement('style')
style.textContent = css
document.head.appendChild(style)
