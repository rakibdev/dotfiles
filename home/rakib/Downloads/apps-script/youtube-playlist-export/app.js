import fs from 'fs/promises'

const dir = process.env.HOME + '/Downloads/backups'

const colors = {
  off: '\x1b[0m',
  red: '\x1b[31m',
  blue: '\x1b[34m'
}

try {
  await fs.access(dir)
} catch {
  console.error(`${colors.red}error:${colors.off} "${dir}" not found.`)
  process.exit(1)
}

const playlists = {
  music: process.env.MUSIC,
  anime: process.env.ANIME,
  general: process.env.GENERAL,
  later: process.env.LATER
}

const getVideos = async playlistId => {
  const params = new URLSearchParams({
    playlistId,
    maxResults: 50,
    part: 'snippet',
    key: 'AIzaSyCPbFD7_-Dfb6694tKO4Q7nymekTRmLubQ' // From https://dcragusa.github.io/ShowUnavailableVideos
  })
  const videos = []
  let nextPageToken = true
  while (nextPageToken) {
    if (typeof nextPageToken == 'string') params.set('pageToken', nextPageToken)
    const response = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params.toString()}`, {
      headers: { referer: 'https://dcragusa.github.io' }
    })
    const data = await response.json()
    nextPageToken = data.nextPageToken
    videos.push(
      ...data.items.map(video => ({
        id: video.snippet.resourceId.videoId,
        title: video.snippet.title,
        channel: video.snippet.videoOwnerChannelTitle
      }))
    )
  }
  return videos
}

console.log(`${colors.blue}info:${colors.off} Getting videos...`)
for (const name in playlists) {
  const videos = await getVideos(playlists[name])
  const unavailable = videos.filter(video => video.title.startsWith('Deleted') || video.title.startsWith('Private'))
  if (unavailable.length)
    console.error(
      `${colors.red}error:${colors.off} "${name}" skipped. ${unavailable.length} videos unavailable.`,
      unavailable
    )
  else {
    await Bun.write(`${dir}/${name}.json`, JSON.stringify(videos, null, 2))
    console.log(`${colors.blue}info:${colors.off} "${name}" saved. ${videos.length} videos.`)
  }
}
