// ==UserScript==
// @name        Custom
// @version     1.0
// @match       https://*/*
// @grant       GM_xmlhttpRequest
// @run-at      document-start
// ==/UserScript==

const applyTheme = theme => {
  let css = `
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  ::-webkit-scrollbar-thumb {
    background-color: ${theme.primary_surface_4};
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
      background-color: ${theme.primary_surface} !important;
    }
  
    .RNNXgb, /* search */
    .aajZCb, /* suggestion */
    .k8XOCe /* related searches chips */ {
      background-color: ${theme.primary_surface_2} !important;
    }
  
    a {
      color: ${theme.primary_40} !important;
    }
  
    #sfooter {
      display: none;
    }`
  }

  if (location.href.includes('youtube.com')) {
    css += `
    html[dark],
    [dark] {
      --yt-spec-base-background: ${theme.primary_surface} !important;
      --yt-spec-additive-background: ${theme.primary_surface_2} !important; /* chips */
      --yt-spec-menu-background: ${theme.primary_surface_2} !important;
    }
  
    .ytd-searchbox {
      --ytd-searchbox-background: ${theme.primary_surface_2};
      --ytd-searchbox-legacy-button-color: ${theme.primary_surface_2};
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
      --color-canvas-default: ${theme.primary_surface} !important; /* fallback body */
    }
  
    body {
      --color-canvas-inset: ${theme.primary_surface}; /* header */
      --color-canvas-subtle: ${theme.primary_surface}; /* comemnt header */
      --color-canvas-overlay: ${theme.primary_surface_2}; /* sidebar */
      --color-accent-muted: ${theme.primary_surface_3}; /* add readme alert */
      --color-accent-fg: ${theme.primary_40}; /* links */
      --color-accent-emphasis: ${theme.primary_surface_3}; /* selected chip */
      --color-fg-default: ${theme.neutral_10};
      --color-fg-muted: ${theme.neutral_10}; /* icons */
      --color-btn-bg: ${theme.primary_surface_2};
      --color-btn-primary-bg: ${theme.primary_surface_3};
      --color-btn-primary-text: ${theme.primary_10};
      --color-primer-border-active: ${theme.primary_40}; /* tab bottom indicator */
    }
    `
  }

  if (location.href.includes('stackoverflow.com')) {
    css += `
    body.unified-theme {
      --theme-background-color: ${theme.primary_surface} !important;
      --theme-content-background-color: ${theme.primary_surface} !important;
      --highlight-bg: ${theme.primary_surface_2} !important; /* code highlight */
    }
  
    #question-header .question-hyperlink {
      color: ${theme.primary_40} !important;
    }
    `
    document.addEventListener('DOMContentLoaded', () => {
      document.body.classList.add('theme-dark')
    })
  }

  if (location.href.includes('sh.reddit.com')) {
    css += `
    .theme-beta {
      --color-neutral-background: ${theme.primary_surface} !important; /* body */
      --color-neutral-background-hover: ${theme.primary_surface_2} !important; /* post hover */
      --color-secondary-background: ${theme.primary_surface_2} !important; /* button */
      --color-neutral-background-strong: ${theme.primary_surface_2} !important; /* menu */
    }
    `
  }

  if (location.href.includes('app.raindrop.io')) {
    css += `
    :root {
      --background-color: ${theme.primary_surface};
      --accent-color: ${theme.primary_40};
    }
    [data-theme=night] {
      --sidebar-background-color: ${theme.primary_surface};
    }
    `
  }

  const style = document.createElement('style')
  style.textContent = css
  document.head.appendChild(style)
}

const themeFile = 'file:///home/rakib/.cache/system-ui/theme.json'
GM_xmlhttpRequest({
  method: 'GET',
  url: themeFile,
  onload: response => {
    const theme = JSON.parse(response.responseText)
    applyTheme(theme)
  },
  onerror() {
    console.error(`Failed to read ${themeFile}`)
  }
})

const googleSearchResultRedirect = () => {
  const redditLinks = document.querySelectorAll('a[href*="reddit.com"]')
  redditLinks.forEach(link => {
    link.href = link.href.replace('www.reddit.com', 'sh.reddit.com')
  })

  // disable link tracking redirection
  // https://github.com/raffaeleflorio/anti_rwt/blob/master/anti_rwt.js
  Object.defineProperty(window, 'rwt', {
    value: (...args) => {
      return true
    },
    writable: false,
    configurable: false,
    enumerable: false
  })
}

if (location.href.includes('google.com/search')) {
  document.addEventListener('DOMContentLoaded', () => {
    googleSearchResultRedirect()
  })
}
