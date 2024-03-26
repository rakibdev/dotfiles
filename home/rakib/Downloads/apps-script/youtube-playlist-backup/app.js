import config from './config.toml'

const colors = {
  off: '\x1b[0m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m'
}
const log = {
  info(message, ...args) {
    console.log(`${colors.blue}info:${colors.off} ${message}`, ...args)
  },
  warn(message, ...args) {
    console.log(`${colors.yellow}warn:${colors.off} ${message}`, ...args)
  },
  error(message, ...args) {
    console.error(`${colors.red}error:${colors.off} ${message}`, ...args)
  }
}

const file = 'backup.json'
const reader = Bun.file(file)

let contents = {}
if (await reader.exists()) contents = await reader.json()

const requestYouTube = async endpoint => {
  // Using this public API alongside because
  // internal API skips unavailable videos if playlist has more than 200 videos.
  const apiKey = 'AIzaSyCPbFD7_-Dfb6694tKO4Q7nymekTRmLubQ'
  return fetch(`https://www.googleapis.com/youtube/v3${endpoint}&key=${apiKey}`, {
    headers: { referer: 'https://dcragusa.github.io' }
  }).then(response => response.json())
}

const requestInternalYoutube = async (endpoint, body) => {
  const response = await fetch(`https://www.youtube.com/youtubei/v1${endpoint}?prettyPrint=false`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://www.youtube.com', // Required.
      authorization: config.authorization,
      'X-Goog-Authuser': config['x-goog-authuser'], // Case sensitive header name.
      cookie: config.cookie
    },
    body: JSON.stringify({
      context: {
        client: {
          hl: 'en',
          gl: config.countryCode,
          clientName: 'WEB',
          clientVersion: '2.20240325.01.00'
        },
        user: {},
        request: {}
      },
      ...body
    })
  })
  return response.json()
}

const editPlaylist = async (action, playlistId, videoIds) => {
  const result = await requestInternalYoutube('/browse/edit_playlist', {
    playlistId,
    actions: videoIds.map(id => {
      if (action == 'remove') return { action: 'ACTION_REMOVE_VIDEO_BY_VIDEO_ID', removedVideoId: id }
    })
  })
  if (result.status != 'STATUS_SUCCEEDED')
    log.error(`${action} ${videoIds} failed. `, result.error ? result.error.message : '')
}

const loadRegionBlockedDetails = async videos => {
  const params = new URLSearchParams({ part: 'id,contentDetails' })
  const ids = videos.flatMap(video => (video.unavailableReason ? [] : video.id))
  // YouTube accepts 50 items at once.
  for (let i = 0; i < ids.length; i += 50) {
    params.delete('id')
    params.append('id', ids.slice(i, i + 50).join())
    const response = await requestYouTube(`/videos?${params.toString()}`)
    response.items.forEach(item => {
      if (item.contentDetails.regionRestriction?.blocked?.includes(config.countryCode))
        videos.find(video => video.id == item.id).unavailableReason = 'Region blocked.'
    })
  }
  return videos
}

const getPlaylistVideos = async playlistId => {
  const params = new URLSearchParams({
    playlistId,
    part: 'snippet',
    maxResults: 50
  })
  let videos = []
  let nextPageToken = true
  while (nextPageToken) {
    if (typeof nextPageToken == 'string') params.set('pageToken', nextPageToken)
    const response = await requestYouTube(`/playlistItems?${params.toString()}`)
    if (response.error?.code == 404) throw new Error('Playlist not found. Private?')
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
          delete content.title
        }
        return content
      })
    )
  }
  videos = await loadRegionBlockedDetails(videos)
  return videos
}

const recoverVideoFromBackup = (playlistId, videoId) => {
  return contents[playlistId]?.videos.find(video => video.id == videoId)
}

log.info('Fetching playlists...')
for (const playlist of config.playlists) {
  try {
    const available = []
    const unavailable = []
    const videos = await getPlaylistVideos(playlist.id)
    videos.forEach(video => {
      if (video.unavailableReason) {
        const content = recoverVideoFromBackup(playlist.id, video.id)
        if (content) content.unavailableReason = video.unavailableReason
        unavailable.push(content || video)
      } else available.push(video)
    })
    if (unavailable.length) {
      log.warn(`${playlist.name}: ${unavailable.length} unavailable. Cleaning...`)
      console.log(unavailable)
      await editPlaylist(
        'remove',
        playlist.id,
        unavailable.map(video => video.id)
      )
    }
    contents[playlist.id] = {
      videos: available,
      name: playlist.name
    }
    log.info(`${playlist.name}: ${available.length} videos saved.`)
  } catch ({ message }) {
    log.error(`${playlist.name}: ${message}`)
  }
}

await Bun.write(file, JSON.stringify(contents, null, 2))
log.info('Finished.')
