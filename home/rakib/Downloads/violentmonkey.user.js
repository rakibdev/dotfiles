// ==UserScript==
// @name        Custom
// @match       https://*/*
// @grant       GM_xmlhttpRequest
// @grant       GM_getValue
// @grant       GM_setValue
// @run-at      document-start
// ==/UserScript==

const applyCss = theme => {
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
      --paper-dialog-background-color: ${theme.primary_surface_2} !important; /* save to playlist dialog */
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

  if (location.href.includes('music.youtube.com')) {
    css += `
    html {
      --ytmusic-general-background-c: ${theme.primary_surface} !important; /* navigation rail, appbar */
      --ytmusic-color-black1: ${theme.primary_surface_2} !important; /* bottom player, context menu */
    }

    body {
      background-color: ${theme.primary_surface};
    }

    ytmusic-search-box[is-bauhaus-sidenav-enabled][is-mobile-view][has-query] {
      --ytmusic-search-background: ${theme.primary_surface_2} !important;
    }

    ytmusic-tabs.stuck {
      background-color: ${theme.primary_surface} !important;
    }

    ytmusic-responsive-list-item-renderer {
      --ytmusic-list-item-height: 100px !important;
      --ytmusic-responsive-list-item-thumbnail-size: 100px !important;
    }
    ytmusic-player-queue-item {
      --ytmusic-list-item-height: 100px !important;
      --ytmusic-player-queue-item-thumbnail-size: 100px !important;
    }

    ytmusic-play-button-renderer[size=MUSIC_PLAY_BUTTON_SIZE_SMALL] {
      --ytmusic-play-button-size: 100px !important;
    }
    `
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

  if (location.href.includes('discord.com/channels')) {
    css += `
    :root {
      --primary-600: ${theme.primary_surface} !important; /* content */
      --primary-630: ${theme.primary_surface} !important; /* sidebar, discord loader */
      --primary-660: ${theme.primary_surface} !important; /* sidebar bottom bar */
      --primary-700: ${theme.primary_surface} !important; /* navigation rail */
      --channeltextarea-background: ${theme.primary_surface_2}; /* message field */
      --background-modifier-selected: ${theme.primary_surface_2} !important; /* list selected */
      --green-360: ${theme.primary_40} !important; /* icon */
      --green-430: ${theme.primary_40} !important; /* button */
      --brand-experiment: ${theme.primary_40} !important; /* unread message alert */
    }
    `
  }

  const style = document.createElement('style')
  style.textContent = css
  document.head.appendChild(style)
}

const getTheme = () => JSON.parse(GM_getValue('theme'))
const cachedTheme = getTheme()
if (cachedTheme) applyCss(cachedTheme)

const themeFile = 'file:///home/rakib/.cache/system-ui/theme.json'
GM_xmlhttpRequest({
  method: 'GET',
  url: themeFile,
  onload: response => {
    GM_setValue('theme', response.responseText)
    if (!cachedTheme) applyCss(getTheme())
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
    value: () => true,
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