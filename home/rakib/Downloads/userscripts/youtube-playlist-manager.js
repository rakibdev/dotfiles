// ==UserScript==
// @name         YouTube Playlist Manager
// @description  Manage playlists - Export. Find unavailable videos.
// @version      1.0
// @author       https://github.com/rakibdev
// @match        https://www.youtube.com/*
// @run-at       document-idle
// @grant        GM_registerMenuCommand
// ==/UserScript==

const origin = 'https://www.youtube.com'
const {
  client: { hl, gl: countryCode, clientName, clientVersion }
} = yt.config_.INNERTUBE_CONTEXT

const generateSApiSidHash = async () => {
  const sha1 = async string => {
    const buf = await window.crypto.subtle.digest('SHA-1', new TextEncoder().encode(string))
    return Array.prototype.map.call(new Uint8Array(buf), x => ('00' + x.toString(16)).slice(-2)).join('')
  }
  const timestamp = Date.now()
  const SAPISID = document.cookie.split('SAPISID=').pop().split('; ')[0]
  const digest = await sha1(`${timestamp} ${SAPISID} ${origin}`)
  return `SAPISIDHASH ${timestamp}_${digest}`
}

const requestInternalAPI = async (endpoint, body) => {
  const response = await fetch(`${origin}/youtubei/v1${endpoint}?prettyPrint=false`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: await generateSApiSidHash(),
      'X-Goog-Authuser': Number(yt.config_.SESSION_INDEX) // Header name case sensitive.
    },
    body: JSON.stringify({
      context: {
        client: {
          hl,
          gl: countryCode,
          clientName,
          clientVersion
        },
        user: {},
        request: {}
      },
      ...body
    })
  })

  return response.json()
}

const requestPublicAPI = async endpoint => {
  const apiKey = 'AIzaSyAMNUOJEU4KxYMx-Uj7bnMgNVM7QxU-0z8'
  return fetch(`https://www.googleapis.com/youtube/v3${endpoint}&key=${apiKey}`, {}).then(response => response.json())
}

const requestMaxVideos = 50

const includeRegionBlockDetails = async videos => {
  const params = new URLSearchParams({ part: 'id,contentDetails' })
  const videoIds = videos.filter(video => !video.unavailableReason).map(video => video.id)
  for (let i = 0; i < videoIds.length; i += requestMaxVideos) {
    const chunkIds = videoIds.slice(i, i + requestMaxVideos).join()
    params.set('id', chunkIds)
    const response = await requestPublicAPI(`/videos?${params.toString()}`)
    response.items.forEach(item => {
      if (item.contentDetails.regionRestriction?.blocked?.includes(countryCode))
        videos.find(video => video.id == item.id).unavailableReason = 'Region blocked.'
    })
  }
  return videos
}

const getPlaylistVideos = async playlistId => {
  const params = new URLSearchParams({
    playlistId,
    part: 'snippet',
    maxResults: requestMaxVideos
  })
  let videos = []
  let nextPageToken = true
  while (nextPageToken) {
    if (typeof nextPageToken == 'string') params.set('pageToken', nextPageToken)
    // Using public YouTube API instead of internal API
    // because internal API skips unavailable videos if playlist has more than 200 videos.
    const response = await requestPublicAPI(`/playlistItems?${params.toString()}`)
    if (response.error) {
      if (response.error.code == 404) throw new Error("Can't access playlist. Make sure it is public or unlisted.")
      else throw new Error(response.error.message)
    }
    nextPageToken = response.nextPageToken
    videos.push(
      ...response.items.map(video => {
        const content = {
          id: video.snippet.resourceId.videoId,
          title: video.snippet.title,
          channel: video.snippet.videoOwnerChannelTitle
        }
        if (content.title.startsWith('Deleted') || content.title.startsWith('Private')) {
          content.unavailableReason = content.title
          content.title = ''
        }
        return content
      })
    )
  }
  await includeRegionBlockDetails(videos)
  return videos
}

const removeVideosFromPlaylist = async (playlistId, videoIds) => {
  const result = await requestInternalAPI('/browse/edit_playlist', {
    playlistId,
    actions: videoIds.map(id => ({ action: 'ACTION_REMOVE_VIDEO_BY_VIDEO_ID', removedVideoId: id }))
  })
  if (result.status != 'STATUS_SUCCEEDED')
    throw new Error(`Removing ${videoIds} failed.\n${result.error ? result.error.message : ''}`)
}

// Fixes `Failed to set the 'innerHTML' property on 'Element': This document requires 'TrustedHTML' assignment`.
let trustedHtml
if (window.trustedTypes?.createPolicy) {
  trustedHtml = window.trustedTypes.createPolicy('trustedHtml', {
    createHTML: string => string
  })
}

const label = (content, color) =>
  trustedHtml.createHTML(`<span style="color: ${color == 'error' ? 'red' : ''};">${content}</span>`)

const dialog = {
  container: null,
  body: null,

  create() {
    this.container = document.createElement('dialog')
    this.container.className = 'playlist-manager'
    this.container.innerHTML = trustedHtml.createHTML(`
      <div class="body"></div>

      <style>
      .playlist-manager {
        font-size: 14px;
        padding: 0;
        outline: 0;
        border: 0;
        border-radius: 24px;
      }
      
      .playlist-manager::backdrop {
        background-color: rgb(0 0 0 / 30%);
      }

      .playlist-manager .body {
        min-width: 336px;
        max-height: calc(100% - 80px);
        padding: 16px;
        background-color: var(--primary-background-color);
        display: flex;
        flex-direction: column;
        gap: 16px;
        overflow-y: auto;
      }

      .playlist-manager button {
        padding: 8px 16px;
        border-radius: 24px;
        border: 0;
      }
      </style>
    `)
    document.body.appendChild(this.container)

    this.body = this.container.querySelector('.body')

    this.container.addEventListener('click', event => {
      if (event.target == this.container) this.container.close()
    })
  }
}

dialog.create()

const openUnavailableVideosDialog = async (unavailableVideos, playlistId) => {
  // `tbm=vid` selects "Videos" tab in Google.
  const googleSearchLink = videoId => `https://www.google.com/search?q=${encodeURIComponent(`${videoId}`)}&tbm=vid`

  dialog.body.innerHTML = trustedHtml.createHTML(`
  <h2>${label(`Unavailable videos (${unavailableVideos.length})`)}</h2>
  <div class="unavailable-videos">
    ${unavailableVideos
      .map(
        video => `
      <div>
        <div>
          ID: ${video.id}
          <a href="${googleSearchLink(video.id)}" target="_blank">
            Google Search
          </a>
        </div>
        <div>Reason: ${video.unavailableReason}</div>
      </div>`
      )
      .join('')}
  </div>
  <button class="remove-unavailable">Remove unavailable videos</button>

  <style>
  .unavailable-videos {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-top: 16px;
  }
  </style>
  `)

  dialog.body.querySelector('.remove-unavailable').onclick = async () => {
    try {
      dialog.body.innerHTML = label('Removing...')
      await removeVideosFromPlaylist(
        playlistId,
        unavailableVideos.map(v => v.id)
      )
      dialog.body.innerHTML = label('Done.')
    } catch ({ message }) {
      dialog.header.innerHTML = message(message, 'error')
    }
  }

  dialog.container.showModal()
}

const getCurrentPlaylistId = () => new URLSearchParams(location.search).get('list')

const download = videos => {
  const json = JSON.stringify(videos, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `${document.title}.json`
  link.click()

  URL.revokeObjectURL(url)
}

const exportPlaylist = async () => {
  dialog.container.showModal()

  const playlistId = getCurrentPlaylistId()
  if (!playlistId) {
    dialog.body.innerHTML = label('No playlist found in current tab.', 'error')
    return
  }

  try {
    dialog.body.innerHTML = label('Fetching playlist videos...')
    const videos = await getPlaylistVideos(playlistId)
    dialog.body.innerHTML = label('')

    const available = []
    const unavailable = []
    videos.forEach(video => {
      if (video.unavailableReason) unavailable.push(video)
      else available.push(video)
    })

    if (unavailable.length) openUnavailableVideosDialog(unavailable, playlistId)

    const button = document.createElement('button')
    button.textContent = `Download JSON (${available.length} videos)`
    button.onclick = () => download(available)
    dialog.body.appendChild(button)
  } catch ({ message }) {
    dialog.body.innerHTML = message(message, 'error')
  }
}

GM_registerMenuCommand('Export playlist as JSON', exportPlaylist)
