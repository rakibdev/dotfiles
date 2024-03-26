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

// YouTube internal API.
const requestYoutube = async (endpoint, body, options) => {
  const response = await fetch(`https://www.youtube.com/youtubei/v1${endpoint}?prettyPrint=false`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'SAPISIDHASH 1710958297_8b72ffce23fa58cb6070859cf3cc22684a6ee1d8',
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      credentials: 'include',
      Cookie:
        'YSC=Johv7tLMBmQ; VISITOR_INFO1_LIVE=ZbJ7o4eAu10; HSID=AVINZt_9zk1UlL5HR; SSID=A8lC2zEhvDlKbfBfQ; APISID=6o7qE1i2NcLkKPl9/AxOgob5YoMXUsYcqR; SAPISID=LxkEhKvz10jzMCUV/A5fqr1XrPn28GdrXJ; __Secure-1PAPISID=LxkEhKvz10jzMCUV/A5fqr1XrPn28GdrXJ; __Secure-3PAPISID=LxkEhKvz10jzMCUV/A5fqr1XrPn28GdrXJ; VISITOR_PRIVACY_METADATA=CgJCRBIEGgAgPg%3D%3D; _gcl_au=1.1.522781779.1707892045; LOGIN_INFO=AFmmF2swRQIgR6Bb1v-QIv2Iu9RvJBEcIu3Y9aPM4kF-L7r4gdyH1LICIQCTA05u1ZRh_Z4CAgVA_Bw2tIHjvFMTEYWyvJi7RQcfjw:QUQ3MjNmeVZkQmQ2V1lyeEg4Ti1PeW5fbnhheHBWQmd1emxicktNakszZ1NyUEhsUGt3QTgzc0RLMzBzV1NVSTBueVladFJYdkplRDhaYm9zQUJ0aVRidnZUeVJsYTFqRkx0dmVDVG9PdzBfX2thNHZPeEI3RlNzc1VjdU5IZ3ZhcVVUeXBaYkhJbVFNSkUycDVzenFPMlhWQlFMYi1kLU9B; wide=0; SID=g.a000hQho1BHD9hnVjIxx23mKTCbmsXMBfTtc5REeZELMIyOZM6yeCTjnYAbIzUHp3U12e7fRXAACgYKAWMSAQASFQHGX2MiWsP5hf6M4oae_FNVaqQtKhoVAUF8yKohTiF9YAe9vqXuYpBRBLtO0076; __Secure-1PSID=g.a000hQho1BHD9hnVjIxx23mKTCbmsXMBfTtc5REeZELMIyOZM6yerls7FMsc7UP6xlf8LQLLTQACgYKAc4SAQASFQHGX2MiCwE8pNE3dIAZPw8n-OMveBoVAUF8yKrvBcRcP6zTx8vC9iTDMyPu0076; __Secure-3PSID=g.a000hQho1BHD9hnVjIxx23mKTCbmsXMBfTtc5REeZELMIyOZM6yeLFbUpe4iIlYm_QVgdBCFQAACgYKAewSAQASFQHGX2MiP_659Ryi04YEqogvloB8XBoVAUF8yKrDyjS0rXnkMwZN4bVDAWm20076; PREF=f6=40000000&volume=49&app=desktop&f7=100&tz=Asia.Dhaka&guide_collapsed=false&repeat=NONE&autoplay=true&f5=20000; __Secure-1PSIDTS=sidts-CjIB7F1E_IpyRQ7uUmpyVNGf5rC0LP19DiliJGj8KUfFARgPAlWll_1710fYqpTCXktxvxAA; __Secure-3PSIDTS=sidts-CjIB7F1E_IpyRQ7uUmpyVNGf5rC0LP19DiliJGj8KUfFARgPAlWll_1710fYqpTCXktxvxAA; SIDCC=AKEyXzW5oqEDniN_JsKR1NcY3TF0txdkUns_UCA2ujCFWbSKWQn1ZR94zIAQoZYG9lhY-vT2fBQ; __Secure-1PSIDCC=AKEyXzUJN0wkYE532ELS7JK9Wm-ZgVubqMP7aii60T5AY8ybts85JLU-oythGw-4H5HovvNnRm4; __Secure-3PSIDCC=AKEyXzV0FzGeiS7dQb6DM8k27ecuJLXPXev9JK-yu557x1KovVBArMeTTATCDjB5R3B8JpqMFTI; ST-1b=disableCache=true&itct=CBcQsV4iEwi9-qHAtoOFAxUUyDwCHRemDMo%3D&csn=MC42MTMwNzE2MzA5MjY3NzU5&session_logininfo=AFmmF2swRQIgR6Bb1v-QIv2Iu9RvJBEcIu3Y9aPM4kF-L7r4gdyH1LICIQCTA05u1ZRh_Z4CAgVA_Bw2tIHjvFMTEYWyvJi7RQcfjw%3AQUQ3MjNmeVZkQmQ2V1lyeEg4Ti1PeW5fbnhheHBWQmd1emxicktNakszZ1NyUEhsUGt3QTgzc0RLMzBzV1NVSTBueVladFJYdkplRDhaYm9zQUJ0aVRidnZUeVJsYTFqRkx0dmVDVG9PdzBfX2thNHZPeEI3RlNzc1VjdU5IZ3ZhcVVUeXBaYkhJbVFNSkUycDVzenFPMlhWQlFMYi1kLU9B&endpoint=%7B%22clickTrackingParams%22%3A%22CBcQsV4iEwi9-qHAtoOFAxUUyDwCHRemDMo%3D%22%2C%22commandMetadata%22%3A%7B%22webCommandMetadata%22%3A%7B%22url%22%3A%22%2F%22%2C%22webPageType%22%3A%22WEB_PAGE_TYPE_BROWSE%22%2C%22rootVe%22%3A3854%2C%22apiUrl%22%3A%22%2Fyoutubei%2Fv1%2Fbrowse%22%7D%7D%2C%22browseEndpoint%22%3A%7B%22browseId%22%3A%22FEwhat_to_watch%22%7D%7D; ST-yve142=session_logininfo=AFmmF2swRQIgR6Bb1v-QIv2Iu9RvJBEcIu3Y9aPM4kF-L7r4gdyH1LICIQCTA05u1ZRh_Z4CAgVA_Bw2tIHjvFMTEYWyvJi7RQcfjw%3AQUQ3MjNmeVZkQmQ2V1lyeEg4Ti1PeW5fbnhheHBWQmd1emxicktNakszZ1NyUEhsUGt3QTgzc0RLMzBzV1NVSTBueVladFJYdkplRDhaYm9zQUJ0aVRidnZUeVJsYTFqRkx0dmVDVG9PdzBfX2thNHZPeEI3RlNzc1VjdU5IZ3ZhcVVUeXBaYkhJbVFNSkUycDVzenFPMlhWQlFMYi1kLU9B',
      'x-goog-authuser': 1,
      'x-goog-visitor-id': 'CgtaYko3bzRlQXUxMCjzuuyvBjIKCgJCRBIEGgAgPg%3D%3D',
      'x-youtube-client-name': '1',
      'x-youtube-client-version': '2.20240313.05.00',
      'x-origin': 'https://www.youtube.com'
    },
    body: JSON.stringify({
      context: {
        client: {
          hl: 'en',
          gl: config.countryCode,
          clientName: 'WEB',
          clientVersion: '2.20240313.05.00'
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
  const result = await requestYoutube('/browse/edit_playlist', {
    playlistId,
    actions: videoIds.map(id => {
      if (action == 'addVideo') return { action: 'ACTION_ADD_VIDEO', addedVideoId: id }
      if (action == 'removeVideo') return { action: 'ACTION_REMOVE_VIDEO', setVideoId: id }
    })
  })
  if (result.status != 'STATUS_SUCCEEDED')
    log.error(`${action} ${videoIds} failed: `, result.error ? result.error.message : result)
}

await editPlaylist('removeVideo', 'PLAsIFGKl2toYRLAfKyhaytE29s5nxDjAY', ['ezAtfMxqUWQ'])

const getPlaylistVideos = async playlistId => {
  // Didn't use internal API because it doesn't include unavailable if playlist has larger than 200 videos.
  const params = new URLSearchParams({
    playlistId,
    maxResults: 50,
    part: 'snippet',
    key: 'AIzaSyCPbFD7_-Dfb6694tKO4Q7nymekTRmLubQ' // From https://github.com/dcragusa/ShowUnavailableVideos.
  })
  const videos = []
  let nextPageToken = true
  while (nextPageToken) {
    if (typeof nextPageToken == 'string') params.set('pageToken', nextPageToken)
    const response = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params.toString()}`, {
      headers: { referer: 'https://dcragusa.github.io' }
    })
    const result = await response.json()
    nextPageToken = result.nextPageToken
    videos.push(
      ...result.items.map(video => ({
        id: video.snippet.resourceId.videoId,
        title: video.snippet.title,
        channel: video.snippet.videoOwnerChannelTitle
      }))
    )
  }
  return videos
}

const recoverDetailsFromBackup = (playlistId, videoId) => {
  return contents[playlistId]?.videos.find(video => video.id == videoId)
}

// log.info('Fetching videos...')
// for (const playlist of config.playlists) {
//   const videos = await getPlaylistVideos(playlist.id)
//   const unavailable = videos.filter(video => video.title.startsWith('Deleted') || video.title.startsWith('Private'))
//   if (unavailable.length) {
//     log.warn(`${unavailable.length} unavailable video in "${playlist.name}".`)
//     const ids = []
//     unavailable.forEach(video => {
//       const details = recoverDetailsFromBackup(playlist.id, video.id)
//       console.log(details || video)
//       ids.push(video.id)
//     })
//     log.info(`Cleaning unavailable videos...`)
//     await editPlaylist('removeVideo', playlist.id, ids)
//   }
//   contents[playlist.id] = {
//     name: playlist.name,
//     videos
//   }
//   log.info(`"${playlist.name}" ${videos.length} videos saved.`)
// }

// await Bun.write(file, JSON.stringify(contents, null, 2))
// log.info(`Finished.`)
