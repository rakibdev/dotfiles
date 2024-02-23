// ==UserScript==
// @name        Custom
// @description Material You & More.
// @match       https://*/*
// @grant       GM_xmlhttpRequest
// @grant       GM_getValue
// @grant       GM_setValue
// @run-at      document-start
// ==/UserScript==

const style = document.createElement('style')
document.head.appendChild(style)

const rgbFromHex = hex => {
  hex = hex.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  return r + ',' + g + ',' + b
}

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

  body {
    font-family: Google Sans;
  }
  `

  if (location.href.includes('google.com/search')) {
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
  } else if (location.href.includes('gemini.google.com/app')) {
    css += `
    :root .dark-theme {
      --bard-color-main-container-background: ${theme.primary_surface} !important;
      --bard-color-response-container-background: ${theme.primary_surface_2} !important;
      --bard-color-surface-container: ${theme.primary_surface_2} !important;
      --bard-color-surface: ${theme.primary_surface_2} !important;
      --bard-color-surface-container-high: ${theme.primary_surface_2} !important; /* menu */
      --bard-color-surface-container-highest: ${theme.primary_surface_3} !important; /* card hover background */
      --bard-color-main-container-background-rgb: ${rgbFromHex(theme.primary_surface)} !important;
      --bard-color-response-container-background-rgb: ${rgbFromHex(theme.primary_surface_2)} !important;

      /* foreground */
      --bard-color-on-primary: ${theme.neutral_20} !important;
      --bard-color-on-surface: ${theme.neutral_20} !important;

      --bard-color-input-area-buttons-selected-background: ${theme.primary_80} !important; /* selected draft */
      --bard-color-primary: ${theme.primary_40} !important; /* selected chip */
      --bard-color-surface-container-low: ${theme.primary_surface_3} !important; /* unselected draft */
      --bard-color-draft-chip-background: ${theme.primary_surface_4} !important; /* unselected chip */

      --bard-color-link-button: ${theme.primary_40} !important;
      --bard-color-new-conversation-button: ${theme.primary_surface_3} !important;
      --bard-color-sidenav-upgrade-button: ${theme.primary_surface_3} !important;
      --mat-menu-container-color: ${theme.primary_surface_2} !important;

      /* code block */
      --bard-color-code-block-background: ${theme.primary_surface} !important;
      --bard-color-neutral-95: ${theme.primary_surface} !important;
      --bard-color-neutral-90: ${theme.primary_surface} !important;
    }

    /* topbar border */
    .chat-history:before {
      content: none !important;
    }

    /* new chat */
    .mdc-dialog__surface {
      background-color: ${theme.primary_surface_2} !important;
    }
    `
  } else if (location.href.includes('www.youtube.com')) {
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
  } else if (location.href.includes('music.youtube.com')) {
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
  } else if (location.href.includes('github.com')) {
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

    .search-results-page {
      background-color: ${theme.primary_surface} !important;
    }
    [data-testid="results-list"] > div > :is(div:first-child, a:last-child) {
      background-color: ${theme.primary_surface_2};
      border: 0;
    }

    /* code block */
    .snippet-clipboard-content {
      background-color: ${theme.primary_surface_2} !important;
    }
    .markdown-body pre {
      background-color: ${theme.primary_surface_2} !important;
      border-radius: 20px !important;
    }
    `
  } else if (location.href.includes('stackoverflow.com')) {
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
  } else if (location.href.includes('sh.reddit.com')) {
    css += `
    .theme-beta {
      --color-neutral-background: ${theme.primary_surface} !important; /* body */
      --color-neutral-background-hover: ${theme.primary_surface_2} !important; /* post hover */
      --color-secondary-background: ${theme.primary_surface_2} !important; /* button */
      --color-neutral-background-strong: ${theme.primary_surface_2} !important; /* menu */
    }
    `
  } else if (location.href.includes('app.raindrop.io')) {
    css += `
    :root {
      --background-color: ${theme.primary_surface};
      --accent-color: ${theme.primary_40};
    }
    [data-theme=night] {
      --sidebar-background-color: ${theme.primary_surface};
    }
    `
  } else if (location.href.includes('discord.com')) {
    css += `
    .theme-dark {
      --background-primary: ${theme.primary_surface} !important; /* chat */
      --background-secondary: ${theme.primary_surface} !important; /* drawers */
      --background-secondary-alt: ${theme.primary_surface} !important; /* account menu */
      --background-tertiary: ${theme.primary_surface} !important; /* search input */
      --channeltextarea-background: ${theme.primary_surface_2} !important; /* chat input */
    }
    `
  } else if (location.href.includes('facebook.com')) {
    css += `
    .__fb-dark-mode {
      --web-wash: ${theme.primary_surface}; /* body */
      --nav-bar-background: ${theme.primary_surface}; /* top bar */
      --card-background: ${theme.primary_surface}; /* account menu */
      --messenger-card-background: ${theme.primary_surface}; /* messanger body */
      --surface-background: ${theme.primary_surface_2}; /* posts */
      --comment-background: ${theme.primary_surface_3}; /* comment, search input */
    }
    `
  }

  style.textContent = css
}

const cachedTheme = JSON.parse(GM_getValue('theme') || '{}')
if (cachedTheme['primary_40']) applyCss(cachedTheme)

const appDataFile = 'file:///home/rakib/.config/system-ui/app-data.json'
GM_xmlhttpRequest({
  method: 'GET',
  url: appDataFile,
  onload: response => {
    const data = JSON.parse(response.responseText)
    const theme = data['theme']
    if (theme['primary_40'] != cachedTheme['primary_40']) {
      GM_setValue('theme', JSON.stringify(data['theme']))
      applyCss(theme)
    }
  },
  onerror() {
    console.error(`Failed to read ${appDataFile}`)
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
